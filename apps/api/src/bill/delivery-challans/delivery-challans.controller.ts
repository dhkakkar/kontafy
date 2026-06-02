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
import { DeliveryChallansService } from './delivery-challans.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateDeliveryChallanDto } from '../dto/delivery-challans.dto';

@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/delivery-challans')
export class DeliveryChallansController {
  constructor(private readonly deliveryChallansService: DeliveryChallansService) {}

  @Get()
  @ApiOperation({
    summary: 'List delivery challans with filtering and pagination',
    description:
      'Returns paginated delivery challans for the org. Filter by `status` (draft / sent / delivered / invoiced / cancelled), free-text `search` over challan number and notes, and date range (`date_from`/`date_to`). Delivery challans track goods movement and do not post to the books.',
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
    return this.deliveryChallansService.findAll(orgId, {
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
    summary: 'Get delivery challan details with items',
    description:
      'Returns the full delivery challan including its line items, shipping address and any linked invoice. Used by the challan detail page and as the source for the challan PDF.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.deliveryChallansService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new delivery challan',
    description:
      'Creates a delivery challan in `draft` status with an auto-generated challan number. No journal posting happens — challans are document-only until they are converted to a tax invoice. Move to `delivered` via `PATCH /:id/status` once goods are dispatched.',
  })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateDeliveryChallanDto,
  ) {
    return this.deliveryChallansService.create(orgId, userId, body);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update delivery challan status',
    description:
      'Transitions the challan between draft, sent, delivered, invoiced and cancelled. Setting `invoiced` is normally done by the system when an invoice is created from the challan; setting it manually does not create the invoice document.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', example: 'delivered' },
      },
    },
  })
  async updateStatus(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.deliveryChallansService.updateStatus(orgId, id, body.status);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a draft delivery challan',
    description:
      'Patches a delivery challan while it is still in `draft` or `sent`. Once the challan is delivered, invoiced or cancelled it is locked — changes after that point need a new challan (and, if needed, a credit note on the linked invoice).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
      description: 'Partial delivery challan fields to update.',
    },
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.deliveryChallansService.update(orgId, id, body);
  }
}
