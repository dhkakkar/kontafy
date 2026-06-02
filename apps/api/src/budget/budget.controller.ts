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
import { BudgetService } from './budget.service';
import { OrgId } from '../common/decorators/org-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';

@ApiTags('Budget')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('budgets')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new budget',
    description:
      'Creates a budget for a fiscal year (or custom date range) with per-account target lines split into monthly or quarterly buckets. Defaults to `draft` status — activate it later by `PATCH /:id` with `status: active`. Once active, the `/variance` report compares posted ledger figures against budget lines.',
  })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateBudgetDto,
  ) {
    return this.budgetService.create(orgId, userId, body);
  }

  @Get()
  @ApiOperation({
    summary: 'List all budgets',
    description:
      'Returns a paginated list of budgets for the org. Filters: `status` (draft, active, archived) and `fiscal_year` (e.g. "2025-26"). Each row carries header totals only — call `GET /:id` for the per-account line items.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fiscal_year', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('fiscal_year') fiscalYear?: string,
  ) {
    return this.budgetService.findAll(orgId, { page, limit, status, fiscalYear });
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get budget summary across all active budgets',
    description:
      'Returns roll-up totals (planned vs actual revenue / expense / surplus) across every budget currently in `active` status. Useful as a single-card widget on the budgets landing page.',
  })
  async getSummary(@OrgId() orgId: string) {
    return this.budgetService.getSummary(orgId);
  }

  @Get('variance')
  @ApiOperation({
    summary: 'Get budget vs actual variance report',
    description:
      'Returns each budgeted account line with its planned amount, actual amount from the ledger for the period, absolute variance, and percentage variance. Optional filters: `budget_id` (defaults to the active budget for the period) and `from` / `to` to override the budget\'s own date window.',
  })
  @ApiQuery({ name: 'budget_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getVariance(
    @OrgId() orgId: string,
    @Query('budget_id') budgetId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.budgetService.getVariance(orgId, { budgetId, from, to });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get budget details with line items',
    description:
      'Returns the budget header plus all per-account budget lines with their monthly/quarterly splits. Use this to drive the budget edit form.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.budgetService.findOne(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a budget',
    description:
      'Updates the budget header and/or replaces its line items. Pass `status: active` to publish a draft — variance reports will then pick it up. Pass `status: archived` to retire a budget without deleting it.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: UpdateBudgetDto,
  ) {
    return this.budgetService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a draft budget',
    description:
      'Hard-deletes a budget that is still in `draft` status, along with its line items. Active or archived budgets cannot be deleted to preserve historical comparisons — archive them via `PATCH /:id` with `status: archived` instead.',
  })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.budgetService.remove(orgId, id);
  }
}
