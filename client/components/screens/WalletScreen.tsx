import Colors from '@/constants/Colors';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Text, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '@/context/WalletContext';
import BalanceDisplay from '../wallet/BalanceDisplay';
import TransactionHistory from '../wallet/TransactionHistory';
import SendModal from '../modals/SendModal';
import ReceiveModal from '../modals/ReceiveModal';
import DepositModal from '../modals/DepositModal';
import WithdrawModal from '../modals/WithdrawModal';

export default function WalletScreen() {
	const { isAuthenticated, hasWallet, connected, blockNumber } = useWallet();
	const [showSendModal, setShowSendModal] = useState(false);
	const [showReceiveModal, setShowReceiveModal] = useState(false);
	const [showDepositModal, setShowDepositModal] = useState(false);
	const [showWithdrawModal, setShowWithdrawModal] = useState(false);

	// Show wallet setup if no wallet
	if (!hasWallet) {
		return (
			<View style={styles.setupContainer}>
				<Ionicons name="wallet-outline" size={64} color={Colors.light.tint} />
				<Text style={styles.setupTitle}>Welcome to PrivaChain</Text>
				<Text style={styles.setupSubtitle}>
					Create or restore a wallet to get started
				</Text>
				<TouchableOpacity style={styles.setupButton}>
					<Text style={styles.setupButtonText}>Create Wallet</Text>
				</TouchableOpacity>
			</View>
		);
	}

	// Show locked state if not authenticated
	if (!isAuthenticated) {
		return (
			<View style={styles.lockedContainer}>
				<Ionicons name="lock-closed" size={64} color={Colors.light.tint} />
				<Text style={styles.lockedTitle}>Wallet Locked</Text>
				<Text style={styles.lockedSubtitle}>
					Authenticate to access your wallet
				</Text>
			</View>
		);
	}





	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			{/* Connection Status */}
			<View style={styles.statusBar}>
				<View style={styles.statusItem}>
					<View style={[styles.statusDot, { backgroundColor: connected ? '#16a34a' : '#dc2626' }]} />
					<Text style={styles.statusText}>
						{connected ? 'Connected' : 'Disconnected'}
					</Text>
				</View>
				{connected && (
					<Text style={styles.blockNumber}>Block: {blockNumber}</Text>
				)}
			</View>

			{/* Balance Display */}
			<BalanceDisplay showPrivate={true} />

			{/* Quick Actions */}
			<View style={styles.actionsRow}>
				<TouchableOpacity 
					style={[styles.actionButton, styles.actionPrimary]} 
					onPress={() => setShowSendModal(true)}
				> 
					<Ionicons name="arrow-up" size={20} color="#fff" />
					<Text style={styles.actionText}>Send</Text>
				</TouchableOpacity>
				<TouchableOpacity 
					style={[styles.actionButton, styles.actionSecondary]} 
					onPress={() => setShowReceiveModal(true)}
				> 
					<Ionicons name="arrow-down" size={20} color={Colors.light.tint} />
					<Text style={styles.actionTextOutline}>Receive</Text>
				</TouchableOpacity>
				<TouchableOpacity 
					style={[styles.actionButton, styles.actionSecondary]} 
					onPress={() => setShowDepositModal(true)}
				> 
					<Ionicons name="shield" size={20} color={Colors.light.tint} />
					<Text style={styles.actionTextOutline}>Shield</Text>
				</TouchableOpacity>
				<TouchableOpacity 
					style={[styles.actionButton, styles.actionSecondary]} 
					onPress={() => setShowWithdrawModal(true)}
				> 
					<Ionicons name="eye" size={20} color={Colors.light.tint} />
					<Text style={styles.actionTextOutline}>Unshield</Text>
				</TouchableOpacity>
			</View>

			{/* Transaction History */}
			<TransactionHistory limit={10} showFilter={true} />

			{/* Modals */}
			<Modal
				visible={showSendModal}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setShowSendModal(false)}
			>
				<SendModal onClose={() => setShowSendModal(false)} />
			</Modal>

			<Modal
				visible={showReceiveModal}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setShowReceiveModal(false)}
			>
				<ReceiveModal onClose={() => setShowReceiveModal(false)} />
			</Modal>

			<Modal
				visible={showDepositModal}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setShowDepositModal(false)}
			>
				<DepositModal onClose={() => setShowDepositModal(false)} />
			</Modal>

			<Modal
				visible={showWithdrawModal}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setShowWithdrawModal(false)}
			>
				<WithdrawModal onClose={() => setShowWithdrawModal(false)} />
			</Modal>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	content: {
		padding: 20,
		paddingBottom: 100,
	},
	setupContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 40,
	},
	setupTitle: {
		fontSize: 24,
		fontWeight: '700',
		marginTop: 24,
		marginBottom: 8,
		color: '#000',
	},
	setupSubtitle: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
		marginBottom: 32,
	},
	setupButton: {
		backgroundColor: Colors.light.tint,
		paddingHorizontal: 32,
		paddingVertical: 16,
		borderRadius: 12,
	},
	setupButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	lockedContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 40,
	},
	lockedTitle: {
		fontSize: 24,
		fontWeight: '700',
		marginTop: 24,
		marginBottom: 8,
		color: '#000',
	},
	lockedSubtitle: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
	},
	statusBar: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#f9fafb',
		borderRadius: 12,
		marginBottom: 20,
	},
	statusItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	statusText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#374151',
	},
	blockNumber: {
		fontSize: 12,
		color: '#6b7280',
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 30,
	},
	actionButton: {
		flex: 1,
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 8,
	},
	actionPrimary: {
		backgroundColor: Colors.light.tint,
	},
	actionSecondary: {
		borderWidth: 1.5,
		borderColor: Colors.light.tint,
		backgroundColor: 'transparent',
	},
	actionText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 14,
	},
	actionTextOutline: {
		color: Colors.light.tint,
		fontWeight: '600',
		fontSize: 14,
	},
});