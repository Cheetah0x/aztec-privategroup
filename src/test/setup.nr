use crate::test::utils;

use dep::aztec::test::{helpers::{cheatcodes, test_environment::TestEnvironment}};
use dep::aztec::protocol_types::storage::map::derive_storage_slot_in_map;
use dep::aztec::note::note_getter::{MAX_NOTES_PER_PAGE, view_notes};
use dep::aztec::note::note_viewer_options::NoteViewerOptions;
use aztec::note::note_getter::NoteGetterOptions;
use dep::aztec::hash::compute_secret_hash;
use dep::aztec::{
    protocol_types::address::AztecAddress,
    encrypted_logs::encrypted_note_emission::encode_and_encrypt_note_with_keys,
    keys::getters::get_public_keys,
    macros::{storage::storage, events::event, functions::{public, initializer, private, internal}}
};

use dep::aztec::{oracle::{execution::{get_block_number, get_contract_address}, unsafe_rand::unsafe_rand, storage::storage_read}};
use crate::types::NewAddressNote::NewAddressNote;

use dep::std::println;
use crate::PrivateGroups;

#[test]
unconstrained fn test_environment_setup() {
    let mut env = TestEnvironment::new();
    let account = env.create_account();
    assert(!account.is_zero(), "Account creation failed");
}

#[test]
unconstrained fn test_contract_deployment() {
    let ( env, private_group_contract, admin, alice, bob) = utils::setup();
    assert(!private_group_contract.is_zero(), "Contract not deployed");
}

#[test]
unconstrained fn get_Admin_unconstrained() {
    let ( env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(private_group_contract);
    let unconstrained_context = env.unkonstrained();

    let storage = PrivateGroups::Storage::init(unconstrained_context);

    let admin_note = storage.admin.view_note();
    assert(admin_note.address == admin, "Admin not set correctly");
}

//test to see that the group members have been set correctl
#[test]
unconstrained fn get_group_members() {
    let ( env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(private_group_contract);
    let unconstrained_context = env.unkonstrained();
    let ZERO_ADDRESS: AztecAddress = AztecAddress::from_field(0x0000000000000000000000000000000000000000000000000000000000000000);

    let storage = PrivateGroups::Storage::init(unconstrained_context);
    let options = NoteViewerOptions::new();

    let group_members: BoundedVec<NewAddressNote, 10> = storage.group_members.at(admin).view_notes(options);
    let mut member_addresses = Vec::new();
    let mut member_count = 0;

    for i in 0..group_members.len() {
        if group_members.get_unchecked(i).address != ZERO_ADDRESS {
            let group_member = group_members.get_unchecked(i);
            let group_member_address = group_member.address;
            member_addresses.push(group_member_address);
            member_count += 1;
        }
    }

    assert(member_count == 3, "Group members not set correctly");
    assert(member_addresses.get(0) == admin, "Group members not set correctly");
    assert(member_addresses.get(1) == alice, "Group members not set correctly");
    assert(member_addresses.get(2) == bob, "Group members not set correctly");
}
