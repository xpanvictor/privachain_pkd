import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import PinInput from './PinInput';
import { authenticateWithBiometrics, verifyPin } from '@/security/auth';
import { useWallet } from '@/context/WalletContext';
import Colors from '@/constants/Colors';

type AuthScreenProps = {
	onAuthenticated: () => void;
	mode?: 'unlock' | 'setup';
};

export default function AuthScreen({ onAuthenticated, mode = 'unlock' }: AuthScreenProps) {
	const { unlock } = useWallet();
	const [error, setError] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);

	// Auto-trigger biometric on mount if unlocking
	useEffect(() => {
		if (mode === 'unlock') {
			handleBiometric();
		}
	}, [mode]);

	const handleBiometric = async () => {
		try {
			setIsLoading(true);
			setError('');
			const success = await authenticateWithBiometrics();
			if (success) {
				await unlock();
				onAuthenticated();
			} else {
				setError('Biometric authentication failed');
			}
		} catch (err) {
			setError('Biometric not available, use PIN');
		} finally {
			setIsLoading(false);
		}
	};

	const handlePinComplete = async (pin: string) => {
		try {
			setIsLoading(true);
			setError('');
			
			if (mode === 'setup') {
				// For setup mode, the parent component handles PIN setup
				await unlock();
				onAuthenticated();
			} else {
				// For unlock mode, verify the PIN
				const success = await verifyPin(pin);
				if (success) {
					await unlock();
					onAuthenticated();
				} else {
					setError('Incorrect PIN');
				}
			}
		} catch (err) {
			setError('Authentication failed');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={styles.logoContainer}>
					<Text style={styles.logoText}>🔒</Text>
				</View>
				<Text style={styles.title}>
					{mode === 'setup' ? 'Secure Your Wallet' : 'Welcome Back'}
				</Text>
				<Text style={styles.subtitle}>
					{mode === 'setup' 
						? 'Set up a PIN to protect your wallet'
						: 'Enter your PIN to unlock'
					}
				</Text>
			</View>

			<PinInput
				onComplete={handlePinComplete}
				onBiometric={mode === 'unlock' ? handleBiometric : undefined}
				error={error}
			/>

			{error && (
				<Text style={styles.errorText}>{error}</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		justifyContent: 'center',
		padding: 20,
	},
	header: {
		alignItems: 'center',
		marginBottom: 60,
	},
	logoContainer: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: Colors.light.tint + '20',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 24,
	},
	logoText: {
		fontSize: 40,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		marginBottom: 8,
		color: '#000',
	},
	subtitle: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
	},
	errorText: {
		color: '#dc2626',
		fontSize: 14,
		textAlign: 'center',
		marginTop: 20,
	},
});
