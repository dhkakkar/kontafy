import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { GspService } from './gsp.service';
import {
  NICEInvoicePayload,
  NICItemDetails,
  UNIT_CODE_MAP,
  EInvoiceRecord,
} from './dto/einvoice.dto';

// ═══════════════════════════════════════════════════════════════
// E-Invoice Service
// Builds NIC-compliant e-invoice payloads, manages IRN lifecycle
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class EInvoiceService {
  private readonly logger = new Logger(EInvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gspService: GspService,
    @InjectQueue('einvoice') private readonly einvoiceQueue: Queue,
  ) {}

  // ─── Generate E-Invoice ─────────────────────────────────────

  async generate(orgId: string, invoiceId: string): Promise<EInvoiceRecord> {
    // 1. Fetch invoice with all related data
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      include: {
        items: { include: { product: true } },
        contact: true,
        organization: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'draft') {
      throw new BadRequestException('Cannot generate e-invoice for draft invoices. Please finalize first.');
    }

    if (invoice.e_invoice_irn) {
      throw new BadRequestException(
        `E-Invoice already generated for this invoice. IRN: ${invoice.e_invoice_irn}`,
      );
    }

    if (!invoice.contact?.gstin) {
      throw new BadRequestException(
        'Customer GSTIN is required for B2B e-invoice generation.',
      );
    }

    if (!invoice.organization.gstin) {
      throw new BadRequestException(
        'Organization GSTIN is required. Please configure it in Settings.',
      );
    }

    // 2. Build NIC e-invoice JSON payload
    const payload = this.buildEInvoicePayload(invoice);

    // 3. Submit to NIC via GSP
    try {
      const response = await this.gspService.generateEInvoice(orgId, payload);

      // 4. Update invoice with IRN
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          e_invoice_irn: response.Irn,
          e_invoice_ack: String(response.AckNo),
        },
      });

      // 5. Build record to return
      const record: EInvoiceRecord = {
        id: invoiceId,
        org_id: orgId,
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        irn: response.Irn,
        ack_no: String(response.AckNo),
        ack_date: response.AckDt,
        signed_invoice: response.SignedInvoice,
        signed_qr_code: response.SignedQRCode,
        qr_code_image: null, // Will be generated separately
        status: 'generated',
        error_message: null,
        cancel_reason: null,
        cancel_remarks: null,
        cancelled_at: null,
        payload,
        response,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.logger.log(
        `E-Invoice generated: IRN ${response.Irn} for invoice ${invoice.invoice_number}`,
      );

      return record;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `E-Invoice generation failed for ${invoice.invoice_number}: ${errorMessage}`,
      );

      // Return failed record
      return {
        id: invoiceId,
        org_id: orgId,
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        irn: null,
        ack_no: null,
        ack_date: null,
        signed_invoice: null,
        signed_qr_code: null,
        qr_code_image: null,
        status: 'failed',
        error_message: errorMessage,
        cancel_reason: null,
        cancel_remarks: null,
        cancelled_at: null,
        payload,
        response: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  // ─── Bulk Generate (via queue) ─────────────────────────────

  async bulkGenerate(orgId: string, invoiceIds: string[]) {
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await this.einvoiceQueue.add(
      'bulk-generate',
      { orgId, invoiceIds, batchId },
      {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Bulk e-invoice job queued: batch ${batchId}, ${invoiceIds.length} invoices`,
    );

    return {
      batch_id: batchId,
      invoice_count: invoiceIds.length,
      status: 'queued',
      message: `${invoiceIds.length} invoices queued for e-invoice generation.`,
    };
  }

  // ─── Get E-Invoice Status ──────────────────────────────────

  async getStatus(orgId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      select: {
        id: true,
        invoice_number: true,
        e_invoice_irn: true,
        e_invoice_ack: true,
        eway_bill_no: true,
        status: true,
        total: true,
        date: true,
        contact: {
          select: { name: true, gstin: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    let nicStatus = null;

    // If IRN exists, optionally fetch live status from NIC
    if (invoice.e_invoice_irn) {
      try {
        nicStatus = await this.gspService.getEInvoiceByIrn(orgId, invoice.e_invoice_irn);
      } catch {
        // NIC may be temporarily unavailable — return cached data
        this.logger.warn(
          `Could not fetch live status for IRN ${invoice.e_invoice_irn}, returning cached data`,
        );
      }
    }

    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      irn: invoice.e_invoice_irn,
      ack_no: invoice.e_invoice_ack,
      eway_bill_no: invoice.eway_bill_no,
      invoice_status: invoice.status,
      einvoice_status: invoice.e_invoice_irn ? 'generated' : 'pending',
      total: invoice.total,
      date: invoice.date,
      contact_name: invoice.contact?.name || null,
      contact_gstin: invoice.contact?.gstin || null,
      nic_status: nicStatus,
    };
  }

  // ─── Cancel E-Invoice ──────────────────────────────────────

  async cancel(orgId: string, invoiceId: string, reason: string, remarks: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      select: {
        id: true,
        invoice_number: true,
        e_invoice_irn: true,
        date: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.e_invoice_irn) {
      throw new BadRequestException('No e-invoice exists for this invoice.');
    }

    // Check 24-hour cancellation window
    const invoiceDate = new Date(invoice.date);
    const now = new Date();
    const hoursDiff = (now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      throw new BadRequestException(
        'E-Invoice can only be cancelled within 24 hours of generation.',
      );
    }

    const response = await this.gspService.cancelEInvoice(
      orgId,
      invoice.e_invoice_irn,
      reason,
      remarks,
    );

    // Clear IRN from invoice
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        e_invoice_irn: null,
        e_invoice_ack: null,
      },
    });

    this.logger.log(
      `E-Invoice cancelled: IRN ${invoice.e_invoice_irn} for invoice ${invoice.invoice_number}`,
    );

    return {
      invoice_id: invoiceId,
      invoice_number: invoice.invoice_number,
      irn: invoice.e_invoice_irn,
      cancel_date: response.CancelDate,
      reason,
      remarks,
      status: 'cancelled',
    };
  }

  // ─── List E-Invoices ───────────────────────────────────────

  async list(
    orgId: string,
    filters: {
      page: number;
      limit: number;
      status?: string;
      from?: string;
      to?: string;
      search?: string;
    },
  ) {
    const { status, from, to, search } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { org_id: orgId };

    // Filter by e-invoice status
    if (status === 'generated') {
      where.e_invoice_irn = { not: null };
    } else if (status === 'pending') {
      where.e_invoice_irn = null;
      where.status = { not: 'draft' };
      where.contact = { gstin: { not: null } };
    }

    // Date range
    if (from) {
      where.date = { ...where.date, gte: new Date(from) };
    }
    if (to) {
      where.date = { ...where.date, lte: new Date(to) };
    }

    // Search
    if (search) {
      where.OR = [
        { invoice_number: { contains: search, mode: 'insensitive' } },
        { e_invoice_irn: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        select: {
          id: true,
          invoice_number: true,
          type: true,
          status: true,
          date: true,
          total: true,
          e_invoice_irn: true,
          e_invoice_ack: true,
          eway_bill_no: true,
          contact: {
            select: { name: true, gstin: true },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const data = invoices.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      type: inv.type,
      invoice_status: inv.status,
      einvoice_status: inv.e_invoice_irn ? 'generated' : 'pending',
      date: inv.date,
      total: inv.total,
      irn: inv.e_invoice_irn,
      ack_no: inv.e_invoice_ack,
      eway_bill_no: inv.eway_bill_no,
      contact_name: inv.contact?.name || null,
      contact_gstin: inv.contact?.gstin || null,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Build NIC E-Invoice Payload ───────────────────────────

  private buildEInvoicePayload(invoice: any): NICEInvoicePayload {
    const org = invoice.organization;
    const contact = invoice.contact;
    const items = invoice.items;
    const orgAddress = (org.address as Record<string, any>) || {};
    const contactBilling = (contact.billing_address as Record<string, any>) || {};

    // Determine supply type
    const sellerState = org.gstin?.substring(0, 2) || '';
    const buyerState = contact.gstin?.substring(0, 2) || invoice.place_of_supply || '';
    const isIGST = invoice.is_igst || sellerState !== buyerState;

    // Document type
    let docType: 'INV' | 'CRN' | 'DBN' = 'INV';
    if (invoice.type === 'credit_note') docType = 'CRN';
    if (invoice.type === 'debit_note') docType = 'DBN';

    // Format date as DD/MM/YYYY
    const invoiceDate = new Date(invoice.date);
    const formattedDate = `${String(invoiceDate.getDate()).padStart(2, '0')}/${String(invoiceDate.getMonth() + 1).padStart(2, '0')}/${invoiceDate.getFullYear()}`;

    // Build item list
    const itemList: NICItemDetails[] = items.map((item: any, index: number) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const discountPct = Number(item.discount_pct) || 0;
      const totAmt = qty * rate;
      const discount = totAmt * (discountPct / 100);
      const assAmt = totAmt - discount;
      const gstRate = isIGST
        ? Number(item.igst_rate) || 0
        : (Number(item.cgst_rate) || 0) + (Number(item.sgst_rate) || 0);
      const igstAmt = isIGST ? Number(item.igst_amount) || 0 : 0;
      const cgstAmt = isIGST ? 0 : Number(item.cgst_amount) || 0;
      const sgstAmt = isIGST ? 0 : Number(item.sgst_amount) || 0;
      const cessAmt = Number(item.cess_amount) || 0;
      const totalItemVal = assAmt + igstAmt + cgstAmt + sgstAmt + cessAmt;

      const isService =
        item.product?.type === 'service' ||
        (item.hsn_code && item.hsn_code.startsWith('99'));

      return {
        SlNo: String(index + 1),
        PrdDesc: item.description || item.product?.name || '',
        IsServc: isService ? 'Y' : 'N',
        HsnCd: item.hsn_code || item.product?.hsn_code || '0000',
        Qty: qty,
        Unit: UNIT_CODE_MAP[(item.unit || 'pcs').toLowerCase()] || 'OTH',
        UnitPrice: this.round(rate),
        TotAmt: this.round(totAmt),
        Discount: this.round(discount),
        AssAmt: this.round(assAmt),
        GstRt: this.round(gstRate),
        IgstAmt: this.round(igstAmt),
        CgstAmt: this.round(cgstAmt),
        SgstAmt: this.round(sgstAmt),
        CesRt: Number(item.cess_rate) || 0,
        CesAmt: this.round(cessAmt),
        TotItemVal: this.round(totalItemVal),
      } as NICItemDetails;
    });

    // Calculate value totals
    const assVal = itemList.reduce((sum, i) => sum + i.AssAmt, 0);
    const cgstVal = itemList.reduce((sum, i) => sum + i.CgstAmt, 0);
    const sgstVal = itemList.reduce((sum, i) => sum + i.SgstAmt, 0);
    const igstVal = itemList.reduce((sum, i) => sum + i.IgstAmt, 0);
    const cesVal = itemList.reduce((sum, i) => sum + (i.CesAmt || 0), 0);
    const totalDiscount = itemList.reduce((sum, i) => sum + i.Discount, 0);
    const totInvVal = Number(invoice.total) || assVal + cgstVal + sgstVal + igstVal + cesVal;
    const rndOff = this.round(totInvVal - Math.round(totInvVal));

    const payload: NICEInvoicePayload = {
      Version: '1.1',
      TranDtls: {
        TaxSch: 'GST',
        SupTyp: 'B2B',
        RegRev: 'N',
        EcmGstin: null,
        IgstOnIntra: isIGST && sellerState === buyerState ? 'Y' : 'N',
      },
      DocDtls: {
        Typ: docType,
        No: invoice.invoice_number,
        Dt: formattedDate,
      },
      SellerDtls: {
        Gstin: org.gstin,
        LglNm: org.legal_name || org.name,
        TrdNm: org.name,
        Addr1: orgAddress.line1 || orgAddress.address || 'N/A',
        Addr2: orgAddress.line2 || undefined,
        Loc: orgAddress.city || 'N/A',
        Pin: Number(orgAddress.pincode) || 100001,
        Stcd: sellerState,
        Ph: org.phone || undefined,
        Em: org.email || undefined,
      },
      BuyerDtls: {
        Gstin: contact.gstin,
        LglNm: contact.company_name || contact.name,
        TrdNm: contact.name,
        Addr1: contactBilling.line1 || contactBilling.address || 'N/A',
        Addr2: contactBilling.line2 || undefined,
        Loc: contactBilling.city || 'N/A',
        Pin: Number(contactBilling.pincode) || 100001,
        Stcd: buyerState,
        Ph: contact.phone || undefined,
        Em: contact.email || undefined,
      },
      ItemList: itemList,
      ValDtls: {
        AssVal: this.round(assVal),
        CgstVal: this.round(cgstVal),
        SgstVal: this.round(sgstVal),
        IgstVal: this.round(igstVal),
        CesVal: this.round(cesVal),
        StCesVal: 0,
        Discount: this.round(totalDiscount),
        OthChrg: 0,
        RndOffAmt: this.round(rndOff),
        TotInvVal: this.round(totInvVal),
      },
    };

    // Add shipping details if different from billing
    const contactShipping = (contact.shipping_address as Record<string, any>) || {};
    if (contactShipping.line1 && contactShipping.line1 !== contactBilling.line1) {
      payload.ShipDtls = {
        Gstin: contact.gstin,
        LglNm: contact.company_name || contact.name,
        TrdNm: contact.name,
        Addr1: contactShipping.line1 || 'N/A',
        Addr2: contactShipping.line2 || undefined,
        Loc: contactShipping.city || 'N/A',
        Pin: Number(contactShipping.pincode) || 100001,
        Stcd: contactShipping.state_code || buyerState,
      };
    }

    return payload;
  }

  // ─── Dashboard Stats ───────────────────────────────────────

  async getDashboardStats(orgId: string) {
    const [totalInvoices, withIrn, withEway] = await Promise.all([
      this.prisma.invoice.count({
        where: {
          org_id: orgId,
          status: { not: 'draft' },
          contact: { gstin: { not: null } },
        },
      }),
      this.prisma.invoice.count({
        where: { org_id: orgId, e_invoice_irn: { not: null } },
      }),
      this.prisma.invoice.count({
        where: { org_id: orgId, eway_bill_no: { not: null } },
      }),
    ]);

    const pendingCount = totalInvoices - withIrn;

    // Get recent failures (invoices that should have e-invoice but don't)
    const recentInvoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        status: { not: 'draft' },
        contact: { gstin: { not: null } },
        e_invoice_irn: null,
      },
      orderBy: { date: 'desc' },
      take: 5,
      select: {
        id: true,
        invoice_number: true,
        total: true,
        date: true,
        contact: { select: { name: true } },
      },
    });

    return {
      total_eligible: totalInvoices,
      generated: withIrn,
      pending: pendingCount,
      eway_bills_generated: withEway,
      recent_pending: recentInvoices.map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        total: inv.total,
        date: inv.date,
        contact_name: inv.contact?.name || 'N/A',
      })),
    };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private round(value: number, decimals = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
}
