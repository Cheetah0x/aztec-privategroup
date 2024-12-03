//TODO:: add the token transfer, have tests for that too.
//add block time to storage for notes being paid

//This is just a demo contract of how you could make a Splitwise like contract on Aztec
// During the exploration phase, the way this is done is by sending lots of notes to the members of the group.
//This is very expensive to do so, and is not scalable, especially as the size of the group grows.

//The next exploration is using a shared account contract which others can register in their PXE.

//This is expensive in terms of the gate count, which increases the cost and the proving time of the functions withint the contract.
//The main constraints on the Aztec network.

//This will be used for the purpose of showing the cost of certain functions within the contract.
//How different design patterns can be used to optimize the cost of the contract.

//Hopefully this can be used as an example for pepople building contracts on Aztec.

mod NewAddressNote;
mod helpers;
mod test;

use dep::aztec::macros::aztec;

#[aztec]
contract PrivateGroups {

    use aztec::{
        prelude::{Map, AztecAddress, PrivateImmutable, PrivateSet},
        encrypted_logs::encrypted_note_emission::encode_and_encrypt_note,
        keys::getters::get_public_keys,
        macros::{
            storage::storage, events::event,
            functions::{public, initializer, private, internal, view},
        },
    };
    use aztec::note::note_getter::NoteGetterOptions;
    use crate::NewAddressNote::NewAddressNote;
    use crate::helpers::{get_balance, membership_check};
    use value_note::{utils::{increment, decrement}, value_note::ValueNote};
    use std::hash::poseidon2;

    global ZERO_ADDRESS: AztecAddress = AztecAddress::from_field(
        0x0000000000000000000000000000000000000000000000000000000000000000,
    );

    //Contract Storage
    // - `admin`: The admin who creates and manages the group
    // - `group_members`: A map of group members, each with a private set of other group members so they can see all members
    // - `group_balances_credit`: A map of balances owed to the creditor, stored with a unique key for each creditor and debtor pair
    // - `group_balances_debt`: A map of balances owed by the debtor, stored with a unique key for each debtor and creditor pair
    #[storage]
    struct Storage<Context> {
        admin: PrivateImmutable<NewAddressNote, Context>,
        group_members: Map<AztecAddress, PrivateSet<NewAddressNote, Context>, Context>,
        group_balances: Map<Field, PrivateSet<ValueNote, Context>, Context>,
    }

    // Contract Constructor:
    // - The admin creates the group and initializes group members.
    // - Each group member is added to the private set, allowing them to see other members.
    // - This operation can be expensive due to encryption and note handling for each member.
    // - should i assume that the admin is the person that created the group, will do for now
    #[private]
    #[initializer]
    fn constructor(admin: AztecAddress, group_members: [AztecAddress; 3]) {
        // assert(admin == context.msg_sender(), "Admin is not the sender"); got error, user cannot assert msg_sender in first call
        //setting the admin address note
        let admin_keys = get_public_keys(admin);
        let mut admin_address_note = NewAddressNote::new(admin, admin);
        storage.admin.initialize(&mut admin_address_note).emit(encode_and_encrypt_note(
            &mut context,
            admin_keys.ovpk_m,
            admin,
            admin,
        ));

        // this is for adding members to the private set, so they can see the other members, going to be expensive
        for i in 0..3 {
            let member = group_members[i as u32];
            if (member != ZERO_ADDRESS) {
                let member_keys = get_public_keys(member);
                for i in 0..3 {
                    let member_add = group_members[i as u32];
                    let mut memberNote = NewAddressNote::new(member_add, member_add);
                    storage.group_members.at(member).insert(&mut memberNote).emit(
                        encode_and_encrypt_note(
                            &mut context,
                            admin_keys.ovpk_m,
                            member,
                            admin,
                        ),
                    );
                }
            }
        }
    }

    // Retrieves the admin's address.
    // for testing purposes, only the admin can read this.
    #[private]
    #[view]
    fn get_admin() -> pub AztecAddress {
        let admin_note = storage.admin.get_note();
        admin_note.address
    }

    //For each group member, we have a private set of members so that they can see all of the members
    #[private]
    #[view]
    fn get_group_members(member: AztecAddress) -> [AztecAddress; 3] {
        let mut options = NoteGetterOptions::new();
        let member_note = storage.group_members.at(member).get_notes(options);
        let mut member_array: [AztecAddress; 3] = [ZERO_ADDRESS; 3];
        //if you call this and u are not part of the group, it will return the zero address
        for i in 0..3 {
            let note = member_note.get_unchecked(i);
            let address: AztecAddress = note.address;
            member_array[i] = address;
        }
        member_array
    }

    //Setting the balance for the creditor and debtor
    #[private]
    fn set_balance(creditor: AztecAddress, debtor: AztecAddress, amount: Field) {
        //TODO:: add assertions here to make sure that the creditor and debtor, and sender are part of the group
        //This is just an assertion that the sender is part of the group.
        let sender = context.msg_sender();
        let member_location = storage.group_members.at(sender);
        assert(membership_check(member_location), "Sender is not in the group");

        //notes for the creditor
        let hash_inputs_credit = [creditor.to_field(), debtor.to_field()];
        let key = poseidon2::Poseidon2::hash(hash_inputs_credit, 2);
        let balance_location = storage.group_balances.at(key);
        increment(balance_location, amount, creditor, debtor, sender);
    }

    //can have a timestamp here for when the payment is made.
    #[private]
    fn make_payment(debtor: AztecAddress, creditor: AztecAddress, amount: Field) {
        let sender = context.msg_sender();
        let location = storage.group_members.at(sender);
        assert(membership_check(location), "Sender is not in the group");

        //notes for the creditor
        let hash_inputs_credit = [creditor.to_field(), debtor.to_field()];
        let key = poseidon2::Poseidon2::hash(hash_inputs_credit, 2);
        let location = storage.group_balances.at(key);
        decrement(location, amount, creditor, debtor, sender);
    }

    #[private]
    fn setup_group_payments(creditor: AztecAddress, debtors: [AztecAddress; 2], amount: Field) {
        let sender = context.msg_sender();
        let location = storage.group_members.at(sender);
        assert(membership_check(location), "Sender is not in the group");

        //increase the credit for the creditor with each member
        let shared_amount: u32 = amount as u32 / (debtors.len() + 1);
        for i in 0..2 {
            let debtor = debtors[i];
            let hash_inputs = [creditor.to_field(), debtor.to_field()];
            let key = poseidon2::Poseidon2::hash(hash_inputs, 2);
            let balance_location = storage.group_balances.at(key);
            increment(balance_location, shared_amount.to_field(), creditor, debtor, sender);
        }
    }

    #[private]
    #[view]
    fn read_balance(creditor: AztecAddress, debtor: AztecAddress) -> i64 {
        //for reading the balance, we need to get the balances for the two respective members at the two different locations
        let hash_inputs_credit = [creditor.to_field(), debtor.to_field()];
        let key_credit = poseidon2::Poseidon2::hash(hash_inputs_credit, 2);
        let balance_location_credit = storage.group_balances.at(key_credit);
        let balance_credit = get_balance(balance_location_credit);

        let hash_inputs_debt = [debtor.to_field(), creditor.to_field()];
        let key_debt = poseidon2::Poseidon2::hash(hash_inputs_debt, 2);
        let balance_location_debt = storage.group_balances.at(key_debt);
        let balance_debt = get_balance(balance_location_debt);
        let balance = balance_credit as i64 - balance_debt as i64;
        balance
    }

    pub(crate) unconstrained fn admin() -> pub AztecAddress {
        let admin_note: NewAddressNote = storage.admin.view_note();
        admin_note.address
    }
}

