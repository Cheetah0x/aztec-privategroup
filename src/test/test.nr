use crate::test::utils;

use dep::aztec::test::{helpers::{cheatcodes, test_environment::TestEnvironment}};
use dep::aztec::protocol_types::storage::map::derive_storage_slot_in_map;
use dep::aztec::note::note_getter::{MAX_NOTES_PER_PAGE, view_notes};
use dep::aztec::note::note_viewer_options::NoteViewerOptions;
use dep::aztec::hash::compute_secret_hash;

use dep::aztec::{oracle::{execution::{get_block_number, get_contract_address}, unsafe_rand::unsafe_rand, storage::storage_read}};

use crate::AdminStorage;

#[test]
unconstrained fn test_contract_deployment() {
    let (env, admin_storage_address, _, _) = utils::setup();
    assert(!admin_storage_address.is_zero(), "Contract not deployed");
}

#[test]
unconstrained fn test_environment_setup() {
    let mut env = TestEnvironment::new();
    let account = env.create_account();
    assert(account.is_zero() == false, "Account creation failed");
}

#[test]
unconstrained fn test_initializer() {
    let (_, admin_storage_address, admin, alice) = utils::setup();

    let block_number = get_block_number();
    let admin_slot = AdminStorage::storage_layout().admin.slot;
    let admin_storage_value = storage_read(admin_storage_address, admin_slot, block_number);
    assert(admin_storage_value == admin, "Admin not set correctly");
}

// #[test]
// unconstrained fn add_to_group() {
//     let(env, admin_storage_address, admin, alice) = utils::setup();

//     env.impersonate(admin);
//     let call_interface = AdminStorage::at(admin_storage_address).add_to_group(alice, true);
//     env.call_public(call_interface);

//     let expected = true;

//     let block_number = get_block_number();
//     let group_members_slot = derive_storage_slot_in_map(AdminStorage::storage_layout().group_members.slot, alice);
//     let alice_in_group = storage_read(admin_storage_address, group_members_slot, block_number);
//     assert(alice_in_group == expected, "Alice not added to group");
// }
