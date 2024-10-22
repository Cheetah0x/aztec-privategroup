use crate::test::utils;

use dep::aztec::test::{helpers::{cheatcodes, test_environment::TestEnvironment}};
use dep::aztec::protocol_types::storage::map::derive_storage_slot_in_map;
use dep::aztec::note::note_getter::{MAX_NOTES_PER_PAGE, view_notes};
use dep::aztec::note::note_viewer_options::NoteViewerOptions;
use aztec::note::note_getter::NoteGetterOptions;
use dep::aztec::hash::compute_secret_hash;
use dep::aztec::{
    protocol_types::address::AztecAddress,
    keys::getters::get_public_keys,
    macros::{storage::storage, events::event, functions::{public, initializer, private, internal}}
};

use dep::aztec::{oracle::{execution::{get_block_number, get_contract_address}, storage::storage_read}};
use crate::types::NewAddressNote::NewAddressNote;
use value_note::{balance_utils, utils::{increment, decrement}, value_note::ValueNote};

use dep::std::println;
use crate::PrivateGroups;
use std::hash::pedersen_hash;

#[test]
unconstrained fn test_setting_balance_clean() {
    let ( env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(admin);
    let set_balance_admin_alice_interface = PrivateGroups::at(private_group_contract).set_balance(admin, alice, 100);
    env.call_private_void(set_balance_admin_alice_interface);
    env.advance_block_by(1);

    env.impersonate(alice);
    let set_balance_alice_admin_interface = PrivateGroups::at(private_group_contract).set_balance(alice, admin, 50);
    env.call_private_void(set_balance_alice_admin_interface);
    env.advance_block_by(1);

    env.impersonate(admin);
    let get_balance_admin_interface = PrivateGroups::at(private_group_contract).read_total_balance(admin, alice);
    let balance: u64 = env.call_private(get_balance_admin_interface);
    println(f"balance: {balance}");
    assert(balance == 50, "Balance is not correct");

    env.impersonate(alice);
    let get_balance_alice_interface = PrivateGroups::at(private_group_contract).read_total_balance(alice, admin);
    let balance_alice: u64 = env.call_private(get_balance_alice_interface);
    println(f"balance alice: {balance_alice}");
    assert(balance_alice == 18446744073709551566, "Balance is not correct");
    //the resason this balance is like this is because there is no serialiseation for i64, so this
    //cannot be signed so it underflows.
}

#[test]
unconstrained fn test_setting_group_balance_clean() {
    let ( env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(admin);
    let amount: Field = 150;
    let debtors = [alice, bob];
    let set_balance_admin_group_interface = PrivateGroups::at(private_group_contract).setup_group_payments(admin, debtors, amount);
    env.call_private_void(set_balance_admin_group_interface);
    env.advance_block_by(1);

    //balance between admin and alice
    let balance_admin_alice_interface = PrivateGroups::at(private_group_contract).read_balance_credit(admin, alice);
    let balance_admin_alice: u64 = env.call_private(balance_admin_alice_interface);
    println(f"balance admin alice: {balance_admin_alice}");
    assert(balance_admin_alice == 50, "Balance is not correct");

    //balance between admin and bob
    let balance_admin_bob_interface = PrivateGroups::at(private_group_contract).read_balance_credit(admin, bob);
    let balance_admin_bob: u64 = env.call_private(balance_admin_bob_interface);
    println(f"balance admin bob: {balance_admin_bob}");
    assert(balance_admin_bob == 50, "Balance is not correct");

    env.impersonate(alice);
    let balance_alice_admin_interface = PrivateGroups::at(private_group_contract).read_balance_debt(alice, admin);
    let balance_alice_admin: u64 = env.call_private(balance_alice_admin_interface);
    println(f"balance alice admin: {balance_alice_admin}");
    assert(balance_alice_admin == 50, "Balance is not correct");

    env.impersonate(bob);
    let balance_bob_admin_interface = PrivateGroups::at(private_group_contract).read_balance_debt(bob, admin);
    let balance_bob_admin: u64 = env.call_private(balance_bob_admin_interface);
    println(f"balance bob admin: {balance_bob_admin}");
    assert(balance_bob_admin == 50, "Balance is not correct");
}

#[test]
unconstrained fn make_payment_clean() {
    let ( env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(admin);
    let set_balance_interface = PrivateGroups::at(private_group_contract).set_balance(admin, alice, 50);
    env.call_private_void(set_balance_interface);
    env.advance_block_by(1);

    env.impersonate(alice);
    let make_payment_interface = PrivateGroups::at(private_group_contract).make_payment(alice, admin, 20);
    env.call_private_void(make_payment_interface);
    env.advance_block_by(1);

    let balance_alice_admin_interface = PrivateGroups::at(private_group_contract).read_balance_debt(alice, admin);
    let balance_alice_admin: u64 = env.call_private(balance_alice_admin_interface);
    println(f"balance alice admin: {balance_alice_admin}");
    assert(balance_alice_admin == 30, "Balance is not correct");

    env.impersonate(admin);
    let balance_admin_alice_interface = PrivateGroups::at(private_group_contract).read_balance_credit(admin, alice);
    let balance_admin_alice: u64 = env.call_private(balance_admin_alice_interface);
    println(f"balance admin alice: {balance_admin_alice}");
    assert(balance_admin_alice == 30, "Balance is not correct");
}