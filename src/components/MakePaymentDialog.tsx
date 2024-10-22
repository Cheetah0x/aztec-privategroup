// components/MakePaymentDialog.tsx
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
import { CreditCard } from 'lucide-react';

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

export const MakePaymentDialog: React.FC<MakePaymentDialogProps> = ({
  group,
  payer,
  setPayer,
  newPayment,
  setNewPayment,
  addPayment,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <CreditCard className="mr-2 h-4 w-4" /> Make a Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make a Payment</DialogTitle>
          <DialogDescription>Enter the payment details.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Payer */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payer" className="text-right">
              Payer
            </Label>
            <Select onValueChange={value => setPayer(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a payer" />
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
          {/* Pay To */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payTo" className="text-right">
              Pay To
            </Label>
            <Select
              onValueChange={value =>
                setNewPayment({ ...newPayment, to: value })
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {group.members
                  .filter(member => member !== payer)
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
            <Label htmlFor="paymentAmount" className="text-right">
              Amount
            </Label>
            <Input
              id="paymentAmount"
              type="number"
              value={newPayment.amount === 0 ? '' : newPayment.amount.toString()}
              onChange={e => {
                const inputValue = e.target.value;
                if (/^\d*$/.test(inputValue)) {
                  setNewPayment({
                    ...newPayment,
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
        </div>
        <DialogFooter>
          <Button onClick={addPayment}>Make Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
