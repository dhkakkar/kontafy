import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { GstReturnService } from './gst-return.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import {
  ComputeGstReturnSchema,
  SaveGstReturnSchema,
  FileGstReturnSchema,
} from '../dto/gst-return.dto';

@ApiTags('Tax - GST')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('tax/gst/returns')
export class GstReturnController {
  constructor(private readonly gstReturnService: GstReturnService) {}

  @Get()
  @ApiOperation({
    summary: 'List GST returns for the organization',
    description:
      'Paginated list of every GST return saved for the org. Filters: `return_type` (`GSTR1` / `GSTR3B`), `status` (`draft` / `computed` / `filed`), `period` (MMYYYY), `page`, `limit`. Used to power the Returns history table.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'return_type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'period', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('return_type') returnType?: string,
    @Query('status') status?: string,
    @Query('period') period?: string,
  ) {
    return this.gstReturnService.findAll(orgId, {
      page: Number(page),
      limit: Number(limit),
      return_type: returnType,
      status,
      period,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single GST return',
    description:
      'Returns the stored snapshot of a GST return, including every table (B2B, B2C, exports, HSN summary, etc.) and the computed totals at the time of save/filing.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.gstReturnService.findOne(orgId, id);
  }

  @Post('compute')
  @ApiOperation({
    summary: 'Compute GSTR-1 or GSTR-3B from invoices for a period',
    description:
      'Runs an in-memory computation of the requested return type from sales/purchase data between `from_date` and `to_date` — nothing is persisted. Use this for live preview while reviewing a period; call `POST /tax/gst/returns` afterwards to save the snapshot.',
  })
  async compute(
    @OrgId() orgId: string,
    @Body() body: Record<string, any>,
  ) {
    const parsed = ComputeGstReturnSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const { return_type, from_date, to_date } = parsed.data;
    const fromDate = new Date(from_date);
    const toDate = new Date(to_date);

    if (fromDate > toDate) {
      throw new BadRequestException('from_date must be before to_date');
    }

    if (return_type === 'GSTR1') {
      return this.gstReturnService.computeGSTR1(orgId, fromDate, toDate);
    }

    return this.gstReturnService.computeGSTR3B(orgId, fromDate, toDate);
  }

  @Post()
  @ApiOperation({
    summary: 'Save or finalize a GST return',
    description:
      'Persists a computed GSTR-1 or GSTR-3B snapshot for the org. Pass `status: "draft"` to save work-in-progress or `"computed"` once you have reviewed totals. Use `PATCH /tax/gst/returns/:id/file` to mark it as actually filed.',
  })
  async save(
    @OrgId() orgId: string,
    @Body() body: Record<string, any>,
  ) {
    const parsed = SaveGstReturnSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    return this.gstReturnService.saveReturn(orgId, parsed.data);
  }

  @Patch(':id/file')
  @ApiOperation({
    summary: 'Mark a GST return as filed',
    description:
      'Transitions a saved return from `computed` to `filed` and records the ARN, filing date and any payment challan reference. After filing, the snapshot becomes read-only — re-compute and save as a fresh return if a revision is needed.',
  })
  async file(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const parsed = FileGstReturnSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    return this.gstReturnService.fileReturn(orgId, id, parsed.data);
  }

  // ═══════════════════════════════════════════════════════════════
  // GSTR-3B: Full Compute, Save, History
  // ═══════════════════════════════════════════════════════════════

  @Get('gstr3b/compute')
  @ApiOperation({
    summary: 'Compute full GSTR-3B with all tables for a period',
    description:
      'Returns the full GSTR-3B payload for a `period` in MMYYYY format — outward supplies (3.1), inward reverse-charge (3.1.d), ITC (4), interstate supplies (5) and exempt/nil rated (6). The response is preview-only; persist it via `POST /tax/gst/returns/gstr3b/save` once verified.',
  })
  @ApiQuery({ name: 'period', required: true, description: 'Period in MMYYYY format (e.g., 032026)' })
  async computeGSTR3B(
    @OrgId() orgId: string,
    @Query('period') period: string,
  ) {
    if (!period || period.length !== 6) {
      throw new BadRequestException('Period must be in MMYYYY format (e.g., 032026)');
    }

    const month = parseInt(period.substring(0, 2), 10);
    const year = parseInt(period.substring(2), 10);

    if (month < 1 || month > 12 || year < 2017) {
      throw new BadRequestException('Invalid period');
    }

    const fromDate = new Date(year, month - 1, 1);
    const toDate = new Date(year, month, 0); // last day of month

    return this.gstReturnService.computeGSTR3BFull(orgId, fromDate, toDate, period);
  }

  @Post('gstr3b/save')
  @ApiOperation({
    summary: 'Save computed GSTR-3B return',
    description:
      'Persists a GSTR-3B snapshot for the given `period` (MMYYYY). Status defaults to `computed` if not supplied. Saving overwrites any previous draft for the same period — only one record per (org, period) is kept until it is filed.',
  })
  async saveGSTR3B(
    @OrgId() orgId: string,
    @Body() body: Record<string, any>,
  ) {
    const { period, data, status } = body;

    if (!period || !data) {
      throw new BadRequestException('Period and data are required');
    }

    return this.gstReturnService.saveReturn(orgId, {
      return_type: 'GSTR3B',
      period,
      data,
      status: status || 'computed',
    });
  }

  @Get('gstr3b/history')
  @ApiOperation({
    summary: 'List GSTR-3B filing history',
    description:
      'Returns past GSTR-3B snapshots for the org with period, status and filing metadata. Drives the GSTR-3B timeline view on the compliance dashboard.',
  })
  async gstr3bHistory(@OrgId() orgId: string) {
    return this.gstReturnService.getGSTR3BHistory(orgId);
  }

  // ═══════════════════════════════════════════════════════════════
  // GSTR-1: JSON Export & Validation
  // ═══════════════════════════════════════════════════════════════

  @Get('gstr1/export')
  @ApiOperation({
    summary: 'Export GSTR-1 in GST portal JSON format',
    description:
      'Returns a GSTR-1 payload in the exact JSON schema accepted by the GST portal offline tool for the given `period` (MMYYYY). When `format=json` the response is sent as a downloadable `GSTR1_<gstin>_<period>.json` attachment; otherwise it is returned inline for inspection.',
  })
  @ApiQuery({ name: 'period', required: true, description: 'Period in MMYYYY format (e.g., 032026)' })
  @ApiQuery({ name: 'format', required: false, description: 'Export format (json)' })
  async exportGSTR1(
    @OrgId() orgId: string,
    @Query('period') period: string,
    @Query('format') format: string = 'json',
    @Res() res: Response,
  ) {
    if (!period || period.length !== 6) {
      throw new BadRequestException('Period must be in MMYYYY format (e.g., 032026)');
    }

    const month = parseInt(period.substring(0, 2), 10);
    const year = parseInt(period.substring(2), 10);

    if (month < 1 || month > 12 || year < 2017) {
      throw new BadRequestException('Invalid period');
    }

    const fromDate = new Date(year, month - 1, 1);
    const toDate = new Date(year, month, 0);

    const data = await this.gstReturnService.exportGSTR1JSON(orgId, fromDate, toDate, period);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="GSTR1_${data.gstin}_${period}.json"`);
      return res.json(data);
    }

    // Default: return as API response (not download)
    return res.json(data);
  }

  @Get('gstr1/validate')
  @ApiOperation({
    summary: 'Validate GSTR-1 data before export',
    description:
      'Runs the GSTR-1 dataset for the `period` through the same checks the portal applies — missing GSTINs, mismatched place-of-supply, invalid HSN codes, etc. Returns a list of `errors` (must-fix) and `warnings` (should-review) so customers can clean their data before uploading.',
  })
  @ApiQuery({ name: 'period', required: true, description: 'Period in MMYYYY format (e.g., 032026)' })
  async validateGSTR1(
    @OrgId() orgId: string,
    @Query('period') period: string,
  ) {
    if (!period || period.length !== 6) {
      throw new BadRequestException('Period must be in MMYYYY format (e.g., 032026)');
    }

    const month = parseInt(period.substring(0, 2), 10);
    const year = parseInt(period.substring(2), 10);

    if (month < 1 || month > 12 || year < 2017) {
      throw new BadRequestException('Invalid period');
    }

    const fromDate = new Date(year, month - 1, 1);
    const toDate = new Date(year, month, 0);

    return this.gstReturnService.validateGSTR1(orgId, fromDate, toDate);
  }
}
