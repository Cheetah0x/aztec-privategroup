mod types;
mod test;

use dep::aztec::macros::aztec;

#[aztec]
contract PrivateGroups {

    use dep::aztec::{prelude::{Map, PublicMutable, AztecAddress, PrivateImmutable, PrivateSet, PrivateMutable}};
    // use dep::address_note::address_note::AddressNote;
    use dep::aztec::{
        encrypted_logs::encrypted_note_emission::encode_and_encrypt_note_with_keys,
        keys::getters::get_public_keys,
        macros::{storage::storage, events::event, functions::{public, initializer, private, internal}}
    };
    use dep::aztec::note::note_viewer_options::NoteViewerOptions;
    use crate::types::StringNote::StringNote;
    use crate::types::NewAddressNote::NewAddressNote;
    use aztec::note::note_getter::NoteGetterOptions;
    use value_note::{balance_utils, utils::{increment, decrement}, value_note::ValueNote};
    use std::hash::pedersen_hash;
    use aztec::context::inputs::private_context_inputs::PrivateContextInputs;

    global ZERO_ADDRESS: AztecAddress = AztecAddress::from_field(0x0000000000000000000000000000000000000000000000000000000000000000);

    #[storage]
   struct Storage<Context> {
        admin: PrivateImmutable<NewAddressNote, Context>,
        group_members: Map<AztecAddress, PrivateSet<NewAddressNote, Context>, Context>,
        group_balances_credit: Map<Field, PrivateSet<ValueNote,Context>, Context>,
        group_balances_debt: Map<Field, PrivateSet<ValueNote, Context>, Context>,
   }

    #[private]
    #[initializer]
    fn constructor(admin: AztecAddress, group_members: [AztecAddress; 3]) {
        //setting the admin address note
        let admin_keys = get_public_keys(admin);
        let mut admin_address_note = NewAddressNote::new(admin, admin_keys.npk_m.hash());
        storage.admin.initialize(&mut admin_address_note).emit(encode_and_encrypt_note_with_keys(&mut context, admin_keys.ovpk_m, admin_keys.ivpk_m, admin));

        //this is for adding members to the private set, so they can see the other members, going to be expensive
        for i in 0..3 {
            let member = group_members[i as u32];
            if (member != ZERO_ADDRESS) {
                let member_keys = get_public_keys(member);
                for i in 0..3 {
                    let member_add = group_members[i as u32];
                    let mut memberNote = NewAddressNote::new(member_add, member_keys.npk_m.hash());
                    storage.group_members.at(member).insert(&mut memberNote).emit(
                        encode_and_encrypt_note_with_keys(&mut context, admin_keys.ovpk_m, member_keys.ivpk_m, member)
                    );
                }
            }
        }
    }

    //need to constrain this so that only group members can read this 
    #[private]
    fn get_admin() -> pub AztecAddress {
        let admin_note = storage.admin.get_note();
        admin_note.address
    }
    // // // TODO:: BROKEN
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

    //TODO:: change the creditor to from
    // change the debtor to to, this makes it easy to keep track of the notes
    // outgoing will be from
    // incoming will be to
    #[private]
    fn set_balance(creditor: AztecAddress, debtor: AztecAddress, amount: Field) {
        //do not do any assertions for now
        //the balances will be value notes
        //this is working correctly
        // owner is the creditor
        // debtor is the outgoing viewer

        //notes for the creditor
        let key_credit = pedersen_hash([creditor.to_field(), debtor.to_field()]);
        let loc_credit = storage.group_balances_credit.at(key_credit);
        increment(loc_credit, amount, creditor, debtor);

        // notes for the debtor
        let key_debt = pedersen_hash([debtor.to_field(), creditor.to_field()]);
        let loc_debt = storage.group_balances_debt.at(key_debt);
        increment(loc_debt, amount, debtor, creditor);
    }

    //can have a timestamp here for when the payment is made. 
    #[private]
    fn make_payment(debtor: AztecAddress, creditor: AztecAddress, amount: Field) {
        //do not do any assertions for now
        let new_amount = amount * -1;

        //notes for the creditor
        let key_credit = pedersen_hash([creditor.to_field(), debtor.to_field()]);
        let loc_credit = storage.group_balances_credit.at(key_credit);
        increment(loc_credit, new_amount, creditor, debtor);

        // notes for the debtor
        let key_debt = pedersen_hash([debtor.to_field(), creditor.to_field()]);
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
            let key = pedersen_hash([creditor.to_field(), debtor.to_field()]);
            let loc_credit = storage.group_balances_credit.at(key);
            increment(loc_credit, shared_amount.to_field(), creditor, debtor);
        }
        //increase the debt for each member with the creditor
        for i in 0..2 {
            let debtor = debtors[i];
            let key = pedersen_hash([debtor.to_field(), creditor.to_field()]);
            let loc_debt = storage.group_balances_debt.at(key);
            increment(loc_debt, shared_amount.to_field(), debtor, creditor);
        }
    }

    #[private]
    fn read_balance_credit(creditor: AztecAddress, debtor: AztecAddress) -> Field {
        //for this function i need to also get the notes that the debtor has sent if they have sent any
        //if they have sent new notes, i need to nullify the old ones that i have sent to the debtor
        //make a new one with the new outstanding balance
        //tricky part is listening for new notes that the debtor has sent, updating the balance

        let key = pedersen_hash([creditor.to_field(), debtor.to_field()]);
        let options = NoteGetterOptions::new();
        let balance_notes_credit: BoundedVec<ValueNote, 16> = storage.group_balances_credit.at(key).get_notes(options);

        let mut total_balance = 0 as Field;
        for i in 0..balance_notes_credit.max_len() {
            if i < balance_notes_credit.len() {
                let note = balance_notes_credit.get_unchecked(i);
                total_balance += note.value;
            }
        }

        total_balance
    }

    #[private]
    fn read_balance_debt(debtor: AztecAddress, creditor: AztecAddress) -> Field {
        let key = pedersen_hash([debtor.to_field(), creditor.to_field()]);
        let options = NoteGetterOptions::new();
        let balance_notes_debt: BoundedVec<ValueNote, 16> = storage.group_balances_debt.at(key).get_notes(options);

        let mut total_balance = 0 as Field;
        for i in 0..balance_notes_debt.max_len() {
            if i < balance_notes_debt.len() {
                let note = balance_notes_debt.get_unchecked(i);
                total_balance += note.value;
            }
        }

        total_balance
    }

    // read the total balance of two addresses
    //for some reason this function is not working, going to have to do the ole, balance call for credit and debt and subtract in the frontend
    // #[private]
    // fn read_total_balance(creditor: AztecAddress, debtor: AztecAddress) -> Field {
    //     //going to have to hand type this, could not call the other private functions

    //     //keys to check in storage
    //     let key_credit = pedersen_hash([creditor.to_field(), debtor.to_field()]);
    //     let key_debt = pedersen_hash([debtor.to_field(), creditor.to_field()]);

    //     //options for the notes 
    //     let options_1 = NoteGetterOptions::new();
    //     let balance_notes_credit: BoundedVec<ValueNote, 16> = storage.group_balances_credit.at(key_credit).get_notes(options_1);

    //     let options_2 = NoteGetterOptions::new();
    //     let balance_notes_debt: BoundedVec<ValueNote, 16> = storage.group_balances_debt.at(key_debt).get_notes(options_2);

    //     //sum the notes
    //     let mut total_balance_credit = 0 as Field;
    //     for i in 0..balance_notes_credit.max_len() {
    //         if i < balance_notes_credit.len() {
    //             // let note = balance_notes_credit.get_unchecked(i);
    //             let note = balance_notes_credit.get(i);
    //             total_balance_credit += note.value;
    //         }
    //     }
 
    //     //sum the notes
    //     let mut total_balance_debt = 0 as Field;
    //     for i in 0..balance_notes_debt.max_len() {
    //         if i < balance_notes_debt.len() {
    //             let note = balance_notes_debt.get(i);
    //             total_balance_debt += note.value;
    //         }
    //     }

    //     // let total_balance = total_balance_credit - total_balance_debt;
    //     //i dont think this is going negative which it should

    //     total_balance_debt

    // }

    // #[private]
    // fn read_total_balance_2(creditor: AztecAddress, debtor: AztecAddress) -> Field {

    //     let total_balance_credit = read_balance_credit(&mut context, creditor, debtor);
    //     let total_balance_debt = read_balance_debt(&mut context, debtor, creditor);
    //     let total_balance = total_balance_credit - total_balance_debt;

    //     total_balance    
    // }

    unconstrained pub(crate) fn admin() -> pub AztecAddress {
        let admin_note: NewAddressNote = storage.admin.view_note();
        admin_note.address
    }
}

//TODO:: add the token transfer, have tests for that too. 
//add block time to storage for notes being paid
