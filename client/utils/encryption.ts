import { hexToU8a, u8aToHex } from '@polkadot/util';
import * as uc from '@polkadot/util-crypto';

// ========== Types ==========

export interface EncryptedNote {
  ciphertext: string;
  nonce: string
  ephemeralPublicKey: string;
}

export interface DecryptedNote {
  value: string;
  secret: string;
  sender: string;
  memo?: string;
  commitment: string;
  assetId?: string;
}

export interface StealthAddress {
  stealthAddress: string;
  ephemeralKey: string;
}

export interface ViewingResult {
  canView: boolean;
  value?: string;
  commitment?: string;
}

// ========== Pure Functions ==========

/**
 * Serialize note to bytes
 */
const serializeNote = (note: DecryptedNote): Uint8Array => {
  const data = {
    value: note.value,
    secret: note.secret,
    sender: note.sender,
    memo: note.memo || '',
    commitment: note.commitment,
    assetId: note.assetId || '0',
  };
  
  const jsonString = JSON.stringify(data);
  return new TextEncoder().encode(jsonString);
};

/**
 * Deserialize note from bytes
 */
const deserializeNote = (data: Uint8Array): DecryptedNote => {
  const jsonString = new TextDecoder().decode(data);
  const parsed = JSON.parse(jsonString);
  
  return {
    value: parsed.value,
    secret: parsed.secret,
    sender: parsed.sender,
    memo: parsed.memo || undefined,
    commitment: parsed.commitment,
    assetId: parsed.assetId !== '0' ? parsed.assetId : undefined,
  };
};

/**
 * Generate ephemeral keypair
 */
const generateEphemeralKeypair = () => {
  const ephemeralSecret = (uc as any).randomAsU8a(32);

  // Try a few historically-used export names for deriving a nacl keypair
  const anyUc = uc as any;
  const keypairFromSecret = anyUc.naclBoxPairFromSecret
    || anyUc.naclKeypairFromSeed
    || anyUc.naclKeypairFromSecret
    || anyUc.naclKeyPairFromSeed
    || anyUc.naclKeypairFromSeedRaw
    || anyUc.naclKeypairFromSeed;

  if (typeof keypairFromSecret === 'function') {
    return keypairFromSecret(ephemeralSecret);
  }

  // Fallback: if no helper available, try to use nacl from util-crypto directly
  if (anyUc.naclBoxPair) {
    return anyUc.naclBoxPair(ephemeralSecret);
  }

  throw new Error('No nacl keypair-from-secret function available in @polkadot/util-crypto');
};

/**
 * Create encrypted note object
 */
const createEncryptedNote = (
  encrypted: Uint8Array,
  nonce: Uint8Array,
  ephemeralPublicKey: Uint8Array
): EncryptedNote => ({
  ciphertext: u8aToHex(encrypted),
  nonce: u8aToHex(nonce),
  ephemeralPublicKey: u8aToHex(ephemeralPublicKey),
});

/**
 * Compute shared secret using ECDH
 */
const computeSharedSecret = (
  privateKey: Uint8Array,
  publicKey: Uint8Array
): Uint8Array => {
  return (uc as any).blake2AsU8a(new Uint8Array([...privateKey, ...publicKey]), 256);
};

/**
 * Derive one-time stealth address
 */
const deriveStealthAddress = (
  spendPubKey: Uint8Array,
  sharedSecret: Uint8Array
): Uint8Array => {
  return (uc as any).blake2AsU8a(new Uint8Array([...spendPubKey, ...sharedSecret]), 256);
};

// ========== Main API Functions ==========

/**
 * Encrypt note for recipient
 */
export const encryptNote = (
  note: DecryptedNote,
  recipientPublicKey: string
): EncryptedNote => {
  const ephemeralKeypair = generateEphemeralKeypair();
  const noteData = serializeNote(note);
  const recipientPubKey = hexToU8a(recipientPublicKey);

  const { encrypted, nonce } = (uc as any).naclEncrypt(
    noteData,
    ephemeralKeypair.secretKey,
    recipientPubKey
  );
  
  return createEncryptedNote(encrypted, nonce, ephemeralKeypair.publicKey);
};

/**
 * Decrypt note using recipient's private key
 */
