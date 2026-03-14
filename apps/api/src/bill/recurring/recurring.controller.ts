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
import { RecurringService } from './recurring.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateRecurringInvoiceDto, UpdateRecurringInvoiceDto } from './dto/recurring.dto';

@ApiTags('Recurring Invoices')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('recurring-invoices')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  @ApiOperation({ summary: 'Create a recurring invoice template' })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateRecurringInvoiceDto,
  ) {
    return this.recurringService.create(orgId, userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List all recurring invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.recurringService.findAll(orgId, { page, limit, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recurring invoice details' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.recurringService.findOne(orgId, id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get history of generated invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.recurringService.getHistory(orgId, id, { page, limit });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recurring invoice template' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: UpdateRecurringInvoiceDto,
  ) {
    return this.recurringService.update(orgId, id, body);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a recurring invoice' })
  async pause(@OrgId() orgId: string, @Param('id') id: string) {
    return this.recurringService.pause(orgId, id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a paused recurring invoice' })
  async resume(@OrgId() orgId: string, @Param('id') id: string) {
    return this.recurringService.resume(orgId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recurring invoice template' })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.recurringService.remove(orgId, id);
  }
}
