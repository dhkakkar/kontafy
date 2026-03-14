import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { TdsService } from './tds.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CreateTdsEntrySchema, TdsSummaryQuerySchema } from '../dto/tds.dto';

@ApiTags('Tax - TDS')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('tax/tds')
export class TdsController {
  constructor(private readonly tdsService: TdsService) {}

  @Get()
  @ApiOperation({ summary: 'List TDS entries' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'section', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('section') section?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.tdsService.findAll(orgId, {
      page: Number(page),
      limit: Number(limit),
      section,
      status,
      from,
      to,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a TDS deduction entry' })
  async create(
    @OrgId() orgId: string,
    @Body() body: Record<string, any>,
  ) {
    const parsed = CreateTdsEntrySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    return this.tdsService.create(orgId, parsed.data);
  }

  @Get('summary')
  @ApiOperation({ summary: 'TDS summary by section for a period' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async getSummary(
    @OrgId() orgId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const parsed = TdsSummaryQuerySchema.safeParse({ from, to });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    return this.tdsService.getSummary(orgId, parsed.data.from, parsed.data.to);
  }
}
