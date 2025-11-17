# ZK Integration Quick Start

Zero-knowledge proof system for private transfers on the PrivaChain parachain.

## 🚀 Quick Start

### 1. Setup (First Time Only)

```bash
# Copy circuit artifacts from parachain to client
npm run copy-zk-assets
```

If you get "circuit_final.zkey not found", run trusted setup first:

```bash
cd ../parachain/pallets/zk_privacy/src/circom
npm install
# Follow README.md for trusted setup
cd -
npm run copy-zk-assets
```

### 2. Initialize in Your App

```typescript
import { initializeZK } from '@/utils/blockchain';

// On app startup
await initializeZK();
```

### 3. Use It!

```typescript
// Private transfer
import { executePrivateTransfer } from '@/utils/blockchain';

const txHash = await executePrivateTransfer({
  api,                          // Polkadot API
  signer,                       // Your signer
  recipientPubkey: 123456n,     // Recipient
  amount: 1000000000000n,       // Amount
  myPubkey: 789012n,            // Your pubkey (for change)
});
```

## 📁 File Structure

```
client/
├── utils/
│   ├── blockchain.ts              # Main integration
│   └── zk/
│       ├── prover.ts              # Proof generation
│       ├── circuit-adapter.ts     # Input formatting
│       ├── notes.ts               # Note management
│       └── examples.ts            # Usage examples
├── types/
│   └── zk.d.ts                    # Type declarations
├── scripts/
│   └── copy-zk-assets.sh          # Copy circuit artifacts
├── docs/
│   └── ZK_INTEGRATION.md          # Full documentation
└── public/zk/                     # Circuit artifacts (gitignored)
    ├── circuit_js/
    │   ├── circuit.wasm
    │   └── witness_calculator.js
    ├── circuit_final.zkey         # ~50MB
    └── verification_key.json
```

## 🔑 Key Functions

### Blockchain Integration (`utils/blockchain.ts`)

```typescript
// Initialize ZK system
await initializeZK();

// Deposit (public → private)
await depositToPrivatePool({ api, signer, amount, recipientPubkey });

// Private transfer
await executePrivateTransfer({ api, signer, recipientPubkey, amount, myPubkey });

// Get wallet stats
const stats = getWalletStats();
```

### Note Management (`utils/zk/notes.ts`)

```typescript
import {
  createNote,
  getSpendableNotes,
  getTotalBalance,
  getNoteStats,
  debugPrintNotes,
} from '@/utils/zk/notes';

// Create note
const note = createNote(amount, recipientPubkey);

// Get balance
const balance = getTotalBalance();

// Get statistics
const stats = getNoteStats();
// { total, spendable, spent, pending, totalBalance }

// Debug
debugPrintNotes();
```

### Low-Level Proof Generation (`utils/zk/prover.ts`)

```typescript
import {
  initializeProver,
  generateProof,
  verifyProof,
  hash,
  computeCommitment,
  computeNullifier,
} from '@/utils/zk/prover';

// Poseidon hash
const h = hash(123n, 456n, 789n);

// Commitment
const commitment = computeCommitment(amount, secret, recipient);

// Nullifier
const nullifier = computeNullifier(commitment, secret);

// Generate proof (advanced usage)
const { proof, publicSignals } = await generateProof(circuitInput);
```

## 📊 Circuit Specification

- **Max Inputs**: 4 notes
- **Max Outputs**: 4 notes
- **Merkle Tree**: 20 levels
- **Hash**: Poseidon
- **Commitment**: `Poseidon(amount, secret, recipient)`
- **Nullifier**: `Poseidon(commitment, secret)`

## 🧪 Testing

```typescript
import { runAllExamples } from '@/utils/zk/examples';

// Run all examples
await runAllExamples();
```

Or individual examples:

```typescript
import {
  exampleInitialize,
  exampleNoteManagement,
  exampleProofGeneration,
} from '@/utils/zk/examples';

await exampleInitialize();
exampleNoteManagement();
await exampleProofGeneration();
```

## ⚡ Performance

- Witness calculation: ~1-2 seconds
- Proof generation: ~5-15 seconds
- Local verification: ~100-500ms
- **Total**: ~6-17 seconds per transfer

## 🐛 Troubleshooting

### "circuit.wasm not found"
```bash
npm run copy-zk-assets
```

### "Proving key not loaded"
Run trusted setup in parachain, then copy assets.

### "Insufficient balance"
```typescript
import { getNoteStats } from '@/utils/zk/notes';
const stats = getNoteStats();
console.log('Balance:', stats.totalBalance);
```

### "Witness calculation failed"
Check circuit input format. Use `validateCircuitInput()`.

## 📚 Documentation

See [ZK_INTEGRATION.md](./docs/ZK_INTEGRATION.md) for:
- Complete API reference
- Architecture details
- Security considerations
- Production checklist
- Advanced usage

## 🔐 Security Notes

**Current (Development):**
- ⚠️ Notes stored in plain localStorage
- ⚠️ Mock Merkle proofs

**For Production:**
- [ ] Encrypt notes with user key
- [ ] Implement real Merkle proof queries
- [ ] Use expo-secure-store
- [ ] Add rate limiting
- [ ] Input validation
- [ ] Audit trail

## 📦 Dependencies

```json
{
  "snarkjs": "^0.7.5",
  "circomlibjs": "^0.1.7",
  "buffer": "^6.0.3"
}
```

## 🤝 Contributing

When modifying ZK code:

1. **Don't modify circuit** (`circuit.circom`)
2. Update adapters if circuit changes
3. Test with examples
4. Update documentation
5. Check performance impact

## 📝 Scripts

```bash
# Copy ZK artifacts
npm run copy-zk-assets

# Setup ZK system (full setup)
npm run setup-zk
```

## 🔗 Links

- Circuit: `parachain/pallets/zk_privacy/src/circom/circuit.circom`
- Full docs: `client/docs/ZK_INTEGRATION.md`
- Examples: `client/utils/zk/examples.ts`
- snarkjs: https://github.com/iden3/snarkjs
- circomlibjs: https://github.com/iden3/circomlibjs

---

**Need Help?** Check the full documentation or run the examples!
