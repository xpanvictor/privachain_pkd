/**
 * Circuit Input Adapter
 * Adapts application data to the existing circuit's input format
 * 
 * Circuit expects (from circuit.circom):
 * - PUBLIC: root, nullifierHashes[4], outCommitments[4]
 * - PRIVATE: inAmount[4], inSecret[4], inRecipient[4], 
 *            inPathElements[4][20], inPathIndices[4][20],
 *            outAmount[4], outSecret[4], outRecipient[4]
 */

import { computeCommitment, computeNullifier, CIRCUIT_CONSTANTS } from './prover';

export interface ApplicationNote {
  amount: bigint;
  secret: bigint;
  recipient: bigint;
  leafIndex?: number;
  commitment?: string;
}

export interface MerkleProofData {
  root: string;
  pathElements: string[];
  pathIndices: number[];
}

/**
 * Pad array to fixed size (circuit expects exactly 4 inputs/outputs)
 */
function padArray<T>(arr: T[], size: number, defaultValue: T): T[] {
  const padded = [...arr];
  while (padded.length < size) {
    padded.push(defaultValue);
  }
  return padded;
}

/**
 * Convert application-level transfer data to circuit input format
 * Pads to 4 inputs and 4 outputs as required by circuit
 */
export function prepareCircuitInput(
  inputNotes: ApplicationNote[],
  outputNotes: ApplicationNote[],
  merkleProofs: MerkleProofData[]
): any {
  
  // Validate
  if (inputNotes.length === 0 || inputNotes.length > CIRCUIT_CONSTANTS.MAX_INPUTS) {
    throw new Error(`Must have 1-${CIRCUIT_CONSTANTS.MAX_INPUTS} input notes`);
  }
  if (outputNotes.length === 0 || outputNotes.length > CIRCUIT_CONSTANTS.MAX_OUTPUTS) {
    throw new Error(`Must have 1-${CIRCUIT_CONSTANTS.MAX_OUTPUTS} output notes`);
  }
  if (merkleProofs.length !== inputNotes.length) {
    throw new Error('Must provide Merkle proof for each input note');
  }

  // Validate balance
  const sumIn = inputNotes.reduce((s, i) => s + i.amount, 0n);
  const sumOut = outputNotes.reduce((s, o) => s + o.amount, 0n);
  if (sumIn !== sumOut) {
    throw new Error(`Input sum (${sumIn}) must equal output sum (${sumOut})`);
  }

  console.log('📋 Preparing circuit input:');
  console.log('   Input notes:', inputNotes.length);
  console.log('   Output notes:', outputNotes.length);
  console.log('   Balance: IN =', sumIn.toString(), 'OUT =', sumOut.toString());

  // Compute nullifiers for inputs
  const nullifiers = inputNotes.map(input => {
    const commitment = input.commitment || computeCommitment(
      input.amount,
      input.secret,
      input.recipient
    );
    return computeNullifier(commitment, input.secret);
  });

  // Compute commitments for outputs
  const outCommitments = outputNotes.map(output =>
    computeCommitment(output.amount, output.secret, output.recipient)
  );

  // Pad arrays to size 4
  const paddedInputAmounts = padArray(
    inputNotes.map(i => i.amount.toString()),
    CIRCUIT_CONSTANTS.MAX_INPUTS,
    '0'
  );
  
  const paddedInputSecrets = padArray(
    inputNotes.map(i => i.secret.toString()),
    CIRCUIT_CONSTANTS.MAX_INPUTS,
    '0'
  );
  
  const paddedInputRecipients = padArray(
    inputNotes.map(i => i.recipient.toString()),
    CIRCUIT_CONSTANTS.MAX_INPUTS,
    '0'
  );

  const paddedOutputAmounts = padArray(
    outputNotes.map(o => o.amount.toString()),
    CIRCUIT_CONSTANTS.MAX_OUTPUTS,
    '0'
  );
  
  const paddedOutputSecrets = padArray(
    outputNotes.map(o => o.secret.toString()),
    CIRCUIT_CONSTANTS.MAX_OUTPUTS,
    '0'
  );
  
  const paddedOutputRecipients = padArray(
    outputNotes.map(o => o.recipient.toString()),
    CIRCUIT_CONSTANTS.MAX_OUTPUTS,
    '0'
  );

  const paddedNullifiers = padArray(
    nullifiers,
    CIRCUIT_CONSTANTS.MAX_INPUTS,
    '0'
  );
  
  const paddedOutCommitments = padArray(
    outCommitments,
    CIRCUIT_CONSTANTS.MAX_OUTPUTS,
    '0'
  );

  // Pad Merkle paths (depth = 20)
  const emptyPath = Array(CIRCUIT_CONSTANTS.MERKLE_TREE_DEPTH).fill('0');
  const emptyIndices = Array(CIRCUIT_CONSTANTS.MERKLE_TREE_DEPTH).fill(0);
  
  const paddedPathElements = padArray(
    merkleProofs.map(p => p.pathElements),
    CIRCUIT_CONSTANTS.MAX_INPUTS,
    emptyPath
  );
  
  const paddedPathIndices = padArray(
    merkleProofs.map(p => p.pathIndices),
    CIRCUIT_CONSTANTS.MAX_INPUTS,
    emptyIndices
  );

  // Construct circuit input (matches circuit.circom signal names)
  const circuitInput = {
    // Public inputs
    root: merkleProofs[0].root,
    nullifierHashes: paddedNullifiers,
    outCommitments: paddedOutCommitments,
    
    // Private inputs - Input notes
    inAmount: paddedInputAmounts,
    inSecret: paddedInputSecrets,
    inRecipient: paddedInputRecipients,
    inPathElements: paddedPathElements,
    inPathIndices: paddedPathIndices,
    
    // Private inputs - Output notes
    outAmount: paddedOutputAmounts,
    outSecret: paddedOutputSecrets,
    outRecipient: paddedOutputRecipients,
  };

  console.log('  ✓ Circuit input prepared');
  console.log('    Nullifiers:', nullifiers.slice(0, inputNotes.length));
  console.log('    Out commitments:', outCommitments.slice(0, outputNotes.length));

  return {
    circuitInput,
    nullifiers: nullifiers.slice(0, inputNotes.length),
    outCommitments: outCommitments.slice(0, outputNotes.length),
  };
}

