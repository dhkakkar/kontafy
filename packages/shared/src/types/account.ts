export interface Account {
  id: string;
  org_id: string;
  code: string;
  name: string;
  type: AccountType;
  sub_type: string | null;
  parent_id: string | null;
  is_system: boolean;
  opening_balance: number;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  children?: Account[];
}

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export interface JournalEntry {
  id: string;
  org_id: string;
  entry_number: number;
  date: Date;
  narration: string | null;
  reference: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_posted: boolean;
  created_by: string;
  created_at: Date;
  lines?: JournalLine[];
}

export interface JournalLine {
  id: string;
  entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  account?: Pick<Account, 'id' | 'code' | 'name' | 'type'>;
}

export interface CreateJournalEntryInput {
  date: string;
  narration?: string;
  reference?: string;
  reference_type?: string;
  reference_id?: string;
  is_posted?: boolean;
  lines: CreateJournalLineInput[];
}

export interface CreateJournalLineInput {
  account_id: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface TrialBalanceEntry {
  account_id: string;
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
}

export interface TrialBalance {
  as_of: string;
  entries: TrialBalanceEntry[];
  totals: {
    debit: number;
    credit: number;
    balanced: boolean;
  };
}

export interface LedgerEntry {
  date: Date;
  entry_number: number;
  narration: string | null;
  reference: string | null;
  debit: number;
  credit: number;
  running_balance: number;
}
