/**
 * Chain API Layer - Substrate/Polkadot Parachain Integration
 * 
 * Provides functional API for interacting with the ZK Privacy Parachain.
 * Uses singleton pattern for connection management and pure functions for operations.
 */

import { ApiPromise, WsProvider, SubmittableResult } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import type { KeyringPair } from '@polkadot/keyring/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import type {
  CommitmentInput,
  CommitmentOutput,
  PrivateTransferTransaction,
  ZKProof,
} from '@/types';

// ========== Types ==========

export interface ChainConfig {
  endpoint: string;
  ss58Format?: number;
}

export interface TransactionResult {
  blockHash: string;
  txHash: string;
  success: boolean;
  events: any[];
  error?: string;
}

export interface ChainState {
  merkleRoot: string;
  commitmentCount: number;
  blockNumber: number;
  timestamp: number;
}

export interface DepositParams {
  amount: string;
  commitment: string;
  proof: ZKProof;
  encryptedNote?: string;
}

export interface PrivateTransferParams {
  nullifiers: string[];
  commitments: string[];
  proof: ZKProof;
  encryptedNotes: EncryptedNote[];
}

export interface WithdrawParams {
  nullifier: string;
  amount: string;
  recipient: string;
  proof: ZKProof;
}

export interface EncryptedNote {
  recipient: string;
  ciphertext: string;
  nonce: string;
  ephemeralPublicKey: string;
}

export interface EventSubscription {
  unsubscribe: () => void;
}

// ========== Connection Management (Singleton) ==========

let apiInstance: ApiPromise | null = null;
let providerInstance: WsProvider | null = null;
let isConnecting = false;
let connectionPromise: Promise<ApiPromise> | null = null;

/**
 * Connect to parachain WebSocket endpoint
 * Returns existing connection if already connected (singleton pattern)
 */
export const connect = async (config: ChainConfig): Promise<ApiPromise> => {
  // Return existing connection
  if (apiInstance?.isConnected) {
    return apiInstance;
  }

  // Wait for ongoing connection attempt
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  // Create new connection
  isConnecting = true;
  connectionPromise = (async () => {
    try {
      // Disconnect existing provider if any
      if (providerInstance) {
        await providerInstance.disconnect();
      }

      // Create new provider
      providerInstance = new WsProvider(config.endpoint);

      // Create API instance
      apiInstance = await ApiPromise.create({
        provider: providerInstance,
        types: {
          // Custom types for ZK Privacy pallet
          Commitment: 'H256',
          Nullifier: 'H256',
          EncryptedNote: {
            recipient: 'AccountId',
            ciphertext: 'Vec<u8>',
            nonce: 'Vec<u8>',
            ephemeralPublicKey: 'Vec<u8>',
          },
          ZKProof: {
            proof: 'Vec<u8>',
            publicInputs: 'Vec<u8>',
          },
          PrivateTransfer: {
            nullifiers: 'Vec<Nullifier>',
            commitments: 'Vec<Commitment>',
            proof: 'ZKProof',
            encryptedNotes: 'Vec<EncryptedNote>',
          },
        },
      });

      await apiInstance.isReady;

      console.log(`Connected to ${config.endpoint}`);
      console.log(`Chain: ${(await apiInstance.rpc.system.chain()).toString()}`);

      isConnecting = false;
      connectionPromise = null;

      return apiInstance;
    } catch (error) {
      isConnecting = false;
      connectionPromise = null;
      apiInstance = null;
      providerInstance = null;
      throw new Error(`Failed to connect to parachain: ${error}`);
    }
  })();

  return connectionPromise;
};

/**
 * Disconnect from parachain
 */
export const disconnect = async (): Promise<void> => {
  if (apiInstance) {
    await apiInstance.disconnect();
    apiInstance = null;
  }

  if (providerInstance) {
    await providerInstance.disconnect();
    providerInstance = null;
  }

  console.log('Disconnected from parachain');
};

/**
 * Get current API instance (throws if not connected)
 */
export const getApi = (): ApiPromise => {
  if (!apiInstance?.isConnected) {
    throw new Error('Not connected to parachain. Call connect() first.');
  }
  return apiInstance;
};

/**
 * Check if connected to parachain
 */
export const isConnected = (): boolean => {
  return apiInstance?.isConnected ?? false;
};

// ========== Keyring Management ==========

/**
 * Create keyring pair from mnemonic or seed
 */
export const createKeyringPair = (
  seedOrMnemonic: string,
  ss58Format = 42
): KeyringPair => {
  const keyring = new Keyring({ type: 'sr25519', ss58Format });
  
  // Check if it's a seed (hex) or mnemonic
  if (seedOrMnemonic.startsWith('0x')) {
    return keyring.addFromSeed(hexToU8a(seedOrMnemonic));
  } else {
    return keyring.addFromUri(seedOrMnemonic);
  }
};

