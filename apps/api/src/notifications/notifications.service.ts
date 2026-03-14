import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType =
  | 'invoice_sent'
  | 'payment_received'
  | 'invoice_overdue'
  | 'low_stock'
  | 'gst_deadline'
  | 'system';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new in-app notification.
   */
  async create(
    orgId: string,
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    link?: string,
    data?: Record<string, any>,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        org_id: orgId,
        user_id: userId,
        type,
        title,
        body: body || null,
        link: link || null,
        data: data || null,
        channel: 'in_app',
        is_read: false,
      },
    });

    this.logger.log(`Notification created: ${type} for user ${userId}`);
    return notification;
  }

  /**
   * Get unread notifications for a user.
   */
  async getUnread(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  /**
   * Get all notifications with pagination.
   */
  async getAll(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { user_id: userId },
      }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark a single notification as read.
   */
  async markRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: { is_read: true },
    });

    return { updated: result.count };
  }

  /**
   * Get unread notification count (for badge).
   */
  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    return { count };
  }
}
