// pages/Dashboard.tsx
import React, { useEffect } from 'react';
import { useGroupManagement } from '@/hooks/useGroupManagement';
import { useMemberContracts } from '@/hooks/useMemberContracts';
import { useExpenses } from '@/hooks/useExpenses';
import { GroupCreationCard } from '@/components/GroupCreationCard';
import { GroupDetailsCard } from '@/components/GroupDetailsCard';
import { BalanceSummary } from '@/components/BalanceSummary';
import { RecentTransactions } from '@/components/RecentTransactions';
import { AddExpenseDialog } from '@/components/AddExpenseDialog';
import { MakePaymentDialog } from '@/components/MakePaymentDialog';
import { SetBalanceDialog } from '@/components/SetBalanceDialog';

export default function Dashboard() {
  const {
    group,
    setGroup,
    newGroupName,
    setNewGroupName,
    newMember,
    setNewMember,
    members,
    memberWallets,
    addMember,
    removeMember,
  } = useGroupManagement();

  const adminWallet = memberWallets[members[0]]?.wallet;
  const groupMemberWallets = members.map(
    member => memberWallets[member]?.wallet
  );

  const { memberContracts, createMemberContracts, getMemberAccount } =
    useMemberContracts(adminWallet, groupMemberWallets);

  const {
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
  } = useExpenses(group, memberWallets, getMemberAccount );

  const createGroup = async () => {
    if (newGroupName && members.length > 0) {
      await createMemberContracts(members);
      setGroup({ name: newGroupName, members });
      setNewGroupName('');
    }
  };

  useEffect(() => {
    if (group) {
      fetchBalances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">SplitWise Clone Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {!group ? (
          <GroupCreationCard
            newGroupName={newGroupName}
            setNewGroupName={setNewGroupName}
            newMember={newMember}
            setNewMember={setNewMember}
            members={members}
            addMember={addMember}
            removeMember={removeMember}
            createGroup={createGroup}
          />
        ) : (
          <GroupDetailsCard group={group} />
        )}
        {group && (
          <>
            <BalanceSummary members={members} balances={balances} />
            <RecentTransactions expenses={expenses} />
            <AddExpenseDialog
              group={group}
              newExpense={newExpense}
              setNewExpense={setNewExpense}
              addExpense={addExpense}
            />
            <MakePaymentDialog
              group={group}
              payer={payer}
              setPayer={setPayer}
              newPayment={newPayment}
              setNewPayment={setNewPayment}
              addPayment={addPayment}
            />
            <SetBalanceDialog
              group={group}
              newBalance={newBalance}
              setNewBalance={setNewBalance}
              setBalanceBetweenMembers={setBalanceBetweenMembers}
            />
          </>
        )}
      </div>
    </div>
  );
}
