import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GspService } from './gsp.service';
import {
  GenerateEwayBillDto,
  ExtendEwayBillDto,
  UpdateGspSettingsDto,
  EwayBillRecord,
} from './dto/einvoice.dto';

// ═══════════════════════════════════════════════════════════════
// E-Way Bill Service
// Handles e-way bill generation, auto-trigger for >50K,
// validity calculations, extend & cancel
// ═══════════════════════════════════════════════════════════════

const EWAY_BILL_THRESHOLD = 50000; // INR

// Distance-based validity (km -> days)
function getValidityDays(distanceKm: number): number {
  if (distanceKm <= 200) return 1;
  return 1 + Math.ceil((distanceKm - 200) / 200);
}

@Injectable()
export class EwayBillService {
  private readonly logger = new Logger(EwayBillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gspService: GspService,
  ) {}

  // ─── Generate E-Way Bill ──────────────────────────────────────

  async generate(
    orgId: string,
    invoiceId: string,
    dto: GenerateEwayBillDto,
  ): Promise<EwayBillRecord> {
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
      throw new BadRequestException(
        'Cannot generate e-way bill for draft invoices.',
      );
    }

    if (invoice.eway_bill_no) {
      throw new BadRequestException(
        `E-Way Bill already exists: ${invoice.eway_bill_no}`,
      );
    }

    if (!invoice.e_invoice_irn && !invoice.organization.gstin) {
      throw new BadRequestException(
        'Organization GSTIN is required for e-way bill generation.',
      );
    }

    // Validate transport details are present
    if (!dto.transport) {
      throw new BadRequestException(
        'Transport details are required for e-way bill generation.',
      );
    }

    let payload: any;

