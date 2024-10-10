"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, CreditCard, DollarSign, Plus, X } from "lucide-react";
import { AccountManager, AccountWalletWithSecretKey, Contract, Fr } from "@aztec/aztec.js";
import { deployerEnv } from "../config";
import { useContract } from "@/hooks/useContract";



interface Expense {
  id: number;
  description: string;
  amount: Number | String;
  paidBy: string;
  to?: string;
  type: "expense" | "payment" | "balance_set";
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
  const [newExpense, setNewExpense] = useState({
    description: "",
    paidBy: "",
    amount: 0,
  });
  const [newPayment, setNewPayment] = useState({ to: "", amount: 0 });
  const [newBalance, setNewBalance] = useState({
    Creditor: "",
    Debtor: "", 
    Amount: 0,
  });
  const [balances, setBalances] = useState<Balances>({});
  const [payer, setPayer] = useState("");

  const adminWallet = memberWallets[members[0]]?.wallet;
  const groupMemberWallets = members.map(
    (member) => memberWallets[member]?.wallet
  );
  const { deploy, contract, wait, walletInstances } = useContract(
    adminWallet,
    groupMemberWallets
  );

  const addMember = async () => {
    if (newMember && !members.includes(newMember)) {
      const wallet = await deployerEnv.createNewWallet(); // Generates a unique wallet each time
      setMembers([...members, newMember]);
      setMemberWallets((prev) => ({
        ...prev,
        [newMember]: { wallet },
      }));
      console.log(
        `Added new member: ${newMember}, with unique wallet address: ${await wallet.getAddress()}`
      );
      setNewMember("");
    }
  };
  

//   const createAccount = async (): Promise<AccountWalletWithSecretKey> => {
//     const wallet = await deployerEnv.createNewWallet();
//     return  wallet ;
//   };

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
      // Deploy each member wallet, expecting each member has a unique wallet
      const instances = await deploy();
      setGroup({ name: newGroupName, members });
  
      // Map each wallet instance to each unique member
      const newMemberContracts = members.reduce((acc, member, index) => {
        if (instances[index]) {
          const walletInstance = instances[index] as Contract;
          acc[member] = { walletInstance };
          console.log(`Assigned unique wallet for ${member}: ${walletInstance}`);
        } else {
          console.error(`No wallet instance found for member: ${member}`);
        }
        return acc;
      }, {} as MemberContracts);
  
