"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpDown, ArrowRight, ArrowRightLeft, Wallet, CheckCircle, AlertCircle } from "lucide-react"
import { BridgeAnimation } from "@/components/bridge-animation"

const chains = [
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
  const [isTransferring, setIsTransferring] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string>("")

  // Check if Core Wallet is installed
  const isCoreWalletInstalled = () => {
    return typeof window !== 'undefined' && window.ethereum && window.ethereum.isAvalanche
  }

  // Check connection on component mount
  useEffect(() => {
    checkConnection()
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
    // Simulate transfer delay
    await new Promise((resolve) => setTimeout(resolve, 8000))
    setIsTransferring(false)
  }

  const canSend = fromChain && toChain && amount && fromChain !== toChain && !isTransferring && isConnected

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Crypto Bridge</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Transfer your assets seamlessly across different blockchains
          </p>
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

        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-center">Bridge Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* From & To Chains Side by Side */}
            <div className="flex items-end justify-between w-full">
              {/* From Chain */}
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From Chain</label>
                <Select value={fromChain} onValueChange={setFromChain} disabled={!isConnected}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {chains.map((chain) => (
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
                    {chains.map((chain) => (
                      <SelectItem key={chain.id} value={chain.id} disabled={chain.id === fromChain}>
                        {chain.name} ({chain.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}