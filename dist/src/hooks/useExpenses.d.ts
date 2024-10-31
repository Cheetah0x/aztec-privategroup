import { Expense, Balances } from "@/lib/types";
export declare const useExpenses: (group: {
    name: string;
    members: string[];
} | null, memberWallets: any, getMemberAccount: any) => {
    expenses: Expense[];
    newExpense: {
        description: string;
        paidBy: string;
        amount: number;
    };
    setNewExpense: import("react").Dispatch<import("react").SetStateAction<{
        description: string;
        paidBy: string;
        amount: number;
    }>>;
    addExpense: () => Promise<void>;
    newPayment: {
        to: string;
        amount: number;
    };
    setNewPayment: import("react").Dispatch<import("react").SetStateAction<{
        to: string;
        amount: number;
    }>>;
    addPayment: () => Promise<void>;
    newBalance: {
        Creditor: string;
        Debtor: string;
        Amount: number;
    };
    setNewBalance: import("react").Dispatch<import("react").SetStateAction<{
        Creditor: string;
        Debtor: string;
        Amount: number;
    }>>;
    setBalanceBetweenMembers: () => Promise<void>;
    balances: Balances;
    fetchBalances: () => Promise<void>;
    payer: string;
    setPayer: import("react").Dispatch<import("react").SetStateAction<string>>;
};
//# sourceMappingURL=useExpenses.d.ts.map