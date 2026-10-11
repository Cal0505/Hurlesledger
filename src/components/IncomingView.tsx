import React, { useState, useMemo } from 'react';
import { Upload, Plus, ChevronDown, ChevronUp, Trash2, Edit3 } from 'lucide-react';
import { HouseholdBill, Member, Transaction } from '../types/budget';
import { formatCurrency, formatDate } from '../utils/formatters';

interface IncomingViewProps {
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

export const IncomingView: React.FC<IncomingViewProps> = ({
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

  const incoming = useMemo(() =>
    transactions.filter(tx => tx.type === 'incoming'),
    [transactions]
  );

  const monthsWithTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    incoming.forEach(tx => {
      const key = tx.date.slice(0, 7);
      totals[key] = (totals[key] || 0) + tx.amount;
    });
    return Object.entries(totals)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, total]) => ({ key, total }));
  }, [incoming]);

  const getMonthDisplay = (key: string) => {
    if (key === 'all') return 'All Months';
    const [year, month] = key.split('-');
    const monthName = MONTH_NAMES[parseInt(month, 10) - 1];
    return `${monthName} ${year.slice(2)}`;
  };

  const filterOptions = [
    { id: 'all', label: 'All Categories' },
    { id: 'salary', label: 'Salary / Wage / Benefits' },
    { id: 'freelance', label: 'Freelance / Side Gig' },
    { id: 'transfer', label: 'Transfer / Refund' },
    { id: 'reimbursement', label: 'Household Reimbursement' },
  ];

  const filtered = useMemo(() => {
    let list = selectedMonth === 'all'
      ? incoming
      : incoming.filter(tx => tx.date.startsWith(selectedMonth));

    if (selectedFilter !== 'all') {
      const filterMap: Record<string, string> = {
        salary: 'Salary / Wage / Benefits',
        freelance: 'Freelance / Side Gig',
        transfer: 'Transfer / Refund',
        reimbursement: 'Household Reimbursement',
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
  }, [incoming, selectedMonth, selectedFilter, searchQuery]);

  const totalAll = filtered.reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalSalary = useMemo(() =>
    filtered
      .filter(tx => tx.category === 'Salary / Wage / Benefits')
      .reduce((sum, tx) => sum + tx.amount, 0),
    [filtered]
  );
  
  const totalTransferred = useMemo(() =>
    filtered
      .filter(tx => tx.category.toLowerCase().includes('transfer') || tx.category.toLowerCase().includes('refund'))
      .reduce((sum, tx) => sum + tx.amount, 0),
    [filtered]
  );
  
  const totalOther = useMemo(() =>
    totalAll - totalSalary - totalTransferred,
    [totalAll, totalSalary, totalTransferred]
  );

  const selectedMonthTotal = selectedMonth === 'all'
    ? totalAll
    : monthsWithTotals.find(m => m.key === selectedMonth)?.total || 0;

  return (
    <div className="incoming-page">
      <div className="incoming-top-bar">
        <div className="incoming-title-group">
          <h2 className="incoming-title">Incoming Money</h2>
          <p className="incoming-subtitle">Track all money received</p>
        </div>
        <div className="incoming-actions">
          <button
            onClick={onOpenImportCsv}
            className="incoming-btn incoming-btn--secondary"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            onClick={() => onOpenAddTransaction()}
            className="incoming-btn incoming-btn--accent"
          >
            <Plus size={14} /> Add Transaction
          </button>
        </div>
      </div>

      <div className="incoming-stats-grid">
        <div className="incoming-stat-card incoming-stat-card--primary">
          <p className="incoming-stat-label">Total Money In</p>
          <p className="incoming-stat-value">
            {currencySymbol}{totalAll.toFixed(2)}
          </p>
          <p className="incoming-stat-desc">This month</p>
        </div>
        <div className="incoming-stat-card">
          <p className="incoming-stat-label">Salary & Wages</p>
          <p className="incoming-stat-value">
            {currencySymbol}{totalSalary.toFixed(2)}
          </p>
          <p className="incoming-stat-desc">Earnings & benefits</p>
        </div>
        <div className="incoming-stat-card">
          <p className="incoming-stat-label">Transfers</p>
          <p className="incoming-stat-value">
            {currencySymbol}{totalTransferred.toFixed(2)}
          </p>
          <p className="incoming-stat-desc">Bank transfers & refunds</p>
        </div>
        <div className="incoming-stat-card">
          <p className="incoming-stat-label">Other Income</p>
          <p className="incoming-stat-value">
            {currencySymbol}{totalOther.toFixed(2)}
          </p>
          <p className="incoming-stat-desc">Cashback & miscellaneous</p>
        </div>
      </div>

      {/* ✅ FILTER SECTION — RESTORED EXACTLY AS ORIGINAL */}
      <div className="incoming-filters-section">
        <div className="filter-dropdown relative">
          <button
            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
            className="incoming-btn incoming-btn--secondary"
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
            className="incoming-search-bar"
          />
        </div>

        <div className="filter-dropdown relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="incoming-btn incoming-btn--secondary"
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

      <div className="incoming-table-container">
        <table className="incoming-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>From / Member</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="incoming-empty-state">
                  No incoming transactions found. Click "Add Transaction" to get started.
                </td>
              </tr>
            ) : (
              filtered.map(tx => {
                const fromMember = members.find(m => m.id === tx.fromMemberId || m.id === (tx as any).memberId);
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
                      {fromMember ? fromMember.name : '—'}
                    </td>
                    <td className="incoming-amount-cell">
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