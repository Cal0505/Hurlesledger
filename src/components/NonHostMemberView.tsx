import React, { useState, useMemo, useRef } from 'react';
import {
  ReceiptText,
  Ban,
  Calendar,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ArrowDownLeft,
  Edit3
} from 'lucide-react';
import { HouseholdBill, Member, Transaction } from '../types/budget';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getMemberShareForBill } from '../utils/storage';

interface NonHostMemberViewProps {
  activeMember: Member;
  bills: HouseholdBill[];
  transactions: Transaction[];
  currencySymbol: string;
  currentMonthKey: string;
  currentMonthName: string;
  onEditMember: (member: Member) => void;
  setSelectedMonthDate: React.Dispatch<React.SetStateAction<Date>>;
}

const ITEMS_PER_PAGE = 4;
const STEP_DEG = 28;
const Z_DEPTH = 135;

export const NonHostMemberView: React.FC<NonHostMemberViewProps> = ({
  activeMember,
  bills,
  transactions,
  currencySymbol,
  currentMonthKey,
  currentMonthName,
  onEditMember,
  setSelectedMonthDate,
}) => {
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [excludedPage, setExcludedPage] = useState(1);
  const isMoving = useRef(false);

  // Generate 12-month timeline — NEWEST FIRST
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

  // Timeline data: billed / paid / arrears per month
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

  // All-time outstanding
  const allTimeOutstandingDue = useMemo(() => {
    let totalBills = 0, totalPaid = 0;
    filterOptions.forEach(opt => {
      const m = timelineDataMap[opt.key];
      if (m) { totalBills += m.billed; totalPaid += m.paid; }
    });
    return Math.max(0, Math.round((totalBills - totalPaid) * 100) / 100);
  }, [filterOptions, timelineDataMap]);

  // Unpaid months list
  const unpaidMonthNodes = useMemo(() => {
    return filterOptions
      .filter(opt => (timelineDataMap[opt.key]?.arrears ?? 0) > 0)
      .map(opt => ({
        key: opt.key,
        label: new Date(`${opt.key}-02T00:00:00`).toLocaleDateString('en-GB', { month: 'short' }),
        amount: timelineDataMap[opt.key]?.arrears ?? 0
      }));
  }, [filterOptions, timelineDataMap]);

  // Timeline navigation
  const goToIndex = (newIdx: number) => {
    if (isMoving.current) return;
    if (newIdx < 0 || newIdx >= filterOptions.length) return;
    isMoving.current = true;
    setSelectedMonthDate(filterOptions[newIdx].dateObj);
    setActivePage(1);
    setExcludedPage(1);
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

  // Bills filtering
  const participatingBills = useMemo(() => bills.filter(
    b => b.isActive && b.participatingMemberIds.includes(activeMember.id) &&
        (b.frequency !== 'one-off' || b.incurredDate?.startsWith(currentMonthKey))
  ), [bills, activeMember.id, currentMonthKey]);

  const excludedBills = useMemo(() => bills.filter(
    b => b.isActive && !b.participatingMemberIds.includes(activeMember.id) &&
        (b.frequency !== 'one-off' || b.incurredDate?.startsWith(currentMonthKey))
  ), [bills, activeMember.id, currentMonthKey]);

  // Pagination
  const totalActivePages = Math.ceil(participatingBills.length / ITEMS_PER_PAGE) || 1;
  const totalExcludedPages = Math.ceil(excludedBills.length / ITEMS_PER_PAGE) || 1;

  const paginatedActiveBills = useMemo(() => {
    const offset = (activePage - 1) * ITEMS_PER_PAGE;
    return participatingBills.slice(offset, offset + ITEMS_PER_PAGE);
  }, [participatingBills, activePage]);

  const paginatedExcludedBills = useMemo(() => {
    const offset = (excludedPage - 1) * ITEMS_PER_PAGE;
    return excludedBills.slice(offset, offset + ITEMS_PER_PAGE);
  }, [excludedBills, excludedPage]);

  // Payments history
  const memberTransactions = useMemo(() => transactions
    .filter(t =>
      t.type === 'incoming' &&
      t.fromMemberId === activeMember.id &&
      t.date.slice(0, 7) === currentMonthKey
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [transactions, activeMember.id, currentMonthKey]);

  const coveragePercent = useMemo(() => {
    const owed = timelineDataMap[currentMonthKey]?.billed ?? 0;
    const paid = timelineDataMap[currentMonthKey]?.paid ?? 0;
    return owed > 0 ? Math.min(100, Math.round((paid / owed) * 100)) : 100;
  }, [timelineDataMap, currentMonthKey]);

  const handleCopyShareText = () => {
    let lines = [`*${currentMonthName} Split Breakdown for ${activeMember.name}*`];
    participatingBills.forEach((b) => {
      const share = getMemberShareForBill(activeMember.id, b, currentMonthKey);
      lines.push(`• ${b.name}: ${formatCurrency(share, currencySymbol)}`);
    });
    lines.push(`*Total Balance Due: ${formatCurrency(allTimeOutstandingDue, currencySymbol)}*`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="non-host-view member-profile-card">
      {/* Header — Clean, no tabs, no extra Refresh */}
      <div className="non-host-header">
        <div className="non-host-header-profile">
          <div
            className="non-host-avatar"
            style={{ backgroundColor: activeMember.avatarColor }}
          >
            {activeMember.name.charAt(0)}
          </div>
          <div className="non-host-profile-info">
            <h3 className="non-host-name">{activeMember.name}</h3>
            <p className="non-host-meta">
              {activeMember.email || 'No email specified'} · {activeMember.notes || 'Household Member'}
            </p>
          </div>
        </div>
        <div className="non-host-header-actions">
          <button onClick={handleCopyShareText} className="non-host-btn non-host-btn--copy">
            {copiedNotification ? (
              <span className="non-host-feedback">
                <Check className="non-host-icon-sm" />
                Copied!
              </span>
            ) : (
              <span className="non-host-btn-content">
                <Copy className="non-host-icon-sm" />
                Copy Shares
              </span>
            )}
          </button>
          <button onClick={() => onEditMember(activeMember)} className="non-host-btn non-host-btn--edit">
            <Edit3 className="non-host-icon-sm" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Tumbler + Metrics */}
      <div className="non-host-tumbler-metrics-grid">
        {/* Month Selector Card */}
        <div className="non-host-tumbler-card">
          <button
            type="button"
            disabled={activeIndex <= 0}
            onClick={() => handleStepTimeline('up')}
            className="non-host-tumbler-nav-btn"
          >
            <ChevronUp className="non-host-tumbler-icon" />
          </button>
          <div
            onWheel={handleWheelScroll}
            className="non-host-tumbler-viewport"
            style={{ perspective: '1200px' }}
          >
            <div className="non-host-tumbler-marker" />
            <div
              className="non-host-tumbler-rotor"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${activeIndex * STEP_DEG}deg)`,
                height: '100%'
              }}
            >
              {filterOptions.map((opt, idx) => {
                const isSelected = idx === activeIndex;
                const dist = Math.abs(idx - activeIndex);
                const metrics = timelineDataMap[opt.key] || { billed: 0, paid: 0, arrears: 0 };
                return (
                  <div
                    key={opt.key}
                    onClick={() => goToIndex(idx)}
                    className={`non-host-tumbler-item ${isSelected ? 'non-host-tumbler-item--active' : ''}`}
                    style={{
                      top: '50%',
                      marginTop: '-24px',
                      transform: `rotateX(${idx * -STEP_DEG}deg) translateZ(${Z_DEPTH}px)`,
                      opacity: dist === 0 ? 1 : dist === 1 ? 0.7 : dist === 2 ? 0.3 : 0,
                      transformOrigin: 'center center',
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    <span className="non-host-tumbler-month">{opt.monthFull} {opt.yearFull}</span>
                    <span className={`non-host-tumbler-amount ${metrics.arrears > 0 ? 'non-host-tumbler-amount--arrears' : ''}`}>
                      {metrics.arrears > 0
                        ? `${currencySymbol}${metrics.arrears.toFixed(2)} owed`
                        : `${currencySymbol}0.00`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            disabled={activeIndex >= filterOptions.length - 1}
            onClick={() => handleStepTimeline('down')}
            className="non-host-tumbler-nav-btn"
          >
            <ChevronDown className="non-host-tumbler-icon" />
          </button>
        </div>

        {/* Metric Cards */}
        <div className="non-host-metrics-grid">
          <div className="non-host-metric-card">
            <span className="non-host-metric-label">Monthly Share</span>
            <div className="non-host-metric-value">
              {currencySymbol}{(timelineDataMap[currentMonthKey]?.billed || 0).toFixed(2)}
            </div>
            <span className="non-host-metric-note">
              {participatingBills.length} active bills assigned
            </span>
          </div>
          <div className="non-host-metric-card">
            <span className="non-host-metric-label">Payments Received</span>
            <div className="non-host-metric-value non-host-metric-value--positive">
              {currencySymbol}{(timelineDataMap[currentMonthKey]?.paid || 0).toFixed(2)}
            </div>
            <span className="non-host-metric-note">
              {coveragePercent}% covered this cycle
            </span>
          </div>
          <div className="non-host-metric-card">
            <span className="non-host-metric-label">Total Balance Due</span>
            <div className={`non-host-metric-value ${allTimeOutstandingDue === 0 ? 'non-host-metric-value--settled' : 'non-host-metric-value--warning'}`}>
              {currencySymbol}{allTimeOutstandingDue.toFixed(2)}
            </div>
            {allTimeOutstandingDue > 0 && (
              <div className="non-host-arrears-note">
                <AlertCircle className="non-host-icon-xs" />
                {unpaidMonthNodes.length} month{unpaidMonthNodes.length !== 1 ? 's' : ''} in arrears
              </div>
            )}
          </div>
          <div className="non-host-metric-card non-host-metric-card--status">
            <span className="non-host-metric-label">Account Status</span>
            <p className="non-host-status-text">
              {activeMember.isAccountHolder ? 'Primary Account Holder' : 'Verified Household Member'}
            </p>
            <div className="non-host-status-badge">
              {activeMember.isAccountHolder ? 'Host' : 'Member'}
            </div>
          </div>
        </div>
      </div>

      {/* Unpaid Arrears Section */}
      {unpaidMonthNodes.length > 0 && (
        <section className="non-host-arrears-section">
          <span className="non-host-arrears-heading">Unpaid Arrears — Click to jump</span>
          <div className="non-host-arrears-tags">
            {unpaidMonthNodes.map((node) => (
              <button
                key={node.key}
                type="button"
                onClick={() => {
                  const idx = filterOptions.findIndex(o => o.key === node.key);
                  if (idx >= 0) goToIndex(idx);
                }}
                className="non-host-arrears-tag"
              >
                {node.label}
                <span className="non-host-arrears-amount">
                  {currencySymbol}{node.amount.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Bills Tables */}
      <div className="non-host-bills-grid">
        <div className="non-host-bills-section">
          <h4 className="non-host-section-heading">
            <ReceiptText className="non-host-section-icon non-host-section-icon--primary" />
            Active Bills — Assigned ({participatingBills.length})
          </h4>
          <div className="non-host-bills-list">
            {paginatedActiveBills.length === 0 ? (
              <div className="non-host-empty-text">
                No active bills assigned to this member
              </div>
            ) : (
              paginatedActiveBills.map((bill) => {
                const share = getMemberShareForBill(activeMember.id, bill, currentMonthKey);
                return (
                  <div key={bill.id} className="non-host-bill-row">
                    <div className="non-host-bill-info">
                      <div className="non-host-bill-name">{bill.name}</div>
                      <div className="non-host-bill-meta">
                        {bill.category} · {bill.frequency}
                      </div>
                    </div>
                    <div className="non-host-bill-share">
                      {currencySymbol}{share.toFixed(2)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {totalActivePages > 1 && (
            <div className="non-host-pagination">
              <button
                type="button"
                disabled={activePage === 1}
                onClick={() => setActivePage(p => p - 1)}
                className="non-host-pagination-btn"
              >
                <ChevronLeft className="non-host-icon-xs" /> Prev
              </button>
              <span className="non-host-pagination-text">
                Page {activePage} of {totalActivePages}
              </span>
              <button
                type="button"
                disabled={activePage === totalActivePages}
                onClick={() => setActivePage(p => p + 1)}
                className="non-host-pagination-btn"
              >
                Next <ChevronRight className="non-host-icon-xs" />
              </button>
            </div>
          )}
        </div>

        <div className="non-host-bills-section">
          <h4 className="non-host-section-heading">
            <Ban className="non-host-section-icon non-host-section-icon--warning" />
            Excluded / Not Participating ({excludedBills.length})
          </h4>
          <div className="non-host-bills-list">
            {paginatedExcludedBills.length === 0 ? (
              <div className="non-host-empty-text">
                This member participates in all active bills
              </div>
            ) : (
              paginatedExcludedBills.map((bill) => (
                <div key={bill.id} className="non-host-bill-row non-host-bill-row--excluded">
                  <div className="non-host-bill-info">
                    <div className="non-host-bill-name non-host-bill-name--muted">
                      {bill.name}
                    </div>
                    <div className="non-host-bill-meta">
                      {bill.category} · {bill.frequency}
                    </div>
                  </div>
                  <div className="non-host-bill-share non-host-bill-share--zero">
                    {currencySymbol}0.00
                  </div>
                </div>
              ))
            )}
          </div>
          {totalExcludedPages > 1 && (
            <div className="non-host-pagination">
              <button
                type="button"
                disabled={excludedPage === 1}
                onClick={() => setExcludedPage(p => p - 1)}
                className="non-host-pagination-btn"
              >
                <ChevronLeft className="non-host-icon-xs" /> Prev
              </button>
              <span className="non-host-pagination-text">
                Page {excludedPage} of {totalExcludedPages}
              </span>
              <button
                type="button"
                disabled={excludedPage === totalExcludedPages}
                onClick={() => setExcludedPage(p => p + 1)}
                className="non-host-pagination-btn"
              >
                Next <ChevronRight className="non-host-icon-xs" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="non-host-history-section">
        <h4 className="non-host-section-heading">
          <ArrowDownLeft className="non-host-section-icon non-host-section-icon--success" />
          Payments Received — {currentMonthName}
        </h4>
        <div className="non-host-history-list">
          {memberTransactions.length === 0 ? (
            <div className="non-host-empty-text">
              No payment records for this period
            </div>
          ) : (
            <div className="non-host-history-entries">
              {memberTransactions.map((tx) => (
                <div key={tx.id} className="non-host-history-row">
                  <div className="non-host-history-info">
                    <div className="non-host-history-desc">{tx.description || 'Payment received'}</div>
                    <div className="non-host-history-meta">
                      {formatDate(tx.date)} · {tx.paymentMethod || 'Not specified'}
                    </div>
                  </div>
                  <div className="non-host-history-amount">
                    +{currencySymbol}{tx.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};