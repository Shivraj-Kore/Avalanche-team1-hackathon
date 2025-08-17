import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Info,
  Settings
} from 'lucide-react';
import { bridgeAPI, BridgeConfig, BlockchainsResponse } from '@/lib/bridge-api';

interface BridgeStatusProps {
  className?: string;
  onChainsUpdate?: (chains: any[]) => void;
}

export function BridgeStatus({ className }: BridgeStatusProps) {
  const [config, setConfig] = useState<BridgeConfig | null>(null);
  const [blockchains, setBlockchains] = useState<BlockchainsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServerInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [configData, blockchainsData] = await Promise.all([
        bridgeAPI.getConfig(),
        bridgeAPI.getBlockchains()
      ]);
      
      setConfig(configData);
      setBlockchains(blockchainsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load server information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServerInfo();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'disconnected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Server Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Server className="h-5 w-5" />
            <span>Bridge Server Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge className={getStatusColor('connected')}>
                {getStatusIcon('connected')}
                <span className="ml-1">Connected</span>
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadServerInfo}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {config && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Network:</span>
                <Badge variant="secondary">{config.network}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Default Source:</span>
                <Badge variant="outline">{config.defaultSourceChain}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Default Destination:</span>
                <Badge variant="outline">{config.defaultDestChain}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Blockchains Card */}
      {blockchains && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Settings className="h-5 w-5" />
              <span>Available Blockchains</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blockchains.blockchains.map((chain, index) => (
                <div key={chain.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">{chain.name}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {chain.id.slice(0, 20)}...
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {chain.subnetID.slice(0, 8)}...
                  </Badge>
                </div>
              ))}
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center pt-2">
                Total: {blockchains.totalCount} blockchains
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Bridge Server Information</p>
              <p>
                This interface connects to the Avalanche ICM Bridge Server running on localhost:3000. 
                Make sure the server is running before attempting bridge operations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 