export type TransactionType = 'incoming' | 'outgoing';

export interface Transaction {
  id: string;
  createdAt: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  category: string;
  memberId?: string;
  fromMemberId?: string;
  billId?: string | null;
  linkedBillId?: string;
  source?: 'manual' | 'csv-import' | string;
  paymentMethod?: 'cash' | 'bank' | 'transfer';
  // ✅ Added — used in database.ts
  account?: string;
  notes?: string;
}

export interface Member {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  authUserId: string;
  avatarColor: string;
  isAccountHolder: boolean;
  notes?: string;
}

export type BillCategory =
  | 'Utilities'
  | 'Rent / Mortgage'
  | 'Food & Groceries'
  | 'Transport'
  | 'Entertainment'
  | 'Household'
  | 'Household Bills'
  | 'Other'
  | 'Other Expense';

export type BillFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually' | 'one-off';

export interface HouseholdBill {
  id: string;
  createdAt: string;
  name: string;
  category: BillCategory;
  amount: number;
  frequency: BillFrequency;
  dueDay: number;
  dueDate?: string | null;
  incurredDate?: string;
  isActive: boolean;
  participatingMemberIds: string[];
  linkedOutgoingId?: string;
  notes?: string;
  // ✅ Added — used in database.ts
  payerMemberId?: string;
  payerMemberIds: string[];
}

export type ActiveTab =
  | 'dashboard'
  | 'incoming'
  | 'outgoing'
  | 'household-bills'
  | 'members'
  | 'settlement';

export type AccessStatus = 'checking' | 'authorized' | 'profile' | 'pending' | 'denied' | 'none' | 'error';

export interface HouseholdAccessRequest {
  id: string;
  email: string;
  userId: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
  // ✅ Added — used in database.ts
  memberId: string | null;
  memberName: string;
  createdAt: string;
}

export interface AppState {
  members: Member[];
  bills: HouseholdBill[];
  transactions: Transaction[];
  accessRequests: HouseholdAccessRequest[];
  currencySymbol: string;
  primaryUserId: string;
}