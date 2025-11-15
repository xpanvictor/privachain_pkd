/**
 * Example: Complete Integration Demo
 * 
 * This file demonstrates how to use the Chain API, Indexer, and React Hooks
 * in a React Native component for a full-featured private wallet interface.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import {
  useBlockchain,
  useDeposit,
  usePrivateTransfer,
  useWithdraw,
} from '@/api/hooks';
import { initIndexer, DEFAULT_INDEXER_CONFIG } from '@/api/indexer';
import { DEFAULT_CONFIG } from '@/api/chain';
import { generateSecret } from '@/utils/key';
import { createZKProver } from '@/utils/prover';
import { encryptNote } from '@/utils/encryption';

// ========== Main Wallet Component ==========

export default function WalletExampleScreen() {
  // Initialize blockchain connection
  const blockchain = useBlockchain(DEFAULT_CONFIG);

  // Initialize indexer
  useEffect(() => {
    initIndexer(DEFAULT_INDEXER_CONFIG);
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>ZK Privacy Wallet</Text>

      {/* Connection Status */}
      <ConnectionStatus blockchain={blockchain} />

      {/* Chain State */}
      <ChainStateView blockchain={blockchain} />

      {/* Deposit Form */}
      <DepositForm />

      {/* Private Transfer Form */}
      <PrivateTransferForm />

      {/* Withdraw Form */}
      <WithdrawForm />

      {/* Recent Events */}
      <RecentEvents blockchain={blockchain} />
    </ScrollView>
  );
}

// ========== Connection Status Component ==========

function ConnectionStatus({ blockchain }: { blockchain: any }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Connection Status</Text>
      
      <View style={styles.statusRow}>
        <Text>Status: </Text>
        <Text style={blockchain.connected ? styles.connected : styles.disconnected}>
          {blockchain.connected ? '✅ Connected' : '❌ Disconnected'}
        </Text>
      </View>

      {blockchain.connecting && (
        <ActivityIndicator size="small" color="#0000ff" />
      )}

      <View style={styles.statusRow}>
        <Text>Block Number: </Text>
        <Text style={styles.highlight}>{blockchain.blockNumber}</Text>
      </View>

      {blockchain.error && (
        <Text style={styles.error}>Error: {blockchain.error.message}</Text>
      )}

      <Button title="Reconnect" onPress={blockchain.reconnect} />
    </View>
  );
}

// ========== Chain State Component ==========

function ChainStateView({ blockchain }: { blockchain: any }) {
  if (!blockchain.chainState) return null;

  const { merkleRoot, commitmentCount, blockNumber } = blockchain.chainState;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Chain State</Text>
      
      <View style={styles.stateRow}>
        <Text>Merkle Root:</Text>
        <Text style={styles.hash}>{merkleRoot.slice(0, 10)}...</Text>
      </View>

      <View style={styles.stateRow}>
        <Text>Commitments:</Text>
        <Text style={styles.highlight}>{commitmentCount}</Text>
      </View>

      <View style={styles.stateRow}>
        <Text>Block:</Text>
        <Text style={styles.highlight}>{blockNumber}</Text>
      </View>

      <Button title="Refresh" onPress={blockchain.refreshState} />
    </View>
  );
}

// ========== Deposit Form Component ==========

