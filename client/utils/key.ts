import { WalletInfo } from "@/types";
import Keyring from "@polkadot/keyring";
import { stringToU8a, u8aConcat } from "@polkadot/util";
import { blake2AsHex, mnemonicGenerate, mnemonicToMiniSecret } from "@polkadot/util-crypto";
import * as Keychain from "react-native-keychain";


const makeKeyring = () => new Keyring({ type: 'sr25519' });

/**
 * Deterministically derive an application 'spending' key from seed.
 * This is an app-level derived key (not necessarily BIP32). If you want
 * BIP32 / SLIP-0010 derivation, use a library for that.
 */
export const deriveSpendingKey = (seed: Uint8Array): string => {
  // use blake2 with a distinct salt so spending/viewing don't collide
  const salted = u8aConcat(seed, stringToU8a('APP/SPENDING'));
  // 256-bit digest => hex string
  return blake2AsHex(salted, 256);
};


/**
 * Deterministically derive an application 'viewing' key from seed.
 * Viewing key is derived separately so it cannot be used as spending material.
 */
export const deriveViewingKey = (seed: Uint8Array): string => {
  const salted = u8aConcat(seed, stringToU8a('APP/VIEWING'));
  return blake2AsHex(salted, 256);
};


/**
 * Pure function that turns a mnemonic into WalletInfo (except storage).
 * Does not perform I/O.
 */
export const walletFromMnemonic = (mnemonic: string): WalletInfo => {
  const seed = mnemonicToMiniSecret(mnemonic);
  const spendingKey = deriveSpendingKey(seed);
  const viewingKey = deriveViewingKey(seed);
  const kr = makeKeyring();
  const pair = kr.addFromSeed(seed); // mutates keyring (local only)
  const address = pair.address;
  return { mnemonic, address, spendingKey, viewingKey };
};


/**
 * Generate a new wallet (pure generation + side-effect to persist).
 * Returns the generated WalletInfo and persists the secret material to Keychain.
 */
export const generateWallet = async (): Promise<WalletInfo> => {
    const mnemonic = mnemonicGenerate();
    const wallet = walletFromMnemonic(mnemonic);
    // Persist to Keychain
    await Keychain.setGenericPassword('wallet', JSON.stringify({
      mnemonic: wallet.mnemonic,
      spendingKey: wallet.spendingKey,
      viewingKey: wallet.viewingKey,
    }), {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        service: 'com.example.app.wallet',
    });
    return wallet;

}


/**
 * Restore wallet from an existing mnemonic. Persist to secure storage as well.
 */
export const restoreWallet = async (mnemonic: string): Promise<WalletInfo> => {
  const wallet = walletFromMnemonic(mnemonic);

  // Optionally persist to secure storage
  await Keychain.setGenericPassword(
    'wallet',
    JSON.stringify({
      mnemonic: wallet.mnemonic,
      spendingKey: wallet.spendingKey,
      viewingKey: wallet.viewingKey,
    })
  );

  return wallet;
}

/**
 * Read the stored wallet from Keychain (if any).
 * Returns parsed WalletInfo-like object or null.
 */
export const getStoredWallet = async (): Promise<WalletInfo | null> => {
     const creds = await Keychain.getGenericPassword();
  if (!creds || !creds.password) return null;
  try {
    const parsed = JSON.parse(creds.password);
    // if address wasn't stored, regenerate from mnemonic
    if (parsed.mnemonic && !parsed.address) {
      const wallet = walletFromMnemonic(parsed.mnemonic);
      return { ...wallet, spendingKey: parsed.spendingKey ?? wallet.spendingKey, viewingKey: parsed.viewingKey ?? wallet.viewingKey };
    }
    return {
      mnemonic: parsed.mnemonic,
      address: parsed.address,
      spendingKey: parsed.spendingKey,
      viewingKey: parsed.viewingKey,
    } as WalletInfo;
  } catch (err) {
    // corrupted or unexpected format
    return null;
  }
}

/**
 * Delete the stored wallet from Keychain.
 */
export const deleteStoredWallet = async (): Promise<void> => {
    await Keychain.resetGenericPassword({
        service: 'com.example.app.wallet',
    });
}

/**
 * Clear stored wallet from Keychain.
 */
export const clearStoredWallet = async (): Promise<boolean> => {
  return Keychain.resetGenericPassword();
};