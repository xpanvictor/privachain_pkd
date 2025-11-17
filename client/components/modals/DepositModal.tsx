/**
 * Deposit Modal - Shield Funds (Public → Private)
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

interface DepositModalProps {
  onClose: () => void;
}

export default function DepositModal({ onClose }: DepositModalProps) {
  const { balances, refreshBalances, refreshCommitments } = useWallet();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    if (!amount) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Check balance
    const publicBalance = parseFloat(balances?.publicBalance || '0') / 1e12;
    if (amountNum > publicBalance) {
      Alert.alert('Error', 'Insufficient public balance');
      return;
    }

    Alert.alert(
      'Shield Funds',
      `Convert ${amount} PRIVA from public to private?\n\nYour funds will be shielded and transaction details will be hidden.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Shield',
          onPress: async () => {
            setLoading(true);
            try {
              // Mock deposit transaction
              await new Promise(resolve => setTimeout(resolve, 2500));
              
              console.log('[MOCK] Depositing (Public → Private):', {
                amount: (amountNum * 1e12).toString(),
              });

              Alert.alert('Success', 'Funds successfully shielded!');
              await refreshBalances();
              await refreshCommitments();
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Failed to shield funds');
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
        <Text style={styles.title}>Shield Funds</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={24} color="#16a34a" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Privacy Protection</Text>
            <Text style={styles.infoDescription}>
              Convert your public balance to private balance for enhanced privacy
            </Text>
          </View>
        </View>

        {/* Flow Diagram */}
        <View style={styles.flowDiagram}>
          <View style={styles.flowBox}>
            <Ionicons name="eye" size={20} color="#6b7280" />
            <Text style={styles.flowLabel}>Public</Text>
            <Text style={styles.flowBalance}>
              {(parseFloat(balances?.publicBalance || '0') / 1e12).toFixed(4)}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color={Colors.light.tint} />
          <View style={[styles.flowBox, styles.flowBoxPrivate]}>
            <Ionicons name="shield" size={20} color="#16a34a" />
            <Text style={styles.flowLabel}>Private</Text>
            <Text style={styles.flowBalance}>
              {(parseFloat(balances?.privateBalance || '0') / 1e12).toFixed(4)}
            </Text>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Amount to Shield</Text>
            <TouchableOpacity onPress={() => setAmount((parseFloat(balances?.publicBalance || '0') / 1e12).toString())}>
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

        {/* Transaction Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>From</Text>
            <Text style={styles.detailValue}>Public Balance</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>To</Text>
            <Text style={styles.detailValue}>Private Balance</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network Fee</Text>
            <Text style={styles.detailValue}>~0.0002 PRIVA</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Processing Time</Text>
            <Text style={styles.detailValue}>~6 seconds</Text>
          </View>
        </View>

        {/* Features List */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
            <Text style={styles.featureText}>Zero-knowledge proof verification</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
            <Text style={styles.featureText}>Balance remains private</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
            <Text style={styles.featureText}>Transaction details hidden</Text>
          </View>
        </View>

        {/* Shield Button */}
        <TouchableOpacity
          style={[styles.shieldButton, loading && styles.shieldButtonDisabled]}
          onPress={handleDeposit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="shield" size={20} color="#fff" />
              <Text style={styles.shieldButtonText}>Shield Funds</Text>
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#d1fae5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#047857',
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
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
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
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
  },
  shieldButton: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  shieldButtonDisabled: {
    opacity: 0.6,
  },
  shieldButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
