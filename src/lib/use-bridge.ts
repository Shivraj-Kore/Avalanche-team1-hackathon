import { useState, useCallback } from 'react';
import { bridgeAPI, BridgeRequest, TransferResponse, BridgeResponse } from './bridge-api';

export interface BridgeState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastTransaction: TransferResponse | null;
  serverStatus: 'connected' | 'disconnected' | 'checking';
}

export interface UseBridgeReturn extends BridgeState {
  // Connection management
  checkServerConnection: () => Promise<void>;
  
  // Bridge operations
  performTransfer: (request: BridgeRequest) => Promise<TransferResponse | null>;
  lockTokens: (request: BridgeRequest) => Promise<BridgeResponse | null>;
  mintTokens: (request: BridgeRequest & { txId?: string }) => Promise<BridgeResponse | null>;
  bidirectionalBridge: (request: { amount1: number; amount2?: number; token?: string; sourceChain?: string; destChain?: string }) => Promise<TransferResponse | null>;
  sendICMMessage: (request: { sourceChain: string; destChain: string; message: string }) => Promise<any>;
  
  // Utility functions
  clearError: () => void;
  resetState: () => void;
}

export const useBridge = (): UseBridgeReturn => {
  const [state, setState] = useState<BridgeState>({
    isConnected: false,
    isLoading: false,
    error: null,
    lastTransaction: null,
    serverStatus: 'checking',
  });

  const checkServerConnection = useCallback(async () => {
    setState(prev => ({ ...prev, serverStatus: 'checking' }));
    
    try {
      const isConnected = await bridgeAPI.testConnection();
      setState(prev => ({ 
        ...prev, 
        isConnected,
        serverStatus: isConnected ? 'connected' : 'disconnected',
        error: isConnected ? null : 'Bridge server is not accessible'
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isConnected: false,
        serverStatus: 'disconnected',
        error: 'Failed to connect to bridge server'
      }));
    }
  }, []);

  const performTransfer = useCallback(async (request: BridgeRequest): Promise<TransferResponse | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await bridgeAPI.transfer(request);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        lastTransaction: response,
        error: null
      }));
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Transfer failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage
      }));
      return null;
    }
  }, []);

  const lockTokens = useCallback(async (request: BridgeRequest): Promise<BridgeResponse | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await bridgeAPI.lockTokens(request);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: null
      }));
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Lock operation failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage
      }));
      return null;
    }
  }, []);

  const mintTokens = useCallback(async (request: BridgeRequest & { txId?: string }): Promise<BridgeResponse | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await bridgeAPI.mintTokens(request);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: null
      }));
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Mint operation failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage
      }));
      return null;
    }
  }, []);

  const bidirectionalBridge = useCallback(async (request: { amount1: number; amount2?: number; token?: string; sourceChain?: string; destChain?: string }): Promise<TransferResponse | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await bridgeAPI.bidirectionalBridge(request);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        lastTransaction: response,
        error: null
      }));
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Bidirectional bridge failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage
      }));
      return null;
    }
  }, []);

  const sendICMMessage = useCallback(async (request: { sourceChain: string; destChain: string; message: string }): Promise<any> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await bridgeAPI.sendICMMessage(request);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: null
      }));
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'ICM message failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage
      }));
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      isConnected: false,
      isLoading: false,
      error: null,
      lastTransaction: null,
      serverStatus: 'checking',
    });
  }, []);

  return {
    ...state,
    checkServerConnection,
    performTransfer,
    lockTokens,
    mintTokens,
    bidirectionalBridge,
    sendICMMessage,
    clearError,
    resetState,
  };
}; 