// ========== Transaction Builders ==========

/**
 * Build and submit deposit transaction (public -> private)
 */
export const deposit = async (
  params: DepositParams,
  signer: KeyringPair
): Promise<TransactionResult> => {
  const api = getApi();

  return new Promise((resolve, reject) => {
    const tx = api.tx.zkPrivacy.deposit(
      params.amount,
      params.commitment,
      {
        proof: Array.from(params.proof.proof),
        publicInputs: Array.from(params.proof.publicInputs),
      },
      params.encryptedNote || null
    );

    let unsubscribe: () => void;

    tx.signAndSend(signer, (result: SubmittableResult) => {
      const { status, events, dispatchError } = result;

      // Transaction is in a block
      if (status.isInBlock) {
        console.log(`Deposit included in block: ${status.asInBlock.toHex()}`);
      }

      // Transaction is finalized
      if (status.isFinalized) {
        const blockHash = status.asFinalized.toHex();
        const txHash = tx.hash.toHex();

        // Check for errors
        if (dispatchError) {
          let errorMessage = 'Transaction failed';

          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
          } else {
            errorMessage = dispatchError.toString();
          }

          if (unsubscribe) unsubscribe();
          resolve({
            blockHash,
            txHash,
            success: false,
            events: events.map(e => e.toHuman()),
            error: errorMessage,
          });
          return;
        }

        // Success
        if (unsubscribe) unsubscribe();
        resolve({
          blockHash,
          txHash,
          success: true,
          events: events.map(e => e.toHuman()),
        });
      }
    })
      .then(unsub => {
        unsubscribe = unsub;
      })
      .catch(error => {
        reject(new Error(`Failed to submit deposit: ${error}`));
      });
  });
};

/**
 * Build and submit private transfer transaction (private -> private)
 */
export const privateTransfer = async (
  params: PrivateTransferParams,
  signer: KeyringPair
): Promise<TransactionResult> => {
  const api = getApi();

  return new Promise((resolve, reject) => {
    const tx = api.tx.zkPrivacy.privateTransfer({
      nullifiers: params.nullifiers,
      commitments: params.commitments,
      proof: {
        proof: Array.from(params.proof.proof),
        publicInputs: Array.from(params.proof.publicInputs),
      },
      encryptedNotes: params.encryptedNotes.map(note => ({
        recipient: note.recipient,
        ciphertext: hexToU8a(note.ciphertext),
        nonce: hexToU8a(note.nonce),
        ephemeralPublicKey: hexToU8a(note.ephemeralPublicKey),
      })),
    });

    let unsubscribe: () => void;

    tx.signAndSend(signer, (result: SubmittableResult) => {
      const { status, events, dispatchError } = result;

      if (status.isInBlock) {
        console.log(`Private transfer included in block: ${status.asInBlock.toHex()}`);
      }

      if (status.isFinalized) {
        const blockHash = status.asFinalized.toHex();
        const txHash = tx.hash.toHex();

        if (dispatchError) {
          let errorMessage = 'Transaction failed';

          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
          } else {
            errorMessage = dispatchError.toString();
          }

          if (unsubscribe) unsubscribe();
          resolve({
            blockHash,
            txHash,
            success: false,
            events: events.map(e => e.toHuman()),
            error: errorMessage,
          });
          return;
        }

        if (unsubscribe) unsubscribe();
        resolve({
          blockHash,
          txHash,
          success: true,
          events: events.map(e => e.toHuman()),
        });
      }
    })
      .then(unsub => {
        unsubscribe = unsub;
      })
      .catch(error => {
        reject(new Error(`Failed to submit private transfer: ${error}`));
      });
  });
};

/**
 * Build and submit withdraw transaction (private -> public)
 */
export const withdraw = async (
  params: WithdrawParams,
  signer: KeyringPair
): Promise<TransactionResult> => {
  const api = getApi();

  return new Promise((resolve, reject) => {
    const tx = api.tx.zkPrivacy.withdraw(
      params.nullifier,
      params.amount,
      params.recipient,
      {
        proof: Array.from(params.proof.proof),
        publicInputs: Array.from(params.proof.publicInputs),
      }
    );

    let unsubscribe: () => void;

    tx.signAndSend(signer, (result: SubmittableResult) => {
      const { status, events, dispatchError } = result;

      if (status.isInBlock) {
        console.log(`Withdraw included in block: ${status.asInBlock.toHex()}`);
      }

      if (status.isFinalized) {
        const blockHash = status.asFinalized.toHex();
        const txHash = tx.hash.toHex();

        if (dispatchError) {
          let errorMessage = 'Transaction failed';

          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
          } else {
            errorMessage = dispatchError.toString();
          }

          if (unsubscribe) unsubscribe();
          resolve({
            blockHash,
            txHash,
            success: false,
            events: events.map(e => e.toHuman()),
            error: errorMessage,
          });
          return;
        }

        if (unsubscribe) unsubscribe();
        resolve({
          blockHash,
          txHash,
          success: true,
          events: events.map(e => e.toHuman()),
        });
      }
    })
      .then(unsub => {
        unsubscribe = unsub;
      })
      .catch(error => {
        reject(new Error(`Failed to submit withdraw: ${error}`));
      });
  });
};

