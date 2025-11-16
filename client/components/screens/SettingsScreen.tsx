/**
 * Settings Screen
 * 
 * Provides security settings and configuration options.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { getSettings, saveSettings } from '@/storage/database';
import { checkBiometricCapability, setupPin, removePin } from '@/security/auth';
import PinInput from '../auth/PinInput';

export default function SettingsScreen() {
	const [biometricsEnabled, setBiometricsEnabled] = useState(false);
	const [hasBiometricHardware, setHasBiometricHardware] = useState(false);
	const [autoLockMinutes, setAutoLockMinutes] = useState(5);
	const [showPinSetup, setShowPinSetup] = useState(false);

	useEffect(() => {
		loadSettings();
		checkBiometrics();
	}, []);

	const loadSettings = async () => {
		try {
			const settings = await getSettings();
			setBiometricsEnabled(settings.biometricEnabled);
			setAutoLockMinutes(settings.autoLockTimeout);
		} catch (err) {
			console.error('Failed to load settings:', err);
		}
	};

	const checkBiometrics = async () => {
		const capability = await checkBiometricCapability();
		setHasBiometricHardware(capability.available);
	};

	const handleToggleBiometrics = async (enabled: boolean) => {
		if (!hasBiometricHardware) {
			Alert.alert('Not Available', 'Biometric authentication is not available on this device');
			return;
		}

		try {
			await saveSettings({ biometricEnabled: enabled });
			setBiometricsEnabled(enabled);
		} catch (err) {
			Alert.alert('Error', 'Failed to update biometric setting');
		}
	};

	const handleChangeAutoLock = (minutes: number) => {
		Alert.alert(
			'Auto-Lock Timeout',
			`Lock wallet after ${minutes} minute${minutes === 1 ? '' : 's'} of inactivity?`,
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Confirm',
					onPress: async () => {
						try {
							await saveSettings({ autoLockTimeout: minutes });
							setAutoLockMinutes(minutes);
						} catch (err) {
							Alert.alert('Error', 'Failed to update auto-lock setting');
						}
					},
				},
			]
		);
	};

	const handleChangePin = () => {
		setShowPinSetup(true);
	};

	const handlePinComplete = async (pin: string) => {
		try {
			await setupPin(pin);
			setShowPinSetup(false);
			Alert.alert('Success', 'PIN has been updated');
		} catch (err) {
			Alert.alert('Error', 'Failed to set PIN');
		}
	};

	const handleRemovePin = () => {
		Alert.alert(
			'Remove PIN',
			'Are you sure you want to remove PIN protection? This will make your wallet less secure.',
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Remove',
					style: 'destructive',
					onPress: async () => {
						try {
							await removePin();
							Alert.alert('Success', 'PIN has been removed');
						} catch (err) {
							Alert.alert('Error', 'Failed to remove PIN');
						}
					},
				},
			]
		);
	};

	if (showPinSetup) {
		return (
			<View style={styles.pinSetupContainer}>
				<View style={styles.pinSetupHeader}>
					<TouchableOpacity onPress={() => setShowPinSetup(false)}>
						<Ionicons name="close" size={28} color="#000" />
					</TouchableOpacity>
					<Text style={styles.pinSetupTitle}>Set New PIN</Text>
					<View style={{ width: 28 }} />
				</View>
				<PinInput onComplete={handlePinComplete} error="" />
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<Text style={styles.sectionTitle}>Security</Text>

			{/* Biometric Authentication */}
			<View style={styles.settingCard}>
				<View style={styles.settingRow}>
					<View style={styles.settingLeft}>
						<Ionicons name="finger-print" size={24} color={Colors.light.tint} />
						<View style={styles.settingText}>
							<Text style={styles.settingLabel}>Biometric Authentication</Text>
							<Text style={styles.settingDescription}>
								{hasBiometricHardware 
									? 'Use fingerprint or face ID' 
									: 'Not available on this device'}
							</Text>
						</View>
					</View>
					<Switch
						value={biometricsEnabled}
						onValueChange={handleToggleBiometrics}
						disabled={!hasBiometricHardware}
						trackColor={{ false: '#d1d5db', true: Colors.light.tint }}
						thumbColor="#fff"
					/>
				</View>
			</View>

			{/* Change PIN */}
			<TouchableOpacity style={styles.settingCard} onPress={handleChangePin}>
				<View style={styles.settingRow}>
					<View style={styles.settingLeft}>
						<Ionicons name="keypad" size={24} color={Colors.light.tint} />
						<View style={styles.settingText}>
							<Text style={styles.settingLabel}>Change PIN</Text>
							<Text style={styles.settingDescription}>Update your unlock PIN</Text>
						</View>
					</View>
					<Ionicons name="chevron-forward" size={20} color="#9ca3af" />
				</View>
			</TouchableOpacity>

			{/* Auto-Lock */}
			<View style={styles.settingCard}>
				<View style={styles.settingColumn}>
					<View style={styles.settingLeft}>
						<Ionicons name="timer" size={24} color={Colors.light.tint} />
						<View style={styles.settingText}>
							<Text style={styles.settingLabel}>Auto-Lock</Text>
							<Text style={styles.settingDescription}>
								Lock after {autoLockMinutes} minute{autoLockMinutes === 1 ? '' : 's'}
							</Text>
						</View>
					</View>
					<View style={styles.autoLockOptions}>
						{[1, 5, 15, 30].map((minutes) => (
							<TouchableOpacity
								key={minutes}
								style={[
									styles.autoLockOption,
									autoLockMinutes === minutes && styles.autoLockOptionActive,
								]}
								onPress={() => handleChangeAutoLock(minutes)}
							>
								<Text
									style={[
										styles.autoLockOptionText,
										autoLockMinutes === minutes && styles.autoLockOptionTextActive,
									]}
								>
									{minutes}m
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>
			</View>

			<Text style={styles.sectionTitle}>Advanced</Text>

			{/* Remove PIN */}
			<TouchableOpacity style={styles.settingCard} onPress={handleRemovePin}>
				<View style={styles.settingRow}>
					<View style={styles.settingLeft}>
						<Ionicons name="warning" size={24} color="#dc2626" />
						<View style={styles.settingText}>
							<Text style={[styles.settingLabel, { color: '#dc2626' }]}>Remove PIN</Text>
							<Text style={styles.settingDescription}>Disable PIN protection</Text>
						</View>
					</View>
					<Ionicons name="chevron-forward" size={20} color="#9ca3af" />
				</View>
			</TouchableOpacity>

			{/* App Version */}
			<View style={styles.versionContainer}>
				<Text style={styles.versionText}>PrivaChain Wallet v1.0.0</Text>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f9fafb',
	},
	content: {
		padding: 20,
		paddingBottom: 100,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 16,
		marginTop: 8,
		color: '#000',
	},
	settingCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},
	settingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	settingColumn: {
		gap: 16,
	},
	settingLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		flex: 1,
	},
	settingText: {
		flex: 1,
	},
	settingLabel: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 4,
		color: '#000',
	},
	settingDescription: {
		fontSize: 14,
		color: '#6b7280',
	},
	autoLockOptions: {
		flexDirection: 'row',
		gap: 12,
		marginLeft: 36,
	},
	autoLockOption: {
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1.5,
		borderColor: '#d1d5db',
		backgroundColor: '#fff',
	},
	autoLockOptionActive: {
		borderColor: Colors.light.tint,
		backgroundColor: Colors.light.tint + '10',
	},
	autoLockOptionText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#6b7280',
	},
	autoLockOptionTextActive: {
		color: Colors.light.tint,
	},
	versionContainer: {
		alignItems: 'center',
		marginTop: 40,
	},
	versionText: {
		fontSize: 14,
		color: '#9ca3af',
	},
	pinSetupContainer: {
		flex: 1,
		backgroundColor: '#fff',
		padding: 20,
	},
	pinSetupHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 40,
	},
	pinSetupTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#000',
	},
});
