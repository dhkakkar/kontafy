import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePurchaseDto, UpdatePurchaseDto } from '../dto/purchases.dto';

@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @ApiOperation({
    summary: 'List purchase invoices with filtering and pagination',
    description:
      'Returns paginated purchase bills (vendor invoices) for the org. Supports filtering by `status` (draft / sent / partially_paid / paid / overdue / cancelled), `contact_id`, date range (`from`/`to`) and free-text `search` over bill number and notes. Drives the purchase bills list page.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'contact_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('contact_id') contactId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.purchasesService.findAll(orgId, {
      page,
      limit,
      status,
      contactId,
      from,
      to,
      search,
    });
  }

  @Get('stats')
  @ApiOperation({
    summary:
      'Aggregate purchase stats — status counts + outstanding totals',
    description:
      'Returns the KPI tiles for the purchases page — counts per status, total billed and total outstanding to vendors. Aggregates run on demand and are safe to call on every page load.',
  })
  async getStats(@OrgId() orgId: string) {
    return this.purchasesService.getStats(orgId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get purchase invoice details with items',
    description:
      'Returns the full purchase bill including line items, tax breakdown, applied payments / debit notes and current `amount_paid` / `balance_due`. Used by the bill detail page and as the data source for the bill PDF.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.purchasesService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new purchase invoice',
    description:
      'Creates a vendor bill in `draft` status with an auto-generated number. Server-side computes line totals and tax based on `is_igst` and `place_of_supply`. Drafts do not hit the books — move to `sent` via `PATCH /:id/status` to post the AP journal entry.',
  })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreatePurchaseDto,
  ) {
    return this.purchasesService.create(orgId, userId, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a purchase invoice (draft only)',
    description:
      'Patches a purchase bill and recalculates line / tax / grand totals. Editing is blocked once the bill is partially_paid, paid or cancelled — for those, issue a debit note or reverse the payment first. After commit, the journal is reposted if the bill is in a posted status.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: UpdatePurchaseDto,
  ) {
    return this.purchasesService.update(orgId, id, body);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Transition a purchase bill status (draft → sent / cancelled / …)',
    description:
      'Transitions the bill through its lifecycle. Valid transitions are validated server-side. Moving away from `draft` posts the AP journal (Dr expense / asset / input GST | Cr AP); moving into `cancelled` reverses it. The vendor\'s running balance is updated as a side effect.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', example: 'sent' },
      },
    },
  })
  async updateStatus(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.purchasesService.updateStatus(orgId, id, body.status);
  }
}
