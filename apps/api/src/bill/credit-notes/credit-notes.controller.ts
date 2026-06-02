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
import { CreditNotesService } from './credit-notes.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateCreditNoteDto, ApplyCreditNoteDto } from '../dto/credit-notes.dto';

@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/credit-notes')
export class CreditNotesController {
  constructor(private readonly creditNotesService: CreditNotesService) {}

  @Get()
  @ApiOperation({
    summary: 'List credit notes with filtering and pagination',
    description:
      'Returns paginated credit notes for the org. Supports filtering by `status` (draft / issued / applied / partially_applied / cancelled), `contact_id`, date range (`from`/`to`) and free-text `search` over credit-note number and notes.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'contact_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('contact_id') contactId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.creditNotesService.findAll(orgId, {
      page,
      limit,
      status,
      contactId,
      from,
      to,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get credit note details with items',
    description:
      'Returns the full credit note including its line items, tax breakdown and any allocations against invoices. Used by the credit note detail page and as the source for the credit-note PDF render.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.creditNotesService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new credit note',
    description:
      'Creates a credit note in `draft` status — items and tax totals are computed server-side from the supplied line items. Drafts do not affect the books; call `POST /:id/apply` to allocate the credit against one or more invoices, which is what actually posts the reversing journal entry.',
  })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateCreditNoteDto,
  ) {
    return this.creditNotesService.create(orgId, userId, body);
  }

  @Post(':id/apply')
  @ApiOperation({
    summary: 'Apply credit note against an invoice',
    description:
      'Allocates this credit note\'s available balance against the supplied invoice(s), reducing each invoice\'s `balance_due` and posting the reversing AR journal. The credit note transitions to `applied` (fully used) or `partially_applied` (balance remaining), and each touched invoice may flip to `paid` or `partially_paid`.',
  })
  async apply(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: ApplyCreditNoteDto,
  ) {
    return this.creditNotesService.apply(orgId, id, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a draft credit note',
    description:
      'Patches a credit note while it is still in `draft`. Once a credit note has been applied, paid or cancelled it is locked — to correct an applied note you must reverse the allocation first or issue a new credit / debit note.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.creditNotesService.update(orgId, id, body);
  }
}
