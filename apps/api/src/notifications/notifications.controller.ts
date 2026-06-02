import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List notifications with pagination',
    description:
      'Returns the authenticated user\'s notifications (newest first) with type, title, body, link, and read state. Pagination via `page` and `limit` (default 20). Scoped to the calling user — the org-id header is required for routing but the list is per-user.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.getAll(userId, page, limit);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count for badge',
    description:
      'Returns just the integer count of unread notifications for the current user — cheap to poll from the topbar bell icon without fetching the full list.',
  })
  async getUnreadCount(@CurrentUser('sub') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark a notification as read',
    description:
      'Flips `is_read` to true on a single notification and stamps the read time. No-op if the notification is already marked read. Returns the updated record.',
  })
  async markRead(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(id, userId);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description:
      'Bulk-marks every unread notification for the current user as read. Returns the number of rows updated. Use to clear the bell badge when the user opens the notifications drawer.',
  })
  async markAllRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
