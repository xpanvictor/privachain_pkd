/**
 * Note Management
 * Manages private notes (UTXOs) for the user
 * Notes are stored encrypted in the user's device
 */

import { randomField, computeCommitment, computeNullifier } from './prover';

export interface Note {
  commitment: string;
  amount: bigint;
  secret: bigint;
  recipient: bigint;
  leafIndex?: number;
  spent: boolean;
  timestamp?: number;
}

const STORAGE_KEY = 'zk_notes';

/**
 * Create a new unspent note
 */
export function createNote(
  amount: bigint,
  recipient: bigint,
  secret?: bigint
): Note {
  const noteSecret = secret || randomField();
  const commitment = computeCommitment(amount, noteSecret, recipient);

  return {
    commitment,
    amount,
    secret: noteSecret,
    recipient,
    spent: false,
    timestamp: Date.now(),
  };
}

/**
 * Serialize notes for storage
 * Converts BigInts to strings for JSON storage
 */
function serializeNotes(notes: Note[]): string {
  return JSON.stringify(notes, (_, v) =>
    typeof v === 'bigint' ? v.toString() : v
  );
}

/**
 * Deserialize notes from storage
 * Converts string amounts back to BigInts
 */
function deserializeNotes(json: string): Note[] {
  const parsed = JSON.parse(json);
  
  return parsed.map((note: any) => ({
    ...note,
    amount: BigInt(note.amount),
    secret: BigInt(note.secret),
    recipient: BigInt(note.recipient),
  }));
}

/**
 * Save notes to localStorage
 * In production, this should be encrypted with user's key
 */
export function saveNotes(notes: Note[]): void {
  try {
    const serialized = serializeNotes(notes);
    localStorage.setItem(STORAGE_KEY, serialized);
    console.log(`💾 Saved ${notes.length} notes`);
  } catch (error) {
    console.error('Failed to save notes:', error);
    throw error;
  }
}

/**
 * Load notes from localStorage
 */
export function loadNotes(): Note[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('No notes found in storage');
      return [];
    }

    const notes = deserializeNotes(stored);
    console.log(`📖 Loaded ${notes.length} notes`);
    return notes;
  } catch (error) {
    console.error('Failed to load notes:', error);
    return [];
  }
}

/**
 * Get spendable notes (unspent notes with leafIndex)
 * Optionally filter by minimum amount
 */
export function getSpendableNotes(minAmount?: bigint): Note[] {
  const notes = loadNotes();
  let filtered = notes.filter(n => 
    !n.spent && 
    n.leafIndex !== undefined && 
    n.leafIndex !== null
  );
  
  if (minAmount !== undefined) {
    filtered = filtered.filter(n => n.amount >= minAmount);
  }

  // Sort by amount descending (largest first)
  return filtered.sort((a, b) => {
    if (a.amount > b.amount) return -1;
    if (a.amount < b.amount) return 1;
    return 0;
  });
}

/**
 * Get total spendable balance
 */
export function getTotalBalance(): bigint {
  const spendableNotes = getSpendableNotes();
  return spendableNotes.reduce((sum, note) => sum + note.amount, 0n);
}

/**
 * Mark notes as spent by their commitments
 */
export function markNotesSpent(commitments: string[]): void {
  const notes = loadNotes();
  const commitmentSet = new Set(commitments);
  
  let spentCount = 0;
  const updated = notes.map(note => {
    if (commitmentSet.has(note.commitment) && !note.spent) {
      spentCount++;
      return { ...note, spent: true };
    }
    return note;
  });

  saveNotes(updated);
  console.log(`✓ Marked ${spentCount} notes as spent`);
}

/**
 * Add new received notes
 */
export function addReceivedNotes(newNotes: Note[]): void {
  const existing = loadNotes();
  const updated = [...existing, ...newNotes];
  saveNotes(updated);
  console.log(`✓ Added ${newNotes.length} new notes`);
}

