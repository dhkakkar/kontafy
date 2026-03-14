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
  @ApiOperation({ summary: 'Create a new budget' })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateBudgetDto,
  ) {
    return this.budgetService.create(orgId, userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List all budgets' })
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
  @ApiOperation({ summary: 'Get budget summary across all active budgets' })
  async getSummary(@OrgId() orgId: string) {
    return this.budgetService.getSummary(orgId);
  }

  @Get('variance')
  @ApiOperation({ summary: 'Get budget vs actual variance report' })
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
  @ApiOperation({ summary: 'Get budget details with line items' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.budgetService.findOne(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: UpdateBudgetDto,
  ) {
    return this.budgetService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft budget' })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.budgetService.remove(orgId, id);
  }
}
