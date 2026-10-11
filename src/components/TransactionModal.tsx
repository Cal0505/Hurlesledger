import React, { useState, useEffect } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, AlertCircle } from 'lucide-react';
import { HouseholdBill, Member, Transaction, TransactionType } from '../types/budget';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>, existingId?: string) => void;
  members: Member[];
  bills: HouseholdBill[];
  currencySymbol: string;
  prefill?: Partial<Transaction> | null;
  editId?: string;
}

const INCOMING_CATEGORIES = [
  'Household Reimbursement',
  'Salary / Wage / Benefits',
  'Freelance / Side Gig',
  'Transfer / Refund',
];

const OUTGOING_CATEGORIES = [
  'Groceries',
  'Utilities',
  'Rent / Housing',
  'Transport',
  'Entertainment',
  'Bills',
  'Other',
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSaveTransaction,
  members,
  bills,
  currencySymbol,
  prefill = null,
  editId,
}) => {
  const [type, setType] = useState<TransactionType>('incoming');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [memberId, setMemberId] = useState<string | undefined>(undefined);
  const [fromMemberId, setFromMemberId] = useState<string | undefined>(undefined);
  const [linkedBillId, setLinkedBillId] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (prefill) {
        setType(prefill.type || 'incoming');
        setDate(prefill.date || new Date().toISOString().slice(0, 10));
        setAmount(prefill.amount ? String(prefill.amount) : '');
        setDescription(prefill.description || '');
        setCategory(prefill.category || '');
        setMemberId(prefill.memberId ?? undefined);
        setFromMemberId(prefill.fromMemberId ?? undefined);
        setLinkedBillId(prefill.linkedBillId ?? undefined);
      } else {
        setType('incoming');
        setDate(new Date().toISOString().slice(0, 10));
        setAmount('');
        setDescription('');
        setCategory('');
        setMemberId(undefined);
        setFromMemberId(undefined);
        setLinkedBillId(undefined);
      }
    }
  }, [isOpen, prefill]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (!date || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid date and amount.');
      return;
    }
    if (!category) {
      setError('Please select or enter a category.');
      return;
    }

    onSaveTransaction(
      {
        type,
        date,
        amount: numAmount,
        description: description.trim() || `${type === 'incoming' ? 'Received' : 'Payment'} - ${category}`,
        category,
        memberId,
        fromMemberId,
        linkedBillId,
      },
      editId
    );
    onClose();
  };

  const categories = type === 'incoming' ? INCOMING_CATEGORIES : OUTGOING_CATEGORIES;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editId ? 'Edit Transaction' : 'Add Transaction'}</h3>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="form-error-banner">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="type-toggle-group">
            <button
              type="button"
              className={`type-toggle-btn ${type === 'incoming' ? 'active' : ''}`}
              onClick={() => setType('incoming')}
            >
              <ArrowDownLeft size={14} /> Incoming
            </button>
            <button
              type="button"
              className={`type-toggle-btn ${type === 'outgoing' ? 'active' : ''}`}
              onClick={() => setType('outgoing')}
            >
              <ArrowUpRight size={14} /> Outgoing
            </button>
          </div>

          <div className="form-row">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <label>Amount ({currencySymbol})</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="form-input"
            />
          </div>

          <div className="form-row">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-select"
            >
              <option value="">Select category…</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>From / Payer</label>
            <select
              value={fromMemberId ?? ''}
              onChange={(e) => setFromMemberId(e.target.value || undefined)}
              className="form-select"
            >
              <option value="">— Unassigned —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>For / Member</label>
            <select
              value={memberId ?? ''}
              onChange={(e) => setMemberId(e.target.value || undefined)}
              className="form-select"
            >
              <option value="">— All / Household —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Link to Bill (optional)</label>
            <select
              value={linkedBillId ?? ''}
              onChange={(e) => setLinkedBillId(e.target.value || undefined)}
              className="form-select"
            >
              <option value="">— None —</option>
              {bills.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {currencySymbol}{b.amount.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="modal-btn modal-btn--secondary">
              Cancel
            </button>
            <button type="submit" className="modal-btn modal-btn--primary">
              {editId ? 'Update Transaction' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};