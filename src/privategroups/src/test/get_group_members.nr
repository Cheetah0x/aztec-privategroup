use crate::test::utils;

use dep::aztec::note::note_getter::view_notes;
use dep::aztec::note::note_viewer_options::NoteViewerOptions;
use dep::aztec::{protocol_types::address::AztecAddress};
use crate::NewAddressNote::NewAddressNote;

use dep::std::println;
use crate::PrivateGroups;

//Test to get the group members from the contract.

#[test]
unconstrained fn get_group_members_through_admin() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(admin);
    let members: [AztecAddress; 3] = PrivateGroups::at(private_group_contract).get_group_members(admin).view(&mut env.private());
    println(f"members: {members}");
    assert(members[0] == admin, "Admin not in group");
    assert(members[1] == alice, "Alice not in group");
    assert(members[2] == bob, "Bob not in group");
}

#[test]
unconstrained fn get_group_members() {
    let ( env, private_group_contract, admin, alice, bob) = utils::setup();

    env.impersonate(private_group_contract);
    let unconstrained_context = env.unkonstrained();
    let ZERO_ADDRESS: AztecAddress = AztecAddress::from_field(0x0000000000000000000000000000000000000000000000000000000000000000);

    let storage = PrivateGroups::Storage::init(unconstrained_context);
    let options = NoteViewerOptions::new();

    let group_members: BoundedVec<NewAddressNote, 10> = storage.group_members.at(admin).view_notes(options);
    let mut member_addresses = Vec::new();
    let mut member_count = 0;

    for i in 0..group_members.len() {
        if group_members.get_unchecked(i).address != ZERO_ADDRESS {
            let group_member = group_members.get_unchecked(i);
            let group_member_address = group_member.address;
            member_addresses.push(group_member_address);
            member_count += 1;
        }
    }

    assert(member_count == 3, "Group members not set correctly");
    assert(member_addresses.get(0) == admin, "Group members not set correctly");
    assert(member_addresses.get(1) == alice, "Group members not set correctly");
    assert(member_addresses.get(2) == bob, "Group members not set correctly");
}

#[test]
unconstrained fn get_group_members_fail() {
    let (env, private_group_contract, admin, alice, bob) = utils::setup();

    let ZERO_ADDRESS: AztecAddress = AztecAddress::from_field(0x0000000000000000000000000000000000000000000000000000000000000000);

    let charlie = env.create_account();
    env.impersonate(charlie);
    let members: [AztecAddress; 3] = PrivateGroups::at(private_group_contract).get_group_members(charlie).view(&mut env.private());
    assert(members[0] == ZERO_ADDRESS, "Zero address not in group");
    assert(members[1] == ZERO_ADDRESS, "Zero address not in group");
    assert(members[2] == ZERO_ADDRESS, "Zero address not in group");
}
