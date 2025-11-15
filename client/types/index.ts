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