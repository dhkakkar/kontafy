import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { OrgId } from '../common/decorators/org-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExportService, ExportFormat } from './export.service';
import { ImportService, ImportEntityType } from './import.service';
import { SalesInvoicesImport } from './runners/sales-invoices.import';
import { PurchaseBillsImport } from './runners/purchase-bills.import';
import { PaymentsImport } from './runners/payments.import';
import { ExpensesImport } from './runners/expenses.import';
import { JournalEntriesImport } from './runners/journal-entries.import';

@ApiTags('Data Transfer')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('data-transfer')
export class DataTransferController {
  constructor(
    private readonly exportService: ExportService,
    private readonly importService: ImportService,
    private readonly salesInvoicesImport: SalesInvoicesImport,
    private readonly purchaseBillsImport: PurchaseBillsImport,
    private readonly paymentsImport: PaymentsImport,
    private readonly expensesImport: ExpensesImport,
    private readonly journalEntriesImport: JournalEntriesImport,
  ) {}

  // ─── Export Endpoints ─────────────────────────────────────────

  @Get('export/contacts')
  @ApiOperation({ summary: 'Export contacts as CSV or Excel' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'], description: 'Export format (default: csv)' })
  async exportContacts(
    @OrgId() orgId: string,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ) {
    const exportFormat = this.resolveFormat(format);
    const buffer = await this.exportService.exportContacts(orgId, exportFormat);
    this.sendFileResponse(res, buffer, `contacts.${exportFormat}`, exportFormat);
  }

  @Get('export/invoices')
  @ApiOperation({ summary: 'Export invoices as CSV or Excel' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'] })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  async exportInvoices(
    @OrgId() orgId: string,
    @Query('format') format: string = 'csv',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const exportFormat = this.resolveFormat(format);
    const dateRange = from || to ? { from, to } : undefined;
    const buffer = await this.exportService.exportInvoices(orgId, exportFormat, dateRange);
    this.sendFileResponse(res!, buffer, `invoices.${exportFormat}`, exportFormat);
  }

  @Get('export/products')
  @ApiOperation({ summary: 'Export products as CSV or Excel' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'] })
  async exportProducts(
    @OrgId() orgId: string,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ) {
    const exportFormat = this.resolveFormat(format);
    const buffer = await this.exportService.exportProducts(orgId, exportFormat);
    this.sendFileResponse(res, buffer, `products.${exportFormat}`, exportFormat);
  }

  @Get('export/journal-entries')
  @ApiOperation({ summary: 'Export journal entries as CSV or Excel' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'] })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  async exportJournalEntries(
    @OrgId() orgId: string,
    @Query('format') format: string = 'csv',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const exportFormat = this.resolveFormat(format);
    const dateRange = from || to ? { from, to } : undefined;
    const buffer = await this.exportService.exportJournalEntries(orgId, exportFormat, dateRange);
    this.sendFileResponse(res!, buffer, `journal_entries.${exportFormat}`, exportFormat);
  }

  @Get('export/chart-of-accounts')
  @ApiOperation({ summary: 'Export chart of accounts as CSV or Excel' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'] })
  async exportChartOfAccounts(
    @OrgId() orgId: string,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ) {
    const exportFormat = this.resolveFormat(format);
    const buffer = await this.exportService.exportChartOfAccounts(orgId, exportFormat);
    this.sendFileResponse(res, buffer, `chart_of_accounts.${exportFormat}`, exportFormat);
  }

  @Get('export/all')
  @ApiOperation({ summary: 'Export all data as ZIP backup' })
  async exportAll(@OrgId() orgId: string, @Res() res: Response) {
    const buffer = await this.exportService.exportAll(orgId);
    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="kontafy_backup_${timestamp}.zip"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  // ─── Import Endpoints ─────────────────────────────────────────

  @Post('import/contacts')
  @ApiOperation({ summary: 'Import contacts from CSV or Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importContacts(
    @OrgId() orgId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.validateUploadedFile(file);
    const format = this.detectFileFormat(file);
    return this.importService.importContacts(orgId, file.buffer, format);
  }

  @Post('import/products')
  @ApiOperation({ summary: 'Import products from CSV or Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importProducts(
    @OrgId() orgId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.validateUploadedFile(file);
    const format = this.detectFileFormat(file);
    return this.importService.importProducts(orgId, file.buffer, format);
  }

  @Post('import/opening-balances')
  @ApiOperation({ summary: 'Import opening balances for accounts' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importOpeningBalances(
    @OrgId() orgId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.validateUploadedFile(file);
    return this.importService.importOpeningBalances(orgId, file.buffer);
  }

  @Post('import/tally')
  @ApiOperation({ summary: 'Import data from Tally XML export' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importTally(
    @OrgId() orgId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.importService.importTallyData(orgId, file.buffer);
  }

  @Post('import/busy')
  @ApiOperation({ summary: 'Import data from Busy accounting CSV export' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importBusy(
    @OrgId() orgId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.importService.importBusyData(orgId, file.buffer);
  }

  // Endpoint uses snake_case to match the EntityType slug used by the
  // frontend ("sales_invoices") — the existing list endpoints
  // (contacts/products) all align this way, so the frontend's URL
  // builder doesn't need a special case.
  @Post('import/sales_invoices')
  @ApiOperation({ summary: 'Bulk-import sales invoices (multi-line CSV/XLSX)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importSalesInvoices(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.validateUploadedFile(file);
    const format = this.detectFileFormat(file);
    const result = await this.salesInvoicesImport.run(
      orgId,
      userId,
      file.buffer,
      format,
    );
    // Match the shape the existing contact/product/OB imports return
    // so the frontend's ImportResult renderer and the global
    // ResponseInterceptor (which passes through objects already
    // tagged with `success`) treat this the same way.
    return {
      success: result.errors.length === 0,
      total: result.total,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors.map((e) => ({
        row: 0,
        field: e.group ? `invoice ${e.group}` : (e.field || ''),
        message: e.message,
      })),
    };
  }

  @Post('import/purchase_bills')
  @ApiOperation({ summary: 'Bulk-import purchase bills (multi-line CSV/XLSX)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importPurchaseBills(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.validateUploadedFile(file);
    const format = this.detectFileFormat(file);
    const result = await this.purchaseBillsImport.run(
      orgId,
      userId,
      file.buffer,
      format,
    );
    return {
      success: result.errors.length === 0,
      total: result.total,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors.map((e) => ({
        row: 0,
        field: e.group ? `bill ${e.group}` : (e.field || ''),
        message: e.message,
      })),
    };
  }

  @Post('import/payments_received')
  @ApiOperation({ summary: 'Bulk-import customer receipts' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importPaymentsReceived(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.runPaymentsImport(orgId, userId, file, 'received');
  }

  @Post('import/payments_made')
  @ApiOperation({ summary: 'Bulk-import vendor payments' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importPaymentsMade(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.runPaymentsImport(orgId, userId, file, 'made');
  }

  private async runPaymentsImport(
    orgId: string,
    userId: string,
    file: Express.Multer.File,
    direction: 'received' | 'made',
  ) {
    this.validateUploadedFile(file);
    const format = this.detectFileFormat(file);
    const result = await this.paymentsImport.run(
      orgId,
      userId,
      file.buffer,
      format,
      direction,
    );
    return {
      success: result.errors.length === 0,
      total: result.total,
      imported: result.imported,
      skipped: result.skipped,
      // Pass through row-level errors as-is — the runner already
      // attaches { row } so the frontend renders "Row 7: ..." lines.
      errors: result.errors,
    };
  }

  @Post('import/journal_entries')
  @ApiOperation({ summary: 'Bulk-import manual journal entries' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importJournalEntries(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.validateUploadedFile(file);
    const format = this.detectFileFormat(file);
    const result = await this.journalEntriesImport.run(
      orgId,
      userId,
      file.buffer,
      format,
    );
    return {
      success: result.errors.length === 0,
      total: result.total,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors.map((e) => ({
        row: e.row,
        field: e.group ? `Entry ${e.group}` : e.field,
        message: e.message,
      })),
    };
  }

  @Post('import/expenses')
  @ApiOperation({ summary: 'Bulk-import business expenses' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importExpenses(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.validateUploadedFile(file);
    const format = this.detectFileFormat(file);
    const result = await this.expensesImport.run(
      orgId,
      userId,
      file.buffer,
      format,
    );
    return {
      success: result.errors.length === 0,
      total: result.total,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
    };
  }

  @Get('import/template/:type')
  @ApiOperation({ summary: 'Download import template for an entity type' })
  async getImportTemplate(
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    const validTypes: ImportEntityType[] = [
      'contacts',
      'products',
      'opening_balances',
      'sales_invoices',
      'purchase_bills',
      'payments_received',
      'payments_made',
      'expenses',
      'journal_entries',
    ];
    if (!validTypes.includes(type as ImportEntityType)) {
      throw new BadRequestException(`Invalid template type. Must be one of: ${validTypes.join(', ')}`);
    }

    const buffer = await this.importService.getImportTemplate(type as ImportEntityType);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_template.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Post('import/validate')
  @ApiOperation({ summary: 'Validate import file without importing (dry run)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: {
          type: 'string',
          enum: [
            'contacts',
            'products',
            'opening_balances',
            'sales_invoices',
            'purchase_bills',
            'payments_received',
            'payments_made',
            'expenses',
            'journal_entries',
          ],
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async validateImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    this.validateUploadedFile(file);

    // Allowlist mirrors getImportTemplate / the runner registry.
    // Transaction types (sales_invoices, purchase_bills) currently
    // get a permissive dry-run — parseFile + the (empty) switch case
    // returns total + preview rows with zero validation errors. The
    // actual per-group validation runs inside each runner's commit
    // closure, surfaced as row-level errors on the import response.
    const validTypes: ImportEntityType[] = [
      'contacts',
      'products',
      'opening_balances',
      'sales_invoices',
      'purchase_bills',
      'payments_received',
      'payments_made',
      'expenses',
      'journal_entries',
    ];
    if (!validTypes.includes(type as ImportEntityType)) {
      throw new BadRequestException(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    const format = this.detectFileFormat(file);
    return this.importService.validateFile(file.buffer, format, type as ImportEntityType);
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private resolveFormat(format: string): ExportFormat {
    const f = format?.toLowerCase();
    if (f === 'xlsx' || f === 'excel') return 'xlsx';
    return 'csv';
  }

  private sendFileResponse(res: Response, buffer: Buffer, filename: string, format: ExportFormat) {
    const contentType =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  private validateUploadedFile(file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10 MB limit');
    }

    const allowedMimes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/xml',
      'application/xml',
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: CSV, Excel (.xlsx), XML`,
      );
    }
  }

  private detectFileFormat(file: Express.Multer.File): string {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/csv' || file.mimetype === 'text/plain') {
      return 'csv';
    }
    if (file.originalname?.endsWith('.csv')) {
      return 'csv';
    }
    return 'xlsx';
  }
}
