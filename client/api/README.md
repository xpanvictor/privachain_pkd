# Chain API Documentation

This API layer provides a functional interface for interacting with the ZK Privacy Parachain from your React Native application.

## Features

- ✅ **Singleton Connection Management** - Efficient WebSocket connection handling
- ✅ **Transaction Builders** - Easy-to-use transaction creation and submission
- ✅ **State Queries** - Query chain state, balances, and Merkle tree data
- ✅ **Event Subscriptions** - Real-time notifications for deposits, transfers, and withdrawals
- ✅ **Functional Programming Style** - Pure functions with predictable behavior
- ✅ **TypeScript** - Full type safety and IntelliSense support

## Table of Contents

1. [Setup](#setup)
2. [Connection Management](#connection-management)
3. [Transaction Builders](#transaction-builders)
4. [State Queries](#state-queries)
5. [Event Subscriptions](#event-subscriptions)
6. [Examples](#examples)

---

## Setup

### Installation

The required dependencies are already included in your `package.json`:

```json
{
  "@polkadot/api": "^16.5.2",
  "@polkadot/keyring": "^13.5.8",
  "@polkadot/util": "^13.5.8",
  "@polkadot/util-crypto": "^13.5.8"
}
```

### Import

```typescript
import {
  connect,
  disconnect,
  deposit,
  privateTransfer,
  withdraw,
  getMerkleRoot,
  subscribeToDeposits,
  // ... other functions
} from '@/api/chain';
```

---

## Connection Management

### Connect to Parachain

```typescript
import { connect, DEFAULT_CONFIG } from '@/api/chain';

// Connect to default endpoint (ws://127.0.0.1:9944)
const api = await connect(DEFAULT_CONFIG);

// Or connect to custom endpoint
const api = await connect({
  endpoint: 'wss://your-parachain-node.com',
  ss58Format: 42,
});
```

The `connect()` function uses a **singleton pattern** - multiple calls return the same connection.

### Disconnect

```typescript
import { disconnect } from '@/api/chain';

await disconnect();
```

### Check Connection Status

```typescript
import { isConnected } from '@/api/chain';

if (isConnected()) {
  console.log('Connected to parachain');
}
```

---

## Transaction Builders

All transaction functions return a `Promise<TransactionResult>`:

```typescript
interface TransactionResult {
  blockHash: string;    // Hash of block containing transaction
  txHash: string;       // Transaction hash
  success: boolean;     // Whether transaction succeeded
  events: any[];        // Chain events emitted
  error?: string;       // Error message if failed
}
```

### 1. Deposit (Public → Private)

Shield public funds into private balance.

```typescript
import { deposit, createKeyringPair } from '@/api/chain';
import { generateSecret } from '@/utils/key';
import { createZKProver } from '@/utils/prover';

// Setup
const signer = createKeyringPair('your mnemonic here');
const prover = createZKProver();
await prover.initialize();

// Generate commitment parameters
const amount = '1000000000000'; // 1 token (with decimals)
const secret = generateSecret();
const recipientPublicKey = '0x...'; // Recipient's public spending key

// Generate proof
const proof = await prover.generateDepositProof(
  amount,
  secret,
  recipientPublicKey
);

// Compute commitment (you'll need to implement this or import from prover)
const commitment = prover._computeCommitment(amount, secret, recipientPublicKey);

// Submit deposit
const result = await deposit(
  {
    amount,
    commitment,
    proof,
    encryptedNote: '...', // Optional encrypted note
  },
  signer
);

if (result.success) {
  console.log(`Deposited in block: ${result.blockHash}`);
}
```

### 2. Private Transfer (Private → Private)

Transfer funds privately between shielded addresses.

```typescript
import { privateTransfer } from '@/api/chain';
import { encryptNote } from '@/utils/encryption';

// Prepare inputs (commitments you're spending)
const inputs: CommitmentInput[] = [
  {
    commitment: '0x...',
    secret: '0x...',
    amount: '1000000000000',
    merkleProof: ['0x...', '0x...'],
    leafIndex: 5,
  },
];

// Prepare outputs (new commitments)
const outputs: CommitmentOutput[] = [
  {
    amount: '800000000000',
    secret: generateSecret(),
    recipient: recipientPublicKey1,
  },
  {
    amount: '200000000000', // Change
    secret: generateSecret(),
    recipient: yourPublicKey,
  },
];

// Generate ZK proof
const proof = await prover.generateTransferProof({
  inputs,
  outputs,
  merkleRoot: await getMerkleRoot(),
});

// Encrypt notes for recipients
const encryptedNotes = outputs.map((output, i) => {
  const note = {
    value: output.amount,
    secret: output.secret,
    sender: yourAddress,
    commitment: computeCommitment(output.amount, output.secret, output.recipient),
  };
  return encryptNote(note, output.recipient);
});

// Compute nullifiers and commitments
const nullifiers = inputs.map(inp =>
  computeNullifier(inp.secret, inp.commitment)
);
const commitments = outputs.map(out =>
  computeCommitment(out.amount, out.secret, out.recipient)
);

// Submit transaction
const result = await privateTransfer(
  {
    nullifiers,
    commitments,
    proof,
    encryptedNotes,
  },
  signer
);
```

### 3. Withdraw (Private → Public)

Unshield private funds to public balance.

```typescript
import { withdraw } from '@/api/chain';

// Get your commitment to withdraw
const commitment = '0x...';
const secret = '0x...';
const amount = '1000000000000';
const recipientAddress = 'your-public-address';

// Get Merkle proof
const merkleProof = await getMerklePath(commitmentIndex);
const merkleRoot = await getMerkleRoot();

// Generate withdraw proof
const proof = await prover.generateWithdrawProof({
  commitment,
  secret,
  merkleProof,
  amount,
  recipient: recipientAddress,
});

// Compute nullifier
const nullifier = computeNullifier(secret, commitment);

// Submit withdrawal
const result = await withdraw(
  {
    nullifier,
    amount,
    recipient: recipientAddress,
    proof,
  },
  signer
);
```

---

## State Queries

### Get Merkle Root

```typescript
import { getMerkleRoot } from '@/api/chain';

const root = await getMerkleRoot();
console.log(`Current Merkle root: ${root}`);
```

### Get Commitment Count

```typescript
import { getCommitmentCount } from '@/api/chain';

const count = await getCommitmentCount();
console.log(`Total commitments: ${count}`);
```

### Check Nullifier Status

```typescript
import { isNullifierSpent } from '@/api/chain';

const spent = await isNullifierSpent('0x...');
if (spent) {
  console.log('This commitment has already been spent');
}
```

### Get Public Balance

```typescript
import { getBalance } from '@/api/chain';

const balance = await getBalance('your-address');
console.log(`Balance: ${balance}`);
```

### Get Chain State

Get comprehensive chain state in one call:

```typescript
import { getChainState } from '@/api/chain';

const state = await getChainState();
console.log(state);
// {
//   merkleRoot: '0x...',
//   commitmentCount: 42,
//   blockNumber: 12345,
//   timestamp: 1699999999999
// }
```

### Get Commitment by Index

```typescript
import { getCommitment } from '@/api/chain';

const commitment = await getCommitment(5);
if (commitment) {
  console.log(`Commitment at index 5: ${commitment}`);
}
```

### Batch Get Commitments

```typescript
import { getCommitmentsBatch } from '@/api/chain';

const commitments = await getCommitmentsBatch([0, 1, 2, 3, 4]);
console.log(commitments); // [string | null, ...]
```

---

## Event Subscriptions

All subscription functions return an `EventSubscription` object:

```typescript
interface EventSubscription {
  unsubscribe: () => void;
}
```

### Subscribe to Deposits

```typescript
import { subscribeToDeposits } from '@/api/chain';

const subscription = subscribeToDeposits((data) => {
  console.log('New deposit:', data);
  // {
  //   commitment: '0x...',
  //   amount: '1000000000000',
  //   sender: 'address',
  //   blockNumber: 123
  // }
});

// Later: unsubscribe
subscription.unsubscribe();
```

### Subscribe to Private Transfers

```typescript
import { subscribeToPrivateTransfers } from '@/api/chain';

const subscription = subscribeToPrivateTransfers((data) => {
  console.log('New private transfer:', data);
  // {
  //   nullifiers: ['0x...', '0x...'],
  //   commitments: ['0x...', '0x...'],
  //   blockNumber: 124
  // }
  
  // Try to decrypt notes to see if they're for you
  tryDecryptNotes(data.commitments);
});
```

### Subscribe to Withdrawals

```typescript
import { subscribeToWithdraws } from '@/api/chain';

const subscription = subscribeToWithdraws((data) => {
  console.log('New withdrawal:', data);
  // {
  //   nullifier: '0x...',
  //   amount: '1000000000000',
  //   recipient: 'address',
  //   blockNumber: 125
  // }
});
```

### Subscribe to All Events

```typescript
import { subscribeToAllEvents } from '@/api/chain';

const subscription = subscribeToAllEvents({
  onDeposit: (data) => console.log('Deposit:', data),
  onPrivateTransfer: (data) => console.log('Transfer:', data),
  onWithdraw: (data) => console.log('Withdraw:', data),
});

// Unsubscribe from all
subscription.unsubscribe();
```

---

## Examples

### Complete Deposit Flow

```typescript
import { connect, deposit, createKeyringPair } from '@/api/chain';
import { generateSecret } from '@/utils/key';
import { createZKProver } from '@/utils/prover';

async function depositFlow() {
  try {
    // 1. Connect to parachain
    await connect({ endpoint: 'ws://127.0.0.1:9944' });
    
    // 2. Setup
    const signer = createKeyringPair('your seed phrase here');
    const prover = createZKProver();
    await prover.initialize();
    
    // 3. Generate parameters
    const amount = '1000000000000';
    const secret = generateSecret();
    const recipient = '0xYourPublicSpendingKey';
    
    // 4. Generate proof and commitment
    const proof = await prover.generateDepositProof(amount, secret, recipient);
    const commitment = prover._computeCommitment(amount, secret, recipient);
    
    // 5. Submit transaction
    const result = await deposit(
      { amount, commitment, proof },
      signer
    );
    
    // 6. Handle result
    if (result.success) {
      console.log('✅ Deposit successful!');
      console.log('Block:', result.blockHash);
      console.log('Tx:', result.txHash);
      
      // Save commitment data for later spending
      await saveCommitment({
        commitment,
        amount,
        secret,
        blockNumber: result.blockNumber,
      });
    } else {
      console.error('❌ Deposit failed:', result.error);
    }
  } catch (error) {
    console.error('Error in deposit flow:', error);
  }
}
```

### Scan Chain for Your Transactions

```typescript
import { subscribeToPrivateTransfers } from '@/api/chain';
import { decryptNote } from '@/utils/encryption';
import { getWalletKeys } from '@/utils/key';

async function startScanning() {
  const keys = await getWalletKeys();
  if (!keys) return;
  
  const subscription = subscribeToPrivateTransfers(async (data) => {
    // Try to decrypt each encrypted note
    for (const encryptedNote of data.encryptedNotes) {
      // Try with viewing key
      const decrypted = decryptNote(encryptedNote, keys.viewingKey);
      
      if (decrypted) {
        console.log('💰 Received private transfer!');
        console.log('Amount:', decrypted.value);
        console.log('Commitment:', decrypted.commitment);
        
        // Save to local database
        await saveReceivedNote({
          commitment: decrypted.commitment,
          amount: decrypted.value,
          secret: decrypted.secret,
          sender: decrypted.sender,
          blockNumber: data.blockNumber,
        });
      }
    }
  });
  
  return subscription;
}
```

### Health Check

```typescript
import { connect, healthCheck, getChainInfo } from '@/api/chain';

async function checkConnection() {
  try {
    await connect({ endpoint: 'ws://127.0.0.1:9944' });
    
    const health = await healthCheck();
    const info = await getChainInfo();
    
    console.log('Chain:', info.chain);
    console.log('Node:', info.nodeName, info.nodeVersion);
    console.log('Block:', health.blockNumber);
    console.log('Peers:', health.peers);
    console.log('Status:', health.connected ? '✅ Connected' : '❌ Disconnected');
  } catch (error) {
    console.error('Connection check failed:', error);
  }
}
```

---

## Utility Functions

### Estimate Transaction Fee

```typescript
import { getApi, estimateFee } from '@/api/chain';

const api = getApi();
const tx = api.tx.zkPrivacy.deposit(...);
const fee = await estimateFee(tx, senderAddress);
console.log(`Estimated fee: ${fee}`);
```

### Wait for Confirmations

```typescript
import { waitForConfirmations } from '@/api/chain';

const result = await deposit(...);
if (result.success) {
  // Wait for 3 confirmations
  await waitForConfirmations(result.blockHash, 3);
  console.log('Transaction confirmed with 3 blocks');
}
```

---

## Error Handling

All functions may throw errors. Always wrap in try-catch:

```typescript
try {
  const result = await deposit(params, signer);
  
  if (!result.success) {
    // Transaction failed on-chain
    console.error('Transaction failed:', result.error);
  }
} catch (error) {
  // Connection error, invalid parameters, etc.
  console.error('Error:', error);
}
```

---

## Best Practices

1. **Connection Management**
   - Call `connect()` once at app startup
   - Reuse the singleton connection
   - Call `disconnect()` when app closes

2. **Event Subscriptions**
   - Always unsubscribe when component unmounts
   - Use React hooks to manage subscriptions
   - Handle errors in callbacks

3. **Transaction Submission**
   - Always check `result.success` before proceeding
   - Save transaction hashes for tracking
   - Implement retry logic for network errors

4. **State Queries**
   - Cache frequently-accessed data
   - Use batch queries when possible
   - Implement polling for real-time updates

5. **Security**
   - Never expose private keys or seeds
   - Use secure storage for wallet data
   - Validate all user inputs

---

## React Native Integration

### Example Hook

```typescript
import { useEffect, useState } from 'react';
import { connect, disconnect, healthCheck } from '@/api/chain';

export function useChainConnection() {
  const [connected, setConnected] = useState(false);
  const [blockNumber, setBlockNumber] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await connect({ endpoint: 'ws://127.0.0.1:9944' });
        
        if (mounted) {
          setConnected(true);
          
          // Poll health
          const interval = setInterval(async () => {
            const health = await healthCheck();
            if (mounted) {
              setConnected(health.connected);
              setBlockNumber(health.blockNumber);
            }
          }, 5000);

          return () => clearInterval(interval);
        }
      } catch (error) {
        console.error('Connection failed:', error);
        if (mounted) setConnected(false);
      }
    }

    init();

    return () => {
      mounted = false;
      disconnect();
    };
  }, []);

  return { connected, blockNumber };
}
```

---

## Troubleshooting

### Connection Issues

```typescript
// Check if endpoint is reachable
const health = await healthCheck();
if (!health.connected) {
  console.error('Cannot connect to parachain');
}
```

### Transaction Failures

```typescript
const result = await deposit(params, signer);
if (!result.success) {
  console.error('Transaction error:', result.error);
  // Check result.events for more details
  console.log('Events:', result.events);
}
```

### Type Errors

All functions are fully typed. Use TypeScript's IntelliSense for parameter hints.

---

## Next Steps

- Implement transaction history tracking
- Build UI components for deposits, transfers, withdrawals
- Add local database for commitment storage
- Implement note scanning and decryption
- Create backup/restore functionality

---

## Support

For issues or questions, refer to:
- [Polkadot.js API Documentation](https://polkadot.js.org/docs/)
- [Substrate Documentation](https://docs.substrate.io/)
- Your parachain's runtime documentation
