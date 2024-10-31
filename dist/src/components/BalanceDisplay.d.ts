interface Balances {
    [member: string]: {
        [otherMember: string]: number;
    };
}
interface BalanceDisplayProps {
    balances: Balances;
    members: string[];
}
export default function BalanceDisplay({ balances, members }: BalanceDisplayProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=BalanceDisplay.d.ts.map