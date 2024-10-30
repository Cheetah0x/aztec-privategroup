use crate::test::utils;

use dep::aztec::test::{helpers::{cheatcodes, test_environment::TestEnvironment}};
use dep::aztec::note::note_getter::{MAX_NOTES_PER_PAGE, view_notes};
use dep::aztec::note::note_viewer_options::NoteViewerOptions;
use dep::aztec::{
    protocol_types::address::AztecAddress,
    macros::{storage::storage, events::event, functions::{public, initializer, private, internal}}
};

use dep::aztec::{oracle::{execution::{get_block_number, get_contract_address}, storage::storage_read}};
use crate::NewAddressNote::NewAddressNote;

use dep::std::println;
use crate::PrivateGroups;

#[test]
unconstrained fn test_environment_setup() {
    let mut env = TestEnvironment::new();
    env.advance_block_by(1);
    let account = env.create_account();
    println(f"account: {account}");
    assert(!account.is_zero(), "Account creation failed");
}

#[test]
unconstrained fn test_contract_deployment() {
    let ( env, private_group_contract, admin, alice, bob) = utils::setup();
    env.advance_block_by(1);
    assert(!private_group_contract.is_zero(), "Contract not deployed");
}

#[test]
unconstrained fn get_Admin_unconstrained() {
    let ( env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(private_group_contract);
    let unconstrained_context = env.unkonstrained();
    env.advance_block_by(1);

    let storage = PrivateGroups::Storage::init(unconstrained_context);

    let admin_note = storage.admin.view_note();
    assert(admin_note.address == admin, "Admin not set correctly");
}
