/**
 * Wallet Context - Global State Management
 * 
 * Provides centralized wallet state management using React Context.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useBlockchain } from '@/api/hooks';
import { DEFAULT_CONFIG } from '@/api/chain';
import {
  getBalances,
  saveBalances,
  getUnspentCommitments,
  getTransactions,
  calculatePrivateBalance,
  type BalanceInfo,
  type StoredCommitment,
  type StoredTransaction,
} from '@/storage/database';
import { getWalletKeys } from '@/utils/key';
import { shouldLock } from '@/security/auth';

// ========== Types ==========

interface WalletContextType {
  // Authentication
  isLocked: boolean;
  isAuthenticated: boolean;
  unlock: () => Promise<boolean>;
  lock: () => void;

  // Wallet
  hasWallet: boolean;
  address: string | null;
  
  // Balances
  balances: BalanceInfo | null;
  refreshBalances: () => Promise<void>;
  
  // Commitments
  commitments: StoredCommitment[];
  unspentCommitments: StoredCommitment[];
  refreshCommitments: () => Promise<void>;
  
  // Transactions
  transactions: StoredTransaction[];
  refreshTransactions: () => Promise<void>;
  
  // Blockchain
  connected: boolean;
  blockNumber: number;
  
  // Loading states
  loading: boolean;
  error: Error | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// ========== Provider ==========

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  // Authentication state
  const [isLocked, setIsLocked] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Wallet state
  const [hasWallet, setHasWallet] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  // Balance state
  const [balances, setBalances] = useState<BalanceInfo | null>(null);

  // Commitment state
  const [commitments, setCommitments] = useState<StoredCommitment[]>([]);
  const [unspentCommitments, setUnspentCommitments] = useState<StoredCommitment[]>([]);

  // Transaction state
  const [transactions, setTransactions] = useState<StoredTransaction[]>([]);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Blockchain connection
  const blockchain = useBlockchain(DEFAULT_CONFIG);

  // ========== Wallet Initialization ==========

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      setLoading(true);

      // Check if wallet exists
      const keys = await getWalletKeys();
      if (keys) {
        setHasWallet(true);
        setAddress(keys.address);
      }

      // Check lock status
      const locked = await shouldLock();
      setIsLocked(locked);
      setIsAuthenticated(!locked);

      // Load cached data
      await Promise.all([
        loadBalances(),
        loadCommitments(),
        loadTransactions(),
      ]);

      setError(null);
    } catch (err) {
      console.error('Failed to initialize wallet:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // ========== Authentication ==========

  const unlock = useCallback(async (): Promise<boolean> => {
    // Authentication logic is handled by auth screens
    // This just updates state
    setIsLocked(false);
    setIsAuthenticated(true);
    
    // Refresh data after unlock
    await Promise.all([
      refreshBalances(),
      refreshCommitments(),
      refreshTransactions(),
    ]);

    return true;
  }, []);

  const lock = useCallback(() => {
    setIsLocked(true);
    setIsAuthenticated(false);
  }, []);

  // ========== Balances ==========

  const loadBalances = async () => {
    try {
      const cached = await getBalances();
      if (cached) {
        setBalances(cached);
      }
    } catch (err) {
      console.error('Failed to load balances:', err);
    }
  };

  const refreshBalances = useCallback(async () => {
    try {
      // Calculate private balance from unspent commitments
      const privateBalance = await calculatePrivateBalance();

      // Get public balance from chain (if connected)
      let publicBalance = '0';
      if (blockchain.connected && address) {
        try {
          const { getBalance } = await import('@/api/chain');
          publicBalance = await getBalance(address);
        } catch (err) {
          console.warn('Failed to fetch public balance:', err);
        }
      }

      // Calculate totals
      const totalBalance = (BigInt(publicBalance) + BigInt(privateBalance)).toString();

      const balanceInfo: BalanceInfo = {
        publicBalance,
        privateBalance,
        pendingBalance: '0', // TODO: Calculate from pending transactions
        totalBalance,
        lastUpdated: Date.now(),
      };

      setBalances(balanceInfo);
      await saveBalances(balanceInfo);
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    }
  }, [blockchain.connected, address]);

  // ========== Commitments ==========

  const loadCommitments = async () => {
    try {
      const [all, unspent] = await Promise.all([
        import('@/storage/database').then(m => m.getCommitments()),
        getUnspentCommitments(),
      ]);
      setCommitments(all);
      setUnspentCommitments(unspent);
    } catch (err) {
      console.error('Failed to load commitments:', err);
    }
  };

  const refreshCommitments = useCallback(async () => {
    await loadCommitments();
    // Also refresh balances since they depend on commitments
    await refreshBalances();
  }, [refreshBalances]);

  // ========== Transactions ==========

  const loadTransactions = async () => {
    try {
      const txs = await getTransactions();
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  };

  const refreshTransactions = useCallback(async () => {
    await loadTransactions();
  }, []);

  // ========== Auto-refresh ==========

  useEffect(() => {
    if (!isAuthenticated || !blockchain.connected) return;

    // Refresh data periodically
    const interval = setInterval(() => {
      refreshBalances();
      refreshTransactions();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, blockchain.connected, refreshBalances, refreshTransactions]);

  // ========== Context Value ==========

  const value: WalletContextType = {
    // Authentication
    isLocked,
    isAuthenticated,
    unlock,
    lock,

    // Wallet
    hasWallet,
    address,

    // Balances
    balances,
    refreshBalances,

    // Commitments
    commitments,
    unspentCommitments,
    refreshCommitments,

    // Transactions
    transactions,
    refreshTransactions,

    // Blockchain
    connected: blockchain.connected,
    blockNumber: blockchain.blockNumber,

    // Loading
    loading,
    error,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// ========== Hook ==========

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  
  return context;
}
