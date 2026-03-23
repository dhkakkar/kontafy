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
  @ApiOperation({ summary: 'List expenses with filtering' })
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
  @ApiOperation({ summary: 'Get expense details' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.expensesService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new expense' })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateExpenseDto,
  ) {
    return this.expensesService.create(orgId, userId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: UpdateExpenseDto,
  ) {
    return this.expensesService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense' })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.expensesService.remove(orgId, id);
  }
}
