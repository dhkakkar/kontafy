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
  @ApiOperation({ summary: 'List credit notes with filtering and pagination' })
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
  @ApiOperation({ summary: 'Get credit note details with items' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.creditNotesService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new credit note' })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateCreditNoteDto,
  ) {
    return this.creditNotesService.create(orgId, userId, body);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply credit note against an invoice' })
  async apply(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: ApplyCreditNoteDto,
  ) {
    return this.creditNotesService.apply(orgId, id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft credit note' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.creditNotesService.update(orgId, id, body);
  }
}
