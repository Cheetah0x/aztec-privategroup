use dep::aztec::{
     prelude::AztecAddress,
    test::helpers::{cheatcodes, test_environment::TestEnvironment},
    // protocol_types::storage::map::derive_storage_slot_in_map,
    oracle::{execution::{get_block_number, get_contract_address}, random::random, storage::storage_read}
};

use dep::std::println;
use crate::PrivateGroups;
use dep::token::Token;


unconstrained pub fn setup() -> (&mut TestEnvironment, AztecAddress, AztecAddress, AztecAddress, AztecAddress, AztecAddress) {
    let mut env = TestEnvironment::new();


    let admin = env.create_account();  
    let alice = env.create_account();
    let bob = env.create_account();
    let ZERO_ADDRESS: AztecAddress = AztecAddress::from_field(0x0000000000000000000000000000000000000000000000000000000000000000);

    env.advance_block_by(1);
    //size 10 array, 8 zeroaddresses, admin, alice
    // let group_members = [admin, alice, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS];
    let group_members = [admin, alice, bob];


    env.impersonate(admin);

    let initializer_call_interface = PrivateGroups::interface().constructor(admin, group_members);
    // env.call_private_void(initializer_call_interface);
    // env.advance_block_by(1);

    let private_group_contract = env.deploy_self("PrivateGroups").with_private_initializer(initializer_call_interface);
    // env.call_private_void(private_group_contract); // this is broken, need to look at this

    env.advance_block_by(1);

    //deploy token
    let token_contract_call_interface = Token::interface().constructor(
        admin,
        "TestToken0000000000000000000000",
        "TT00000000000000000000000000000",
        18
    );

    let token_contract = env.deploy_self("Token").with_public_initializer(token_contract_call_interface);
    let token_contract_address = token_contract.to_address();
    env.advance_block_by(1);

    println("Private group contract deployed");

    (&mut env, private_group_contract.to_address(), admin, alice, bob, token_contract_address)
}

unconstrained pub fn check_private_balance(
    token_contract_address: AztecAddress,
    address: AztecAddress,
    address_amount: Field
) {
    let current_contract_address = get_contract_address();
    cheatcodes::set_contract_address(token_contract_address);
    // Direct call to unconstrained
    let balance_of_private = Token::balance_of_private(address);
    println(f"balance_of_private: {balance_of_private}");
    assert(balance_of_private == address_amount, "Private balance is not correct");
    cheatcodes::set_contract_address(current_contract_address);
}