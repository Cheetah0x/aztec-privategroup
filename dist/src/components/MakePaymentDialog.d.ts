import React from 'react';
interface MakePaymentDialogProps {
    group: {
        name: string;
        members: string[];
    };
    payer: string;
    setPayer: (payer: string) => void;
    newPayment: {
        to: string;
        amount: number;
    };
    setNewPayment: (payment: any) => void;
    addPayment: () => void;
}
export declare const MakePaymentDialog: React.FC<MakePaymentDialogProps>;
export {};
//# sourceMappingURL=MakePaymentDialog.d.ts.map