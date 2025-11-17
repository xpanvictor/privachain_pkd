# Zero-Knowledge Proof Integration

This document explains how the ZK proof system is integrated into the client application.

## Overview

The client uses the existing circuit from `parachain/pallets/zk_privacy/src/circom` to generate zero-knowledge proofs for private transfers. The integration is designed to work with the circuit as-is, without requiring any modifications to the circuit code.

## Architecture

### Components

```
client/
├── utils/
│   ├── blockchain.ts          # Chain integration + ZK functions
│   └── zk/
│       ├── prover.ts          # Proof generation & Poseidon hashing
│       ├── circuit-adapter.ts # Adapts app data to circuit format
│       └── notes.ts           # Note (UTXO) management
├── scripts/
│   └── copy-zk-assets.sh      # Copies circuit artifacts from parachain
└── public/zk/                 # Circuit artifacts (gitignored)
    ├── circuit_js/
    │   ├── circuit.wasm       # Witness calculator
    │   └── witness_calculator.js
    ├── circuit_final.zkey     # Proving key (~50MB)
    └── verification_key.json  # Verification key
```

### Circuit Specification

From `circuit.circom`:
- **Max Inputs**: 4 notes
- **Max Outputs**: 4 notes  
- **Merkle Tree Depth**: 20 levels
- **Hash Function**: Poseidon
- **Commitment**: `Poseidon(amount, secret, recipient)`
- **Nullifier**: `Poseidon(commitment, secret)`

## Setup

### 1. Generate Circuit Artifacts (One-time, in parachain)

```bash
cd parachain/pallets/zk_privacy/src/circom

# Install dependencies
npm install

# Compile circuit to WASM
circom circuit.circom --r1cs --wasm --sym --c

# Run Powers of Tau ceremony (if not done)
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First" -v
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v

# Circuit-specific setup
snarkjs groth16 setup circuit.r1cs pot14_final.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey --name="First" -v

# Export verification key
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json
```

### 2. Copy Artifacts to Client

```bash
cd client
npm run copy-zk-assets
```

This copies:
- `circuit_js/circuit.wasm` - WASM witness calculator
- `circuit_js/witness_calculator.js` - JS wrapper
- `circuit_final.zkey` - Proving key (~50MB)
- `verification_key.json` - Verification key

### 3. Initialize in Application

```typescript
import { initializeZK } from '@/utils/blockchain';

// On app startup (before any ZK operations)
await initializeZK();
```

## Usage

### Private Transfer

```typescript
import { executePrivateTransfer } from '@/utils/blockchain';

const txHash = await executePrivateTransfer({
  api,                              // Polkadot API instance
  signer,                           // Account to sign with
  recipientPubkey: 123456789n,      // Recipient's public key
  amount: 1000000000000n,           // Amount to send (1 token)
  myPubkey: 987654321n,             // Your public key (for change)
});

console.log('Transaction hash:', txHash);
```

**What happens internally:**
1. Selects input notes (coin selection)
2. Creates output notes (payment + change)
3. Fetches Merkle proofs for inputs
4. Generates ZK proof (~5-15 seconds)
5. Verifies proof locally
6. Submits transaction to chain

### Deposit (Public → Private)

```typescript
import { depositToPrivatePool } from '@/utils/blockchain';

const txHash = await depositToPrivatePool({
  api,
  signer,
  amount: 5000000000000n,          // Amount to deposit (5 tokens)
  recipientPubkey: 987654321n,     // Your public key
});
```

### Note Management

```typescript
import {
  getNoteStats,
  getSpendableNotes,
  getTotalBalance,
  debugPrintNotes,
} from '@/utils/zk/notes';

// Get wallet statistics
const stats = getNoteStats();
console.log('Spendable notes:', stats.spendable);
console.log('Total balance:', stats.totalBalance);

// Get all spendable notes
const notes = getSpendableNotes();

// Get notes with minimum amount
const largeNotes = getSpendableNotes(1000000000000n);

// Get total balance
const balance = getTotalBalance();

// Debug: print all notes
debugPrintNotes();
```

## Module Details

### `utils/zk/prover.ts`

Core ZK proof functionality:

- `initializeProver()` - Load circuit artifacts (WASM, keys)
- `generateProof(input)` - Generate ZK proof
- `verifyProof(proof, signals)` - Verify proof locally
- `hash(...inputs)` - Poseidon hash (matches circuit)
- `randomField()` - Generate random field element
- `computeCommitment(amount, secret, recipient)` - Compute note commitment
- `computeNullifier(commitment, secret)` - Compute nullifier
- `getCircuitInfo()` - Get circuit status
- `debugCircuit()` - Debug circuit details

### `utils/zk/circuit-adapter.ts`

Adapts application data to circuit input format:

- `prepareCircuitInput(inputs, outputs, proofs)` - Prepare circuit input
  - Validates note counts (1-4 inputs, 1-4 outputs)
  - Validates balance (sum in = sum out)
  - Computes nullifiers and commitments
  - Pads arrays to size 4
  - Returns circuit input + derived values

- `validateCircuitInput(input)` - Validate circuit input
- `createMockMerkleProof()` - Create mock proof for testing

### `utils/zk/notes.ts`

Manages user's private notes (UTXOs):

- `createNote(amount, recipient, secret?)` - Create new note
- `saveNotes(notes)` - Save to localStorage
- `loadNotes()` - Load from localStorage
- `getSpendableNotes(minAmount?)` - Get unspent notes
- `getTotalBalance()` - Get total spendable balance
- `markNotesSpent(commitments)` - Mark notes as spent
- `addReceivedNotes(notes)` - Add new received notes
- `updateNoteLeafIndex(commitment, index)` - Update leaf index
- `selectNotesForTransfer(amount, maxNotes)` - Coin selection
- `getNoteStats()` - Get statistics
- `debugPrintNotes()` - Debug print all notes

