import { AppState, HouseholdBill, Member, Transaction } from '../types/budget';

export function getAccountHolderNames(members: Member[]): string[] {
  return members.filter((member) => member.isAccountHolder).map((member) => member.name);
}

export function getPrimaryAccountLabel(members: Member[]): string {
  const holders = getAccountHolderNames(members);
  if (holders.length === 0) return 'primary account';
  if (holders.length === 1) return `${holders[0]}'s account`;
  if (holders.length === 2) return `${holders[0]} & ${holders[1]}'s shared account`;
  return `${holders.slice(0, -1).join(', ')} & ${holders[holders.length - 1]}'s shared account`;
}

export function getEmptyState(): AppState {
  return {
    members: [],
    bills: [],
    transactions: [],
    accessRequests: [],
    primaryUserId: '',
    currencySymbol: '£',
  };
}

export function getBillPerPersonShare(bill: HouseholdBill): number {
  if (!bill.participatingMemberIds || bill.participatingMemberIds.length === 0) {
    return 0;
  }
  return Math.round((bill.amount / bill.participatingMemberIds.length) * 100) / 100;
}

function cleanMonthKey(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  return dateStr.trim().slice(0, 7);
}

export function getMemberShareForBill(
  memberId: string,
  bill: HouseholdBill,
  monthFilter = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
): number {
  if (!bill.isActive) return 0;
  if (!bill.participatingMemberIds || !bill.participatingMemberIds.includes(memberId)) return 0;

  const targetMonth = cleanMonthKey(monthFilter);

  if (bill.frequency === 'one-off') {
    if (cleanMonthKey(bill.incurredDate) !== targetMonth) return 0;
  } else {
    if (bill.incurredDate && cleanMonthKey(bill.incurredDate) > targetMonth) return 0;
  }

  const totalParticipants = bill.participatingMemberIds.length;
  if (totalParticipants === 0) return 0;

  const baseShare = Math.floor((bill.amount / totalParticipants) * 100) / 100;
  const totalAllocated = baseShare * totalParticipants;
  const totalPenniesOwed = Math.round((bill.amount - totalAllocated) * 100);

  const sortedParticipants = [...bill.participatingMemberIds].sort();
  const participantIndex = sortedParticipants.indexOf(memberId);

  if (participantIndex >= 0 && participantIndex < totalPenniesOwed) {
    return Math.round((baseShare + 0.01) * 100) / 100;
  }
  return baseShare;
}

export function getMemberTotalMonthlyBills(
  memberId: string,
  bills: HouseholdBill[],
  monthFilter?: string
): number {
  const currentMonth = monthFilter || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const targetMonth = cleanMonthKey(currentMonth);
  return bills
    .filter((bill) => bill.isActive)
    .reduce((sum, bill) => sum + getMemberShareForBill(memberId, bill, targetMonth), 0);
}

export function getMemberTotalReimbursements(
  memberId: string,
  transactions: Transaction[],
  monthFilter?: string
): number {
  const currentMonth = monthFilter || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const targetMonth = cleanMonthKey(currentMonth);
  return transactions
    .filter((tx) => {
      if (tx.type !== 'incoming') return false;
      const isFromMember = tx.fromMemberId === memberId || (tx as any).memberId === memberId;
      if (!isFromMember) return false;
      return cleanMonthKey(tx.date) === targetMonth;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function getMemberBalanceStatus(
  member: Member,
  bills: HouseholdBill[],
  transactions: Transaction[],
  monthFilter?: string
) {
  const totalMonthlyShare = getMemberTotalMonthlyBills(member.id, bills, monthFilter);
  const totalPaid = getMemberTotalReimbursements(member.id, transactions, monthFilter);

  if (member.isAccountHolder) {
    return {
      totalMonthlyShare,
      totalPaid,
      remainingDue: 0,
      isSettled: true,
      surplus: Math.max(0, Math.round((totalPaid - totalMonthlyShare) * 100) / 100),
    };
  }

  const remainingDue = Math.max(0, Math.round((totalMonthlyShare - totalPaid) * 100) / 100);
  const isSettled = totalPaid >= totalMonthlyShare;
  const surplus = Math.max(0, Math.round((totalPaid - totalMonthlyShare) * 100) / 100);

  return {
    totalMonthlyShare,
    totalPaid,
    remainingDue,
    isSettled,
    surplus,
  };
}