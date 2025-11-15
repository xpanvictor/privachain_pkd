/**
 * API Testing Utilities
 * 
 * Helper functions for testing the Chain API in development
 */

import {
  connect,
  disconnect,
  deposit,
  privateTransfer,
  withdraw,
  getMerkleRoot,
  getCommitmentCount,
  getChainState,
  healthCheck,
  createKeyringPair,
  type ChainConfig,
} from './chain';
import { generateSecret } from '@/utils/key';
import { createZKProver } from '@/utils/prover';

// ========== Test Configuration ==========

export const TEST_CONFIG: ChainConfig = {
  endpoint: 'ws://127.0.0.1:9944',
  ss58Format: 42,
};

export const TEST_ACCOUNTS = {
  alice: '//Alice',
  bob: '//Bob',
  charlie: '//Charlie',
};

// ========== Connection Tests ==========

/**
 * Test basic connection to parachain
 */
export async function testConnection(): Promise<boolean> {
  try {
    console.log('🔗 Testing connection...');
    await connect(TEST_CONFIG);
    
    const health = await healthCheck();
    console.log('✅ Connected to parachain');
    console.log(`   Block: ${health.blockNumber}`);
    console.log(`   Peers: ${health.peers}`);
    
    return health.connected;
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return false;
  }
}

/**
 * Test connection reconnection
 */
export async function testReconnection(): Promise<boolean> {
  try {
    console.log('🔄 Testing reconnection...');
    
    await connect(TEST_CONFIG);
    await disconnect();
    await connect(TEST_CONFIG);
    
    const health = await healthCheck();
    console.log('✅ Reconnection successful');
    
    return health.connected;
  } catch (error) {
    console.error('❌ Reconnection failed:', error);
    return false;
  }
}

// ========== State Query Tests ==========

/**
 * Test chain state queries
 */
export async function testStateQueries(): Promise<boolean> {
  try {
    console.log('📊 Testing state queries...');
    
    await connect(TEST_CONFIG);
    
    const [merkleRoot, commitmentCount, chainState] = await Promise.all([
      getMerkleRoot(),
      getCommitmentCount(),
      getChainState(),
    ]);
    
    console.log('✅ State queries successful');
    console.log(`   Merkle Root: ${merkleRoot.slice(0, 10)}...`);
    console.log(`   Commitments: ${commitmentCount}`);
    console.log(`   Block: ${chainState.blockNumber}`);
    
    return true;
  } catch (error) {
    console.error('❌ State queries failed:', error);
    return false;
  }
}

// ========== Transaction Tests ==========

/**
 * Test deposit transaction (mock)
 */
export async function testDeposit(): Promise<boolean> {
  try {
    console.log('💰 Testing deposit...');
    
    await connect(TEST_CONFIG);
    
    // Setup
    const signer = createKeyringPair(TEST_ACCOUNTS.alice);
    const prover = createZKProver();
    await prover.initialize();
    
    // Generate parameters
    const amount = '1000000000000'; // 1 token
    const secret = generateSecret();
    const recipient = signer.address;
    
    // Generate proof (mock)
    const proof = await prover.generateDepositProof(amount, secret, recipient);
    const commitment = prover._computeCommitment(amount, secret, recipient);
    
    console.log('   Generated proof and commitment');
    console.log(`   Commitment: ${commitment.slice(0, 10)}...`);
    
    // Note: Actual transaction submission would happen here
    // const result = await deposit({ amount, commitment, proof }, signer);
    
    console.log('✅ Deposit test completed (simulation)');
    console.log('   ⚠️  Actual submission skipped in test mode');
    
    return true;
  } catch (error) {
    console.error('❌ Deposit test failed:', error);
    return false;
  }
}

/**
 * Test private transfer (mock)
 */
export async function testPrivateTransfer(): Promise<boolean> {
  try {
    console.log('🔒 Testing private transfer...');
    
    await connect(TEST_CONFIG);
    
    const signer = createKeyringPair(TEST_ACCOUNTS.alice);
    const prover = createZKProver();
    await prover.initialize();
    
    // Mock input commitment
    const inputAmount = '1000000000000';
    const inputSecret = generateSecret();
    const inputCommitment = prover._computeCommitment(
      inputAmount,
      inputSecret,
      signer.address
    );
    
    // Mock outputs
    const output1Amount = '700000000000';
    const output1Secret = generateSecret();
    const output2Amount = '300000000000';
    const output2Secret = generateSecret();
    
    const output1Commitment = prover._computeCommitment(
      output1Amount,
      output1Secret,
      'recipient1'
    );
    const output2Commitment = prover._computeCommitment(
      output2Amount,
      output2Secret,
      signer.address
    );
    
    // Generate nullifier
    const nullifier = prover._computeNullifier(inputSecret, inputCommitment);
    
    console.log('   Generated transfer parameters');
    console.log(`   Input: ${inputCommitment.slice(0, 10)}...`);
    console.log(`   Outputs: 2`);
    console.log(`   Nullifier: ${nullifier.slice(0, 10)}...`);
    
    console.log('✅ Private transfer test completed (simulation)');
    console.log('   ⚠️  Actual submission skipped in test mode');
    
    return true;
  } catch (error) {
    console.error('❌ Private transfer test failed:', error);
    return false;
  }
}

/**
 * Test withdrawal (mock)
 */
