# How to Test ZK Integration

## Quick Test (Command Line)

Run the automated test script:

```bash
node test-zk.js
```

This checks:
- ✅ File structure
- ✅ Dependencies installed
- ✅ NPM scripts configured
- ✅ Circuit artifacts present

## Testing in Your App

### Option 1: Use the Test Screen Component

1. Add the test screen to your navigation:

```typescript
// In your app navigation (e.g., app/(tabs)/_layout.tsx)
import ZKTestScreen from '@/components/screens/ZKTestScreen';

// Add a tab or screen:
<Tab.Screen
  name="zktest"
  options={{ title: 'ZK Test' }}
  component={ZKTestScreen}
/>
```

2. Navigate to the ZK Test screen and tap the test buttons!

### Option 2: Use the Examples Module

```typescript
import { 
  exampleInitialize,
  exampleNoteManagement,
  exampleProofGeneration,
  runAllExamples 
} from '@/utils/zk/examples';

// Run all examples
await runAllExamples();

// Or run individually
await exampleInitialize();
exampleNoteManagement();
await exampleProofGeneration();
```

### Option 3: Test Individual Functions

```typescript
import { initializeZK, debugZKCircuit } from '@/utils/blockchain';
import { getNoteStats, debugPrintNotes } from '@/utils/zk/notes';
import { hash, randomField } from '@/utils/zk/prover';

// Initialize
await initializeZK();

// Debug circuit
debugZKCircuit();

// Test hash functions
const h = hash(123n, 456n);
console.log('Hash:', h);

// Check notes
debugPrintNotes();
const stats = getNoteStats();
console.log('Balance:', stats.totalBalance);
```

## Step-by-Step Testing Guide

### 1. Initialize ZK System

```typescript
import { initializeZK } from '@/utils/blockchain';

try {
  await initializeZK();
  console.log('✅ ZK system ready!');
} catch (error) {
  console.error('❌ Init failed:', error);
}
```

**What to expect:**
- ✅ Circuit loaded message
- ✅ Poseidon hash ready
- ⚠️ Warning if proving key missing (expected, requires trusted setup)

### 2. Test Hash Functions

```typescript
import { hash, randomField, computeCommitment, computeNullifier } from '@/utils/zk/prover';

// Poseidon hash
const h = hash(123n, 456n, 789n);
console.log('Hash:', h); // Should be a long number string

// Random field element
const random = randomField();
console.log('Random:', random); // Should be different each time

// Commitment
const commitment = computeCommitment(1000n, 12345n, 67890n);
console.log('Commitment:', commitment);

// Nullifier
const nullifier = computeNullifier(commitment, 12345n);
console.log('Nullifier:', nullifier);
```

**What to expect:**
- ✅ All functions return bigint strings
- ✅ Same inputs = same outputs (deterministic)
- ✅ Random field changes each time

### 3. Test Note Management

```typescript
import { createNote, addReceivedNotes, getSpendableNotes, getTotalBalance } from '@/utils/zk/notes';

// Create test notes
const myPubkey = 123456789n;
const note1 = createNote(1000000n, myPubkey);
note1.leafIndex = 0; // Mock leaf index

const note2 = createNote(2000000n, myPubkey);
note2.leafIndex = 1;

// Save notes
addReceivedNotes([note1, note2]);

// Check balance
const balance = getTotalBalance();
console.log('Balance:', balance); // Should be 3000000

// Get spendable notes
const notes = getSpendableNotes();
console.log('Spendable notes:', notes.length); // Should be 2
```

**What to expect:**
- ✅ Notes saved to localStorage
- ✅ Balance calculation correct
- ✅ Can retrieve notes

### 4. Test Circuit Input Preparation

```typescript
import { prepareCircuitInput, validateCircuitInput, createMockMerkleProof } from '@/utils/zk/circuit-adapter';
import { createNote } from '@/utils/zk/notes';

// Create input and output
const input = createNote(1000n, 123n);
input.leafIndex = 0;

const output = createNote(1000n, 456n);

// Prepare circuit input
const { circuitInput, nullifiers, outCommitments } = prepareCircuitInput(
  [input],
  [output],
  [createMockMerkleProof()]
);

// Validate
const validation = validateCircuitInput(circuitInput);
console.log('Valid:', validation.valid); // Should be true
if (!validation.valid) {
  console.error('Errors:', validation.errors);
}
```

**What to expect:**
- ✅ Circuit input prepared
- ✅ Validation passes
- ✅ Nullifiers and commitments computed

### 5. Test Proof Generation (Requires Trusted Setup)

