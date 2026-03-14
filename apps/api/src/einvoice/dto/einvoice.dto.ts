import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// E-Invoice DTOs
// ═══════════════════════════════════════════════════════════════

export const GenerateEInvoiceSchema = z.object({
  invoice_id: z.string().uuid().optional(), // Can also come from route param
});

export type GenerateEInvoiceDto = z.infer<typeof GenerateEInvoiceSchema>;

export const BulkGenerateEInvoiceSchema = z.object({
  invoice_ids: z
    .array(z.string().uuid())
    .min(1, 'At least one invoice is required')
    .max(100, 'Maximum 100 invoices per batch'),
});

export type BulkGenerateEInvoiceDto = z.infer<typeof BulkGenerateEInvoiceSchema>;

export const CancelEInvoiceSchema = z.object({
  reason: z.enum(['1', '2', '3', '4'], {
    errorMap: () => ({
      message:
        'Reason must be 1 (Duplicate), 2 (Data Entry Mistake), 3 (Order Cancelled), or 4 (Others)',
    }),
  }),
  remarks: z
    .string()
    .min(5, 'Remarks must be at least 5 characters')
    .max(100, 'Remarks must not exceed 100 characters'),
});

export type CancelEInvoiceDto = z.infer<typeof CancelEInvoiceSchema>;

export const ListEInvoiceQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z
    .enum(['pending', 'generated', 'cancelled', 'failed'])
    .optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
});

export type ListEInvoiceQueryDto = z.infer<typeof ListEInvoiceQuerySchema>;

// ═══════════════════════════════════════════════════════════════
// E-Way Bill DTOs
// ═══════════════════════════════════════════════════════════════

export const TransportDetailsSchema = z.object({
  transporter_id: z.string().max(15).optional(),
  transporter_name: z.string().max(100).optional(),
  transport_mode: z.enum(['1', '2', '3', '4'], {
    errorMap: () => ({
      message: 'Transport mode must be 1 (Road), 2 (Rail), 3 (Air), or 4 (Ship)',
    }),
  }),
  transport_doc_no: z.string().max(15).optional(),
  transport_doc_date: z.string().optional(),
  vehicle_no: z
    .string()
    .max(20)
    .optional()
    .refine(
      (v) => !v || /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(v.replace(/\s/g, '').toUpperCase()),
      'Invalid vehicle number format (e.g., MH12AB1234)',
    ),
  vehicle_type: z.enum(['R', 'O']).optional(), // R = Regular, O = Over Dimensional Cargo
});

export const GenerateEwayBillSchema = z.object({
  invoice_id: z.string().uuid().optional(),
  sub_type: z.enum(['1', '2']).default('1'), // 1 = Supply, 2 = Export
  distance: z.coerce.number().int().min(0).max(4000),
  transport: TransportDetailsSchema,
});

export type GenerateEwayBillDto = z.infer<typeof GenerateEwayBillSchema>;

export const ExtendEwayBillSchema = z.object({
  reason: z.enum(['1', '2', '3', '99'], {
    errorMap: () => ({
      message:
        'Reason must be 1 (Natural Calamity), 2 (Transshipment), 3 (Accident), or 99 (Others)',
    }),
  }),
  remarks: z
    .string()
    .min(5, 'Remarks must be at least 5 characters')
    .max(100, 'Remarks must not exceed 100 characters'),
  from_place: z.string().min(1).max(100),
  from_state: z.string().length(2),
  remaining_distance: z.coerce.number().int().min(1).max(4000),
  transport: TransportDetailsSchema.optional(),
});

export type ExtendEwayBillDto = z.infer<typeof ExtendEwayBillSchema>;

export const CancelEwayBillSchema = z.object({
  reason: z.enum(['1', '2', '3', '4'], {
    errorMap: () => ({
      message:
        'Reason must be 1 (Duplicate), 2 (Data Entry Mistake), 3 (Order Cancelled), or 4 (Others)',
    }),
  }),
  remarks: z
    .string()
    .min(5, 'Remarks must be at least 5 characters')
    .max(100, 'Remarks must not exceed 100 characters'),
});

export type CancelEwayBillDto = z.infer<typeof CancelEwayBillSchema>;

export const ListEwayBillQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z
    .enum(['pending', 'active', 'expired', 'cancelled'])
    .optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
});

export type ListEwayBillQueryDto = z.infer<typeof ListEwayBillQuerySchema>;

// ═══════════════════════════════════════════════════════════════
// GSP Settings DTOs
// ═══════════════════════════════════════════════════════════════

export const UpdateGspSettingsSchema = z.object({
  gsp_provider: z.enum(['nic', 'cleartax', 'masters_india', 'cygnet']).optional(),
  gsp_username: z.string().min(1).optional(),
  gsp_password: z.string().min(1).optional(),
  gsp_client_id: z.string().min(1).optional(),
  gsp_client_secret: z.string().min(1).optional(),
  gstin: z.string().length(15).optional(),
  auto_generate: z.boolean().optional(),
  auto_eway_bill: z.boolean().optional(),
  eway_bill_threshold: z.coerce.number().min(0).optional().default(50000),
  sandbox_mode: z.boolean().optional().default(true),
});

export type UpdateGspSettingsDto = z.infer<typeof UpdateGspSettingsSchema>;

// ═══════════════════════════════════════════════════════════════
// NIC E-Invoice JSON Schema (Version 1.1) Interfaces
// ═══════════════════════════════════════════════════════════════

export interface NICTransactionDetails {
  TaxSch: 'GST';
  SupTyp: 'B2B' | 'SEZWP' | 'SEZWOP' | 'EXPWP' | 'EXPWOP' | 'DEXP';
  RegRev: 'Y' | 'N';
  EcmGstin: string | null;
  IgstOnIntra: 'Y' | 'N';
}

