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


mod types;
mod test;

use dep::aztec::macros::aztec;

#[aztec]
contract PrivateGroups {

    use dep::aztec::{prelude::{Map, AztecAddress, PrivateImmutable, PrivateSet}};
    use dep::aztec::{
        encrypted_logs::encrypted_note_emission::encode_and_encrypt_note,
        keys::getters::get_public_keys,
        macros::{storage::storage, events::event, functions::{public, initializer, private, internal}}
    };
    use dep::aztec::note::note_viewer_options::NoteViewerOptions;
    use crate::types::StringNote::StringNote;
    use crate::types::NewAddressNote::NewAddressNote;
    use aztec::note::note_getter::NoteGetterOptions;
    use value_note::{balance_utils, utils::{increment, decrement}, value_note::ValueNote};
    use std::hash::poseidon2;
    use aztec::context::inputs::private_context_inputs::PrivateContextInputs;

    global ZERO_ADDRESS: AztecAddress = AztecAddress::from_field(0x0000000000000000000000000000000000000000000000000000000000000000);

    //Contract Storage
    // - `admin`: The admin who creates and manages the group
    // - `group_members`: A map of group members, each with a private set of other group members so they can see all members
    // - `group_balances_credit`: A map of balances owed to the creditor, stored with a unique key for each creditor and debtor pair
    // - `group_balances_debt`: A map of balances owed by the debtor, stored with a unique key for each debtor and creditor pair
    #[storage]
   struct Storage<Context> {
        admin: PrivateImmutable<NewAddressNote, Context>,
        group_members: Map<AztecAddress, PrivateSet<NewAddressNote, Context>, Context>,
        group_balances_credit: Map<Field, PrivateSet<ValueNote,Context>, Context>,
        group_balances_debt: Map<Field, PrivateSet<ValueNote, Context>, Context>,
   }

    // Contract Constructor:
    // - The admin creates the group and initializes group members.
    // - Each group member is added to the private set, allowing them to see other members.
    // - This operation can be expensive due to encryption and note handling for each member.
    #[private]
    #[initializer]
    fn constructor(admin: AztecAddress, group_members: [AztecAddress; 3]) {
        //setting the admin address note
        let admin_keys = get_public_keys(admin);
        let mut admin_address_note = NewAddressNote::new(admin, admin_keys.npk_m.hash());
        storage.admin.initialize(&mut admin_address_note).emit(encode_and_encrypt_note(&mut context, admin_keys.ovpk_m, admin_keys.ivpk_m, admin));

        // this is for adding members to the private set, so they can see the other members, going to be expensive
        for i in 0..3 {
            let member = group_members[i as u32];
            if (member != ZERO_ADDRESS) {
                let member_keys = get_public_keys(member);
                for i in 0..3 {
                    let member_add = group_members[i as u32];
                    let mut memberNote = NewAddressNote::new(member_add, member_keys.npk_m.hash());
                    storage.group_members.at(member).insert(&mut memberNote).emit(
                        encode_and_encrypt_note(&mut context, admin_keys.ovpk_m, member_keys.ivpk_m, member)
                    );
                }
            }
        }
    }

    // Retrieves the admin's address.
    // for testing purposes, only the admin can read this.
    #[private]
    fn get_admin() -> pub AztecAddress {
        let admin_note = storage.admin.get_note();
        admin_note.address
    }

    //For each group member, we have a private set of members so that they can see all of the members
    #[private]
    fn get_group_members(member: AztecAddress) -> [AztecAddress; 3] {
        let mut options = NoteGetterOptions::new();
        let member_note = storage.group_members.at(member).get_notes(options);
        let mut member_array : [AztecAddress; 3] = [ZERO_ADDRESS; 3];
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
        //TODO:: add assertions here to make sure that the creditor and debtor are part of the group

        //notes for the creditor
        let hash_inputs_credit = [creditor.to_field(), debtor.to_field()];
        let key_credit = poseidon2::Poseidon2::hash(hash_inputs_credit, 2);
        let loc_credit = storage.group_balances_credit.at(key_credit);
        increment(loc_credit, amount, creditor, debtor);

        // notes for the debtor
        let hash_inputs_debt = [debtor.to_field(), creditor.to_field()];
        let key_debt = poseidon2::Poseidon2::hash(hash_inputs_debt, 2);
        let loc_debt = storage.group_balances_debt.at(key_debt);
        increment(loc_debt, amount, debtor, creditor);
    }

    //can have a timestamp here for when the payment is made. 
    #[private]
    fn make_payment(debtor: AztecAddress, creditor: AztecAddress, amount: Field) {
        //do not do any assertions for now
        //reason it does a increment with a negative amount is because decrement would not work.
        //it always failed an assertion. 
        let new_amount = amount * -1;

        //notes for the creditor
        let hash_inputs_credit = [creditor.to_field(), debtor.to_field()];
        let key_credit = poseidon2::Poseidon2::hash(hash_inputs_credit, 2);
        let loc_credit = storage.group_balances_credit.at(key_credit);
        increment(loc_credit, new_amount, creditor, debtor);

        // notes for the debtor
        let hash_inputs_debt = [debtor.to_field(), creditor.to_field()];
        let key_debt = poseidon2::Poseidon2::hash(hash_inputs_debt, 2);
        let loc_debt = storage.group_balances_debt.at(key_debt);
        increment(loc_debt, new_amount, debtor, creditor);
    }

    #[private]
    fn setup_group_payments(creditor: AztecAddress, debtors: [AztecAddress; 2], amount: Field) {
        //can be called by anyone

        //increase the credit for the creditor with each member
        let shared_amount : u32 = amount as u32 / (debtors.len() + 1);
        for i in 0..2 {
            let debtor = debtors[i];
            let hash_inputs_credit = [creditor.to_field(), debtor.to_field()];
            let key_credit = poseidon2::Poseidon2::hash(hash_inputs_credit, 2);
            let loc_credit = storage.group_balances_credit.at(key_credit);
            increment(loc_credit, shared_amount.to_field(), creditor, debtor);
        }
        //increase the debt for each member with the creditor
        for i in 0..2 {
            let debtor = debtors[i];
            let hash_inputs_debt = [debtor.to_field(), creditor.to_field()];
            let key_debt = poseidon2::Poseidon2::hash(hash_inputs_debt, 2);
            let loc_debt = storage.group_balances_debt.at(key_debt);
            increment(loc_debt, shared_amount.to_field(), debtor, creditor);
        }
    }

    #[private]
    fn read_balance_credit(creditor: AztecAddress, debtor: AztecAddress) -> u64 {
        //for this function i need to also get the notes that the debtor has sent if they have sent any
        //if they have sent new notes, i need to nullify the old ones that i have sent to the debtor
        //make a new one with the new outstanding balance
        //tricky part is listening for new notes that the debtor has sent, updating the balance

        let hash_inputs_credit = [creditor.to_field(), debtor.to_field()];
        let key_credit = poseidon2::Poseidon2::hash(hash_inputs_credit, 2);
        let options = NoteGetterOptions::new();
        let balance_notes_credit: BoundedVec<ValueNote, 16> = storage.group_balances_credit.at(key_credit).get_notes(options);

        let mut total_balance = 0 as Field;
        for i in 0..balance_notes_credit.max_len() {
            if i < balance_notes_credit.len() {
                let note = balance_notes_credit.get_unchecked(i);
                total_balance += note.value;
            }
        }

        total_balance as u64
    }

    #[private]
    fn read_balance_debt(debtor: AztecAddress, creditor: AztecAddress) -> u64 {
        let hash_inputs_debt = [debtor.to_field(), creditor.to_field()];
        let key_debt = poseidon2::Poseidon2::hash(hash_inputs_debt, 2);
        let options = NoteGetterOptions::new();
        let balance_notes_debt: BoundedVec<ValueNote, 16> = storage.group_balances_debt.at(key_debt).get_notes(options);

        let mut total_balance = 0 as Field;
        for i in 0..balance_notes_debt.max_len() {
            if i < balance_notes_debt.len() {
                let note = balance_notes_debt.get_unchecked(i);
                total_balance += note.value;
            }
        }

        total_balance as u64
    }

    #[private]
    fn read_total_balance(creditor: AztecAddress, debtor: AztecAddress) -> i64 {
        //going to have to hand type this, could not call the other private functions

        //keys to check in storage

        let hash_inputs_credit = [creditor.to_field(), debtor.to_field()];
        let key = poseidon2::Poseidon2::hash(hash_inputs_credit, 2);

        //options for the notes 
        let options_1 = NoteGetterOptions::new();
        let balance_notes_credit: BoundedVec<ValueNote, 16> = storage.group_balances_credit.at(key).get_notes(options_1);

        let options_2 = NoteGetterOptions::new();
        let balance_notes_debt: BoundedVec<ValueNote, 16> = storage.group_balances_debt.at(key).get_notes(options_2);

        //sum the notes
        let mut total_balance_credit = 0 as Field;
        for i in 0..balance_notes_credit.max_len() {
            if i < balance_notes_credit.len() {
                // let note = balance_notes_credit.get_unchecked(i);
                let note = balance_notes_credit.get(i);
                total_balance_credit += note.value;
            }
        }

        //sum the notes
        let mut total_balance_debt = 0 as Field;
        for i in 0..balance_notes_debt.max_len() {
            if i < balance_notes_debt.len() {
                let note = balance_notes_debt.get(i);
                total_balance_debt += note.value;
            }
        }

        //convert the note to integer

        let total_debt = U128::from_integer(total_balance_debt);
        let total_credit = U128::from_integer(total_balance_credit);
        let tot_debt: i64 = total_debt.to_integer();
        let tot_credit: i64 = total_credit.to_integer();
        let total_balance = tot_credit - tot_debt;
        total_balance as i64
    }


    unconstrained pub(crate) fn admin() -> pub AztecAddress {
        let admin_note: NewAddressNote = storage.admin.view_note();
        admin_note.address
    }
}


