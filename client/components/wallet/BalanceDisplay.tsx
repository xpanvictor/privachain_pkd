/**
 * Balance Display Component
 * 
 * Shows wallet balances with privacy toggle
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useWallet } from '@/context/WalletContext';

interface BalanceDisplayProps {
  showPrivate?: boolean;
  compact?: boolean;
}

export default function BalanceDisplay({ showPrivate = true, compact = false }: BalanceDisplayProps) {
  const { balances, refreshBalances, loading } = useWallet();
  const [hideBalance, setHideBalance] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const formatBalance = (amount: string): string => {
    if (hideBalance) return '••••••';
    
    try {
      const value = BigInt(amount || '0');
      const decimal = Number(value) / 1e12; // Assuming 12 decimals
      return decimal.toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  const formatUSD = (amount: string): string => {
    if (hideBalance) return '$••••';
    
    try {
      const value = BigInt(amount || '0');
      const decimal = Number(value) / 1e12;
      const usd = decimal * 2500; // Mock price, replace with actual
      return `$${usd.toFixed(2)}`;
    } catch {
      return '$0.00';
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalances();
    setRefreshing(false);
  };

  if (loading && !balances) {
    return (
      <View style={[styles.container, compact && styles.compact]}>
        <ActivityIndicator size="small" color={Colors.light.tint} />
      </View>
    );
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactLabel}>Total Balance</Text>
        <View style={styles.compactRow}>
          <Text style={styles.compactAmount}>
            {formatBalance(balances?.totalBalance || '0')} DOT
          </Text>
          <TouchableOpacity onPress={() => setHideBalance(!hideBalance)}>
            <Ionicons
              name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={Colors.light.tabIconDefault}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.compactUsd}>
          {formatUSD(balances?.totalBalance || '0')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>Total Balance</Text>
        <View style={styles.actions}>
          <TouchableOpacity 
            onPress={handleRefresh} 
            disabled={refreshing}
            style={styles.iconButton}
          >
            <Ionicons
              name="refresh"
              size={20}
              color={Colors.light.tabIconDefault}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setHideBalance(!hideBalance)}
            style={styles.iconButton}
          >
            <Ionicons
              name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.light.tabIconDefault}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Total Balance */}
      <Text style={styles.totalAmount}>
        {formatBalance(balances?.totalBalance || '0')} DOT
      </Text>
      <Text style={styles.totalUsd}>
        {formatUSD(balances?.totalBalance || '0')}
      </Text>

      {/* Breakdown */}
      {showPrivate && (
        <View style={styles.breakdown}>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLabel}>
              <Ionicons name="eye-outline" size={16} color={Colors.light.tabIconDefault} />
              <Text style={styles.breakdownText}>Public</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatBalance(balances?.publicBalance || '0')} DOT
            </Text>
          </View>

          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLabel}>
              <Ionicons name="shield-outline" size={16} color={Colors.light.tint} />
              <Text style={styles.breakdownText}>Private</Text>
            </View>
            <Text style={[styles.breakdownAmount, styles.privateAmount]}>
              {formatBalance(balances?.privateBalance || '0')} DOT
            </Text>
          </View>
        </View>
      )}

      {/* Last Updated */}
      {balances?.lastUpdated && (
        <Text style={styles.lastUpdated}>
          Updated {new Date(balances.lastUpdated).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  compact: {
    padding: 12,
  },
  compactContainer: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  totalUsd: {
    fontSize: 18,
    color: Colors.light.tabIconDefault,
    marginBottom: 16,
  },
  breakdown: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.tabIconDefault + '30',
    paddingTop: 16,
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  privateAmount: {
    color: Colors.light.tint,
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    marginTop: 12,
    textAlign: 'center',
  },
  compactLabel: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    marginBottom: 4,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  compactAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  compactUsd: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
});
