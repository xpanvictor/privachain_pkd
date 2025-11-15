/**
 * Security Layer - Biometric Authentication and PIN Protection
 * 
 * Provides secure authentication methods including biometrics and PIN.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { getSettings, saveSettings } from '../storage/database';

// ========== Types ==========

export interface AuthResult {
  success: boolean;
  error?: string;
  method?: 'biometric' | 'pin' | 'none';
}

export interface BiometricCapability {
  available: boolean;
  type: 'fingerprint' | 'facial' | 'iris' | 'none';
}

// ========== Secure Storage Keys ==========

const SECURE_KEYS = {
  PIN: 'privachain_pin',
  PIN_SALT: 'privachain_pin_salt',
  LAST_AUTH: 'privachain_last_auth',
} as const;

// ========== Biometric Authentication ==========

/**
 * Check if biometric authentication is available
 */
export const checkBiometricCapability = async (): Promise<BiometricCapability> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    
    if (!hasHardware) {
      return { available: false, type: 'none' };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (!isEnrolled) {
      return { available: false, type: 'none' };
    }

    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    // Determine biometric type
    let type: BiometricCapability['type'] = 'none';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      type = 'facial';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      type = 'fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      type = 'iris';
    }

    return { available: true, type };
  } catch (error) {
    console.error('Failed to check biometric capability:', error);
    return { available: false, type: 'none' };
  }
};

/**
 * Authenticate with biometrics
 */
export const authenticateWithBiometrics = async (
  promptMessage = 'Authenticate to access your wallet'
): Promise<AuthResult> => {
  try {
    const capability = await checkBiometricCapability();
    
    if (!capability.available) {
      return {
        success: false,
        error: 'Biometric authentication not available',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      await updateLastAuthTime();
      return { success: true, method: 'biometric' };
    }

    return {
      success: false,
      error: result.error === 'user_cancel' 
        ? 'Authentication cancelled' 
        : 'Authentication failed',
    };
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: 'Authentication error occurred',
    };
  }
};

// ========== PIN Authentication ==========

/**
 * Hash PIN with salt for secure storage
 */
const hashPin = async (pin: string, salt: string): Promise<string> => {
  // Simple hash - in production, use crypto libraries
  const data = pin + salt;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

/**
 * Generate random salt
 */
const generateSalt = (): string => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
};

/**
 * Set up PIN
 */
export const setupPin = async (pin: string): Promise<boolean> => {
  try {
    if (pin.length < 4 || pin.length > 8) {
      throw new Error('PIN must be 4-8 digits');
    }

    if (!/^\d+$/.test(pin)) {
      throw new Error('PIN must contain only numbers');
    }

    const salt = generateSalt();
    const hashedPin = await hashPin(pin, salt);

    await SecureStore.setItemAsync(SECURE_KEYS.PIN, hashedPin);
    await SecureStore.setItemAsync(SECURE_KEYS.PIN_SALT, salt);
    
    await saveSettings({ pinEnabled: true });

    return true;
  } catch (error) {
    console.error('Failed to setup PIN:', error);
    throw error;
  }
};

/**
 * Verify PIN
 */
export const verifyPin = async (pin: string): Promise<AuthResult> => {
  try {
    const [storedHash, salt] = await Promise.all([
      SecureStore.getItemAsync(SECURE_KEYS.PIN),
      SecureStore.getItemAsync(SECURE_KEYS.PIN_SALT),
    ]);

    if (!storedHash || !salt) {
      return { success: false, error: 'PIN not set up' };
    }

    const inputHash = await hashPin(pin, salt);

    if (inputHash === storedHash) {
      await updateLastAuthTime();
      return { success: true, method: 'pin' };
    }

    return { success: false, error: 'Incorrect PIN' };
  } catch (error) {
    console.error('PIN verification error:', error);
    return { success: false, error: 'Verification error occurred' };
  }
};

/**
 * Check if PIN is set up
 */
export const isPinSetup = async (): Promise<boolean> => {
  try {
    const pin = await SecureStore.getItemAsync(SECURE_KEYS.PIN);
    return pin !== null;
  } catch (error) {
    console.error('Failed to check PIN setup:', error);
    return false;
  }
};

/**
 * Change PIN
 */
export const changePin = async (
  oldPin: string,
  newPin: string
): Promise<boolean> => {
  try {
    const verifyResult = await verifyPin(oldPin);
    
    if (!verifyResult.success) {
      throw new Error('Current PIN is incorrect');
    }

    await setupPin(newPin);
    return true;
  } catch (error) {
    console.error('Failed to change PIN:', error);
    throw error;
  }
};

