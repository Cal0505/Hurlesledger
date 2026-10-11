import React, { useState, useMemo } from 'react';
import { Plus, Edit3, Trash2, Info, Search } from 'lucide-react';
import { HouseholdBill, Member, BillCategory } from '../types/budget';
import { formatCurrency, formatDate, formatMonthLabel, getOrdinalSuffix } from '../utils/formatters';
import { getBillPerPersonShare } from '../utils/storage';

interface HouseholdBillsViewProps {
  bills: HouseholdBill[];
  members: Member[];
  canManageBills: boolean;
  currencySymbol: string;
  onOpenAddBill: () => void;
  onEditBill: (bill: HouseholdBill) => void;
  onDeleteBill: (id: string) => void;
  onToggleMemberInBill: (billId: string, memberId: string) => void;
  onToggleBillActive: (billId: string) => void;
}

const ALL_CATEGORIES: BillCategory[] = [
  'Utilities',
  'Rent / Mortgage',
  'Food & Groceries',
  'Transport',
  'Entertainment',
  'Household',
  'Household Bills',
  'Other',
  'Other Expense',
];

export const HouseholdBillsView: React.FC<HouseholdBillsViewProps> = ({
  bills,
  members,
  canManageBills,
  currencySymbol,
  onOpenAddBill,
  onEditBill,
  onDeleteBill,
  onToggleMemberInBill,
  onToggleBillActive,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BillCategory | 'all'>('all');

  const selectableMonths = useMemo(() => {
    const list = [{ key: 'all', label: 'All Months' }];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      list.push({ key, label });
    }
    return list;
  }, []);

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchesSearch = searchQuery.trim() === '' ||
        bill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bill.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory = selectedCategory === 'all' || bill.category === selectedCategory;
      const billMonthKey = bill.incurredDate
        ? bill.incurredDate.slice(0, 7)
        : bill.createdAt.slice(0, 7);
      const matchesMonth = selectedMonth === 'all' || billMonthKey === selectedMonth;
      return matchesSearch && matchesCategory && matchesMonth;
    });
  }, [bills, searchQuery, selectedCategory, selectedMonth]);

  const totalMonthlyActive = filteredBills
    .filter((b) => b.isActive && b.frequency !== 'one-off')
    .reduce((sum, b) => sum + b.amount, 0);

  const groupedBills = useMemo(() => {
    const groups = new Map<string, HouseholdBill[]>();
    filteredBills.forEach((bill) => {
      const groupKey = bill.frequency === 'one-off'
        ? bill.incurredDate?.slice(0, 7) || 'undated'
        : 'recurring';
      groups.set(groupKey, [...(groups.get(groupKey) || []), bill]);
    });
    return Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === 'recurring') return -1;
      if (b[0] === 'recurring') return 1;
      return b[0].localeCompare(a[0]);
    });
  }, [filteredBills]);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedMonth !== 'all') {
      parts.push(selectableMonths.find(m => m.key === selectedMonth)?.label || '');
    }
    if (selectedCategory !== 'all') parts.push(selectedCategory);
    if (searchQuery) parts.push(`"${searchQuery}"`);
    return parts.join(' • ');
  }, [selectedMonth, selectedCategory, searchQuery, selectableMonths]);

  return (
    <div className="bills-page">
      <div className="bills-top-bar">
        <div className="bills-title-group">
          <h2 className="bills-title">Household Bills & Split Rules</h2>
          <p className="bills-subtitle">
            {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''}
            {filterSummary && ` • ${filterSummary}`}
          </p>
        </div>
        <div className="bills-actions">
          <button
            onClick={onOpenAddBill}
            className="bills-btn bills-btn--accent"
          >
            <Plus size={16} />
            <span>Add Household Bill</span>
          </button>
        </div>
      </div>

      {/* ✅ 1. STATS CARDS — FIRST */}
      <div className="bills-stats-grid">
        <div className="bill-card">
          <span className="bill-card__label">Total Monthly Shared Bills</span>
          <div className="bill-card__amount">
            {formatCurrency(totalMonthlyActive, currencySymbol)}
          </div>
          <span className="bill-card__meta">
            {filteredBills.filter((b) => b.isActive && b.frequency !== 'one-off').length} active recurring commitments
          </span>
        </div>
        <div className="bill-card">
          <span className="bill-card__label">Household Size</span>
          <div className="bill-card__amount">{members.length} Members</div>
          <span className="bill-card__meta">
            {members.map((m) => m.name).join(', ')}
          </span>
        </div>
        <div className="bill-card">
          <span className="bill-card__label">Primary Account Holder</span>
          <div className="bill-card__amount">
            {members.find((m) => m.isAccountHolder)?.name || 'Account Holder'}
          </div>
          <span className="bill-card__meta">Collects split reimbursements</span>
        </div>
      </div>

      {/* ✅ 2. INFO CALLOUT — UNDER STATS */}
      <div className="bills-info-callout">
        <Info size={20} className="bills-info-icon" />
        <div className="bills-info-text">
          <strong>Custom Participation Rule in Action:</strong>
          Check or uncheck member tags on any bill below to include or exclude them instantly.
          For example, if Carl does not use the Deezer Family subscription,
          unchecking Carl splits the bill equally between active members.
        </div>
      </div>

      {/* ✅ 3. CONTROLS BAR — UNDER INFO CALLOUT */}
      <div className="bills-controls-bar">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bills-month-select"
        >
          {selectableMonths.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        <div className="bills-search-wrapper">
          <Search className="bills-search-icon w-4 h-4" />
          <input
            type="text"
            placeholder="Search bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bills-search-input"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as BillCategory | 'all')}
          className="bills-category-select"
        >
          <option value="all">All Categories</option>
          {ALL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Bill Groups */}
      <div className="bills-groups">
        {groupedBills.length === 0 ? (
          <div className="bills-empty-state">
            <p>No bills found matching your filters.</p>
            <button
              onClick={() => {
                setSelectedMonth('all');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="bills-btn bills-btn--accent"
              style={{ marginRight: '0.75rem' }}
            >
              Clear Filters
            </button>
            {canManageBills && (
              <button onClick={onOpenAddBill} className="bills-btn bills-btn--accent">
                + Add Your First Bill
              </button>
            )}
          </div>
        ) : (
          groupedBills.map(([groupKey, groupBills]) => (
            <section key={groupKey} className="bills-group">
              <div className="bills-group-header">
                <h3 className="bills-group-title">
                  {groupKey === 'recurring'
                    ? 'Recurring household bills'
                    : groupKey === 'undated'
                      ? 'Statement bills · date unavailable'
                      : `Statement bills · ${formatMonthLabel(groupKey)}`}
                </h3>
                {groupKey !== 'recurring' && (
                  <span className="bills-group-total">
                    {formatCurrency(
                      groupBills.reduce((sum, bill) => sum + bill.amount, 0),
                      currencySymbol
                    )}
                  </span>
                )}
              </div>
              <div className="bills-grid">
                {groupBills.map((bill) => {
                  const perPerson = getBillPerPersonShare(bill);
                  const participantCount = bill.participatingMemberIds.length;
                  const excludedMembers = members.filter((m) => !bill.participatingMemberIds.includes(m.id));
                  return (
                    <div
                      key={bill.id}
                      className={`bill-card ${!bill.isActive ? 'bill-card--inactive' : ''}`}
                    >
                      <h4 className="bill-card__name">
                        {bill.name}
                        {!bill.isActive && <span className="bill-badge">Paused</span>}
                      </h4>
                      <p className="bill-card__meta">
                        {bill.category} ·{' '}
                        {bill.frequency === 'one-off'
                          ? `Statement date ${bill.incurredDate ? formatDate(bill.incurredDate) : getOrdinalSuffix(bill.dueDay)}`
                          : `Due ${getOrdinalSuffix(bill.dueDay)} of month`}
                        {' · '}
                        {bill.frequency}
                      </p>
                      <div className="bill-card__amount">
                        {formatCurrency(bill.amount, currencySymbol)}
                      </div>
                      {bill.notes && (
                        <p className="bill-card__notes">{bill.notes}</p>
                      )}
                      <div className="bill-card__split-section">
                        <div className="bill-card__split-header">
                          <span className="bill-card__split-label">
                            Participants ({participantCount} of {members.length})
                          </span>
                          <span className="bill-card__perperson">
                            {participantCount > 0
                              ? `${formatCurrency(perPerson, currencySymbol)} each`
                              : 'No participants'}
                          </span>
                        </div>
                        <div className="bill-card__members-grid">
                          {members.map((member) => {
                            const isIncluded = bill.participatingMemberIds.includes(member.id);
                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => onToggleMemberInBill(bill.id, member.id)}
                                className={`bill-member-chip ${isIncluded ? 'bill-member-chip--included' : 'bill-member-chip--excluded'}`}
                              >
                                <div className="bill-member-chip__inner">
                                  <div
                                    className="bill-member-chip__avatar"
                                    data-member-color={member.avatarColor}
                                  >
                                    {member.name.charAt(0)}
                                  </div>
                                  <span className="bill-member-chip__name">{member.name}</span>
                                </div>
                                <span className="bill-member-chip__share">
                                  {isIncluded
                                    ? formatCurrency(perPerson, currencySymbol)
                                    : `${currencySymbol}0 (excluded)`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {excludedMembers.length > 0 && (
                          <p className="bill-card__excluded-note">
                            Excluded: {excludedMembers.map((m) => m.name).join(', ')}
                            · saves {formatCurrency(perPerson, currencySymbol)} each
                          </p>
                        )}
                      </div>
                      <div className="bill-card__footer">
                        <button
                          onClick={() => onToggleBillActive(bill.id)}
                          className="bill-card__toggle-btn"
                        >
                          {bill.isActive ? 'Pause Bill' : 'Resume Bill'}
                        </button>
                        <div className="bill-card__actions">
                          <button
                            onClick={() => onEditBill(bill)}
                            className="bill-card__icon-btn"
                            title="Edit bill details"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => onDeleteBill(bill.id)}
                            className="bill-card__icon-btn bill-card__icon-btn--delete"
                            title="Delete bill"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};