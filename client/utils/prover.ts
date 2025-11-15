

import { hexToU8a, u8aToHex } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto';

export interface CommitmentInput {
  commitment: string;
  value: string;
  secret: string;
  recipient: string;
  merkleProof: string[];
  leafIndex: number;
}

export interface CommitmentOutput {
  value: string;
  secret: string;
  recipient: string;
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

/**
 * Factory creating a prover instance (functional style). It closes over provingKey state.
 */
export function createZKProver() {
  let provingKey: Uint8Array | null = null;

  // Initialize (mock)
  const initialize = async (): Promise<void> => {
    provingKey = new Uint8Array(1024);
    console.log('ZK Prover initialized');
  };

  // ---------- Helpers (pure) ----------
  const poseidonHash = (data: Uint8Array): Uint8Array => {
    return blake2AsU8a(data, 256); // placeholder
  };

  const toBigIntBytes = (value: string): Uint8Array => {
    const bigInt = BigInt(value);
    const hex = bigInt.toString(16).padStart(64, '0');
    return hexToU8a('0x' + hex);
  };

  const hashPair = (left: Uint8Array, right: Uint8Array): Uint8Array =>
    poseidonHash(new Uint8Array([...left, ...right]));

  const verifyMerkleProof = (leaf: string, proof: string[], root: string, leafIndex: number): boolean => {
    let currentHash = hexToU8a(leaf);
    let index = leafIndex;

    for (const sibling of proof) {
      const siblingBytes = hexToU8a(sibling);
      if (index % 2 === 0) {
        currentHash = hashPair(currentHash, siblingBytes);
      } else {
        currentHash = hashPair(siblingBytes, currentHash);
      }
      index = Math.floor(index / 2);
    }

    return u8aToHex(currentHash) === root;
  };

  const computeCommitment = (value: string, secret: string, recipient: string): string => {
    const data = new Uint8Array([
      ...toBigIntBytes(value),
      ...hexToU8a(secret),
      ...hexToU8a(recipient),
    ]);
    return u8aToHex(poseidonHash(data));
  };

  const computeNullifier = (secret: string, commitment: string): string => {
    const data = new Uint8Array([...hexToU8a(secret), ...hexToU8a(commitment)]);
    return u8aToHex(poseidonHash(data));
  };

  const generateGroth16Proof = async (_inputs: any): Promise<Uint8Array> => {
    // mock
    return new Uint8Array(256);
  };

  const serializePublicInputs = (inputs: any): Uint8Array => {
    const serialized: number[] = [];
    for (const [_, value] of Object.entries(inputs)) {
      if (Array.isArray(value)) {
        (value as string[]).forEach(v => serialized.push(...hexToU8a(v)));
      } else if (typeof value === 'string') {
        serialized.push(...hexToU8a(value));
      }
    }
    return new Uint8Array(serialized);
  };

  const validateInputs = (inputs: TransferProofInputs): void => {
    if (!inputs.inputs || inputs.inputs.length === 0) {
      throw new Error('No input commitments provided');
    }
    if (!inputs.outputs || inputs.outputs.length === 0) {
      if (!inputs.publicAmount || inputs.publicAmount === '0') {
        throw new Error('No outputs and no public amount');
      }
    }
    if (!inputs.merkleRoot) {
      throw new Error('Merkle root not provided');
    }
  };

  // ---------- Public API ----------
  const generateTransferProof = async (inputs: TransferProofInputs): Promise<ZKProof> => {
    if (!provingKey) {
      throw new Error('Prover not initialized');
    }

    validateInputs(inputs);

    const nullifiers = inputs.inputs.map(inp => computeNullifier(inp.secret, inp.commitment));
    const newCommitments = inputs.outputs.map(out => computeCommitment(out.value, out.secret, out.recipient));

    for (const input of inputs.inputs) {
      const isValid = verifyMerkleProof(input.commitment, input.merkleProof, inputs.merkleRoot, input.leafIndex);
      if (!isValid) {
        throw new Error('Invalid Merkle proof');
      }
    }

    const inputSum = inputs.inputs.reduce((sum, i) => sum + BigInt(i.value), BigInt(0));
    const outputSum = inputs.outputs.reduce((sum, o) => sum + BigInt(o.value), BigInt(0));
    const publicAmount = BigInt(inputs.publicAmount || '0');

    if (inputSum !== outputSum + publicAmount) {
      throw new Error('Input and output values do not balance');
    }

    const proof = await generateGroth16Proof({
      nullifiers,
      newCommitments,
      merkleRoot: inputs.merkleRoot,
      publicAmount: inputs.publicAmount || '0',
    });

    const publicInputs = serializePublicInputs({
      merkleRoot: inputs.merkleRoot,
      nullifiers,
      commitments: newCommitments,
      publicAmount: inputs.publicAmount || '0',
    });

    return { proof, publicInputs };
  };

  const generateDepositProof = async (value: string, secret: string, recipient: string): Promise<ZKProof> => {
    const commitment = computeCommitment(value, secret, recipient);
    const proof = new Uint8Array(256);
    const publicInputs = serializePublicInputs({ commitment, value });
    return { proof, publicInputs };
  };

  const generateWithdrawProof = async (input: CommitmentInput, recipient: string, merkleRoot: string) =>
    generateTransferProof({
      inputs: [input],
      outputs: [], // no private outputs
      merkleRoot,
      publicAmount: input.value,
    });

  return {
    initialize,
    generateTransferProof,
    generateDepositProof,
    generateWithdrawProof,
    // expose helpers for testing/debugging (optional)
    _computeCommitment: computeCommitment,
    _computeNullifier: computeNullifier,
    _verifyMerkleProof: verifyMerkleProof,
  };
}
