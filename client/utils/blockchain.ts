/**
 * Blockchain Integration with Zero-Knowledge Proofs
 * Integrates with the parachain's zk_privacy pallet
 */

import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { initializeProver, generateProof, verifyProof, getCircuitInfo, debugCircuit } from './zk/prover';
import { prepareCircuitInput, validateCircuitInput } from './zk/circuit-adapter';
import type { ApplicationNote, MerkleProofData } from './zk/circuit-adapter';
import {
  selectNotesForTransfer,
  markNotesSpent,
  addReceivedNotes,
  createNote,
  updateNoteLeafIndex,
  getNoteStats,
} from './zk/notes';

// Types for chain interaction
export interface ProofData {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
}

/**
 * Initialize ZK system on app startup
 * Must be called before any ZK operations
 */
export const initializeZK = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing ZK system...');
    await initializeProver();
    
    const info = getCircuitInfo();
    console.log('📊 Circuit Status:', info);
    
    if (!info.hasProvingKey) {
      console.warn('⚠️  WARNING: Proving key not found!');
      console.warn('   Proof generation will not work.');
      console.warn('   Steps to fix:');
      console.warn('   1. cd parachain/pallets/zk_privacy/src/circom/');
      console.warn('   2. Run trusted setup (see README.md)');
      console.warn('   3. npm run copy-zk-assets');
    }
    
    // Print note statistics
    const stats = getNoteStats();
    console.log('💰 Wallet Status:');
    console.log(`   Spendable notes: ${stats.spendable}`);
    console.log(`   Total balance: ${stats.totalBalance}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize ZK system:', error);
    throw error;
  }
};

/**
 * Get Merkle proof for a commitment from chain or indexer
 * TODO: Implement actual query to chain/indexer
 */
export const getMerkleProof = async (
  api: ApiPromise,
  commitment: string,
  leafIndex: number
): Promise<MerkleProofData> => {
  // TODO: Query actual Merkle tree from chain storage or indexer
  // For now, return mock data for testing
  
  try {
    // Example query (uncomment when chain storage is ready):
    // const root = await api.query.zkPrivacy.merkleRoot();
    // const path = await api.query.zkPrivacy.merklePath(leafIndex);
    
    console.warn('⚠️  Using mock Merkle proof (TODO: implement chain query)');
    
    return {
      root: '0', // TODO: Get actual root
      pathElements: Array(20).fill('0'), // TODO: Get actual path
      pathIndices: Array(20).fill(0), // TODO: Get actual indices
    };
  } catch (error) {
    console.error('Failed to get Merkle proof:', error);
    throw error;
  }
};

/**
 * Execute a private transfer
 * Selects notes, generates proof, and submits to chain
 */
export const executePrivateTransfer = async (params: {
  api: ApiPromise;
  signer: any;
  recipientPubkey: bigint;
  amount: bigint;
  myPubkey: bigint;
}): Promise<string> => {
  
  const { api, signer, recipientPubkey, amount, myPubkey } = params;

  console.log('💸 Executing private transfer...');
  console.log(`   Amount: ${amount}`);
  console.log(`   To: ${recipientPubkey.toString().slice(0, 10)}...`);

  try {
    // 1. Select input notes (coin selection)
    console.log('📝 Selecting notes...');
    const { selectedNotes, totalAmount, changeAmount } = selectNotesForTransfer(amount, 4);
    
    console.log(`   Selected ${selectedNotes.length} notes totaling ${totalAmount}`);
    if (changeAmount > 0n) {
      console.log(`   Change: ${changeAmount}`);
    }

    // 2. Create output notes
    const outputNotes: ApplicationNote[] = [
      createNote(amount, recipientPubkey), // Payment to recipient
    ];

    // Add change output if needed
    if (changeAmount > 0n) {
      outputNotes.push(createNote(changeAmount, myPubkey)); // Change back to self
    }

    console.log(`   Created ${outputNotes.length} output notes`);

    // 3. Get Merkle proofs for inputs
    console.log('🌲 Fetching Merkle proofs...');
    const merkleProofs = await Promise.all(
      selectedNotes.map(note => getMerkleProof(api, note.commitment, note.leafIndex!))
    );

    // 4. Prepare circuit input (adapts to circuit format)
    const { circuitInput, nullifiers, outCommitments } = prepareCircuitInput(
      selectedNotes.map(n => ({
        amount: n.amount,
        secret: n.secret,
        recipient: n.recipient,
        leafIndex: n.leafIndex,
        commitment: n.commitment,
      })),
      outputNotes.map(o => ({
        amount: o.amount,
        secret: o.secret,
        recipient: o.recipient,
      })),
      merkleProofs
    );

    // 5. Validate circuit input
    const validation = validateCircuitInput(circuitInput);
    if (!validation.valid) {
      throw new Error(`Invalid circuit input: ${validation.errors.join(', ')}`);
    }

    // 6. Generate ZK proof
    console.log('🔐 Generating zero-knowledge proof...');
    const { proof, publicSignals } = await generateProof(circuitInput);

    // 7. Verify proof locally (optional)
    console.log('✅ Verifying proof locally...');
    const isValid = await verifyProof(proof, publicSignals);
    if (!isValid) {
      throw new Error('Local proof verification failed');
    }

    // 8. Format proof for chain submission
    const proofForChain: ProofData = {
      a: [proof.pi_a[0].toString(), proof.pi_a[1].toString()],
      b: [
        [proof.pi_b[0][0].toString(), proof.pi_b[0][1].toString()],
        [proof.pi_b[1][0].toString(), proof.pi_b[1][1].toString()],
      ],
      c: [proof.pi_c[0].toString(), proof.pi_c[1].toString()],
    };

    // 9. Submit transaction to chain
    console.log('📤 Submitting transaction to chain...');
    
    // TODO: Adjust extrinsic format to match actual pallet API
    const tx = api.tx.zkPrivacy.privateTransfer({
      nullifiers,
      commitments: outCommitments,
      proof: proofForChain,
      publicSignals,
    });

    return new Promise((resolve, reject) => {
      tx.signAndSend(signer, (result: any) => {
        const { status, events, dispatchError } = result;
        
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            const { docs, name, section } = decoded;
            reject(new Error(`${section}.${name}: ${docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
          return;
        }

        if (status.isInBlock) {
          console.log(`✅ Transaction included in block: ${status.asInBlock}`);
          
          // Mark input notes as spent
          markNotesSpent(selectedNotes.map(n => n.commitment));
          
          // Add output notes (will need leaf indices from events)
          const newNotes = outputNotes.map((note) => ({
            commitment: note.commitment!,
            amount: note.amount,
            secret: note.secret,
            recipient: note.recipient,
            leafIndex: undefined, // TODO: Extract from chain events
            spent: false,
          }));
          addReceivedNotes(newNotes);

          resolve(status.asInBlock.toString());
        } else if (status.isFinalized) {
          console.log(`🎉 Transaction finalized: ${status.asFinalized}`);
        }
      }).catch(reject);
    });

  } catch (error) {
    console.error('❌ Private transfer failed:', error);
    throw error;
  }
};

