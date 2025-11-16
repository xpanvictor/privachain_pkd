use crate as privacy_pallet;
use frame::{prelude::*, runtime::prelude::*, testing_prelude::*};

type Block = frame_system::mocking::MockBlock<Test>;

// Configure a mock runtime to test the pallet.
#[frame_construct_runtime]
mod runtime {
    #[runtime::runtime]
    #[runtime::derive(
        RuntimeCall,
        RuntimeEvent,
        RuntimeError,
        RuntimeOrigin,
        RuntimeFreezeReason,
        RuntimeHoldReason,
        RuntimeSlashReason,
        RuntimeLockId,
        RuntimeTask
    )]
    pub struct Test;

    #[runtime::pallet_index(0)]
    pub type System = frame_system;

    #[runtime::pallet_index(1)]
    pub type PrivacyPallet = privacy_pallet;
}

#[derive_impl(frame_system::config_preludes::TestDefaultConfig)]
impl frame_system::Config for Test {
    type Block = Block;
}

parameter_types! {
    // Defines a constant named `PrivacyPalletId` of type `PalletId`
    pub const PrivacyPalletId: PalletId = PalletId(*b"priv_id_");
    pub const MaxEncryptedNoteLength: u32 = 1024;
}

impl privacy_pallet::Config for Test {
    type RuntimeEvent = RuntimeEvent;
    type Currency = ();
    type CommitmentIndexType = u32;
    type PalletId = PrivacyPalletId;
    type MaxEncryptedNoteLength = MaxEncryptedNoteLength;
}

pub fn new_test_ext() -> TestExternalities {
    frame_system::GenesisConfig::<Test>::default()
        .build_storage()
        .unwrap()
        .into()
}
