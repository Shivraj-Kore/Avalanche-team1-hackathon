import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRightLeft, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useBridge } from '@/lib/use-bridge';

interface AdvancedBridgeProps {
  className?: string;
}

export function AdvancedBridge({ className }: AdvancedBridgeProps) {
  const [operation, setOperation] = useState<'bidirectional' | 'icm'>('bidirectional');
  const [amount1, setAmount1] = useState<string>('100');
  const [amount2, setAmount2] = useState<string>('50');
  const [token, setToken] = useState<string>('USDC');
  const [sourceChain, setSourceChain] = useState<string>('chain2');
  const [destChain, setDestChain] = useState<string>('chain3');
  const [customMessage, setCustomMessage] = useState<string>('Hello from Avalanche Bridge!');
  
  const { 
    performTransfer, 
    bidirectionalBridge, 
    sendICMMessage, 
    isLoading, 
    error, 
    lastTransaction,
    clearError 
  } = useBridge();

  const handleBidirectionalBridge = async () => {
    if (!amount1 || !amount2) return;
    
    await bidirectionalBridge({
      amount1: parseFloat(amount1),
      amount2: parseFloat(amount2),
      token,
      sourceChain,
      destChain,
    });
  };

  const handleSendICM = async () => {
    if (!customMessage.trim()) return;
    
    await sendICMMessage({
      sourceChain,
      destChain,
      message: customMessage.trim(),
    });
  };

  const handleCompleteTransfer = async () => {
    if (!amount1) return;
    
    await performTransfer({
      amount: parseFloat(amount1),
      token,
      sourceChain,
      destChain,
    });
  };

  const tokens = ['USDC', 'USDT', 'WETH', 'AVAX', 'MATIC'];
  const chains = ['chain2', 'chain3', 'ethereum', 'polygon', 'avalanche', 'bsc'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Operation Selector */}
      <div className="flex space-x-2">
        <Button
          variant={operation === 'bidirectional' ? 'default' : 'outline'}
          onClick={() => setOperation('bidirectional')}
          className="flex-1"
        >
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Bidirectional Bridge
        </Button>
        <Button
          variant={operation === 'icm' ? 'default' : 'outline'}
          onClick={() => setOperation('icm')}
          className="flex-1"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Custom ICM Message
        </Button>
      </div>

      {/* Bidirectional Bridge */}
      {operation === 'bidirectional' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ArrowRightLeft className="h-5 w-5" />
              <span>Bidirectional Bridge</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Forward Amount</label>
                <Input
                  type="number"
                  placeholder="100"
                  value={amount1}
                  onChange={(e) => setAmount1(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reverse Amount</label>
                <Input
                  type="number"
                  placeholder="50"
                  value={amount2}
                  onChange={(e) => setAmount2(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Token</label>
                <Select value={token} onValueChange={setToken} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Source Chain</label>
                <Select value={sourceChain} onValueChange={setSourceChain} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chains.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dest Chain</label>
                <Select value={destChain} onValueChange={setDestChain} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chains.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button 
                onClick={handleBidirectionalBridge} 
                disabled={isLoading || !amount1 || !amount2}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Bridging...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Start Bidirectional Bridge
                  </>
                )}
              </Button>
              <Button 
                onClick={handleCompleteTransfer} 
                disabled={isLoading || !amount1}
                variant="outline"
              >
                Complete Transfer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom ICM Message */}
      {operation === 'icm' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Custom ICM Message</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Input
                placeholder="Enter your custom message..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Source Chain</label>
                <Select value={sourceChain} onValueChange={setSourceChain} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chains.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dest Chain</label>
                <Select value={destChain} onValueChange={setDestChain} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chains.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleSendICM} 
              disabled={isLoading || !customMessage.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send ICM Message
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Result */}
      {lastTransaction && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-green-800 dark:text-green-200 mb-2">
                  Transaction Successful!
                </div>
                <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <div>Transaction ID: <code className="bg-green-100 dark:bg-green-900 px-1 rounded">{lastTransaction.txId}</code></div>
                  <div>Operation: {lastTransaction.operation}</div>
                  <div>Amount: {lastTransaction.amount} {lastTransaction.token}</div>
                  <div>From: {lastTransaction.sourceChain} → To: {lastTransaction.destChain}</div>
                  {lastTransaction.results && (
                    <div className="mt-2">
                      <div className="font-medium mb-1">Steps:</div>
                      {lastTransaction.results.map((step, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Badge variant={step.success ? 'default' : 'destructive'} className="text-xs">
                            {step.step}
                          </Badge>
                          <span>{step.operation}: {step.output}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 