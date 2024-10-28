use crate::test::utils;

use dep::aztec::test::helpers::{cheatcodes, test_environment::TestEnvironment};
use dep::aztec::protocol_types::storage::map::derive_storage_slot_in_map;
use dep::aztec::note::note_getter::{MAX_NOTES_PER_PAGE, view_notes};
use dep::aztec::note::note_viewer_options::NoteViewerOptions;
use aztec::note::note_getter::NoteGetterOptions;
use dep::aztec::hash::compute_secret_hash;
use dep::aztec::{
    protocol_types::address::AztecAddress, keys::getters::get_public_keys,
    macros::{storage::storage, events::event, functions::{public, initializer, private, internal}},
};

use dep::aztec::oracle::{
    execution::{get_block_number, get_contract_address}, storage::storage_read,
};
use crate::types::NewAddressNote::NewAddressNote;
use value_note::{balance_utils, utils::{increment, decrement}, value_note::ValueNote};

use dep::std::println;
use crate::PrivateGroups;
use std::hash::pedersen_hash;

//Test to get the group members from the contract.

#[test]
unconstrained fn get_group_members() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(admin);
    let members: [AztecAddress; 3] =
        PrivateGroups::at(private_group_contract).get_group_members(admin).view(&mut env.private());
    println(f"members: {members}");
    assert(members[0] == admin, "Admin not in group");
    assert(members[1] == alice, "Alice not in group");
    assert(members[2] == bob, "Bob not in group");
}

#[test]
unconstrained fn get_group_members_fail() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();

    let ZERO_ADDRESS: AztecAddress = AztecAddress::from_field(
        0x0000000000000000000000000000000000000000000000000000000000000000,
    );

    let charlie = env.create_account();
    env.impersonate(charlie);
    let members: [AztecAddress; 3] = PrivateGroups::at(private_group_contract)
        .get_group_members(charlie)
        .view(&mut env.private());
    assert(members[0] == ZERO_ADDRESS, "Zero address not in group");
    assert(members[1] == ZERO_ADDRESS, "Zero address not in group");
    assert(members[2] == ZERO_ADDRESS, "Zero address not in group");
}
