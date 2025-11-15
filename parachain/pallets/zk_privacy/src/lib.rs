#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub use pallet::*;

#[frame::pallet]
pub mod pallet {
    use frame::prelude::*;

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    // Configuration trait for the pallet.
    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    }

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        CommitmentAdded {
            commitment: Vec<u8>,
            timestamp: BlockNumberFor<T>,
        },
        NullifierRevealed {
            nullifier: Vec<u8>,
            timestamp: BlockNumberFor<T>,
        },
    }

    #[pallet::error]
    pub enum Error<T> {}

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
        #[pallet::weight(0)]
        pub fn shield(origin: OriginFor<T>, commitment: Vec<u8>) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let current_block = <frame_system::Pallet<T>>::block_number();

            todo!("commitment creation");
            // Emit event for the new commitment
            Self::deposit_event(Event::CommitmentAdded {
                commitment,
                timestamp: current_block,
            });

            Ok(())
        }
    }
}
