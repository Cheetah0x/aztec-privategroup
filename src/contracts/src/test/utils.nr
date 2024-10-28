use dep::aztec::{
    hash::compute_secret_hash, prelude::AztecAddress,
    test::helpers::{cheatcodes, test_environment::TestEnvironment},
    // protocol_types::storage::map::derive_storage_slot_in_map,
    oracle::{execution::{get_block_number, get_contract_address}, random::random, storage::storage_read}
};
use dep::std::println;
use crate::PrivateGroups;

//Testing within the TXE, this setup function deploys the contract, creates the accounts that will be used in the tests. 

//This is compatible with Aztec 0.59.

//Big changes to the TXE are coming as it is new, this will need to be updated in the future. 

unconstrained pub fn setup() -> (&mut TestEnvironment, AztecAddress, AztecAddress, AztecAddress, AztecAddress) {
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

    let initializer = PrivateGroups::interface().constructor(admin, group_members);
    println("initializer_call_interface created");

    let private_group_contract_deploy = env.deploy_self("PrivateGroups").with_private_initializer(initializer);
    println("private_group_contract delpoyed");
    let private_group_contract = private_group_contract_deploy.to_address();
    println(f"private_group_contract: {private_group_contract}");

    env.advance_block_by(1);

    println("Private group contract deployed");

    (&mut env, private_group_contract, admin, alice, bob)
}