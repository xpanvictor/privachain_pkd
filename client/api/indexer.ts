/**
 * Indexer API Layer - Off-chain Data Indexing & Querying
 * 
 * Provides efficient access to historical blockchain data through an indexer service.
 * Falls back to direct chain queries if indexer is unavailable.
 */

import { getApi, getCommitment, getCommitmentsBatch } from './chain';

// ========== Types ==========

export interface IndexerConfig {
  endpoint: string;
  fallbackToChain?: boolean;
}

export interface CommitmentRecord {
  commitment: string;
  index: number;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface NullifierRecord {
  nullifier: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface TransferEvent {
  type: 'deposit' | 'private_transfer' | 'withdraw';
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
  timestamp: number;
  data: any;
}

export interface MerkleTreeSnapshot {
  root: string;
  size: number;
  blockNumber: number;
  commitments: string[];
}

export interface ScanProgress {
  startBlock: number;
  endBlock: number;
  currentBlock: number;
  commitmentsFound: number;
  nullifiersFound: number;
}

// ========== Indexer Client ==========

let indexerConfig: IndexerConfig | null = null;

/**
 * Initialize indexer connection
 */
export const initIndexer = (config: IndexerConfig): void => {
  indexerConfig = config;
  console.log(`Indexer configured: ${config.endpoint}`);
};

/**
 * Check if indexer is available
 */
const isIndexerAvailable = async (): Promise<boolean> => {
  if (!indexerConfig) return false;

  try {
    const response = await fetch(`${indexerConfig.endpoint}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch (error) {
    console.warn('Indexer not available:', error);
    return false;
  }
};

/**
 * Fetch from indexer with fallback to chain
 */
const fetchWithFallback = async <T>(
  indexerFn: () => Promise<T>,
  chainFallbackFn: () => Promise<T>
): Promise<T> => {
  const available = await isIndexerAvailable();

  if (available) {
    try {
      return await indexerFn();
    } catch (error) {
      console.warn('Indexer query failed, falling back to chain:', error);
    }
  }

  if (indexerConfig?.fallbackToChain) {
    return await chainFallbackFn();
  }

  throw new Error('Indexer unavailable and fallback disabled');
};

// ========== Commitment Queries ==========

/**
 * Get commitment by index
 */
export const getCommitmentByIndex = async (
  index: number
): Promise<CommitmentRecord | null> => {
  return fetchWithFallback(
    async () => {
      const response = await fetch(
        `${indexerConfig!.endpoint}/commitments/${index}`
      );
      if (!response.ok) return null;
      return await response.json();
    },
    async () => {
      const commitment = await getCommitment(index);
      if (!commitment) return null;

      // Return minimal record without indexer metadata
      return {
        commitment,
        index,
        blockNumber: 0,
        transactionHash: '0x',
        timestamp: Date.now(),
      };
    }
  );
};

/**
 * Get commitments in range
 */
export const getCommitmentsInRange = async (
  startIndex: number,
  endIndex: number
): Promise<CommitmentRecord[]> => {
  return fetchWithFallback(
    async () => {
      const response = await fetch(
        `${indexerConfig!.endpoint}/commitments?start=${startIndex}&end=${endIndex}`
      );
      if (!response.ok) return [];
      return await response.json();
    },
    async () => {
      const indices = Array.from(
        { length: endIndex - startIndex + 1 },
        (_, i) => startIndex + i
      );

      const commitments = await getCommitmentsBatch(indices);

      return commitments
        .map((commitment, i) =>
          commitment
            ? {
                commitment,
                index: startIndex + i,
                blockNumber: 0,
                transactionHash: '0x',
                timestamp: Date.now(),
              }
            : null
        )
        .filter((c): c is CommitmentRecord => c !== null);
    }
  );
};

/**
 * Get all commitments (paginated)
 */
export const getAllCommitments = async (
  page = 0,
  pageSize = 100
): Promise<{ commitments: CommitmentRecord[]; total: number }> => {
  if (!indexerConfig) {
    throw new Error('Indexer not configured');
  }

  const response = await fetch(
    `${indexerConfig.endpoint}/commitments?page=${page}&size=${pageSize}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch commitments');
  }

  return await response.json();
};

/**
 * Search commitments by hash
 */
export const searchCommitment = async (
  commitmentHash: string
): Promise<CommitmentRecord | null> => {
  if (!indexerConfig) return null;

  try {
    const response = await fetch(
      `${indexerConfig.endpoint}/commitments/search?hash=${commitmentHash}`
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Commitment search failed:', error);
    return null;
  }
};

// ========== Nullifier Queries ==========

/**
 * Check if nullifier is spent
 */
export const isNullifierSpentIndexer = async (
  nullifier: string
): Promise<boolean> => {
  if (!indexerConfig) return false;

  try {
    const response = await fetch(
      `${indexerConfig.endpoint}/nullifiers/${nullifier}`
    );
    return response.ok;
  } catch (error) {
    console.error('Nullifier check failed:', error);
    return false;
  }
};

/**
 * Get nullifier record
 */
export const getNullifierRecord = async (
  nullifier: string
): Promise<NullifierRecord | null> => {
  if (!indexerConfig) return null;

  try {
    const response = await fetch(
      `${indexerConfig.endpoint}/nullifiers/${nullifier}`
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to get nullifier record:', error);
    return null;
  }
};

/**
 * Get all nullifiers in block range
 */
export const getNullifiersInRange = async (
  startBlock: number,
  endBlock: number
): Promise<NullifierRecord[]> => {
  if (!indexerConfig) return [];

  try {
    const response = await fetch(
      `${indexerConfig.endpoint}/nullifiers?startBlock=${startBlock}&endBlock=${endBlock}`
    );
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Failed to get nullifiers in range:', error);
    return [];
  }
};

// ========== Event Queries ==========

/**
 * Get events in block range
 */
export const getEventsInRange = async (
  startBlock: number,
  endBlock: number,
  eventType?: 'deposit' | 'private_transfer' | 'withdraw'
): Promise<TransferEvent[]> => {
  if (!indexerConfig) return [];

  try {
    let url = `${indexerConfig.endpoint}/events?startBlock=${startBlock}&endBlock=${endBlock}`;
    if (eventType) {
      url += `&type=${eventType}`;
    }

    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Failed to get events:', error);
    return [];
  }
};

/**
 * Get deposits in block range
 */
export const getDeposits = async (
  startBlock: number,
  endBlock: number
): Promise<TransferEvent[]> => {
  return getEventsInRange(startBlock, endBlock, 'deposit');
};

/**
 * Get private transfers in block range
 */
export const getPrivateTransfers = async (
  startBlock: number,
  endBlock: number
): Promise<TransferEvent[]> => {
  return getEventsInRange(startBlock, endBlock, 'private_transfer');
};

/**
 * Get withdrawals in block range
 */
export const getWithdrawals = async (
  startBlock: number,
  endBlock: number
): Promise<TransferEvent[]> => {
  return getEventsInRange(startBlock, endBlock, 'withdraw');
};

// ========== Merkle Tree Queries ==========

/**
 * Get Merkle tree snapshot at block
 */
export const getMerkleTreeSnapshot = async (
  blockNumber?: number
): Promise<MerkleTreeSnapshot> => {
  if (!indexerConfig) {
    throw new Error('Indexer not configured');
  }

  const url = blockNumber
    ? `${indexerConfig.endpoint}/merkle-tree?block=${blockNumber}`
    : `${indexerConfig.endpoint}/merkle-tree`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to get Merkle tree snapshot');
  }

  return await response.json();
};

/**
 * Get Merkle proof for commitment
 */
export const getMerkleProof = async (
  commitmentOrIndex: string | number
): Promise<{ proof: string[]; root: string; index: number } | null> => {
  if (!indexerConfig) return null;

  try {
    const response = await fetch(
      `${indexerConfig.endpoint}/merkle-proof/${commitmentOrIndex}`
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to get Merkle proof:', error);
    return null;
  }
};

/**
 * Verify Merkle proof locally
 */
export const verifyMerkleProof = (
  leaf: string,
  proof: string[],
  root: string,
  index: number
): boolean => {
  // Import the verification logic from prover
  // This should match the verification in your ZK circuit
  
  // Placeholder implementation
  console.log('Verifying Merkle proof:', { leaf, proof, root, index });
  return true;
};

// ========== Scanning Functions ==========

/**
 * Scan chain for commitments and nullifiers
 */
export const scanChain = async (
  startBlock: number,
  endBlock: number,
  onProgress?: (progress: ScanProgress) => void
): Promise<{
  commitments: CommitmentRecord[];
  nullifiers: NullifierRecord[];
}> => {
  const commitments: CommitmentRecord[] = [];
  const nullifiers: NullifierRecord[] = [];

  // Scan in batches
  const batchSize = 100;
  let currentBlock = startBlock;

  while (currentBlock <= endBlock) {
    const batchEnd = Math.min(currentBlock + batchSize - 1, endBlock);

    // Get events in this batch
    const events = await getEventsInRange(currentBlock, batchEnd);

    // Process events
    for (const event of events) {
      if (event.type === 'deposit' && event.data.commitment) {
        commitments.push({
          commitment: event.data.commitment,
          index: event.data.index || 0,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          timestamp: event.timestamp,
        });
      }

      if (
        (event.type === 'private_transfer' || event.type === 'withdraw') &&
        event.data.nullifiers
      ) {
        const nullifierArray = Array.isArray(event.data.nullifiers)
          ? event.data.nullifiers
          : [event.data.nullifiers];

        for (const nullifier of nullifierArray) {
          nullifiers.push({
            nullifier,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            timestamp: event.timestamp,
          });
        }
      }

      if (
        (event.type === 'deposit' || event.type === 'private_transfer') &&
        event.data.commitments
      ) {
        const commitmentArray = Array.isArray(event.data.commitments)
          ? event.data.commitments
          : [event.data.commitments];

        for (const commitment of commitmentArray) {
          commitments.push({
            commitment,
            index: event.data.index || 0,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            timestamp: event.timestamp,
          });
        }
      }
    }

    // Report progress
    if (onProgress) {
      onProgress({
        startBlock,
        endBlock,
        currentBlock: batchEnd,
        commitmentsFound: commitments.length,
        nullifiersFound: nullifiers.length,
      });
    }

    currentBlock = batchEnd + 1;
  }

  return { commitments, nullifiers };
};

/**
 * Scan for notes that belong to you
 */
export const scanForMyNotes = async (
  viewingKey: string,
  startBlock: number,
  endBlock: number,
  onProgress?: (progress: ScanProgress & { notesFound: number }) => void
): Promise<CommitmentRecord[]> => {
  const myNotes: CommitmentRecord[] = [];

  // Get all private transfers and deposits
  const events = await getEventsInRange(startBlock, endBlock);

  let processed = 0;
  const total = events.length;

  for (const event of events) {
    // Try to decrypt encrypted notes
    if (event.data.encryptedNotes) {
      const notes = Array.isArray(event.data.encryptedNotes)
        ? event.data.encryptedNotes
        : [event.data.encryptedNotes];

      for (const encryptedNote of notes) {
        try {
          // Attempt decryption with viewing key
          // This would use your decryptNote function from encryption utils
          // const decrypted = decryptNote(encryptedNote, viewingKey);
          
          // If successful, add to myNotes
          // myNotes.push({ ... });
        } catch (error) {
          // Not our note, continue
        }
      }
    }

    processed++;

    if (onProgress) {
      onProgress({
        startBlock,
        endBlock,
        currentBlock: startBlock + processed,
        commitmentsFound: myNotes.length,
        nullifiersFound: 0,
        notesFound: myNotes.length,
      });
    }
  }

  return myNotes;
};

// ========== Statistics ==========

/**
 * Get indexer statistics
 */
export const getStatistics = async (): Promise<{
  totalCommitments: number;
  totalNullifiers: number;
  totalDeposits: number;
  totalTransfers: number;
  totalWithdrawals: number;
  latestBlock: number;
  indexerVersion: string;
}> => {
  if (!indexerConfig) {
    throw new Error('Indexer not configured');
  }

  const response = await fetch(`${indexerConfig.endpoint}/stats`);
  if (!response.ok) {
    throw new Error('Failed to get statistics');
  }

  return await response.json();
};

/**
 * Get sync status
 */
export const getSyncStatus = async (): Promise<{
  synced: boolean;
  currentBlock: number;
  targetBlock: number;
  behind: number;
}> => {
  if (!indexerConfig) {
    throw new Error('Indexer not configured');
  }

  const response = await fetch(`${indexerConfig.endpoint}/sync-status`);
  if (!response.ok) {
    throw new Error('Failed to get sync status');
  }

  return await response.json();
};

// ========== Local Caching ==========

/**
 * Cache commitment locally (for offline access)
 */
export const cacheCommitment = async (
  commitment: CommitmentRecord
): Promise<void> => {
  // Implementation would use AsyncStorage or similar
  console.log('Caching commitment:', commitment);
};

/**
 * Get cached commitments
 */
export const getCachedCommitments = async (): Promise<CommitmentRecord[]> => {
  // Implementation would use AsyncStorage or similar
  return [];
};

/**
 * Clear cache
 */
export const clearCache = async (): Promise<void> => {
  // Implementation would use AsyncStorage or similar
  console.log('Cache cleared');
};

// ========== Export Default Config ==========

export const DEFAULT_INDEXER_CONFIG: IndexerConfig = {
  endpoint: 'http://localhost:3000',
  fallbackToChain: true,
};
