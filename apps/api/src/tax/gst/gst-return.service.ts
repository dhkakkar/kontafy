import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SaveGstReturnDto, FileGstReturnDto } from '../dto/gst-return.dto';

// ── Interfaces ─────────────────────────────────────────────────

interface B2BEntry {
  gstin: string;
  contact_name: string;
  invoice_number: string;
  invoice_date: string;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total_tax: number;
  invoice_total: number;
  place_of_supply: string | null;
  is_igst: boolean;
}

interface RateWiseSummary {
  rate: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total_tax: number;
}

interface GSTR1Data {
  b2b: B2BEntry[];
  b2c: {
    taxable_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total_tax: number;
    rate_wise: RateWiseSummary[];
  };
  summary: {
    total_invoices: number;
    total_taxable_amount: number;
    total_cgst: number;
    total_sgst: number;
    total_igst: number;
    total_cess: number;
    total_tax: number;
    total_value: number;
  };
}

// ── GSTR-3B Full Interfaces ────────────────────────────────────

interface GSTR3BTable31Row {
  nature: string;
  taxable_amount: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

interface GSTR3BTable32Row {
  place_of_supply: string;
  taxable_amount: number;
  igst: number;
}

interface GSTR3BTable4Row {
  description: string;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

interface GSTR3BTable5Row {
  nature: string;
  inter_state: number;
  intra_state: number;
}

interface GSTR3BTable6Row {
  description: string;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

interface GSTR3BFullData {
  period: string;
  gstin: string | null;
  table_3_1: GSTR3BTable31Row[];
  table_3_2: GSTR3BTable32Row[];
  table_4: GSTR3BTable4Row[];
  table_5: GSTR3BTable5Row[];
  table_6: GSTR3BTable6Row[];
  interest: { igst: number; cgst: number; sgst: number; cess: number };
  late_fee: { cgst: number; sgst: number };
  rate_wise_outward: RateWiseSummary[];
  rate_wise_inward: RateWiseSummary[];
}

// ── GSTR-1 JSON Export Interfaces (GST Portal format) ──────────

interface GSTR1JsonB2BInvoice {
  inum: string;
  idt: string;
  val: number;
  pos: string;
  rchrg: string;
  inv_typ: string;
  itms: Array<{
    num: number;
    itm_det: {
      txval: number;
      rt: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
  }>;
}

interface GSTR1JsonB2B {
  ctin: string;
  inv: GSTR1JsonB2BInvoice[];
}

interface GSTR1JsonB2CS {
  sply_ty: string;
  pos: string;
  typ: string;
  txval: number;
  rt: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

interface GSTR1JsonB2CL {
  pos: string;
  inv: Array<{
    inum: string;
    idt: string;
    val: number;
    itms: Array<{
      num: number;
      itm_det: {
        txval: number;
        rt: number;
        iamt: number;
        csamt: number;
      };
    }>;
  }>;
}

interface GSTR1JsonCDNR {
  ctin: string;
  nt: Array<{
    ntty: string;
    nt_num: string;
    nt_dt: string;
    val: number;
    pos: string;
    rchrg: string;
    inv_typ: string;
    itms: Array<{
      num: number;
      itm_det: {
        txval: number;
        rt: number;
        iamt: number;
        camt: number;
        samt: number;
        csamt: number;
      };
    }>;
  }>;
}

interface GSTR1JsonCDNUR {
  typ: string;
  ntty: string;
  nt_num: string;
  nt_dt: string;
  val: number;
  pos: string;
  itms: Array<{
    num: number;
    itm_det: {
      txval: number;
      rt: number;
      iamt: number;
      csamt: number;
    };
  }>;
}

interface GSTR1JsonHSN {
  num: number;
  hsn_sc: string;
  desc: string;
  uqc: string;
  qty: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

interface GSTR1JsonDocIssue {
  doc_det: Array<{
    doc_num: number;
    doc_typ: string;
    docs: Array<{
      num: number;
      from: string;
      to: string;
      totnum: number;
      cancel: number;
      net_issue: number;
    }>;
  }>;
}

interface GSTR1JsonExport {
  gstin: string;
  fp: string;
  b2b?: GSTR1JsonB2B[];
  b2cs?: GSTR1JsonB2CS[];
  b2cl?: GSTR1JsonB2CL[];
  cdnr?: GSTR1JsonCDNR[];
  cdnur?: GSTR1JsonCDNUR[];
  hsn: { data: GSTR1JsonHSN[] };
  doc_issue?: GSTR1JsonDocIssue;
}

// ── Validation interfaces ──────────────────────────────────────

interface ValidationIssue {
  severity: 'error' | 'warning';
  section: string;
  invoice_number?: string;
  field: string;
  message: string;
}

@Injectable()
export class GstReturnService {
  private readonly logger = new Logger(GstReturnService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // CRUD: List / Find / Save / File
  // ═══════════════════════════════════════════════════════════════

  /**
   * List GST returns for an organization with filtering and pagination.
   */
  async findAll(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      return_type?: string;
      status?: string;
      period?: string;
    },
  ) {
    const { return_type, status, period } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.GstReturnWhereInput = { org_id: orgId };
    if (return_type) where.return_type = return_type;
    if (status) where.status = status;
    if (period) where.period = period;

    const [returns, total] = await Promise.all([
      this.prisma.gstReturn.findMany({
        where,
        orderBy: [{ created_at: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.gstReturn.count({ where }),
    ]);

    return {
      data: returns,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single GST return by ID.
   */
  async findOne(orgId: string, id: string) {
    const gstReturn = await this.prisma.gstReturn.findFirst({
      where: { id, org_id: orgId },
    });

    if (!gstReturn) {
      throw new NotFoundException('GST return not found');
    }

    return gstReturn;
  }

  /**
   * Save a computed GST return.
   */
  async saveReturn(orgId: string, data: SaveGstReturnDto) {
    // Check for existing return of same type and period
    const existing = await this.prisma.gstReturn.findFirst({
      where: {
        org_id: orgId,
        return_type: data.return_type,
        period: data.period,
      },
    });

    if (existing) {
      if (existing.status === 'filed') {
        throw new BadRequestException(
          'A filed return already exists for this period and type. Cannot overwrite.',
        );
      }

      // Update existing draft/computed return
      return this.prisma.gstReturn.update({
        where: { id: existing.id },
        data: {
          data: data.data as Prisma.InputJsonValue,
          status: data.status || 'computed',
        },
      });
    }

    return this.prisma.gstReturn.create({
      data: {
        org_id: orgId,
        return_type: data.return_type,
        period: data.period,
        data: data.data as Prisma.InputJsonValue,
        status: data.status || 'computed',
      },
    });
  }

  /**
   * Mark a return as filed with timestamp.
   */
  async fileReturn(orgId: string, returnId: string, dto: FileGstReturnDto) {
    const gstReturn = await this.prisma.gstReturn.findFirst({
      where: { id: returnId, org_id: orgId },
    });

    if (!gstReturn) {
      throw new NotFoundException('GST return not found');
    }

    if (gstReturn.status === 'filed') {
      throw new BadRequestException('This return has already been filed');
    }

    if (gstReturn.status === 'draft') {
      throw new BadRequestException('Cannot file a draft return. Please compute it first.');
    }

    return this.prisma.gstReturn.update({
      where: { id: returnId },
      data: {
        status: 'filed',
        filed_at: new Date(),
        arn: dto.arn || null,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // GSTR-1: Compute
  // ═══════════════════════════════════════════════════════════════

  /**
   * Compute GSTR-1 from sales invoices for a given period.
   */
  async computeGSTR1(orgId: string, fromDate: Date, toDate: Date): Promise<GSTR1Data> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: 'sale',
        status: { not: 'cancelled' },
        date: { gte: fromDate, lte: toDate },
      },
      include: {
        items: true,
        contact: {
          select: { id: true, name: true, gstin: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    const b2bEntries: B2BEntry[] = [];
    let b2cTaxable = 0;
    let b2cCgst = 0;
    let b2cSgst = 0;
    let b2cIgst = 0;
    let b2cCess = 0;
    const b2cRateMap = new Map<number, RateWiseSummary>();

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;

    for (const invoice of invoices) {
      const itemTotals = this.aggregateInvoiceItems(invoice.items);
      const hasGstin = !!invoice.contact?.gstin;

      totalTaxable += itemTotals.taxableAmount;
      totalCgst += itemTotals.cgst;
      totalSgst += itemTotals.sgst;
      totalIgst += itemTotals.igst;
      totalCess += itemTotals.cess;

      if (hasGstin) {
        b2bEntries.push({
          gstin: invoice.contact!.gstin!,
          contact_name: invoice.contact!.name,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.date.toISOString().split('T')[0],
          taxable_amount: itemTotals.taxableAmount,
          cgst: itemTotals.cgst,
          sgst: itemTotals.sgst,
          igst: itemTotals.igst,
          cess: itemTotals.cess,
          total_tax: itemTotals.totalTax,
          invoice_total: this.toNum(invoice.total),
          place_of_supply: invoice.place_of_supply,
          is_igst: invoice.is_igst,
        });
      } else {
        b2cTaxable += itemTotals.taxableAmount;
        b2cCgst += itemTotals.cgst;
        b2cSgst += itemTotals.sgst;
        b2cIgst += itemTotals.igst;
        b2cCess += itemTotals.cess;

        for (const item of invoice.items) {
          const rate = this.toNum(item.igst_rate) || (this.toNum(item.cgst_rate) + this.toNum(item.sgst_rate));
          const existing = b2cRateMap.get(rate) || {
            rate,
            taxable_amount: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            cess: 0,
            total_tax: 0,
          };
          existing.taxable_amount += this.toNum(item.taxable_amount);
          existing.cgst += this.toNum(item.cgst_amount);
          existing.sgst += this.toNum(item.sgst_amount);
          existing.igst += this.toNum(item.igst_amount);
          existing.cess += this.toNum(item.cess_amount);
          existing.total_tax +=
            this.toNum(item.cgst_amount) +
            this.toNum(item.sgst_amount) +
            this.toNum(item.igst_amount) +
            this.toNum(item.cess_amount);
          b2cRateMap.set(rate, existing);
        }
      }
    }

    const totalTax = this.round(totalCgst + totalSgst + totalIgst + totalCess);

    return {
      b2b: b2bEntries,
      b2c: {
        taxable_amount: this.round(b2cTaxable),
        cgst: this.round(b2cCgst),
        sgst: this.round(b2cSgst),
        igst: this.round(b2cIgst),
        cess: this.round(b2cCess),
        total_tax: this.round(b2cCgst + b2cSgst + b2cIgst + b2cCess),
        rate_wise: Array.from(b2cRateMap.values()).map((r) => ({
          ...r,
          taxable_amount: this.round(r.taxable_amount),
          cgst: this.round(r.cgst),
          sgst: this.round(r.sgst),
          igst: this.round(r.igst),
          cess: this.round(r.cess),
          total_tax: this.round(r.total_tax),
        })),
      },
      summary: {
        total_invoices: invoices.length,
        total_taxable_amount: this.round(totalTaxable),
        total_cgst: this.round(totalCgst),
        total_sgst: this.round(totalSgst),
        total_igst: this.round(totalIgst),
        total_cess: this.round(totalCess),
        total_tax: totalTax,
        total_value: this.round(totalTaxable + totalTax),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // GSTR-1: JSON Export (GST Portal Format)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Export GSTR-1 in the official GST portal JSON format.
   */
  async exportGSTR1JSON(orgId: string, fromDate: Date, toDate: Date, period: string): Promise<GSTR1JsonExport> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { gstin: true },
    });

    if (!org?.gstin) {
      throw new BadRequestException('Organization GSTIN is required for GSTR-1 export. Please update in settings.');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: 'sale',
        status: { not: 'cancelled' },
        date: { gte: fromDate, lte: toDate },
      },
      include: {
        items: { include: { product: { select: { hsn_code: true, name: true, unit: true } } } },
        contact: { select: { id: true, name: true, gstin: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Also fetch credit/debit notes
    const creditNotes = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: { in: ['credit_note', 'debit_note'] },
        status: { not: 'cancelled' },
        date: { gte: fromDate, lte: toDate },
      },
      include: {
        items: { include: { product: { select: { hsn_code: true, name: true, unit: true } } } },
        contact: { select: { id: true, name: true, gstin: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Separate sales into B2B, B2CS, B2CL
    const b2bMap = new Map<string, GSTR1JsonB2BInvoice[]>();
    const b2csMap = new Map<string, GSTR1JsonB2CS>(); // key: pos-rate-splyty
    const b2clMap = new Map<string, { pos: string; inv: any[] }>(); // key: pos

    // HSN aggregation
    const hsnMap = new Map<string, GSTR1JsonHSN & { _num: number }>();
    let hsnCounter = 1;

    // Document tracking
    const invoiceNumbers: string[] = [];

    for (const invoice of invoices) {
      invoiceNumbers.push(invoice.invoice_number);
      const hasGstin = !!invoice.contact?.gstin;
      const invoiceTotal = this.toNum(invoice.total);
      const pos = invoice.place_of_supply || org.gstin.substring(0, 2);
      const isIgst = invoice.is_igst;

      // Aggregate items by rate for this invoice
      const rateGroups = this.groupItemsByRate(invoice.items);

      // HSN accumulation for all invoices
      this.accumulateHSN(invoice.items, hsnMap, hsnCounter);

      if (hasGstin) {
        // B2B
        const ctin = invoice.contact!.gstin!;
        const b2bInv: GSTR1JsonB2BInvoice = {
          inum: invoice.invoice_number,
          idt: this.formatDateDDMMYYYY(invoice.date),
          val: invoiceTotal,
          pos,
          rchrg: 'N',
          inv_typ: 'R',
          itms: rateGroups.map((rg, idx) => ({
            num: idx + 1,
            itm_det: {
              txval: rg.taxable_amount,
              rt: rg.rate,
              iamt: rg.igst,
              camt: rg.cgst,
              samt: rg.sgst,
              csamt: rg.cess,
            },
          })),
        };

        if (!b2bMap.has(ctin)) b2bMap.set(ctin, []);
        b2bMap.get(ctin)!.push(b2bInv);
      } else if (isIgst && invoiceTotal > 250000) {
        // B2CL: Inter-state, invoice value > 2.5 Lakhs
        if (!b2clMap.has(pos)) b2clMap.set(pos, { pos, inv: [] });
        b2clMap.get(pos)!.inv.push({
          inum: invoice.invoice_number,
          idt: this.formatDateDDMMYYYY(invoice.date),
          val: invoiceTotal,
          itms: rateGroups.map((rg, idx) => ({
            num: idx + 1,
            itm_det: {
              txval: rg.taxable_amount,
              rt: rg.rate,
              iamt: rg.igst,
              csamt: rg.cess,
            },
          })),
        });
      } else {
        // B2CS: B2C Small (intra-state or inter-state <= 2.5L)
        const splyTy = isIgst ? 'INTER' : 'INTRA';
        for (const rg of rateGroups) {
          const key = `${splyTy}-${pos}-${rg.rate}`;
          const existing = b2csMap.get(key);
          if (existing) {
            existing.txval = this.round(existing.txval + rg.taxable_amount);
            existing.iamt = this.round(existing.iamt + rg.igst);
            existing.camt = this.round(existing.camt + rg.cgst);
            existing.samt = this.round(existing.samt + rg.sgst);
            existing.csamt = this.round(existing.csamt + rg.cess);
          } else {
            b2csMap.set(key, {
              sply_ty: splyTy,
              pos,
              typ: 'OE',
              txval: rg.taxable_amount,
              rt: rg.rate,
              iamt: rg.igst,
              camt: rg.cgst,
              samt: rg.sgst,
              csamt: rg.cess,
            });
          }
        }
      }
    }

    // Credit/Debit notes
    const cdnrMap = new Map<string, any[]>();
    const cdnurList: GSTR1JsonCDNUR[] = [];

    for (const cn of creditNotes) {
      const hasGstin = !!cn.contact?.gstin;
      const noteTotal = this.toNum(cn.total);
      const pos = cn.place_of_supply || org.gstin.substring(0, 2);
      const rateGroups = this.groupItemsByRate(cn.items);
      const ntty = cn.type === 'credit_note' ? 'C' : 'D';

      this.accumulateHSN(cn.items, hsnMap, hsnCounter);

      if (hasGstin) {
        const ctin = cn.contact!.gstin!;
        if (!cdnrMap.has(ctin)) cdnrMap.set(ctin, []);
        cdnrMap.get(ctin)!.push({
          ntty,
          nt_num: cn.invoice_number,
          nt_dt: this.formatDateDDMMYYYY(cn.date),
          val: noteTotal,
          pos,
          rchrg: 'N',
          inv_typ: 'R',
          itms: rateGroups.map((rg, idx) => ({
            num: idx + 1,
            itm_det: {
              txval: rg.taxable_amount,
              rt: rg.rate,
              iamt: rg.igst,
              camt: rg.cgst,
              samt: rg.sgst,
              csamt: rg.cess,
            },
          })),
        });
      } else {
        cdnurList.push({
          typ: cn.is_igst ? 'B2CL' : 'B2CS',
          ntty,
          nt_num: cn.invoice_number,
          nt_dt: this.formatDateDDMMYYYY(cn.date),
          val: noteTotal,
          pos,
          itms: rateGroups.map((rg, idx) => ({
            num: idx + 1,
            itm_det: {
              txval: rg.taxable_amount,
              rt: rg.rate,
              iamt: rg.igst,
              csamt: rg.cess,
            },
          })),
        });
      }
    }

    // Build HSN summary
    const hsnData: GSTR1JsonHSN[] = Array.from(hsnMap.values()).map((h) => ({
      num: h._num,
      hsn_sc: h.hsn_sc,
      desc: h.desc,
      uqc: h.uqc,
      qty: this.round(h.qty),
      txval: this.round(h.txval),
      iamt: this.round(h.iamt),
      camt: this.round(h.camt),
      samt: this.round(h.samt),
      csamt: this.round(h.csamt),
    }));

    // Build document issue summary
    const docIssue = this.buildDocIssueSummary(invoices, creditNotes);

    // Assemble final export
    const result: GSTR1JsonExport = {
      gstin: org.gstin,
      fp: period, // MMYYYY format
      hsn: { data: hsnData },
    };

    if (b2bMap.size > 0) {
      result.b2b = Array.from(b2bMap.entries()).map(([ctin, inv]) => ({ ctin, inv }));
    }

    if (b2csMap.size > 0) {
      result.b2cs = Array.from(b2csMap.values());
    }

    if (b2clMap.size > 0) {
      result.b2cl = Array.from(b2clMap.values());
    }

    if (cdnrMap.size > 0) {
      result.cdnr = Array.from(cdnrMap.entries()).map(([ctin, nt]) => ({ ctin, nt }));
    }

    if (cdnurList.length > 0) {
      result.cdnur = cdnurList;
    }

    if (docIssue) {
      result.doc_issue = docIssue;
    }

    return result;
  }

  /**
   * Validate GSTR-1 data before export.
   */
  async validateGSTR1(orgId: string, fromDate: Date, toDate: Date): Promise<{
    valid: boolean;
    issues: ValidationIssue[];
    summary: { errors: number; warnings: number; b2b_count: number; b2cs_count: number; cdn_count: number; hsn_count: number };
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { gstin: true },
    });

    const issues: ValidationIssue[] = [];

    if (!org?.gstin) {
      issues.push({
        severity: 'error',
        section: 'Organization',
        field: 'gstin',
        message: 'Organization GSTIN is not set. Required for GSTR-1 filing.',
      });
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: { in: ['sale', 'credit_note', 'debit_note'] },
        status: { not: 'cancelled' },
        date: { gte: fromDate, lte: toDate },
      },
      include: {
        items: true,
        contact: { select: { id: true, name: true, gstin: true } },
      },
      orderBy: { date: 'asc' },
    });

    let b2bCount = 0;
    let b2csCount = 0;
    let cdnCount = 0;
    const hsnCodes = new Set<string>();

    for (const invoice of invoices) {
      if (invoice.type === 'credit_note' || invoice.type === 'debit_note') {
        cdnCount++;
      } else if (invoice.contact?.gstin) {
        b2bCount++;
      } else {
        b2csCount++;
      }

      // Check for B2B invoices without GSTIN
      if (invoice.type === 'sale' && invoice.contact && !invoice.contact.gstin) {
        const total = this.toNum(invoice.total);
        if (invoice.is_igst && total > 250000) {
          issues.push({
            severity: 'warning',
            section: 'B2CL',
            invoice_number: invoice.invoice_number,
            field: 'gstin',
            message: `Inter-state invoice #${invoice.invoice_number} exceeds Rs.2.5L without GSTIN. Will be reported under B2CL.`,
          });
        }
      }

      // Validate GSTIN format for B2B
      if (invoice.contact?.gstin) {
        const gstin = invoice.contact.gstin;
        if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(gstin)) {
          issues.push({
            severity: 'error',
            section: 'B2B',
            invoice_number: invoice.invoice_number,
            field: 'gstin',
            message: `Invalid GSTIN format "${gstin}" for invoice #${invoice.invoice_number}.`,
          });
        }
      }

      // Check Place of Supply
      if (!invoice.place_of_supply) {
        issues.push({
          severity: 'warning',
          section: invoice.contact?.gstin ? 'B2B' : 'B2C',
          invoice_number: invoice.invoice_number,
          field: 'place_of_supply',
          message: `Place of supply is missing for invoice #${invoice.invoice_number}. Will default to organization state.`,
        });
      }

      // Check HSN codes on items
      for (const item of invoice.items) {
        if (!item.hsn_code) {
          issues.push({
            severity: 'warning',
            section: 'HSN',
            invoice_number: invoice.invoice_number,
            field: 'hsn_code',
            message: `HSN/SAC code missing for item "${item.description}" on invoice #${invoice.invoice_number}.`,
          });
        } else {
          hsnCodes.add(item.hsn_code);
        }

        // Validate tax amounts
        const taxableAmt = this.toNum(item.taxable_amount);
        if (taxableAmt <= 0) {
          issues.push({
            severity: 'warning',
            section: 'Items',
            invoice_number: invoice.invoice_number,
            field: 'taxable_amount',
            message: `Zero or negative taxable amount for item "${item.description}" on invoice #${invoice.invoice_number}.`,
          });
        }
      }
    }

    if (invoices.length === 0) {
      issues.push({
        severity: 'warning',
        section: 'General',
        field: 'invoices',
        message: 'No invoices found for the selected period.',
      });
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;

    return {
      valid: errorCount === 0,
      issues,
      summary: {
        errors: errorCount,
        warnings: issues.filter((i) => i.severity === 'warning').length,
        b2b_count: b2bCount,
        b2cs_count: b2csCount,
        cdn_count: cdnCount,
        hsn_count: hsnCodes.size,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // GSTR-3B: Full Compute (Official Format)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Compute full GSTR-3B with all tables matching the official format.
   */
  async computeGSTR3BFull(orgId: string, fromDate: Date, toDate: Date, period: string): Promise<GSTR3BFullData> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { gstin: true },
    });

    const orgStateCode = org?.gstin ? org.gstin.substring(0, 2) : null;

    // Fetch all sales invoices
    const salesInvoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: 'sale',
        status: { not: 'cancelled' },
        date: { gte: fromDate, lte: toDate },
      },
      include: {
        items: true,
        contact: { select: { gstin: true } },
      },
    });

    // Fetch purchase invoices for ITC
    const purchaseInvoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: 'purchase',
        status: { not: 'cancelled' },
        date: { gte: fromDate, lte: toDate },
      },
      include: { items: true },
    });

    // Fetch credit/debit notes
    const creditNotes = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: { in: ['credit_note', 'debit_note'] },
        status: { not: 'cancelled' },
        date: { gte: fromDate, lte: toDate },
      },
      include: { items: true },
    });

    // ── Table 3.1: Outward supplies ────────────────────────────

    let taxableSupplies = { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
    let exemptSupplies = { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
    let nilRatedSupplies = { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };

    for (const inv of salesInvoices) {
      for (const item of inv.items) {
        const taxableAmt = this.toNum(item.taxable_amount);
        const rate = this.toNum(item.igst_rate) || (this.toNum(item.cgst_rate) + this.toNum(item.sgst_rate));
        const igst = this.toNum(item.igst_amount);
        const cgst = this.toNum(item.cgst_amount);
        const sgst = this.toNum(item.sgst_amount);
        const cess = this.toNum(item.cess_amount);

        if (rate === 0 && taxableAmt > 0) {
          // Could be exempt or nil-rated; treat as nil-rated for simplicity
          nilRatedSupplies.taxable += taxableAmt;
        } else if (rate > 0) {
          taxableSupplies.taxable += taxableAmt;
          taxableSupplies.igst += igst;
          taxableSupplies.cgst += cgst;
          taxableSupplies.sgst += sgst;
          taxableSupplies.cess += cess;
        }
      }
    }

    const table31: GSTR3BTable31Row[] = [
      {
        nature: 'Outward taxable supplies (other than zero rated, nil rated and exempted)',
        taxable_amount: this.round(taxableSupplies.taxable),
        igst: this.round(taxableSupplies.igst),
        cgst: this.round(taxableSupplies.cgst),
        sgst: this.round(taxableSupplies.sgst),
        cess: this.round(taxableSupplies.cess),
      },
      {
        nature: 'Outward taxable supplies (zero rated)',
        taxable_amount: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
      {
        nature: 'Other outward supplies (nil rated, exempted)',
        taxable_amount: this.round(nilRatedSupplies.taxable + exemptSupplies.taxable),
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
      {
        nature: 'Inward supplies (liable to reverse charge)',
        taxable_amount: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
      {
        nature: 'Non-GST outward supplies',
        taxable_amount: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
    ];

    // ── Table 3.2: Inter-state supplies to unregistered persons ──

    const interStateUnregMap = new Map<string, { taxable: number; igst: number }>();

    for (const inv of salesInvoices) {
      if (!inv.is_igst) continue;
      const hasGstin = inv.contact?.gstin;
      if (hasGstin) continue;

      const pos = inv.place_of_supply || '';
      for (const item of inv.items) {
        const taxableAmt = this.toNum(item.taxable_amount);
        const igst = this.toNum(item.igst_amount);
        const existing = interStateUnregMap.get(pos) || { taxable: 0, igst: 0 };
        existing.taxable += taxableAmt;
        existing.igst += igst;
        interStateUnregMap.set(pos, existing);
      }
    }

    const table32: GSTR3BTable32Row[] = Array.from(interStateUnregMap.entries()).map(
      ([pos, vals]) => ({
        place_of_supply: pos,
        taxable_amount: this.round(vals.taxable),
        igst: this.round(vals.igst),
      }),
    );

    // ── Table 4: Eligible ITC ──────────────────────────────────

    const itcImport = { igst: 0, cgst: 0, sgst: 0, cess: 0 };
    const itcAll = { igst: 0, cgst: 0, sgst: 0, cess: 0 };

    for (const inv of purchaseInvoices) {
      for (const item of inv.items) {
        itcAll.igst += this.toNum(item.igst_amount);
        itcAll.cgst += this.toNum(item.cgst_amount);
        itcAll.sgst += this.toNum(item.sgst_amount);
        itcAll.cess += this.toNum(item.cess_amount);
      }
    }

    const table4: GSTR3BTable4Row[] = [
      {
        description: 'Import of goods',
        igst: this.round(itcImport.igst),
        cgst: this.round(itcImport.cgst),
        sgst: this.round(itcImport.sgst),
        cess: this.round(itcImport.cess),
      },
      {
        description: 'Import of services',
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
      {
        description: 'Inward supplies liable to reverse charge',
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
      {
        description: 'Inward supplies from ISD',
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
      {
        description: 'All other ITC',
        igst: this.round(itcAll.igst),
        cgst: this.round(itcAll.cgst),
        sgst: this.round(itcAll.sgst),
        cess: this.round(itcAll.cess),
      },
    ];

    // Total ITC
    const totalItc = {
      igst: this.round(itcAll.igst + itcImport.igst),
      cgst: this.round(itcAll.cgst + itcImport.cgst),
      sgst: this.round(itcAll.sgst + itcImport.sgst),
      cess: this.round(itcAll.cess + itcImport.cess),
    };

    // ── Table 5: Exempt, nil and non-GST inward supplies ──────

    let exemptIntraInward = 0;
    let exemptInterInward = 0;

    for (const inv of purchaseInvoices) {
      for (const item of inv.items) {
        const rate = this.toNum(item.igst_rate) || (this.toNum(item.cgst_rate) + this.toNum(item.sgst_rate));
        if (rate === 0) {
          const taxableAmt = this.toNum(item.taxable_amount);
          if (inv.is_igst) {
            exemptInterInward += taxableAmt;
          } else {
            exemptIntraInward += taxableAmt;
          }
        }
      }
    }

    const table5: GSTR3BTable5Row[] = [
      {
        nature: 'From a supplier under composition scheme, exempt and nil rated supply',
        inter_state: this.round(exemptInterInward),
        intra_state: this.round(exemptIntraInward),
      },
      {
        nature: 'Non-GST supply',
        inter_state: 0,
        intra_state: 0,
      },
    ];

    // ── Table 6: Payment of tax ────────────────────────────────

    const totalOutputTax = {
      igst: this.round(taxableSupplies.igst),
      cgst: this.round(taxableSupplies.cgst),
      sgst: this.round(taxableSupplies.sgst),
      cess: this.round(taxableSupplies.cess),
    };

    // ITC utilization: simple offset
    const itcUsedIgst = Math.min(totalItc.igst, totalOutputTax.igst);
    const remainingIgstItc = totalItc.igst - itcUsedIgst;
    const remainingIgstOutput = totalOutputTax.igst - itcUsedIgst;

    // IGST excess can be used for CGST then SGST
    const igstForCgst = Math.min(remainingIgstItc, totalOutputTax.cgst - Math.min(totalItc.cgst, totalOutputTax.cgst));
    const igstForSgst = Math.min(
      remainingIgstItc - igstForCgst,
      totalOutputTax.sgst - Math.min(totalItc.sgst, totalOutputTax.sgst),
    );

    const itcUsedCgst = Math.min(totalItc.cgst, totalOutputTax.cgst);
    const itcUsedSgst = Math.min(totalItc.sgst, totalOutputTax.sgst);
    const itcUsedCess = Math.min(totalItc.cess, totalOutputTax.cess);

    const cashPayableIgst = this.round(Math.max(0, totalOutputTax.igst - itcUsedIgst));
    const cashPayableCgst = this.round(Math.max(0, totalOutputTax.cgst - itcUsedCgst - igstForCgst));
    const cashPayableSgst = this.round(Math.max(0, totalOutputTax.sgst - itcUsedSgst - igstForSgst));
    const cashPayableCess = this.round(Math.max(0, totalOutputTax.cess - itcUsedCess));

    const table6: GSTR3BTable6Row[] = [
      {
        description: 'Tax payable',
        igst: totalOutputTax.igst,
        cgst: totalOutputTax.cgst,
        sgst: totalOutputTax.sgst,
        cess: totalOutputTax.cess,
      },
      {
        description: 'Tax paid through ITC',
        igst: this.round(itcUsedIgst),
        cgst: this.round(itcUsedCgst + igstForCgst),
        sgst: this.round(itcUsedSgst + igstForSgst),
        cess: this.round(itcUsedCess),
      },
      {
        description: 'Tax paid in cash',
        igst: cashPayableIgst,
        cgst: cashPayableCgst,
        sgst: cashPayableSgst,
        cess: cashPayableCess,
      },
    ];

    // ── Interest & late fee calculation ────────────────────────
    // Interest at 18% p.a. calculated if filing after due date (20th of next month)
    const interest = { igst: 0, cgst: 0, sgst: 0, cess: 0 };
    const lateFee = { cgst: 0, sgst: 0 };

    // Check if we're past due date
    const dueDate = new Date(toDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(20);

    const now = new Date();
    if (now > dueDate) {
      const daysLate = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const annualRate = 0.18;
      const dailyRate = annualRate / 365;

      interest.igst = this.round(cashPayableIgst * dailyRate * daysLate);
      interest.cgst = this.round(cashPayableCgst * dailyRate * daysLate);
      interest.sgst = this.round(cashPayableSgst * dailyRate * daysLate);
      interest.cess = this.round(cashPayableCess * dailyRate * daysLate);

      // Late fee: Rs.50 per day (Rs.25 CGST + Rs.25 SGST) for non-nil, Rs.20 for nil
      const totalTaxPayable = cashPayableIgst + cashPayableCgst + cashPayableSgst + cashPayableCess;
      if (totalTaxPayable > 0) {
        lateFee.cgst = Math.min(25 * daysLate, 5000);
        lateFee.sgst = Math.min(25 * daysLate, 5000);
      } else {
        lateFee.cgst = Math.min(10 * daysLate, 500);
        lateFee.sgst = Math.min(10 * daysLate, 500);
      }
    }

    // Rate-wise summaries
    const outward = this.aggregateAllInvoiceItems(salesInvoices);
    const inward = this.aggregateAllInvoiceItems(purchaseInvoices);

    return {
      period,
      gstin: org?.gstin || null,
      table_3_1: table31,
      table_3_2: table32,
      table_4: table4,
      table_5: table5,
      table_6: table6,
      interest,
      late_fee: lateFee,
      rate_wise_outward: outward.rateWise,
      rate_wise_inward: inward.rateWise,
    };
  }

  /**
   * Compute basic GSTR-3B (backwards compatible with existing endpoint).
   */
  async computeGSTR3B(orgId: string, fromDate: Date, toDate: Date) {
    // Output supplies (sales)
    const salesInvoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: 'sale',
        status: { not: 'cancelled' },
        date: { gte: fromDate, lte: toDate },
      },
      include: { items: true },
    });

    // Input supplies (purchases) for ITC
    const purchaseInvoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        type: 'purchase',
        status: { not: 'cancelled' },
        date: { gte: fromDate, lte: toDate },
      },
      include: { items: true },
    });

    const outward = this.aggregateAllInvoiceItems(salesInvoices);
    const inward = this.aggregateAllInvoiceItems(purchaseInvoices);

    const netCgst = this.round(Math.max(0, outward.cgst - inward.cgst));
    const netSgst = this.round(Math.max(0, outward.sgst - inward.sgst));
    const netIgst = this.round(Math.max(0, outward.igst - inward.igst));
    const netCess = this.round(Math.max(0, outward.cess - inward.cess));

    return {
      outward_supplies: {
        taxable_amount: outward.taxableAmount,
        cgst: outward.cgst,
        sgst: outward.sgst,
        igst: outward.igst,
        cess: outward.cess,
        total_tax: outward.totalTax,
      },
      inward_supplies_itc: {
        taxable_amount: inward.taxableAmount,
        cgst: inward.cgst,
        sgst: inward.sgst,
        igst: inward.igst,
        cess: inward.cess,
        total_tax: inward.totalTax,
      },
      net_tax_payable: {
        cgst: netCgst,
        sgst: netSgst,
        igst: netIgst,
        cess: netCess,
        total: this.round(netCgst + netSgst + netIgst + netCess),
      },
      rate_wise_outward: outward.rateWise,
      rate_wise_inward: inward.rateWise,
    };
  }

  /**
   * Get GSTR-3B filing history for an organization.
   */
  async getGSTR3BHistory(orgId: string) {
    const returns = await this.prisma.gstReturn.findMany({
      where: {
        org_id: orgId,
        return_type: 'GSTR3B',
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return { data: returns };
  }

  // ── Private helpers ────────────────────────────────────────────

  private aggregateInvoiceItems(items: any[]) {
    let taxableAmount = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let cess = 0;

    for (const item of items) {
      taxableAmount += this.toNum(item.taxable_amount);
      cgst += this.toNum(item.cgst_amount);
      sgst += this.toNum(item.sgst_amount);
      igst += this.toNum(item.igst_amount);
      cess += this.toNum(item.cess_amount);
    }

    return {
      taxableAmount: this.round(taxableAmount),
      cgst: this.round(cgst),
      sgst: this.round(sgst),
      igst: this.round(igst),
      cess: this.round(cess),
      totalTax: this.round(cgst + sgst + igst + cess),
    };
  }

  private aggregateAllInvoiceItems(invoices: Array<{ items: any[] }>) {
    let taxableAmount = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let cess = 0;
    const rateMap = new Map<number, RateWiseSummary>();

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const ta = this.toNum(item.taxable_amount);
        const c = this.toNum(item.cgst_amount);
        const s = this.toNum(item.sgst_amount);
        const i = this.toNum(item.igst_amount);
        const ce = this.toNum(item.cess_amount);

        taxableAmount += ta;
        cgst += c;
        sgst += s;
        igst += i;
        cess += ce;

        const rate = this.toNum(item.igst_rate) || (this.toNum(item.cgst_rate) + this.toNum(item.sgst_rate));
        const existing = rateMap.get(rate) || {
          rate,
          taxable_amount: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          cess: 0,
          total_tax: 0,
        };
        existing.taxable_amount += ta;
        existing.cgst += c;
        existing.sgst += s;
        existing.igst += i;
        existing.cess += ce;
        existing.total_tax += c + s + i + ce;
        rateMap.set(rate, existing);
      }
    }

    const rateWise = Array.from(rateMap.values()).map((r) => ({
      ...r,
      taxable_amount: this.round(r.taxable_amount),
      cgst: this.round(r.cgst),
      sgst: this.round(r.sgst),
      igst: this.round(r.igst),
      cess: this.round(r.cess),
      total_tax: this.round(r.total_tax),
    }));

    return {
      taxableAmount: this.round(taxableAmount),
      cgst: this.round(cgst),
      sgst: this.round(sgst),
      igst: this.round(igst),
      cess: this.round(cess),
      totalTax: this.round(cgst + sgst + igst + cess),
      rateWise,
    };
  }

  /**
   * Group invoice items by GST rate for portal export.
   */
  private groupItemsByRate(items: any[]): Array<{
    rate: number;
    taxable_amount: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
  }> {
    const rateMap = new Map<number, { rate: number; taxable_amount: number; igst: number; cgst: number; sgst: number; cess: number }>();

    for (const item of items) {
      const rate = this.toNum(item.igst_rate) || (this.toNum(item.cgst_rate) + this.toNum(item.sgst_rate));
      const existing = rateMap.get(rate) || { rate, taxable_amount: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
      existing.taxable_amount += this.toNum(item.taxable_amount);
      existing.igst += this.toNum(item.igst_amount);
      existing.cgst += this.toNum(item.cgst_amount);
      existing.sgst += this.toNum(item.sgst_amount);
      existing.cess += this.toNum(item.cess_amount);
      rateMap.set(rate, existing);
    }

    return Array.from(rateMap.values()).map((r) => ({
      rate: r.rate,
      taxable_amount: this.round(r.taxable_amount),
      igst: this.round(r.igst),
      cgst: this.round(r.cgst),
      sgst: this.round(r.sgst),
      cess: this.round(r.cess),
    }));
  }

  /**
   * Accumulate HSN-wise summary for GSTR-1 export.
   */
  private accumulateHSN(items: any[], hsnMap: Map<string, any>, startNum: number) {
    for (const item of items) {
      const hsnCode = item.hsn_code || item.product?.hsn_code || 'NA';
      const desc = item.description || item.product?.name || '';
      const uqc = this.mapUnitToUQC(item.unit || item.product?.unit || 'pcs');
      const qty = this.toNum(item.quantity);

      const existing = hsnMap.get(hsnCode);
      if (existing) {
        existing.qty += qty;
        existing.txval += this.toNum(item.taxable_amount);
        existing.iamt += this.toNum(item.igst_amount);
        existing.camt += this.toNum(item.cgst_amount);
        existing.samt += this.toNum(item.sgst_amount);
        existing.csamt += this.toNum(item.cess_amount);
      } else {
        hsnMap.set(hsnCode, {
          _num: hsnMap.size + 1,
          hsn_sc: hsnCode,
          desc: desc.substring(0, 30),
          uqc,
          qty,
          txval: this.toNum(item.taxable_amount),
          iamt: this.toNum(item.igst_amount),
          camt: this.toNum(item.cgst_amount),
          samt: this.toNum(item.sgst_amount),
          csamt: this.toNum(item.cess_amount),
        });
      }
    }
  }

  /**
   * Build document-issued summary for GSTR-1.
   */
  private buildDocIssueSummary(invoices: any[], creditNotes: any[]): GSTR1JsonDocIssue | null {
    if (invoices.length === 0 && creditNotes.length === 0) return null;

    const docs: Array<{
      doc_num: number;
      doc_typ: string;
      docs: Array<{ num: number; from: string; to: string; totnum: number; cancel: number; net_issue: number }>;
    }> = [];

    if (invoices.length > 0) {
      const sorted = [...invoices].sort((a, b) => a.invoice_number.localeCompare(b.invoice_number));
      const cancelledCount = invoices.filter((i) => i.status === 'cancelled').length;
      docs.push({
        doc_num: 1,
        doc_typ: 'Invoices for outward supply',
        docs: [
          {
            num: 1,
            from: sorted[0].invoice_number,
            to: sorted[sorted.length - 1].invoice_number,
            totnum: sorted.length,
            cancel: cancelledCount,
            net_issue: sorted.length - cancelledCount,
          },
        ],
      });
    }

    if (creditNotes.length > 0) {
      const sorted = [...creditNotes].sort((a, b) => a.invoice_number.localeCompare(b.invoice_number));
      const cancelledCount = creditNotes.filter((i) => i.status === 'cancelled').length;
      docs.push({
        doc_num: 2,
        doc_typ: 'Credit Note',
        docs: [
          {
            num: 1,
            from: sorted[0].invoice_number,
            to: sorted[sorted.length - 1].invoice_number,
            totnum: sorted.length,
            cancel: cancelledCount,
            net_issue: sorted.length - cancelledCount,
          },
        ],
      });
    }

    return { doc_det: docs };
  }

  /**
   * Map unit to UQC (Unit Quantity Code) used by GST portal.
   */
  private mapUnitToUQC(unit: string): string {
    const uqcMap: Record<string, string> = {
      pcs: 'PCS-PIECES',
      nos: 'NOS-NUMBERS',
      kgs: 'KGS-KILOGRAMS',
      kg: 'KGS-KILOGRAMS',
      ltrs: 'LTR-LITRES',
      ltr: 'LTR-LITRES',
      mtr: 'MTR-METRES',
      mtrs: 'MTR-METRES',
      sqm: 'SQM-SQUARE METRES',
      sqf: 'SQF-SQUARE FEET',
      box: 'BOX-BOX',
      bags: 'BAG-BAGS',
      bag: 'BAG-BAGS',
      ton: 'TON-TONNES',
      tonnes: 'TON-TONNES',
      hrs: 'HRS-HOURS',
      hour: 'HRS-HOURS',
      sets: 'SET-SETS',
      set: 'SET-SETS',
      pair: 'PAR-PAIRS',
      pairs: 'PAR-PAIRS',
    };
    return uqcMap[unit.toLowerCase()] || 'OTH-OTHERS';
  }

  /**
   * Format date as DD/MM/YYYY for GST portal.
   */
  private formatDateDDMMYYYY(date: Date): string {
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private toNum(val: any): number {
    if (val === null || val === undefined) return 0;
    const n = typeof val === 'number' ? val : Number(val);
    return isNaN(n) ? 0 : n;
  }

  private round(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}
