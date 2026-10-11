import React from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ReceiptText, 
  CheckCircle2, 
  Upload, 
  Plus, 
  ChevronRight,
  CreditCard
} from 'lucide-react';
import { HouseholdBill, Member, Transaction, ActiveTab } from '../types/budget';
import { formatCurrency, formatDate, getOrdinalSuffix } from '../utils/formatters';
import { getMemberShareForBill } from '../utils/storage';

interface PersonalDashboardProps {
  members: Member[];
  bills: HouseholdBill[];
  transactions: Transaction[];
  signedInUserId: string;
  userEmail: string;
  currencySymbol: string;
  onNavigate: (tab: ActiveTab, memberId?: string) => void;
  onOpenImportCsv: () => void;
  onOpenAddBill: () => void;
  onOpenAddTransaction: (prefill?: Partial<Transaction>) => void;
}

export const PersonalDashboard: React.FC<PersonalDashboardProps> = ({
  members,
  bills,
  transactions,
  signedInUserId,
  userEmail,
  currencySymbol,
  onNavigate,
  onOpenImportCsv,
  onOpenAddBill,
  onOpenAddTransaction,
}) => {
  const signedInMember = members.find((member) => member.authUserId === signedInUserId)
    || members.find((member) => member.email?.trim().toLowerCase() === userEmail.trim().toLowerCase());
  
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const personalTransactions = signedInMember
    ? transactions.filter((transaction) =>
        transaction.type === 'incoming' && transaction.fromMemberId === signedInMember.id
      )
    : [];
  
  const paidThisMonth = personalTransactions
    .filter((transaction) => transaction.date.startsWith(currentMonthKey))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  
  const personalBills = signedInMember
    ? bills.filter((bill) =>
        bill.isActive &&
        bill.participatingMemberIds.includes(signedInMember.id) &&
        (bill.frequency !== 'one-off' || bill.incurredDate?.startsWith(currentMonthKey))
      )
    : [];
  
  const personalBillShare = personalBills.reduce(
    (sum, bill) => sum + (signedInMember ? getMemberShareForBill(signedInMember.id, bill, currentMonthKey) : 0),
    0
  );
  
  const remainingDue = Math.max(0, personalBillShare - paidThisMonth);
  
  const memberBalances = signedInMember
    ? [{
        member: signedInMember,
        totalShare: personalBillShare,
        paid: paidThisMonth,
        remaining: remainingDue,
        isSettled: remainingDue === 0,
      }]
    : [];
  
  const recentTransactions = [...personalTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);
  
  const sortedUpcomingBills = [...personalBills].sort((a, b) => {
    if (a.dueDay !== undefined && b.dueDay !== undefined) return a.dueDay - b.dueDay;
    return 0;
  });
  
  return (
    <div className="dashboard-page">
      {/* Welcome & Actions */}
      <div className="dashboard-header-row">
        <div>
          <h2 className="dashboard-title">
            Welcome back{signedInMember ? `, ${signedInMember.name}` : ''}
          </h2>
          <p className="dashboard-subtitle">
            Your personal household overview.
          </p>
        </div>
        <div className="dashboard-top-actions">
          <button onClick={onOpenImportCsv} className="dash-btn dash-btn--secondary">
            <Upload size={14} />
            <span>Import Bank CSV</span>
          </button>
          <button onClick={() => onNavigate('household-bills')} className="dash-btn dash-btn--secondary">
            <ReceiptText size={14} />
            <span>Manage Bills</span>
          </button>
        </div>
      </div>
      
      {!signedInMember && (
        <div className="dashboard-alert">
          Your account is not linked to a household member profile yet, so personal dashboard details are unavailable.
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="dashboard-stats-grid">
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-card-header">
            <span className="dashboard-stat-label">Your Payments (This Month)</span>
            <div className="dashboard-stat-icon">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <p className="dashboard-stat-value">{formatCurrency(paidThisMonth, currencySymbol)}</p>
          <p className="dashboard-stat-desc">Recorded for your member profile</p>
        </div>
        
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-card-header">
            <span className="dashboard-stat-label">Your Bill Share</span>
            <div className="dashboard-stat-icon">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <p className="dashboard-stat-value">{formatCurrency(personalBillShare, currencySymbol)}</p>
          <p className="dashboard-stat-desc">Your share of active bills</p>
        </div>
        
        <div className="dashboard-stat-card dashboard-stat-card--accent">
          <div className="dashboard-stat-card-header">
            <span className="dashboard-stat-label">Your Amount Due</span>
            <div className="dashboard-stat-icon">
              <CreditCard size={16} />
            </div>
          </div>
          <p className="dashboard-stat-value">{formatCurrency(remainingDue, currencySymbol)}</p>
          <p className="dashboard-stat-desc">After payments recorded this month</p>
        </div>
        
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-card-header">
            <span className="dashboard-stat-label">Your Active Bills</span>
            <div className="dashboard-stat-icon">
              <ReceiptText size={16} />
            </div>
          </div>
          <p className="dashboard-stat-value">{personalBills.length}</p>
          <p className="dashboard-stat-desc">
            {personalBills.length === 1 ? 'bill includes your profile' : 'bills include your profile'}
          </p>
        </div>
      </div>
      
      {/* Main Content Grid */}
      <div className="dashboard-content-grid">
        {/* Left Column */}
        <div className="dashboard-column-left">
          <div className="dashboard-section">
            <div className="dashboard-section-header">
              <div>
                <h3 className="dashboard-section-title">Your Bill Status</h3>
                <p className="dashboard-section-subtitle">
                  Your bill share and payments recorded this month
                </p>
              </div>
              <button 
                onClick={() => signedInMember && onNavigate('members', signedInMember.id)}
                className="dashboard-link"
              >
                Your Profile <ChevronRight size={14} />
              </button>
            </div>
            
            <div className="dashboard-list">
              {memberBalances.map(({ member, totalShare, paid, remaining, isSettled }) => {
                const percent = totalShare > 0 ? Math.min(100, Math.round((paid / totalShare) * 100)) : 100;
                
                return (
                  <div key={member.id} className="dashboard-member-card">
                    <div className="dashboard-member-top">
                      <div className="dashboard-member-avatar-row">
                        <div 
                          className="dashboard-avatar"
                          style={{ '--avatar-color': member.avatarColor } as React.CSSProperties}
                        >
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <span className="dashboard-member-name">{member.name}</span>
                          <span className="dashboard-member-role">Your household profile</span>
                        </div>
                      </div>
                      <div className="dashboard-member-status">
                        {isSettled ? (
                          <span className="dashboard-status-badge">
                            <CheckCircle2 size={14} /> Settled in Full
                          </span>
                        ) : (
                          <span className="dashboard-remaining">
                            <strong>{formatCurrency(remaining, currencySymbol)}</strong> remaining
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="dashboard-progress-container">
                      <div className="dashboard-progress-bar">
                        <div 
                          className="dashboard-progress-fill"
                          style={{ '--progress-width': `${percent}%`, '--progress-color': isSettled ? 'var(--success)' : 'var(--accent)' } as React.CSSProperties}
                        />
                      </div>
                    </div>
                    
                    <div className="dashboard-progress-footer">
                      <span>
                        Contributed: <strong>{formatCurrency(paid, currencySymbol)}</strong> of {formatCurrency(totalShare, currencySymbol)}
                      </span>
                      <div className="dashboard-action-buttons">
                        <button 
                          onClick={() => onNavigate('members', member.id)}
                          className="dashboard-link dashboard-link--underlined"
                        >
                          View Profile
                        </button>
                        {!isSettled && (
                          <button 
                            onClick={() => onOpenAddTransaction({
                              type: 'incoming',
                              fromMemberId: member.id,
                              amount: remaining,
                              description: `${member.name} Bank Transfer - Household Split`,
                              category: 'Household Reimbursement'
                            })}
                            className="dashboard-link dashboard-link--accent"
                          >
                            Record Payment
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Recent Payments */}
          <div className="dashboard-section">
            <h3 className="dashboard-section-title">Your Recent Payments</h3>
            <p className="dashboard-section-subtitle">
              Payments recorded for your household profile
            </p>
            
            <div className="dashboard-transaction-list">
              {recentTransactions.length === 0 ? (
                <p className="dashboard-empty-text">
                  No payments are recorded for your profile yet.
                </p>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="dashboard-transaction-row">
                    <div className="dashboard-transaction-left">
                      <div className="dashboard-transaction-icon">
                        <ArrowDownLeft size={16} />
                      </div>
                      <div>
                        <p className="dashboard-transaction-desc">{tx.description}</p>
                        <p className="dashboard-transaction-meta">
                          {formatDate(tx.date)} · {tx.category}
                          {tx.paymentMethod === 'cash' && (
                            <> · <span className="text-success">Cash payment</span></>
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="dashboard-transaction-amount">
                      +{formatCurrency(tx.amount, currencySymbol)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column */}
        <div className="dashboard-column-right">
          <div className="dashboard-section">
            <div className="dashboard-section-header">
              <div>
                <h3 className="dashboard-section-title">Your Bills</h3>
                <p className="dashboard-section-subtitle">
                  Your share: <strong>{formatCurrency(personalBillShare, currencySymbol)}</strong>
                </p>
              </div>
              <button 
                onClick={() => onNavigate('household-bills')}
                className="dashboard-link"
              >
                Edit Rules <ChevronRight size={14} />
              </button>
            </div>
            
            <div className="dashboard-bill-list">
              {sortedUpcomingBills.length === 0 ? (
                <p className="dashboard-empty-text">
                  No active bills currently include your profile.
                </p>
              ) : (
                sortedUpcomingBills.map((bill) => {
                  const personalShare = signedInMember
                    ? getMemberShareForBill(signedInMember.id, bill, currentMonthKey)
                    : 0;
                  return (
                    <div key={bill.id} className="dashboard-bill-card">
                      <div className="dashboard-bill-left">
                        <p className="dashboard-bill-name">{bill.name}</p>
                        <p className="dashboard-bill-meta">
                          Due the {bill.dueDay ? getOrdinalSuffix(bill.dueDay) : '?'} of the month · {bill.category}
                        </p>
                      </div>
                      <div className="dashboard-bill-amount">
                        <p className="dashboard-bill-share">{formatCurrency(personalShare, currencySymbol)}</p>
                        <p className="dashboard-bill-label">Your share</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <button onClick={onOpenAddBill} className="dashboard-add-bill-btn">
              <Plus size={14} /> Add Another Household Bill
            </button>
          </div>
          
          {/* Info Banner */}
          <div className="dashboard-info-banner">
            <h4 className="dashboard-info-title">How Split Calculations Work</h4>
            <p className="dashboard-info-text">
              Your share is calculated from the active household bills that include your profile. Payments recorded against your profile reduce the amount due.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};