export interface NICDocumentDetails {
  Typ: 'INV' | 'CRN' | 'DBN';
  No: string;
  Dt: string; // DD/MM/YYYY
  OrgInvNo?: string;
  OrgInvDt?: string;
}

export interface NICPartyDetails {
  Gstin: string;
  LglNm: string;
  TrdNm?: string;
  Addr1: string;
  Addr2?: string;
  Loc: string;
  Pin: number;
  Stcd: string;
  Ph?: string;
  Em?: string;
}

export interface NICItemDetails {
  SlNo: string;
  PrdDesc?: string;
  IsServc: 'Y' | 'N';
  HsnCd: string;
  Barcde?: string;
  Qty?: number;
  FreeQty?: number;
  Unit?: string;
  UnitPrice: number;
  TotAmt: number;
  Discount: number;
  PreTaxVal?: number;
  AssAmt: number;
  GstRt: number;
  IgstAmt: number;
  CgstAmt: number;
  SgstAmt: number;
  CesRt?: number;
  CesAmt?: number;
  CesNonAdvlAmt?: number;
  StateCesRt?: number;
  StateCesAmt?: number;
  StateCesNonAdvlAmt?: number;
  OthChrg?: number;
  TotItemVal: number;
}

export interface NICValueDetails {
  AssVal: number;
  CgstVal: number;
  SgstVal: number;
  IgstVal: number;
  CesVal: number;
  StCesVal: number;
  Discount: number;
  OthChrg: number;
  RndOffAmt: number;
  TotInvVal: number;
  TotInvValFc?: number;
}

export interface NICEInvoicePayload {
  Version: '1.1';
  TranDtls: NICTransactionDetails;
  DocDtls: NICDocumentDetails;
  SellerDtls: NICPartyDetails;
  BuyerDtls: NICPartyDetails;
  DispDtls?: Partial<NICPartyDetails>;
  ShipDtls?: Partial<NICPartyDetails>;
  ItemList: NICItemDetails[];
  ValDtls: NICValueDetails;
  PayDtls?: {
    Nm?: string;
    AccDet?: string;
    Mode?: string;
    FinInsBr?: string;
    PayTerm?: string;
    PayInstr?: string;
    CrTrn?: string;
    DirDr?: string;
    CrDay?: number;
    PaidAmt?: number;
    PaymtDue?: number;
  };
  EwbDtls?: {
    TransId?: string;
    TransName?: string;
    TransMode?: string;
    Distance: number;
    TransDocNo?: string;
    TransDocDt?: string;
    VehNo?: string;
    VehType?: string;
  };
  RefDtls?: {
    InvRm?: string;
    DocPerdDtls?: { InvStDt: string; InvEndDt: string };
    PrecDocDtls?: Array<{ InvNo: string; InvDt: string; OthRefNo?: string }>;
    ContrDtls?: Array<{ RecAdvRefr?: string; RecAdvDt?: string; Tendrefr?: string; Contrrefr?: string; Extrefr?: string; ProjRefr?: string; PORefr?: string; PORefDt?: string }>;
  };
}

// ═══════════════════════════════════════════════════════════════
// NIC API Response Interfaces
// ═══════════════════════════════════════════════════════════════

export interface NICGenerateResponse {
  AckNo: number;
  AckDt: string;
  Irn: string;
  SignedInvoice: string;
  SignedQRCode: string;
  EwbNo?: number;
  EwbDt?: string;
  EwbValidTill?: string;
  Status: string;
  Remarks?: string;
}

export interface NICCancelResponse {
  Irn: string;
  CancelDate: string;
}

export interface NICEwayBillResponse {
  EwbNo: number;
  EwbDt: string;
  EwbValidTill: string;
  Remarks?: string;
}

// ═══════════════════════════════════════════════════════════════
// Internal E-Invoice Record
// ═══════════════════════════════════════════════════════════════

export interface EInvoiceRecord {
  id: string;
  org_id: string;
  invoice_id: string;
  invoice_number: string;
  irn: string | null;
  ack_no: string | null;
  ack_date: string | null;
  signed_invoice: string | null;
  signed_qr_code: string | null;
  qr_code_image: string | null;
  status: 'pending' | 'generated' | 'cancelled' | 'failed';
  error_message: string | null;
  cancel_reason: string | null;
  cancel_remarks: string | null;
  cancelled_at: string | null;
  payload: any;
  response: any;
  created_at: string;
  updated_at: string;
}

export interface EwayBillRecord {
  id: string;
  org_id: string;
  invoice_id: string;
  invoice_number: string;
  eway_bill_no: string | null;
  eway_bill_date: string | null;
  valid_till: string | null;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  distance: number;
  transport_mode: string | null;
  vehicle_no: string | null;
  transporter_id: string | null;
  transporter_name: string | null;
  error_message: string | null;
  cancel_reason: string | null;
  cancel_remarks: string | null;
  cancelled_at: string | null;
  payload: any;
  response: any;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════
// State Code Mapping
// ═══════════════════════════════════════════════════════════════

export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

// NIC Unit Codes mapping from common units
export const UNIT_CODE_MAP: Record<string, string> = {
  pcs: 'PCS',
  nos: 'NOS',
  kg: 'KGS',
  gm: 'GMS',
  ltr: 'LTR',
  mtr: 'MTR',
  sqm: 'SQM',
  cbm: 'CBM',
  ton: 'TON',
  set: 'SET',
  box: 'BOX',
  bag: 'BAG',
  pair: 'PAR',
  dozen: 'DOZ',
  roll: 'ROL',
  bundle: 'BDL',
  pack: 'PAC',
  drum: 'DRM',
  others: 'OTH',
};
