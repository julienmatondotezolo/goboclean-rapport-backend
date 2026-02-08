import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotificationsService, PushSubscriptionData } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // -------------------------------------------------------------------------
  // POST /notifications/subscribe — Register push subscription
  // -------------------------------------------------------------------------
  @Post('subscribe')
  @ApiOperation({ summary: 'Register a push notification subscription' })
  @ApiResponse({ status: 201, description: 'Subscription registered' })
  async subscribe(
    @CurrentUser() user: any,
    @Body() subscription: PushSubscriptionData,
  ) {
    return this.notificationsService.subscribe(user.id, subscription);
  }

  // -------------------------------------------------------------------------
  // DELETE /notifications/unsubscribe — Remove push subscription
  // -------------------------------------------------------------------------
  @Delete('unsubscribe')
  @ApiOperation({ summary: 'Remove a push notification subscription' })
  @ApiResponse({ status: 200, description: 'Subscription removed' })
  async unsubscribe(
    @CurrentUser() user: any,
    @Body('endpoint') endpoint: string,
  ) {
    return this.notificationsService.unsubscribe(user.id, endpoint);
  }

  // -------------------------------------------------------------------------
  // GET /notifications — Get in-app notifications
  // -------------------------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'Get in-app notifications (recent 50 + unread count)' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved' })
  async getNotifications(@CurrentUser() user: any) {
    return this.notificationsService.getNotifications(user.id);
  }

  // -------------------------------------------------------------------------
  // PATCH /notifications/:id/read — Mark notification as read
  // -------------------------------------------------------------------------
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }
}
