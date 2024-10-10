import { AccountWalletWithSecretKey, Contract } from '@aztec/aztec.js';
export declare function useContract(adminWallet: AccountWalletWithSecretKey, groupMembers: AccountWalletWithSecretKey[]): {
    deploy: () => Promise<Contract[]>;
    contract: Contract | undefined;
    wait: boolean;
    walletInstances: Contract[];
};
//# sourceMappingURL=useContract.d.ts.map