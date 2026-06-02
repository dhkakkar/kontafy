import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { OrgId } from '../common/decorators/org-id.decorator';
import { EInvoiceService } from './einvoice.service';
import { EwayBillService } from './eway-bill.service';
import { GspService } from './gsp.service';
import {
  BulkGenerateEInvoiceDto,
  CancelEInvoiceDto,
  ListEInvoiceQueryDto,
  GenerateEwayBillDto,
  ExtendEwayBillDto,
  CancelEwayBillDto,
  ListEwayBillQueryDto,
  UpdateGspSettingsDto,
} from './dto/einvoice.dto';

@ApiTags('E-Invoice')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller()
export class EInvoiceController {
  constructor(
    private readonly einvoiceService: EInvoiceService,
    private readonly ewayBillService: EwayBillService,
    private readonly gspService: GspService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // E-Invoice Endpoints
  // ═══════════════════════════════════════════════════════════════

  @Post('einvoice/generate/:invoiceId')
  @ApiOperation({
    summary: 'Generate e-invoice for a single invoice',
    description:
      'Submits the supplied invoice to the GST e-invoice portal via the configured GSP and stores the returned IRN, ack number, and signed QR code on the invoice. Idempotent — calling again on an already-registered invoice returns the existing IRN without a fresh submission.',
  })
  async generate(
    @OrgId() orgId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.einvoiceService.generate(orgId, invoiceId);
  }

  @Post('einvoice/bulk-generate')
  @ApiOperation({
    summary: 'Bulk generate e-invoices via background queue',
    description:
      'Enqueues a list of invoice ids for asynchronous e-invoice generation. Returns immediately with a queue acknowledgement; track per-invoice progress via `GET /einvoice/status/:invoiceId` or the bulk dashboard. Use this whenever the caller has more than a handful of invoices to register.',
  })
  async bulkGenerate(
    @OrgId() orgId: string,
    @Body() dto: BulkGenerateEInvoiceDto,
  ) {
    return this.einvoiceService.bulkGenerate(orgId, dto.invoice_ids);
  }

  @Get('einvoice/status/:invoiceId')
  @ApiOperation({
    summary: 'Get e-invoice status for an invoice',
    description:
      'Returns the current e-invoice state (pending, generated, cancelled, failed) along with the IRN, ack details, signed QR, and any portal error text. Use this to poll progress after a bulk generation run.',
  })
  async getStatus(
    @OrgId() orgId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.einvoiceService.getStatus(orgId, invoiceId);
  }

  @Post('einvoice/cancel/:invoiceId')
  @ApiOperation({
    summary: 'Cancel an e-invoice (within 24h window)',
    description:
      'Cancels a previously generated e-invoice with the GST portal. The portal enforces a 24-hour window from IRN generation — cancellations after that will be rejected. `reason` is a numeric code (1: duplicate, 2: data entry mistake, etc.) and `remarks` provides free-text justification.',
  })
  async cancel(
    @OrgId() orgId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CancelEInvoiceDto,
  ) {
    return this.einvoiceService.cancel(orgId, invoiceId, dto.reason, dto.remarks);
  }

  @Get('einvoice/list')
  @ApiOperation({
    summary: 'List e-invoices with filters',
    description:
      'Returns a paginated list of invoices that have an e-invoice attempt on record. Filters: `status` (pending, generated, cancelled, failed), `from` / `to` date range, and free-text `search` over IRN, invoice number, or customer name.',
  })
  async list(
    @OrgId() orgId: string,
    @Query() query: ListEInvoiceQueryDto,
  ) {
    return this.einvoiceService.list(orgId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      from: query.from,
      to: query.to,
      search: query.search,
    });
  }

  @Get('einvoice/dashboard')
  @ApiOperation({
    summary: 'E-Invoice dashboard stats',
    description:
      'Returns headline counts for the e-invoice dashboard — total generated, pending, cancelled, failed, plus the daily generation trend. Used as the landing card on the e-invoicing section.',
  })
  async dashboard(@OrgId() orgId: string) {
    return this.einvoiceService.getDashboardStats(orgId);
  }

