/**
 * ZK Integration Test Screen
 * Tests the zero-knowledge proof system
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { initializeZK, debugZKCircuit, getWalletStats } from '@/utils/blockchain';
import { 
  createNote, 
  getNoteStats, 
  debugPrintNotes,
  clearAllNotes,
  addReceivedNotes,
  getTotalBalance,
} from '@/utils/zk/notes';
import { 
  debugCircuit, 
  getCircuitInfo,
  hash,
  randomField,
  computeCommitment,
  computeNullifier,
} from '@/utils/zk/prover';
import { 
  prepareCircuitInput, 
  validateCircuitInput, 
  createMockMerkleProof 
} from '@/utils/zk/circuit-adapter';
import type { ApplicationNote } from '@/utils/zk/circuit-adapter';

export default function ZKTestScreen() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Test 1: Initialize ZK System
  const testInitialize = async () => {
    setLoading(true);
    addLog('🚀 Test 1: Initialize ZK System');
    try {
      await initializeZK();
      setInitialized(true);
      addLog('✅ ZK system initialized successfully');
      
      // Get circuit info
      const info = getCircuitInfo();
      addLog(`📊 Circuit Info:`);
      addLog(`   - Initialized: ${info.initialized}`);
      addLog(`   - Has proving key: ${info.hasProvingKey}`);
      addLog(`   - Has verification key: ${info.hasVerificationKey}`);
      addLog(`   - Poseidon ready: ${info.poseidonReady}`);
      
      // Get wallet stats
      const stats = getNoteStats();
      addLog(`💰 Wallet Stats:`);
      addLog(`   - Total notes: ${stats.total}`);
      addLog(`   - Spendable: ${stats.spendable}`);
      addLog(`   - Balance: ${stats.totalBalance.toString()}`);
      
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 2: Hash Functions
  const testHashFunctions = () => {
    setLoading(true);
    addLog('🔐 Test 2: Hash Functions');
    try {
      // Test Poseidon hash
      const h1 = hash(123n, 456n, 789n);
      addLog(`✅ Poseidon hash: ${h1.slice(0, 20)}...`);
      
      // Test random field
      const random = randomField();
      addLog(`✅ Random field: ${random.toString().slice(0, 20)}...`);
      
      // Test commitment
      const commitment = computeCommitment(1000n, 12345n, 67890n);
      addLog(`✅ Commitment: ${commitment.slice(0, 20)}...`);
      
      // Test nullifier
      const nullifier = computeNullifier(commitment, 12345n);
      addLog(`✅ Nullifier: ${nullifier.slice(0, 20)}...`);
      
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 3: Note Management
  const testNoteManagement = () => {
    setLoading(true);
    addLog('📝 Test 3: Note Management');
    try {
      // Create test notes
      const myPubkey = 123456789n;
      
      const note1 = createNote(1000000000n, myPubkey);
      note1.leafIndex = 0; // Mock leaf index
      
      const note2 = createNote(2000000000n, myPubkey);
      note2.leafIndex = 1;
      
      const note3 = createNote(500000000n, myPubkey);
      note3.leafIndex = 2;
      
      addLog(`✅ Created 3 test notes`);
      
      // Add to storage
      addReceivedNotes([note1, note2, note3]);
      addLog(`✅ Saved notes to storage`);
      
      // Get balance
      const balance = getTotalBalance();
      addLog(`💰 Total balance: ${balance.toString()}`);
      
      // Get stats
      const stats = getNoteStats();
      addLog(`📊 Stats:`);
      addLog(`   - Total: ${stats.total}`);
      addLog(`   - Spendable: ${stats.spendable}`);
      addLog(`   - Balance: ${stats.totalBalance.toString()}`);
      
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 4: Circuit Input Preparation
  const testCircuitInput = () => {
    setLoading(true);
    addLog('🔧 Test 4: Circuit Input Preparation');
    try {
      // Create input and output notes
      const myPubkey = 123456789n;
      const recipientPubkey = 987654321n;
      
      const input1 = createNote(1000n, myPubkey);
      input1.leafIndex = 0;
      
      const output1 = createNote(600n, recipientPubkey);
      const output2 = createNote(400n, myPubkey); // Change
      
      addLog(`✅ Created test notes`);
      addLog(`   Input: ${input1.amount}`);
      addLog(`   Output 1: ${output1.amount}`);
      addLog(`   Output 2 (change): ${output2.amount}`);
      
      // Create mock Merkle proof
      const mockProof = createMockMerkleProof();
      
      // Prepare circuit input
      const { circuitInput, nullifiers, outCommitments } = prepareCircuitInput(
        [input1],
        [output1, output2],
        [mockProof]
      );
      
      addLog(`✅ Circuit input prepared`);
      addLog(`   Nullifiers: ${nullifiers.length}`);
      addLog(`   Out commitments: ${outCommitments.length}`);
      
      // Validate
      const validation = validateCircuitInput(circuitInput);
      if (validation.valid) {
        addLog(`✅ Circuit input is VALID`);
      } else {
        addLog(`❌ Circuit input is INVALID:`);
        validation.errors.forEach(err => addLog(`   - ${err}`));
      }
      
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 5: Proof Generation (requires setup)
  const testProofGeneration = async () => {
    setLoading(true);
    addLog('🔐 Test 5: Proof Generation');
    addLog('⏳ This may take 5-15 seconds...');
    
    try {
      const { generateProof, verifyProof } = await import('@/utils/zk/prover');
      
      // Create test notes
      const myPubkey = 123456789n;
      const recipientPubkey = 987654321n;
      
      const input1 = createNote(1000n, myPubkey);
      input1.leafIndex = 0;
      
      const output1 = createNote(1000n, recipientPubkey);
      
      // Prepare circuit input
      const mockProof = createMockMerkleProof();
      const { circuitInput } = prepareCircuitInput(
        [input1],
        [output1],
        [mockProof]
      );
      
      addLog(`📝 Generating proof...`);
      
      // Generate proof
      const startTime = Date.now();
      const { proof, publicSignals } = await generateProof(circuitInput);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      addLog(`✅ Proof generated in ${duration}s`);
      addLog(`   Public signals: ${publicSignals.length}`);
      
      // Verify proof
      addLog(`🔍 Verifying proof...`);
      const isValid = await verifyProof(proof, publicSignals);
      
      if (isValid) {
        addLog(`✅ Proof verification PASSED!`);
      } else {
        addLog(`❌ Proof verification FAILED`);
      }
      
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      
      if (error instanceof Error && error.message.includes('Proving key not loaded')) {
        addLog('');
        addLog('💡 Setup Required:');
        addLog('   1. cd parachain/pallets/zk_privacy/src/circom/');
        addLog('   2. Run trusted setup (see README.md)');
        addLog('   3. npm run copy-zk-assets');
      }
    } finally {
      setLoading(false);
    }
  };

  // Test 6: Clear Test Data
  const testClearData = () => {
    setLoading(true);
    addLog('🗑️  Test 6: Clear Test Data');
    try {
      clearAllNotes();
      addLog('✅ All notes cleared');
      
      const stats = getNoteStats();
      addLog(`📊 Stats after clear:`);
      addLog(`   - Total notes: ${stats.total}`);
      addLog(`   - Balance: ${stats.totalBalance.toString()}`);
      
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    clearLogs();
    addLog('╔══════════════════════════════════════╗');
    addLog('║   Running All ZK Tests              ║');
    addLog('╚══════════════════════════════════════╝');
    addLog('');
    
    await testInitialize();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testHashFunctions();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testNoteManagement();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testCircuitInput();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Only run proof generation if initialized
    if (initialized) {
      await testProofGeneration();
    } else {
      addLog('⚠️  Skipping proof generation (not initialized)');
    }
    
    addLog('');
    addLog('╔══════════════════════════════════════╗');
    addLog('║   All Tests Complete!                ║');
    addLog('╚══════════════════════════════════════╝');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ZK Integration Test</Text>
      
      <ScrollView style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={runAllTests}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🚀 Run All Tests</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testInitialize}
          disabled={loading}
        >
          <Text style={styles.buttonText}>1. Initialize ZK</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testHashFunctions}
          disabled={loading || !initialized}
        >
          <Text style={styles.buttonText}>2. Test Hash Functions</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testNoteManagement}
          disabled={loading}
        >
          <Text style={styles.buttonText}>3. Test Note Management</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testCircuitInput}
          disabled={loading}
        >
          <Text style={styles.buttonText}>4. Test Circuit Input</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testProofGeneration}
          disabled={loading || !initialized}
        >
          <Text style={styles.buttonText}>5. Generate Proof</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]} 
          onPress={testClearData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🗑️  Clear Test Data</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={clearLogs}
        >
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Test Logs:</Text>
        <ScrollView style={styles.logScroll}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Running test...</Text>
            </View>
          )}
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
          {logs.length === 0 && !loading && (
            <Text style={styles.emptyText}>No logs yet. Run a test!</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#34C759',
    padding: 16,
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: '#8E8E93',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
  },
  logTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logScroll: {
    flex: 1,
  },
  logText: {
    color: '#d4d4d4',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingText: {
    color: '#007AFF',
    marginLeft: 8,
    fontSize: 14,
  },
});
