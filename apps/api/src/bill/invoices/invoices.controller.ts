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
import { InvoicesService } from './invoices.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'contact_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('contact_id') contactId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.invoicesService.findAll(orgId, {
      page,
      limit,
      status,
      type,
      contactId,
      from,
      to,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details with items' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.invoicesService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      type: string;
      contact_id: string;
      date: string;
      due_date?: string;
      place_of_supply?: string;
      is_igst?: boolean;
      notes?: string;
      terms?: string;
      items: Array<{
        product_id?: string;
        description: string;
        hsn_code?: string;
        quantity: number;
        unit?: string;
        rate: number;
        discount_pct?: number;
        cgst_rate?: number;
        sgst_rate?: number;
        igst_rate?: number;
        cess_rate?: number;
      }>;
    },
  ) {
    return this.invoicesService.create(orgId, userId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice (draft only)' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.invoicesService.update(orgId, id, body);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update invoice status (send, cancel, etc.)' })
  async updateStatus(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.invoicesService.updateStatus(orgId, id, body.status);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an invoice as a new draft' })
  async duplicate(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.duplicate(orgId, id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft invoice' })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.invoicesService.remove(orgId, id);
  }

}
