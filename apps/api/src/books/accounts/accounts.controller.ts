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
import { AccountsService } from './accounts.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Books')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('books/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Get chart of accounts (tree structure)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by account type' })
  @ApiQuery({ name: 'active_only', required: false, type: Boolean })
  async findAll(
    @OrgId() orgId: string,
    @Query('type') type?: string,
    @Query('active_only') activeOnly?: boolean,
  ) {
    return this.accountsService.findAll(orgId, { type, activeOnly });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account details' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.accountsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  async create(
    @OrgId() orgId: string,
    @Body()
    body: {
      code: string;
      name: string;
      type: string;
      sub_type?: string;
      parent_id?: string;
      opening_balance?: number;
      description?: string;
    },
  ) {
    return this.accountsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      code?: string;
      sub_type?: string;
      description?: string;
      is_active?: boolean;
    },
  ) {
    return this.accountsService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete account (only non-system accounts with no transactions)' })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.accountsService.remove(orgId, id);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get accounts as a hierarchical tree' })
  async getTree(@OrgId() orgId: string) {
    return this.accountsService.getTree(orgId);
  }
}
