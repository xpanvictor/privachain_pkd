/**
 * Database Layer - Local Storage for Commitments, Transactions, and Settings
 * 
 * Provides persistent storage using AsyncStorage with a clean functional API.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ========== Types ==========

export interface StoredCommitment {
  id: string;
  commitment: string;
  amount: string;
  secret: string;
  recipient: string;
  spent: boolean;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  note?: string;
}

export interface StoredTransaction {
  id: string;
  type: 'deposit' | 'private_transfer' | 'withdraw';
  status: 'pending' | 'confirmed' | 'failed';
  amount: string;
  from?: string;
  to?: string;
  blockNumber?: number;
  blockHash?: string;
  transactionHash?: string;
  timestamp: number;
  error?: string;
  metadata?: any;
}

export interface WalletSettings {
  autoLock: boolean;
  autoLockTimeout: number; // minutes
  biometricEnabled: boolean;
  pinEnabled: boolean;
  showBalance: boolean;
  defaultEndpoint: string;
  currency: 'USD' | 'EUR' | 'GBP';
  theme: 'light' | 'dark' | 'auto';
}

export interface SyncState {
  lastSyncBlock: number;
  lastSyncTimestamp: number;
  syncing: boolean;
}

// ========== Storage Keys ==========

const KEYS = {
  COMMITMENTS: '@privachain/commitments',
  TRANSACTIONS: '@privachain/transactions',
  SETTINGS: '@privachain/settings',
  SYNC_STATE: '@privachain/sync_state',
  BALANCES: '@privachain/balances',
} as const;

// ========== Commitments ==========

/**
 * Save commitment to storage
 */
export const saveCommitment = async (
  commitment: StoredCommitment
): Promise<void> => {
  try {
    const existing = await getCommitments();
    const updated = [...existing, commitment];
    await AsyncStorage.setItem(KEYS.COMMITMENTS, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save commitment:', error);
    throw error;
  }
};

/**
 * Get all commitments
 */
export const getCommitments = async (): Promise<StoredCommitment[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.COMMITMENTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get commitments:', error);
    return [];
  }
};

/**
 * Get unspent commitments
 */
export const getUnspentCommitments = async (): Promise<StoredCommitment[]> => {
  const commitments = await getCommitments();
  return commitments.filter((c) => !c.spent);
};

/**
 * Mark commitment as spent
 */
export const markCommitmentSpent = async (
  commitmentHash: string
): Promise<void> => {
  try {
    const commitments = await getCommitments();
    const updated = commitments.map((c) =>
      c.commitment === commitmentHash ? { ...c, spent: true } : c
    );
    await AsyncStorage.setItem(KEYS.COMMITMENTS, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to mark commitment as spent:', error);
    throw error;
  }
};

/**
 * Get commitment by hash
 */
export const getCommitmentByHash = async (
  hash: string
): Promise<StoredCommitment | null> => {
  const commitments = await getCommitments();
  return commitments.find((c) => c.commitment === hash) || null;
};

/**
 * Delete commitment
 */
export const deleteCommitment = async (id: string): Promise<void> => {
  try {
    const commitments = await getCommitments();
    const updated = commitments.filter((c) => c.id !== id);
    await AsyncStorage.setItem(KEYS.COMMITMENTS, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to delete commitment:', error);
    throw error;
  }
};

/**
 * Clear all commitments
 */
export const clearCommitments = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEYS.COMMITMENTS);
};

// ========== Transactions ==========

/**
 * Save transaction
 */
export const saveTransaction = async (
  transaction: StoredTransaction
): Promise<void> => {
  try {
    const existing = await getTransactions();
    const updated = [transaction, ...existing]; // Newest first
    await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save transaction:', error);
    throw error;
  }
};

/**
 * Get all transactions
 */
export const getTransactions = async (): Promise<StoredTransaction[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get transactions:', error);
    return [];
  }
};

/**
 * Get transactions by type
 */
export const getTransactionsByType = async (
  type: StoredTransaction['type']
): Promise<StoredTransaction[]> => {
  const transactions = await getTransactions();
  return transactions.filter((t) => t.type === type);
};

/**
 * Get pending transactions
 */
export const getPendingTransactions = async (): Promise<StoredTransaction[]> => {
  const transactions = await getTransactions();
  return transactions.filter((t) => t.status === 'pending');
};

/**
 * Update transaction status
 */
export const updateTransactionStatus = async (
  id: string,
  status: StoredTransaction['status'],
  updates?: Partial<StoredTransaction>
): Promise<void> => {
  try {
    const transactions = await getTransactions();
    const updated = transactions.map((t) =>
      t.id === id ? { ...t, status, ...updates } : t
    );
    await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to update transaction status:', error);
    throw error;
  }
};

