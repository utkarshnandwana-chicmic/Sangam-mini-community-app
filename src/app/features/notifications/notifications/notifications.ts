import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { NotificationsService } from '../notifications.service';
import { AppNotification } from '../notifications.model';
import { ImageUrlPipe } from '../../../core/pipes/image-url-pipe';
import { IN_APP_NOTIFICATION_TYPE } from '../../../constants/in-app-notification-type';
import { FollowService } from '../../profile/services/follow';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, ImageUrlPipe],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent {
  private notificationsService = inject(NotificationsService);
  private followService = inject(FollowService);
  private authService = inject(AuthService);
  private router = inject(Router);

  requests = this.notificationsService.requests;
  notifications = this.notificationsService.notifications;
  loading = this.notificationsService.loading;
  notificationsLoading = this.notificationsService.notificationsLoading;
  senderFollowActionLoading = signal<Record<string, boolean>>({});

  constructor() {
    this.notificationsService.loadFollowRequests();
    this.notificationsService.loadAllNotifications();
  }

  trackByNotificationId(index: number, item: AppNotification): string {
    return item._id || String(index);
  }

  get allFeedNotifications(): AppNotification[] {
    return this.notifications().filter(
      (item) => item.type !== IN_APP_NOTIFICATION_TYPE['FOLLOW_REQUEST']
    );
  }

  isActionLoading(notificationId: string): boolean {
    return this.notificationsService.isActionLoading(notificationId);
  }

  onAccept(event: Event, notification: AppNotification): void {
    event.stopPropagation();
    this.notificationsService.actOnFollowRequest(notification, true);
  }

  onReject(event: Event, notification: AppNotification): void {
    event.stopPropagation();
    this.notificationsService.actOnFollowRequest(notification, false);
  }

  isSenderFollowActionLoading(notificationId: string): boolean {
    return !!this.senderFollowActionLoading()[notificationId];
  }

  canShowFollowButton(notification: AppNotification): boolean {
    const senderId = String(notification?.sender?._id ?? notification?.senderId ?? '').trim();
    const ownUserId = this.authService.getUserId();
    if (!senderId || (ownUserId && ownUserId === senderId)) return false;

    const type = notification?.type;
    return type === IN_APP_NOTIFICATION_TYPE['FOLLOW'] ||
      type === IN_APP_NOTIFICATION_TYPE['FOLLOW_REQUEST_ACCEPTED'];
  }

  followButtonLabel(notification: AppNotification): string {
    const sender = notification?.sender;
    if (sender?.isFollowing) return 'Following';
    if (sender?.isRequestedFollowing) return 'Requested';
    return 'Follow';
  }

  onToggleFollowFromNotification(event: Event, notification: AppNotification): void {
    event.stopPropagation();

    const notificationId = String(notification?._id ?? '').trim();
    const senderId = String(notification?.sender?._id ?? notification?.senderId ?? '').trim();
    if (!notificationId || !senderId || this.isSenderFollowActionLoading(notificationId)) return;

    const previousFollowing = !!notification?.sender?.isFollowing;
    const previousRequested = !!notification?.sender?.isRequestedFollowing;

    this.senderFollowActionLoading.update((state) => ({ ...state, [notificationId]: true }));

    this.followService
      .toggleFollowRelation(senderId, previousFollowing, previousRequested)
      .pipe(finalize(() => {
        this.senderFollowActionLoading.update((state) => ({ ...state, [notificationId]: false }));
      }))
      .subscribe({
        next: (res) => {
          const shouldFollow = !(previousFollowing || previousRequested);
          const requested = !!res?.data?.requested;

          this.notificationsService.setNotificationSenderFollowState(
            notificationId,
            shouldFollow ? !requested : false,
            shouldFollow ? requested : false
          );
        }
      });
  }

  notificationTypeLabel(type: number): string {
    switch (type) {
      case 1: return 'Follow';
      case 2: return 'Follow Request';
      case 3: return 'Request Accepted';
      case 4: return 'Post Like';
      case 5: return 'Comment';
      case 6: return 'Reply';
      case 7: return 'Message';
      default: return `Type ${type}`;
    }
  }

  notificationIcon(type: number): string {
    switch (type) {
      case 1:
      case 2:
      case 3:
        return '👤';
      case 4:
      case 12:
      case 23:
        return '❤️';
      case 5:
      case 6:
        return '💬';
      case 7:
        return '✉️';
      default:
        return '🔔';
    }
  }

  goToSender(notification: AppNotification): void {
    const senderId = String(notification?.sender?._id ?? notification?.senderId ?? '').trim();
    if (!senderId) return;
    this.router.navigate(['/profile', senderId]);
  }
}