function DepositForm() {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [depositParams, setDepositParams] = useState<any>(null);
  
  const deposit = useDeposit(depositParams);

  const handleDeposit = async () => {
    if (!amount || !recipient) {
      alert('Please fill all fields');
      return;
    }

    try {
      // Initialize prover
      const prover = createZKProver();
      await prover.initialize();

      // Generate parameters
      const secret = generateSecret();
      const amountInPlanck = (parseFloat(amount) * 1e12).toString();

      // Generate proof
      const proof = await prover.generateDepositProof(
        amountInPlanck,
        secret,
        recipient
      );

      // Compute commitment
      const commitment = prover._computeCommitment(
        amountInPlanck,
        secret,
        recipient
      );

      // Set parameters
      setDepositParams({
        amount: amountInPlanck,
        commitment,
        proof,
      });

      // Submit transaction
      const result = await deposit.submit();
      
      if (result?.success) {
        alert(`Deposit successful! Block: ${result.blockHash}`);
        
        // Save commitment for later use
        await saveCommitmentLocally({
          commitment,
          amount: amountInPlanck,
          secret,
          recipient,
        });

        // Reset form
        setAmount('');
        setRecipient('');
        setDepositParams(null);
      } else {
        alert(`Deposit failed: ${result?.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Deposit (Public → Private)</Text>

      <TextInput
        style={styles.input}
        placeholder="Amount (e.g., 1.5)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Recipient Public Key"
        value={recipient}
        onChangeText={setRecipient}
      />

      <Button
        title={deposit.submitting ? 'Submitting...' : 'Deposit'}
        onPress={handleDeposit}
        disabled={deposit.submitting}
      />

      {deposit.submitting && <ActivityIndicator size="small" />}

      {deposit.result && (
        <Text style={deposit.result.success ? styles.success : styles.error}>
          {deposit.result.success ? 'Success!' : `Error: ${deposit.result.error}`}
        </Text>
      )}
    </View>
  );
}

// ========== Private Transfer Form Component ==========

function PrivateTransferForm() {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [transferParams, setTransferParams] = useState<any>(null);
  
  const transfer = usePrivateTransfer(transferParams);

  const handleTransfer = async () => {
    if (!amount || !recipient) {
      alert('Please fill all fields');
      return;
    }

    try {
      // Get your unspent commitments
      const myCommitments = await getUnspentCommitments();
      
      if (myCommitments.length === 0) {
        alert('No unspent commitments found');
        return;
      }

      // Use first commitment as input
      const input = myCommitments[0];
      const amountToSend = (parseFloat(amount) * 1e12).toString();
      const inputAmount = BigInt(input.amount);
      const sendAmount = BigInt(amountToSend);
      const changeAmount = inputAmount - sendAmount;

      // Create outputs
      const outputs = [
        {
          value: amountToSend,
          secret: generateSecret(),
          recipient: recipient,
        },
      ];

      // Add change output if needed
      if (changeAmount > 0) {
        outputs.push({
          value: changeAmount.toString(),
          secret: generateSecret(),
          recipient: input.recipient, // Send change back to self
        });
      }

      // Initialize prover
      const prover = createZKProver();
      await prover.initialize();

      // Generate proof
      const proof = await prover.generateTransferProof({
        inputs: [input],
        outputs,
        merkleRoot: await getMerkleRootFromChain(),
      });

      // Encrypt notes
      const encryptedNotes = outputs.map((output) => {
        const note = {
          value: output.value,
          secret: output.secret,
          sender: input.recipient,
          commitment: prover._computeCommitment(
            output.value,
            output.secret,
            output.recipient
          ),
        };
        return encryptNote(note, output.recipient);
      });

      // Compute nullifiers and commitments
      const nullifiers = [prover._computeNullifier(input.secret, input.commitment)];
      const commitments = outputs.map((out) =>
        prover._computeCommitment(out.value, out.secret, out.recipient)
      );

      // Set parameters
      setTransferParams({
        nullifiers,
        commitments,
        proof,
        encryptedNotes,
      });

      // Submit transaction
      const result = await transfer.submit();
      
      if (result?.success) {
        alert(`Transfer successful! Block: ${result.blockHash}`);
        
        // Mark input as spent
        await markCommitmentAsSpent(input.commitment);
        
        // Reset form
        setAmount('');
        setRecipient('');
        setTransferParams(null);
      } else {
        alert(`Transfer failed: ${result?.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Private Transfer (Private → Private)</Text>

      <TextInput
        style={styles.input}
        placeholder="Amount (e.g., 0.5)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Recipient Public Key"
        value={recipient}
        onChangeText={setRecipient}
      />

      <Button
        title={transfer.submitting ? 'Submitting...' : 'Transfer'}
        onPress={handleTransfer}
        disabled={transfer.submitting}
      />

      {transfer.submitting && <ActivityIndicator size="small" />}

      {transfer.result && (
        <Text style={transfer.result.success ? styles.success : styles.error}>
          {transfer.result.success ? 'Success!' : `Error: ${transfer.result.error}`}
        </Text>
      )}
    </View>
  );
}

// ========== Withdraw Form Component ==========

function WithdrawForm() {
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [withdrawParams, setWithdrawParams] = useState<any>(null);
  
  const withdraw = useWithdraw(withdrawParams);

  const handleWithdraw = async () => {
    if (!amount || !address) {
      alert('Please fill all fields');
      return;
    }

    try {
      // Get your unspent commitments
      const myCommitments = await getUnspentCommitments();
      
      if (myCommitments.length === 0) {
        alert('No unspent commitments found');
        return;
      }

      // Find commitment with enough balance
      const amountToWithdraw = (parseFloat(amount) * 1e12).toString();
      const commitment = myCommitments.find(
        (c) => BigInt(c.amount) >= BigInt(amountToWithdraw)
      );

      if (!commitment) {
        alert('Insufficient private balance');
        return;
      }

      // Initialize prover
      const prover = createZKProver();
      await prover.initialize();

      // Generate withdraw proof
      const proof = await prover.generateWithdrawProof(
        commitment,
        address,
        await getMerkleRootFromChain()
      );

      // Compute nullifier
      const nullifier = prover._computeNullifier(
        commitment.secret,
        commitment.commitment
      );

      // Set parameters
      setWithdrawParams({
        nullifier,
        amount: amountToWithdraw,
        recipient: address,
        proof,
      });

      // Submit transaction
      const result = await withdraw.submit();
      
      if (result?.success) {
        alert(`Withdrawal successful! Block: ${result.blockHash}`);
        
        // Mark commitment as spent
        await markCommitmentAsSpent(commitment.commitment);
        
        // Reset form
        setAmount('');
        setAddress('');
        setWithdrawParams(null);
      } else {
        alert(`Withdrawal failed: ${result?.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Withdraw (Private → Public)</Text>

      <TextInput
        style={styles.input}
        placeholder="Amount (e.g., 1.0)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Public Address"
        value={address}
        onChangeText={setAddress}
      />

      <Button
        title={withdraw.submitting ? 'Submitting...' : 'Withdraw'}
        onPress={handleWithdraw}
        disabled={withdraw.submitting}
      />

      {withdraw.submitting && <ActivityIndicator size="small" />}

      {withdraw.result && (
        <Text style={withdraw.result.success ? styles.success : styles.error}>
          {withdraw.result.success ? 'Success!' : `Error: ${withdraw.result.error}`}
        </Text>
      )}
    </View>
  );
}

// ========== Recent Events Component ==========

function RecentEvents({ blockchain }: { blockchain: any }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Events</Text>

      <Text style={styles.subtitle}>Deposits: {blockchain.deposits.length}</Text>
      {blockchain.deposits.slice(-3).map((deposit: any, i: number) => (
        <View key={i} style={styles.eventItem}>
          <Text>Amount: {deposit.amount}</Text>
          <Text>Block: {deposit.blockNumber}</Text>
        </View>
      ))}

      <Text style={styles.subtitle}>Transfers: {blockchain.transfers.length}</Text>
      {blockchain.transfers.slice(-3).map((transfer: any, i: number) => (
        <View key={i} style={styles.eventItem}>
          <Text>Commitments: {transfer.commitments.length}</Text>
          <Text>Block: {transfer.blockNumber}</Text>
        </View>
      ))}

      <Text style={styles.subtitle}>Withdrawals: {blockchain.withdrawals.length}</Text>
      {blockchain.withdrawals.slice(-3).map((withdrawal: any, i: number) => (
        <View key={i} style={styles.eventItem}>
          <Text>Amount: {withdrawal.amount}</Text>
          <Text>Block: {withdrawal.blockNumber}</Text>
        </View>
      ))}
    </View>
  );
}

// ========== Helper Functions (Mock Implementations) ==========

// These would be implemented with actual storage (AsyncStorage, SQLite, etc.)

async function saveCommitmentLocally(commitment: any) {
  // Save to local database
  console.log('Saving commitment:', commitment);
}

async function getUnspentCommitments(): Promise<any[]> {
  // Fetch from local database
  return [];
}

async function markCommitmentAsSpent(commitment: string) {
  // Mark in local database
  console.log('Marking as spent:', commitment);
}

async function getMerkleRootFromChain(): Promise<string> {
  // Fetch from chain
  return '0x0000000000000000000000000000000000000000000000000000000000000000';
}

// ========== Styles ==========

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  connected: {
    color: 'green',
    fontWeight: 'bold',
  },
  disconnected: {
    color: 'red',
    fontWeight: 'bold',
  },
  highlight: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  hash: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#666',
  },
  success: {
    color: 'green',
    marginTop: 8,
  },
  error: {
    color: 'red',
    marginTop: 8,
  },
  eventItem: {
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
});
