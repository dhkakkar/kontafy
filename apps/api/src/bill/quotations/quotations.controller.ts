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
import { QuotationsService } from './quotations.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Quotations')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quotation' })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      contact_id: string;
      date: string;
      validity_date?: string;
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
    return this.quotationsService.create(orgId, userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List quotations with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.quotationsService.findAll(orgId, { page, limit, status, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quotation details with items' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.quotationsService.findOne(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a quotation (draft/sent only)' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.quotationsService.update(orgId, id, body);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update quotation status' })
  async updateStatus(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.quotationsService.updateStatus(orgId, id, body.status);
  }

  @Post(':id/convert-to-invoice')
  @ApiOperation({ summary: 'Convert a quotation to an invoice' })
  async convertToInvoice(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.quotationsService.convertToInvoice(orgId, id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft quotation' })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.quotationsService.remove(orgId, id);
  }
}
