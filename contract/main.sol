// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ICM Interface definitions (since @avalabs/icm-contracts might not be available in Remix)
interface IICMMessenger {
    struct ICMMessage {
        bytes32 destinationChainID;
        address destinationAddress;
        bytes message;
        uint256 requiredGasLimit;
        address allowedRelayerRewardAddress;
        FeeInfo feeInfo;
    }
    
    struct FeeInfo {
        address feeTokenAddress;
        uint256 amount;
    }
    
    function sendCrossChainMessage(ICMMessage calldata message) external returns (bytes32 messageID);
}

// Mock ICM base contracts for Remix compatibility
abstract contract ICMSenderUpgradeable is Initializable {
    IICMMessenger public icmMessenger;
    
    function __ICMSender_init(address _icmMessenger) internal onlyInitializing {
        icmMessenger = IICMMessenger(_icmMessenger);
    }
    
    uint256[49] private __gap;
}

abstract contract ICMReceiverUpgradeable is Initializable {
    IICMMessenger public icmMessenger2;
    
    function __ICMReceiver_init(address _icmMessenger) internal onlyInitializing {
        icmMessenger2 = IICMMessenger(_icmMessenger);
    }
    
    function _receiveICMMessage(
        bytes32 sourceChain,
        address sender,
        bytes memory message
    ) internal virtual;
    
    // This would be called by the ICM messenger
    function receiveICMMessage(
        bytes32 sourceChain,
        address sender,
        bytes memory message
    ) external {
        require(msg.sender == address(icmMessenger2), "Only ICM messenger can call");
        _receiveICMMessage(sourceChain, sender, message);
    }
    
    uint256[49] private __gap;
}

