/**
 * ZK Integration Example
 * Demonstrates how to use the ZK proof system
 */

import { initializeZK, executePrivateTransfer, depositToPrivatePool, getWalletStats } from '@/utils/blockchain';
import { createNote, getNoteStats, debugPrintNotes } from '@/utils/zk/notes';
import { debugCircuit } from '@/utils/zk/prover';

/**
 * Example: Initialize ZK system
 */
export async function exampleInitialize() {
  console.log('=== Initialize ZK System ===\n');
  
  try {
    await initializeZK();
    console.log('✅ ZK system ready!\n');
    
    // Debug circuit status
    debugCircuit();
    
    // Check wallet stats
    const stats = getNoteStats();
    console.log('\n💰 Wallet Statistics:');
    console.log(`   Total notes: ${stats.total}`);
    console.log(`   Spendable: ${stats.spendable}`);
    console.log(`   Spent: ${stats.spent}`);
    console.log(`   Pending: ${stats.pending}`);
    console.log(`   Balance: ${stats.totalBalance}\n`);
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
  }
}

/**
 * Example: Deposit to private pool
 */
export async function exampleDeposit(api: any, signer: any, myPubkey: bigint) {
  console.log('=== Deposit to Private Pool ===\n');
  
  try {
    const amount = 5000000000000n; // 5 tokens
    
    console.log(`Depositing ${amount} to private pool...`);
    
    const txHash = await depositToPrivatePool({
      api,
      signer,
      amount,
      recipientPubkey: myPubkey,
    });
    
    console.log(`✅ Deposit successful! TX: ${txHash}\n`);
    
    // Show updated stats
    const stats = getNoteStats();
    console.log(`New balance: ${stats.totalBalance}\n`);
    
  } catch (error) {
    console.error('❌ Deposit failed:', error);
  }
}

/**
 * Example: Private transfer
 */
export async function examplePrivateTransfer(
  api: any,
  signer: any,
  recipientPubkey: bigint,
  myPubkey: bigint
) {
  console.log('=== Private Transfer ===\n');
  
  try {
    const amount = 1000000000000n; // 1 token
    
    console.log(`Sending ${amount} to ${recipientPubkey.toString().slice(0, 10)}...`);
    
    const txHash = await executePrivateTransfer({
      api,
      signer,
      recipientPubkey,
      amount,
      myPubkey,
    });
    
    console.log(`✅ Transfer successful! TX: ${txHash}\n`);
    
    // Show updated stats
    const stats = getNoteStats();
    console.log(`Remaining balance: ${stats.totalBalance}\n`);
    
  } catch (error) {
    console.error('❌ Transfer failed:', error);
  }
}

/**
 * Example: Create and inspect notes
 */
export function exampleNoteManagement() {
  console.log('=== Note Management ===\n');
  
  // Create a note
  const myPubkey = 123456789n;
  const amount = 1000000000n;
  
  const note = createNote(amount, myPubkey);
  
  console.log('Created note:');
  console.log(`   Commitment: ${note.commitment.slice(0, 20)}...`);
  console.log(`   Amount: ${note.amount}`);
  console.log(`   Secret: ${note.secret.toString().slice(0, 20)}...`);
  console.log(`   Recipient: ${note.recipient}`);
  console.log(`   Spent: ${note.spent}\n`);
  
  // Debug print all notes
  console.log('All notes:');
  debugPrintNotes();
}

/**
 * Example: Test proof generation with mock data
 */
export async function exampleProofGeneration() {
  console.log('=== Proof Generation Test ===\n');
  
  try {
    const { prepareCircuitInput, validateCircuitInput, createMockMerkleProof } = await import('@/utils/zk/circuit-adapter');
    const { generateProof, verifyProof } = await import('@/utils/zk/prover');
    
    // Create test notes
    const input = createNote(1000n, 123456789n);
    input.leafIndex = 0; // Mock leaf index
    
    const output = createNote(1000n, 987654321n);
    
    console.log('Preparing circuit input...');
    
    // Prepare circuit input
    const { circuitInput, nullifiers, outCommitments } = prepareCircuitInput(
      [input],
      [output],
      [createMockMerkleProof()]
    );
    
    console.log(`   Nullifiers: ${nullifiers.length}`);
    console.log(`   Output commitments: ${outCommitments.length}`);
    
    // Validate
    console.log('\nValidating circuit input...');
    const validation = validateCircuitInput(circuitInput);
    
    if (!validation.valid) {
      console.error('❌ Validation failed:', validation.errors);
      return;
    }
    
    console.log('   ✅ Circuit input valid');
    
    // Generate proof (requires trusted setup)
    console.log('\n🔐 Generating proof...');
    console.log('   (This may take 5-15 seconds)\n');
    
    const { proof, publicSignals } = await generateProof(circuitInput);
    
    console.log('✅ Proof generated!');
    console.log(`   Public signals: ${publicSignals.length}`);
    
    // Verify locally
    console.log('\n🔍 Verifying proof...');
    const isValid = await verifyProof(proof, publicSignals);
    
    if (isValid) {
      console.log('✅ Proof verification successful!\n');
    } else {
      console.log('❌ Proof verification failed\n');
    }
    
  } catch (error) {
    console.error('❌ Proof generation test failed:', error);
    
    if (error instanceof Error && error.message.includes('Proving key not loaded')) {
      console.log('\n💡 Tip: Run trusted setup first:');
      console.log('   cd parachain/pallets/zk_privacy/src/circom/');
      console.log('   npm run setup');
      console.log('   cd -');
      console.log('   npm run copy-zk-assets\n');
    }
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   ZK Integration Examples            ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  // Example 1: Initialize
  await exampleInitialize();
  
  // Example 2: Note management
  exampleNoteManagement();
  
  // Example 3: Proof generation test
  await exampleProofGeneration();
  
  console.log('╔══════════════════════════════════════╗');
  console.log('║   Examples Complete!                 ║');
  console.log('╚══════════════════════════════════════╝\n');
}

// Usage in your app:
// import { runAllExamples } from '@/utils/zk/examples';
// await runAllExamples();
