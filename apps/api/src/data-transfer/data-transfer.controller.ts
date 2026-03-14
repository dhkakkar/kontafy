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
import { ExportService, ExportFormat } from './export.service';
import { ImportService, ImportEntityType } from './import.service';

@ApiTags('Data Transfer')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('data-transfer')
export class DataTransferController {
  constructor(
    private readonly exportService: ExportService,
    private readonly importService: ImportService,
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

  @Get('import/template/:type')
  @ApiOperation({ summary: 'Download import template for an entity type' })
  async getImportTemplate(
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    const validTypes: ImportEntityType[] = ['contacts', 'products', 'opening_balances'];
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
        type: { type: 'string', enum: ['contacts', 'products', 'opening_balances'] },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async validateImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    this.validateUploadedFile(file);

    const validTypes: ImportEntityType[] = ['contacts', 'products', 'opening_balances'];
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
