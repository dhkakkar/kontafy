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
  @ApiOperation({ summary: 'Generate e-invoice for a single invoice' })
  async generate(
    @OrgId() orgId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.einvoiceService.generate(orgId, invoiceId);
  }

  @Post('einvoice/bulk-generate')
  @ApiOperation({ summary: 'Bulk generate e-invoices via background queue' })
  async bulkGenerate(
    @OrgId() orgId: string,
    @Body() dto: BulkGenerateEInvoiceDto,
  ) {
    return this.einvoiceService.bulkGenerate(orgId, dto.invoice_ids);
  }

  @Get('einvoice/status/:invoiceId')
  @ApiOperation({ summary: 'Get e-invoice status for an invoice' })
  async getStatus(
    @OrgId() orgId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.einvoiceService.getStatus(orgId, invoiceId);
  }

  @Post('einvoice/cancel/:invoiceId')
  @ApiOperation({ summary: 'Cancel an e-invoice (within 24h window)' })
  async cancel(
    @OrgId() orgId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CancelEInvoiceDto,
  ) {
    return this.einvoiceService.cancel(orgId, invoiceId, dto.reason, dto.remarks);
  }

  @Get('einvoice/list')
  @ApiOperation({ summary: 'List e-invoices with filters' })
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
  @ApiOperation({ summary: 'E-Invoice dashboard stats' })
  async dashboard(@OrgId() orgId: string) {
    return this.einvoiceService.getDashboardStats(orgId);
  }

  // ═══════════════════════════════════════════════════════════════
  // E-Way Bill Endpoints
  // ═══════════════════════════════════════════════════════════════

  @Post('eway-bill/generate/:invoiceId')
  @ApiOperation({ summary: 'Generate e-way bill for an invoice' })
  async generateEwayBill(
    @OrgId() orgId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: GenerateEwayBillDto,
  ) {
    return this.ewayBillService.generate(orgId, invoiceId, dto);
  }

  @Get('eway-bill/status/:invoiceId')
  @ApiOperation({ summary: 'Get e-way bill status for an invoice' })
  async getEwayBillStatus(
    @OrgId() orgId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.ewayBillService.getStatus(orgId, invoiceId);
  }

  @Patch('eway-bill/:id/extend')
  @ApiOperation({ summary: 'Extend e-way bill validity' })
  async extendEwayBill(
    @OrgId() orgId: string,
    @Param('id') invoiceId: string,
    @Body() dto: ExtendEwayBillDto,
  ) {
    return this.ewayBillService.extend(orgId, invoiceId, dto);
  }

  @Post('eway-bill/cancel/:id')
  @ApiOperation({ summary: 'Cancel an e-way bill' })
  async cancelEwayBill(
    @OrgId() orgId: string,
    @Param('id') invoiceId: string,
    @Body() dto: CancelEwayBillDto,
  ) {
    return this.ewayBillService.cancel(orgId, invoiceId, dto.reason, dto.remarks);
  }

  @Get('eway-bill/list')
  @ApiOperation({ summary: 'List e-way bills with filters' })
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
  @ApiOperation({ summary: 'Get e-invoice / GSP settings' })
  async getSettings(@OrgId() orgId: string) {
    return this.ewayBillService.getSettings(orgId);
  }

  @Patch('einvoice/settings')
  @ApiOperation({ summary: 'Update e-invoice / GSP settings' })
  async updateSettings(
    @OrgId() orgId: string,
    @Body() dto: UpdateGspSettingsDto,
  ) {
    return this.ewayBillService.updateSettings(orgId, dto);
  }
}
