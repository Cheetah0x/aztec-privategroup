use crate::test::utils;

use dep::aztec::test::helpers::{cheatcodes, test_environment::TestEnvironment};
use dep::aztec::protocol_types::storage::map::derive_storage_slot_in_map;
use dep::aztec::note::note_getter::{MAX_NOTES_PER_PAGE, view_notes};
use dep::aztec::note::note_viewer_options::NoteViewerOptions;
use aztec::note::note_getter::NoteGetterOptions;
use dep::aztec::hash::compute_secret_hash;
use dep::aztec::{
    protocol_types::address::AztecAddress, keys::getters::get_public_keys,
    macros::{storage::storage, events::event, functions::{public, initializer, private, internal}}
};

use dep::aztec::oracle::{execution::{get_block_number, get_contract_address}, storage::storage_read};
use crate::types::NewAddressNote::NewAddressNote;
use value_note::{balance_utils, utils::{increment, decrement}, value_note::ValueNote};

use dep::std::println;
use crate::PrivateGroups;
use std::hash::pedersen_hash;

#[test]
unconstrained fn test_setting_balance_clean() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(admin);
    let set_balance_admin_alice = PrivateGroups::at(private_group_contract).set_balance(admin, alice, 100).call(&mut env.private());
    env.advance_block_by(1);

    env.impersonate(alice);
    let set_balance_alice_admin = PrivateGroups::at(private_group_contract).set_balance(alice, admin, 50).call(&mut env.private());
    env.advance_block_by(1);

    env.impersonate(admin);
    let admin_balance: i64 = PrivateGroups::at(private_group_contract).read_total_balance(admin, alice).view(&mut env.private());
    println(f"balance: {admin_balance}");
    assert(admin_balance == 50, "Balance is not correct");

    env.impersonate(alice);
    let alice_balance: i64 = PrivateGroups::at(private_group_contract).read_total_balance(alice, admin).view(&mut env.private());
    println(f"balance alice: {alice_balance}");
    assert(alice_balance == -50, "Balance is not correct");
    //the resason this balance is like this is because there is no serialiseation for i64, so this
    //cannot be signed so it underflows. This will be updated in the next version when there is serialisation for i64.
}

#[test]
unconstrained fn test_setting_group_balance_clean() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(admin);
    let amount: Field = 150;
    let debtors = [alice, bob];
    let set_balance_admin_group = PrivateGroups::at(private_group_contract).setup_group_payments(admin, debtors, amount).call(&mut env.private());
    env.advance_block_by(1);

    //balance between admin and alice
    let balance_admin_alice: u64 = PrivateGroups::at(private_group_contract).read_balance_credit(admin, alice).view(&mut env.private());
    println(f"balance admin alice: {balance_admin_alice}");
    assert(balance_admin_alice == 50, "Balance is not correct");

    //balance between admin and bob
    let balance_admin_bob: u64 = PrivateGroups::at(private_group_contract).read_balance_credit(admin, bob).view(&mut env.private());
    println(f"balance admin bob: {balance_admin_bob}");
    assert(balance_admin_bob == 50, "Balance is not correct");

    env.impersonate(alice);
    let balance_alice_admin: u64 = PrivateGroups::at(private_group_contract).read_balance_debt(alice, admin).view(&mut env.private());
    println(f"balance alice admin: {balance_alice_admin}");
    assert(balance_alice_admin == 50, "Balance is not correct");

    env.impersonate(bob);
    let balance_bob_admin: u64 = PrivateGroups::at(private_group_contract).read_balance_debt(bob, admin).view(&mut env.private());
    println(f"balance bob admin: {balance_bob_admin}");
    assert(balance_bob_admin == 50, "Balance is not correct");
}

#[test]
unconstrained fn make_payment_clean() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(admin);
    let set_balance = PrivateGroups::at(private_group_contract).set_balance(admin, alice, 50).call(&mut env.private());
    env.advance_block_by(1);

    env.impersonate(alice);
    let make_payment = PrivateGroups::at(private_group_contract).make_payment(alice, admin, 20).call(&mut env.private());
    env.advance_block_by(1);

    let balance_alice_admin: u64 = PrivateGroups::at(private_group_contract).read_balance_debt(alice, admin).view(&mut env.private());
    println(f"balance alice admin: {balance_alice_admin}");
    assert(balance_alice_admin == 30, "Balance is not correct");

    env.impersonate(admin);
    let balance_admin_alice: u64 = PrivateGroups::at(private_group_contract).read_balance_credit(admin, alice).view(&mut env.private());
    println(f"balance admin alice: {balance_admin_alice}");
    assert(balance_admin_alice == 30, "Balance is not correct");
}

#[test(should_fail)]
unconstrained fn set_balance_fail() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();

    env.create_account();
    let charlie = env.create_account();
    env.impersonate(charlie);
    let set_balance = PrivateGroups::at(private_group_contract).set_balance(charlie, admin, 20).call(&mut env.private());
    assert(false, "Should not get here");
}

#[test]
unconstrained fn multiple_group_balances_clean() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();

    //group payment from the admin
    env.impersonate(admin);
    let mut amount: Field = 150;
    let debtors = [alice, bob];
    let set_balance_admin_group = PrivateGroups::at(private_group_contract).setup_group_payments(admin, debtors, amount).call(&mut env.private());
    env.advance_block_by(1);

    //group payment from alice
    env.impersonate(alice);
    amount = 210;
    let debtors = [admin, bob];
    let set_balance_alice_group = PrivateGroups::at(private_group_contract).setup_group_payments(alice, debtors, amount).call(&mut env.private());
    env.advance_block_by(1);

    //group payment from bob
    env.impersonate(bob);
    amount = 300;
    let debtors = [admin, alice];
    let set_balance_bob_group = PrivateGroups::at(private_group_contract).setup_group_payments(bob, debtors, amount).call(&mut env.private());
    env.advance_block_by(1);
    //read the balances
}
