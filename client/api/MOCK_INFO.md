# Mock Chain API

## Overview

The `chain.ts` file is currently using a **MOCK implementation** that simulates blockchain functionality without connecting to a real parachain. This allows you to develop and test the mobile app UI without needing a running blockchain node.

## Files

- **`chain.ts`** - Current mock implementation (active)
- **`chain.ts.real`** - Real Polkadot/Substrate implementation (for when parachain is available)

## Mock Features

The mock implementation provides:

✅ All the same exports and function signatures as the real implementation
✅ Simulated transaction delays (500ms-1200ms)
✅ Mock transaction results with random hashes
✅ In-memory state management (commitments, nullifiers, balances)
✅ Console logging with `[MOCK]` prefix for debugging
✅ No external dependencies (no @polkadot packages)
✅ Works offline without blockchain connection

## Mock Limitations

❌ No actual blockchain transactions
❌ No real ZK proof verification
❌ State resets on app reload
❌ No real event subscriptions (subscriptions do nothing)
❌ No network peers
❌ Fixed mock block number

## Switching to Real Blockchain

When your parachain is ready and running:

```bash
cd /home/jen/Documents/projects/privachain_pkd/client/api

# Backup current mock
mv chain.ts chain.ts.mock

# Activate real implementation
mv chain.ts.real chain.ts

# Restart your app
npm start
```

## Switching Back to Mock

If you need to go back to mock mode:

```bash
cd /home/jen/Documents/projects/privachain_pkd/client/api

# Save real implementation
mv chain.ts chain.ts.real

# Restore mock
mv chain.ts.mock chain.ts

# Restart your app
npm start
```

## Mock Behavior

### Connection
- `connect()` - Always succeeds after 500ms delay
- `disconnect()` - Always succeeds immediately
- `isConnected()` - Returns current mock connection state

### Transactions
- `deposit()` - Simulates 1000ms delay, returns success
- `privateTransfer()` - Simulates 1200ms delay, returns success  
- `withdraw()` - Simulates 1000ms delay, returns success

### Queries
- `getMerkleRoot()` - Returns fixed mock root
- `getCommitmentCount()` - Returns count from mock state
- `getBalance()` - Returns '1000000000000000' (1M tokens)
- `getChainState()` - Returns mock state with fixed block number

### Events
- All subscription functions return immediately
- No actual events are emitted
- Unsubscribe does nothing

## Console Output

All mock operations log to console with `[MOCK]` prefix:

```
[MOCK] Connecting to ws://127.0.0.1:9944
[MOCK] Connected
[MOCK] Deposit: 1000000000000
[MOCK] Private transfer
[MOCK] Withdraw: 500000000000
```

## Development Tips

1. **UI Development**: Use mock mode to build and test UI without blockchain
2. **State Testing**: Mock state persists during app session but resets on reload
3. **Transaction Flow**: All transactions succeed - add error simulation if needed
4. **Performance**: Mock is much faster than real blockchain (no network delay)
5. **Debugging**: Check console for `[MOCK]` logs to verify mock is active

## When to Use Mock vs Real

| Use Mock When | Use Real When |
|--------------|--------------|
| Building UI components | Testing actual blockchain integration |
| Testing user flows | Verifying ZK proofs |
| Offline development | End-to-end testing |
| Quick iterations | Production deployment |
| Demo without infrastructure | Connecting to testnet/mainnet |

## Example: Testing with Mock

```typescript
import { connect, deposit, createKeyringPair } from '@/api/chain';

// This will use the mock implementation
await connect({ endpoint: 'ws://127.0.0.1:9944' });

const signer = createKeyringPair('//Alice');
const result = await deposit({
  amount: '1000000000000',
  commitment: '0x123...',
  proof: { proof: new Uint8Array(), publicInputs: new Uint8Array() },
}, signer);

console.log('Transaction hash:', result.txHash); // Random mock hash
console.log('Success:', result.success); // Always true
```

## Questions?

- Mock not working? Check for `[MOCK]` logs in console
- Need to add mock functionality? Edit `chain.ts` (current mock file)
- Ready for real blockchain? Follow "Switching to Real Blockchain" above
