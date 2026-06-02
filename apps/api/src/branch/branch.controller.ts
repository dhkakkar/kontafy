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
  @ApiOperation({
    summary: 'Create a new branch',
    description:
      'Adds a new physical branch / location to the organization. The `is_main` flag is exclusive — setting it to true demotes the existing main branch to non-main. Branch `code` is auto-generated if omitted and is used as a short prefix on document numbering.',
  })
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
  @ApiOperation({
    summary: 'List all branches for the organization',
    description:
      'Returns a paginated list of branches in the org. Filters: `search` (matches branch name / code / city) and `is_active` (true / false / omit for all). Useful for populating branch pickers and the branches admin page.',
  })
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
  @ApiOperation({
    summary: 'Get branch details',
    description:
      'Returns one branch record with its address block, contact info, and main-branch flag. Use the companion `/:id/summary` and `/:id/stock` endpoints for financial / inventory roll-ups.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.branchService.findOne(orgId, id);
  }

  @Get(':id/summary')
  @ApiOperation({
    summary: 'Get branch P&L summary',
    description:
      'Returns branch-scoped revenue, expenses, and profit totals plus key counts (invoices issued, bills received) for the optional `from`-`to` window. Defaults to the current fiscal year when dates are omitted.',
  })
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
  @ApiOperation({
    summary: 'Get branch stock levels',
    description:
      'Returns the current on-hand quantity for every product at this branch with valuation rate and stock value. Supports pagination and `search` over product name / SKU. Quantities are computed from branch-tagged stock movements.',
  })
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
  @ApiOperation({
    summary: 'Update a branch',
    description:
      'Updates editable fields on a branch (name, code, address, contact info, manager, main flag). Promoting a branch to `is_main: true` automatically demotes the previous main branch so the org always has exactly one main location.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.branchService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate a branch (soft delete)',
    description:
      'Soft-deletes a branch by flipping `is_active` to false — historical documents remain intact and continue to reference the branch. The main branch cannot be deactivated; reassign the main flag first. Reactivate later by `PATCH /:id` with `is_active: true`.',
  })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.branchService.remove(orgId, id);
  }
}
