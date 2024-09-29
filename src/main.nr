mod test;

use dep::aztec::macros::aztec;

#[aztec]
contract AdminStorage {

    use dep::aztec::{
        prelude::{Map, PublicMutable, AztecAddress},
        macros::{storage::storage, events::event, functions::{public, initializer, internal, view}}
    };
    use dep::std::hash::pedersen_hash;

    #[storage]
    struct Storage<Context> {
        admin: PublicMutable<AztecAddress, Context>,
        group_members: Map<AztecAddress, PublicMutable<bool, Context>, Context>,
        group_balances: Map<Field, PublicMutable<Field, Context>, Context>,
        member_count: PublicMutable<u64, Context>,
    }

    #[public]
    #[initializer]
    fn constructor(admin: AztecAddress) {
        assert(!admin.is_zero(), "invalid admin");
        storage.admin.write(admin);
        storage.group_members.at(admin).write(true);
        storage.member_count.write(1);

    }

    // Helper functions to read variables when testing

    // Read the admin
    #[public]
    #[view]
    fn admin() -> pub Field {
        storage.admin.read().to_field()
    }

    // Read the group members
    #[public]
    #[view]
    fn in_group(group_member: AztecAddress) -> pub bool {
        storage.group_members.at(group_member).read()
    }

    // Read the member count
    #[public]
    #[view]
    fn member_count() -> pub u64 {
        storage.member_count.read()
    }

    // Read the balance between two addresses
    #[public]
    #[view]
    fn balance(creditor: AztecAddress, debtor: AztecAddress) -> pub Field {
        let key = pedersen_hash([creditor.to_field(), debtor.to_field()]);
        storage.group_balances.at(key).read()
    }

    // Functional methods

    #[public]
    fn add_to_group(member: AztecAddress, approve: bool) {
        assert(storage.admin.read().eq(context.msg_sender()), "caller is not admin");
        storage.group_members.at(member).write(approve);
        if approve {
            storage.member_count.write(storage.member_count.read() + 1);

            // Emit event for the member addition
            context.emit_unencrypted_log([member.to_field()]);
        }
    }

    #[public]
    fn remove_from_group(member: AztecAddress, approve: bool) {
        assert(storage.admin.read().eq(context.msg_sender()), "caller is not admin");
        storage.group_members.at(member).write(approve);
        if approve {
            storage.member_count.write(storage.member_count.read() - 1);

            // Emit event for the member removal
            context.emit_unencrypted_log([member.to_field()]);
        }
    }

    // This sets balances but only between two people
    #[public]
    fn set_balance(creditor: AztecAddress, debtor: AztecAddress, amount: Field) {
        assert(creditor == context.msg_sender(), "cannot adjust someone else's balances");
        assert(storage.group_members.at(creditor).read() == true, "Creditor is not in group");
        assert(storage.group_members.at(debtor).read() == true, "Debtor is not in group");

        // Hash the addresses together
        let key = pedersen_hash([creditor.to_field(), debtor.to_field()]);
        let balance = storage.group_balances.at(key).read();
        let amount_to_write = amount + balance;
        storage.group_balances.at(key).write(amount_to_write);

        // Adjust the balances
        let creditor_debtor_hash = pedersen_hash([creditor.to_field(), debtor.to_field()]);
        let balance_creditor_debtor = storage.group_balances.at(creditor_debtor_hash).read() as u64;

        let debtor_creditor_hash = pedersen_hash([debtor.to_field(), creditor.to_field()]);
        let balance_debtor_creditor = storage.group_balances.at(debtor_creditor_hash).read() as u64;

        if balance_creditor_debtor > balance_debtor_creditor {
            let difference = balance_creditor_debtor - balance_debtor_creditor;
            storage.group_balances.at(creditor_debtor_hash).write(difference.to_field());
            storage.group_balances.at(debtor_creditor_hash).write(0.to_field());
        }

        if balance_debtor_creditor > balance_creditor_debtor {
            let difference = balance_debtor_creditor - balance_creditor_debtor;
            storage.group_balances.at(debtor_creditor_hash).write(difference.to_field());
            storage.group_balances.at(creditor_debtor_hash).write(0.to_field());
        }

        if balance_creditor_debtor == balance_debtor_creditor {
            storage.group_balances.at(creditor_debtor_hash).write(0.to_field());
            storage.group_balances.at(debtor_creditor_hash).write(0.to_field());
        }

        // Emit event for the balance set
        context.emit_unencrypted_log([creditor.to_field(), debtor.to_field(), amount.to_field()]);
    }

    #[public]
    fn make_payment(creditor: AztecAddress, debtor: AztecAddress, amount: u64) {
        assert(storage.group_members.at(creditor).read() == true, "Creditor is not in group");
        assert(storage.group_members.at(debtor).read() == true, "Debtor is not in group");
        let key = pedersen_hash([creditor.to_field(), debtor.to_field()]);
        let balance = storage.group_balances.at(key).read() as u64;
        assert(balance >= amount, "Insufficient balance, or paying more than is owed");

        let amount_to_write = balance - amount;
        storage.group_balances.at(key).write(amount_to_write.to_field());

        // Emit event for the payment
        context.emit_unencrypted_log([creditor.to_field(), debtor.to_field(), amount.to_field()]);
    }

    #[public]
    fn split_group_balance(
        creditor: AztecAddress,
        debtors: [AztecAddress; 10],
        participants: u64,
        amount: u64
    ) {
        assert(creditor == context.msg_sender(), "cannot adjust someone else's balances");
        assert(storage.group_members.at(creditor).read() == true, "Must be part of the group");

        let amount_per_participant = amount / (participants as u64 + 1);

        for i in 0..10 {
            let debtor = debtors[i as u32];
            if debtor.is_zero() {
                continue;
            } else {
                assert(storage.group_members.at(debtor).read() == true, "Debtor is not part of the group");
                let key = pedersen_hash([creditor.to_field(), debtor.to_field()]);
                let current_balance = storage.group_balances.at(key).read() as u64;
                let new_balance = current_balance + amount_per_participant;
                storage.group_balances.at(key).write(new_balance.to_field());

                // Emit event for the split
                context.emit_unencrypted_log([creditor.to_field(), debtor.to_field(), amount_per_participant.to_field()]);
            }
        }
    }
}
