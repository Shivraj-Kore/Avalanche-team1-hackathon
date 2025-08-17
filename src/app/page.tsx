"use client"

declare global {
  interface Window {
    ethereum?: any;
  }
}

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpDown, ArrowRight, ArrowRightLeft, Wallet, CheckCircle, AlertCircle, Server, Settings } from "lucide-react"
import { BridgeAnimation } from "@/components/bridge-animation"
import { BridgeStatus } from "@/components/bridge-status"
import { AdvancedBridge } from "@/components/advanced-bridge"
import { useBridge } from "@/lib/use-bridge"
import { bridgeAPI } from "@/lib/bridge-api"

// Default chains fallback (used when bridge server is not available)
const defaultChains = [
  { id: "ethereum", name: "Ethereum", symbol: "ETH", chainId: "0x1" },
  { id: "polygon", name: "Polygon", symbol: "MATIC", chainId: "0x89" },
  { id: "bsc", name: "BSC", symbol: "BNB", chainId: "0x38" },
  { id: "avalanche", name: "Avalanche", symbol: "AVAX", chainId: "0xa86a" },
  { id: "arbitrum", name: "Arbitrum", symbol: "ARB", chainId: "0xa4b1" },
  { id: "optimism", name: "Optimism", symbol: "OP", chainId: "0xa" },
]

