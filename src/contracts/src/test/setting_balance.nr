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
use std::hash::poseidon2;

//this is a way to individually get the notes, to help understanding

#[test]
unconstrained fn test_making_payment1() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(admin);
    let set_balance_admin_alice = PrivateGroups::at(private_group_contract)
        .set_balance(admin, alice, 100)
        .call(&mut env.private());
    env.advance_block_by(1);

    env.impersonate(alice);
    let make_payment_alice_admin = PrivateGroups::at(private_group_contract)
        .make_payment(alice, admin, 50)
        .call(&mut env.private());
    env.advance_block_by(1);
}

#[test]
unconstrained fn test_setting_balance() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();
    let ZERO_ADDRESS: AztecAddress = AztecAddress::from_field(
        0x0000000000000000000000000000000000000000000000000000000000000000,
    );

    env.impersonate(admin);
    //set balance between admin and alice
    let set_balance_admin_alice = PrivateGroups::at(private_group_contract)
        .set_balance(admin, alice, 100)
        .call(&mut env.private());
    env.advance_block_by(1);

    env.impersonate(alice);
    let make_payment_alice_admin = PrivateGroups::at(private_group_contract)
        .make_payment(alice, admin, 50)
        .call(&mut env.private());
    env.advance_block_by(1);

    env.impersonate(private_group_contract);
    let unconstrained_context = env.unkonstrained();
    let storage = PrivateGroups::Storage::init(unconstrained_context);
    let options = NoteViewerOptions::new();

    let hash_credit_admin = [admin.to_field(), alice.to_field()];
    let key_credit_admin = poseidon2::Poseidon2::hash(hash_credit_admin, 2);
    let hash_debt_admin = [admin.to_field(), alice.to_field()];
    let key_debt_admin = poseidon2::Poseidon2::hash(hash_debt_admin, 2);
    let hash_credit_alice = [alice.to_field(), admin.to_field()];
    let key_credit_alice = poseidon2::Poseidon2::hash(hash_credit_alice, 2);
    let hash_debt_alice = [alice.to_field(), admin.to_field()];
    let key_debt_alice = poseidon2::Poseidon2::hash(hash_debt_alice, 2);

    let admin_balance_credit: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> =
        storage.group_balances_credit.at(key_credit_admin).view_notes(options);
    let admin_balance_debt: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> =
        storage.group_balances_debt.at(key_debt_admin).view_notes(options);
    let alice_balance_credit: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> =
        storage.group_balances_credit.at(key_credit_alice).view_notes(options);
    let alice_balance_debt: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> =
        storage.group_balances_debt.at(key_debt_alice).view_notes(options);

    // Process each balance
    let admin_balance_notes_credit = process_balance(admin_balance_credit);
    let alice_balance_notes_credit = process_balance(alice_balance_credit);
    let admin_balance_notes_debt = process_balance(admin_balance_debt);
    let alice_balance_notes_debt = process_balance(alice_balance_debt);

    let admin_balance_value_notes_cred_value = sum_value_notes_vec(admin_balance_notes_credit);
    let alice_balance_value_notes_cred_value = sum_value_notes_vec(alice_balance_notes_credit);
    let admin_balance_value_notes_deb_value = sum_value_notes_vec(admin_balance_notes_debt);
    let alice_balance_value_notes_deb_value = sum_value_notes_vec(alice_balance_notes_debt);

    let admin_balance_value_notes_cred_value_as_u64 = admin_balance_value_notes_cred_value as u64;
    let alice_balance_value_notes_cred_value_as_u64 = alice_balance_value_notes_cred_value as u64;
    let admin_balance_value_notes_deb_value_as_u64 = admin_balance_value_notes_deb_value as u64;
    let alice_balance_value_notes_deb_value_as_u64 = alice_balance_value_notes_deb_value as u64;

    println(
        f"Admin balance_credit: {admin_balance_value_notes_cred_value_as_u64}",
    );
    println(
        f"Alice balance_credit: {alice_balance_value_notes_cred_value_as_u64}",
    );
    println(
        f"Admin balance_debt: {admin_balance_value_notes_deb_value_as_u64}",
    );
    println(
        f"Alice balance_debt: {alice_balance_value_notes_deb_value_as_u64}",
    );

    assert(
        admin_balance_value_notes_cred_value_as_u64 == 50,
        "Admin balance_credit not set correctly",
    );
}

