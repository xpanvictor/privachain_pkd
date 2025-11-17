/**
 * Send Modal - Private Transfer Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useWallet } from '@/context/WalletContext';

interface SendModalProps {
  onClose: () => void;
}

export default function SendModal({ onClose }: SendModalProps) {
  const { balances, refreshBalances, refreshCommitments } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!recipient || !amount) {
      Alert.alert('Error', 'Please enter recipient and amount');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Check balance
    const privateBalance = parseFloat(balances?.privateBalance || '0') / 1e12;
    if (amountNum > privateBalance) {
      Alert.alert('Error', 'Insufficient private balance');
      return;
    }

    Alert.alert(
      'Confirm Send',
      `Send ${amount} PRIVA to ${recipient.slice(0, 10)}...?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setLoading(true);
            try {
              // Mock send transaction
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              console.log('[MOCK] Sending:', {
                recipient,
                amount: (amountNum * 1e12).toString(),
                note,
              });

              Alert.alert('Success', 'Transaction sent successfully!');
              await refreshBalances();
              await refreshCommitments();
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Failed to send transaction');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Send Private Transfer</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Balance Display */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            {(parseFloat(balances?.privateBalance || '0') / 1e12).toFixed(4)} PRIVA
          </Text>
        </View>

        {/* Recipient Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recipient Address</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
              value={recipient}
              onChangeText={setRecipient}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.scanButton}>
              <Ionicons name="qr-code" size={20} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Amount</Text>
            <TouchableOpacity onPress={() => setAmount((parseFloat(balances?.privateBalance || '0') / 1e12).toString())}>
              <Text style={styles.maxButton}>MAX</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <Text style={styles.currency}>PRIVA</Text>
          </View>
        </View>

        {/* Note Input (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Note (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add a private note..."
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Transaction Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction Type</Text>
            <Text style={styles.detailValue}>Private Transfer</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network Fee</Text>
            <Text style={styles.detailValue}>~0.0001 PRIVA</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Privacy Level</Text>
            <View style={styles.privacyBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#16a34a" />
              <Text style={styles.privacyText}>High</Text>
            </View>
          </View>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>Send Transaction</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  maxButton: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.tint,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    paddingVertical: 12,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  scanButton: {
    padding: 8,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  detailsCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privacyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  sendButton: {
    backgroundColor: Colors.light.tint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
