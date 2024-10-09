"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, CreditCard, DollarSign, Plus, X } from "lucide-react";
import { AccountWalletWithSecretKey, Contract, deriveMasterIncomingViewingSecretKey, Fr, GrumpkinScalar } from "@aztec/aztec.js";
import { getSchnorrAccount } from "@aztec/accounts/schnorr";
import { deployerEnv } from "../config";
import { useContract } from "@/hooks/useContract";
import { access } from "fs";

interface Expense {
  id: number;
  description: string;
  amount: string;
  paidBy: string;
  to?: string;
  type: 'expense' | 'payment';
}

interface Group {
  name: string;
  members: string[];
}

interface WalletDetails {
  wallet: AccountWalletWithSecretKey;
}

interface MemberWallets {
  [memberName: string]: WalletDetails;
}

interface MemberContracts {
  [memberName: string]: { walletInstance: Contract };
}

interface Balances {
    [member: string]: {
      [otherMember: string]: number;
    };
  }
  

export default function Dashboard() {
  const [group, setGroup] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newMember, setNewMember] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [memberWallets, setMemberWallets] = useState<MemberWallets>({});
  const [memberContracts, setMemberContracts] = useState<MemberContracts>({});
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", paidBy: "" });
  const [newPayment, setNewPayment] = useState({ to: "", amount: "" });
  const [balances, setBalances] = useState<{ [member: string]: number }>({});
  const [payer, setPayer] = useState("");

  const adminWallet = memberWallets[members[0]]?.wallet;
  const groupMemberWallets = members.map((member) => memberWallets[member]?.wallet);

  const { deploy, contract, wait, walletInstances } = useContract(adminWallet, groupMemberWallets);

  const addMember = async () => {
    if (newMember && !members.includes(newMember)) {
      const wallet = await createAccount();
      setMembers([...members, newMember]);
      setMemberWallets((prev) => ({
        ...prev,
        [newMember]: wallet,
      }));
      setNewMember("");
    }
  };

  const createAccount = async (): Promise<WalletDetails> => {
    // Generate random secret and signing private key
    const wallet = await deployerEnv.getWallet();
    const salt = Fr.random();
    const { masterNullifierPublicKey, masterIncomingViewingPublicKey, masterOutgoingViewingPublicKey } = wallet.getCompleteAddress().publicKeys;
    return { wallet };
  };
  
  

  const getMemberAccount = (memberName: string) => {
    const memberContract = memberContracts[memberName];
    if (!memberContract) {
      console.error(`Error: No contract found for member: ${memberName}`);
      throw new Error(`No contract found for member: ${memberName}`);
    }
    return memberContract.walletInstance;
  };
  

  const removeMember = (memberToRemove: string) => {
    setMembers(members.filter((member) => member !== memberToRemove));
    setMemberWallets((prev) => {
      const updatedWallets = { ...prev };
      delete updatedWallets[memberToRemove];
      return updatedWallets;
    });
  };

const createGroup = async () => {
  if (newGroupName && members.length > 0) {
    const instances = await deploy();
    setGroup({ name: newGroupName, members });

    console.log("Wallet Instances after deployment:", instances);

    // Map each wallet instance to a member and save to `memberContracts`
    const newMemberContracts = members.reduce((acc, member, index) => {
      if (instances[index]) {
        acc[member] = { walletInstance: instances[index] as Contract };
      } else {
        console.error(`No wallet instance found for member: ${member}`);
      }
      return acc;
    }, {} as MemberContracts);

    setMemberContracts(newMemberContracts);
    setNewGroupName(""); // Reset group name

    console.log("Member Contracts after deployment:", newMemberContracts);
  }
};
  

