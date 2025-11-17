/**
 * React Hooks for Chain API Integration
 * 
 * Provides React hooks for managing blockchain connections,
 * transactions, and real-time event subscriptions.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  connect,
  disconnect,
  healthCheck,
  getChainState,
  subscribeToDeposits,
  subscribeToPrivateTransfers,
  subscribeToWithdraws,
  deposit,
  privateTransfer,
  withdraw,
  type ChainConfig,
  type ChainState,
  type TransactionResult,
  type DepositParams,
  type PrivateTransferParams,
  type WithdrawParams,
  type EventSubscription,
} from './chain';
import { getWalletKeys } from '@/utils/key';
import { createKeyringPair } from './chain';
import type { KeyringPair } from '@polkadot/keyring/types';

// ========== Connection Hook ==========

export interface UseChainConnectionResult {
  connected: boolean;
  connecting: boolean;
  error: Error | null;
  blockNumber: number;
  reconnect: () => Promise<void>;
}

/**
 * Hook for managing chain connection
 */
export function useChainConnection(
  config: ChainConfig
): UseChainConnectionResult {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [blockNumber, setBlockNumber] = useState(0);
  const mounted = useRef(true);
  const healthCheckInterval = useRef<any>(null);

  const connectToChain = useCallback(async () => {
    if (connecting) return;

    setConnecting(true);
    setError(null);

    try {
      await connect(config);
      
      if (mounted.current) {
        setConnected(true);
        setConnecting(false);

        // Start health check polling
        healthCheckInterval.current = setInterval(async () => {
          try {
            const health = await healthCheck();
            if (mounted.current) {
              setConnected(health.connected);
              setBlockNumber(health.blockNumber);
            }
          } catch (err) {
            if (mounted.current) {
              setConnected(false);
            }
          }
        }, 5000);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err as Error);
        setConnected(false);
        setConnecting(false);
      }
    }
  }, [config, connecting]);

  useEffect(() => {
    mounted.current = true;
    connectToChain();

    return () => {
      mounted.current = false;
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
      }
      disconnect();
    };
  }, [connectToChain]);

  return {
    connected,
    connecting,
    error,
    blockNumber,
    reconnect: connectToChain,
  };
}

// ========== Chain State Hook ==========

export interface UseChainStateResult {
  state: ChainState | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching and monitoring chain state
 */
export function useChainState(autoRefresh = true): UseChainStateResult {
  const [state, setState] = useState<ChainState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);
  const refreshInterval = useRef<any>(null);

  const fetchState = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const chainState = await getChainState();
      if (mounted.current) {
        setState(chainState);
        setLoading(false);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err as Error);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    fetchState();

    if (autoRefresh) {
      refreshInterval.current = setInterval(fetchState, 10000); // Refresh every 10s
    }

    return () => {
      mounted.current = false;
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [fetchState, autoRefresh]);

  return {
    state,
    loading,
    error,
    refresh: fetchState,
  };
}

// ========== Transaction Hook ==========

export interface UseTransactionResult {
  submit: () => Promise<TransactionResult | null>;
  submitting: boolean;
  result: TransactionResult | null;
  error: Error | null;
  reset: () => void;
}

/**
 * Generic hook for submitting transactions
 */
export function useTransaction<TParams>(
  txFunction: (params: TParams, signer: KeyringPair) => Promise<TransactionResult>,
  params: TParams | null
): UseTransactionResult {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(async () => {
    if (!params || submitting) return null;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      // Get wallet keys
      const keys = await getWalletKeys();
      if (!keys) {
        throw new Error('No wallet found');
      }

      // Create signer
      const signer = createKeyringPair(keys.mnemonic);

      // Submit transaction
      const txResult = await txFunction(params, signer as any);
      
      setResult(txResult);
      setSubmitting(false);
      return txResult;
    } catch (err) {
      setError(err as Error);
      setSubmitting(false);
      return null;
    }
  }, [params, submitting, txFunction]);

  const reset = useCallback(() => {
    setSubmitting(false);
    setResult(null);
    setError(null);
  }, []);

  return {
    submit,
    submitting,
    result,
    error,
    reset,
  };
}

// ========== Specific Transaction Hooks ==========

/**
 * Hook for deposit transactions
 */
export function useDeposit(params: DepositParams | null) {
  return useTransaction(deposit, params);
}

/**
 * Hook for private transfer transactions
 */
export function usePrivateTransfer(params: PrivateTransferParams | null) {
  return useTransaction(privateTransfer, params);
}

/**
 * Hook for withdraw transactions
 */
