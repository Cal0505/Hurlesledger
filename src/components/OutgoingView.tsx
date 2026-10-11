import React, { useState, useMemo } from 'react';
import { Upload, Plus, ChevronDown, ChevronUp, Trash2, Edit3 } from 'lucide-react';
import { HouseholdBill, Member, Transaction } from '../types/budget';
import { formatCurrency, formatDate } from '../utils/formatters';

interface OutgoingViewProps {
  transactions: Transaction[];
  members: Member[];
  bills: HouseholdBill[];
  currencySymbol: string;
  onOpenImportCsv: () => void;
  onDeleteTransaction: (id: string) => void;
  onOpenAddTransaction: (prefill?: Partial<Transaction> | null, editId?: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const OutgoingView: React.FC<OutgoingViewProps> = ({
  transactions,
  members,
  bills,
  currencySymbol,
  onOpenImportCsv,
  onDeleteTransaction,
  onOpenAddTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const outgoing = useMemo(() =>
    transactions.filter(tx => tx.type === 'outgoing'),
    [transactions]
  );

  const monthsWithTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    outgoing.forEach(tx => {
      const key = tx.date.slice(0, 7);
      totals[key] = (totals[key] || 0) + tx.amount;
    });
    return Object.entries(totals)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, total]) => ({ key, total }));
  }, [outgoing]);

  const getMonthDisplay = (key: string) => {
    if (key === 'all') return 'All Months';
    const [year, month] = key.split('-');
    const monthName = MONTH_NAMES[parseInt(month, 10) - 1];
    return `${monthName} ${year.slice(2)}`;
  };

  const filterOptions = [
    { id: 'all', label: 'All Categories' },
    { id: 'bills', label: 'Bills & Payments' },
    { id: 'groceries', label: 'Groceries' },
    { id: 'household', label: 'Household Items' },
    { id: 'personal', label: 'Personal / Living' },
    { id: 'other', label: 'Other Expense' },
  ];

  const filtered = useMemo(() => {
    let list = selectedMonth === 'all'
      ? outgoing
      : outgoing.filter(tx => tx.date.startsWith(selectedMonth));

    if (selectedFilter !== 'all') {
      const filterMap: Record<string, string> = {
        bills: 'Bills & Payments',
        groceries: 'Groceries',
        household: 'Household Items',
        personal: 'Personal / Living',
        other: 'Other Expense',
      };
      const category = filterMap[selectedFilter];
      list = list.filter(tx => tx.category === category);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(tx =>
        tx.description.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [outgoing, selectedMonth, selectedFilter, searchQuery]);

  const totalAll = filtered.reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalBills = useMemo(() =>
    filtered
      .filter(tx => tx.category === 'Bills & Payments')
      .reduce((sum, tx) => sum + tx.amount, 0),
    [filtered]
  );
  
  const totalGroceries = useMemo(() =>
    filtered
      .filter(tx => tx.category === 'Groceries')
      .reduce((sum, tx) => sum + tx.amount, 0),
    [filtered]
  );
  
  const totalOther = useMemo(() =>
    totalAll - totalBills - totalGroceries,
    [totalAll, totalBills, totalGroceries]
  );

  const selectedMonthTotal = selectedMonth === 'all'
    ? totalAll
    : monthsWithTotals.find(m => m.key === selectedMonth)?.total || 0;

  return (
    <div className="outgoing-page">
      <div className="outgoing-top-bar">
        <div className="outgoing-title-group">
          <h2 className="outgoing-title">Outgoing Money</h2>
          <p className="outgoing-subtitle">Track all money spent</p>
        </div>
        <div className="outgoing-actions">
          <button
            onClick={onOpenImportCsv}
            className="outgoing-btn outgoing-btn--secondary"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            onClick={() => onOpenAddTransaction()}
            className="outgoing-btn outgoing-btn--accent"
          >
            <Plus size={14} /> Add Transaction
          </button>
        </div>
      </div>

      <div className="outgoing-stats-grid">
        <div className="outgoing-stat-card outgoing-stat-card--primary">
          <p className="outgoing-stat-label">Total Spent</p>
          <p className="outgoing-stat-value">
            {currencySymbol}{totalAll.toFixed(2)}
          </p>
          <p className="outgoing-stat-desc">This month</p>
        </div>
        <div className="outgoing-stat-card">
          <p className="outgoing-stat-label">Bills & Payments</p>
          <p className="outgoing-stat-value">
            {currencySymbol}{totalBills.toFixed(2)}
          </p>
          <p className="outgoing-stat-desc">Fixed costs</p>
        </div>
        <div className="outgoing-stat-card">
          <p className="outgoing-stat-label">Groceries</p>
          <p className="outgoing-stat-value">
            {currencySymbol}{totalGroceries.toFixed(2)}
          </p>
          <p className="outgoing-stat-desc">Food & essentials</p>
        </div>
        <div className="outgoing-stat-card">
          <p className="outgoing-stat-label">Other Spending</p>
          <p className="outgoing-stat-value">
            {currencySymbol}{totalOther.toFixed(2)}
          </p>
          <p className="outgoing-stat-desc">Everything else</p>
        </div>
      </div>

      <div className="outgoing-filters-section">
        <div className="filter-dropdown relative">
          <button
            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
            className="outgoing-btn outgoing-btn--secondary"
          >
            {selectedMonth === 'all'
              ? 'All Months'
              : `${getMonthDisplay(selectedMonth)} — ${currencySymbol}${selectedMonthTotal.toFixed(2)}`
            }
            {showMonthDropdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showMonthDropdown && (
            <div className="absolute">
              <button
                onClick={() => { setSelectedMonth('all'); setShowMonthDropdown(false); }}
              >
                <span>All Months</span>
                <span className="month-amount">{currencySymbol}{totalAll.toFixed(2)}</span>
              </button>
              {monthsWithTotals.map(({ key, total }) => (
                <button
                  key={key}
                  onClick={() => { setSelectedMonth(key); setShowMonthDropdown(false); }}
                >
                  <span>{getMonthDisplay(key)}</span>
                  <span className="month-amount">{currencySymbol}{total.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Search transactions…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="outgoing-search-bar"
          />
        </div>

        <div className="filter-dropdown relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="outgoing-btn outgoing-btn--secondary"
          >
            {filterOptions.find(f => f.id === selectedFilter)?.label}
            {showFilterDropdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showFilterDropdown && (
            <div className="absolute">
              {filterOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => { setSelectedFilter(option.id); setShowFilterDropdown(false); }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="outgoing-table-container">
        <table className="outgoing-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Paid By</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="outgoing-empty-state">
                  No outgoing transactions found. Click "Add Transaction" to get started.
                </td>
              </tr>
            ) : (
              filtered.map(tx => {
                const paidByMember = members.find(m => m.id === tx.fromMemberId || m.id === (tx as any).memberId);
                return (
                  <tr key={tx.id}>
                    <td>{formatDate(tx.date)}</td>
                    <td className="font-medium">{tx.description}</td>
                    <td>
                      <span className="category-badge">
                        {tx.category}
                      </span>
                    </td>
                    <td className="member-name">
                      {paidByMember ? paidByMember.name : '—'}
                    </td>
                    <td className="outgoing-amount-cell">
                      {currencySymbol}{tx.amount.toFixed(2)}
                    </td>
                    <td>
                      <div className="hl-action-buttons">
                        <button
                          onClick={() => onOpenAddTransaction(tx, tx.id)}
                          className="hl-btn-icon"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(tx.id)}
                          className="hl-btn-icon hl-btn-icon--delete"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {deleteTargetId && (
        <div className="delete-confirm-modal">
          <div>
            <h4>Delete Transaction?</h4>
            <p>This action cannot be undone.</p>
            <div className="delete-confirm-buttons">
              <button onClick={() => setDeleteTargetId(null)}>Cancel</button>
              <button
                onClick={() => {
                  onDeleteTransaction(deleteTargetId);
                  setDeleteTargetId(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};