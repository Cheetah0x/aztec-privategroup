// components/AddExpenseDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { DollarSign } from 'lucide-react';

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

export const AddExpenseDialog: React.FC<AddExpenseDialogProps> = ({
  group,
  newExpense,
  setNewExpense,
  addExpense,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">
          <DollarSign className="mr-2 h-4 w-4" /> Add New Expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Enter the details of the new expense.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Description */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={newExpense.description}
              onChange={e =>
                setNewExpense({ ...newExpense, description: e.target.value })
              }
              className="col-span-3"
            />
          </div>
          {/* Amount */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={newExpense.amount === 0 ? '' : newExpense.amount.toString()}
              onChange={e => {
                const inputValue = e.target.value;
                if (/^\d*$/.test(inputValue)) {
                  setNewExpense({
                    ...newExpense,
                    amount:
                      inputValue.replace(/^0+/, '') === ''
                        ? 0
                        : parseFloat(inputValue.replace(/^0+/, '')) || 0,
                  });
                }
              }}
              className="col-span-3"
            />
          </div>
          {/* Paid By */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paidBy" className="text-right">
              Paid By
            </Label>
            <Select
              onValueChange={value =>
                setNewExpense({ ...newExpense, paidBy: value })
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {group.members.map((member, index) => (
                  <SelectItem key={index} value={member}>
                    {member}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={addExpense}>Add Expense</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