/**
 * Delete transaction
 */
export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    const transactions = await getTransactions();
    const updated = transactions.filter((t) => t.id !== id);
    await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    throw error;
  }
};

/**
 * Clear all transactions
 */
export const clearTransactions = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEYS.TRANSACTIONS);
};

// ========== Settings ==========

const DEFAULT_SETTINGS: WalletSettings = {
  autoLock: true,
  autoLockTimeout: 5,
  biometricEnabled: false,
  pinEnabled: false,
  showBalance: true,
  defaultEndpoint: 'ws://127.0.0.1:9944',
  currency: 'USD',
  theme: 'auto',
};

/**
 * Get wallet settings
 */
export const getSettings = async (): Promise<WalletSettings> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to get settings:', error);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Save wallet settings
 */
export const saveSettings = async (
  settings: Partial<WalletSettings>
): Promise<void> => {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
};

/**
 * Reset settings to defaults
 */
export const resetSettings = async (): Promise<void> => {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
};

// ========== Sync State ==========

/**
 * Get sync state
 */
export const getSyncState = async (): Promise<SyncState> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SYNC_STATE);
    return data
      ? JSON.parse(data)
      : { lastSyncBlock: 0, lastSyncTimestamp: 0, syncing: false };
  } catch (error) {
    console.error('Failed to get sync state:', error);
    return { lastSyncBlock: 0, lastSyncTimestamp: 0, syncing: false };
  }
};

/**
 * Update sync state
 */
export const updateSyncState = async (
  state: Partial<SyncState>
): Promise<void> => {
  try {
    const current = await getSyncState();
    const updated = { ...current, ...state };
    await AsyncStorage.setItem(KEYS.SYNC_STATE, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to update sync state:', error);
    throw error;
  }
};

// ========== Balances ==========

export interface BalanceInfo {
  publicBalance: string;
  privateBalance: string;
  pendingBalance: string;
  totalBalance: string;
  lastUpdated: number;
}

/**
 * Get cached balances
 */
export const getBalances = async (): Promise<BalanceInfo | null> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.BALANCES);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get balances:', error);
    return null;
  }
};

/**
 * Save balances
 */
export const saveBalances = async (balances: BalanceInfo): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.BALANCES, JSON.stringify(balances));
  } catch (error) {
    console.error('Failed to save balances:', error);
    throw error;
  }
};

// ========== Utilities ==========

/**
 * Clear all data (use with caution!)
 */
export const clearAllData = async (): Promise<void> => {
  await Promise.all([
    clearCommitments(),
    clearTransactions(),
    AsyncStorage.removeItem(KEYS.SYNC_STATE),
    AsyncStorage.removeItem(KEYS.BALANCES),
  ]);
};

/**
 * Export all data for backup
 */
export const exportData = async (): Promise<{
  commitments: StoredCommitment[];
  transactions: StoredTransaction[];
  settings: WalletSettings;
  timestamp: number;
}> => {
  const [commitments, transactions, settings] = await Promise.all([
    getCommitments(),
    getTransactions(),
    getSettings(),
  ]);

  return {
    commitments,
    transactions,
    settings,
    timestamp: Date.now(),
  };
};

/**
 * Import data from backup
 */
export const importData = async (data: {
  commitments?: StoredCommitment[];
  transactions?: StoredTransaction[];
  settings?: Partial<WalletSettings>;
}): Promise<void> => {
  try {
    if (data.commitments) {
      await AsyncStorage.setItem(KEYS.COMMITMENTS, JSON.stringify(data.commitments));
    }
    if (data.transactions) {
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
    }
    if (data.settings) {
      await saveSettings(data.settings);
    }
  } catch (error) {
    console.error('Failed to import data:', error);
    throw error;
  }
};

/**
 * Calculate private balance from unspent commitments
 */
export const calculatePrivateBalance = async (): Promise<string> => {
  const unspent = await getUnspentCommitments();
  const total = unspent.reduce((sum, c) => sum + BigInt(c.amount), BigInt(0));
  return total.toString();
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async () => {
  const [commitments, transactions, unspent] = await Promise.all([
    getCommitments(),
    getTransactions(),
    getUnspentCommitments(),
  ]);

  return {
    totalCommitments: commitments.length,
    unspentCommitments: unspent.length,
    spentCommitments: commitments.length - unspent.length,
    totalTransactions: transactions.length,
    pendingTransactions: transactions.filter((t) => t.status === 'pending').length,
    confirmedTransactions: transactions.filter((t) => t.status === 'confirmed').length,
    failedTransactions: transactions.filter((t) => t.status === 'failed').length,
  };
};