const addExpense = async () => {
    if (newExpense.description && newExpense.amount && newExpense.paidBy) {
      try {
        const payerInstance = getMemberAccount(newExpense.paidBy);
        console.log("Payer (paidBy):", newExpense.paidBy);
        console.log("Group Members:", group?.members || []);
  
        const otherMembers = (group?.members || []).filter(
          member => member.trim().toLowerCase() !== newExpense.paidBy.trim().toLowerCase()
        );
        
        const paidByAddress = memberWallets[newExpense.paidBy].wallet.getAddress();
        const otherMemberAddresses = otherMembers.map(member => memberWallets[member].wallet.getAddress());
        console.log("Payer Instance:", payerInstance);
        console.log("Other Members:", otherMembers);
        console.log("Other Member Addresses:", otherMemberAddresses);
  
        const tx = await payerInstance.methods.setup_group_payments(
          paidByAddress,
          otherMemberAddresses,
          newExpense.amount
        ).send();
  
        await tx.wait();
        console.log("Transaction successful:", tx);
        setExpenses([
          ...expenses,
          { id: expenses.length + 1, ...newExpense, type: 'expense' },
        ]);
        setNewExpense({ description: "", amount: "", paidBy: "" });
      } catch (error: any) {
        console.error("Error adding expense:", error);
        alert(`Error: ${error.message}`);
      }
    }
  };
  
  

  const addPayment = async () => {
    if (payer && newPayment.to && newPayment.amount) {
      const payerInstance = getMemberAccount(payer);
      const payerAddress = memberWallets[payer].wallet.getAddress();
      const toAddress = memberWallets[newPayment.to].wallet.getAddress();

      const tx = await payerInstance.methods.make_payment(
        payerAddress,
        toAddress,
        newPayment.amount
      ).send();

      await tx.wait();
      console.log("Transaction successful:", tx);

      setExpenses([
        ...expenses,
        {
          id: expenses.length + 1,
          description: `Payment to ${newPayment.to}`,
          amount: newPayment.amount,
          paidBy: payer, // Include the selected payer
          to: newPayment.to,
          type: 'payment'
        }
      ]);
      setNewPayment({ to: "", amount: "" });
      setPayer(""); // Reset payer selection
    }
  };

  const fetchBalances = async () => {
    if (group) {
      const updatedBalances: Balances = {};
  
      // Fetch balances for each pair of members
      await Promise.all(
        group.members.map(async (member) => {
          updatedBalances[member] = {};
  
          await Promise.all(
            group.members.map(async (otherMember) => {
              if (member !== otherMember) {
                const contractInstance = getMemberAccount(member);
  
                // Assuming member addresses are needed
                const memberAddress = memberWallets[member].wallet.getAddress();
                const otherMemberAddress = memberWallets[otherMember].wallet.getAddress();
  
                // Fetch credit and debt between member and otherMember
                const credit = await contractInstance.methods.read_balance_credit(memberAddress, otherMemberAddress).simulate();
                const debt = await contractInstance.methods.read_balance_debt(memberAddress, otherMemberAddress).simulate();
  
                // Calculate net balance
                const balance = Number(credit) - Number(debt);
                updatedBalances[member][otherMember] = balance;
              }
            })
          );
        })
      );
  
      setBalances(updatedBalances);
      console.log("Updated balances:", updatedBalances);
    }
  };
  

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">SplitWise Clone Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {!group && (
          <Card>
            <CardHeader>
              <CardTitle>Create Group</CardTitle>
              <CardDescription>Create a new group and add members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add member"
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                  />
                  <Button onClick={addMember}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {members.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {members.map((member, index) => (
                      <div key={index} className="flex items-center bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm">
                        {member}
                        <button onClick={() => removeMember(member)} className="ml-2 text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={createGroup} disabled={!newGroupName || members.length === 0}>
                Create Group
              </Button>
            </CardFooter>
          </Card>
        )}

        {group && (
          <Card>
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
              <CardDescription>{group.members.length} members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {group.members.map((member, index) => (
                  <div key={index} className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm">
                    {member}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Balance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <span className="flex items-center">
                <ArrowUpRight className="mr-2 h-4 w-4 text-green-500" /> You are owed
              </span>
              <span className="font-bold text-green-500">$75.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <ArrowDownLeft className="mr-2 h-4 w-4 text-red-500" /> You owe
              </span>
              <span className="font-bold text-red-500">$25.00</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-muted-foreground">No transactions yet. Add an expense or make a payment!</p>
            ) : (
              <ul className="space-y-2">
                {expenses.map((transaction) => (
                  <li key={transaction.id} className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{transaction.description} </span>
                      {transaction.type === 'payment' && (
                        <span className="text-sm text-muted-foreground ml-2">to {transaction.to} </span>
                      )}
                    </div>
                    <div>
                      <span className="font-bold">${transaction.amount} </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {transaction.type === 'expense' ? 'paid by' : 'paid to'} {transaction.paidBy}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Dialog Components for Adding Expenses and Payments */}
        {group && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full">
                <DollarSign className="mr-2 h-4 w-4" /> Add New Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>Enter the details of the new expense.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">Description</Label>
                  <Input id="description" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">Amount</Label>
                  <Input id="amount" type="number" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="paidBy" className="text-right">Paid By</Label>
                  <Select onValueChange={(value) => setNewExpense({ ...newExpense, paidBy: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {group.members.map((member, index) => (
                        <SelectItem key={index} value={member}>{member}</SelectItem>
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
        )}

        {/* Dialog for Adding Payment */}
        {group && (
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
                {/* Payer Selection */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="payer" className="text-right">Payer</Label>
                  <Select onValueChange={(value) => setPayer(value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a payer" />
                    </SelectTrigger>
                    <SelectContent>
                      {group.members.map((member, index) => (
                        <SelectItem key={index} value={member}>{member}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pay To Selection */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="payTo" className="text-right">Pay To</Label>
                  <Select onValueChange={(value) => setNewPayment({ ...newPayment, to: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {group.members.filter(member => member !== payer).map((member, index) => (
                        <SelectItem key={index} value={member}>{member}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Input */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="paymentAmount" className="text-right">Amount</Label>
                  <Input id="paymentAmount" type="number" value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addPayment}>Make Payment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