export const decryptNote = (
  encryptedNote: EncryptedNote,
  recipientPrivateKey: string
): DecryptedNote | null => {
  try {
  const ciphertext = hexToU8a(encryptedNote.ciphertext);
  const nonce = hexToU8a(encryptedNote.nonce);
  const ephemeralPubKey = hexToU8a(encryptedNote.ephemeralPublicKey);
  const privateKey = hexToU8a(recipientPrivateKey);
    
  const decrypted = (uc as any).naclDecrypt(ciphertext, nonce, ephemeralPubKey, privateKey);
    
    return decrypted ? deserializeNote(decrypted) : null;
  } catch (error) {
    console.error('Note decryption failed:', error);
    return null;
  }
};

/**
 * Encrypt note for multiple recipients
 */
export const encryptNoteForMultiple = (
  note: DecryptedNote,
  recipientPublicKeys: string[]
): EncryptedNote[] => {
  return recipientPublicKeys.map(pubKey => encryptNote(note, pubKey));
};

/**
 * Try to decrypt note with viewing key
 */
export const tryDecryptWithViewingKey = (
  encryptedNote: EncryptedNote,
  viewingKey: string
): ViewingResult => {
  try {
    const decrypted = decryptNote(encryptedNote, viewingKey);
    
    if (decrypted) {
      return {
        canView: true,
        value: decrypted.value,
        commitment: decrypted.commitment,
      };
    }
  } catch (error) {
    // Not meant for this viewing key
  }
  
  return { canView: false };
};

/**
 * Generate one-time stealth address
 */
export const generateStealthAddress = (
  recipientSpendKey: string,
  recipientViewKey: string
): StealthAddress => {
  const ephemeralSecret = (uc as any).randomAsU8a(32);
  const ephemeralKeypair = (() => {
    const anyUc = uc as any;
    const keypairFromSecret = anyUc.naclBoxPairFromSecret
      || anyUc.naclKeypairFromSeed
      || anyUc.naclKeypairFromSecret
      || anyUc.naclKeyPairFromSeed
      || anyUc.naclKeypairFromSeedRaw
      || anyUc.naclKeypairFromSeed;

    if (typeof keypairFromSecret === 'function') {
      return keypairFromSecret(ephemeralSecret);
    }

    if (anyUc.naclBoxPair) {
      return anyUc.naclBoxPair(ephemeralSecret);
    }

    throw new Error('No nacl keypair-from-secret function available in @polkadot/util-crypto');
  })();
  
  const recipientSpendPubKey = hexToU8a(recipientSpendKey);
  const sharedSecret = computeSharedSecret(ephemeralSecret, recipientSpendPubKey);
  
  const stealthAddress = deriveStealthAddress(recipientSpendPubKey, sharedSecret);
  
  return {
    stealthAddress: u8aToHex(stealthAddress),
    ephemeralKey: u8aToHex(ephemeralKeypair.publicKey),
  };
};

/**
 * Check if address belongs to recipient (using viewing key)
 */
export const checkStealthAddress = (
  stealthAddress: string,
  ephemeralKey: string,
  recipientViewKey: string,
  recipientSpendKey: string
): boolean => {
  const sharedSecret = computeSharedSecret(
    hexToU8a(recipientViewKey),
    hexToU8a(ephemeralKey)
  );
  
  const expectedAddress = deriveStealthAddress(
    hexToU8a(recipientSpendKey),
    sharedSecret
  );
  
  return u8aToHex(expectedAddress) === stealthAddress;
};

// ========== Utility Functions ==========

/**
 * Generate random secret for commitments
 */
export const generateSecret = (): string => {
  return u8aToHex((uc as any).randomAsU8a(32));
};

/**
 * Generate random memo encryption key
 */
export const generateMemoKey = (): string => {
  return u8aToHex((uc as any).randomAsU8a(32));
};

/**
 * Validate hex string
 */
export const isValidHex = (hex: string): boolean => {
  return /^0x[0-9a-fA-F]+$/.test(hex);
};

/**
 * Batch encrypt notes (useful for multi-output transactions)
 */
export const batchEncryptNotes = (
  notes: DecryptedNote[],
  recipients: string[]
): EncryptedNote[] => {
  if (notes.length !== recipients.length) {
    throw new Error('Notes and recipients arrays must have same length');
  }
  
  return notes.map((note, index) => encryptNote(note, recipients[index]));
};

/**
 * Batch decrypt notes (useful for scanning)
 */
export const batchDecryptNotes = (
  encryptedNotes: EncryptedNote[],
  privateKey: string
): (DecryptedNote | null)[] => {
  return encryptedNotes.map(note => decryptNote(note, privateKey));
};

/**
 * Filter successfully decrypted notes
 */
export const filterDecryptedNotes = (
  notes: (DecryptedNote | null)[]
): DecryptedNote[] => {
  return notes.filter((note): note is DecryptedNote => note !== null);
};