/**
 * Remove PIN
 */
export const removePin = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.PIN);
    await SecureStore.deleteItemAsync(SECURE_KEYS.PIN_SALT);
    await saveSettings({ pinEnabled: false });
  } catch (error) {
    console.error('Failed to remove PIN:', error);
    throw error;
  }
};

// ========== Auto-lock ==========

/**
 * Update last authentication time
 */
const updateLastAuthTime = async (): Promise<void> => {
  try {
    await SecureStore.setItemAsync(
      SECURE_KEYS.LAST_AUTH,
      Date.now().toString()
    );
  } catch (error) {
    console.error('Failed to update last auth time:', error);
  }
};

/**
 * Get last authentication time
 */
export const getLastAuthTime = async (): Promise<number> => {
  try {
    const time = await SecureStore.getItemAsync(SECURE_KEYS.LAST_AUTH);
    return time ? parseInt(time, 10) : 0;
  } catch (error) {
    console.error('Failed to get last auth time:', error);
    return 0;
  }
};

/**
 * Check if wallet should be locked
 */
export const shouldLock = async (): Promise<boolean> => {
  try {
    const settings = await getSettings();
    
    if (!settings.autoLock) {
      return false;
    }

    const lastAuth = await getLastAuthTime();
    const now = Date.now();
    const timeoutMs = settings.autoLockTimeout * 60 * 1000;

    return now - lastAuth > timeoutMs;
  } catch (error) {
    console.error('Failed to check lock status:', error);
    return true; // Fail secure
  }
};

/**
 * Clear authentication state (logout)
 */
export const clearAuthState = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.LAST_AUTH);
  } catch (error) {
    console.error('Failed to clear auth state:', error);
  }
};

// ========== Combined Authentication ==========

/**
 * Authenticate with preferred method
 */
export const authenticate = async (
  promptMessage = 'Authenticate to continue'
): Promise<AuthResult> => {
  try {
    const settings = await getSettings();

    // Try biometric first if enabled
    if (settings.biometricEnabled) {
      const capability = await checkBiometricCapability();
      
      if (capability.available) {
        return await authenticateWithBiometrics(promptMessage);
      }
    }

    // Fall back to PIN if enabled
    if (settings.pinEnabled) {
      // PIN authentication requires UI input, so return a flag
      return {
        success: false,
        error: 'PIN_REQUIRED',
        method: 'pin',
      };
    }

    // No authentication required
    await updateLastAuthTime();
    return { success: true, method: 'none' };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
};

/**
 * Enable biometric authentication
 */
export const enableBiometric = async (): Promise<boolean> => {
  try {
    const capability = await checkBiometricCapability();
    
    if (!capability.available) {
      throw new Error('Biometric authentication not available');
    }

    // Test biometric authentication
    const result = await authenticateWithBiometrics(
      'Verify your identity to enable biometric authentication'
    );

    if (!result.success) {
      throw new Error('Biometric verification failed');
    }

    await saveSettings({ biometricEnabled: true });
    return true;
  } catch (error) {
    console.error('Failed to enable biometric:', error);
    throw error;
  }
};

/**
 * Disable biometric authentication
 */
export const disableBiometric = async (): Promise<void> => {
  await saveSettings({ biometricEnabled: false });
};

// ========== Security Utilities ==========

/**
 * Validate PIN format
 */
export const validatePin = (pin: string): { valid: boolean; error?: string } => {
  if (pin.length < 4) {
    return { valid: false, error: 'PIN must be at least 4 digits' };
  }

  if (pin.length > 8) {
    return { valid: false, error: 'PIN must be at most 8 digits' };
  }

  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only numbers' };
  }

  // Check for weak PINs
  const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
  if (weakPins.includes(pin)) {
    return { valid: false, error: 'PIN is too weak. Please choose a different PIN' };
  }

  return { valid: true };
};

/**
 * Get security status
 */
export const getSecurityStatus = async () => {
  const [settings, biometricCapability, pinSetup, lastAuth] = await Promise.all([
    getSettings(),
    checkBiometricCapability(),
    isPinSetup(),
    getLastAuthTime(),
  ]);

  return {
    biometricAvailable: biometricCapability.available,
    biometricType: biometricCapability.type,
    biometricEnabled: settings.biometricEnabled,
    pinEnabled: settings.pinEnabled,
    pinSetup,
    autoLock: settings.autoLock,
    autoLockTimeout: settings.autoLockTimeout,
    lastAuthTime: lastAuth,
    locked: await shouldLock(),
  };
};