```typescript
import { generateProof, verifyProof } from '@/utils/zk/prover';
import { prepareCircuitInput, createMockMerkleProof } from '@/utils/zk/circuit-adapter';
import { createNote } from '@/utils/zk/notes';

// Create test data
const input = createNote(1000n, 123n);
input.leafIndex = 0;
const output = createNote(1000n, 456n);

// Prepare circuit input
const { circuitInput } = prepareCircuitInput(
  [input],
  [output],
  [createMockMerkleProof()]
);

// Generate proof (takes 5-15 seconds)
console.log('Generating proof...');
const { proof, publicSignals } = await generateProof(circuitInput);
console.log('✅ Proof generated!');

// Verify proof
const isValid = await verifyProof(proof, publicSignals);
console.log('Proof valid:', isValid); // Should be true
```

**What to expect:**
- ⚠️ Fails with "Proving key not loaded" if trusted setup not done
- ✅ Takes 5-15 seconds if setup is done
- ✅ Proof verification passes

## Expected Test Results

### Without Trusted Setup (Current State)
- ✅ Module imports work
- ✅ Hash functions work
- ✅ Note management works
- ✅ Circuit input preparation works
- ❌ Proof generation fails (expected)

### With Trusted Setup
- ✅ All of the above
- ✅ Proof generation works
- ✅ Proof verification works
- ✅ Full end-to-end transfer flow works

## Common Test Scenarios

### Scenario 1: Single Input, Single Output

```typescript
const input = createNote(1000n, myPubkey);
const output = createNote(1000n, recipientPubkey);
// Balance: 1000 = 1000 ✅
```

### Scenario 2: Single Input, Two Outputs (with change)

```typescript
const input = createNote(1000n, myPubkey);
const output1 = createNote(600n, recipientPubkey);
const output2 = createNote(400n, myPubkey); // Change
// Balance: 1000 = 600 + 400 ✅
```

### Scenario 3: Multiple Inputs, Single Output

```typescript
const input1 = createNote(500n, myPubkey);
const input2 = createNote(500n, myPubkey);
const output = createNote(1000n, recipientPubkey);
// Balance: 500 + 500 = 1000 ✅
```

### Scenario 4: Maximum (4 inputs, 4 outputs)

```typescript
const inputs = [
  createNote(250n, myPubkey),
  createNote(250n, myPubkey),
  createNote(250n, myPubkey),
  createNote(250n, myPubkey),
];

const outputs = [
  createNote(500n, recipientPubkey),
  createNote(300n, anotherPubkey),
  createNote(100n, yetAnotherPubkey),
  createNote(100n, myPubkey), // Change
];
// Balance: 1000 = 500 + 300 + 100 + 100 ✅
```

## Troubleshooting Tests

### "Cannot find module 'circomlibjs'"
```bash
npm install snarkjs circomlibjs buffer
```

### "circuit.wasm not found"
```bash
npm run copy-zk-assets
```

### "Proving key not loaded"
This is expected! To enable proof generation:

1. Go to parachain circom directory:
```bash
cd ../parachain/pallets/zk_privacy/src/circom
```

2. Run trusted setup (see parachain README)

3. Copy artifacts again:
```bash
cd ../../../../client
npm run copy-zk-assets
```

### "Insufficient balance"
You need to create test notes first:

```typescript
import { createNote, addReceivedNotes } from '@/utils/zk/notes';

const note = createNote(1000000n, myPubkey);
note.leafIndex = 0;
addReceivedNotes([note]);
```

### "Invalid circuit input"
Check that:
- Input/output counts are 1-4
- Sum of inputs = sum of outputs
- All notes have leafIndex set

## Performance Benchmarks

Expected timings on typical hardware:

- **Initialize ZK**: ~1-2 seconds (first time)
- **Hash function**: <1ms
- **Create note**: <1ms
- **Prepare circuit input**: ~10-50ms
- **Generate proof**: 5-15 seconds ⚠️
- **Verify proof**: 100-500ms

## Next Steps After Testing

1. **Integrate with UI**: Add buttons to trigger transfers
2. **Connect to chain**: Implement actual Merkle proof queries
3. **Handle events**: Extract leaf indices from chain events
4. **Add encryption**: Encrypt notes in storage
5. **Optimize**: Add Web Worker for proof generation
6. **Production**: Run trusted setup on production parameters

## Test Checklist

- [ ] Run `node test-zk.js` ✅ passes
- [ ] Initialize ZK in app
- [ ] Test hash functions
- [ ] Create and save notes
- [ ] Prepare circuit input
- [ ] Generate proof (if setup done)
- [ ] Verify proof locally
- [ ] Test with UI component
- [ ] Test error handling
- [ ] Test edge cases (max notes, zero amounts, etc.)

---

**Ready to test!** Start with `node test-zk.js` and then use the test screen component in your app.
