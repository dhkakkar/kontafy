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
  @ApiOperation({
    summary: 'List journal entries with pagination',
    description:
      'Returns a paginated list of journal entries scoped to the org. Filters: `from` / `to` date range (YYYY-MM-DD) and `posted` (true returns finalized entries only, false returns drafts). Each row carries the entry header plus aggregate debit/credit totals — pair with `GET /:id` for line breakdown.',
  })
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
  @ApiOperation({
    summary: 'Get journal entry with lines',
    description:
      'Returns the journal entry header together with every debit/credit line (account, amount, line-level description). Use this to populate the entry detail / edit view.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.journalService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a journal entry',
    description:
      'Creates a manual journal entry. Lines must balance (sum of debits === sum of credits) or the call is rejected. Defaults to draft (`is_posted: false`); pass `is_posted: true` to post immediately, which also updates account balances and writes to the ledger. `reference_type` / `reference_id` link the entry back to a source document (e.g. invoice, bill).',
  })
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
  @ApiOperation({
    summary: 'Post (finalize) a draft journal entry',
    description:
      'Transitions a draft journal entry to posted status. Posting updates every referenced account balance and makes the entry immutable — further changes require voiding and reissuing. A no-op if the entry is already posted.',
  })
  async postEntry(@OrgId() orgId: string, @Param('id') id: string) {
    return this.journalService.postEntry(orgId, id);
  }

  @Patch(':id/void')
  @ApiOperation({
    summary: 'Void a journal entry (creates reversing entry)',
    description:
      'Voids a posted journal entry by creating a new reversing entry — the original record is preserved for audit, and the net effect on account balances is zero. The reversing entry is dated today and references the original entry id.',
  })
  async voidEntry(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.journalService.voidEntry(orgId, userId, id);
  }
}
