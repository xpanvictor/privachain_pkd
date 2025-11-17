/**
 * Withdraw Modal - Unshield Funds (Private → Public)
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

interface WithdrawModalProps {
  onClose: () => void;
}

export default function WithdrawModal({ onClose }: WithdrawModalProps) {
  const { balances, address, refreshBalances, refreshCommitments } = useWallet();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState(address || '');
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    if (!amount || !recipient) {
      Alert.alert('Error', 'Please enter amount and recipient');
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
      'Unshield Funds',
      `Convert ${amount} PRIVA from private to public?\n\nYour funds will become publicly visible on the blockchain.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unshield',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Mock withdraw transaction
              await new Promise(resolve => setTimeout(resolve, 2500));
              
              console.log('[MOCK] Withdrawing (Private → Public):', {
                amount: (amountNum * 1e12).toString(),
                recipient,
              });

              Alert.alert('Success', 'Funds successfully unshielded!');
              await refreshBalances();
              await refreshCommitments();
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Failed to unshield funds');
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
        <Text style={styles.title}>Unshield Funds</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={24} color="#f59e0b" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>Privacy Notice</Text>
            <Text style={styles.warningDescription}>
              Unshielding will make this transaction publicly visible on the blockchain
            </Text>
          </View>
        </View>

        {/* Flow Diagram */}
        <View style={styles.flowDiagram}>
          <View style={[styles.flowBox, styles.flowBoxPrivate]}>
            <Ionicons name="shield" size={20} color="#16a34a" />
            <Text style={styles.flowLabel}>Private</Text>
            <Text style={styles.flowBalance}>
              {(parseFloat(balances?.privateBalance || '0') / 1e12).toFixed(4)}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color={Colors.light.tint} />
          <View style={styles.flowBox}>
            <Ionicons name="eye" size={20} color="#6b7280" />
            <Text style={styles.flowLabel}>Public</Text>
            <Text style={styles.flowBalance}>
              {(parseFloat(balances?.publicBalance || '0') / 1e12).toFixed(4)}
            </Text>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Amount to Unshield</Text>
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

        {/* Recipient Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recipient Public Address</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
              value={recipient}
              onChangeText={setRecipient}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setRecipient(address || '')}
            >
              <Ionicons name="person" size={20} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>Defaults to your own address</Text>
        </View>

        {/* Transaction Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>From</Text>
            <Text style={styles.detailValue}>Private Balance</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>To</Text>
            <Text style={styles.detailValue}>Public Address</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network Fee</Text>
            <Text style={styles.detailValue}>~0.0002 PRIVA</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Visibility</Text>
            <View style={styles.visibilityBadge}>
              <Ionicons name="eye" size={14} color="#dc2626" />
              <Text style={styles.visibilityText}>Public</Text>
            </View>
          </View>
        </View>

        {/* Information Points */}
        <View style={styles.infoList}>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle" size={18} color="#6b7280" />
            <Text style={styles.infoItemText}>
              Transaction will be visible to everyone
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle" size={18} color="#6b7280" />
            <Text style={styles.infoItemText}>
              Amount and recipient will be public
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle" size={18} color="#6b7280" />
            <Text style={styles.infoItemText}>
              Your private balance history remains hidden
            </Text>
          </View>
        </View>

        {/* Unshield Button */}
        <TouchableOpacity
          style={[styles.unshieldButton, loading && styles.unshieldButtonDisabled]}
          onPress={handleWithdraw}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="eye" size={20} color="#fff" />
              <Text style={styles.unshieldButtonText}>Unshield Funds</Text>
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  warningDescription: {
    fontSize: 14,
    color: '#b45309',
  },
  flowDiagram: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  flowBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  flowBoxPrivate: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  flowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 4,
  },
  flowBalance: {
    fontSize: 16,
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
  iconButton: {
    padding: 8,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  detailsCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
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
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visibilityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  infoList: {
    gap: 12,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoItemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  unshieldButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  unshieldButtonDisabled: {
    opacity: 0.6,
  },
  unshieldButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
