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
  @ApiOperation({ summary: 'List delivery challans with filtering and pagination' })
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
  @ApiOperation({ summary: 'Get delivery challan details with items' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.deliveryChallansService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new delivery challan' })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateDeliveryChallanDto,
  ) {
    return this.deliveryChallansService.create(orgId, userId, body);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update delivery challan status' })
  async updateStatus(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.deliveryChallansService.updateStatus(orgId, id, body.status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft delivery challan' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.deliveryChallansService.update(orgId, id, body);
  }
}
