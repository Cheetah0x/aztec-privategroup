use dep::aztec::{
    hash::compute_secret_hash, prelude::AztecAddress,
    test::helpers::{cheatcodes, test_environment::TestEnvironment},
    // protocol_types::storage::map::derive_storage_slot_in_map,
    oracle::{execution::{get_block_number, get_contract_address}, unsafe_rand::unsafe_rand, storage::storage_read}
};

use crate::AdminStorage;

unconstrained pub fn setup() -> (&mut TestEnvironment, AztecAddress, AztecAddress, AztecAddress) {
    let mut env = TestEnvironment::new();

    let admin = env.create_account();
    let alice = env.create_account();

    let initializer_call_interface = AdminStorage::interface().constructor(admin);
    let admin_storage_contract = env.deploy_self("AdminStorage").with_public_initializer(initializer_call_interface);

    (&mut env, admin_storage_contract.to_address(), admin, alice)
}

//