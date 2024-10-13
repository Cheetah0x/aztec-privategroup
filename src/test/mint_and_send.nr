use crate::test::utils;

use dep::aztec::test::{helpers::{cheatcodes, test_environment::TestEnvironment}};
use dep::aztec::protocol_types::storage::map::derive_storage_slot_in_map;
use dep::aztec::note::note_getter::{MAX_NOTES_PER_PAGE, view_notes};
use dep::aztec::note::note_viewer_options::NoteViewerOptions;
use aztec::note::note_getter::NoteGetterOptions;
use dep::aztec::{
    hash::compute_secret_hash, prelude::AztecAddress,
    protocol_types::address::AztecAddress,
    encrypted_logs::encrypted_note_emission::encode_and_encrypt_note, keys::getters::get_public_keys,
    macros::{storage::storage, events::event, functions::{public, initializer, private, internal}}
};

use dep::aztec::{oracle::{execution::{get_block_number, get_contract_address}, random::random, storage::storage_read}};
use crate::types::NewAddressNote::NewAddressNote;

use dep::std::println;
use crate::PrivateGroups;
use dep::token::Token;

//purpose of this test is to mint and send tokens to the private group contract

unconstrained fn mint_and_send() {
    let (env, private_group_contract, admin, alice, bob, token_contract_address) = utils::setup();

    let mint_amount = 10000;

    //mint the tokens
    let secret = random();
    let secret_hash = compute_secret_hash(secret);
    //stupid that mint_private is a public function
    let mint_private_call_interface = Token::at(token_contract_address).mint_private(mint_amount, secret_hash);
    env.call_public(mint_private_call_interface);

    let mint_public_call_interface = Token::at(token_contract_address).mint_public(admin, mint_amount);
    env.call_public(mint_public_call_interface);

    env.advance_block_by(1);

    // let redeem_shield_call_interface = Token::at(token_contract_address).redeem_shield(admin, mint_amount, secret);
    // env.call_private_void(redeem_shield_call_interface);

    // env.advance_block_by(1);

    // let transfer_amount = 1000;
    // let transfer_to_alice_call_interface = Token::at(token_contract_address).transfer(alice, transfer_amount);
    // env.call_private_void(transfer_to_alice_call_interface);

    // utils::check_private_balance(token_contract_address, admin, mint_amount - transfer_amount);
    // utils::check_private_balance(token_contract_address, alice, transfer_amount);

    env.advance_block_by(1);

}