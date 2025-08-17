const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Contract configuration
const CONTRACT_ADDRESS = '0x68F7B6b2c9776F97Ff08584d79fBf2296a3C5328';
const CONTRACT_ABI = [
  // View functions
  "function getPendingTransaction(bytes32 txId) view returns (tuple(address user, uint256 amount, bytes32 destinationChain, uint256 timestamp, bool completed, address token, string messageType))",
  "function isMessageProcessed(bytes32 messageHash) view returns (bool)",
  "function getLockedBalance(address token) view returns (uint256)",
  "function getMintedBalance(address token) view returns (uint256)",
  "function getTokenConfig(address token) view returns (tuple(bool isWhitelisted, bool isNative, address counterpartToken, uint256 minBridgeAmount, uint256 maxBridgeAmount))",
  "function isChainEnabled(bytes32 chainId) view returns (bool)",
  "function bridgeFee() view returns (uint256)",
  "function totalFeesCollected() view returns (uint256)",
  "function feeRecipient() view returns (address)",
  "function userNonces(address user) view returns (uint256)",
  "function CHAIN_ID() view returns (bytes32)",
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  
  // Bridge functions
  "function lockAndBridge(bytes32 destinationChain, uint256 amount, address token) payable",
  "function burnAndBridge(bytes32 sourceChain, uint256 amount, address token) payable",
  
  // Admin functions
  "function whitelistToken(address token, bool isNative, address counterpartToken, uint256 minAmount, uint256 maxAmount)",
  "function blacklistToken(address token)",
  "function enableChain(bytes32 chainId, address bridgeAddress)",
  "function disableChain(bytes32 chainId)",
  "function setBridgeFee(uint256 newFee)",
  "function setFeeRecipient(address newRecipient)",
  "function pause()",
  "function unpause()",
  "function withdrawFees()",
  "function emergencyWithdraw(address token, uint256 amount)",
  "function emergencyWithdrawETH()",
  
  // Events
  "event TokensLocked(address indexed user, uint256 amount, bytes32 indexed destinationChain, bytes32 indexed txId, address token)",
  "event TokensMinted(address indexed user, uint256 amount, bytes32 indexed sourceChain, bytes32 indexed txId, address token)",
  "event TokensBurned(address indexed user, uint256 amount, bytes32 indexed destinationChain, bytes32 indexed txId, address token)",
  "event TokensUnlocked(address indexed user, uint256 amount, bytes32 indexed sourceChain, bytes32 indexed txId, address token)",
  "event ICMMessageSent(bytes32 indexed destinationChain, bytes32 indexed messageId, string messageType)",
  "event ICMMessageReceived(bytes32 indexed sourceChain, bytes32 indexed messageId, string messageType)"
];

// Initialize provider and contract
let provider, contract, wallet, contractWithSigner;

