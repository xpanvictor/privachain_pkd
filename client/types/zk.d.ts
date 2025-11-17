/**
 * Type declarations for circomlibjs
 */

declare module 'circomlibjs' {
  export function buildPoseidon(): Promise<Poseidon>;
  
  export interface Poseidon {
    (inputs: bigint[]): bigint;
    F: Field;
  }
  
  export interface Field {
    toString(value: bigint): string;
    p: bigint;
  }
}

/**
 * Type declarations for witness calculator
 */
declare module '/zk/circuit_js/witness_calculator.js' {
  export default function buildWitnessCalculator(
    wasmBuffer: ArrayBuffer
  ): Promise<WitnessCalculator>;
  
  export interface WitnessCalculator {
    calculateWitness(input: any, sanityCheck?: boolean): Promise<any>;
  }
}
