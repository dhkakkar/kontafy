export interface Organization {
  id: string;
  name: string;
  legal_name: string | null;
  gstin: string | null;
  pan: string | null;
  cin: string | null;
  business_type: string | null;
  industry: string | null;
  address: OrgAddress;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  fiscal_year_start: number;
  currency: string;
  plan: OrgPlan;
  plan_expires_at: Date | null;
  settings: OrgSettings;
  created_at: Date;
  updated_at: Date;
}

export interface OrgAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  state_code?: string;
  pincode?: string;
  country?: string;
}

export type OrgPlan = 'starter' | 'silver' | 'gold' | 'platinum' | 'enterprise';

export interface OrgSettings {
  invoice_prefix?: string;
  decimal_places?: number;
  date_format?: string;
  tax_inclusive_pricing?: boolean;
  auto_number_invoices?: boolean;
  default_payment_terms?: number;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  permissions: OrgPermissions;
  invited_by: string | null;
  joined_at: Date;
}

export type OrgRole = 'owner' | 'admin' | 'accountant' | 'viewer' | 'ca';

export interface OrgPermissions {
  modules?: string[];
  actions?: ('read' | 'write' | 'delete' | 'export')[];
}

export type BusinessType = 'proprietorship' | 'partnership' | 'pvt_ltd' | 'llp' | 'public_ltd' | 'trust' | 'huf';

export type Industry =
  | 'retail'
  | 'manufacturing'
  | 'services'
  | 'trading'
  | 'construction'
  | 'agriculture'
  | 'healthcare'
  | 'education'
  | 'transport'
  | 'hospitality'
  | 'technology'
  | 'other';