// Initialize blockchain connection
async function initializeBlockchain() {
  try {
    // Initialize provider (you can use different providers)
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    
    // Initialize contract
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    // Initialize wallet for admin operations (if private key provided)
    if (process.env.PRIVATE_KEY) {
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      contractWithSigner = contract.connect(wallet);
    }
    
    console.log('✅ Blockchain connection initialized');
    console.log(`📄 Contract address: ${CONTRACT_ADDRESS}`);
    
    // Test connection
    const chainId = await contract.CHAIN_ID();
    console.log(`⛓️  Chain ID: ${chainId}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize blockchain connection:', error.message);
    process.exit(1);
  }
}

// Utility functions
function validateAddress(address) {
  return ethers.isAddress(address);
}

function validateAmount(amount) {
  try {
    return ethers.parseEther(amount.toString());
  } catch {
    return null;
  }
}

function formatBytes32String(text) {
  return ethers.formatBytes32String(text);
}

function parseBytes32String(bytes32) {
  return ethers.parseBytes32String(bytes32);
}

// Error handler middleware
function errorHandler(res, error, operation = 'operation') {
  console.error(`❌ Error during ${operation}:`, error);
  
  let statusCode = 500;
  let message = 'Internal server error';
  
  if (error.code === 'CALL_EXCEPTION') {
    statusCode = 400;
    message = 'Contract call failed: ' + (error.reason || error.message);
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    statusCode = 400;
    message = 'Insufficient funds for transaction';
  } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    statusCode = 400;
    message = 'Transaction would fail - check parameters';
  }
  
  res.status(statusCode).json({
    success: false,
    error: message,
    details: error.message
  });
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ICM Bridge API is running',
    contractAddress: CONTRACT_ADDRESS,
    timestamp: new Date().toISOString()
  });
});

// Get bridge information
app.get('/bridge/info', async (req, res) => {
  try {
    const [bridgeFee, totalFeesCollected, feeRecipient, chainId, owner, paused] = await Promise.all([
      contract.bridgeFee(),
      contract.totalFeesCollected(),
      contract.feeRecipient(),
      contract.CHAIN_ID(),
      contract.owner(),
      contract.paused()
    ]);
    
    res.json({
      success: true,
      data: {
        bridgeFee: ethers.formatEther(bridgeFee),
        totalFeesCollected: ethers.formatEther(totalFeesCollected),
        feeRecipient,
        chainId,
        owner,
        paused,
        contractAddress: CONTRACT_ADDRESS
      }
    });
  } catch (error) {
    errorHandler(res, error, 'fetching bridge info');
  }
});

// Get token configuration
app.get('/token/:address/config', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!validateAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token address'
      });
    }
    
    const config = await contract.getTokenConfig(address);
    
    res.json({
      success: true,
      data: {
        tokenAddress: address,
        isWhitelisted: config.isWhitelisted,
        isNative: config.isNative,
        counterpartToken: config.counterpartToken,
        minBridgeAmount: config.minBridgeAmount.toString(),
        maxBridgeAmount: config.maxBridgeAmount.toString()
      }
    });
  } catch (error) {
    errorHandler(res, error, 'fetching token config');
  }
});

// Get token balances
app.get('/token/:address/balances', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!validateAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token address'
      });
    }
    
    const [lockedBalance, mintedBalance] = await Promise.all([
      contract.getLockedBalance(address),
      contract.getMintedBalance(address)
    ]);
    
    res.json({
      success: true,
      data: {
        tokenAddress: address,
        lockedBalance: lockedBalance.toString(),
        mintedBalance: mintedBalance.toString()
      }
    });
  } catch (error) {
    errorHandler(res, error, 'fetching token balances');
  }
});

// Check if chain is enabled
app.get('/chain/:chainId/enabled', async (req, res) => {
  try {
    const { chainId } = req.params;
    const chainIdBytes32 = formatBytes32String(chainId);
    
    const isEnabled = await contract.isChainEnabled(chainIdBytes32);
    
    res.json({
      success: true,
      data: {
        chainId,
        isEnabled
      }
    });
  } catch (error) {
    errorHandler(res, error, 'checking chain status');
  }
});

// Get pending transaction
app.get('/transaction/:txId', async (req, res) => {
  try {
    const { txId } = req.params;
    
    const pendingTx = await contract.getPendingTransaction(txId);
    
    res.json({
      success: true,
      data: {
        txId,
        user: pendingTx.user,
        amount: pendingTx.amount.toString(),
        destinationChain: pendingTx.destinationChain,
        timestamp: pendingTx.timestamp.toString(),
        completed: pendingTx.completed,
        token: pendingTx.token,
        messageType: pendingTx.messageType
      }
    });
  } catch (error) {
    errorHandler(res, error, 'fetching pending transaction');
  }
});

// Check if message is processed
app.get('/message/:messageHash/processed', async (req, res) => {
  try {
    const { messageHash } = req.params;
    
    const isProcessed = await contract.isMessageProcessed(messageHash);
    
    res.json({
      success: true,
      data: {
        messageHash,
        isProcessed
      }
    });
  } catch (error) {
    errorHandler(res, error, 'checking message status');
  }
});

// Get user nonce
app.get('/user/:address/nonce', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!validateAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user address'
      });
    }
    
    const nonce = await contract.userNonces(address);
    
    res.json({
      success: true,
      data: {
        userAddress: address,
        nonce: nonce.toString()
      }
    });
  } catch (error) {
    errorHandler(res, error, 'fetching user nonce');
  }
});

// Lock and bridge tokens
app.post('/bridge/lock', async (req, res) => {
  if (!contractWithSigner) {
    return res.status(400).json({
      success: false,
      error: 'Admin wallet not configured'
    });
  }
  
  try {
    const { destinationChain, amount, tokenAddress, userAddress } = req.body;
    
    // Validate inputs
    if (!destinationChain || !amount || !validateAddress(tokenAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters'
      });
    }
    
    const parsedAmount = validateAmount(amount);
    if (!parsedAmount) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    const destinationChainBytes32 = formatBytes32String(destinationChain);
    const bridgeFee = await contract.bridgeFee();
    
    // Estimate gas
    const gasEstimate = await contractWithSigner.lockAndBridge.estimateGas(
      destinationChainBytes32,
      parsedAmount,
      tokenAddress,
      { value: bridgeFee }
    );
    
    // Execute transaction
    const tx = await contractWithSigner.lockAndBridge(
      destinationChainBytes32,
      parsedAmount,
      tokenAddress,
      {
        value: bridgeFee,
        gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
      }
    );
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        destinationChain,
        amount: amount.toString(),
        tokenAddress,
        bridgeFee: ethers.formatEther(bridgeFee)
      }
    });
  } catch (error) {
    errorHandler(res, error, 'locking tokens');
  }
});

// Burn and bridge tokens
app.post('/bridge/burn', async (req, res) => {
  if (!contractWithSigner) {
    return res.status(400).json({
      success: false,
      error: 'Admin wallet not configured'
    });
  }
  
  try {
    const { sourceChain, amount, tokenAddress } = req.body;
    
    // Validate inputs
    if (!sourceChain || !amount || !validateAddress(tokenAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters'
      });
    }
    
    const parsedAmount = validateAmount(amount);
    if (!parsedAmount) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    const sourceChainBytes32 = formatBytes32String(sourceChain);
    const bridgeFee = await contract.bridgeFee();
    
    // Estimate gas
    const gasEstimate = await contractWithSigner.burnAndBridge.estimateGas(
      sourceChainBytes32,
      parsedAmount,
      tokenAddress,
      { value: bridgeFee }
    );
    
    // Execute transaction
    const tx = await contractWithSigner.burnAndBridge(
      sourceChainBytes32,
      parsedAmount,
      tokenAddress,
      {
        value: bridgeFee,
        gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
      }
    );
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        sourceChain,
        amount: amount.toString(),
        tokenAddress,
        bridgeFee: ethers.formatEther(bridgeFee)
      }
    });
  } catch (error) {
    errorHandler(res, error, 'burning tokens');
  }
});

// Admin routes - require authentication
function requireAdmin(req, res, next) {
  if (!contractWithSigner) {
    return res.status(401).json({
      success: false,
      error: 'Admin access not configured'
    });
  }
  next();
}

// Whitelist token
app.post('/admin/token/whitelist', requireAdmin, async (req, res) => {
  try {
    const { tokenAddress, isNative, counterpartToken, minAmount, maxAmount } = req.body;
    
    if (!validateAddress(tokenAddress) || !validateAddress(counterpartToken)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token addresses'
      });
    }
    
    const tx = await contractWithSigner.whitelistToken(
      tokenAddress,
      isNative,
      counterpartToken,
      minAmount || 0,
      maxAmount || 0
    );
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        tokenAddress,
        isNative,
        counterpartToken
      }
    });
  } catch (error) {
    errorHandler(res, error, 'whitelisting token');
  }
});

// Blacklist token
app.post('/admin/token/blacklist', requireAdmin, async (req, res) => {
  try {
    const { tokenAddress } = req.body;
    
    if (!validateAddress(tokenAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token address'
      });
    }
    
    const tx = await contractWithSigner.blacklistToken(tokenAddress);
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        tokenAddress
      }
    });
  } catch (error) {
    errorHandler(res, error, 'blacklisting token');
  }
});

// Enable chain
app.post('/admin/chain/enable', requireAdmin, async (req, res) => {
  try {
    const { chainId, bridgeAddress } = req.body;
    
    if (!chainId || !validateAddress(bridgeAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters'
      });
    }
    
    const chainIdBytes32 = formatBytes32String(chainId);
    const tx = await contractWithSigner.enableChain(chainIdBytes32, bridgeAddress);
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        chainId,
        bridgeAddress
      }
    });
  } catch (error) {
    errorHandler(res, error, 'enabling chain');
  }
});

// Disable chain
app.post('/admin/chain/disable', requireAdmin, async (req, res) => {
  try {
    const { chainId } = req.body;
    
    if (!chainId) {
      return res.status(400).json({
        success: false,
        error: 'Chain ID required'
      });
    }
    
    const chainIdBytes32 = formatBytes32String(chainId);
    const tx = await contractWithSigner.disableChain(chainIdBytes32);
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        chainId
      }
    });
  } catch (error) {
    errorHandler(res, error, 'disabling chain');
  }
});

// Set bridge fee
app.post('/admin/fee/set', requireAdmin, async (req, res) => {
  try {
    const { fee } = req.body;
    
    const parsedFee = validateAmount(fee);
    if (!parsedFee) {
      return res.status(400).json({
        success: false,
        error: 'Invalid fee amount'
      });
    }
    
    const tx = await contractWithSigner.setBridgeFee(parsedFee);
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        newFee: fee.toString()
      }
    });
  } catch (error) {
    errorHandler(res, error, 'setting bridge fee');
  }
});

// Withdraw fees
app.post('/admin/fees/withdraw', requireAdmin, async (req, res) => {
  try {
    const tx = await contractWithSigner.withdrawFees();
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash
      }
    });
  } catch (error) {
    errorHandler(res, error, 'withdrawing fees');
  }
});

// Pause contract
app.post('/admin/pause', requireAdmin, async (req, res) => {
  try {
    const tx = await contractWithSigner.pause();
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash
      }
    });
  } catch (error) {
    errorHandler(res, error, 'pausing contract');
  }
});

// Unpause contract
app.post('/admin/unpause', requireAdmin, async (req, res) => {
  try {
    const tx = await contractWithSigner.unpause();
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash
      }
    });
  } catch (error) {
    errorHandler(res, error, 'unpausing contract');
  }
});

// Event listener setup
function setupEventListeners() {
  if (!contract) return;
  
  // Listen to bridge events
  contract.on('TokensLocked', (user, amount, destinationChain, txId, token, event) => {
    console.log('🔒 Tokens Locked:', {
      user,
      amount: amount.toString(),
      destinationChain,
      txId,
      token,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    });
  });
  
  contract.on('TokensMinted', (user, amount, sourceChain, txId, token, event) => {
    console.log('🪙 Tokens Minted:', {
      user,
      amount: amount.toString(),
      sourceChain,
      txId,
      token,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    });
  });
  
  contract.on('TokensBurned', (user, amount, destinationChain, txId, token, event) => {
    console.log('🔥 Tokens Burned:', {
      user,
      amount: amount.toString(),
      destinationChain,
      txId,
      token,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    });
  });
  
  contract.on('TokensUnlocked', (user, amount, sourceChain, txId, token, event) => {
    console.log('🔓 Tokens Unlocked:', {
      user,
      amount: amount.toString(),
      sourceChain,
      txId,
      token,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    });
  });
  
  console.log('👂 Event listeners setup complete');
}

// Initialize and start server
async function startServer() {
  try {
    await initializeBlockchain();
    setupEventListeners();
    
    app.listen(PORT, () => {
      console.log(`🚀 ICM Bridge API server running on port ${PORT}`);
      console.log(`📖 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 Shutting down gracefully...');
  process.exit(0);
});

startServer();