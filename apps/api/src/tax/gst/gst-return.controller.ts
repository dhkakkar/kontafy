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
  @ApiOperation({ summary: 'List GST returns for the organization' })
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
  @ApiOperation({ summary: 'Get a single GST return' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.gstReturnService.findOne(orgId, id);
  }

  @Post('compute')
  @ApiOperation({ summary: 'Compute GSTR-1 or GSTR-3B from invoices for a period' })
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
  @ApiOperation({ summary: 'Save or finalize a GST return' })
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
  @ApiOperation({ summary: 'Mark a GST return as filed' })
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
  @ApiOperation({ summary: 'Compute full GSTR-3B with all tables for a period' })
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
  @ApiOperation({ summary: 'Save computed GSTR-3B return' })
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
  @ApiOperation({ summary: 'List GSTR-3B filing history' })
  async gstr3bHistory(@OrgId() orgId: string) {
    return this.gstReturnService.getGSTR3BHistory(orgId);
  }

  // ═══════════════════════════════════════════════════════════════
  // GSTR-1: JSON Export & Validation
  // ═══════════════════════════════════════════════════════════════

  @Get('gstr1/export')
  @ApiOperation({ summary: 'Export GSTR-1 in GST portal JSON format' })
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
  @ApiOperation({ summary: 'Validate GSTR-1 data before export' })
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
