/**
 * App Lock Wrapper
 * 
 * Automatically shows authentication screen when app is locked.
 * Wrap this around your main app content.
 */

import React from 'react';
import { useWallet } from '@/context/WalletContext';
import AuthScreen from '@/components/auth/AuthScreen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';

interface AppLockWrapperProps {
  children: React.ReactNode;
}

export default function AppLockWrapper({ children }: AppLockWrapperProps) {
  const { isLocked, loading } = useWallet();

  // Show loading spinner during initialization
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  // Show authentication screen if locked
  if (isLocked) {
    return <AuthScreen onAuthenticated={() => {}} mode="unlock" />;
  }

  // Show main app content when unlocked
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