export default function CryptoBridge() {
  const [fromChain, setFromChain] = useState<string>("")
  const [toChain, setToChain] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [token, setToken] = useState<string>("USDC")
  const [isTransferring, setIsTransferring] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string>("")
  const [activeTab, setActiveTab] = useState<'simple' | 'advanced' | 'status'>('simple')
  const [availableChains, setAvailableChains] = useState(defaultChains)
  
  // Bridge API integration
  const { 
    performTransfer, 
    isLoading: bridgeLoading, 
    error: bridgeError, 
    lastTransaction,
    clearError: clearBridgeError 
  } = useBridge()

  // Check if Core Wallet is installed
  const isCoreWalletInstalled = () => {
    return typeof window !== 'undefined' && window.ethereum && window.ethereum.isAvalanche
  }

  // Fetch available chains from bridge server
  const fetchAvailableChains = async () => {
    try {
      const response = await bridgeAPI.getBlockchains()
      if (response.success && response.blockchains.length > 0) {
        // Transform bridge server chains to match our format
        const transformedChains = response.blockchains.map(chain => ({
          id: chain.name,
          name: chain.name.charAt(0).toUpperCase() + chain.name.slice(1),
          symbol: chain.name.toUpperCase().slice(0, 3),
          chainId: chain.id.slice(0, 10) + '...'
        }))
        setAvailableChains(transformedChains)
      }
    } catch (error) {
      console.log('Using default chains as bridge server is not available')
      setAvailableChains(defaultChains)
    }
  }

  // Check connection on component mount and fetch available chains
  useEffect(() => {
    checkConnection()
    fetchAvailableChains()
  }, [])

  const checkConnection = async () => {
    if (!isCoreWalletInstalled()) return

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length > 0) {
        setIsConnected(true)
        setWalletAddress(accounts[0])
      }
    } catch (error) {
      console.error('Error checking connection:', error)
    }
  }

  const connectWallet = async () => {
    if (!isCoreWalletInstalled()) {
      setConnectionError("Core Wallet is not installed. Please install it to continue.")
      return
    }

    setIsConnecting(true)
    setConnectionError("")

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length > 0) {
        setIsConnected(true)
        setWalletAddress(accounts[0])
        
        // Switch to Avalanche network if not already on it
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xa86a' }], // Avalanche C-Chain
          })
        } catch (switchError: any) {
          // If the chain is not added, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xa86a',
                  chainName: 'Avalanche Network',
                  nativeCurrency: {
                    name: 'AVAX',
                    symbol: 'AVAX',
                    decimals: 18
                  },
                  rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
                  blockExplorerUrls: ['https://snowtrace.io/']
                }]
              })
            } catch (addError) {
              console.error('Error adding Avalanche network:', addError)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      if (error.code === 4001) {
        setConnectionError("Connection rejected by user")
      } else {
        setConnectionError("Failed to connect wallet")
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setWalletAddress("")
  }

  const formatAddress = (address: string) => {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const handleSwapChains = () => {
    const temp = fromChain
    setFromChain(toChain)
    setToChain(temp)
  }

  const handleSend = async () => {
    if (!fromChain || !toChain || !amount || fromChain === toChain || !isConnected) return

    setIsTransferring(true)
    
    try {
      const result = await performTransfer({
        amount: parseFloat(amount),
        token,
        sourceChain: fromChain,
        destChain: toChain,
      })
      
      if (result) {
        // Success - the bridge API will handle the state
        console.log('Bridge transfer successful:', result)
      }
    } catch (error) {
      console.error('Bridge transfer failed:', error)
    } finally {
      setIsTransferring(false)
    }
  }

  const canSend = fromChain && toChain && amount && fromChain !== toChain && !isTransferring && isConnected

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Avalanche ICM Bridge</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Transfer your assets seamlessly across different blockchains using Avalanche's Inter-Chain Messaging
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('simple')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'simple'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Simple Bridge
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'advanced'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Advanced Operations
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'status'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Server Status
          </button>
        </div>

        {/* Wallet Connection Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {!isConnected ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Wallet className="h-12 w-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Connect Your Wallet
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Connect Core Wallet to start bridging assets on Avalanche
                  </p>
                  {connectionError && (
                    <div className="flex items-center justify-center space-x-2 text-red-600 mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{connectionError}</span>
                    </div>
                  )}
                  <Button 
                    onClick={connectWallet} 
                    disabled={isConnecting}
                    className="w-full max-w-sm"
                  >
                    {isConnecting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4" />
                        Connect Core Wallet
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Connected
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {formatAddress(walletAddress)}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={disconnectWallet}>
                  Disconnect
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === 'simple' && (
          <Card className="relative overflow-hidden">
            <CardHeader>
              <CardTitle className="text-center">Simple Bridge</CardTitle>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {availableChains === defaultChains 
                    ? "Using default chain list (bridge server not connected)"
                    : `Connected to bridge server - ${availableChains.length} chains available`
                  }
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* From & To Chains Side by Side */}
              <div className="flex items-end justify-between w-full">
                              {/* From Chain */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From Chain</label>
                  {availableChains === defaultChains && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded">
                      Using Default Chains
                    </span>
                  )}
                </div>
                <Select value={fromChain} onValueChange={setFromChain} disabled={!isConnected}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChains.map((chain) => (
                      <SelectItem key={chain.id} value={chain.id} disabled={chain.id === toChain}>
                        {chain.name} ({chain.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                {/* Swap Button */}
                <div className="mx-4 flex-shrink-0 flex items-center justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSwapChains}
                    disabled={isTransferring || !isConnected}
                    className="rounded-full bg-transparent"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                </div>

                {/* To Chain */}
                <div className="flex-1 space-y-2 flex flex-col items-end">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To Chain</label>
                  <Select value={toChain} onValueChange={setToChain} disabled={!isConnected}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination chain" />
                    </SelectTrigger>
                    <SelectContent>
                                          {availableChains.map((chain) => (
                      <SelectItem key={chain.id} value={chain.id} disabled={chain.id === fromChain}>
                        {chain.name} ({chain.symbol})
                      </SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Token Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Token</label>
                <Select value={token} onValueChange={setToken} disabled={!isConnected}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="WETH">WETH</SelectItem>
                    <SelectItem value="AVAX">AVAX</SelectItem>
                    <SelectItem value="MATIC">MATIC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isTransferring || !isConnected}
                  className="text-lg"
                />
              </div>

              {/* Animation Container */}
              {isTransferring && (
                <div className="my-8">
                  <BridgeAnimation />
                </div>
              )}

              {/* Send Button */}
              <Button onClick={handleSend} disabled={!canSend} className="w-full h-12 text-lg" size="lg">
                {isTransferring ? (
                  "Transferring..."
                ) : (
                  <>
                    Send <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              {/* Validation Messages */}
              {!isConnected && (
                <p className="text-sm text-amber-600 text-center">Please connect your wallet to continue</p>
              )}
              {fromChain === toChain && fromChain && (
                <p className="text-sm text-red-500 text-center">Source and destination chains must be different</p>
              )}

              {/* Bridge Error Display */}
              {bridgeError && (
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 p-3 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{bridgeError}</span>
                  <Button variant="ghost" size="sm" onClick={clearBridgeError} className="ml-auto">
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Transaction Result */}
              {lastTransaction && (
                <div className="p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center space-x-2 text-green-800 dark:text-green-200 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Bridge Transfer Successful!</span>
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <div>Transaction ID: <code className="bg-green-100 dark:bg-green-900 px-1 rounded">{lastTransaction.txId}</code></div>
                    <div>Amount: {lastTransaction.amount} {lastTransaction.token}</div>
                    <div>From: {lastTransaction.sourceChain} → To: {lastTransaction.destChain}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'advanced' && (
          <AdvancedBridge />
        )}

        {activeTab === 'status' && (
          <BridgeStatus onChainsUpdate={(chains) => {
            if (chains && chains.length > 0) {
              const transformedChains = chains.map(chain => ({
                id: chain.name,
                name: chain.name.charAt(0).toUpperCase() + chain.name.slice(1),
                symbol: chain.name.toUpperCase().slice(0, 3),
                chainId: chain.id.slice(0, 10) + '...'
              }))
              setAvailableChains(transformedChains)
            }
          }} />
        )}
      </div>
    </div>
  )
}