// components/RecentTransactions.tsx
import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Expense } from '@/lib/types';

interface RecentTransactionsProps {
  expenses: Expense[];
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  expenses,
}) => {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-muted-foreground">
            No transactions yet. Add an expense or make a payment!
          </p>
        ) : (
          <ul className="space-y-2">
            {expenses.map(transaction => (
              <li
                key={transaction.id}
                className="flex justify-between items-center"
              >
                <div>
                  <span className="font-medium">{transaction.description}</span>
                  {transaction.type === 'payment' && (
                    <span className="text-sm text-muted-foreground ml-2">
                      to {transaction.to}
                    </span>
                  )}
                  {transaction.type === 'balance_set' && (
                    <span className="text-sm text-muted-foreground ml-2">
                      between {transaction.paidBy} and {transaction.to}
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-bold">${Number(transaction.amount)}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {transaction.type === 'expense'
                      ? 'paid by'
                      : transaction.type === 'payment'
                      ? 'paid to'
                      : 'set by'}{' '}
                    {transaction.paidBy}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
