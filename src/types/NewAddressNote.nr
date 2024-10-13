use dep::aztec::{
    protocol_types::{
    address::AztecAddress, traits::{Serialize, Deserialize}, constants::GENERATOR_INDEX__NOTE_NULLIFIER,
    hash::poseidon2_hash_with_separator
},
    macros::notes::note,
    note::{note_header::NoteHeader, note_interface::NullifiableNote, utils::compute_note_hash_for_nullify},
    oracle::random::random, keys::getters::get_nsk_app, context::PrivateContext
};


#[note]
#[derive(Serialize)]
#[derive(Deserialize)]
struct NewAddressNote {
    address: AztecAddress,
    // The nullifying public key hash is used with the nsk_app to ensure that the note can be privately spent.
    npk_m_hash: Field,
}

impl NullifiableNote for NewAddressNote {

    fn compute_nullifier(self, context: &mut PrivateContext, note_hash_for_nullify: Field) -> Field {
        let secret = context.request_nsk_app(self.npk_m_hash);
        poseidon2_hash_with_separator(
            [
            note_hash_for_nullify,
            secret
        ],
            GENERATOR_INDEX__NOTE_NULLIFIER as Field
        )
    }

    unconstrained fn compute_nullifier_without_context(self) -> Field {
        let note_hash_for_nullify = compute_note_hash_for_nullify(self);
        let secret = get_nsk_app(self.npk_m_hash);
        poseidon2_hash_with_separator(
            [
            note_hash_for_nullify,
            secret
        ],
            GENERATOR_INDEX__NOTE_NULLIFIER as Field
        )
    }
}

impl NewAddressNote {
    pub fn new(address: AztecAddress, npk_m_hash: Field) -> Self {
        let header = NoteHeader::empty();
        NewAddressNote { address, npk_m_hash, header }
    }
}

impl Eq for NewAddressNote {
    fn eq(self, other: Self) -> bool {
        (self.address == other.address) & (self.npk_m_hash == other.npk_m_hash)
    }
}

//serialize is a macro now?
// impl Serialize<3> for NewAddressNote {
//     fn serialize(self) -> [Field; 3] {
//         [self.address.to_field(), self.shared_secret, self.npk_m_hash.to_field()]
//     }
// }

