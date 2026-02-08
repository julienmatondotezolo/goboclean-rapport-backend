import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import * as webpush from 'web-push';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private vapidConfigured = false;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const vapidSubject = this.configService.get<string>('VAPID_SUBJECT') || 'mailto:contact@goboclean.be';

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      this.vapidConfigured = true;
      this.logger.log('VAPID keys configured for Web Push');
    } else {
      this.logger.warn('VAPID keys not configured — push notifications will be skipped');
    }
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIBE
  // ---------------------------------------------------------------------------
  async subscribe(userId: string, subscription: PushSubscriptionData) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        { onConflict: 'user_id,endpoint' },
      )
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to save push subscription: ${error.message}`);
      throw error;
    }

    this.logger.log(`Push subscription saved for user ${userId}`);
    return { success: true, subscription: data };
  }

  // ---------------------------------------------------------------------------
  // UNSUBSCRIBE
  // ---------------------------------------------------------------------------
  async unsubscribe(userId: string, endpoint: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    if (error) {
      this.logger.error(`Failed to remove push subscription: ${error.message}`);
      throw error;
    }

    this.logger.log(`Push subscription removed for user ${userId}`);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // GET IN-APP NOTIFICATIONS
  // ---------------------------------------------------------------------------
  async getNotifications(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      this.logger.error(`Failed to fetch notifications: ${error.message}`);
      throw error;
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return {
      notifications: notifications || [],
      unread_count: unreadCount || 0,
    };
  }

  // ---------------------------------------------------------------------------
  // MARK AS READ
  // ---------------------------------------------------------------------------
  async markAsRead(userId: string, notificationId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    return data;
  }

  // ---------------------------------------------------------------------------
  // CREATE IN-APP + SEND PUSH
  // ---------------------------------------------------------------------------
  async createAndSendNotification(
    userId: string,
    title: string,
    body: string,
    type: string,
    missionId?: string,
  ) {
    const supabase = this.supabaseService.getClient();

    // 1. Create in-app notification
    const insertData: any = {
      user_id: userId,
      title,
      body,
      type,
    };

    if (missionId) {
      insertData.mission_id = missionId;
    }

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(insertData);

    if (insertError) {
      this.logger.error(`Failed to create notification: ${insertError.message}`);
    }

    // 2. Send Web Push to all subscriptions of this user
    await this.sendPushToUser(userId, title, body, missionId);
  }

  // ---------------------------------------------------------------------------
  // SEND PUSH TO USER (all devices)
  // ---------------------------------------------------------------------------
  private async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    missionId?: string,
  ) {
    if (!this.vapidConfigured) {
      this.logger.warn('Skipping push notification — VAPID not configured');
      return;
    }

    const supabase = this.supabaseService.getClient();

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (!subscriptions || subscriptions.length === 0) {
      this.logger.debug(`No push subscriptions for user ${userId}`);
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        missionId,
        url: missionId ? `/mission/${missionId}` : '/dashboard',
      },
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
        );
        this.logger.debug(`Push sent to ${sub.endpoint.slice(0, 50)}...`);
      } catch (err: any) {
        this.logger.error(`Push failed for ${sub.endpoint.slice(0, 50)}...: ${err.message}`);

        // Remove expired/invalid subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
          this.logger.log(`Removed expired push subscription ${sub.id}`);
        }
      }
    }
  }
}
