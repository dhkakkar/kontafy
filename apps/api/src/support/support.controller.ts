import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create a new support ticket' })
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
  @ApiOperation({ summary: 'List support tickets for the current organization' })
  listTickets(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Query('status') status?: string,
  ) {
    return this.service.listOrgTickets(orgId, userId, status);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket detail with full message thread' })
  async getTicket(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const isSuperadmin = await this.isSuperadmin(userId);
    return this.service.getTicketDetail(id, { userId, isSuperadmin });
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Reply on a support ticket' })
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
