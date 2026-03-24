import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CreatePaymentDto, AllocatePaymentDto } from '../dto/payments.dto';

@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List payments with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, description: 'received or made' })
  @ApiQuery({ name: 'contact_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
    @Query('contact_id') contactId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.paymentsService.findAll(orgId, {
      page,
      limit,
      type,
      contactId,
      from,
      to,
      search,
    });
  }

  @Get('outstanding')
  @ApiOperation({ summary: 'Outstanding receivables/payables summary with aging analysis' })
  async getOutstanding(@OrgId() orgId: string) {
    return this.paymentsService.getOutstandingSummary(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details with allocations' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.paymentsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Record a payment (received or made)' })
  async create(
    @OrgId() orgId: string,
    @Body() body: CreatePaymentDto,
  ) {
    return this.paymentsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment details' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.paymentsService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payment and reverse allocations' })
  async remove(
    @OrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.remove(orgId, id);
  }

  @Post(':id/allocate')
  @ApiOperation({ summary: 'Allocate payment to multiple invoices' })
  async allocate(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: AllocatePaymentDto,
  ) {
    return this.paymentsService.allocate(orgId, id, body);
  }
}