/**
 * Deposit funds into the private pool
 * Converts public balance to private note
 */
export const depositToPrivatePool = async (params: {
  api: ApiPromise;
  signer: any;
  amount: bigint;
  recipientPubkey: bigint;
}): Promise<string> => {
  
  const { api, signer, amount, recipientPubkey } = params;

  console.log('💰 Depositing to private pool...');
  console.log(`   Amount: ${amount}`);

  try {
    // Create note for this deposit
    const note = createNote(amount, recipientPubkey);
    
    console.log(`   Commitment: ${note.commitment.slice(0, 20)}...`);

    // Submit deposit transaction
    // TODO: Adjust extrinsic format to match actual pallet API
    const tx = api.tx.zkPrivacy.deposit(amount.toString(), note.commitment);

    return new Promise((resolve, reject) => {
      tx.signAndSend(signer, (result: any) => {
        const { status, events, dispatchError } = result;
        
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            const { docs, name, section } = decoded;
            reject(new Error(`${section}.${name}: ${docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
          return;
        }

        if (status.isInBlock) {
          console.log(`✅ Deposit in block: ${status.asInBlock}`);
          
          // Extract leaf index from events
          // TODO: Parse actual event data
          const leafIndex = 0; // Placeholder
          
          // Save note with leaf index
          updateNoteLeafIndex(note.commitment, leafIndex);
          
          resolve(status.asInBlock.toString());
        }
      }).catch(reject);
    });

  } catch (error) {
    console.error('❌ Deposit failed:', error);
    throw error;
  }
};

/**
 * Withdraw from private pool to public balance
 */
export const withdrawFromPrivatePool = async (params: {
  api: ApiPromise;
  signer: any;
  note: ApplicationNote;
  recipient: string;
  merkleProof: MerkleProofData;
}): Promise<string> => {
  
  const { api, signer, note, recipient, merkleProof } = params;

  console.log('💸 Withdrawing from private pool...');
  console.log(`   Amount: ${note.amount}`);

  try {
    // This would use a simpler circuit for withdrawal
    // TODO: Implement withdrawal circuit if different from transfer
    
    throw new Error('Withdraw not implemented yet');

  } catch (error) {
    console.error('❌ Withdrawal failed:', error);
    throw error;
  }
};

/**
 * Connect to parachain node
 */
export const connectApi = async (endpoint: string): Promise<ApiPromise> => {
  console.log(`🔌 Connecting to ${endpoint}...`);
  const provider = new WsProvider(endpoint);
  const api = await ApiPromise.create({ provider });
  console.log('✅ Connected to parachain');
  return api;
};

/**
 * Create signer from URI (for testing)
 */
export const makeSignerFromUri = (uri = '//Alice') => {
  const keyring = new Keyring({ type: 'sr25519' });
  return keyring.addFromUri(uri);
};

/**
 * Disconnect from parachain
 */
export const disconnectApi = async (api?: ApiPromise) => {
  try {
    if (api && api.disconnect) {
      await api.disconnect();
      console.log('👋 Disconnected from parachain');
    }
  } catch (err) {
    console.warn('Failed to disconnect:', err);
  }
};

/**
 * Debug ZK circuit status
 */
export const debugZKCircuit = (): void => {
  debugCircuit();
};

/**
 * Get wallet statistics
 */
export const getWalletStats = () => {
  return getNoteStats();
};