export function useWithdraw(params: WithdrawParams | null) {
  return useTransaction(withdraw, params);
}

// ========== Event Subscription Hook ==========

export interface UseEventsResult {
  deposits: any[];
  transfers: any[];
  withdrawals: any[];
  listening: boolean;
}

/**
 * Hook for subscribing to blockchain events
 */
export function useEvents(): UseEventsResult {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [listening, setListening] = useState(false);
  const depositSub = useRef<EventSubscription | null>(null);
  const transferSub = useRef<EventSubscription | null>(null);
  const withdrawSub = useRef<EventSubscription | null>(null);

  useEffect(() => {
    // Subscribe to events
    depositSub.current = subscribeToDeposits((data: any) => {
      setDeposits((prev) => [...prev, data]);
    });

    transferSub.current = subscribeToPrivateTransfers((data: any) => {
      setTransfers((prev) => [...prev, data]);
    });

    withdrawSub.current = subscribeToWithdraws((data: any) => {
      setWithdrawals((prev) => [...prev, data]);
    });

    setListening(true);

    // Cleanup
    return () => {
      if (depositSub.current) depositSub.current.unsubscribe();
      if (transferSub.current) transferSub.current.unsubscribe();
      if (withdrawSub.current) withdrawSub.current.unsubscribe();
      setListening(false);
    };
  }, []);

  return {
    deposits,
    transfers,
    withdrawals,
    listening,
  };
}

// ========== Deposit Event Hook ==========

/**
 * Hook for subscribing to deposit events only
 */
export function useDepositEvents(
  callback?: (data: any) => void
): { deposits: any[]; listening: boolean } {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [listening, setListening] = useState(false);
  const subscription = useRef<EventSubscription | null>(null);

  useEffect(() => {
    subscription.current = subscribeToDeposits((data:any) => {
      setDeposits((prev) => [...prev, data]);
      if (callback) callback(data);
    });

    setListening(true);

    return () => {
      if (subscription.current) {
        subscription.current.unsubscribe();
      }
      setListening(false);
    };
  }, [callback]);

  return { deposits, listening };
}

// ========== Private Transfer Event Hook ==========

/**
 * Hook for subscribing to private transfer events
 */
export function usePrivateTransferEvents(
  callback?: (data: any) => void
): { transfers: any[]; listening: boolean } {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [listening, setListening] = useState(false);
  const subscription = useRef<EventSubscription | null>(null);

  useEffect(() => {
    subscription.current = subscribeToPrivateTransfers((data: any) => {
      setTransfers((prev) => [...prev, data]);
      if (callback) callback(data);
    });

    setListening(true);

    return () => {
      if (subscription.current) {
        subscription.current.unsubscribe();
      }
      setListening(false);
    };
  }, [callback]);

  return { transfers, listening };
}

// ========== Withdraw Event Hook ==========

/**
 * Hook for subscribing to withdrawal events
 */
export function useWithdrawEvents(
  callback?: (data: any) => void
): { withdrawals: any[]; listening: boolean } {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [listening, setListening] = useState(false);
  const subscription = useRef<EventSubscription | null>(null);

  useEffect(() => {
    subscription.current = subscribeToWithdraws((data: any) => {
      setWithdrawals((prev) => [...prev, data]);
      if (callback) callback(data);
    });

    setListening(true);

    return () => {
      if (subscription.current) {
        subscription.current.unsubscribe();
      }
      setListening(false);
    };
  }, [callback]);

  return { withdrawals, listening };
}

// ========== Combined Hook ==========

/**
 * All-in-one hook for complete chain integration
 */
export interface UseBlockchainResult {
  // Connection
  connected: boolean;
  connecting: boolean;
  blockNumber: number;
  reconnect: () => Promise<void>;
  
  // State
  chainState: ChainState | null;
  refreshState: () => Promise<void>;
  
  // Events
  deposits: any[];
  transfers: any[];
  withdrawals: any[];
  listening: boolean;
  
  // Errors
  error: Error | null;
}

export function useBlockchain(config: ChainConfig): UseBlockchainResult {
  const connection = useChainConnection(config);
  const state = useChainState(true);
  const events = useEvents();

  return {
    // Connection
    connected: connection.connected,
    connecting: connection.connecting,
    blockNumber: connection.blockNumber,
    reconnect: connection.reconnect,
    
    // State
    chainState: state.state,
    refreshState: state.refresh,
    
    // Events
    deposits: events.deposits,
    transfers: events.transfers,
    withdrawals: events.withdrawals,
    listening: events.listening,
    
    // Errors
    error: connection.error || state.error,
  };
}
