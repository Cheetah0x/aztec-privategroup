import React from 'react';
interface SetBalanceDialogProps {
    group: {
        name: string;
        members: string[];
    };
    newBalance: {
        Creditor: string;
        Debtor: string;
        Amount: number;
    };
    setNewBalance: (balance: any) => void;
    setBalanceBetweenMembers: () => void;
}
export declare const SetBalanceDialog: React.FC<SetBalanceDialogProps>;
export {};
//# sourceMappingURL=SetBalanceDialog.d.ts.map