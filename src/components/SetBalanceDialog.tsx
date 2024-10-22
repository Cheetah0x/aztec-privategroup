// components/SetBalanceDialog.tsx
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

export const SetBalanceDialog: React.FC<SetBalanceDialogProps> = ({
  group,
  newBalance,
  setNewBalance,
  setBalanceBetweenMembers,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <DollarSign className="mr-2 h-4 w-4" /> Set Balance P2P
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Balance Between Members</DialogTitle>
          <DialogDescription>
            Enter the details to set the balance.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Creditor */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="creditor" className="text-right">
              Creditor
            </Label>
            <Select
              onValueChange={value =>
                setNewBalance({ ...newBalance, Creditor: value })
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Creditor" />
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
          {/* Debtor */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="debtor" className="text-right">
              Debtor
            </Label>
            <Select
              onValueChange={value =>
                setNewBalance({ ...newBalance, Debtor: value })
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Debtor" />
              </SelectTrigger>
              <SelectContent>
                {group.members
                  .filter(member => member !== newBalance.Creditor)
                  .map((member, index) => (
                    <SelectItem key={index} value={member}>
                      {member}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {/* Amount */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="balanceAmount" className="text-right">
              Amount
            </Label>
            <Input
              id="balanceAmount"
              type="number"
              value={newBalance.Amount === 0 ? '' : newBalance.Amount.toString()}
              onChange={e => {
                const inputValue = e.target.value;
                if (/^\d*$/.test(inputValue)) {
                  setNewBalance({
                    ...newBalance,
                    Amount:
                      inputValue.replace(/^0+/, '') === ''
                        ? 0
                        : parseFloat(inputValue.replace(/^0+/, '')) || 0,
                  });
                }
              }}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={setBalanceBetweenMembers}>Set Balance</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
