// hooks/useExpenses.ts
import { useState } from "react";
import { Expense, Balances } from "@/lib/types";

export const useExpenses = (
  group: { name: string; members: string[] } | null,
  memberWallets: any,
  getMemberAccount: any
) => {
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

  //Adding an expense between two members
  const addExpense = async () => {
    if (newExpense.description && newExpense.amount && newExpense.paidBy) {
      try {
        const payerInstance = getMemberAccount(newExpense.paidBy);
        const paidByAddress =
          memberWallets[newExpense.paidBy].wallet.getAddress();
        const otherMembers =
          group?.members.filter((member) => member !== newExpense.paidBy) || [];
        const otherMemberAddresses = otherMembers.map((member) =>
          memberWallets[member].wallet.getAddress()
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

  //Making a payment between two members
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

  //Setting the balance between two members
  const setBalanceBetweenMembers = async () => {
    if (newBalance.Creditor && newBalance.Debtor && newBalance.Amount) {
      try {
        const memberAInstance = getMemberAccount(newBalance.Creditor);
        const creditorAddress =
          memberWallets[newBalance.Creditor].wallet.getAddress();
        console.log("creditorAddress", creditorAddress);
        const debtorAddress =
          memberWallets[newBalance.Debtor].wallet.getAddress();
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

  //fetching the balance between all members
  //could be more efficient once i can get total balance to not have an underflow due to serialisation of
  //signed integers not being supported.
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
                  console.log(
                    `Fetching balance between ${member} and ${otherMember}`
                  );
                  try {
                    const contractInstance = getMemberAccount(member);
                    const memberAddress =
                      memberWallets[member].wallet.getAddress();
                    console.log(`Member address: ${memberAddress}`);
                    const otherMemberAddress =
                      memberWallets[otherMember].wallet.getAddress();
                    console.log(`Other member address: ${otherMemberAddress}`);

                    //we are using the read_balance_credit and read_balance_debt functions to get the balance between the two members
                    //the reason we are not using the read_total_balance function is because the return type is a signed integer which is 
                    //not supported yet in AztecJS.

                    // Fetch BigInt values
                    const creditResult = await contractInstance.methods
                      .read_balance_credit(memberAddress, otherMemberAddress)
                      .simulate();
                    console.log("creditResult", creditResult);
                    const debtResult = await contractInstance.methods
                      .read_balance_debt(memberAddress, otherMemberAddress)
                      .simulate();
                    console.log("debtResult", debtResult);

                    // Calculate the balance amd convert from hex
                    const credit = Number(creditResult);
                    console.log("credit", credit);
                    const debt = Number(debtResult);
                    console.log("debt", debt);
                    // const balance = ((credit - debt) * 0.390625);
                    const balance = credit - debt;
                    console.log("balance", balance);
                    // Convert balance to a number for display
                    const balanceNumber = Number(balance);

                    updatedBalances[member][otherMember] = balanceNumber;

                    console.log(
                      `Balance fetched for ${member} to ${otherMember}: ${balanceNumber}`
                    );
                  } catch (error) {
                    console.error(
                      `Error fetching balance for ${member} to ${otherMember}:`,
                      error
                    );
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

  return {
    expenses,
    newExpense,
    setNewExpense,
    addExpense,
    newPayment,
    setNewPayment,
    addPayment,
    newBalance,
    setNewBalance,
    setBalanceBetweenMembers,
    balances,
    fetchBalances,
    payer,
    setPayer,
  };
};