/**
 * Validate circuit input format
 */
export function validateCircuitInput(circuitInput: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for required fields
  const requiredFields = [
    'root',
    'nullifierHashes',
    'outCommitments',
    'inAmount',
    'inSecret',
    'inRecipient',
    'inPathElements',
    'inPathIndices',
    'outAmount',
    'outSecret',
    'outRecipient',
  ];
  
  for (const field of requiredFields) {
    if (!(field in circuitInput)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check array lengths
  if (circuitInput.inAmount?.length !== CIRCUIT_CONSTANTS.MAX_INPUTS) {
    errors.push(`inAmount must have exactly ${CIRCUIT_CONSTANTS.MAX_INPUTS} elements`);
  }
  
  if (circuitInput.inSecret?.length !== CIRCUIT_CONSTANTS.MAX_INPUTS) {
    errors.push(`inSecret must have exactly ${CIRCUIT_CONSTANTS.MAX_INPUTS} elements`);
  }
  
  if (circuitInput.outAmount?.length !== CIRCUIT_CONSTANTS.MAX_OUTPUTS) {
    errors.push(`outAmount must have exactly ${CIRCUIT_CONSTANTS.MAX_OUTPUTS} elements`);
  }
  
  if (circuitInput.outSecret?.length !== CIRCUIT_CONSTANTS.MAX_OUTPUTS) {
    errors.push(`outSecret must have exactly ${CIRCUIT_CONSTANTS.MAX_OUTPUTS} elements`);
  }

  // Check Merkle path dimensions
  if (circuitInput.inPathElements?.length !== CIRCUIT_CONSTANTS.MAX_INPUTS) {
    errors.push(`inPathElements must have exactly ${CIRCUIT_CONSTANTS.MAX_INPUTS} elements`);
  } else {
    for (let i = 0; i < circuitInput.inPathElements.length; i++) {
      if (circuitInput.inPathElements[i]?.length !== CIRCUIT_CONSTANTS.MERKLE_TREE_DEPTH) {
        errors.push(`inPathElements[${i}] must have exactly ${CIRCUIT_CONSTANTS.MERKLE_TREE_DEPTH} elements`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create mock Merkle proof for testing
 */
export function createMockMerkleProof(): MerkleProofData {
  return {
    root: '0',
    pathElements: Array(CIRCUIT_CONSTANTS.MERKLE_TREE_DEPTH).fill('0'),
    pathIndices: Array(CIRCUIT_CONSTANTS.MERKLE_TREE_DEPTH).fill(0),
  };
}
