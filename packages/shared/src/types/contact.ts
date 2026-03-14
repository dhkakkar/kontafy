export interface Contact {
  id: string;
  org_id: string;
  type: ContactType;
  name: string;
  company_name: string | null;
  gstin: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  billing_address: ContactAddress;
  shipping_address: ContactAddress;
  payment_terms: number;
  credit_limit: number | null;
  opening_balance: number;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
}

export type ContactType = 'customer' | 'vendor' | 'both';

export interface ContactAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  state_code?: string;
  pincode?: string;
  country?: string;
}

export interface CreateContactInput {
  type: ContactType;
  name: string;
  company_name?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  billing_address?: ContactAddress;
  shipping_address?: ContactAddress;
  payment_terms?: number;
  credit_limit?: number;
  opening_balance?: number;
  notes?: string;
}

export interface ContactBalance {
  contact_id: string;
  contact_name: string;
  opening_balance: number;
  total_outstanding: number;
  receivable: number;
  payable: number;
}
