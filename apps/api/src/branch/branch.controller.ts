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
import { BranchService } from './branch.service';
import { OrgId } from '../common/decorators/org-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Branch')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new branch' })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      name: string;
      code?: string;
      address?: Record<string, any>;
      phone?: string;
      email?: string;
      manager_name?: string;
      is_main?: boolean;
    },
  ) {
    return this.branchService.create(orgId, userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List all branches for the organization' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'is_active', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
    @Query('is_active') isActive?: string,
  ) {
    return this.branchService.findAll(orgId, {
      page,
      limit,
      search,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branch details' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.branchService.findOne(orgId, id);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get branch P&L summary' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getSummary(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.branchService.getBranchSummary(orgId, id, { from, to });
  }

  @Get(':id/stock')
  @ApiOperation({ summary: 'Get branch stock levels' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  async getStock(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
  ) {
    return this.branchService.getBranchStock(orgId, id, { page, limit, search });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a branch' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.branchService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a branch (soft delete)' })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.branchService.remove(orgId, id);
  }
}