      setMemberContracts(newMemberContracts);
      setNewGroupName("");
    }
  };

  const addExpense = async () => {
    if (newExpense.description && newExpense.amount && newExpense.paidBy) {
      try {
        const payerInstance = getMemberAccount(newExpense.paidBy);
        const paidByAddress = memberWallets[newExpense.paidBy].wallet.getAddress();
        const otherMembers =
          group?.members.filter((member) => member !== newExpense.paidBy) || [];
        const otherMemberAddresses = otherMembers.map(
          (member) => memberWallets[member].wallet.getAddress()
        );
        console.log("expense amount", newExpense.amount);

        const tx = await payerInstance.methods
          .setup_group_payments(
            paidByAddress,
            otherMemberAddresses,
            newExpense.amount
          )
          .send();

        await tx.wait();

        setExpenses([
          ...expenses,
          { id: expenses.length + 1, ...newExpense, type: "expense" },
        ]);
        setNewExpense({ description: "", amount: 0, paidBy: "" });
        await fetchBalances();
      } catch (error: any) {
        console.error("Error adding expense:", error);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const addPayment = async () => {
    if (payer && newPayment.to && newPayment.amount) {
      try {
        const payerInstance = getMemberAccount(payer);
        const payerAddress = memberWallets[payer].wallet.getAddress();
        const toAddress = memberWallets[newPayment.to].wallet.getAddress();
        console.log("amount", newPayment.amount);

        const tx = await payerInstance.methods
          .make_payment(payerAddress, toAddress, newPayment.amount)
          .send();

        await tx.wait();

        setExpenses([
          ...expenses,
          {
            id: expenses.length + 1,
            description: `Payment to ${newPayment.to}`,
            amount: newPayment.amount,
            paidBy: payer,
            to: newPayment.to,
            type: "payment",
          },
        ]);
        setNewPayment({ to: "", amount: 0 });
        setPayer("");
        await fetchBalances();
      } catch (error: any) {
        console.error("Error making payment:", error);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const setBalanceBetweenMembers = async () => {
    if (newBalance.Creditor && newBalance.Debtor && newBalance.Amount) {
      try {
        const memberAInstance = getMemberAccount(newBalance.Creditor);
        const creditorAddress = memberWallets[newBalance.Creditor].wallet.getAddress();
        console.log("creditorAddress", creditorAddress);
        const debtorAddress = memberWallets[newBalance.Debtor].wallet.getAddress();
        console.log("memberBAddress", debtorAddress);
        console.log("amount", newBalance.Amount);

        const tx = await memberAInstance.methods
          .set_balance(creditorAddress, debtorAddress, newBalance.Amount)
          .send();

        await tx.wait();

        setExpenses([
          ...expenses,
          {
            id: expenses.length + 1,
            description: `Balance set between ${newBalance.Creditor} and ${newBalance.Debtor}`,
            amount: newBalance.Amount,
            paidBy: newBalance.Creditor,
            to: newBalance.Debtor,
            type: "balance_set",
          },
        ]);
        setNewBalance({ Creditor: "", Debtor: "", Amount: 0 });
        await fetchBalances();
      } catch (error: any) {
        console.error("Error setting balance:", error);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const fetchBalances = async () => {
    if (group) {
      const updatedBalances: Balances = {};
      console.log("Starting to fetch balances for group:", group.name);
  
      try {
        await Promise.all(
          group.members.map(async (member) => {
            updatedBalances[member] = {};
            console.log(`Fetching balances for member: ${member}`);
  
            await Promise.all(
              group.members.map(async (otherMember) => {
                if (member !== otherMember) {
                  console.log(`Fetching balance between ${member} and ${otherMember}`);
                  try {
                    const contractInstance = getMemberAccount(member);
                    const memberAddress = memberWallets[member].wallet.getAddress();
                    console.log(`Member address: ${memberAddress}`);
                    const otherMemberAddress = memberWallets[otherMember].wallet.getAddress();
                    console.log(`Other member address: ${otherMemberAddress}`);
  
                    // Fetch BigInt values
                    const creditResult = await contractInstance.methods.read_balance_credit(memberAddress, otherMemberAddress).simulate();
                    console.log("creditResult", creditResult);
                    const debtResult = await contractInstance.methods.read_balance_debt(memberAddress, otherMemberAddress).simulate();
                    console.log("debtResult", debtResult);
  
  
                    // Calculate the balance amd convert from hex
                    const credit = Number(creditResult);
                    console.log("credit", credit);
                    const debt = Number(debtResult);
                    console.log("debt", debt);
                    // const balance = ((credit - debt) * 0.390625);
                    const balance = (credit - debt);
                    console.log("balance", balance);
                    // Convert balance to a number for display
                    const balanceNumber = Number(balance);
  
                    updatedBalances[member][otherMember] = balanceNumber;
  
                    console.log(`Balance fetched for ${member} to ${otherMember}: ${balanceNumber}`);
                  } catch (error) {
                    console.error(`Error fetching balance for ${member} to ${otherMember}:`, error);
                    updatedBalances[member][otherMember] = 0; // Set a default value in case of error
                  }
                }
              })
            );
          })
        );
  
        setBalances(updatedBalances);
        console.log("All balances fetched successfully:", updatedBalances);
      } catch (error) {
        console.error("Error fetching balances:", error);
        alert("An error occurred while fetching balances. Please try again.");
      }
    } else {
      console.warn("Attempted to fetch balances without a group");
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">SplitWise Clone Dashboard</h1>

      {/* --------------------Create Group-------------------- */}

      <div className="grid gap-6 md:grid-cols-2">
        {!group && (
          <Card>
            <CardHeader>
              <CardTitle>Create Group</CardTitle>
              <CardDescription>
                Create a new group and add members
              </CardDescription>
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
                      <div
                        key={index}
                        className="flex items-center bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm"
                      >
                        {member}
                        <button
                          onClick={() => removeMember(member)}
                          className="ml-2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={createGroup}
                disabled={!newGroupName || members.length === 0}
              >
                Create Group
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* ----------------------Once Group is Created Show the Group Details--------------------  */}

        {group && (
          <Card>
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
              <CardDescription>{group.members.length} members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {group.members.map((member, index) => (
                  <div
                    key={index}
                    className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm"
                  >
                    {member}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ------------------------------Balance Summary of the Members-------------------- */}

        <Card>
            <CardHeader>
                <CardTitle>Balance Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => (
                    <Card key={member} className="overflow-hidden">
                    <CardHeader className="bg-muted">
                        <CardTitle className="text-lg">{member}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {members.filter(otherMember => otherMember !== member).map(otherMember => {
                        const balance = balances[member]?.[otherMember] || 0
                        const isPositive = balance > 0
                        return (
                            <div key={otherMember} className="flex justify-between items-center py-2">
                            <span className="flex items-center">
                                {isPositive ? (
                                <ArrowUpRight className="mr-2 h-4 w-4 text-green-500" />
                                ) : (
                                <ArrowDownLeft className="mr-2 h-4 w-4 text-red-500" />
                                )}
                                {otherMember}
                            </span>
                            <span className={`font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                {isPositive ? '+' : ''}{balance.toFixed(2)}
                            </span>
                            </div>
                        )
                        })}
                    </CardContent>
                    </Card>
                ))}
                </div>
            </CardContent>
            </Card>

        {/* ------------------------------Recent Transactions-------------------- */}

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
                {expenses.map((transaction) => (
                  <li
                    key={transaction.id}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <span className="font-medium">
                        {transaction.description}{" "}
                      </span>
                      {transaction.type === "payment" && (
                        <span className="text-sm text-muted-foreground ml-2">
                          to {transaction.to}{" "}
                        </span>
                      )}
                      {transaction.type === "balance_set" && (
                        <span className="text-sm text-muted-foreground ml-2">
                          between {transaction.paidBy} and {transaction.to}{" "}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-bold">${Number(transaction.amount)} </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {transaction.type === "expense"
                          ? "paid by"
                          : transaction.type === "payment"
                          ? "paid to"
                          : "set by"}{" "}
                        {transaction.paidBy}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ------------------------ Dialog Components for Adding Expenses and Payments ------------------------ */}
        {group && (
          <>
            {/* Add New Expense Dialog */}
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Input
                      id="description"
                      value={newExpense.description}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          description: e.target.value,
                        })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">
                      Amount
                    </Label>
                    <Input 
                        id="amount"
                        type="number"
                        value={newExpense.amount === 0 ? '' : newExpense.amount.toString()}
                        placeholder="Enter the amount"
                        onChange={(e) => {
                            // Only allow digits and convert the input to a number once typed in
                            const inputValue = e.target.value;
                            if (/^\d*$/.test(inputValue)) {
                              setNewExpense({
                                ...newExpense,
                                amount: inputValue.replace(/^0+/, '') === '' ? 0 : parseFloat(inputValue.replace(/^0+/, '')) || 0,
                              });
                          }
                        }}
                        className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="paidBy" className="text-right">
                      Paid By
                    </Label>
                    <Select
                      onValueChange={(value) =>
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

            {/* -------------------------------- Make a Payment Dialog -------------------------------- */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <CreditCard className="mr-2 h-4 w-4" /> Make a Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Make a Payment</DialogTitle>
                  <DialogDescription>
                    Enter the payment details.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Payer Selection */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="payer" className="text-right">
                      Payer
                    </Label>
                    <Select onValueChange={(value) => setPayer(value)}>
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

                  {/* Pay To Selection */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="payTo" className="text-right">
                      Pay To
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setNewPayment({ ...newPayment, to: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a member" />
                      </SelectTrigger>
                      <SelectContent>
                        {group.members
                          .filter((member) => member !== payer)
                          .map((member, index) => (
                            <SelectItem key={index} value={member}>
                              {member}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount Input */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="paymentAmount" className="text-right">
                      Amount
                    </Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      value={newPayment.amount === 0 ? '' : newPayment.amount.toString()}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        if (/^\d*$/.test(inputValue)) {
                          setNewPayment({
                            ...newPayment,
                            amount: inputValue.replace(/^0+/, '') === '' ? 0 : parseFloat(inputValue.replace(/^0+/, '')) || 0,
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

            {/*  ------------------------------ Set Balance Between Members Dialog -------------------------------- */}
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
                  {/* Member A Selection */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="memberA" className="text-right">
                      Creditor
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setNewBalance({ ...newBalance, Creditor: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select Member A" />
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

                  {/* Member B Selection */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="memberB" className="text-right">
                      Debtor
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setNewBalance({ ...newBalance, Debtor: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select Member B" />
                      </SelectTrigger>
                      <SelectContent>
                        {group.members
                          .filter((member) => member !== newBalance.Creditor)
                          .map((member, index) => (
                            <SelectItem key={index} value={member}>
                              {member}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount Input */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="balanceAmount" className="text-right">
                      Amount
                    </Label>
                    <Input
                      id="balanceAmount"
                      type="number"
                      value={newBalance.Amount === 0 ? '' : newBalance.Amount.toString()}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        if (/^\d*$/.test(inputValue)) {
                          setNewBalance({
                            ...newBalance,
                            Amount: inputValue.replace(/^0+/, '') === '' ? 0 : parseFloat(inputValue.replace(/^0+/, '')) || 0,
                          });
                        }
                      }}    
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={setBalanceBetweenMembers}>
                    Set Balance
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