**Note Storage Format:**
```typescript
interface Note {
  commitment: string;      // Poseidon(amount, secret, recipient)
  amount: bigint;          // Note amount
  secret: bigint;          // Random secret
  recipient: bigint;       // Owner's public key
  leafIndex?: number;      // Position in Merkle tree
  spent: boolean;          // Whether note is spent
  timestamp?: number;      // Creation time
}
```

### `utils/blockchain.ts`

Chain integration with ZK functions:

- `initializeZK()` - Initialize ZK system
- `executePrivateTransfer(params)` - Execute private transfer
- `depositToPrivatePool(params)` - Deposit to private pool
- `getMerkleProof(api, commitment, leafIndex)` - Get Merkle proof
- `connectApi(endpoint)` - Connect to parachain
- `debugZKCircuit()` - Debug circuit status
- `getWalletStats()` - Get wallet statistics

## Data Flow

### Private Transfer Flow

```
1. User initiates transfer
   ↓
2. Select input notes (coin selection)
   ↓
3. Create output notes (payment + change)
   ↓
4. Fetch Merkle proofs from chain
   ↓
5. Prepare circuit input (adapt to format)
   ↓
6. Generate ZK proof
   ↓
7. Verify proof locally (optional)
   ↓
8. Submit transaction to chain
   ↓
9. Update local note state
   - Mark inputs as spent
   - Add output notes
```

### Circuit Input Format

```typescript
{
  // Public inputs
  root: string,                    // Merkle root
  nullifierHashes: string[4],      // Input nullifiers
  outCommitments: string[4],       // Output commitments
  
  // Private inputs
  inAmount: string[4],             // Input amounts
  inSecret: string[4],             // Input secrets
  inRecipient: string[4],          // Input recipients
  inPathElements: string[4][20],   // Merkle paths
  inPathIndices: number[4][20],    // Path indices
  
  outAmount: string[4],            // Output amounts
  outSecret: string[4],            // Output secrets
  outRecipient: string[4],         // Output recipients
}
```

## Security Considerations

### Current Implementation (Development)

- ⚠️ Notes stored in **plain localStorage**
- ⚠️ No encryption of sensitive data
- ⚠️ Mock Merkle proofs for testing

### Production Requirements

1. **Encrypt notes** with user's key (derived from PIN/biometric)
2. **Implement actual Merkle proof queries** from chain/indexer
3. **Secure key management** (use expo-secure-store)
4. **Rate limiting** on proof generation
5. **Input validation** and sanitization
6. **Audit trail** for debugging

## Performance

### Proof Generation Time

- **WASM witness calculation**: ~1-2 seconds
- **Proof generation**: ~5-15 seconds
- **Local verification**: ~100-500ms

Total: ~6-17 seconds per transfer

### Optimization Opportunities

1. **Web Worker** - Offload proof gen to background thread
2. **Caching** - Cache witness calculator, keys in memory
3. **Batch transfers** - Combine multiple payments
4. **Precompute** - Generate proofs ahead of time

## Troubleshooting

### "circuit.wasm not found"

```bash
cd client
npm run copy-zk-assets
```

### "Proving key not loaded"

The trusted setup hasn't been run. See [Setup](#setup) section.

### "Witness calculation failed"

The circuit input format doesn't match. Check logs for details. The adapter should handle this automatically.

### "Insufficient balance"

You don't have enough spendable notes. Use `getNoteStats()` to check balance.

### "Invalid circuit input"

Input validation failed. Common causes:
- Wrong array sizes
- Missing required fields
- Balance mismatch (sum in ≠ sum out)

## Development Scripts

```bash
# Copy ZK artifacts from parachain to client
npm run copy-zk-assets

# Setup ZK system (run trusted setup + copy assets)
npm run setup-zk

# Start app
npm start
```

## Testing

### Manual Testing

```typescript
import { debugCircuit, debugPrintNotes } from '@/utils/blockchain';

// Check circuit status
debugCircuit();

// Check notes
debugPrintNotes();

// Test proof generation (mock)
import { createMockMerkleProof } from '@/utils/zk/circuit-adapter';
import { createNote } from '@/utils/zk/notes';
import { prepareCircuitInput, validateCircuitInput } from '@/utils/zk/circuit-adapter';
import { generateProof, verifyProof } from '@/utils/zk/prover';

// Create test notes
const input = createNote(1000n, 123n);
const output = createNote(1000n, 456n);

// Prepare circuit input
const { circuitInput } = prepareCircuitInput(
  [input],
  [output],
  [createMockMerkleProof()]
);

// Validate
const validation = validateCircuitInput(circuitInput);
console.log('Valid:', validation.valid);

// Generate proof (requires setup)
const { proof, publicSignals } = await generateProof(circuitInput);

// Verify
const isValid = await verifyProof(proof, publicSignals);
console.log('Proof valid:', isValid);
```

## TODO

- [ ] Implement actual Merkle proof queries from chain
- [ ] Extract leaf indices from chain events
- [ ] Encrypt notes in storage
- [ ] Implement withdrawal circuit/flow
- [ ] Add Web Worker for proof generation
- [ ] Add progress indicators for proof generation
- [ ] Implement note scanning (detect received notes)
- [ ] Add transaction history
- [ ] Implement note consolidation (combine small notes)
- [ ] Add fee handling
- [ ] Implement proper error handling and user feedback

## References

- Circuit: `parachain/pallets/zk_privacy/src/circom/circuit.circom`
- snarkjs: https://github.com/iden3/snarkjs
- circomlibjs: https://github.com/iden3/circomlibjs
- Poseidon hash: https://eprint.iacr.org/2019/458.pdf
