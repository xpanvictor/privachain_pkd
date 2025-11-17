#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub use pallet::*;

#[frame::pallet]
pub mod pallet {
    use core::ptr::null;

    use frame::{
        deps::sp_runtime::DispatchResult,
        prelude::{Blake2_128Concat, OptionQuery, PalletId, ValueQuery, *},
        traits::Currency,
    };

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    // Configuration trait for the pallet.
    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        type Currency: Currency<Self::AccountId>;
        type PalletId: Get<PalletId>;

        /// The type used for tracking the commitment index. Must be a valid integer type.
        type CommitmentIndexType: Member
            + Parameter
            + Default
            + Copy
            + MaybeSerializeDeserialize
            + CheckedAdd
            + CheckedSub
            + Saturating
            + From<u32>
            + MaxEncodedLen;

        #[pallet::constant]
        type MaxEncryptedNoteLength: Get<u32>;
    }

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        CommitmentAdded {
            commitment: Vec<u8>,
            index: T::CommitmentIndexType,
            timestamp: BlockNumberFor<T>,
            encrypted_note: T::Hash,
        },
        NullifierRevealed {
            nullifier: Vec<u8>,
            timestamp: BlockNumberFor<T>,
        },
    }

    // Helper types
    pub type BalanceFor<T> =
        <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

    // -- Storage layer
    // ----------------------------
    /// Amount of commitments
    #[pallet::storage]
    pub type NextLeafIndex<T: Config> = StorageValue<_, T::CommitmentIndexType, ValueQuery>;
    /// Commitments storage
    #[pallet::storage]
    pub type CommitmentRoot<T: Config> = StorageValue<_, T::Hash, ValueQuery>;
    /// NullifiersRevealed storage
    #[pallet::storage]
    pub type NullifierSet<T: Config> =
        StorageMap<_, Blake2_128Concat, T::Hash, BlockNumberFor<T>, OptionQuery>;
    // -----------------------------
    // ++ Storage layer

    #[pallet::error]
    pub enum Error<T> {
        /// Invalid txn
        InvalidTransaction,
        /// Mismatch in lengths of new commitments and encrypted notes
        CommitmentEncryptedNoteLengthMismatch,
        /// The nullifier has already been revealed (double spend attempt)
        NullifierAlreadyRevealed,
        /// Commitment verification failed
        CommitmentVerificationFailed,
    }

    // Internal helpers
    impl<T: Config> Pallet<T> {
        // -----------------------------
        /// Get the account ID for this pallet
        pub fn account_id() -> T::AccountId {
            T::PalletId::get().into_account_truncating()
        }

        // -----------------------------
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Shield a new note
        ///
        /// This takes from balance and creates a commitment: shielding an amount.
        ///
        /// Parameters:
        /// - `origin`: The account initiating the shielding.
        /// - `commitment`: The commitment representing the shielded note.
        ///
        /// Emits `CommitmentAdded` event upon success.
        #[pallet::call_index(0)]
        #[pallet::weight(100)]
        pub fn shield(
            origin: OriginFor<T>,
            amount: BalanceFor<T>, // todo: proper balance type
            commitment: Vec<u8>,
            encrypted_note: T::Hash,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let current_block = <frame_system::Pallet<T>>::block_number();

            // send funds to pool, ensure balance check
            T::Currency::transfer(
                &who,
                &Self::account_id(),
                amount,
                ExistenceRequirement::KeepAlive,
            )?;

            // todo: verify commitment proof: commitment value
            // todo: update commitment tree (root esp)

            // Emit event for the new commitment
            Self::deposit_event(Event::CommitmentAdded {
                commitment,
                index: NextLeafIndex::<T>::get(),
                timestamp: current_block,
                encrypted_note,
            });

            Ok(())
        }

        /// Make a private transfer
        ///
        /// Parameters:
        /// - `origin`: The account initiating the transfer.
        /// - `nullifier`: The nullifier revealing the spent note.
        /// - `new_commitments[]`: The new commitments created as a result of the transfer.
        /// - `encrypted_notes[]`: The encrypted notes corresponding to the new commitments.
        /// - ``
        ///
        /// Emits `NullifierRevealed` event upon success.
        /// Emits `CommitmentAdded` event for the new commitment.
        #[pallet::call_index(1)]
        #[pallet::weight(100)]
        pub fn private_transfer(
            origin: OriginFor<T>,
            nullifier: Vec<u8>,
            new_commitments: Vec<Vec<u8>>,
            encrypted_notes: Vec<T::Hash>,
        ) -> DispatchResult {
            ensure_signed(origin)?;
            // some confirmations
            ensure!(
                nullifier.is_empty() && new_commitments.is_empty() && encrypted_notes.is_empty(),
                Error::<T>::InvalidTransaction
            );
            ensure!(
                new_commitments.len() == encrypted_notes.len(),
                Error::<T>::CommitmentEncryptedNoteLengthMismatch
            );
            // run proofs verification
            // update nullifier set
            let current_block = <frame_system::Pallet<T>>::block_number();
            let nullifier_hash = T::Hashing::hash(&nullifier);
            if !NullifierSet::<T>::contains_key(nullifier_hash) {
                NullifierSet::<T>::insert(nullifier_hash, current_block);
            } else {
                return Err(Error::<T>::NullifierAlreadyRevealed.into());
            }
            // add new commitments to the tree
            for (commitment, encr_note) in new_commitments.iter().zip(encrypted_notes.iter()) {
                // todo: add commitment to tree // using merkle tree
                Self::deposit_event(Event::CommitmentAdded {
                    commitment: commitment.clone(),
                    index: NextLeafIndex::<T>::get(),
                    encrypted_note: *encr_note,
                    timestamp: current_block,
                });
                NextLeafIndex::<T>::mutate(|index| *index = index.saturating_add(1u32.into()));
            }

            Self::deposit_event(Event::NullifierRevealed {
                nullifier,
                timestamp: current_block,
            });
            Ok(())
        }

        #[pallet::call_index(2)]
        #[pallet::weight(100)]
        pub fn unshield(
            origin: OriginFor<T>,
            amount: BalanceFor<T>,
            nullifier: Vec<u8>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            // some confirmations
            ensure!(nullifier.is_empty(), Error::<T>::InvalidTransaction);
            // run proofs verification

            // update nullifier set
            let current_block = <frame_system::Pallet<T>>::block_number();
            let nullifier_hash = T::Hashing::hash(&nullifier);
            if !NullifierSet::<T>::contains_key(nullifier_hash) {
                NullifierSet::<T>::insert(nullifier_hash, current_block);
            } else {
                return Err(Error::<T>::NullifierAlreadyRevealed.into());
            }

            // release funds to user
            T::Currency::transfer(
                &Self::account_id(),
                &who,
                amount,
                ExistenceRequirement::KeepAlive,
            )?;

            Self::deposit_event(Event::NullifierRevealed {
                nullifier,
                timestamp: current_block,
            });

            Ok(())
        }
    }
}