    try {
      // Build the e-way bill payload (inside try-catch to handle any data issues)
      payload = this.buildEwayBillPayload(invoice, dto);

      const response = await this.gspService.generateEwayBill(orgId, payload);

      // Save e-way bill number on invoice
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          eway_bill_no: String(response.EwbNo),
        },
      });

      const validityDays = getValidityDays(dto.distance);
      const validTill =
        response.EwbValidTill ||
        new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

      this.logger.log(
        `E-Way Bill generated: ${response.EwbNo} for invoice ${invoice.invoice_number}`,
      );

      return {
        id: invoiceId,
        org_id: orgId,
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        eway_bill_no: String(response.EwbNo),
        eway_bill_date: response.EwbDt,
        valid_till: validTill,
        status: 'active',
        distance: dto.distance,
        transport_mode: dto.transport?.transport_mode || null,
        vehicle_no: dto.transport?.vehicle_no || null,
        transporter_id: dto.transport?.transporter_id || null,
        transporter_name: dto.transport?.transporter_name || null,
        error_message: null,
        cancel_reason: null,
        cancel_remarks: null,
        cancelled_at: null,
        payload,
        response,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `E-Way Bill generation failed for ${invoice.invoice_number}: ${errorMessage}`,
      );

      // Re-throw HTTP exceptions (BadRequest, ServiceUnavailable, etc.)
      // so the client gets a proper error response instead of a silent 200
      if (error instanceof BadRequestException) {
        throw error;
      }

      return {
        id: invoiceId,
        org_id: orgId,
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        eway_bill_no: null,
        eway_bill_date: null,
        valid_till: null,
        status: 'pending',
        distance: dto.distance,
        transport_mode: dto.transport?.transport_mode || null,
        vehicle_no: dto.transport?.vehicle_no || null,
        transporter_id: dto.transport?.transporter_id || null,
        transporter_name: dto.transport?.transporter_name || null,
        error_message: errorMessage,
        cancel_reason: null,
        cancel_remarks: null,
        cancelled_at: null,
        payload: payload || null,
        response: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  // ─── Get E-Way Bill Status ─────────────────────────────────────

  async getStatus(orgId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      select: {
        id: true,
        invoice_number: true,
        eway_bill_no: true,
        e_invoice_irn: true,
        total: true,
        date: true,
        status: true,
        contact: {
          select: { name: true, gstin: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const total = Number(invoice.total) || 0;

    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      eway_bill_no: invoice.eway_bill_no,
      irn: invoice.e_invoice_irn,
      invoice_status: invoice.status,
      eway_status: invoice.eway_bill_no ? 'active' : 'pending',
      total,
      requires_eway_bill: total >= EWAY_BILL_THRESHOLD,
      date: invoice.date,
      contact_name: invoice.contact?.name || null,
      contact_gstin: invoice.contact?.gstin || null,
    };
  }

  // ─── Extend E-Way Bill ─────────────────────────────────────────

  async extend(orgId: string, invoiceId: string, dto: ExtendEwayBillDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      select: { id: true, invoice_number: true, eway_bill_no: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.eway_bill_no) {
      throw new BadRequestException('No e-way bill exists for this invoice.');
    }

    const payload = {
      ewbNo: Number(invoice.eway_bill_no),
      vehicleNo: dto.transport?.vehicle_no || '',
      fromPlace: dto.from_place,
      fromState: Number(dto.from_state),
      remainingDistance: dto.remaining_distance,
      transDocNo: dto.transport?.transport_doc_no || '',
      transDocDate: dto.transport?.transport_doc_date || '',
      transMode: dto.transport?.transport_mode || '1',
      extnRsnCode: Number(dto.reason),
      extnRemarks: dto.remarks,
    };

    const response = await this.gspService.extendEwayBill(orgId, payload);

    this.logger.log(
      `E-Way Bill extended: ${invoice.eway_bill_no} for invoice ${invoice.invoice_number}`,
    );

    return {
      invoice_id: invoiceId,
      invoice_number: invoice.invoice_number,
      eway_bill_no: invoice.eway_bill_no,
      extended: true,
      new_valid_till: response?.validUpto || null,
      response,
    };
  }

  // ─── Cancel E-Way Bill ─────────────────────────────────────────

  async cancel(
    orgId: string,
    invoiceId: string,
    reason: string,
    remarks: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, org_id: orgId },
      select: { id: true, invoice_number: true, eway_bill_no: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.eway_bill_no) {
      throw new BadRequestException('No e-way bill exists for this invoice.');
    }

    const response = await this.gspService.cancelEwayBill(
      orgId,
      invoice.eway_bill_no,
      reason,
      remarks,
    );

    // Clear e-way bill number
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { eway_bill_no: null },
    });

    this.logger.log(
      `E-Way Bill cancelled: ${invoice.eway_bill_no} for invoice ${invoice.invoice_number}`,
    );

    return {
      invoice_id: invoiceId,
      invoice_number: invoice.invoice_number,
      eway_bill_no: invoice.eway_bill_no,
      status: 'cancelled',
      reason,
      remarks,
      response,
    };
  }

  // ─── List E-Way Bills ──────────────────────────────────────────

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

    if (status === 'active') {
      where.eway_bill_no = { not: null };
    } else if (status === 'pending') {
      where.eway_bill_no = null;
      where.status = { not: 'draft' };
      where.total = { gte: EWAY_BILL_THRESHOLD };
    }

    if (from) {
      where.date = { ...where.date, gte: new Date(from) };
    }
    if (to) {
      where.date = { ...where.date, lte: new Date(to) };
    }

    if (search) {
      where.OR = [
        { invoice_number: { contains: search, mode: 'insensitive' } },
        { eway_bill_no: { contains: search, mode: 'insensitive' } },
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
          eway_bill_no: true,
          e_invoice_irn: true,
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

    const data = invoices.map((inv) => {
      const invTotal = Number(inv.total) || 0;
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        type: inv.type,
        invoice_status: inv.status,
        eway_status: inv.eway_bill_no ? 'active' : 'pending',
        date: inv.date,
        total: invTotal,
        eway_bill_no: inv.eway_bill_no,
        irn: inv.e_invoice_irn,
        requires_eway_bill: invTotal >= EWAY_BILL_THRESHOLD,
        contact_name: inv.contact?.name || null,
        contact_gstin: inv.contact?.gstin || null,
      };
    });

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

  // ─── Settings ──────────────────────────────────────────────────

  async getSettings(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true, gstin: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const settings = (org.settings as Record<string, any>) || {};
    const einvoiceSettings = settings.einvoice || {};

    return {
      gsp_provider: einvoiceSettings.gsp_provider || 'nic',
      gsp_username: einvoiceSettings.gsp_username || '',
      gsp_password: einvoiceSettings.gsp_password ? '********' : '',
      gsp_client_id: einvoiceSettings.gsp_client_id || '',
      gsp_client_secret: einvoiceSettings.gsp_client_secret ? '********' : '',
      gstin: einvoiceSettings.gstin || org.gstin || '',
      auto_generate: einvoiceSettings.auto_generate || false,
      auto_eway_bill: einvoiceSettings.auto_eway_bill || false,
      eway_bill_threshold: einvoiceSettings.eway_bill_threshold || EWAY_BILL_THRESHOLD,
      sandbox_mode: einvoiceSettings.sandbox_mode !== false,
    };
  }

  async updateSettings(orgId: string, dto: UpdateGspSettingsDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const settings = (org.settings as Record<string, any>) || {};
    const existingEinvoice = settings.einvoice || {};

    // Merge new settings, only overwrite provided fields
    const updatedEinvoice = {
      ...existingEinvoice,
      ...(dto.gsp_provider !== undefined && { gsp_provider: dto.gsp_provider }),
      ...(dto.gsp_username !== undefined && { gsp_username: dto.gsp_username }),
      ...(dto.gsp_password !== undefined && { gsp_password: dto.gsp_password }),
      ...(dto.gsp_client_id !== undefined && { gsp_client_id: dto.gsp_client_id }),
      ...(dto.gsp_client_secret !== undefined && { gsp_client_secret: dto.gsp_client_secret }),
      ...(dto.gstin !== undefined && { gstin: dto.gstin }),
      ...(dto.auto_generate !== undefined && { auto_generate: dto.auto_generate }),
      ...(dto.auto_eway_bill !== undefined && { auto_eway_bill: dto.auto_eway_bill }),
      ...(dto.eway_bill_threshold !== undefined && { eway_bill_threshold: dto.eway_bill_threshold }),
      ...(dto.sandbox_mode !== undefined && { sandbox_mode: dto.sandbox_mode }),
    };

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...settings,
          einvoice: updatedEinvoice,
        },
      },
    });

    // Clear cached tokens when credentials change
    if (dto.gsp_username || dto.gsp_password || dto.gsp_client_id || dto.gsp_client_secret) {
      this.gspService.clearTokenCache(orgId);
    }

    this.logger.log(`E-Invoice settings updated for org ${orgId}`);

    return { message: 'Settings updated successfully' };
  }

  // ─── Auto-trigger check ────────────────────────────────────────

  shouldAutoGenerateEwayBill(invoiceTotal: number): boolean {
    return invoiceTotal >= EWAY_BILL_THRESHOLD;
  }

  // ─── Build E-Way Bill Payload ──────────────────────────────────

  private buildEwayBillPayload(invoice: any, dto: GenerateEwayBillDto) {
    const org = invoice.organization;
    const contact = invoice.contact;
    const orgAddress = (org?.address as Record<string, any>) || {};
    const contactBilling = (contact?.billing_address as Record<string, any>) || {};

    const sellerState = org?.gstin?.substring(0, 2) || '';
    const buyerState = contact?.gstin?.substring(0, 2) || '';

    // Build item list for e-way bill
    const items = invoice.items || [];
    const itemList = items.map((item: any) => {
      const qty = Number(item.quantity) || 0;
      const taxableAmount = Number(item.taxable_amount) || 0;

      return {
        productName: item.description || item.product?.name || '',
        productDesc: item.description || '',
        hsnCode: Number(item.hsn_code || item.product?.hsn_code || '0000'),
        quantity: qty,
        qtyUnit: (item.unit || 'PCS').toUpperCase(),
        cgstRate: Number(item.cgst_rate) || 0,
        sgstRate: Number(item.sgst_rate) || 0,
        igstRate: Number(item.igst_rate) || 0,
        cessRate: Number(item.cess_rate) || 0,
        cessAdvol: 0,
        taxableAmount: Math.round(taxableAmount * 100) / 100,
      };
    });

    // Aggregate tax values from invoice items (these fields exist on items, not invoice)
    const totalCgst = items.reduce((sum: number, item: any) => sum + (Number(item.cgst_amount) || 0), 0);
    const totalSgst = items.reduce((sum: number, item: any) => sum + (Number(item.sgst_amount) || 0), 0);
    const totalIgst = items.reduce((sum: number, item: any) => sum + (Number(item.igst_amount) || 0), 0);
    const totalCess = items.reduce((sum: number, item: any) => sum + (Number(item.cess_amount) || 0), 0);

    const transport = dto.transport || {};

    return {
      supplyType: 'O', // Outward
      subSupplyType: Number(dto.sub_type) || 1,
      docType: 'INV',
      docNo: invoice.invoice_number,
      docDate: this.formatDate(invoice.date),
      fromGstin: org?.gstin || '',
      fromTrdName: org?.name || '',
      fromAddr1: orgAddress.line1 || orgAddress.address || 'N/A',
      fromAddr2: orgAddress.line2 || '',
      fromPlace: orgAddress.city || 'N/A',
      fromPincode: Number(orgAddress.pincode) || 100001,
      fromStateCode: Number(sellerState) || 7,
      toGstin: contact?.gstin || 'URP',
      toTrdName: contact?.name || 'Walk-in Customer',
      toAddr1: contactBilling.line1 || contactBilling.address || 'N/A',
      toAddr2: contactBilling.line2 || '',
      toPlace: contactBilling.city || 'N/A',
      toPincode: Number(contactBilling.pincode) || 100001,
      toStateCode: Number(buyerState) || Number(sellerState) || 7,
      totalValue: Math.round(Number(invoice.subtotal || 0) * 100) / 100,
      cgstValue: Math.round(totalCgst * 100) / 100,
      sgstValue: Math.round(totalSgst * 100) / 100,
      igstValue: Math.round(totalIgst * 100) / 100,
      cessValue: Math.round(totalCess * 100) / 100,
      totInvValue: Math.round(Number(invoice.total || 0) * 100) / 100,
      transporterId: transport.transporter_id || '',
      transporterName: transport.transporter_name || '',
      transDocNo: transport.transport_doc_no || '',
      transDocDate: transport.transport_doc_date || '',
      transMode: transport.transport_mode || '1',
      vehicleNo: transport.vehicle_no || '',
      vehicleType: transport.vehicle_type || 'R',
      transDistance: String(dto.distance || 0),
      itemList,
    };
  }

  private formatDate(date: any): string {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
}
