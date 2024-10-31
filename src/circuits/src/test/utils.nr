use dep::aztec::{prelude::AztecAddress, test::helpers::{cheatcodes, test_environment::TestEnvironment}};
use dep::std::println;
use crate::PrivateGroups;

//Testing within the TXE, this setup function deploys the contract, creates the accounts that will be used in the tests. 

//This is compatible with Aztec 0.60.

//Big changes to the TXE are coming as it is new, this will need to be updated in the future. 

unconstrained pub fn setup() -> (&mut TestEnvironment, AztecAddress, AztecAddress, AztecAddress, AztecAddress) {
    let mut env = TestEnvironment::new();

    let admin = env.create_account();
    let alice = env.create_account();
    let bob = env.create_account();

    env.advance_block_by(1);
    let group_members = [admin, alice, bob];

    env.impersonate(admin);

    let initializer = PrivateGroups::interface().constructor(admin, group_members);
    let private_group_contract_deploy = env.deploy_self("PrivateGroups").with_private_initializer(initializer);
    let private_group_contract = private_group_contract_deploy.to_address();

    env.advance_block_by(1);

    println("Private group contract deployed");

    (&mut env, private_group_contract, admin, alice, bob)
}
