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
import { ExpensesService } from './expenses.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateExpenseDto, UpdateExpenseDto } from '../dto/expenses.dto';

@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @ApiOperation({
    summary: 'List expenses with filtering',
    description:
      'Returns the org\'s expenses for the page. Filter by `status` (pending / approved / rejected), free-text `search` over vendor name, category and notes, and date range (`from`/`to`). Used by the expenses index — the response includes the all-time expense total in addition to the rows.',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.expensesService.findAll(orgId, { status, search, from, to });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get expense details',
    description:
      'Returns the full expense record including category, amount, attached receipt URL, tax breakdown and the bank / cash account it was paid from. Used by the expense detail drawer and the edit form.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.expensesService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new expense',
    description:
      'Records an expense and posts the matching journal entry (Dr expense category / input GST | Cr bank or cash). New expenses default to `approved` status, so the journal is posted immediately and the bank account balance is reduced.',
  })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateExpenseDto,
  ) {
    return this.expensesService.create(orgId, userId, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an expense',
    description:
      'Patches an expense and re-posts its journal so the books always reflect the latest amount, category and bank account. Changing the status to `rejected` reverses the journal; flipping it back to `approved` re-posts it.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: UpdateExpenseDto,
  ) {
    return this.expensesService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an expense',
    description:
      'Hard-deletes the expense and reverses its journal entry so the bank balance and P&L are restored to pre-expense state. Use sparingly — for audit-friendly correction prefer creating an offsetting entry instead.',
  })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.expensesService.remove(orgId, id);
  }
}
