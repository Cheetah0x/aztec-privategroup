use dep::aztec::{
    protocol_types::{
    address::AztecAddress, traits::Serialize, constants::GENERATOR_INDEX__NOTE_NULLIFIER,
    hash::poseidon2_hash_with_separator
},
    macros::notes::note,
    note::{note_header::NoteHeader, note_interface::NullifiableNote, utils::compute_note_hash_for_nullify},
    oracle::random::random, keys::getters::get_nsk_app, context::PrivateContext
};


#[note]
#[derive(Serialize)]
struct StringNote { 
    string: Field,
    randomness: Field,
    npk_m_hash: Field,
}

impl NullifiableNote for StringNote {

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

impl StringNote {
    pub fn new(string: Field, npk_m_hash: Field) -> Self {
        let randomness : Field = unsafe {
            random()
        };
        let header = NoteHeader::empty();
        StringNote { string, randomness, npk_m_hash, header }
    }
}

impl Eq for StringNote {
    fn eq(self, other: Self) -> bool {
        (self.string == other.string)
            & (self.randomness == other.randomness)
            & (self.npk_m_hash == other.npk_m_hash)
    }
}

//dont think i need serialise because of new macro
impl Serialize<3> for StringNote {
    fn serialize(self) -> [Field; 3] {
        [self.string, self.randomness, self.npk_m_hash.to_field()]
    }
}
