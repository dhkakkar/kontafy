import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { SalesReturnsService } from './sales-returns.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateSalesReturnDto } from '../dto/sales-returns.dto';

@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/sales-returns')
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  @Get()
  @ApiOperation({
    summary: 'List sales returns with filtering and pagination',
    description:
      'Returns a paginated list of credit notes / sales returns for the organization. Supports filtering by `status` (draft, issued, applied), free-text `search` on customer name or return number, and a date range via `date_from` / `date_to`. The response includes header-level totals only — pair with `GET /bill/sales-returns/:id` for line items.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.salesReturnsService.findAll(orgId, {
      page,
      limit,
      status,
      search,
      dateFrom,
      dateTo,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get sales return details with items',
    description:
      'Returns the full sales return record including line items, tax breakdown, the originating invoice reference, and any payment/credit application history. Use this to populate the return detail view or to verify a draft before issuing.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.salesReturnsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new sales return',
    description:
      'Creates a credit note for goods returned by a customer, typically linked back to an existing sales invoice. The return number is generated server-side using the configured numbering scheme, and stock is incremented for each returned line item. Once issued, the return posts a reversing journal entry to reduce revenue and receivables.',
  })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateSalesReturnDto,
  ) {
    return this.salesReturnsService.create(orgId, userId, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a draft sales return',
    description:
      'Updates an unposted sales return — header fields, line items, and tax overrides may all be edited. Returns that have already been issued or applied to a customer credit cannot be modified; issue a new return instead.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.salesReturnsService.update(orgId, id, body);
  }
}
