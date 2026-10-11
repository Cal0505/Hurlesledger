import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  ReceiptText,
  CheckCircle2,
  Copy,
  Check,
  ArrowDownLeft,
  Ban,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { HouseholdBill, Member, Transaction } from '../types/budget';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getMemberShareForBill, getPrimaryAccountLabel } from '../utils/storage';
const STEP_DEG = 28;
const Z_DEPTH = 135;
interface HostMemberViewProps {
  activeMember: Member;
  members: Member[];
  bills: HouseholdBill[];
  transactions: Transaction[];
  canManageMembers: boolean;
  currencySymbol: string;
  currentMonthKey: string;
  currentMonthName: string;
  onOpenAddMember: () => void;
  onEditMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  onToggleCoHost: (member: Member) => void;
  onOpenAddTransaction: (prefill?: Partial<Transaction>) => void;
  onLinkMemberToLogin: (memberId: string) => Promise<void>;
  setSelectedMemberId: (id: string) => void;
  setSelectedMonthDate: React.Dispatch<React.SetStateAction<Date>>;
}
export const HostMemberView: React.FC<HostMemberViewProps> = ({
  activeMember,
  members,
  bills,
  transactions,
  canManageMembers,
  currencySymbol,
  currentMonthKey,
  currentMonthName,
  onOpenAddMember,
  onEditMember,
  onDeleteMember,
  onToggleCoHost,
  onOpenAddTransaction,
  onLinkMemberToLogin,
  setSelectedMemberId,
  setSelectedMonthDate,
}) => {
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isLinkingLogin, setIsLinkingLogin] = useState(false);
  const [loginLinkMessage, setLoginLinkMessage] = useState('');
  const isMoving = useRef(false);
  const filterOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      options.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        monthFull: d.toLocaleDateString('en-GB', { month: 'long' }),
        yearFull: d.getFullYear(),
        label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        dateObj: d
      });
    }
    return options;
  }, []);
  const activeIndex = useMemo(() =>
    filterOptions.findIndex(opt => opt.key === currentMonthKey),
    [filterOptions, currentMonthKey]
  );
  const timelineDataMap = useMemo(() => {
    const dataMap: Record<string, { billed: number; paid: number; arrears: number }> = {};
    filterOptions.forEach(opt => {
      let billed = 0, paid = 0;
      bills.filter(b => b.isActive).forEach(bill => {
        billed += getMemberShareForBill(activeMember.id, bill, opt.key);
      });
      transactions
        .filter(tx => tx.type === 'incoming' &&
            (tx.fromMemberId === activeMember.id || (tx as any).memberId === activeMember.id) &&
            tx.date.slice(0, 7) === opt.key)
        .forEach(tx => { paid += tx.amount; });
      dataMap[opt.key] = {
        billed,
        paid,
        arrears: Math.max(0, Math.round((billed - paid) * 100) / 100)
      };
    });
    return dataMap;
  }, [filterOptions, bills, transactions, activeMember.id]);
  const goToIndex = (newIdx: number) => {
    if (isMoving.current) return;
    if (newIdx < 0 || newIdx >= filterOptions.length) return;
    isMoving.current = true;
    setSelectedMonthDate(filterOptions[newIdx].dateObj);
    setTimeout(() => { isMoving.current = false; }, 150);
  };
  const handleStepTimeline = (dir: 'up' | 'down') => {
    goToIndex(dir === 'up' ? activeIndex - 1 : activeIndex + 1);
  };
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMoving.current) return;
    if (Math.abs(e.deltaY) < 15) return;
    goToIndex(e.deltaY < 0 ? activeIndex - 1 : activeIndex + 1);
  };
  const hostTimelineOverview = (() => {
    if (activeMember.isAccountHolder) {
      return { accumulatedDebtPriorToCurrent: 0, grandTotalOutstanding: 0 };
    }
    let totalBillsAllTime = 0;
    let totalPaymentsAllTime = 0;
    filterOptions.forEach(opt => {
      bills
        .filter(b => b.isActive && b.incurredDate && b.incurredDate.startsWith(opt.key))
        .forEach(bill => {
          totalBillsAllTime += getMemberShareForBill(activeMember.id, bill, opt.key);
        });
    });
    transactions
      .filter(tx => tx.type === 'incoming' && (tx.fromMemberId === activeMember.id || (tx as any).memberId === activeMember.id))
      .forEach(tx => {
        totalPaymentsAllTime += tx.amount;
      });
    const grandTotalOutstanding = Math.max(0, Math.round((totalBillsAllTime - totalPaymentsAllTime) * 100) / 100);
    let currentPeriodBills = 0;
    bills
      .filter(b => b.isActive && b.incurredDate && b.incurredDate.startsWith(currentMonthKey))
      .forEach(bill => {
        currentPeriodBills += getMemberShareForBill(activeMember.id, bill, currentMonthKey);
      });
    let currentPeriodPaid = 0;
    transactions
      .filter(tx => tx.type === 'incoming' &&
          (tx.fromMemberId === activeMember.id || (tx as any).memberId === activeMember.id) &&
          tx.date.slice(0, 7) === currentMonthKey)
      .forEach(tx => {
        currentPeriodPaid += tx.amount;
      });
    const currentPeriodRemaining = Math.max(0, Math.round((currentPeriodBills - currentPeriodPaid) * 100) / 100);
    const accumulatedDebtPriorToCurrent = Math.max(0, Math.round((grandTotalOutstanding - currentPeriodRemaining) * 100) / 100);
    return { accumulatedDebtPriorToCurrent, grandTotalOutstanding };
  })();
  const participatingBills = bills.filter(
    (b) => b.isActive
      && b.participatingMemberIds.includes(activeMember.id)
      && (b.frequency !== 'one-off' || b.incurredDate?.startsWith(currentMonthKey))
  );
  const excludedBills = bills.filter(
    (b) => b.isActive
      && !b.participatingMemberIds.includes(activeMember.id)
      && (b.frequency !== 'one-off' || b.incurredDate?.startsWith(currentMonthKey))
  );
  const balance = (() => {
    let totalMonthlyShare = 0;
    participatingBills.forEach(b => {
      totalMonthlyShare += getMemberShareForBill(activeMember.id, b, currentMonthKey);
    });
    let totalPaid = 0;
    transactions
      .filter(tx => tx.type === 'incoming' &&
          (tx.fromMemberId === activeMember.id || (tx as any).memberId === activeMember.id) &&
          tx.date.slice(0, 7) === currentMonthKey)
      .forEach(tx => {
        totalPaid += tx.amount;
      });
    return {
      totalMonthlyShare,
      totalPaid,
      remainingDue: Math.max(0, Math.round((totalMonthlyShare - totalPaid) * 100) / 100)
    };
  })();
  const memberTransactions = transactions
    .filter((t) => t.type === 'incoming' && t.fromMemberId === activeMember.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const generateShareText = () => {
    let lines = [`*${currentMonthName} Household Split Breakdown for ${activeMember.name}*`];
    lines.push('');
    lines.push('Bills included:');
    participatingBills.forEach((b) => {
      const share = getMemberShareForBill(activeMember.id, b, currentMonthKey);
      lines.push(`• ${b.name}: ${formatCurrency(share, currencySymbol)}`);
    });
    lines.push('');
    lines.push(`*Total Monthly Share: ${formatCurrency(balance.totalMonthlyShare, currencySymbol)}*`);
    lines.push(`Paid to date: ${formatCurrency(balance.totalPaid, currencySymbol)}`);
    lines.push(`*Remaining Due: ${formatCurrency(balance.remainingDue, currencySymbol)}*`);
    lines.push('');
    lines.push(`Please transfer to ${getPrimaryAccountLabel(members)}. Thanks!`);
    return lines.join('\n');
  };
  const handleCopyShareText = () => {
    navigator.clipboard.writeText(generateShareText());
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="member-view-container">
      {/* Member Tabs — header removed */}
      <div className="member-tabs-container">
        {members.map((m) => {
          const isSelected = m.id === activeMember.id;
          const memberAllTimeOutstanding = (() => {
            if (m.isAccountHolder) return 0;
            let totalBillsAllTime = 0;
            let totalPaymentsAllTime = 0;
            filterOptions.forEach(opt => {
              bills.filter(b => b.isActive).forEach(bill => {
                totalBillsAllTime += getMemberShareForBill(m.id, bill, opt.key);
              });
            });
            transactions
              .filter(tx => tx.type === 'incoming' && (tx.fromMemberId === m.id || (tx as any).memberId === m.id))
              .forEach(tx => { totalPaymentsAllTime += tx.amount; });
            return Math.max(0, Math.round((totalBillsAllTime - totalPaymentsAllTime) * 100) / 100);
          })();
          const isTrulySettledAllTime = m.isAccountHolder || memberAllTimeOutstanding === 0;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              className={`member-tab-btn ${isSelected ? 'member-tab-btn--active' : ''}`}
            >
              <div className="member-tab-avatar" style={{ backgroundColor: m.avatarColor }}>
                {m.name.charAt(0)}
              </div>
              <span className="member-tab-name">{m.name}</span>
              {isTrulySettledAllTime ? (
                <Check className="member-tab-status-icon" />
              ) : (
                <span className="member-tab-balance">{formatCurrency(memberAllTimeOutstanding, currencySymbol)}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Card */}
      <div className="member-profile-card">
        {/* Profile Header */}
        <div className="member-profile-header">
          <div className="member-profile-identity">
            <div className="member-avatar-large" style={{ backgroundColor: activeMember.avatarColor }}>
              {activeMember.name.charAt(0)}
            </div>
            <div>
              <div className="member-name-row">
                <h3 className="member-name">{activeMember.name}</h3>
                {activeMember.isAccountHolder && (
                  <span className="member-role-badge">Co-Host</span>
                )}
              </div>
              {canManageMembers && (
                <button
                  type="button"
                  onClick={() => onToggleCoHost(activeMember)}
                  className={`member-toggle-cohost-btn ${activeMember.isAccountHolder ? 'member-toggle-cohost--host' : ''}`}
                >
                  {activeMember.isAccountHolder ? 'Remove Co-Host' : 'Make Co-Host'}
                </button>
              )}
              <p className="member-notes">{activeMember.notes || 'Household Flatmate'}</p>
            </div>
          </div>
          <div className="member-profile-actions">
            <button onClick={handleCopyShareText} className="member-action-btn member-action-btn--copy">
              {copiedNotification ? (
                <span className="member-copy-feedback">
                  <Check className="member-action-icon" /> Copied!
                </span>
              ) : (
                <span>
                  <Copy className="member-action-icon" /> Share Breakdown
                </span>
              )}
            </button>
            {canManageMembers && (
              <button onClick={() => onEditMember(activeMember)} className="member-action-btn member-action-btn--edit">
                <Edit3 className="member-action-icon" /> Edit Profile
              </button>
            )}
            {canManageMembers && members.length > 1 && (
              <button onClick={() => onDeleteMember(activeMember.id)} className="member-action-btn member-action-btn--delete">
                <Trash2 className="member-action-icon" />
              </button>
            )}
          </div>
        </div>

        {/* Tumbler + Metrics Grid */}
        <div className="member-tumbler-metrics-grid">
          {/* Month Tumbler */}
          <div className="member-tumbler-card">
            <button
              type="button"
              disabled={activeIndex === 0}
              onClick={() => handleStepTimeline('up')}
              className="member-tumbler-nav-btn"
            >
              <ChevronUp className="member-tumbler-icon" />
            </button>
            <div
              onWheel={handleWheelScroll}
              className="member-tumbler-viewport"
              style={{ perspective: '1200px' }}
            >
              <div className="member-tumbler-marker" />
              <div
                className="member-tumbler-rotor"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateX(${activeIndex * STEP_DEG}deg)`,
                  height: '100%'
                }}
              >
                {filterOptions.map((opt, idx) => {
                  const isSelected = idx === activeIndex;
                  const metrics = timelineDataMap[opt.key] || { billed: 0, paid: 0, arrears: 0 };
                  const dist = Math.abs(idx - activeIndex);
                  return (
                    <div
                      key={opt.key}
                      onClick={() => goToIndex(idx)}
                      className={`member-tumbler-item ${isSelected ? 'member-tumbler-item--active' : ''}`}
                      style={{
                        top: '50%',
                        marginTop: '-24px',
                        transform: `rotateX(${idx * -STEP_DEG}deg) translateZ(${Z_DEPTH}px)`,
                        opacity: dist === 0 ? 1 : dist === 1 ? 0.7 : dist === 2 ? 0.3 : 0,
                        transformOrigin: 'center center',
                        backfaceVisibility: 'hidden'
                      }}
                    >
                      <span className="member-tumbler-month">{opt.monthFull} {opt.yearFull}</span>
                      <span className={`member-tumbler-arrears ${metrics.arrears > 0 ? 'member-tumbler-arrears--due' : ''}`}>
                        {metrics.arrears > 0 ? formatCurrency(metrics.arrears, currencySymbol) : '£0'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              disabled={activeIndex === filterOptions.length - 1}
              onClick={() => handleStepTimeline('down')}
              className="member-tumbler-nav-btn"
            >
              <ChevronDown className="member-tumbler-icon" />
            </button>
          </div>

          {/* 4 Metric Cards */}
          <div className="member-metrics-grid">
            <div className="member-metric-card">
              <span className="member-metric-label">Monthly Share ({currentMonthName})</span>
              <div className="member-metric-value">{formatCurrency(balance.totalMonthlyShare, currencySymbol)}</div>
              <span className="member-metric-note">{participatingBills.length} active bills assigned</span>
            </div>
            <div className="member-metric-card">
              <span className="member-metric-label">Payments Received This Month</span>
              <div className="member-metric-value member-metric-value--positive">
                {formatCurrency(balance.totalPaid, currencySymbol)}
              </div>
              <span className="member-metric-note">{memberTransactions.length} payment entries</span>
            </div>
            <div className="member-metric-card member-metric-card--tall">
              <div>
                <span className="member-metric-label">Total Balance Due</span>
                <div className={`member-metric-value ${hostTimelineOverview.grandTotalOutstanding === 0 ? 'member-metric-value--settled' : 'member-metric-value--warning'}`}>
                  {hostTimelineOverview.grandTotalOutstanding === 0
                    ? 'Settled'
                    : formatCurrency(hostTimelineOverview.grandTotalOutstanding, currencySymbol)}
                </div>
              </div>
              <div className="member-metric-breakdown">
                <div className="member-metric-row">
                  <span>This Month:</span>
                  <span className="member-metric-figure">{formatCurrency(balance.remainingDue, currencySymbol)}</span>
                </div>
                {hostTimelineOverview.accumulatedDebtPriorToCurrent > 0 && (
                  <div className="member-metric-row member-metric-row--arrears">
                    <span>Arrears (Past Months):</span>
                    <span className="member-metric-figure">+{formatCurrency(hostTimelineOverview.accumulatedDebtPriorToCurrent, currencySymbol)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="member-metric-card member-metric-card--tall">
              <span className="member-metric-label">Quick Action</span>
              {activeMember.isAccountHolder && (
                <button
                  onClick={() => onOpenAddTransaction({
                    type: 'incoming', source: 'manual', fromMemberId: activeMember.id, ...({ memberId: activeMember.id }),
                    amount: balance.remainingDue > 0 ? balance.remainingDue : undefined,
                    description: `${activeMember.name} Bank Transfer`, category: 'Household Reimbursement',
                    date: new Date().toISOString().split('T')[0]
                  } as any)}
                  className="member-quick-action-btn member-quick-action-btn--primary"
                >
                  <Plus className="member-btn-icon" /> Record Bank Transfer
                </button>
              )}
              <button
                onClick={() => onOpenAddTransaction({
                  type: 'incoming', source: 'manual', fromMemberId: activeMember.id, ...({ memberId: activeMember.id }),
                  amount: hostTimelineOverview.grandTotalOutstanding > 0 ? hostTimelineOverview.grandTotalOutstanding : undefined,
                  description: `Cash settlement from ${activeMember.name}`, category: 'Other',
                  date: new Date().toISOString().split('T')[0]
                } as any)}
                className="member-quick-action-btn member-quick-action-btn--cash"
              >
                <Plus className="member-btn-icon" /> Record Cash Payment
              </button>
            </div>
          </div>
        </div>

        {/* Arrears Toolbar */}
        {!activeMember.isAccountHolder && (() => {
          const hostUnpaidNodes: { key: string; label: string; amount: number }[] = [];
          filterOptions.forEach(opt => {
            const metrics = timelineDataMap[opt.key];
            if (metrics && metrics.arrears > 0) {
              const labelStr = new Date(`${opt.key}-02T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
              hostUnpaidNodes.push({ key: opt.key, label: labelStr, amount: metrics.arrears });
            }
          });
          if (hostUnpaidNodes.length === 0) return null;
          return (
            <section className="member-arrears-section">
              <span className="member-arrears-heading">Unpaid Arrears Found In (Click to Settle Period):</span>
              <div className="member-arrears-tags">
                {hostUnpaidNodes.map((node) => (
                  <button
                    key={node.key}
                    type="button"
                    onClick={() => onOpenAddTransaction({
                      type: 'incoming', source: 'manual', fromMemberId: activeMember.id, ...({ memberId: activeMember.id }),
                      amount: node.amount,
                      description: `Cash settlement for ${node.label} - ${activeMember.name}`, category: 'Other',
                      date: `${node.key}-02`
                    } as any)}
                    className="member-arrears-tag"
                  >
                    <span className="member-arrears-tag-label">{node.label}:</span>
                    <span className="member-arrears-tag-amount">{formatCurrency(node.amount, currencySymbol)}</span>
                    <Plus className="member-arrears-tag-icon" />
                  </button>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Bills Tables */}
        <div className="member-bills-grid">
          {/* Participating Bills */}
          <div className="member-bills-section">
            <div className="member-bills-header-row">
              <h4 className="member-bills-title">
                <ReceiptText className="member-bills-icon member-bills-icon--active" />
                Active Bills Assigned ({participatingBills.length})
              </h4>
              <span className="member-bills-total">Total: {formatCurrency(balance.totalMonthlyShare, currencySymbol)}</span>
            </div>
            <div className="member-bills-table member-bills-table--active">
              {participatingBills.length === 0 ? (
                <div className="member-bills-empty">This member does not participate in any shared bills.</div>
              ) : (
                participatingBills.map((bill) => {
                  const share = getMemberShareForBill(activeMember.id, bill, currentMonthKey);
                  return (
                    <div key={bill.id} className="member-bill-row">
                      <div>
                        <div className="member-bill-name">{bill.name}</div>
                        <div className="member-bill-desc">
                          {bill.category} · Split {bill.participatingMemberIds.length} ways
                          (Total: {formatCurrency(bill.amount, currencySymbol)})
                        </div>
                      </div>
                      <div className="member-bill-share">{formatCurrency(share, currencySymbol)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Excluded Bills */}
          <div className="member-bills-section">
            <div className="member-bills-header-row">
              <h4 className="member-bills-title">
                <Ban className="member-bills-icon member-bills-icon--excluded" />
                Excluded Bills ({excludedBills.length})
              </h4>
              <span className="member-bills-note">Member pays £0.00</span>
            </div>
            <div className="member-bills-table member-bills-table--excluded">
              {excludedBills.length === 0 ? (
                <div className="member-bills-empty">{activeMember.name} participates in all household bills.</div>
              ) : (
                excludedBills.map((bill) => {
                  const activeCount = bill.participatingMemberIds ? bill.participatingMemberIds.length : 0;
                  const perPersonActive = activeCount > 0 ? Math.round((bill.amount / activeCount) * 100) / 100 : 0;
                  return (
                    <div key={bill.id} className="member-bill-row member-bill-row--excluded">
                      <div>
                        <div className="member-bill-name-row">
                          <span>{bill.name}</span>
                          <span className="member-excluded-badge">Excluded</span>
                        </div>
                        <div className="member-bill-desc">
                          Split among remaining {activeCount} housemates ({formatCurrency(perPersonActive, currencySymbol)} each)
                        </div>
                      </div>
                      <div className="member-bill-share member-bill-share--zero">£0.00</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="member-payments-section">
          <div className="member-payments-header-row">
            <h4 className="member-payments-title">
              <ArrowDownLeft className="member-payments-icon" />
              Payments Received from {activeMember.name}
            </h4>
            <span className="member-payments-note">Bank transfers and cash payments</span>
          </div>
          <div className="member-payments-table">
            {memberTransactions.length === 0 ? (
              <div className="member-payments-empty">
                No payment entries recorded from {activeMember.name} yet.
              </div>
            ) : (
              <div className="member-payments-list">
                {memberTransactions.map((tx) => (
                  <div key={tx.id} className="member-payment-row">
                    <div>
                      <div className="member-payment-desc">{tx.description}</div>
                      <div className="member-payment-meta">
                        {formatDate(tx.date)} · {tx.paymentMethod === 'cash' ? 'Cash' : 'Bank transfer'}
                      </div>
                    </div>
                    <div className="member-payment-amount">+{formatCurrency(tx.amount, currencySymbol)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};