  // ═══════════════════════════════════════════════════════════════
  // E-Way Bill Endpoints
  // ═══════════════════════════════════════════════════════════════

  @Post('eway-bill/generate/:invoiceId')
  @ApiOperation({
    summary: 'Generate e-way bill for an invoice',
    description:
      'Submits an e-way bill request for the supplied invoice (transport mode, vehicle, dispatch / supply addresses come from the body). Returns the EWB number and validity. Required for inter-state movement of goods above the configured value threshold.',
  })
  async generateEwayBill(
    @OrgId() orgId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: GenerateEwayBillDto,
  ) {
    return this.ewayBillService.generate(orgId, invoiceId, dto);
  }

  @Get('eway-bill/status/:invoiceId')
  @ApiOperation({
    summary: 'Get e-way bill status for an invoice',
    description:
      'Returns the e-way bill number, validity, current status, and any portal error for the invoice. Use to confirm the EWB is active before goods leave the warehouse.',
  })
  async getEwayBillStatus(
    @OrgId() orgId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.ewayBillService.getStatus(orgId, invoiceId);
  }

  @Patch('eway-bill/:id/extend')
  @ApiOperation({
    summary: 'Extend e-way bill validity',
    description:
      'Extends an existing e-way bill before it expires. Caller supplies the new validity hours, transport reason, and current vehicle location. Can only be invoked in the eligible window per the GST portal rules.',
  })
  async extendEwayBill(
    @OrgId() orgId: string,
    @Param('id') invoiceId: string,
    @Body() dto: ExtendEwayBillDto,
  ) {
    return this.ewayBillService.extend(orgId, invoiceId, dto);
  }

  @Post('eway-bill/cancel/:id')
  @ApiOperation({
    summary: 'Cancel an e-way bill',
    description:
      'Cancels an active e-way bill with the GST portal. `reason` is the portal-defined numeric code and `remarks` carries free-text explanation. Cancellations are only accepted within 24 hours of generation and before the goods have been verified in transit.',
  })
  async cancelEwayBill(
    @OrgId() orgId: string,
    @Param('id') invoiceId: string,
    @Body() dto: CancelEwayBillDto,
  ) {
    return this.ewayBillService.cancel(orgId, invoiceId, dto.reason, dto.remarks);
  }

  @Get('eway-bill/list')
  @ApiOperation({
    summary: 'List e-way bills with filters',
    description:
      'Returns a paginated list of e-way bills attached to the org\'s invoices, filterable by `status`, `from` / `to` generation dates, and free-text `search` over EWB number / invoice number / customer.',
  })
  async listEwayBills(
    @OrgId() orgId: string,
    @Query() query: ListEwayBillQueryDto,
  ) {
    return this.ewayBillService.list(orgId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      from: query.from,
      to: query.to,
      search: query.search,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // GSP Settings
  // ═══════════════════════════════════════════════════════════════

  @Get('einvoice/settings')
  @ApiOperation({
    summary: 'Get e-invoice / GSP settings',
    description:
      'Returns the org\'s GST Suvidha Provider configuration: provider name, GSTIN, authentication mode, and feature toggles. Sensitive credentials are redacted in the response.',
  })
  async getSettings(@OrgId() orgId: string) {
    return this.ewayBillService.getSettings(orgId);
  }

  @Patch('einvoice/settings')
  @ApiOperation({
    summary: 'Update e-invoice / GSP settings',
    description:
      'Updates the GSP credentials and feature flags used by the e-invoice / e-way bill flows. Credentials are encrypted at rest. Changes take effect immediately on the next generation request.',
  })
  async updateSettings(
    @OrgId() orgId: string,
    @Body() dto: UpdateGspSettingsDto,
  ) {
    return this.ewayBillService.updateSettings(orgId, dto);
  }
}
