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
use value_note::{balance_utils, utils::{increment, decrement}, value_note::ValueNote};

use dep::std::println;
use crate::PrivateGroups;
use std::hash::pedersen_hash;

//this is a convoluted way of getting the notes directly from storage but it is a way to do it. Good to demonstrate you may need to do this.

#[test]
unconstrained fn test_making_payment() {
    let ( env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(admin);
    let amount : Field = 100;
    let set_balance_admin_alice_interface = PrivateGroups::at(private_group_contract).set_balance(admin, alice, amount);
    env.call_private_void(set_balance_admin_alice_interface);
    env.advance_block_by(1);

    env.impersonate(alice);
    let make_payment_alice_admin_interface = PrivateGroups::at(private_group_contract).make_payment(alice, admin, 20);
    env.call_private_void(make_payment_alice_admin_interface);
    env.advance_block_by(1);
    // env.impersonate(private_group_contract);
    // let unconstrained_context = env.unkonstrained();
    // let storage = PrivateGroups::Storage::init(unconstrained_context);
    // let options = NoteViewerOptions::new();
    // let key_credit_admin = pedersen_hash([admin.to_field(), alice.to_field()]);
    // let key_debt_admin = pedersen_hash([admin.to_field(), alice.to_field()]);
    // let key_credit_alice = pedersen_hash([alice.to_field(), admin.to_field()]);
    // let key_debt_alice = pedersen_hash([alice.to_field(), admin.to_field()]);
    // let admin_balance_credit : BoundedVec<ValueNote, 10> = storage.group_balances_credit.at(key_credit_admin).view_notes(options);
    // let admin_balance_debt : BoundedVec<ValueNote, 10> = storage.group_balances_debt.at(key_debt_admin).view_notes(options);
    // let alice_balance_credit : BoundedVec<ValueNote, 10> = storage.group_balances_credit.at(key_credit_alice).view_notes(options);
    // let alice_balance_debt : BoundedVec<ValueNote, 10> = storage.group_balances_debt.at(key_debt_alice).view_notes(options);
    // // let admin_alice_credit_notes = process_balance(admin_balance_credit);
    // let admin_alice_debt_notes = process_balance(admin_balance_debt);
    // let alice_admin_credit_notes = process_balance(alice_balance_credit);
    // let alice_admin_debt_notes = process_balance(alice_balance_debt);
    // let admin_alice_credit_sum = sum_value_notes(admin_balance_credit);
    // println(f"admin_alice_credit_sum: {admin_alice_credit_sum}");
    // let admin_alice_debt_sum = sum_value_notes(admin_balance_debt);
    // println(f"admin_alice_debt_sum: {admin_alice_debt_sum}");
    // let alice_admin_credit_sum = sum_value_notes(alice_balance_credit);
    // let alice_admin_debt_sum = sum_value_notes(alice_balance_debt);
    // assert(admin_alice_credit_sum == alice_admin_debt_sum, "Admin alice credit not set correctly");
    // assert(admin_alice_debt_sum == alice_admin_credit_sum, "Admin alice debt not set correctly");
    // assert(alice_admin_credit_sum == admin_alice_debt_sum, "Alice admin credit not set correctly");
    // assert(alice_admin_debt_sum == admin_alice_credit_sum, "Alice admin debt not set correctly");
    // assert((admin_alice_credit_sum - admin_alice_debt_sum) == 20, "Admin alice credit not set correctly");
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

//test the thing about recompiling before running the test