interface IBridgeToken {
    function mint(address to, uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
    function burn(uint256 amount) external;
}

/**
 * @title ICMBridge
 * @dev Cross-chain bridge using Avalanche's ICM for secure token transfers
 * @notice This contract handles locking/unlocking native tokens and minting/burning wrapped tokens
 */
contract ICMBridge is 
    ICMSenderUpgradeable, 
    ICMReceiverUpgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable,
    PausableUpgradeable 
{
    using SafeERC20 for IERC20;
    
    // Constants
    uint256 public constant MAX_BRIDGE_FEE = 1 ether;
    uint256 public constant MIN_BRIDGE_AMOUNT = 1000; // Minimum 1000 wei to bridge
    uint256 public constant MESSAGE_TIMEOUT = 7 days;
    
    // Events
    event TokensLocked(
        address indexed user, 
        uint256 amount, 
        bytes32 indexed destinationChain, 
        bytes32 indexed txId,
        address token
    );
    
    event TokensMinted(
        address indexed user, 
        uint256 amount, 
        bytes32 indexed sourceChain, 
        bytes32 indexed txId,
        address token
    );
    
    event TokensBurned(
        address indexed user,
        uint256 amount,
        bytes32 indexed destinationChain,
        bytes32 indexed txId,
        address token
    );
    
    event TokensUnlocked(
        address indexed user,
        uint256 amount,
        bytes32 indexed sourceChain,
        bytes32 indexed txId,
        address token
    );
    
    event ICMMessageSent(
        bytes32 indexed destinationChain, 
        bytes32 indexed messageId, 
        string messageType
    );
    
    event ICMMessageReceived(
        bytes32 indexed sourceChain, 
        bytes32 indexed messageId, 
        string messageType
    );
    
    event BridgeFeeUpdated(uint256 oldFee, uint256 newFee);
    event TokenWhitelisted(address indexed token, bool isNative);
    event TokenBlacklisted(address indexed token);
    event ChainEnabled(bytes32 indexed chainId, address bridgeAddress);
    event ChainDisabled(bytes32 indexed chainId);
    
    // Structs
    struct BridgeMessage {
        string messageType; // "LOCK", "MINT", "BURN", "UNLOCK"
        address user;
        uint256 amount;
        bytes32 txId;
        uint256 timestamp;
        address token;
        uint256 nonce;
    }
    
    struct PendingTransaction {
        address user;
        uint256 amount;
        bytes32 destinationChain;
        uint256 timestamp;
        bool completed;
        address token;
        string messageType;
    }
    
    struct TokenConfig {
        bool isWhitelisted;
        bool isNative; // true if native token, false if wrapped
        address counterpartToken; // corresponding token on other chains
        uint256 minBridgeAmount;
        uint256 maxBridgeAmount;
    }
    
    // State variables
    mapping(bytes32 => PendingTransaction) public pendingTransactions;
    mapping(bytes32 => bool) public processedMessages;
    mapping(address => uint256) public lockedBalances;
    mapping(address => uint256) public mintedBalances;
    mapping(address => TokenConfig) public tokenConfigs;
    mapping(bytes32 => address) public chainBridgeAddresses; // chainId => bridge address
    mapping(bytes32 => bool) public enabledChains;
    mapping(address => uint256) public userNonces;
    
    bytes32 public immutable CHAIN_ID;
    uint256 public bridgeFee;
    uint256 public totalFeesCollected;
    address public feeRecipient;
    
    // Modifiers
    modifier onlyEnabledChain(bytes32 chainId) {
        require(enabledChains[chainId], "Chain not enabled");
        _;
    }
    
    modifier onlyWhitelistedToken(address token) {
        require(tokenConfigs[token].isWhitelisted, "Token not whitelisted");
        _;
    }
    
    modifier onlyValidAmount(address token, uint256 amount) {
        TokenConfig memory config = tokenConfigs[token];
        require(amount >= config.minBridgeAmount, "Amount below minimum");
        require(config.maxBridgeAmount == 0 || amount <= config.maxBridgeAmount, "Amount above maximum");
        _;
    }
    
    constructor(bytes32 _chainId) {
        CHAIN_ID = _chainId;
        _disableInitializers();
    }
    
    /**
     * @dev Initialize the contract (for upgradeable contracts)
     */
    function initialize(
        address _icmMessenger,
        uint256 _bridgeFee,
        address _feeRecipient
    ) external initializer {
        __ICMSender_init(_icmMessenger);
        __ICMReceiver_init(_icmMessenger);
        __ReentrancyGuard_init();
        __Pausable_init();
        
        require(_bridgeFee <= MAX_BRIDGE_FEE, "Bridge fee too high");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        bridgeFee = _bridgeFee;
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Lock tokens on source chain and send ICM message to destination
     */
    function lockAndBridge(
        bytes32 destinationChain,
        uint256 amount,
        address token
    ) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        onlyEnabledChain(destinationChain)
        onlyWhitelistedToken(token)
        onlyValidAmount(token, amount)
    {
        require(msg.value >= bridgeFee, "Insufficient bridge fee");
        require(tokenConfigs[token].isNative, "Token must be native for locking");
        
        bytes32 txId = _generateTxId(msg.sender, amount, block.timestamp);
        
        // Transfer tokens from user to contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update state
        lockedBalances[token] += amount;
        pendingTransactions[txId] = PendingTransaction({
            user: msg.sender,
            amount: amount,
            destinationChain: destinationChain,
            timestamp: block.timestamp,
            completed: false,
            token: token,
            messageType: "LOCK"
        });
        
        // Create and send bridge message
        BridgeMessage memory message = BridgeMessage({
            messageType: "LOCK",
            user: msg.sender,
            amount: amount,
            txId: txId,
            timestamp: block.timestamp,
            token: tokenConfigs[token].counterpartToken,
            nonce: ++userNonces[msg.sender]
        });
        
        bytes32 messageId = _sendICMMessage(destinationChain, abi.encode(message));
        
        // Collect bridge fee
        totalFeesCollected += bridgeFee;
        if (msg.value > bridgeFee) {
            payable(msg.sender).transfer(msg.value - bridgeFee);
        }
        
        emit TokensLocked(msg.sender, amount, destinationChain, txId, token);
        emit ICMMessageSent(destinationChain, messageId, "LOCK");
    }
    
    /**
     * @dev Burn wrapped tokens and send unlock message to source chain
     */
    function burnAndBridge(
        bytes32 sourceChain,
        uint256 amount,
        address token
    ) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        onlyEnabledChain(sourceChain)
        onlyWhitelistedToken(token)
        onlyValidAmount(token, amount)
    {
        require(msg.value >= bridgeFee, "Insufficient bridge fee");
        require(!tokenConfigs[token].isNative, "Token must be wrapped for burning");
        
        bytes32 txId = _generateTxId(msg.sender, amount, block.timestamp);
        
        // Burn tokens from user
        IBridgeToken(token).burnFrom(msg.sender, amount);
        
        // Update state
        mintedBalances[token] -= amount;
        pendingTransactions[txId] = PendingTransaction({
            user: msg.sender,
            amount: amount,
            destinationChain: sourceChain,
            timestamp: block.timestamp,
            completed: false,
            token: token,
            messageType: "BURN"
        });
        
        // Create and send bridge message
        BridgeMessage memory message = BridgeMessage({
            messageType: "BURN",
            user: msg.sender,
            amount: amount,
            txId: txId,
            timestamp: block.timestamp,
            token: tokenConfigs[token].counterpartToken,
            nonce: ++userNonces[msg.sender]
        });
        
        bytes32 messageId = _sendICMMessage(sourceChain, abi.encode(message));
        
        // Collect bridge fee
        totalFeesCollected += bridgeFee;
        if (msg.value > bridgeFee) {
            payable(msg.sender).transfer(msg.value - bridgeFee);
        }
        
        emit TokensBurned(msg.sender, amount, sourceChain, txId, token);
        emit ICMMessageSent(sourceChain, messageId, "BURN");
    }
    
    /**
     * @dev Receive ICM message and process bridge operation
     */
    function _receiveICMMessage(
        bytes32 sourceChain,
        address sender,
        bytes memory messageBytes
    ) internal override {
        require(enabledChains[sourceChain], "Source chain not enabled");
        require(sender == chainBridgeAddresses[sourceChain], "Invalid sender");
        
        BridgeMessage memory message = abi.decode(messageBytes, (BridgeMessage));
        require(block.timestamp <= message.timestamp + MESSAGE_TIMEOUT, "Message expired");
        
        bytes32 messageHash = keccak256(abi.encode(message, sourceChain, sender));
        require(!processedMessages[messageHash], "Message already processed");
        
        processedMessages[messageHash] = true;
        
        if (keccak256(bytes(message.messageType)) == keccak256(bytes("LOCK"))) {
            _processMintRequest(message, sourceChain, messageHash);
        } else if (keccak256(bytes(message.messageType)) == keccak256(bytes("BURN"))) {
            _processUnlockRequest(message, sourceChain, messageHash);
        } else {
            revert("Invalid message type");
        }
        
        emit ICMMessageReceived(sourceChain, messageHash, message.messageType);
    }
    
    /**
     * @dev Process mint request from lock message
     */
    function _processMintRequest(
        BridgeMessage memory message, 
        bytes32 sourceChain,
        bytes32 messageHash
    ) internal {
        address token = message.token;
        require(tokenConfigs[token].isWhitelisted, "Token not whitelisted");
        require(!tokenConfigs[token].isNative, "Cannot mint native token");
        
        // Mint tokens to user
        IBridgeToken(token).mint(message.user, message.amount);
        
        // Update state
        mintedBalances[token] += message.amount;
        
        emit TokensMinted(message.user, message.amount, sourceChain, message.txId, token);
    }
    
    /**
     * @dev Process unlock request from burn message
     */
    function _processUnlockRequest(
        BridgeMessage memory message, 
        bytes32 sourceChain,
        bytes32 messageHash
    ) internal {
        address token = message.token;
        require(tokenConfigs[token].isWhitelisted, "Token not whitelisted");
        require(tokenConfigs[token].isNative, "Cannot unlock wrapped token");
        require(lockedBalances[token] >= message.amount, "Insufficient locked balance");
        
        // Unlock and transfer tokens to user
        lockedBalances[token] -= message.amount;
        IERC20(token).safeTransfer(message.user, message.amount);
        
        emit TokensUnlocked(message.user, message.amount, sourceChain, message.txId, token);
    }
    
    /**
     * @dev Send ICM message to specified chain
     */
    function _sendICMMessage(bytes32 destinationChain, bytes memory message) internal returns (bytes32) {
        address destinationAddress = chainBridgeAddresses[destinationChain];
        require(destinationAddress != address(0), "Destination bridge not set");
        
        // Use actual ICM messaging
        IICMMessenger.ICMMessage memory icmMessage = IICMMessenger.ICMMessage({
            destinationChainID: destinationChain,
            destinationAddress: destinationAddress,
            message: message,
            requiredGasLimit: 500000, // Adjust based on needs
            allowedRelayerRewardAddress: address(0),
            feeInfo: IICMMessenger.FeeInfo({
                feeTokenAddress: address(0), // Use native token for fees
                amount: 0
            })
        });
        
        return icmMessenger.sendCrossChainMessage(icmMessage);
    }
    
    /**
     * @dev Generate unique transaction ID
     */
    function _generateTxId(address user, uint256 amount, uint256 timestamp) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            user, 
            amount, 
            timestamp, 
            block.number, 
            CHAIN_ID,
            userNonces[user]
        ));
    }
    
    // View functions
    function getPendingTransaction(bytes32 txId) external view returns (PendingTransaction memory) {
        return pendingTransactions[txId];
    }
    
    function isMessageProcessed(bytes32 messageHash) external view returns (bool) {
        return processedMessages[messageHash];
    }
    
    function getLockedBalance(address token) external view returns (uint256) {
        return lockedBalances[token];
    }
    
    function getMintedBalance(address token) external view returns (uint256) {
        return mintedBalances[token];
    }
    
    function getTokenConfig(address token) external view returns (TokenConfig memory) {
        return tokenConfigs[token];
    }
    
    function isChainEnabled(bytes32 chainId) external view returns (bool) {
        return enabledChains[chainId];
    }
    
    // Admin functions
    function whitelistToken(
        address token,
        bool isNative,
        address counterpartToken,
        uint256 minAmount,
        uint256 maxAmount
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        
        tokenConfigs[token] = TokenConfig({
            isWhitelisted: true,
            isNative: isNative,
            counterpartToken: counterpartToken,
            minBridgeAmount: minAmount,
            maxBridgeAmount: maxAmount
        });
        
        emit TokenWhitelisted(token, isNative);
    }
    
    function blacklistToken(address token) external onlyOwner {
        tokenConfigs[token].isWhitelisted = false;
        emit TokenBlacklisted(token);
    }
    
    function enableChain(bytes32 chainId, address bridgeAddress) external onlyOwner {
        require(bridgeAddress != address(0), "Invalid bridge address");
        enabledChains[chainId] = true;
        chainBridgeAddresses[chainId] = bridgeAddress;
        emit ChainEnabled(chainId, bridgeAddress);
    }
    
    function disableChain(bytes32 chainId) external onlyOwner {
        enabledChains[chainId] = false;
        delete chainBridgeAddresses[chainId];
        emit ChainDisabled(chainId);
    }
    
    function setBridgeFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_BRIDGE_FEE, "Fee too high");
        uint256 oldFee = bridgeFee;
        bridgeFee = newFee;
        emit BridgeFeeUpdated(oldFee, newFee);
    }
    
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function withdrawFees() external onlyOwner {
        uint256 amount = totalFeesCollected;
        totalFeesCollected = 0;
        payable(feeRecipient).transfer(amount);
    }
    
    /**
     * @dev Emergency function to withdraw stuck tokens
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(amount <= IERC20(token).balanceOf(address(this)) - lockedBalances[token], 
                "Cannot withdraw locked tokens");
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    /**
     * @dev Emergency function to withdraw stuck ETH
     */
    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance - totalFeesCollected;
        require(balance > 0, "No ETH to withdraw");
        payable(owner()).transfer(balance);
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}