import { AztecAddress, type AztecAddressLike, type ContractArtifact, ContractBase, ContractFunctionInteraction, type ContractMethod, type ContractStorageLayout, type ContractNotes, DeployMethod, type FieldLike, Fr, type Wallet } from "@aztec/aztec.js";
export declare const PrivateGroupsContractArtifact: ContractArtifact;
/**
 * Type-safe interface for contract PrivateGroups;
 */
export declare class PrivateGroupsContract extends ContractBase {
    private constructor();
    /**
     * Creates a contract instance.
     * @param address - The deployed contract's address.
     * @param wallet - The wallet to use when interacting with the contract.
     * @returns A promise that resolves to a new Contract instance.
     */
    static at(address: AztecAddress, wallet: Wallet): Promise<PrivateGroupsContract>;
    /**
     * Creates a tx to deploy a new instance of this contract.
     */
    static deploy(wallet: Wallet, admin: AztecAddressLike, group_members: AztecAddressLike[]): DeployMethod<PrivateGroupsContract>;
    /**
     * Creates a tx to deploy a new instance of this contract using the specified public keys hash to derive the address.
     */
    static deployWithPublicKeysHash(publicKeysHash: Fr, wallet: Wallet, admin: AztecAddressLike, group_members: AztecAddressLike[]): DeployMethod<PrivateGroupsContract>;
    /**
     * Creates a tx to deploy a new instance of this contract using the specified constructor method.
     */
    static deployWithOpts<M extends keyof PrivateGroupsContract["methods"]>(opts: {
        publicKeysHash?: Fr;
        method?: M;
        wallet: Wallet;
    }, ...args: Parameters<PrivateGroupsContract["methods"][M]>): DeployMethod<PrivateGroupsContract>;
    /**
     * Returns this contract's artifact.
     */
    static get artifact(): ContractArtifact;
    static get storage(): ContractStorageLayout<"admin" | "group_members" | "group_balances_credit" | "group_balances_debt">;
    static get notes(): ContractNotes<"AddressNote" | "StringNote" | "ValueNote" | "NewAddressNote">;
    /** Type-safe wrappers for the public methods exposed by the contract. */
    methods: {
        /** admin() */
        admin: (() => ContractFunctionInteraction) & Pick<ContractMethod, "selector">;
        /** compute_note_hash_and_optionally_a_nullifier(contract_address: struct, nonce: field, storage_slot: field, note_type_id: field, compute_nullifier: boolean, serialized_note: array) */
        compute_note_hash_and_optionally_a_nullifier: ((contract_address: AztecAddressLike, nonce: FieldLike, storage_slot: FieldLike, note_type_id: FieldLike, compute_nullifier: boolean, serialized_note: FieldLike[]) => ContractFunctionInteraction) & Pick<ContractMethod, "selector">;
        /** constructor(admin: struct, group_members: array) */
        constructor: ((admin: AztecAddressLike, group_members: AztecAddressLike[]) => ContractFunctionInteraction) & Pick<ContractMethod, "selector">;
        /** get_admin() */
        get_admin: (() => ContractFunctionInteraction) & Pick<ContractMethod, "selector">;
        /** get_group_members(member: struct) */
        get_group_members: ((member: AztecAddressLike) => ContractFunctionInteraction) & Pick<ContractMethod, "selector">;
        /** make_payment(debtor: struct, creditor: struct, amount: field) */
        make_payment: ((debtor: AztecAddressLike, creditor: AztecAddressLike, amount: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, "selector">;
        /** read_balance_credit(creditor: struct, debtor: struct) */
        read_balance_credit: ((creditor: AztecAddressLike, debtor: AztecAddressLike) => ContractFunctionInteraction) & Pick<ContractMethod, "selector">;
        /** read_balance_debt(debtor: struct, creditor: struct) */
        read_balance_debt: ((debtor: AztecAddressLike, creditor: AztecAddressLike) => ContractFunctionInteraction) & Pick<ContractMethod, "selector">;
        /** set_balance(creditor: struct, debtor: struct, amount: field) */
        set_balance: ((creditor: AztecAddressLike, debtor: AztecAddressLike, amount: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, "selector">;
        /** setup_group_payments(creditor: struct, debtors: array, amount: field) */
        setup_group_payments: ((creditor: AztecAddressLike, debtors: AztecAddressLike[], amount: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, "selector">;
    };
}
//# sourceMappingURL=PrivateGroups.d.ts.map