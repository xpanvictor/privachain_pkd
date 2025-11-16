/**
 * API Module - Barrel Export
 * 
 * Central export point for all API functionality
 */

// Chain API
export {
  // Connection Management
  connect,
  disconnect,
  getApi,
  isConnected,
  
  // Keyring
  createKeyringPair,
  
  // Transactions
  deposit,
  privateTransfer,
  withdraw,
  
  // State Queries
  getMerkleRoot,
  getCommitmentCount,
  isNullifierSpent,
  getCommitment,
  getMerklePath,
  getBalance,
  getChainState,
  getCommitmentsBatch,
  
  // Event Subscriptions
  subscribeToDeposits,
  subscribeToPrivateTransfers,
  subscribeToWithdraws,
  subscribeToAllEvents,
  
  // Utilities
  waitForConfirmations,
  estimateFee,
  getChainInfo,
  healthCheck,
  
  // Constants
  DEFAULT_CONFIG,
  
  // Types
  type ChainConfig,
  type TransactionResult,
  type ChainState,
  type DepositParams,
  type PrivateTransferParams,
  type WithdrawParams,
  type EncryptedNote,
  type EventSubscription,
} from './chain';

// Indexer API
export {
  // Initialization
  initIndexer,
  
  // Commitment Queries
  getCommitmentByIndex,
  getCommitmentsInRange,
  getAllCommitments,
  searchCommitment,
  
  // Nullifier Queries
  isNullifierSpentIndexer,
  getNullifierRecord,
  getNullifiersInRange,
  
  // Event Queries
  getEventsInRange,
  getDeposits,
  getPrivateTransfers,
  getWithdrawals,
  
  // Merkle Tree
  getMerkleTreeSnapshot,
  getMerkleProof,
  verifyMerkleProof,
  
  // Scanning
  scanChain,
  scanForMyNotes,
  
  // Statistics
  getStatistics,
  getSyncStatus,
  
  // Caching
  cacheCommitment,
  getCachedCommitments,
  clearCache,
  
  // Constants
  DEFAULT_INDEXER_CONFIG,
  
  // Types
  type IndexerConfig,
  type CommitmentRecord,
  type NullifierRecord,
  type TransferEvent,
  type MerkleTreeSnapshot,
  type ScanProgress,
} from './indexer';
