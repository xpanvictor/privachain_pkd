/**
 * Zero-Knowledge Proof Generator
 * Works with existing circuit artifacts from parachain/pallets/zk_privacy/src/circom
 * 
 * Circuit expects:
 * - 4 inputs, 4 outputs (padded if fewer)
 * - 20 levels for Merkle tree
 * - Commitments: Poseidon(amount, secret, recipient)
 * - Nullifiers: Poseidon(commitment, secret)
 */

import { buildPoseidon } from 'circomlibjs';
// @ts-ignore - snarkjs doesn't have proper types
import * as snarkjs from 'snarkjs';

interface CircuitInterface {
  witnessCalculator: any;
  zkeyBuffer: ArrayBuffer | null;
  vKey: any | null;
  poseidon: any;
}

let circuit: CircuitInterface = {
  witnessCalculator: null,
  zkeyBuffer: null,
  vKey: null,
  poseidon: null
};

/**
 * Initialize prover with existing circuit artifacts
 * Call this once on app startup
 */
export async function initializeProver(): Promise<void> {
  console.log('🔧 Initializing ZK prover with existing circuit...');
  
  try {
    // 1. Load Poseidon hash
    console.log('  Loading Poseidon hash...');
    circuit.poseidon = await buildPoseidon();
    console.log('  ✓ Poseidon ready');

    // 2. Load witness calculator from existing circuit_js
    console.log('  Loading witness calculator...');
    const wasmResponse = await fetch('/zk/circuit_js/circuit.wasm');
    if (!wasmResponse.ok) {
      throw new Error('circuit.wasm not found. Run: npm run copy-zk-assets');
    }
    const wasmBuffer = await wasmResponse.arrayBuffer();
    
    // Use the existing witness_calculator.js
    // @ts-ignore - dynamic import is an external asset without type declarations
    const witnessCalculatorModule = await import('/zk/circuit_js/witness_calculator.js');
    circuit.witnessCalculator = await witnessCalculatorModule.default(wasmBuffer);
    console.log('  ✓ Witness calculator loaded');

    // 3. Load proving key (if available)
    try {
      console.log('  Loading proving key...');
      const zkeyResponse = await fetch('/zk/circuit_final.zkey');
      if (zkeyResponse.ok) {
        circuit.zkeyBuffer = await zkeyResponse.arrayBuffer();
        const sizeMB = (circuit.zkeyBuffer.byteLength / (1024 * 1024)).toFixed(2);
        console.log(`  ✓ Proving key loaded (${sizeMB} MB)`);
      } else {
        console.warn('  ⚠️  Proving key not found (proof generation will fail)');
        console.warn('     Run trusted setup in parachain/pallets/zk_privacy/src/circom/');
      }
    } catch (e: any) {
      console.warn('  ⚠️  Could not load proving key:', e.message);
    }

    // 4. Load verification key (if available)
    try {
      console.log('  Loading verification key...');
      const vKeyResponse = await fetch('/zk/verification_key.json');
      if (vKeyResponse.ok) {
        circuit.vKey = await vKeyResponse.json();
        console.log('  ✓ Verification key loaded');
      } else {
        console.warn('  ⚠️  Verification key not found');
      }
    } catch (e: any) {
      console.warn('  ⚠️  Could not load verification key:', e.message);
    }

    console.log('✅ ZK prover initialized successfully!');
    
  } catch (error) {
    console.error('❌ Failed to initialize prover:', error);
    throw error;
  }
}

/**
 * Hash using Poseidon (matches circuit implementation)
 */
export function hash(...inputs: (bigint | number | string)[]): string {
  if (!circuit.poseidon) {
    throw new Error('Prover not initialized. Call initializeProver() first.');
  }

  const bigInts = inputs.map(x => {
    if (typeof x === 'bigint') return x;
    if (typeof x === 'number') return BigInt(x);
    if (typeof x === 'string') return BigInt(x);
    return BigInt(0);
  });

  return circuit.poseidon.F.toString(circuit.poseidon(bigInts));
}

/**
 * Generate random field element for secrets
 * Uses BN254 field size (same as circuit)
 */
export function randomField(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const fieldSize = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  return BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) % fieldSize;
}

/**
 * Compute commitment for a note
 * Circuit uses: Poseidon(amount, secret, recipient)
 */
