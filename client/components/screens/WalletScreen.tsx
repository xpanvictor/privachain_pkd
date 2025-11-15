import Colors from '@/constants/Colors';
import React from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, View } from '../Themed';

type Asset = {
	id: string;
	name: string;
	symbol: string;
	amount: string;
	usd: string;
};

const ASSETS: Asset[] = [
	{ id: '1', name: 'Bitcoin', symbol: 'BTC', amount: '0.125', usd: '$6,250' },
	{ id: '2', name: 'Ethereum', symbol: 'ETH', amount: '1.75', usd: '$3,100' },
	{ id: '3', name: 'USDC', symbol: 'USDC', amount: '520.00', usd: '$520' },
];

const TRANSACTIONS = [
	{ id: 't1', title: 'Coffee', subtitle: 'Starbucks', date: 'Nov 12', amount: '-$5.20' },
	{ id: 't2', title: 'Salary', subtitle: 'Acme Corp', date: 'Nov 10', amount: '+$3,200' },
	{ id: 't3', title: 'Swap BTC → ETH', subtitle: 'On-chain', date: 'Nov 09', amount: '-$1,200' },
];

export default function WalletScreen() {
	const totalBalance = '$9,870.00';

	function renderAsset({ item }: { item: Asset }) {
		return (
			<View style={styles.assetCard}>
				<View style={styles.assetLeft}>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>{item.symbol[0]}</Text>
					</View>
					<View>
						<Text style={styles.assetName}>{item.name}</Text>
						<Text style={styles.assetSymbol}>{item.symbol}</Text>
					</View>
				</View>
				<View style={styles.assetRight}>
					<Text style={styles.assetAmount}>{item.amount}</Text>
					<Text style={styles.assetUsd}>{item.usd}</Text>
				</View>
			</View>
		);
	}

	function renderTransaction({ item }: { item: any }) {
		const positive = item.amount.startsWith('+');
		return (
			<View style={styles.txRow}>
				<View style={styles.txIcon}>
					<Text style={styles.txIconText}>{item.title[0]}</Text>
				</View>
				<View style={styles.txMeta}>
					<Text style={styles.txTitle}>{item.title}</Text>
					<Text style={styles.txSubtitle}>{item.subtitle}</Text>
				</View>
				<View style={styles.txRight}>
					<Text style={[styles.txAmount, positive ? styles.positive : styles.negative]}>{item.amount}</Text>
					<Text style={styles.txDate}>{item.date}</Text>
				</View>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<View style={styles.header}>
				<Text style={styles.headerLabel}>Total balance</Text>
				<Text style={styles.headerBalance}>{totalBalance}</Text>
				<Text style={styles.headerSub}>Available across all wallets</Text>
			</View>

			<View style={styles.actionsRow}>
				<TouchableOpacity style={[styles.actionButton, { backgroundColor: Colors.light.tint }]}> 
					<Text style={styles.actionText}>Send</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.actionButton, styles.actionOutline]}> 
					<Text style={styles.actionTextOutline}>Receive</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.actionButton, styles.actionOutline]}> 
					<Text style={styles.actionTextOutline}>Buy</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Assets</Text>
				<FlatList
					data={ASSETS}
					keyExtractor={(i) => i.id}
					horizontal
					showsHorizontalScrollIndicator={false}
					renderItem={renderAsset}
					contentContainerStyle={styles.assetsList}
				/>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Recent activity</Text>
				<FlatList
					data={TRANSACTIONS}
					keyExtractor={(i) => i.id}
					renderItem={renderTransaction}
					scrollEnabled={false}
				/>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { padding: 20, paddingBottom: 40 },
	header: { marginBottom: 18 },
		headerLabel: { fontSize: 14, color: Colors.light.tabIconDefault, marginBottom: 6 },
	headerBalance: { fontSize: 34, fontWeight: '700', color: Colors.light.text },
		headerSub: { fontSize: 12, color: Colors.light.tabIconDefault, marginTop: 6 },
	actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 18 },
	actionButton: {
		flex: 1,
		marginHorizontal: 6,
		paddingVertical: 12,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
		actionOutline: {
			backgroundColor: 'transparent',
			borderWidth: 1,
			borderColor: Colors.light.tabIconDefault,
		},
	actionText: { color: '#fff', fontWeight: '600' },
	actionTextOutline: { color: Colors.light.text, fontWeight: '600' },
	section: { marginTop: 6 },
	sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
	assetsList: { paddingBottom: 6 },
	assetCard: {
		width: 220,
		marginRight: 12,
		backgroundColor: Colors.light.background,
		borderRadius: 14,
		padding: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	assetLeft: { flexDirection: 'row', alignItems: 'center' },
	avatar: {
		width: 44,
		height: 44,
		borderRadius: 44,
		backgroundColor: Colors.light.tint,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	avatarText: { color: '#fff', fontWeight: '700' },
	assetName: { fontSize: 15, fontWeight: '600' },
		assetSymbol: { fontSize: 12, color: Colors.light.tabIconDefault },
	assetRight: { alignItems: 'flex-end' },
	assetAmount: { fontSize: 15, fontWeight: '700' },
		assetUsd: { fontSize: 12, color: Colors.light.tabIconDefault },
		txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.tabIconDefault },
		txIcon: { width: 44, height: 44, borderRadius: 44, backgroundColor: Colors.light.background, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
	txIconText: { fontWeight: '700' },
	txMeta: { flex: 1 },
	txTitle: { fontSize: 14, fontWeight: '600' },
		txSubtitle: { fontSize: 12, color: Colors.light.tabIconDefault, marginTop: 2 },
	txRight: { alignItems: 'flex-end' },
	txAmount: { fontSize: 14, fontWeight: '700' },
	positive: { color: '#16a34a' },
	negative: { color: '#dc2626' },
		txDate: { fontSize: 12, color: Colors.light.tabIconDefault, marginTop: 4 },
});

