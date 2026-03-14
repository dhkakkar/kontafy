export interface Invoice {
  id: string;
  org_id: string;
  invoice_number: string;
  type: InvoiceType;
  status: InvoiceStatus;
  contact_id: string;
  date: Date;
  due_date: Date | null;
  place_of_supply: string | null;
  is_igst: boolean;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  terms: string | null;
  pdf_url: string | null;
  e_invoice_irn: string | null;
  e_invoice_ack: string | null;
  eway_bill_no: string | null;
  whatsapp_sent: boolean;
  email_sent: boolean;
  journal_id: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  items?: InvoiceItem[];
}

export type InvoiceType = 'sale' | 'purchase' | 'credit_note' | 'debit_note';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  hsn_code: string | null;
  quantity: number;
  unit: string;
  rate: number;
  discount_pct: number;
  taxable_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  cess_rate: number;
  cess_amount: number;
  total: number;
}

export interface CreateInvoiceInput {
  type: InvoiceType;
  contact_id: string;
  date: string;
  due_date?: string;
  place_of_supply?: string;
  is_igst?: boolean;
  notes?: string;
  terms?: string;
  items: CreateInvoiceItemInput[];
}

export interface CreateInvoiceItemInput {
  product_id?: string;
  description: string;
  hsn_code?: string;
  quantity: number;
  unit?: string;
  rate: number;
  discount_pct?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cess_rate?: number;
}
