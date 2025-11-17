/**
 * Receive Modal - Show Address and QR Code
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useWallet } from '@/context/WalletContext';

interface ReceiveModalProps {
  onClose: () => void;
}

export default function ReceiveModal({ onClose }: ReceiveModalProps) {
  const { address } = useWallet();
  const [showPrivateAddress, setShowPrivateAddress] = useState(false);

  // Mock private address (in real app, this would be derived)
  const privateAddress = address ? `zk${address.slice(2)}` : '';

  const copyToClipboard = async (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const handleShare = async (text: string) => {
    try {
      await Share.share({
        message: text,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Receive Funds</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Address Type Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, !showPrivateAddress && styles.toggleButtonActive]}
            onPress={() => setShowPrivateAddress(false)}
          >
            <Text style={[styles.toggleText, !showPrivateAddress && styles.toggleTextActive]}>
              Public Address
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, showPrivateAddress && styles.toggleButtonActive]}
            onPress={() => setShowPrivateAddress(true)}
          >
            <Ionicons name="shield-checkmark" size={16} color={showPrivateAddress ? '#fff' : Colors.light.tint} />
            <Text style={[styles.toggleText, showPrivateAddress && styles.toggleTextActive]}>
              Private Address
            </Text>
          </TouchableOpacity>
        </View>

        {/* QR Code Placeholder */}
        <View style={styles.qrContainer}>
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code" size={120} color="#d1d5db" />
          </View>
          <Text style={styles.qrLabel}>
            {showPrivateAddress ? 'Private Address QR Code' : 'Public Address QR Code'}
          </Text>
        </View>

        {/* Address Display */}
        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <Text style={styles.addressLabel}>
              {showPrivateAddress ? 'Private Address' : 'Public Address'}
            </Text>
            {showPrivateAddress && (
              <View style={styles.privateBadge}>
                <Ionicons name="shield" size={12} color="#16a34a" />
                <Text style={styles.privateBadgeText}>Shielded</Text>
              </View>
            )}
          </View>
          <Text style={styles.addressText} numberOfLines={2}>
            {showPrivateAddress ? privateAddress : address}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => copyToClipboard(
                showPrivateAddress ? privateAddress : address || '',
                'Address'
              )}
            >
              <Ionicons name="copy-outline" size={20} color={Colors.light.tint} />
              <Text style={styles.actionButtonText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleShare(showPrivateAddress ? privateAddress : address || '')}
            >
              <Ionicons name="share-outline" size={20} color={Colors.light.tint} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.light.tint} />
          <Text style={styles.infoText}>
            {showPrivateAddress
              ? 'Use this private address to receive shielded transactions. Your balance will be private.'
              : 'Use this public address to receive funds. Transactions will be visible on-chain.'}
          </Text>
        </View>
      </View>
    </View>
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.light.tint,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: '#fff',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  qrLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  addressCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  privateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  addressText: {
    fontSize: 14,
    color: '#000',
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});
