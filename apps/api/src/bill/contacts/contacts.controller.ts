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
import { ContactsService } from './contacts.service';
import { OrgId } from '../../common/decorators/org-id.decorator';

@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List contacts with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, description: 'customer, vendor, or both' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'active_only', required: false, type: Boolean })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('active_only') activeOnly?: boolean,
  ) {
    return this.contactsService.findAll(orgId, { page, limit, type, search, activeOnly });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact details' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.contactsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  async create(
    @OrgId() orgId: string,
    @Body()
    body: {
      type: string;
      name: string;
      company_name?: string;
      gstin?: string;
      pan?: string;
      email?: string;
      phone?: string;
      whatsapp?: string;
      billing_address?: Record<string, any>;
      shipping_address?: Record<string, any>;
      payment_terms?: number;
      credit_limit?: number;
      opening_balance?: number;
      notes?: string;
    },
  ) {
    return this.contactsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contact' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.contactsService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate contact (soft delete)' })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.contactsService.deactivate(orgId, id);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get contact outstanding balance' })
  async getBalance(@OrgId() orgId: string, @Param('id') id: string) {
    return this.contactsService.getBalance(orgId, id);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get paginated list of invoices and payments for a contact' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, description: 'invoice or payment' })
  async getTransactions(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
  ) {
    return this.contactsService.getTransactions(orgId, id, { page, limit, type });
  }

  @Get(':id/outstanding')
  @ApiOperation({ summary: 'Get outstanding invoices with aging breakdown for a contact' })
  async getOutstanding(@OrgId() orgId: string, @Param('id') id: string) {
    return this.contactsService.getOutstanding(orgId, id);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get contact summary: total revenue, outstanding, invoice count, last transaction' })
  async getSummary(@OrgId() orgId: string, @Param('id') id: string) {
    return this.contactsService.getSummary(orgId, id);
  }
}
