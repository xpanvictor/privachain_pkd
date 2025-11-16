import { KeyDerivationPath, SecureWalletData, WalletInfo, WalletKeys } from "@/types";
import Keyring from "@polkadot/keyring";
import { hexToU8a, stringToU8a, u8aConcat, u8aToHex } from "@polkadot/util";
import { blake2AsHex, blake2AsU8a, mnemonicGenerate, mnemonicToMiniSecret, mnemonicValidate, randomAsU8a } from "@polkadot/util-crypto";
import * as Keychain from "react-native-keychain";



// constants
const makeKeyring = () => new Keyring({ type: 'sr25519' });

const KEY_DERIVATION_PATHS: KeyDerivationPath = {
  spending: "m/44'/354'/0'/0/0",
  viewing: "m/44'/354'/0'/1/0",
  nullifier: "m/44'/354'/0'/2/0",
};

const KEYCHAIN_CONFIG = {
  service: 'zkprivacy.wallet',
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
} as const;







  const deriveKey = (seed: Uint8Array, path: string): Uint8Array => {
    const pathBytes = new TextEncoder().encode(path);
    return blake2AsU8a(new Uint8Array([...seed, ...pathBytes]), 256);
  };


  const derivePublicKey = (privateKey: Uint8Array): string => {
    const publicKey = blake2AsU8a(privateKey, 256);
    return u8aToHex(publicKey);
  };




// Create all keys from seed
  const createKeysFromSeed = (seed: Uint8Array): {
  spendingKey: Uint8Array;
  viewingKey: Uint8Array;
  nullifierKey: Uint8Array;
  publicSpendingKey: string;
} => {
  const spendingKey = deriveKey(seed, KEY_DERIVATION_PATHS.spending);
  const viewingKey = deriveKey(seed, KEY_DERIVATION_PATHS.viewing);
  const nullifierKey = deriveKey(seed, KEY_DERIVATION_PATHS.nullifier);
  const publicSpendingKey = derivePublicKey(spendingKey);

  return {
    spendingKey,
    viewingKey,
    nullifierKey,
    publicSpendingKey,
  };
};


/**
 * Get address from seed
 */
const getAddressFromSeed = (seed: Uint8Array): string => {
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
  const pair = keyring.addFromSeed(seed);
  return pair.address;
};



/**
 * Serialize wallet data for storage
 */
const serializeWalletData = (
  mnemonic: string,
  spendingKey: Uint8Array,
  viewingKey: Uint8Array,
  nullifierKey: Uint8Array
): string => {
  const walletData: SecureWalletData = {
    mnemonic,
    spendingKey: u8aToHex(spendingKey),
    viewingKey: u8aToHex(viewingKey),
    nullifierKey: u8aToHex(nullifierKey),
    createdAt: Date.now(),
  };
  return JSON.stringify(walletData);
};




/**
 * Deserialize wallet data from storage
 */
const deserializeWalletData = (data: string): SecureWalletData => {
  return JSON.parse(data) as SecureWalletData;
}

/**
 * Create WalletKeys object
 */
const createWalletKeys = (
  mnemonic: string,
  address: string,
  spendingKey: string,
  viewingKey: string,
  nullifierKey: string,
  publicSpendingKey: string
): WalletKeys => ({
  mnemonic,
  address,
  spendingKey,
  viewingKey,
  nullifierKey,
  publicSpendingKey,
});





/**
 * Store wallet data securely in keychain
 */
const storeInKeychain = async (serializedData: string): Promise<boolean> => {
  await Keychain.setGenericPassword('wallet', serializedData, KEYCHAIN_CONFIG);
  return true;
};

/**
 * Retrieve wallet data from keychain
 */
const retrieveFromKeychain = async (): Promise<string | null> => {
  const credentials = await Keychain.getGenericPassword({
    service: KEYCHAIN_CONFIG.service,
  });
  
  return credentials ? credentials.password : null;
};

/**
 * Delete wallet data from keychain
 */
const deleteFromKeychain = async (): Promise<boolean> => {
  return await Keychain.resetGenericPassword({
    service: KEYCHAIN_CONFIG.service,
  });
};

