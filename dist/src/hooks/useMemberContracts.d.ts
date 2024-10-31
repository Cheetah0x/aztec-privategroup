import { AccountWalletWithSecretKey, Contract } from "@aztec/aztec.js";
interface MemberContracts {
    [memberName: string]: {
        walletInstance: Contract;
    };
}
export declare const useMemberContracts: (adminWallet: AccountWalletWithSecretKey | undefined, groupMemberWallets: AccountWalletWithSecretKey[]) => {
    memberContracts: MemberContracts;
    createMemberContracts: (members: string[]) => Promise<void>;
    getMemberAccount: (memberName: string) => Contract;
};
export {};
//# sourceMappingURL=useMemberContracts.d.ts.map