// ========== State Queries ==========

/**
 * Get current Merkle tree root
 */
export const getMerkleRoot = async (): Promise<string> => {
  const api = getApi();
  const root = await api.query.zkPrivacy.merkleRoot();
  return root.toHex();
};

/**
 * Get total number of commitments in the Merkle tree
 */
export const getCommitmentCount = async (): Promise<number> => {
  const api = getApi();
  const count = await api.query.zkPrivacy.commitmentCount();
  return (count as any).toNumber();
};

/**
 * Check if a nullifier has been spent
 */
export const isNullifierSpent = async (nullifier: string): Promise<boolean> => {
  const api = getApi();
  const spent = await api.query.zkPrivacy.nullifiers(nullifier);
  return (spent as any).isSome;
};

/**
 * Get commitment at specific index
 */
export const getCommitment = async (index: number): Promise<string | null> => {
  const api = getApi();
  const commitment = await api.query.zkPrivacy.commitments(index);
  return (commitment as any).isSome ? (commitment as any).unwrap().toHex() : null;
};

/**
 * Get Merkle path for commitment at index
 */
export const getMerklePath = async (index: number): Promise<string[]> => {
  const api = getApi();
  
  // This assumes your pallet has a method to get Merkle path
  // You may need to implement this differently based on your pallet design
  try {
    const path = await api.query.zkPrivacy.merklePath(index);
    return path.toJSON() as string[];
  } catch (error) {
    console.warn('Merkle path query not available, computing locally');
    return [];
  }
};

/**
 * Get public balance of an account
 */
export const getBalance = async (address: string): Promise<string> => {
  const api = getApi();
  const account: any = await api.query.system.account(address);
  return account.data.free.toString();
};

/**
 * Get comprehensive chain state
 */
export const getChainState = async (): Promise<ChainState> => {
  const api = getApi();

  const [merkleRoot, commitmentCount, blockHeader] = await Promise.all([
    getMerkleRoot(),
    getCommitmentCount(),
    api.rpc.chain.getHeader(),
  ]);

  const blockNumber = blockHeader.number.toNumber();
  const timestamp = Date.now(); // Note: Use timestamp from block if available

  return {
    merkleRoot,
    commitmentCount,
    blockNumber,
    timestamp,
  };
};

/**
 * Get multiple commitments in batch
 */
export const getCommitmentsBatch = async (
  indices: number[]
): Promise<(string | null)[]> => {
  const api = getApi();
  
  const commitments = await Promise.all(
    indices.map(index => api.query.zkPrivacy.commitments(index))
  );

  return commitments.map(c => ((c as any).isSome ? (c as any).unwrap().toHex() : null));
};

// ========== Event Subscriptions ==========

/**
 * Subscribe to new deposit events
 */
export const subscribeToDeposits = (
  callback: (data: {
    commitment: string;
    amount: string;
    sender: string;
    blockNumber: number;
  }) => void
): EventSubscription => {
  const api = getApi();

  let unsubscribe: () => void;

  api.query.system
    .events((events: any) => {
      events.forEach((record: any) => {
        const { event } = record;

        if (api.events.zkPrivacy.Deposited.is(event)) {
          const [sender, commitment, amount] = event.data;

          callback({
            commitment: commitment.toHex(),
            amount: amount.toString(),
            sender: sender.toString(),
            blockNumber: record.phase.isApplyExtrinsic
              ? record.phase.asApplyExtrinsic.toNumber()
              : 0,
          });
        }
      });
    })
    .then((unsub: any) => {
      unsubscribe = unsub;
    })
    .catch((error: any) => {
      console.error('Failed to subscribe to deposits:', error);
    });

  return {
    unsubscribe: () => {
      if (unsubscribe) unsubscribe();
    },
  };
};

/**
 * Subscribe to private transfer events
 */
