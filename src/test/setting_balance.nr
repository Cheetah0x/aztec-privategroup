use crate::test::utils;

use dep::aztec::test::{helpers::{cheatcodes, test_environment::TestEnvironment}};
use dep::aztec::protocol_types::storage::map::derive_storage_slot_in_map;
use dep::aztec::note::note_getter::{MAX_NOTES_PER_PAGE, view_notes};
use dep::aztec::note::note_viewer_options::NoteViewerOptions;
use aztec::note::note_getter::NoteGetterOptions;
use dep::aztec::{
    protocol_types::address::AztecAddress,
    encrypted_logs::encrypted_note_emission::encode_and_encrypt_note, keys::getters::get_public_keys,
    macros::{storage::storage, events::event, functions::{public, initializer, private, internal}}
};

use dep::aztec::{oracle::{execution::{get_block_number, get_contract_address}, random::random, storage::storage_read}};
use crate::types::NewAddressNote::NewAddressNote;

use dep::std::println;
use crate::PrivateGroups;
use dep::token::Token;

#[test]
unconstrained fn test_making_payment1() {
    let ( env, private_group_contract, admin, alice, bob, token_contract_address) = utils::setup();

    env.impersonate(admin);
    let set_balance_admin_alice_interface = PrivateGroups::at(private_group_contract).set_balance(admin, alice, 100);
    env.call_private_void(set_balance_admin_alice_interface);
    env.advance_block_by(1);

    //as soon as i try to impersonate alice it dies. wonder why this is 
    env.impersonate(alice);
    let make_payment_alice_admin_interface = PrivateGroups::at(private_group_contract).make_payment(alice, admin, 0);
    env.call_private_void(make_payment_alice_admin_interface);
    env.advance_block_by(1);
    println("made payment");

    env.impersonate(admin);
    let admin_balance_interface = PrivateGroups::at(private_group_contract).read_total_balance(admin, alice);
    let admin_balance : u64 = env.call_private(admin_balance_interface);
    assert(admin_balance == 100, "admin balance is not 100");
    println(f"admin_balance: {admin_balance}");

    env.impersonate(alice);
    let alice_balance_interface = PrivateGroups::at(private_group_contract).read_total_balance(alice, admin);
    let alice_balance : u64 = env.call_private(alice_balance_interface);
    assert(alice_balance == 100, "alice balance is not 100");
    println(f"alice_balance: {alice_balance}");
}

fn field_to_integer(field_value: Field) -> i64 {
    let u128_value = U128::from_integer(field_value);
    u128_value.to_integer()
}

