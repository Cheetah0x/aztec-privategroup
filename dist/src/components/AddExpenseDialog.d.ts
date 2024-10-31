import React from 'react';
interface AddExpenseDialogProps {
    group: {
        name: string;
        members: string[];
    };
    newExpense: {
        description: string;
        paidBy: string;
        amount: number;
    };
    setNewExpense: (expense: any) => void;
    addExpense: () => void;
}
export declare const AddExpenseDialog: React.FC<AddExpenseDialogProps>;
export {};
//# sourceMappingURL=AddExpenseDialog.d.ts.map