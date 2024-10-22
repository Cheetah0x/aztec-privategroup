// hooks/useMemberContracts.ts
import { useState } from "react";
import { useContract } from "@/hooks/useContract";
import { AccountWalletWithSecretKey, Contract } from "@aztec/aztec.js";

interface MemberContracts {
  [memberName: string]: { walletInstance: Contract };
}

export const useMemberContracts = (
  adminWallet: AccountWalletWithSecretKey | undefined,
  groupMemberWallets: AccountWalletWithSecretKey[]
) => {
  const [memberContracts, setMemberContracts] = useState<MemberContracts>({});

  const { deploy } = useContract(adminWallet!, groupMemberWallets);


  const createMemberContracts = async (members: string[]) => {
    if (!adminWallet) {
      throw new Error("Admin wallet is undefined");
    }

    const instances = await deploy();

    const newMemberContracts = members.reduce((acc, member, index) => {
      if (instances[index]) {
        const walletInstance = instances[index] as Contract;
        acc[member] = { walletInstance };
      }
      return acc;
    }, {} as MemberContracts);

    setMemberContracts(newMemberContracts);
  };

  const getMemberAccount = (memberName: string) => {
    const memberContract = memberContracts[memberName];
    if (!memberContract) {
      throw new Error(`No contract found for member: ${memberName}`);
    }
    return memberContract.walletInstance;
  };

  return {
    memberContracts,
    createMemberContracts,
    getMemberAccount,
  };
};
