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
  @ApiOperation({ summary: 'List purchase invoices with filtering and pagination' })
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

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase invoice details with items' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.purchasesService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new purchase invoice' })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreatePurchaseDto,
  ) {
    return this.purchasesService.create(orgId, userId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a purchase invoice (draft only)' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: UpdatePurchaseDto,
  ) {
    return this.purchasesService.update(orgId, id, body);
  }
}