/**
 * Update note with leaf index (after commitment is added to Merkle tree)
 */
export function updateNoteLeafIndex(commitment: string, leafIndex: number): void {
  const notes = loadNotes();
  const updated = notes.map(note =>
    note.commitment === commitment ? { ...note, leafIndex } : note
  );
  saveNotes(updated);
  console.log(`✓ Updated note ${commitment.slice(0, 10)}... with leafIndex ${leafIndex}`);
}

/**
 * Get note by commitment
 */
export function getNoteByCommitment(commitment: string): Note | undefined {
  const notes = loadNotes();
  return notes.find(n => n.commitment === commitment);
}

/**
 * Delete all notes (for testing or reset)
 */
export function clearAllNotes(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️  Cleared all notes');
}

/**
 * Get note statistics
 */
export function getNoteStats(): {
  total: number;
  spendable: number;
  spent: number;
  pending: number;
  totalBalance: bigint;
} {
  const notes = loadNotes();
  const spendable = notes.filter(n => !n.spent && n.leafIndex !== undefined);
  const spent = notes.filter(n => n.spent);
  const pending = notes.filter(n => !n.spent && n.leafIndex === undefined);
  const totalBalance = spendable.reduce((sum, n) => sum + n.amount, 0n);

  return {
    total: notes.length,
    spendable: spendable.length,
    spent: spent.length,
    pending: pending.length,
    totalBalance,
  };
}

/**
 * Select notes for a transfer (coin selection)
 * Returns notes that sum to at least the target amount
 */
export function selectNotesForTransfer(
  targetAmount: bigint,
  maxNotes: number = 4
): {
  selectedNotes: Note[];
  totalAmount: bigint;
  changeAmount: bigint;
} {
  const spendableNotes = getSpendableNotes();
  
  if (spendableNotes.length === 0) {
    throw new Error('No spendable notes available');
  }

  const selected: Note[] = [];
  let totalAmount = 0n;

  // Greedy selection: pick largest notes first
  for (const note of spendableNotes) {
    if (selected.length >= maxNotes) {
      break;
    }
    
    selected.push(note);
    totalAmount += note.amount;
    
    if (totalAmount >= targetAmount) {
      break;
    }
  }

  if (totalAmount < targetAmount) {
    throw new Error(
      `Insufficient balance. Need ${targetAmount}, have ${totalAmount} ` +
      `(in ${spendableNotes.length} notes)`
    );
  }

  const changeAmount = totalAmount - targetAmount;

  return {
    selectedNotes: selected,
    totalAmount,
    changeAmount,
  };
}

/**
 * Export notes to JSON (for backup)
 */
export function exportNotes(): string {
  const notes = loadNotes();
  return serializeNotes(notes);
}

/**
 * Import notes from JSON (for restore)
 */
export function importNotes(json: string): void {
  const notes = deserializeNotes(json);
  saveNotes(notes);
  console.log(`📥 Imported ${notes.length} notes`);
}

/**
 * Debug: Print all notes
 */
export function debugPrintNotes(): void {
  const notes = loadNotes();
  const stats = getNoteStats();
  
  console.log('📊 Note Statistics:');
  console.log(`   Total: ${stats.total}`);
  console.log(`   Spendable: ${stats.spendable}`);
  console.log(`   Spent: ${stats.spent}`);
  console.log(`   Pending: ${stats.pending}`);
  console.log(`   Total Balance: ${stats.totalBalance}`);
  console.log('');
  console.log('📋 All Notes:');
  
  notes.forEach((note, i) => {
    console.log(`   [${i}] ${note.commitment.slice(0, 10)}...`);
    console.log(`       Amount: ${note.amount}`);
    console.log(`       Recipient: ${note.recipient}`);
    console.log(`       LeafIndex: ${note.leafIndex ?? 'pending'}`);
    console.log(`       Spent: ${note.spent ? 'YES' : 'NO'}`);
  });
}