//comment this one out and ask gregor why it does not work, i know the work arounds, intuatively this should work.
#[test]
unconstrained fn setting_group_balance_fail() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();
    let ZERO_ADDRESS: AztecAddress = AztecAddress::from_field(
        0x0000000000000000000000000000000000000000000000000000000000000000,
    );

    env.private();
    env.impersonate(admin);
    //set balance between admin and alice
    let amount = 150;
    let debtors = [alice, bob];
    let set_balance_admin_group = PrivateGroups::at(private_group_contract)
        .setup_group_payments(admin, debtors, amount)
        .call(&mut env.private());
    env.advance_block_by(1);

    env.impersonate(alice);
    let read_balance_admin_alice = PrivateGroups::at(private_group_contract)
        .read_balance_credit(admin, alice)
        .view(&mut env.private());
    //returns value as hex
    println(f"yolo: {read_balance_admin_alice}");
    // //being able to do this in the TXE would be nice
}

#[test]
unconstrained fn setting_group_balance() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();
    let ZERO_ADDRESS: AztecAddress = AztecAddress::from_field(
        0x0000000000000000000000000000000000000000000000000000000000000000,
    );

    env.private();
    env.impersonate(admin);
    //set balance between admin and alice
    let amount: Field = 150;
    let debtors = [alice, bob];
    let set_balance_admin_group = PrivateGroups::at(private_group_contract)
        .setup_group_payments(admin, debtors, amount)
        .call(&mut env.private());
    env.advance_block_by(1);

    //now i need to read the balances from storage
    env.impersonate(private_group_contract);
    let unconstrained_context = env.unkonstrained();
    let storage = PrivateGroups::Storage::init(unconstrained_context);
    let options = NoteViewerOptions::new();

    //hash functions using poseidon2
    let hash_credit_admin_alice = [admin.to_field(), alice.to_field()];
    let key_credit_admin_alice = poseidon2::Poseidon2::hash(hash_credit_admin_alice, 2);
    let hash_credit_admin_bob = [admin.to_field(), bob.to_field()];
    let key_credit_admin_bob = poseidon2::Poseidon2::hash(hash_credit_admin_bob, 2);
    let hash_debt_alice_admin = [alice.to_field(), admin.to_field()];
    let key_debt_alice_admin = poseidon2::Poseidon2::hash(hash_debt_alice_admin, 2);
    let hash_debt_bob_admin = [bob.to_field(), admin.to_field()];
    let key_debt_bob_admin = poseidon2::Poseidon2::hash(hash_debt_bob_admin, 2);

    let admin_alice_credit: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> =
        storage.group_balances_credit.at(key_credit_admin_alice).view_notes(options);
    let admin_bob_credit: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> =
        storage.group_balances_credit.at(key_credit_admin_bob).view_notes(options);
    let alice_admin_debt: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> =
        storage.group_balances_debt.at(key_debt_alice_admin).view_notes(options);
    let bob_admin_debt: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> =
        storage.group_balances_debt.at(key_debt_bob_admin).view_notes(options);

    let admin_alice_credit_notes = process_balance(admin_alice_credit);
    let admin_bob_credit_notes = process_balance(admin_bob_credit);
    let alice_admin_debt_notes = process_balance(alice_admin_debt);
    let bob_admin_debt_notes = process_balance(bob_admin_debt);

    let admin_alice_credit_value = admin_alice_credit_notes.get(0).value;
    let admin_bob_credit_value = admin_bob_credit_notes.get(0).value;
    let alice_admin_debt_value = alice_admin_debt_notes.get(0).value;
    let bob_admin_debt_value = bob_admin_debt_notes.get(0).value;
    let debt = amount / 3;

    println(f"admin_alice_credit_value: {admin_alice_credit_value}");
    println(f"admin_bob_credit_value: {admin_bob_credit_value}");
    println(f"alice_admin_debt_value: {alice_admin_debt_value}");
    println(f"bob_admin_debt_value: {bob_admin_debt_value}");
    //     assert(admin_alice_credit_value == debt, "Admin alice credit not set correctly");
    //     assert(admin_bob_credit_value == debt, "Admin bob credit not set correctly");
    //     assert(alice_admin_debt_value == debt, "Alice admin debt not set correctly");
    //     assert(bob_admin_debt_value == debt, "Bob admin debt not set correctly");
}

