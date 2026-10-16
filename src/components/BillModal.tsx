import React, { useState, useEffect, useMemo } from 'react';
import { X, ReceiptText, Users, AlertCircle, Info } from 'lucide-react';
import { BillCategory, BillFrequency, HouseholdBill, Member, Transaction } from '../types/budget';
import { formatCurrency } from '../utils/formatters';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBill: (
    billData: Omit<HouseholdBill, 'id' | 'createdAt'>,
    billId?: string,
    outgoingTransactionIds?: string[]
  ) => void;
  members: Member[];
  importedTransactions: Transaction[];
  billToEdit?: HouseholdBill | null;
  currencySymbol: string;
}

const CATEGORIES: BillCategory[] = [
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

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  onSaveBill,
  members,
  importedTransactions,
  billToEdit,
  currencySymbol,
}) => {
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [manualBillingMonth, setManualBillingMonth] = useState(currentMonthKey);
  const [selectedDebitGroupKey, setSelectedDebitGroupKey] = useState('');
  const [filterByMonth, setFilterByMonth] = useState<string>('all');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<BillCategory>('Utilities');
  const [amount, setAmount] = useState<string>('');
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [dueDay, setDueDay] = useState<number>(1);
  const [participatingMemberIds, setParticipatingMemberIds] = useState<string[]>([]);
  const [payerMemberIds, setPayerMemberIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const selectableMonths = React.useMemo(() => {
    const list = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      list.push({ key, label });
    }
    return list;
  }, []);

  const allImportedDebitGroups = React.useMemo(() => {
    const groups = new Map<string, {
      key: string;
      description: string;
      monthKey: string;
      incurredDate: string;
      amount: number;
      transactionIds: string[];
    }>();
    importedTransactions
      .filter((transaction) =>
        transaction.type === 'outgoing'
        && transaction.source === 'csv-import'
        && !transaction.linkedBillId
      )
      .forEach((transaction) => {
        const description = transaction.description.trim() || 'Bank debit';
        const monthKey = transaction.date.slice(0, 7);
        const key = `${monthKey}:${description.toLocaleLowerCase()}`;
        const group = groups.get(key);
        if (group) {
          group.amount = Math.round((group.amount + transaction.amount) * 100) / 100;
          group.incurredDate = transaction.date < group.incurredDate ? transaction.date : group.incurredDate;
          group.transactionIds.push(transaction.id);
        } else {
          groups.set(key, {
            key,
            description,
            monthKey,
            incurredDate: transaction.date,
            amount: transaction.amount,
            transactionIds: [transaction.id],
          });
        }
      });
    return Array.from(groups.values()).sort((a, b) =>
      b.monthKey.localeCompare(a.monthKey) || a.description.localeCompare(b.description)
    );
  }, [importedTransactions]);

  const importedDebitGroups = React.useMemo(() => {
    if (filterByMonth === 'all') return allImportedDebitGroups;
    return allImportedDebitGroups.filter(g => g.monthKey === filterByMonth);
  }, [allImportedDebitGroups, filterByMonth]);

  useEffect(() => {
    setFilterByMonth('all');
  }, [isOpen]);

  useEffect(() => {
    if (billToEdit) {
      setSelectedDebitGroupKey('');
      setName(billToEdit.name);
      setCategory(billToEdit.category);
      setAmount(billToEdit.amount.toString());
      setFrequency(billToEdit.frequency);
      setDueDay(billToEdit.dueDay);
      setParticipatingMemberIds(billToEdit.participatingMemberIds);
      setPayerMemberIds(billToEdit.payerMemberIds || []);
      setNotes(billToEdit.notes || '');
      if (billToEdit.incurredDate) {
        setManualBillingMonth(billToEdit.incurredDate.slice(0, 7));
      } else {
        setManualBillingMonth(currentMonthKey);
      }
    } else {
      setSelectedDebitGroupKey('');
      setName('');
      setCategory('Utilities');
      setAmount('');
      setFrequency('monthly');
      setDueDay(1);
      setParticipatingMemberIds(members.map((m) => m.id));
      setPayerMemberIds([]);
      setNotes('');
      setManualBillingMonth(currentMonthKey);
    }
    setErrorMsg('');
  }, [billToEdit, isOpen, members, currentMonthKey]);

  if (!isOpen) return null;

  const toggleMember = (memberId: string) => {
    if (participatingMemberIds.includes(memberId)) {
      setParticipatingMemberIds(participatingMemberIds.filter((id) => id !== memberId));
    } else {
      setParticipatingMemberIds([...participatingMemberIds, memberId]);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const participantCount = participatingMemberIds.length;
  const perPersonShare = participantCount > 0 ? Math.round((parsedAmount / participantCount) * 100) / 100 : 0;
  const excludedMembers = members.filter((m) => !participatingMemberIds.includes(m.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDebitGroup = importedDebitGroups.find((group) => group.key === selectedDebitGroupKey);
    
    if (!name.trim()) {
      setErrorMsg('Please enter a bill name.');
      return;
    }
    if (parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }
    if (participatingMemberIds.length === 0) {
      setErrorMsg('At least one member must participate in this bill.');
      return;
    }

    const finalIncurredDate = frequency === 'one-off'
      ? selectedDebitGroup?.incurredDate ||
        billToEdit?.incurredDate ||
        `${manualBillingMonth}-${String(dueDay).padStart(2, '0')}`
      : undefined;
    
    onSaveBill(
      {
        name: name.trim(),
        category,
        amount: parsedAmount,
        frequency,
        dueDay,
        incurredDate: finalIncurredDate,
        participatingMemberIds,
        payerMemberIds: payerMemberIds || [], // ✅ Always an array
        payerMemberId: payerMemberIds?.[0] ?? null, // ✅ Explicit null when empty
        notes: notes.trim() || undefined,
        isActive: billToEdit ? billToEdit.isActive : true,
      },
      billToEdit?.id,
      selectedDebitGroup?.transactionIds
    );
    onClose();
  };

  return (
    <div className="bill-modal-overlay">
      <div className="bill-modal-container">
        <div className="bill-modal-header">
          <div className="bill-modal-title-row">
            <ReceiptText className="w-5 h-5" />
            <h3 className="bill-modal-title">
              {billToEdit ? 'Edit Household Bill' : 'Add New Household Bill'}
            </h3>
          </div>
          <button onClick={onClose} className="bill-modal-close-btn" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="bill-modal-form">
          {errorMsg && (
            <div role="alert" className="bill-modal-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          
          {!billToEdit && allImportedDebitGroups.length > 0 && (
            <div>
              <label className="bill-modal-label">Filter by Month</label>
              <select
                value={filterByMonth}
                onChange={(e) => {
                  setFilterByMonth(e.target.value);
                  setSelectedDebitGroupKey('');
                }}
                className="bill-modal-select"
              >
                <option value="all">All Months ({allImportedDebitGroups.length} items)</option>
                {selectableMonths.map((m) => {
                  const count = allImportedDebitGroups.filter(g => g.monthKey === m.key).length;
                  return (
                    <option key={m.key} value={m.key}>
                      {m.label} ({count} item{count !== 1 ? 's' : ''})
                    </option>
                  );
                })}
              </select>
              
              <label className="bill-modal-label mt-3">
                Select an imported host-account debit (optional)
              </label>
              <select
                value={selectedDebitGroupKey}
                onChange={(event) => {
                  const group = importedDebitGroups.find((item) => item.key === event.target.value);
                  setSelectedDebitGroupKey(group?.key || '');
                  if (group) {
                    const transactionDate = new Date(`${group.incurredDate}T00:00:00`);
                    setName(group.description);
                    setAmount(group.amount.toFixed(2));
                    setCategory('Other');
                    setFrequency('one-off');
                    setDueDay(Number.isNaN(transactionDate.getTime()) ? 1 : transactionDate.getDate());
                    setNotes(`Imported from bank statement for ${group.monthKey}`);
                  } else {
                    setName('');
                    setAmount('');
                    setCategory('Utilities');
                    setFrequency('monthly');
                    setDueDay(1);
                    setNotes('');
                  }
                }}
                className="bill-modal-select"
              >
                <option value="">Create a bill manually</option>
                {importedDebitGroups.map((group) => (
                  <option key={group.key} value={group.key}>
                    {group.description} · {new Date(`${group.monthKey}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} · {formatCurrency(group.amount, currencySymbol)}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="mt-4">
            <label className="bill-modal-label">Bill Name *</label>
            <input
              type="text"
              placeholder="e.g. Deezer Family, Virgin Media, British Gas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bill-modal-input"
              required
            />
          </div>
          
          <div className="bill-modal-grid-2">
            <div>
              <label className="bill-modal-label">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BillCategory)}
                className="bill-modal-select"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="bill-modal-label">Total Amount ({currencySymbol}) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bill-modal-input bill-modal-input-monospace"
                required
              />
            </div>
          </div>
          
          <div className="bill-modal-grid-2">
            <div>
              <label className="bill-modal-label">Billing Cycle</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                disabled={!!selectedDebitGroupKey}
                className="bill-modal-select"
              >
                <option value="monthly">Monthly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="weekly">Weekly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
                <option value="one-off">One-Off</option>
              </select>
            </div>
            <div>
              <label className="bill-modal-label">Due Day of Month (1–31)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value) || 1)}
                className="bill-modal-input bill-modal-input-monospace"
              />
            </div>
          </div>
          
          {frequency === 'one-off' && !selectedDebitGroupKey && (
            <div className="bill-modal-month-panel">
              <label className="bill-modal-subheading">Target Billing Month *</label>
              <select
                value={manualBillingMonth}
                onChange={(e) => setManualBillingMonth(e.target.value)}
                className="bill-modal-select"
              >
                {selectableMonths.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
              <p className="bill-modal-note">
                Choose the specific statement month block this variable manual bill will be cataloged inside.
              </p>
            </div>
          )}
          
          <div className="bill-modal-split-section">
            <div className="bill-modal-split-header">
              <label className="bill-modal-subheading">Split Participants</label>
              <span className="bill-modal-per-person">
                {participantCount > 0
                  ? `${formatCurrency(perPersonShare, currencySymbol)} / person`
                  : 'Select participants'}
              </span>
            </div>
            
            <div className="bill-modal-member-list">
              {members.map((member) => {
                const isChecked = participatingMemberIds.includes(member.id);
                return (
                  <div
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className={`bill-modal-member-row ${isChecked ? 'selected' : 'deselected'}`}
                  >
                    <div className="bill-modal-member-left">
                      <input type="checkbox" checked={isChecked} onChange={() => {}} />
                      <div className="bill-modal-avatar" data-color-id={member.id}>
                        {member.name.charAt(0)}
                      </div>
                      <span className="bill-modal-member-name">{member.name}</span>
                    </div>
                    <span className="bill-modal-share">
                      {isChecked ? formatCurrency(perPersonShare, currencySymbol) : `${currencySymbol}0.00`}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {excludedMembers.length > 0 && (
              <div className="bill-modal-excluded-note">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>{excludedMembers.map((m) => m.name).join(', ')}</strong> excluded from this split.
                </span>
              </div>
            )}
          </div>
          
          <div>
            <label className="bill-modal-label">Notes & Reference (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Statement tracking references or notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bill-modal-textarea"
            />
          </div>
          
          <div className="bill-modal-footer">
            <button type="button" onClick={onClose} className="bill-modal-cancel-btn">
              Cancel
            </button>
            <button type="submit" className="bill-modal-save-btn">
              {billToEdit ? 'Save Changes' : 'Create Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};