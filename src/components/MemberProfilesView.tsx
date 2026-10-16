import React, { useState, useMemo } from 'react';
import { Users, RotateCw } from 'lucide-react';
import { HouseholdBill, Member, Transaction } from '../types/budget';
import { HostMemberView } from './HostMemberView';
import { NonHostMemberView } from './NonHostMemberView';
import { MemberModal } from './MemberModal';
import { getMemberShareForBill } from '../utils/storage';

type TabType = 'members' | 'access';

interface BalanceInfo {
  totalMonthlyShare: number;
  totalPaid: number;
  remainingDue: number;
  arrears: number;
  totalOwed: number;
}

interface MemberProfilesViewProps {
  members: Member[];
  bills: HouseholdBill[];
  transactions: Transaction[];
  canManageMembers: boolean;
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string) => void;
  currencySymbol: string;
  onOpenAddMember: () => void;
  onEditMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  onToggleCoHost: (member: Member) => void;
  onOpenAddTransaction: (prefill?: Partial<Transaction>) => void;
  signedInUserEmail: string;
  onLinkMemberToLogin: (memberId: string) => Promise<void>;
  accessRequestCount?: number;
  children?: React.ReactNode;
  onMemberBalancesReady?: (balances: Record<string, BalanceInfo>) => void;
}

export const MemberProfilesView: React.FC<MemberProfilesViewProps> = (props) => {
  const {
    members,
    bills,
    transactions,
    canManageMembers,
    selectedMemberId,
    onEditMember,
    accessRequestCount = 0,
    children,
    onMemberBalancesReady
  } = props;

  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [selectedMonthDate, setSelectedMonthDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const activeMemberId = selectedMemberId || (members[0]?.id ?? '');
  const activeMember = members.find((m) => m.id === activeMemberId) || members[0];
  const currentMonthKey = `${selectedMonthDate.getFullYear()}-${String(selectedMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthName = selectedMonthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const memberBalances = useMemo(() => {
    const balances: Record<string, BalanceInfo> = {};

    members.forEach(member => {
      if (member.isAccountHolder) {
        balances[member.id] = {
          totalMonthlyShare: 0,
          totalPaid: 0,
          remainingDue: 0,
          arrears: 0,
          totalOwed: 0
        };
        return;
      }

      let totalBillsAllTime = 0;
      let totalPaymentsAllTime = 0;
      let currentMonthBilled = 0;

      bills.filter(b => b.isActive).forEach(bill => {
        const billAny = bill as any;
        if (billAny.monthlyAllocations) {
          Object.keys(billAny.monthlyAllocations).forEach(monthKey => {
            const share = getMemberShareForBill(member.id, bill, monthKey);
            totalBillsAllTime += share;
          });
        } else {
          const share = getMemberShareForBill(member.id, bill, currentMonthKey);
          totalBillsAllTime += share;
        }

        const thisMonthShare = getMemberShareForBill(member.id, bill, currentMonthKey);
        currentMonthBilled += thisMonthShare;
      });

      transactions
        .filter(tx =>
          tx.type === 'incoming' &&
          (tx.fromMemberId === member.id || (tx as any).memberId === member.id)
        )
        .forEach(tx => {
          totalPaymentsAllTime += tx.amount;
        });

      const totalOwed = Number((totalBillsAllTime - totalPaymentsAllTime).toFixed(2));
      const remainingDue = Number(currentMonthBilled.toFixed(2));
      const arrears = Number((totalOwed - remainingDue).toFixed(2));

      balances[member.id] = {
        totalMonthlyShare: currentMonthBilled,
        totalPaid: 0,
        remainingDue,
        arrears,
        totalOwed
      };
    });

    onMemberBalancesReady?.(balances);
    return balances;
  }, [members, bills, transactions, onMemberBalancesReady, currentMonthKey]);

  if (!activeMember) {
    return (
      <div className="member-profiles-empty-state">
        <Users className="member-profiles-empty-icon" />
        <h3 className="member-profiles-empty-title">No members found</h3>
        <p className="member-profiles-empty-text">
          {canManageMembers
            ? 'Add household members to start splitting bills.'
            : 'Your login is not linked to a household member profile yet.'}
        </p>
        {canManageMembers && (
          <button
            onClick={props.onOpenAddMember}
            className="member-profiles-add-btn"
          >
            Add Household Member
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="member-profiles-wrapper">
      {canManageMembers && (
        <div className="member-profiles-tab-bar">
          <button
            className={`member-profiles-tab ${activeTab === 'members' ? 'member-profiles-tab--active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            <Users size={16} />
            Individual Members
          </button>
          <button
            className={`member-profiles-tab ${activeTab === 'access' ? 'member-profiles-tab--active' : ''}`}
            onClick={() => setActiveTab('access')}
          >
            Access Requests
            {accessRequestCount > 0 && (
              <span className="member-profiles-tab-badge">{accessRequestCount}</span>
            )}
          </button>
          <div className="member-profiles-tab-actions">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="member-profiles-refresh-btn"
            >
              <RotateCw size={16} />
              <span>Refresh Data</span>
            </button>
            <button
              onClick={props.onOpenAddMember}
              className="member-profiles-add-member-btn"
            >
              + Add Member
            </button>
          </div>
        </div>
      )}

      {(!canManageMembers || activeTab === 'members') && (
        <div className="member-profiles-content">
          {!canManageMembers ? (
            <NonHostMemberView
              activeMember={activeMember}
              bills={props.bills}
              transactions={props.transactions}
              currencySymbol={props.currencySymbol}
              currentMonthKey={currentMonthKey}
              currentMonthName={currentMonthName}
              onEditMember={onEditMember}
              setSelectedMonthDate={setSelectedMonthDate}
            />
          ) : (
            <HostMemberView
              {...props}
              activeMember={activeMember}
              currentMonthKey={currentMonthKey}
              currentMonthName={currentMonthName}
              setSelectedMonthDate={setSelectedMonthDate}
            />
          )}
        </div>
      )}

      {canManageMembers && activeTab === 'access' && (
        <div className="member-profiles-access-content">
          {children || <p>No access requests at this time.</p>}
        </div>
      )}

      {canManageMembers && (
        <footer className="app-footer">
          HurlesLedger · Shared household database
        </footer>
      )}
    </div>
  );
};