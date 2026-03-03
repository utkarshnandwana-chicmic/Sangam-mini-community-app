import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, tap, throwError } from 'rxjs';

import { ApiService } from '../../../core/services/api';
import { API_ENDPOINTS } from '../../../constants/api-endpoints';
import { AuthService } from '../../../core/services/auth';
import { ApiResponse } from '../models/api-response.model';
import { ProfileService } from './profile';

interface FollowActionData {
  userId: string;
  requested: boolean;
}

export interface FollowListUser {
  _id: string;
  userName: string;
  name: string;
  profilePicture?: string;
  privateAccount?: boolean;
  isFollowing?: boolean;
  isRequestedFollowing?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FollowService {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);

  private _followActionLoading = signal<boolean>(false);
  readonly followActionLoading = this._followActionLoading.asReadonly();

  getFollowUsers(
    userId: string,
    listType: 'followers' | 'following'
  ) {
    const ownUserId = this.authService.getUserId();
    const isOwnProfile = !!ownUserId && ownUserId === userId;

    const params = isOwnProfile
      ? (listType === 'followers'
          ? { isFollower: true }
          : { isFollowing: true })
      : (listType === 'followers'
          ? { userId, isFollower: true }
          : { userId, isFollowing: true });

    return this.api
      .get<ApiResponse<{ items: any[] }>>(
        API_ENDPOINTS.USER.GET_ALL,
        params
      )
      .pipe(
        map((res) => {
          const items = Array.isArray(res?.data?.items)
            ? res.data.items
            : [];

          return items
            .map((item: any) => ({
              ...item,
              _id: String(item?._id ?? item?.userId ?? '').trim(),
              userName: String(item?.userName ?? item?.username ?? '').trim(),
              name: String(item?.name ?? item?.fullName ?? '').trim(),
              profilePicture: item?.profilePicture
                ? String(item.profilePicture).trim()
                : undefined,
              privateAccount: !!item?.privateAccount,
              isFollowing: this.resolveIsFollowing(item),
              isRequestedFollowing: this.resolveIsRequestedFollowing(item)
            }))
            .filter((user: FollowListUser) => !!user._id);
        })
      );
  }

  toggleFollowRelation(
    userId: string,
    isFollowing: boolean,
    isRequestedFollowing: boolean
  ) {
    const actionType = isFollowing || isRequestedFollowing ? 0 : 1;

    return this.api.post<ApiResponse<FollowActionData>>(
      API_ENDPOINTS.FOLLOW.FOLLOW,
      {
        userId,
        type: actionType
      }
    );
  }

  adjustOwnFollowingCount(delta: number): void {
    if (!delta) return;

    const current = this.profileService.currentProfile;
    const ownUserId = this.authService.getUserId();
    if (!current || !ownUserId || current._id !== ownUserId) return;

    const nextFollowingCount = Math.max((current.followingCount ?? 0) + delta, 0);

    this.profileService.setCurrentProfile({
      ...current,
      followingCount: nextFollowingCount
    });
  }

  adjustOwnFollowerCount(delta: number): void {
    if (!delta) return;

    const current = this.profileService.currentProfile;
    const ownUserId = this.authService.getUserId();
    if (!current || !ownUserId || current._id !== ownUserId) return;

    const nextFollowerCount = Math.max((current.followerCount ?? 0) + delta, 0);

    this.profileService.setCurrentProfile({
      ...current,
      followerCount: nextFollowerCount
    });
  }

  removeFollower(followerUserId: string) {
    return this.api.delete<ApiResponse<unknown>>(
      `${API_ENDPOINTS.FOLLOW.REMOVE_FOLLOWER}/${followerUserId}`
    );
  }

  toggleFollowUser(userId: string) {
    const current = this.profileService.currentProfile;
    const isSameProfile = !!current && current._id === userId;
    const currentlyFollowing = isSameProfile ? !!current?.isFollowing : false;
    const currentlyRequested = isSameProfile ? !!current?.isRequestedFollowing : false;
    const shouldFollow = !(currentlyFollowing || currentlyRequested);
    const actionType = shouldFollow ? 1 : 0;
    const previousProfile = isSameProfile ? current : null;

    if (isSameProfile && current) {
      const followerCount = current.followerCount ?? 0;
      const optimisticFollowerCount =
        actionType === 1
          ? (currentlyFollowing ? followerCount : followerCount + 1)
          : (currentlyFollowing ? Math.max(followerCount - 1, 0) : followerCount);

      this.profileService.setCurrentProfile({
        ...current,
        isFollowing: actionType === 1 ? !current.privateAccount : false,
        isRequestedFollowing: actionType === 1 ? !!current.privateAccount : false,
        followerCount: optimisticFollowerCount
      });
    }

    this._followActionLoading.set(true);

    return this.api
      .post<ApiResponse<FollowActionData>>(
        API_ENDPOINTS.FOLLOW.FOLLOW,
        {
          userId,
          type: actionType
        }
      )
      .pipe(
        tap((res) => {
          const latest = this.profileService.currentProfile;
          if (!latest || latest._id !== userId) return;

          const requested = !!res.data?.requested;
          const wasFollowing = !!latest.isFollowing;
          const baseFollowerCount = latest.followerCount ?? 0;

          let nextFollowerCount = baseFollowerCount;
          if (actionType === 1 && !requested && !wasFollowing) {
            nextFollowerCount = baseFollowerCount + 1;
          }
          if (actionType === 0 && wasFollowing) {
            nextFollowerCount = Math.max(baseFollowerCount - 1, 0);
          }

          this.profileService.setCurrentProfile({
            ...latest,
            isFollowing: actionType === 1 ? !requested : false,
            isRequestedFollowing: actionType === 1 ? requested : false,
            followerCount: nextFollowerCount
          });
        }),
        catchError((error) => {
          if (previousProfile) {
            this.profileService.setCurrentProfile(previousProfile);
          }
          return throwError(() => error);
        }),
        finalize(() => this._followActionLoading.set(false))
      );
  }

  private resolveIsRequestedFollowing(item: any): boolean {
    if (typeof item?.isRequestedFollowing === 'boolean') {
      return item.isRequestedFollowing;
    }
    return !!item?.following?.requested;
  }

  private resolveIsFollowing(item: any): boolean {
    if (typeof item?.isFollowing === 'boolean') {
      return item.isFollowing;
    }
    const relation = item?.following;
    return !!relation?._id && !relation?.requested;
  }
}
