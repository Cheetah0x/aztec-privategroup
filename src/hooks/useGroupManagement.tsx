// hooks/useGroupManagement.ts
import { useState } from "react";
import { deployerEnv } from "../config";
import { Group, MemberWallets } from "@/lib/types";

export const useGroupManagement = () => {
  const [group, setGroup] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newMember, setNewMember] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [memberWallets, setMemberWallets] = useState<MemberWallets>({});

  const addMember = async () => {
    if (newMember && !members.includes(newMember)) {
      const wallet = await deployerEnv.createNewWallet();
      setMembers([...members, newMember]);
      setMemberWallets((prev) => ({
        ...prev,
        [newMember]: { wallet },
      }));
      setNewMember("");
    }
  };

  const removeMember = (memberToRemove: string) => {
    setMembers(members.filter((member) => member !== memberToRemove));
    setMemberWallets((prev) => {
      const updatedWallets = { ...prev };
      delete updatedWallets[memberToRemove];
      return updatedWallets;
    });
  };

  return {
    group,
    setGroup,
    newGroupName,
    setNewGroupName,
    newMember,
    setNewMember,
    members,
    memberWallets,
    addMember,
    removeMember,
  };
};
