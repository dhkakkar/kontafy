import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiBody } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { OrgId } from '../common/decorators/org-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Support')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('support')
export class SupportController {
  constructor(
    private readonly service: SupportService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('tickets')
  @ApiOperation({
    summary: 'Create a new support ticket',
    description:
      'Opens a new support ticket for the current org. Status defaults to `open` and an initial message is created from the supplied `description`. Optional `category` (e.g. billing, accounting, technical) and `priority` (`low` / `normal` / `high`) help staff triage; replies happen through `POST /support/tickets/:id/messages`.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['subject', 'description'],
      properties: {
        subject: { type: 'string', example: 'Unable to generate GST report' },
        description: { type: 'string', example: 'The GSTR-1 export fails with a 500 error.' },
        category: { type: 'string', example: 'billing' },
        priority: { type: 'string', example: 'high' },
      },
    },
  })
  createTicket(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      subject: string;
      description: string;
      category?: string;
      priority?: string;
    },
  ) {
    return this.service.createTicket(orgId, userId, body);
  }

  @Get('tickets')
  @ApiOperation({
    summary: 'List support tickets for the current organization',
    description:
      'Returns the tickets opened by this org, with an optional `status` filter. Strictly scoped to the caller\'s org — for the cross-tenant staff view use `GET /superadmin/tickets`.',
  })
  listTickets(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Query('status') status?: string,
  ) {
    return this.service.listOrgTickets(orgId, userId, status);
  }

  @Get('tickets/:id')
  @ApiOperation({
    summary: 'Get ticket detail with full message thread',
    description:
      'Returns the ticket along with every message exchanged on it, in chronological order. Org members only see tickets belonging to their org; superadmins (auto-detected from the caller\'s identity) can view any ticket on the platform.',
  })
  async getTicket(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const isSuperadmin = await this.isSuperadmin(userId);
    return this.service.getTicketDetail(id, { userId, isSuperadmin });
  }

  @Post('tickets/:id/messages')
  @ApiOperation({
    summary: 'Reply on a support ticket',
    description:
      'Appends a message to the ticket thread on behalf of the org member. The message is flagged `is_staff: false` and shows up immediately in the Kontafy staff inbox. Sending a reply on a `resolved` or `closed` ticket re-opens it.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: { type: 'string', example: 'Thanks, please share a screenshot of the error.' },
      },
    },
  })
  async reply(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { body: string },
  ) {
    const isSuperadmin = await this.isSuperadmin(userId);
    return this.service.addMessage(id, { userId, isSuperadmin }, body.body);
  }

  private async isSuperadmin(userId: string): Promise<boolean> {
    const sa = await this.prisma.superadmin.findUnique({
      where: { user_id: userId },
    });
    return !!sa;
  }
}
