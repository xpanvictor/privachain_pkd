export type WalletInfo = {
  mnemonic: string;
  address: string;
  spendingKey: string;
  viewingKey: string;
};


export type CommitmentInput = {
  commitment: string; // hex/base58 commitment
  secret: string;     // secret used to open/derive nullifier
  amount: string;
  owner?: string;     // optional owner pubkey/address
    merkleProof: string[];
  leafIndex: number;
};

export type CommitmentOutput = {
  amount: string;
  secret: string;
  recipient: string; // recipient pubkey/address
  memo?: string;
};

export type PrivateTransferTransaction = {
  nullifiers: string[];
  commitments: string[];
  proof: { proof: number[]; publicInputs: number[] } | any;
  encryptedNotes: any[];
};

export interface WalletKeys {
  mnemonic: string;
  address: string;
  spendingKey: string;
  viewingKey: string;
  nullifierKey: string;
  publicSpendingKey: string;
}

export interface SecureWalletData {
  mnemonic: string;
  spendingKey: string;
  viewingKey: string;
  nullifierKey: string;
  createdAt: number;
}

export interface KeyDerivationPath {
  spending: string;
  viewing: string;
  nullifier: string;
}

export interface ZKProof {
  proof: Uint8Array;
  publicInputs: Uint8Array;
}

export interface TransferProofInputs {
  inputs: CommitmentInput[];
  outputs: CommitmentOutput[];
  merkleRoot: string;
  publicAmount?: string;
}

export interface PublicInputsData {
  merkleRoot?: string;
  nullifiers?: string[];
  commitments?: string[];
  commitment?: string;
  publicAmount?: string;
  value?: string;
}