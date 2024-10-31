import React from 'react';
interface GroupCreationCardProps {
    newGroupName: string;
    setNewGroupName: (name: string) => void;
    newMember: string;
    setNewMember: (name: string) => void;
    members: string[];
    addMember: () => void;
    removeMember: (member: string) => void;
    createGroup: () => void;
}
export declare const GroupCreationCard: React.FC<GroupCreationCardProps>;
export {};
//# sourceMappingURL=GroupCreationCard.d.ts.map