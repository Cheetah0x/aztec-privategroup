import { Group, MemberWallets } from "@/lib/types";
export declare const useGroupManagement: () => {
    group: Group | null;
    setGroup: import("react").Dispatch<import("react").SetStateAction<Group | null>>;
    newGroupName: string;
    setNewGroupName: import("react").Dispatch<import("react").SetStateAction<string>>;
    newMember: string;
    setNewMember: import("react").Dispatch<import("react").SetStateAction<string>>;
    members: string[];
    memberWallets: MemberWallets;
    addMember: () => Promise<void>;
    removeMember: (memberToRemove: string) => void;
};
//# sourceMappingURL=useGroupManagement.d.ts.map