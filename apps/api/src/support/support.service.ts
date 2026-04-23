import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
const VALID_CATEGORIES = [
  'general',
  'billing',
  'technical',
  'feature_request',
  'other',
] as const;

type Status = (typeof VALID_STATUSES)[number];
type Priority = (typeof VALID_PRIORITIES)[number];

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────── helpers ─────────────────────

  private async verifyMembership(orgId: string, userId: string) {
    const member = await this.prisma.orgMember.findUnique({
      where: { org_id_user_id: { org_id: orgId, user_id: userId } },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    return member;
  }

  private async getTicketOrThrow(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  // ───────────────────── user-facing ─────────────────────

  async createTicket(
    orgId: string,
    userId: string,
    data: {
      subject: string;
      description: string;
      category?: string;
      priority?: string;
    },
  ) {
    await this.verifyMembership(orgId, userId);

    const subject = data.subject?.trim();
    const description = data.description?.trim();
    if (!subject) throw new BadRequestException('Subject is required');
    if (!description) throw new BadRequestException('Description is required');

    const category =
      data.category && VALID_CATEGORIES.includes(data.category as any)
        ? data.category
        : 'general';
    const priority =
      data.priority && VALID_PRIORITIES.includes(data.priority as Priority)
        ? data.priority
        : 'normal';

    return this.prisma.supportTicket.create({
      data: {
        org_id: orgId,
        created_by: userId,
        subject,
        description,
        category,
        priority,
        status: 'open',
      },
    });
  }

  async listOrgTickets(orgId: string, userId: string, status?: string) {
    await this.verifyMembership(orgId, userId);

    const where: any = { org_id: orgId };
    if (status && VALID_STATUSES.includes(status as Status)) {
      where.status = status;
    }

    const [tickets, stats] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        include: {
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        where: { org_id: orgId },
        _count: true,
      }),
    ]);

    return {
      data: tickets,
      stats: stats.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count }),
        {} as Record<string, number>,
      ),
    };
  }

  async getTicketDetail(
    ticketId: string,
    requester: { userId: string; isSuperadmin: boolean },
  ) {
    const ticket = await this.getTicketOrThrow(ticketId);
    if (!requester.isSuperadmin) {
      await this.verifyMembership(ticket.org_id, requester.userId);
    }

    const messages = await this.prisma.supportMessage.findMany({
      where: { ticket_id: ticketId },
      orderBy: { created_at: 'asc' },
    });

    return { ticket, messages };
  }

  async addMessage(
    ticketId: string,
    requester: { userId: string; isSuperadmin: boolean },
    body: string,
  ) {
    const text = body?.trim();
    if (!text) throw new BadRequestException('Message body is required');

    const ticket = await this.getTicketOrThrow(ticketId);
    if (!requester.isSuperadmin) {
      await this.verifyMembership(ticket.org_id, requester.userId);
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: {
          ticket_id: ticketId,
          author_id: requester.userId,
          body: text,
          is_staff_reply: requester.isSuperadmin,
        },
      }),
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          // Bump updated_at; reopen if customer replied after resolution.
          updated_at: new Date(),
          status:
            !requester.isSuperadmin && ticket.status === 'resolved'
              ? 'open'
              : ticket.status,
          resolved_at:
            !requester.isSuperadmin && ticket.status === 'resolved'
              ? null
              : ticket.resolved_at,
        },
      }),
    ]);

    return message;
  }

  // ───────────────────── superadmin ─────────────────────

  async listAllTickets(params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 25;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status && VALID_STATUSES.includes(params.status as Status)) {
      where.status = params.status;
    }
    if (
      params.priority &&
      VALID_PRIORITIES.includes(params.priority as Priority)
    ) {
      where.priority = params.priority;
    }
    if (params.search) {
      where.OR = [
        { subject: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total, stats] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { updated_at: 'desc' }],
        include: {
          organization: { select: { id: true, name: true, plan: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: stats.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count }),
        {} as Record<string, number>,
      ),
    };
  }

  async updateTicket(
    ticketId: string,
    data: { status?: string; priority?: string; assigned_to?: string | null },
  ) {
    await this.getTicketOrThrow(ticketId);

    const patch: any = { updated_at: new Date() };
    if (data.status) {
      if (!VALID_STATUSES.includes(data.status as Status)) {
        throw new BadRequestException('Invalid status');
      }
      patch.status = data.status;
      if (data.status === 'resolved' || data.status === 'closed') {
        patch.resolved_at = new Date();
      } else {
        patch.resolved_at = null;
      }
    }
    if (data.priority) {
      if (!VALID_PRIORITIES.includes(data.priority as Priority)) {
        throw new BadRequestException('Invalid priority');
      }
      patch.priority = data.priority;
    }
    if (data.assigned_to !== undefined) {
      patch.assigned_to = data.assigned_to || null;
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: patch,
    });
  }
}
