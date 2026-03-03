import { inject, Injectable, signal } from '@angular/core';
import { finalize, map } from 'rxjs';

import { ApiService } from '../../core/services/api';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { IN_APP_NOTIFICATION_TYPE } from '../../constants/in-app-notification-type';
import { ApiResponse } from '../profile/models/api-response.model';
import { AppNotification } from './notifications.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private api = inject(ApiService);

  private _requests = signal<AppNotification[]>([]);
  private _notifications = signal<AppNotification[]>([]);
  private _loading = signal(false);
  private _notificationsLoading = signal(false);
  private _actionLoading = signal<Record<string, boolean>>({});

  readonly requests = this._requests.asReadonly();
  readonly notifications = this._notifications.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly notificationsLoading = this._notificationsLoading.asReadonly();
  readonly actionLoading = this._actionLoading.asReadonly();

  loadFollowRequests(): void {
    this._loading.set(true);

    this.api
      .get<ApiResponse<{ items: AppNotification[] }>>(
        API_ENDPOINTS.NOTIFICATION.BASE,
        { type: IN_APP_NOTIFICATION_TYPE['FOLLOW_REQUEST'] }
      )
      .pipe(
        map((res) => (Array.isArray(res?.data?.items) ? res.data.items : [])),
        finalize(() => this._loading.set(false))
      )
      .subscribe({
        next: (items) => this._requests.set(items),
        error: () => this._requests.set([])
      });
  }

  loadAllNotifications(): void {
    this._notificationsLoading.set(true);

    this.api
      .get<ApiResponse<{ items: AppNotification[] }>>(
        API_ENDPOINTS.NOTIFICATION.BASE,
        { limit: 50, skip: 0 }
      )
      .pipe(
        map((res) => (Array.isArray(res?.data?.items) ? res.data.items : [])),
        finalize(() => this._notificationsLoading.set(false))
      )
      .subscribe({
        next: (items) => this._notifications.set(items),
        error: () => this._notifications.set([])
      });
  }

  setNotificationSenderFollowState(
    notificationId: string,
    isFollowing: boolean,
    isRequestedFollowing: boolean
  ): void {
    this._notifications.update((list) =>
      list.map((item) =>
        item._id === notificationId
          ? {
              ...item,
              sender: item.sender
                ? {
                    ...item.sender,
                    isFollowing,
                    isRequestedFollowing
                  }
                : item.sender
            }
          : item
      )
    );
  }

  isActionLoading(notificationId: string): boolean {
    return !!this._actionLoading()[notificationId];
  }

  actOnFollowRequest(notification: AppNotification, accept: boolean) {
    const notificationId = String(notification?._id ?? '').trim();
    const senderUserId = String(notification?.sender?._id ?? notification?.senderId ?? '').trim();

    if (!notificationId || !senderUserId || this.isActionLoading(notificationId)) {
      return;
    }

    const previous = this._requests();

    this._requests.update((current) => current.filter((item) => item._id !== notificationId));
    this._actionLoading.update((state) => ({ ...state, [notificationId]: true }));

    this.api
      .post<ApiResponse<{ userId: string; accepted: boolean }>>(
        API_ENDPOINTS.FOLLOW.REQUEST_ACTION,
        {
          userId: senderUserId,
          type: accept
        }
      )
      .pipe(finalize(() => {
        this._actionLoading.update((state) => ({ ...state, [notificationId]: false }));
      }))
      .subscribe({
        error: () => this._requests.set(previous)
      });
  }
}
