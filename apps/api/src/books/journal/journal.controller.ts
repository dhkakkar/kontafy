import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { JournalService } from './journal.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Books')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('books/journal-entries')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get()
  @ApiOperation({ summary: 'List journal entries with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'posted', required: false, type: Boolean })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('posted') posted?: boolean,
  ) {
    return this.journalService.findAll(orgId, { page, limit, from, to, posted });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get journal entry with lines' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.journalService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a journal entry' })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      date: string;
      narration?: string;
      reference?: string;
      reference_type?: string;
      reference_id?: string;
      is_posted?: boolean;
      lines: Array<{
        account_id: string;
        debit: number;
        credit: number;
        description?: string;
      }>;
    },
  ) {
    return this.journalService.create(orgId, userId, body);
  }

  @Patch(':id/post')
  @ApiOperation({ summary: 'Post (finalize) a draft journal entry' })
  async postEntry(@OrgId() orgId: string, @Param('id') id: string) {
    return this.journalService.postEntry(orgId, id);
  }

  @Patch(':id/void')
  @ApiOperation({ summary: 'Void a journal entry (creates reversing entry)' })
  async voidEntry(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.journalService.voidEntry(orgId, userId, id);
  }
}
