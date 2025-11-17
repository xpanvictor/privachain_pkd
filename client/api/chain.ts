/**
 * MOCK Chain API - Simulated Blockchain for Development
 * Replace with chain.ts.real when parachain is available
 */

import type { ZKProof } from '@/types';

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

export interface KeyringPair {
  address: string;
  publicKey: Uint8Array;
  sign: (data: Uint8Array) => Uint8Array;
}

// Mock state
const mockState = {
  connected: false,
  blockNumber: 1234567,
  commitments: new Map<number, string>(),
  nullifiers: new Set<string>(),
  merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
  balances: new Map<string, string>(),
  transactions: [] as TransactionResult[],
};

const randomHash = () => '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const connect = async (config: ChainConfig) => {
  console.log('[MOCK] Connecting to', config.endpoint);
  await delay(500);
  mockState.connected = true;
  console.log('[MOCK] Connected');
  return { isConnected: true };
};

export const disconnect = async () => {
  mockState.connected = false;
  console.log('[MOCK] Disconnected');
};

export const getApi = () => {
  if (!mockState.connected) throw new Error('[MOCK] Not connected');
  return { isConnected: true };
};

export const isConnected = () => mockState.connected;

export const createKeyringPair = (seedOrMnemonic: string, ss58Format = 42): KeyringPair => ({
  address: '5' + Array.from({ length: 47 }, () => 'A').join(''),
  publicKey: new Uint8Array(32).fill(1),
  sign: (data: Uint8Array) => new Uint8Array(64).fill(2),
});

export const deposit = async (params: DepositParams, signer: KeyringPair): Promise<TransactionResult> => {
  console.log('[MOCK] Deposit:', params.amount);
  await delay(1000);
  mockState.commitments.set(mockState.commitments.size, params.commitment);
  const result: TransactionResult = {
    blockHash: randomHash(),
    txHash: randomHash(),
    success: true,
    events: [{ section: 'zkPrivacy', method: 'Deposited', data: [signer.address, params.commitment, params.amount] }],
  };
  mockState.transactions.push(result);
  return result;
};

export const privateTransfer = async (params: PrivateTransferParams, signer: KeyringPair): Promise<TransactionResult> => {
  console.log('[MOCK] Private transfer');
  await delay(1200);
  params.nullifiers.forEach(n => mockState.nullifiers.add(n));
  params.commitments.forEach(c => mockState.commitments.set(mockState.commitments.size, c));
  const result: TransactionResult = {
    blockHash: randomHash(),
    txHash: randomHash(),
    success: true,
    events: [{ section: 'zkPrivacy', method: 'PrivateTransfer', data: [params.nullifiers, params.commitments] }],
  };
  mockState.transactions.push(result);
  return result;
};

export const withdraw = async (params: WithdrawParams, signer: KeyringPair): Promise<TransactionResult> => {
  console.log('[MOCK] Withdraw:', params.amount);
  await delay(1000);
  mockState.nullifiers.add(params.nullifier);
  const result: TransactionResult = {
    blockHash: randomHash(),
    txHash: randomHash(),
    success: true,
    events: [{ section: 'zkPrivacy', method: 'Withdrawn', data: [params.nullifier, params.recipient, params.amount] }],
  };
  mockState.transactions.push(result);
  return result;
};

export const getMerkleRoot = async () => mockState.merkleRoot;
export const getCommitmentCount = async () => mockState.commitments.size;
export const isNullifierSpent = async (nullifier: string) => mockState.nullifiers.has(nullifier);
export const getCommitment = async (index: number) => mockState.commitments.get(index) || null;
export const getMerklePath = async (index: number) => Array.from({ length: 20 }, () => randomHash());
export const getBalance = async (address: string) => mockState.balances.get(address) || '1000000000000000';

export const getChainState = async (): Promise<ChainState> => ({
  merkleRoot: mockState.merkleRoot,
  commitmentCount: mockState.commitments.size,
  blockNumber: mockState.blockNumber,
  timestamp: Date.now(),
});

export const getCommitmentsBatch = async (indices: number[]) => indices.map(i => mockState.commitments.get(i) || null);

export const subscribeToDeposits = (callback: any): EventSubscription => ({
  unsubscribe: () => console.log('[MOCK] Unsubscribed'),
});

export const subscribeToPrivateTransfers = (callback: any): EventSubscription => ({
  unsubscribe: () => console.log('[MOCK] Unsubscribed'),
});

export const subscribeToWithdraws = (callback: any): EventSubscription => ({
  unsubscribe: () => console.log('[MOCK] Unsubscribed'),
});

export const subscribeToAllEvents = (callbacks: any): EventSubscription => ({
  unsubscribe: () => console.log('[MOCK] Unsubscribed'),
});

export const waitForConfirmations = async (blockHash: string, confirmations = 1) => true;
export const estimateFee = async (tx: any, sender: string) => '1000000';
export const getChainInfo = async () => ({
  chain: 'PrivaChain Mock',
  nodeName: 'mock-node',
  nodeVersion: '1.0.0-mock',
});

export const healthCheck = async () => ({
  connected: mockState.connected,
  blockNumber: mockState.blockNumber,
  peers: 0,
});

export const DEFAULT_CONFIG: ChainConfig = {
  endpoint: 'ws://127.0.0.1:9944',
  ss58Format: 42,
};

console.log('[MOCK] Mock chain API loaded');
