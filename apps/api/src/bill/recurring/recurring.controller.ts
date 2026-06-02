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
  @ApiOperation({
    summary: 'Create a recurring invoice template',
    description:
      'Creates a recurring invoice template — line items, contact, frequency (weekly / monthly / yearly), start / end dates and whether generated invoices should be auto-sent. The template is created in `active` status; the daily cron picks it up on each `next_run_at` and emits a fresh invoice (in `draft` or `sent` depending on `auto_send`).',
  })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateRecurringInvoiceDto,
  ) {
    return this.recurringService.create(orgId, userId, body);
  }

  @Get()
  @ApiOperation({
    summary: 'List all recurring invoices',
    description:
      'Returns paginated recurring invoice templates for the org. Filter by `status` (active / paused / stopped). Each row includes the next run date, last generated date and total invoices generated to date.',
  })
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
  @ApiOperation({
    summary: 'Get recurring invoice details',
    description:
      'Returns the full recurring invoice template — line items, schedule, contact, auto-send flag and counts of generated invoices. Used by the recurring invoice detail page and the edit form.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.recurringService.findOne(orgId, id);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Get history of generated invoices',
    description:
      'Returns the paginated list of invoices that have been generated from this recurring template, newest first. Each row links to the actual invoice so you can drill into status, payments and PDF. Used by the recurring invoice detail page\'s history tab.',
  })
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
  @ApiOperation({
    summary: 'Update a recurring invoice template',
    description:
      'Patches a recurring template — line items, frequency, end date, auto-send, etc. Changes take effect from the next generation cycle; invoices that have already been generated are not retroactively updated.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: UpdateRecurringInvoiceDto,
  ) {
    return this.recurringService.update(orgId, id, body);
  }

  @Post(':id/pause')
  @ApiOperation({
    summary: 'Pause a recurring invoice',
    description:
      'Flips the template from `active` to `paused`. The daily cron skips paused templates, so no new invoices are generated until you call `POST /:id/resume`. Only active templates can be paused.',
  })
  async pause(@OrgId() orgId: string, @Param('id') id: string) {
    return this.recurringService.pause(orgId, id);
  }

  @Post(':id/resume')
  @ApiOperation({
    summary: 'Resume a paused recurring invoice',
    description:
      'Flips the template from `paused` back to `active`. The next run date is recalculated from the schedule so missed cycles during the pause window are not back-filled — generation simply resumes from today forward.',
  })
  async resume(@OrgId() orgId: string, @Param('id') id: string) {
    return this.recurringService.resume(orgId, id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a recurring invoice template',
    description:
      'Hard-deletes the recurring template. Invoices that have already been generated from this template are untouched and remain in the books. Prefer pausing if you only want to halt future generation temporarily.',
  })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.recurringService.remove(orgId, id);
  }
}
