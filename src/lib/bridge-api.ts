export interface BridgeConfig {
  network: string;
  privateKeyPrefix: string;
  platformAPI: string;
  cChainAPI: string;
  defaultSourceChain: string;
  defaultDestChain: string;
  note: string;
}

export interface Blockchain {
  name: string;
  id: string;
  subnetID: string;
  vmID: string;
}

export interface BlockchainsResponse {
  success: boolean;
  method: string;
  blockchains: Blockchain[];
  totalCount: number;
  timestamp: string;
}

export interface BridgeRequest {
  amount: number;
  token?: string;
  sourceChain?: string;
  destChain?: string;
}

export interface BridgeResponse {
  success: boolean;
  txId: string;
  operation: string;
  amount: number;
  token: string;
  sourceChain: string;
  destChain: string;
  message: string;
  cliOutput: string;
  cliError: string;
  timestamp: string;
}

export interface TransferResponse {
  success: boolean;
  txId: string;
  operation: string;
  amount: number;
  token: string;
  sourceChain: string;
  destChain: string;
  results: Array<{
    step: number;
    operation: string;
    success: boolean;
    message: string;
    output: string;
  }>;
  timestamp: string;
}

export interface BidirectionalRequest {
  amount1?: number;
  amount2?: number;
  token?: string;
  sourceChain?: string;
  destChain?: string;
}

export interface ICMRequest {
  sourceChain: string;
  destChain: string;
  message: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  config: {
    sourceChain: string;
    destChain: string;
    network: string;
  };
}

class BridgeAPIService {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  // Get configuration
  async getConfig(): Promise<BridgeConfig> {
    return this.request<BridgeConfig>('/api/config');
  }

  // Get all blockchains
  async getBlockchains(): Promise<BlockchainsResponse> {
    return this.request<BlockchainsResponse>('/api/blockchains');
  }

  // Get network information
  async getNetworkInfo(): Promise<any> {
    return this.request('/api/network/info');
  }

  // Lock tokens
  async lockTokens(request: BridgeRequest): Promise<BridgeResponse> {
    return this.request<BridgeResponse>('/api/bridge/lock', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Mint tokens
  async mintTokens(request: BridgeRequest & { txId?: string }): Promise<BridgeResponse> {
    return this.request<BridgeResponse>('/api/bridge/mint', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Complete bridge transfer
  async transfer(request: BridgeRequest): Promise<TransferResponse> {
    return this.request<TransferResponse>('/api/bridge/transfer', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Bidirectional bridge
  async bidirectionalBridge(request: BidirectionalRequest): Promise<TransferResponse> {
    return this.request<TransferResponse>('/api/bridge/bidirectional', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Send custom ICM message
  async sendICMMessage(request: ICMRequest): Promise<any> {
    return this.request('/api/icm/send', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Get bridge status
  async getBridgeStatus(txId?: string): Promise<any> {
    const endpoint = txId ? `/api/bridge/status/${txId}` : '/api/bridge/status';
    return this.request(endpoint);
  }

  // Test server connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch (error) {
      console.error('Bridge server connection failed:', error);
      return false;
    }
  }
}

export const bridgeAPI = new BridgeAPIService();
export default BridgeAPIService; 