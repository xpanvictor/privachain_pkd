import { CommitmentInput, CommitmentOutput, PrivateTransferTransaction } from '@/types';
import { ApiPromise, SubmittableResult, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';




/** Compute commitment from amount, secret, recipientPubkey.
 * Replace the internals with the actual hash/commitment scheme you use.
 */
export const computeCommitment = (amount: string, secret: string, recipientPubkey: string): string => {
  // Example placeholder: hex of JSON — replace with real Poseidon/BLAKE2/SNARK-friendly hash
  const payload = `${amount}|${secret}|${recipientPubkey}`;
  // simple deterministic hex (not secure, replace in prod)
  return Buffer.from(payload).toString('hex');
};


/** Compute nullifier from secret + commitment (deterministic).
 * Replace with your actual nullifier derivation (e.g. hash(secret || commitment)).
 */
export const computeNullifier = (secret: string, commitment: string): string => {
  const payload = `null|${secret}|${commitment}`;
  return Buffer.from(payload).toString('hex');
};


/** Encrypt a note for a recipient. Stub — replace with ECIES / x25519 + symmetric scheme. */
export const encryptNote = (output: CommitmentOutput): { to: string; ciphertext: string } => {
  const plaintext = JSON.stringify(output);
  // placeholder "encryption"
  return { to: output.recipient, ciphertext: Buffer.from(plaintext).toString('base64') };
};


/** Create & return a connected ApiPromise. Pure-ish: creates provider internally (side-effect). */
export const connectApi = async (endpoint: string): Promise<ApiPromise> => {
  const provider = new WsProvider(endpoint);
  const api = await ApiPromise.create({ provider });
  return api;
};


/** Create a keypair (Keyring) and return the signer pair for given uri (e.g. '//Alice' or mnemonic).
 * This function intentionally creates a fresh keyring so it's isolated and testable.
 */
export const makeSignerFromUri = (uri = '//Alice') => {
  const keyring = new Keyring({ type: 'sr25519' });
  return keyring.addFromUri(uri);
};

/** signAndSend a transaction and resolve when included in a block (returns block hash hex).
 * Encapsulates API event wiring into a Promise to avoid repeating code.
 */
export const signAndSendTx = async (tx: any, signer: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    tx.signAndSend(signer, ({ status, dispatchError }:SubmittableResult) => {
      if (dispatchError) {
        // map module errors if desired
        reject(dispatchError.toString());
        return;
      }
      if (status.isInBlock) {
        resolve(status.asInBlock.toHex());
      } else if (status.isFinalized) {
        // optionally resolve on finalization
      }
    }).catch(reject);
  });
};


/* ---------- Network / chain helpers (I/O) ---------- */

/** Query merkle/proof for a commitment from chain or indexer.
 * Replace body with calls to your node / offchain indexer.
 */
export const getMerkleProof = async (api: ApiPromise, commitment: string): Promise<any> => {
  // Example stub: If chain exposes storage map like `zkPrivacy.commitmentToProof`
  try {
    // const proof = await api.query.zkPrivacy.commitmentToProof(commitment);
    // return proof.toJSON();
    return { path: [], root: 'ROOT_PLACEHOLDER', leafIndex: 0 }; // placeholder
  } catch (err) {
    throw new Error(`failed to fetch merkle proof: ${String(err)}`);
  }
};

/** Offload heavy zk-proof generation to a worker/process — here as an async function stub.
 * Accepts inputs, merkle proofs and returns { proof, publicInputs } in a format expected by your pallet.
 */
export const generateProof = async (params: {
  inputs: CommitmentInput[];
  outputs: CommitmentOutput[];
  merkleProofs: any[];
}): Promise<{ proof: Uint8Array | number[]; publicInputs: Uint8Array | number[] }> => {
  // TODO: Replace with actual call to your proving library or a Worker.
  // The function returns binary-compatible proof + public inputs.
  // For now, return deterministic dummy arrays.
  const proof = new Uint8Array([1, 2, 3]); // placeholder
  const publicInputs = new Uint8Array([4, 5, 6]); // placeholder
  return { proof, publicInputs };
};

