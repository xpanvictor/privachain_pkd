#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub use pallet::*;

#[frame::pallet]
pub mod pallet {
    use frame::{
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
    pub enum Error<T> {}

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
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let current_block = <frame_system::Pallet<T>>::block_number();

            // burn funds from user; fail if insufficient balance
            T::Currency::transfer(
                &who,
                &Self::account_id(),
                amount,
                ExistenceRequirement::KeepAlive,
            )?;

            // verify commitment
            // update commitment tree (root esp)

            // Emit event for the new commitment
            Self::deposit_event(Event::CommitmentAdded {
                commitment,
                index: NextLeafIndex::<T>::get(),
                timestamp: current_block,
            });

            Ok(())
        }
    }
}