export async function testWithdraw(): Promise<boolean> {
  try {
    console.log('🏦 Testing withdrawal...');
    
    await connect(TEST_CONFIG);
    
    const signer = createKeyringPair(TEST_ACCOUNTS.alice);
    const prover = createZKProver();
    await prover.initialize();
    
    // Mock commitment to withdraw
    const amount = '500000000000';
    const secret = generateSecret();
    const commitment = prover._computeCommitment(amount, secret, signer.address);
    const nullifier = prover._computeNullifier(secret, commitment);
    
    console.log('   Generated withdrawal parameters');
    console.log(`   Amount: ${amount}`);
    console.log(`   Nullifier: ${nullifier.slice(0, 10)}...`);
    
    console.log('✅ Withdrawal test completed (simulation)');
    console.log('   ⚠️  Actual submission skipped in test mode');
    
    return true;
  } catch (error) {
    console.error('❌ Withdrawal test failed:', error);
    return false;
  }
}

// ========== Event Subscription Tests ==========

/**
 * Test event subscriptions
 */
export async function testEventSubscriptions(): Promise<boolean> {
  try {
    console.log('📡 Testing event subscriptions...');
    
    await connect(TEST_CONFIG);
    
    const { subscribeToDeposits, subscribeToPrivateTransfers, subscribeToWithdraws } =
      await import('./chain');
    
    let depositCount = 0;
    let transferCount = 0;
    let withdrawCount = 0;
    
    const depositSub = subscribeToDeposits(() => {
      depositCount++;
    });
    
    const transferSub = subscribeToPrivateTransfers(() => {
      transferCount++;
    });
    
    const withdrawSub = subscribeToWithdraws(() => {
      withdrawCount++;
    });
    
    // Wait a bit to receive any events
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    console.log('✅ Event subscriptions successful');
    console.log(`   Deposits received: ${depositCount}`);
    console.log(`   Transfers received: ${transferCount}`);
    console.log(`   Withdrawals received: ${withdrawCount}`);
    
    // Cleanup
    depositSub.unsubscribe();
    transferSub.unsubscribe();
    withdrawSub.unsubscribe();
    
    return true;
  } catch (error) {
    console.error('❌ Event subscription test failed:', error);
    return false;
  }
}

// ========== Proof Generation Tests ==========

/**
 * Test proof generation
 */
export async function testProofGeneration(): Promise<boolean> {
  try {
    console.log('🔐 Testing proof generation...');
    
    const prover = createZKProver();
    await prover.initialize();
    
    // Test commitment computation
    const amount = '1000000000000';
    const secret = generateSecret();
    const recipient = '0x1234567890abcdef';
    
    const commitment = prover._computeCommitment(amount, secret, recipient);
    console.log(`   Commitment: ${commitment.slice(0, 10)}...`);
    
    // Test nullifier computation
    const nullifier = prover._computeNullifier(secret, commitment);
    console.log(`   Nullifier: ${nullifier.slice(0, 10)}...`);
    
    // Test deposit proof
    const depositProof = await prover.generateDepositProof(amount, secret, recipient);
    console.log(`   Deposit proof generated: ${depositProof.proof.length} bytes`);
    
    console.log('✅ Proof generation successful');
    
    return true;
  } catch (error) {
    console.error('❌ Proof generation failed:', error);
    return false;
  }
}

// ========== Full Test Suite ==========

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
  console.log('🧪 Running API Test Suite\n');
  console.log('═══════════════════════════════════════\n');
  
  const tests = [
    { name: 'Connection', fn: testConnection },
    { name: 'Reconnection', fn: testReconnection },
    { name: 'State Queries', fn: testStateQueries },
    { name: 'Proof Generation', fn: testProofGeneration },
    { name: 'Deposit', fn: testDeposit },
    { name: 'Private Transfer', fn: testPrivateTransfer },
    { name: 'Withdrawal', fn: testWithdraw },
    { name: 'Event Subscriptions', fn: testEventSubscriptions },
  ];
  
  const results: { name: string; passed: boolean }[] = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
      console.log('');
    } catch (error) {
      results.push({ name: test.name, passed: false });
      console.error(`Test "${test.name}" threw error:`, error);
      console.log('');
    }
  }
  
  // Summary
  console.log('═══════════════════════════════════════\n');
  console.log('📋 Test Summary:\n');
  
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  
  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });
  
  console.log('');
  console.log(`Total: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`⚠️  ${total - passed} test(s) failed`);
  }
  
  // Cleanup
  await disconnect();
}

// ========== Individual Test Runners ==========

/**
 * Quick connection test
 */
export async function quickTest(): Promise<void> {
  console.log('⚡ Quick Test\n');
  
  const connected = await testConnection();
  
  if (connected) {
    await testStateQueries();
  }
  
  await disconnect();
  console.log('\n✅ Quick test completed');
}

/**
 * Transaction flow test
 */
export async function testTransactionFlow(): Promise<void> {
  console.log('💸 Testing Transaction Flow\n');
  
  await testConnection();
  await testProofGeneration();
  await testDeposit();
  await testPrivateTransfer();
  await testWithdraw();
  
  await disconnect();
  console.log('\n✅ Transaction flow test completed');
}

// ========== Export Test Utilities ==========

export default {
  runAllTests,
  quickTest,
  testTransactionFlow,
  testConnection,
  testReconnection,
  testStateQueries,
  testProofGeneration,
  testDeposit,
  testPrivateTransfer,
  testWithdraw,
  testEventSubscriptions,
};
