import React, { useState } from 'react';
import { Users, RotateCw } from 'lucide-react';
import { HouseholdBill, Member, Transaction } from '../types/budget';
import { HostMemberView } from './HostMemberView';
import { NonHostMemberView } from './NonHostMemberView';
import { MemberModal } from './MemberModal';

type TabType = 'members' | 'access';

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
}

export const MemberProfilesView: React.FC<MemberProfilesViewProps> = (props) => {
  const {
    members,
    selectedMemberId,
    canManageMembers,
    accessRequestCount = 0,
    children
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
      {/* ✅ Only Host/Managers see top tab bar */}
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

      {/* Main Content — All members see their profile */}
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
              onEditMember={props.onEditMember}
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

      {/* Access Requests — Host/Managers only */}
      {canManageMembers && activeTab === 'access' && (
        <div className="member-profiles-access-content">
          {children || <p>No access requests at this time.</p>}
        </div>
      )}

      {/* ✅ Footer — Host/Managers ONLY */}
      {canManageMembers && (
        <footer className="app-footer">
          HurlesLedger · Shared household database
        </footer>
      )}
    </div>
  );
};