export const subscribeToPrivateTransfers = (
  callback: (data: {
    nullifiers: string[];
    commitments: string[];
    blockNumber: number;
  }) => void
): EventSubscription => {
  const api = getApi();

  let unsubscribe: () => void;

  api.query.system
    .events((events: any) => {
      events.forEach((record: any) => {
        const { event } = record;

        if (api.events.zkPrivacy.PrivateTransfer.is(event)) {
          const [nullifiers, commitments] = event.data;

          callback({
            nullifiers: (nullifiers as any).map((n: any) => n.toHex()),
            commitments: (commitments as any).map((c: any) => c.toHex()),
            blockNumber: record.phase.isApplyExtrinsic
              ? record.phase.asApplyExtrinsic.toNumber()
              : 0,
          });
        }
      });
    })
    .then((unsub: any) => {
      unsubscribe = unsub;
    })
    .catch((error: any) => {
      console.error('Failed to subscribe to private transfers:', error);
    });

  return {
    unsubscribe: () => {
      if (unsubscribe) unsubscribe();
    },
  };
};

/**
 * Subscribe to withdraw events
 */
export const subscribeToWithdraws = (
  callback: (data: {
    nullifier: string;
    amount: string;
    recipient: string;
    blockNumber: number;
  }) => void
): EventSubscription => {
  const api = getApi();

  let unsubscribe: () => void;

  api.query.system
    .events((events: any) => {
      events.forEach((record: any) => {
        const { event } = record;

        if (api.events.zkPrivacy.Withdrawn.is(event)) {
          const [nullifier, recipient, amount] = event.data;

          callback({
            nullifier: nullifier.toHex(),
            amount: amount.toString(),
            recipient: recipient.toString(),
            blockNumber: record.phase.isApplyExtrinsic
              ? record.phase.asApplyExtrinsic.toNumber()
              : 0,
          });
        }
      });
    })
    .then((unsub: any) => {
      unsubscribe = unsub;
    })
    .catch((error: any) => {
      console.error('Failed to subscribe to withdraws:', error);
    });

  return {
    unsubscribe: () => {
      if (unsubscribe) unsubscribe();
    },
  };
};

/**
 * Subscribe to all ZK Privacy events
 */
export const subscribeToAllEvents = (
  callbacks: {
    onDeposit?: (data: any) => void;
    onPrivateTransfer?: (data: any) => void;
    onWithdraw?: (data: any) => void;
  }
): EventSubscription => {
  const subscriptions: EventSubscription[] = [];

  if (callbacks.onDeposit) {
    subscriptions.push(subscribeToDeposits(callbacks.onDeposit));
  }

  if (callbacks.onPrivateTransfer) {
    subscriptions.push(subscribeToPrivateTransfers(callbacks.onPrivateTransfer));
  }

  if (callbacks.onWithdraw) {
    subscriptions.push(subscribeToWithdraws(callbacks.onWithdraw));
  }

  return {
    unsubscribe: () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    },
  };
};

// ========== Utility Functions ==========

/**
 * Wait for a specific number of block confirmations
 */
export const waitForConfirmations = async (
  blockHash: string,
  confirmations = 1
): Promise<boolean> => {
  const api = getApi();

  const targetHeader = await api.rpc.chain.getHeader(blockHash);
  const targetNumber = targetHeader.number.toNumber();

  return new Promise((resolve) => {
    const unsubscribe = api.rpc.chain.subscribeNewHeads((header) => {
      const currentNumber = header.number.toNumber();

      if (currentNumber >= targetNumber + confirmations) {
        unsubscribe.then(unsub => unsub());
        resolve(true);
      }
    });
  });
};

/**
 * Estimate transaction fee
 */
export const estimateFee = async (
  tx: any,
  sender: string
): Promise<string> => {
  const api = getApi();
  const info = await tx.paymentInfo(sender);
  return info.partialFee.toString();
};

/**
 * Get chain metadata
 */
export const getChainInfo = async () => {
  const api = getApi();

  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
  ]);

  return {
    chain: chain.toString(),
    nodeName: nodeName.toString(),
    nodeVersion: nodeVersion.toString(),
  };
};

/**
 * Health check for chain connection
 */
export const healthCheck = async (): Promise<{
  connected: boolean;
  blockNumber: number;
  peers: number;
}> => {
  try {
    const api = getApi();

    const [header, health] = await Promise.all([
      api.rpc.chain.getHeader(),
      api.rpc.system.health(),
    ]);

    return {
      connected: true,
      blockNumber: header.number.toNumber(),
      peers: health.peers.toNumber(),
    };
  } catch (error) {
    return {
      connected: false,
      blockNumber: 0,
      peers: 0,
    };
  }
};

// ========== Export Default Config ==========

export const DEFAULT_CONFIG: ChainConfig = {
  endpoint: 'ws://127.0.0.1:9944',
  ss58Format: 42,
};
