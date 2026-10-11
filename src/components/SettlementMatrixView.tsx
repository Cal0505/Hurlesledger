import React from 'react';
import { 
  Copy, 
  Check, 
  Download, 
  Sparkles
} from 'lucide-react';
import { HouseholdBill, Member, Transaction } from '../types/budget';
import { formatCurrency } from '../utils/formatters';
import { getBillPerPersonShare, getMemberBalanceStatus } from '../utils/storage';

interface SettlementMatrixViewProps {
  members: Member[];
  bills: HouseholdBill[];
  transactions: Transaction[];
  primaryUserId: string;
  currencySymbol: string;
}

const getInitial = (name: string) => name.charAt(0).toUpperCase();

export const SettlementMatrixView: React.FC<SettlementMatrixViewProps> = ({
  members,
  bills,
  transactions,
  currencySymbol,
}) => {
  const memberBalances = members.map((member) => {
    const result = getMemberBalanceStatus(member, bills, transactions);
    return {
      member,
      balance: typeof result === 'object' && result !== null && 'balance' in result
        ? Number(result.balance) || 0
        : 0,
      status: typeof result === 'object' && result !== null && 'status' in result
        ? String(result.status)
        : 'pending'
    };
  });

  return (
    <div className="settlement-view">
      {/* HEADER */}
      <div className="settlement-header">
        <div>
          <h1 className="settlement-title">Settlement Matrix & Balances</h1>
          <p className="settlement-subtitle">See who owes what — and who's fully settled</p>
        </div>
        <div className="settlement-header-actions">
          <button className="settlement-btn settlement-btn--copy">
            <Copy size={14} className="settlement-icon-sm" />
            Copy Group Chat Summary
          </button>
          <button className="settlement-btn settlement-btn--export">
            <Download size={14} className="settlement-icon-sm" />
            Export CSV
          </button>
        </div>
      </div>

      {/* BILLS TABLE */}
      <div className="settlement-table-container">
        <div className="settlement-table-scroll">
          <table className="settlement-table">
            <thead>
              <tr className="settlement-table-head">
                <th className="settlement-table-th settlement-table-th--bill">Household Bill</th>
                <th className="settlement-table-th settlement-table-th--num">Bill Total</th>
                {members.map((m) => (
                  <th key={m.id} className="settlement-table-th settlement-table-th--member">
                    <div className="settlement-member-header">
                      <span className="settlement-avatar-sm">
                        {getInitial(m.name)}
                      </span>
                      <span className="settlement-name-truncate">{m.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => {
                // ✅ Returns a single number — equal share per person
                const sharePerPerson = getBillPerPersonShare(bill);
                return (
                  <tr key={bill.id} className="settlement-table-row">
                    <td className="settlement-table-td settlement-table-td--bill">
                      <div className="settlement-bill-name">{bill.name}</div>
                      <div className="settlement-bill-meta">{bill.frequency} • {bill.dueDay}</div>
                    </td>
                    <td className="settlement-table-td settlement-table-td--num">
                      {formatCurrency(bill.amount, currencySymbol)}
                    </td>
                    {members.map((m) => (
                      <td key={m.id} className="settlement-table-td settlement-table-td--num">
                        <span className="settlement-amount--active">
                          {formatCurrency(sharePerPerson, currencySymbol)}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* Monthly Share Total */}
              <tr className="settlement-table-row settlement-table-footer">
                <td className="settlement-table-td"><strong>Monthly Share Total</strong></td>
                <td className="settlement-table-td settlement-table-td--num">
                  <strong>{formatCurrency(bills.reduce((s, b) => s + b.amount, 0), currencySymbol)}</strong>
                </td>
                {members.map((m) => {
                  const totalShare = bills.reduce((sum, bill) => {
                    const share = getBillPerPersonShare(bill);
                    return sum + share;
                  }, 0);
                  return (
                    <td key={m.id} className="settlement-table-td settlement-table-td--num">
                      <strong className="settlement-footer-row--total">
                        {formatCurrency(totalShare, currencySymbol)}
                      </strong>
                    </td>
                  );
                })}
              </tr>

              {/* Paid / Transferred */}
              <tr className="settlement-table-row settlement-table-footer">
                <td className="settlement-table-td">Paid / Transferred</td>
                <td className="settlement-table-td settlement-table-td--num">—</td>
                {members.map((m) => {
                  const paid = transactions
                    .filter((t) => t.type === 'outgoing' && t.memberId === m.id)
                    .reduce((s, t) => s + t.amount, 0);
                  return (
                    <td key={m.id} className="settlement-table-td settlement-table-td--num">
                      {paid > 0 ? (
                        <span className="settlement-amount--paid">
                          {formatCurrency(paid, currencySymbol)}
                        </span>
                      ) : <span>—</span>}
                    </td>
                  );
                })}
              </tr>

              {/* Remaining Balance Due */}
              <tr className="settlement-table-row settlement-table-footer">
                <td className="settlement-table-td"><strong>Remaining Balance Due</strong></td>
                <td className="settlement-table-td settlement-table-td--num">—</td>
                {members.map((m) => {
                  const result = getMemberBalanceStatus(m, bills, transactions);
                  const balance = typeof result === 'object' && result !== null && 'balance' in result
                    ? Number(result.balance) || 0
                    : 0;
                  const isSettled = typeof result === 'object' && result !== null && 'status' in result
                    ? result.status === 'settled'
                    : false;
                  return (
                    <td key={m.id} className="settlement-table-td settlement-table-td--num">
                      {isSettled ? (
                        <span className="settlement-settled-label">
                          <Check size={14} className="settlement-icon-xs" /> Settled
                        </span>
                      ) : balance > 0 ? (
                        <span className="settlement-due-amount">
                          {formatCurrency(balance, currencySymbol)}
                        </span>
                      ) : (
                        <span className="settlement-amount--paid">
                          {formatCurrency(Math.abs(balance), currencySymbol)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SETTLEMENT PLAN CARDS */}
      <div className="settlement-plan-card">
        <h3 className="settlement-plan-heading">
          <Sparkles size={18} className="settlement-icon-md" />
          Settlement Action Plan
        </h3>
        <div className="settlement-plan-grid">
          {memberBalances.map(({ member, balance, status }) => (
            <div key={member.id} className="settlement-plan-member-card">
              <div className="settlement-plan-member-header">
                <span className="settlement-avatar-tiny">
                  {getInitial(member.name)}
                </span>
                <span className="settlement-plan-member-name">{member.name}</span>
              </div>
              {status === 'settled' ? (
                <p className="settlement-plan-member-text settlement-plan-settled">
                  ✅ Fully settled for this cycle.
                </p>
              ) : balance > 0 ? (
                <p className="settlement-plan-member-text settlement-due-text">
                  Owes <strong className="settlement-due-amount">{formatCurrency(balance, currencySymbol)}</strong>
                </p>
              ) : (
                <p className="settlement-plan-member-text">
                  Is owed <strong className="settlement-amount--paid">{formatCurrency(Math.abs(balance), currencySymbol)}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};