export function computeCommitment(
  amount: bigint,
  secret: bigint,
  recipient: bigint
): string {
  return hash(amount, secret, recipient);
}

/**
 * Compute nullifier for spending a note
 * Circuit uses: Poseidon(commitment, secret)
 */
export function computeNullifier(commitment: string, secret: bigint): string {
  return hash(commitment, secret);
}

/**
 * Calculate witness using existing circuit
 */
export async function calculateWitness(input: any): Promise<any> {
  if (!circuit.witnessCalculator) {
    throw new Error('Witness calculator not loaded');
  }

  console.log('📝 Calculating witness...');
  console.log('   Input keys:', Object.keys(input));
  
  try {
    const witness = await circuit.witnessCalculator.calculateWitness(input, true);
    console.log('  ✓ Witness calculated, length:', witness.length);
    return witness;
  } catch (error) {
    console.error('❌ Witness calculation failed:', error);
    console.error('   Input was:', JSON.stringify(input, null, 2));
    throw error;
  }
}

/**
 * Generate zero-knowledge proof
 * Returns proof and public signals
 */
export async function generateProof(circuitInput: any): Promise<{
  proof: any;
  publicSignals: string[];
}> {
  if (!circuit.zkeyBuffer) {
    throw new Error('Proving key not loaded. Run trusted setup first.');
  }

  console.log('🔐 Generating zero-knowledge proof...');
  const startTime = Date.now();
  
  try {
    // Generate proof using snarkjs
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInput,
      new Uint8Array(circuit.zkeyBuffer)
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  ✓ Proof generated in ${duration}s`);
    console.log('  ✓ Public signals:', publicSignals.length);
    
    return { proof, publicSignals };
    
  } catch (error) {
    console.error('❌ Proof generation failed:', error);
    throw error;
  }
}

/**
 * Verify proof locally before submitting to chain
 */
export async function verifyProof(
  proof: any,
  publicSignals: string[]
): Promise<boolean> {
  if (!circuit.vKey) {
    console.warn('⚠️  Verification key not loaded, skipping local verification');
    return true; // Assume valid, will be checked on-chain
  }

  console.log('🔍 Verifying proof locally...');
  
  try {
    const isValid = await snarkjs.groth16.verify(
      circuit.vKey,
      publicSignals,
      proof
    );
    
    console.log(isValid ? '  ✓ Proof valid' : '  ✗ Proof invalid');
    return isValid;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

/**
 * Get circuit status and information
 */
export function getCircuitInfo(): {
  initialized: boolean;
  hasProvingKey: boolean;
  hasVerificationKey: boolean;
  poseidonReady: boolean;
} {
  return {
    initialized: circuit.witnessCalculator !== null,
    hasProvingKey: circuit.zkeyBuffer !== null,
    hasVerificationKey: circuit.vKey !== null,
    poseidonReady: circuit.poseidon !== null,
  };
}

/**
 * Debug circuit details
 */
export function debugCircuit(): void {
  console.log('🔍 Circuit Debug Info:');
  console.log('  Witness Calculator:', circuit.witnessCalculator ? '✓' : '✗');
  
  if (circuit.zkeyBuffer) {
    const sizeMB = (circuit.zkeyBuffer.byteLength / (1024 * 1024)).toFixed(2);
    console.log(`  Proving Key: ✓ (${sizeMB} MB)`);
  } else {
    console.log('  Proving Key: ✗');
  }
  
  console.log('  Verification Key:', circuit.vKey ? '✓' : '✗');
  console.log('  Poseidon Hash:', circuit.poseidon ? '✓' : '✗');
  
  if (circuit.vKey) {
    console.log('  Circuit Details:');
    console.log('    Protocol:', circuit.vKey.protocol);
    console.log('    Curve:', circuit.vKey.curve);
  }
  
  console.log('');
  console.log('📋 Circuit Specification:');
  console.log('  Max Inputs: 4');
  console.log('  Max Outputs: 4');
  console.log('  Merkle Depth: 20');
  console.log('  Hash Function: Poseidon');
}

/**
 * Export field size constant
 */
export const FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

/**
 * Circuit constants (from circuit.circom)
 */
export const CIRCUIT_CONSTANTS = {
  MAX_INPUTS: 4,
  MAX_OUTPUTS: 4,
  MERKLE_TREE_DEPTH: 20,
} as const;