#[test]
unconstrained fn multiple_group_balances() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();
    let ZERO_ADDRESS: AztecAddress = AztecAddress::from_field(
        0x0000000000000000000000000000000000000000000000000000000000000000,
    );

    env.private();
    env.impersonate(admin);
    //set balance between admin and alice
    let mut amount: Field = 150;
    let debtors = [alice, bob];
    let set_balance_admin_group = PrivateGroups::at(private_group_contract)
        .setup_group_payments(admin, debtors, amount)
        .call(&mut env.private());
    env.advance_block_by(1);

    env.impersonate(alice);
    amount = 210;
    let debtors = [admin, bob];
    let set_balance_alice_group = PrivateGroups::at(private_group_contract)
        .setup_group_payments(alice, debtors, amount)
        .call(&mut env.private());
    env.advance_block_by(1);

    env.impersonate(bob);
    amount = 300;
    let debtors = [admin, alice];
    let set_balance_bob_group = PrivateGroups::at(private_group_contract)
        .setup_group_payments(bob, debtors, amount)
        .call(&mut env.private());
    env.advance_block_by(1);

    env.impersonate(private_group_contract);
    let unconstrained_context = env.unkonstrained();
    let storage = PrivateGroups::Storage::init(unconstrained_context);
    let options = NoteViewerOptions::new();

    let admin_alice_credit: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> = storage
        .group_balances_credit
        .at(pedersen_hash([admin.to_field(), alice.to_field()]))
        .view_notes(options);
    let admin_bob_credit: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> = storage
        .group_balances_credit
        .at(pedersen_hash([admin.to_field(), bob.to_field()]))
        .view_notes(options);
    let admin_alice_debt: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> = storage
        .group_balances_debt
        .at(pedersen_hash([admin.to_field(), alice.to_field()]))
        .view_notes(options);
    let admin_bob_debt: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> = storage
        .group_balances_debt
        .at(pedersen_hash([admin.to_field(), bob.to_field()]))
        .view_notes(options);

    let alice_admin_credit: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> = storage
        .group_balances_credit
        .at(pedersen_hash([alice.to_field(), admin.to_field()]))
        .view_notes(options);
    let alice_bob_credit: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> = storage
        .group_balances_credit
        .at(pedersen_hash([alice.to_field(), bob.to_field()]))
        .view_notes(options);
    let alice_admin_debt: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> = storage
        .group_balances_debt
        .at(pedersen_hash([alice.to_field(), admin.to_field()]))
        .view_notes(options);
    let alice_bob_debt: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> = storage
        .group_balances_debt
        .at(pedersen_hash([alice.to_field(), bob.to_field()]))
        .view_notes(options);

    let bob_admin_credit: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> = storage
        .group_balances_credit
        .at(pedersen_hash([bob.to_field(), admin.to_field()]))
        .view_notes(options);
    let bob_alice_credit: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> = storage
        .group_balances_credit
        .at(pedersen_hash([bob.to_field(), alice.to_field()]))
        .view_notes(options);
    let bob_admin_debt: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> = storage
        .group_balances_debt
        .at(pedersen_hash([bob.to_field(), admin.to_field()]))
        .view_notes(options);
    let bob_alice_debt: BoundedVec<ValueNote, MAX_NOTES_PER_PAGE> = storage
        .group_balances_debt
        .at(pedersen_hash([bob.to_field(), alice.to_field()]))
        .view_notes(options);

    let admin_alice_credit_notes = process_balance(admin_alice_credit);
    let admin_bob_credit_notes = process_balance(admin_bob_credit);
    let admin_alice_debt_notes = process_balance(admin_alice_debt);
    let admin_bob_debt_notes = process_balance(admin_bob_debt);

    let alice_admin_credit_notes = process_balance(alice_admin_credit);
    let alice_bob_credit_notes = process_balance(alice_bob_credit);
    let alice_admin_debt_notes = process_balance(alice_admin_debt);
    let alice_bob_debt_notes = process_balance(alice_bob_debt);

    let bob_admin_credit_notes = process_balance(bob_admin_credit);
    let bob_alice_credit_notes = process_balance(bob_alice_credit);
    let bob_admin_debt_notes = process_balance(bob_admin_debt);
    let bob_alice_debt_notes = process_balance(bob_alice_debt);

    let admin_alice_credit_sum = sum_value_notes(admin_alice_credit) as u64;
    let admin_bob_credit_sum = sum_value_notes(admin_bob_credit) as u64;
    let admin_alice_debt_sum = sum_value_notes(admin_alice_debt) as u64;
    let admin_bob_debt_sum = sum_value_notes(admin_bob_debt) as u64;

    let alice_admin_credit_sum = sum_value_notes(alice_admin_credit) as u64;
    let alice_bob_credit_sum = sum_value_notes(alice_bob_credit) as u64;
    let alice_admin_debt_sum = sum_value_notes(alice_admin_debt) as u64;
    let alice_bob_debt_sum = sum_value_notes(alice_bob_debt) as u64;

    let bob_admin_credit_sum = sum_value_notes(bob_admin_credit) as u64;
    let bob_alice_credit_sum = sum_value_notes(bob_alice_credit) as u64;
    let bob_admin_debt_sum = sum_value_notes(bob_admin_debt) as u64;
    let bob_alice_debt_sum = sum_value_notes(bob_alice_debt) as u64;

    println(f"admin_alice_credit_sum: {admin_alice_credit_sum}");
    println(f"admin_bob_credit_sum: {admin_bob_credit_sum}");
    println(f"alice_admin_debt_sum: {alice_admin_debt_sum}");
    println(f"alice_bob_debt_sum: {alice_bob_debt_sum}");
    println(f"bob_admin_credit_sum: {bob_admin_credit_sum}");
    println(f"bob_alice_credit_sum: {bob_alice_credit_sum}");
    println(f"bob_admin_debt_sum: {bob_admin_debt_sum}");
    println(f"bob_alice_debt_sum: {bob_alice_debt_sum}");
    //in the future need to change this from fields to nuumbers.
}

fn process_balance(balance: BoundedVec<ValueNote, 10>) -> Vec<ValueNote> {
    let mut result = Vec::new();
    for i in 0..balance.len() {
        let note = balance.get(i);
        if note.value != 0 {
            result.push(note);
        }
    }
    result
}

fn sum_value_notes(balance: BoundedVec<ValueNote, 10>) -> Field {
    let mut total = 0;
    for i in 0..balance.len() {
        let note = balance.get(i);
        if note.value != 0 {
            total += note.value;
        }
    }
    total
}

fn sum_value_notes_vec(balance: Vec<ValueNote>) -> Field {
    let mut total = 0;
    for i in 0..balance.len() {
        let note = balance.get(i);
        if note.value != 0 {
            total += note.value;
        }
    }
    total
}