/** Similar to generateProof but for withdraw flows; separated to keep contracts explicit. */
export const generateWithdrawProof = async (params: {
  commitment: string;
  secret: string;
  merkleProof: any;
  amount: string;
  recipient: string;
}): Promise<{ proof: Uint8Array | number[]; publicInputs: Uint8Array | number[] }> => {
  // TODO: call actual withdraw proving process (worker)
  const proof = new Uint8Array([9, 9, 9]);
  const publicInputs = new Uint8Array([8, 8, 8]);
  return { proof, publicInputs };
};

/* ---------- High-level functional API (public) ---------- */

/** Deposit (public -> private). Returns block hash when included. */
export const deposit = async (params: {
  api: ApiPromise;
  amount: string;
  secret: string;
  recipientPubkey: string;
  signerUri?: string; // optional signer identifier, default '//Alice'
}): Promise<string> => {
  const { api, amount, secret, recipientPubkey, signerUri = '//Alice' } = params;

  // 1. Compute commitment (pure)
  const commitment = computeCommitment(amount, secret, recipientPubkey);

  // 2. Prepare tx using the runtime's extrinsic
  const tx = api.tx.zkPrivacy.deposit(amount, commitment);

  // 3. Sign & send
  const signer = makeSignerFromUri(signerUri);
  const inBlock = await signAndSendTx(tx, signer);
  return inBlock;
};

/** Private transfer (shielded transfer) which:
 * - fetches merkle proofs
 * - generates zk-proof
 * - builds transaction payload
 * - submits to chain
 */
export const privateTransfer = async (params: {
  api: ApiPromise;
  inputs: CommitmentInput[];
  outputs: CommitmentOutput[];
  signerUri?: string;
}): Promise<string> => {
  const { api, inputs, outputs, signerUri = '//Alice' } = params;

  // 1. Get Merkle proofs for inputs in parallel (I/O)
  const merkleProofs = await Promise.all(inputs.map(i => getMerkleProof(api, i.commitment)));

  // 2. Generate ZK proof (heavy - do in worker in real app)
  const { proof, publicInputs } = await generateProof({ inputs, outputs, merkleProofs });

  // 3. Prepare nullifiers & new commitments (pure)
  const nullifiers = inputs.map(i => computeNullifier(i.secret, i.commitment));
  const newCommitments = outputs.map(o => computeCommitment(o.amount, o.secret, o.recipient));

  // 4. Build transaction payload
  const transaction: PrivateTransferTransaction = {
    nullifiers,
    commitments: newCommitments,
    proof: {
      proof: Array.from(proof as any),
      publicInputs: Array.from(publicInputs as any),
    },
    encryptedNotes: outputs.map(encryptNote),
  };

  // 5. Submit transaction
  const tx = api.tx.zkPrivacy.privateTransfer(transaction);
  const signer = makeSignerFromUri(signerUri);
  const inBlock = await signAndSendTx(tx, signer);
  return inBlock;
};

/** Withdraw (private -> public). Returns block hash when included. */
export const withdraw = async (params: {
  api: ApiPromise;
  commitment: string;
  secret: string;
  amount: string;
  recipient: string;
  signerUri?: string;
}): Promise<string> => {
  const { api, commitment, secret, amount, recipient, signerUri = '//Alice' } = params;

  // 1. Compute nullifier (pure)
  const nullifier = computeNullifier(secret, commitment);

  // 2. Get Merkle proof for commitment (I/O)
  const merkleProof = await getMerkleProof(api, commitment);

  // 3. Generate withdraw ZK proof (heavy)
  const { proof, publicInputs } = await generateWithdrawProof({ commitment, secret, merkleProof, amount, recipient });

  // 4. Prepare extrinsic payload expected by pallet
  const txPayload = {
    nullifier,
    amount,
    recipient,
    proof: {
      proof: Array.from(proof as any),
      publicInputs: Array.from(publicInputs as any),
    },
  };

  // 5. Submit withdraw tx
  const tx = api.tx.zkPrivacy.withdraw(txPayload);
  const signer = makeSignerFromUri(signerUri);
  const inBlock = await signAndSendTx(tx, signer);
  return inBlock;
};

/* ---------- Utility: disconnect provider (optional) ---------- */

export const disconnectApi = async (api?: ApiPromise) => {
  try {
    if (api && api.disconnect) await api.disconnect();
  } catch (err) {
    // ignore
  }
};