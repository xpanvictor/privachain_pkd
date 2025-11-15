/**
 * Transaction History Component
 * 
 * Displays list of transactions with filtering
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useWallet } from '@/context/WalletContext';
import type { StoredTransaction } from '@/storage/database';

type TransactionFilter = 'all' | 'deposit' | 'private_transfer' | 'withdraw';

interface TransactionHistoryProps {
  limit?: number;
  showFilter?: boolean;
}

export default function TransactionHistory({ limit, showFilter = true }: TransactionHistoryProps) {
  const { transactions, refreshTransactions, loading } = useWallet();
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredTransactions = transactions.filter((tx) =>
    filter === 'all' ? true : tx.type === filter
  );

  const displayTransactions = limit
    ? filteredTransactions.slice(0, limit)
    : filteredTransactions;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshTransactions();
    setRefreshing(false);
  };

  const getTransactionIcon = (type: StoredTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return 'arrow-down-circle';
      case 'private_transfer':
        return 'shield';
      case 'withdraw':
        return 'arrow-up-circle';
    }
  };

  const getTransactionColor = (type: StoredTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return '#16a34a';
      case 'private_transfer':
        return Colors.light.tint;
      case 'withdraw':
        return '#dc2626';
    }
  };

  const getTransactionTitle = (type: StoredTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'private_transfer':
        return 'Private Transfer';
      case 'withdraw':
        return 'Withdraw';
    }
  };

  const getStatusColor = (status: StoredTransaction['status']) => {
    switch (status) {
      case 'confirmed':
        return '#16a34a';
      case 'pending':
        return '#f59e0b';
      case 'failed':
        return '#dc2626';
    }
  };

  const formatAmount = (amount: string): string => {
    try {
      const value = BigInt(amount);
      const decimal = Number(value) / 1e12;
      return decimal.toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderTransaction = ({ item }: { item: StoredTransaction }) => {
    const icon = getTransactionIcon(item.type);
    const color = getTransactionColor(item.type);
    const title = getTransactionTitle(item.type);
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity style={styles.txItem}>
        <View style={[styles.txIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>

        <View style={styles.txContent}>
          <View style={styles.txHeader}>
            <Text style={styles.txTitle}>{title}</Text>
            <Text style={styles.txAmount}>{formatAmount(item.amount)} DOT</Text>
          </View>

          <View style={styles.txFooter}>
            <View style={styles.txStatus}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
            <Text style={styles.txDate}>{formatDate(item.timestamp)}</Text>
          </View>

          {item.error && (
            <Text style={styles.errorText}>{item.error}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilter = () => {
    const filters: { key: TransactionFilter; label: string }[] = [
      { key: 'all', label: 'All' },
      { key: 'deposit', label: 'Deposits' },
      { key: 'private_transfer', label: 'Transfers' },
      { key: 'withdraw', label: 'Withdrawals' },
    ];

    return (
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterButton,
              filter === f.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={48} color={Colors.light.tabIconDefault} />
      <Text style={styles.emptyText}>No transactions yet</Text>
      <Text style={styles.emptySubtext}>
        Your transaction history will appear here
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <Ionicons
            name="refresh"
            size={20}
            color={Colors.light.tabIconDefault}
          />
        </TouchableOpacity>
      </View>

      {showFilter && renderFilter()}

      {loading && transactions.length === 0 ? (
        <ActivityIndicator size="large" color={Colors.light.tint} style={styles.loader} />
      ) : displayTransactions.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={displayTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          scrollEnabled={!limit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.tabIconDefault + '30',
  },
  filterButtonActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  filterText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    gap: 12,
  },
  txItem: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  txIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txContent: {
    flex: 1,
    gap: 8,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  txFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  txDate: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginTop: 8,
    textAlign: 'center',
  },
  loader: {
    marginTop: 40,
  },
});