/**
 * Check if keychain has wallet data
 */
const hasKeychainData = async (): Promise<boolean> => {
  const credentials = await Keychain.getGenericPassword({
    service: KEYCHAIN_CONFIG.service,
  });
  return credentials !== false;
};



/**
 * Generate a new privacy wallet with all required keys
 */
export const generateWallet = async (): Promise<WalletKeys> => {
  // Generate mnemonic
  const mnemonic = mnemonicGenerate(12);
  const seed = mnemonicToMiniSecret(mnemonic);
  
  // Derive all keys
  const { spendingKey, viewingKey, nullifierKey, publicSpendingKey } = 
    createKeysFromSeed(seed);
  
  // Get address
  const address = getAddressFromSeed(seed);
  
  // Serialize and store
  const serializedData = serializeWalletData(
    mnemonic,
    spendingKey,
    viewingKey,
    nullifierKey
  );
  await storeInKeychain(serializedData);
  
  // Return wallet keys
  return createWalletKeys(
    mnemonic,
    address,
    u8aToHex(spendingKey),
    u8aToHex(viewingKey),
    u8aToHex(nullifierKey),
    publicSpendingKey
  );
};


/**
 * Restore wallet from mnemonic phrase
 */
export const restoreWallet = async (mnemonic: string): Promise<WalletKeys> => {
  // Validate mnemonic
  if (!mnemonicValidate(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }
  
  const seed = mnemonicToMiniSecret(mnemonic);
  
  // Derive all keys
  const { spendingKey, viewingKey, nullifierKey, publicSpendingKey } = 
    createKeysFromSeed(seed);
  
  // Get address
  const address = getAddressFromSeed(seed);
  
  // Serialize and store
  const serializedData = serializeWalletData(
    mnemonic,
    spendingKey,
    viewingKey,
    nullifierKey
  );
  await storeInKeychain(serializedData);
  
  // Return wallet keys
  return createWalletKeys(
    mnemonic,
    address,
    u8aToHex(spendingKey),
    u8aToHex(viewingKey),
    u8aToHex(nullifierKey),
    publicSpendingKey
  );
};

/**
 * Retrieve stored wallet keys
 */
export const getWalletKeys = async (): Promise<WalletKeys | null> => {
  try {
    const serializedData = await retrieveFromKeychain();
    
    if (!serializedData) {
      return null;
    }
    
    const walletData = deserializeWalletData(serializedData);
    const seed = mnemonicToMiniSecret(walletData.mnemonic);
    const address = getAddressFromSeed(seed);
    const publicSpendingKey = derivePublicKey(hexToU8a(walletData.spendingKey));
    
    return createWalletKeys(
      walletData.mnemonic,
      address,
      walletData.spendingKey,
      walletData.viewingKey,
      walletData.nullifierKey,
      publicSpendingKey
    );
  } catch (error) {
    console.error('Failed to retrieve wallet keys:', error);
    return null;
  }
};

/**
 * Check if wallet exists
 */
export const hasWallet = async (): Promise<boolean> => {
  return await hasKeychainData();
};

/**
 * Delete wallet (caution!)
 */
export const deleteWallet = async (): Promise<boolean> => {
  return await deleteFromKeychain();
};

/**
 * Export wallet for backup
 */
export const exportWallet = async (): Promise<string> => {
  const keys = await getWalletKeys();
  
  if (!keys) {
    throw new Error('No wallet found');
  }
  
  return JSON.stringify({
    version: 1,
    mnemonic: keys.mnemonic,
    createdAt: Date.now(),
  });
};

/**
 * Import wallet from backup
 */
export const importWallet = async (backupData: string): Promise<WalletKeys> => {
  const backup = JSON.parse(backupData);
  
  if (backup.version !== 1) {
    throw new Error('Unsupported backup version');
  }
  
  return await restoreWallet(backup.mnemonic);
};

/**
 * Generate random secret for commitments
 */
export const generateSecret = (): string => {
  return u8aToHex(randomAsU8a(32));
};

/**
 * Validate mnemonic phrase
 */
export const validateMnemonic = (mnemonic: string): boolean => {
  return mnemonicValidate(mnemonic);
};
