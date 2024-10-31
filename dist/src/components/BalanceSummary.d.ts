import React from 'react';
interface BalanceSummaryProps {
    members: string[];
    balances: {
        [member: string]: {
            [otherMember: string]: number;
        };
    };
}
export declare const BalanceSummary: React.FC<BalanceSummaryProps>;
export {};
//# sourceMappingURL=BalanceSummary.d.ts.map