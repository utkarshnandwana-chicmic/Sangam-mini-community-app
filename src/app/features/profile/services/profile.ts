import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, finalize, switchMap, tap } from 'rxjs';

import { ApiService } from '../../../core/services/api';
import { API_ENDPOINTS } from '../../../constants/api-endpoints';

import { ApiResponse } from '../models/api-response.model';
import { Post } from '../models/post.model';
import { ProfileUser } from '../models/profile.model';
import { UpdateProfileRequest } from '../../../core/model/update-profile.model';
import { cleanObject } from '../../../core/utils/object.util';

interface PaginatedPosts {
  items: Post[];
  isNext: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private api = inject(ApiService);

  // =========================
  // STATE
  // =========================

  private profileSubject = new BehaviorSubject<ProfileUser | null>(null);
  private postsSubject = new BehaviorSubject<Post[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private isNextSubject = new BehaviorSubject<boolean>(false);

  private followerCountSubject = new BehaviorSubject<number>(0);
  private followingCountSubject = new BehaviorSubject<number>(0);
  private postsCountSubject = new BehaviorSubject<number>(0);

  private viewedPosts = new Set<string>();

  // =========================
  // PUBLIC STREAMS
  // =========================

  readonly profile$ = this.profileSubject.asObservable();
  readonly posts$ = this.postsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly isNext$ = this.isNextSubject.asObservable();

  readonly followerCount$ = this.followerCountSubject.asObservable();
  readonly followingCount$ = this.followingCountSubject.asObservable();
  readonly postsCount$ = this.postsCountSubject.asObservable();

  // =========================
  // LOAD PROFILE + POSTS
  // =========================

loadProfile(): void {

  this.loadingSubject.next(true);
  this.errorSubject.next(null);

  this.api
    .get<ApiResponse<ProfileUser>>(API_ENDPOINTS.USER.DETAILS)
    .pipe(
      switchMap((res) => {

        const profile = res.data;
        this.profileSubject.next(profile);

        this.loadCounts(profile._id);

        return this.loadUserPosts(profile._id);
      }),
      finalize(() => this.loadingSubject.next(false))
    )
    .subscribe({
      error: () => {
        this.errorSubject.next('Failed to load profile.');
      }
    });
}


  // =========================
  // LOAD USER POSTS
  // =========================

private loadUserPosts(userId: string) {

  const params = {
    userId,
    limit: 12,
    skip: 0,
    sortKey: 'createdAt',
    sortOrder: -1,
    postType: 1
  };

  return this.api
    .get<ApiResponse<PaginatedPosts>>(
      API_ENDPOINTS.POST.GET_ALL,
      params
    )
    .pipe(
      tap((res) => {
        console.log('POSTS LOADED:', res.data.items);

        this.postsSubject.next(res.data.items);
        this.isNextSubject.next(res.data.isNext);
      })
    );
}


  // =========================
  // LOAD COUNTS
  // =========================

  loadCounts(userId: string): void {

    this.api
      .get<ApiResponse<{ items: any[] }>>(
        API_ENDPOINTS.USER.GET_ALL,
        { _id: userId }
      )
      .subscribe({
        next: (res) => {

          const user = res.data.items[0];

          this.followerCountSubject.next(user?.followerCount ?? 0);
          this.followingCountSubject.next(user?.followingCount ?? 0);
          this.postsCountSubject.next(user?.postsCount ?? 0);
        }
      });
  }

// =========================
// UPDATE PROFILE
// =========================

updateProfile(payload: UpdateProfileRequest) {

  this.loadingSubject.next(true);
  this.errorSubject.next(null);

  const cleanedPayload = cleanObject(payload);

  return this.api
    .put<ApiResponse<ProfileUser>>(
      API_ENDPOINTS.USER.UPDATE, 
      cleanedPayload
    )
    .pipe(
      tap((res) => {

        const updatedUser = res.data;
        const current = this.profileSubject.value;

        if (current) {
          this.profileSubject.next({
            ...current,
            ...updatedUser
          });
        }

      }),
      finalize(() => this.loadingSubject.next(false))
    );
}



  // =========================
  // LIKE TOGGLE
  // =========================

  toggleLike(post: Post): void {

    // 1️⃣ Optimistic update
    const updatedPosts = this.postsSubject.value.map(p => {

      if (p._id !== post._id) return p;

      const newLiked = !p.isLiked;

      return {
        ...p,
        isLiked: newLiked,
        likesCount: newLiked
          ? p.likesCount + 1
          : p.likesCount - 1
      };
    });

    this.postsSubject.next(updatedPosts);

    // 2️⃣ Backend call
    this.api
      .post<{ data: { liked: boolean } }>(
        `${API_ENDPOINTS.POST.LIKE_TOGGLE}/${post._id}`,
        {}
      )
      .subscribe({
        next: (res) => {

          const backendLiked = res.data.liked;

          const syncedPosts = this.postsSubject.value.map(p =>
            p._id === post._id
              ? { ...p, isLiked: backendLiked }
              : p
          );

          this.postsSubject.next(syncedPosts);
        },
        error: () => {
          // rollback
          this.loadProfile();
        }
      });
  }

  // =========================
  // MARK POST AS VIEWED
  // =========================

  markPostAsViewed(postId: string): void {

    if (this.viewedPosts.has(postId)) return;

    this.viewedPosts.add(postId);

    this.api
      .post(`${API_ENDPOINTS.POST.VIEW}/${postId}`, {})
      .subscribe(() => {

        const updatedPosts = this.postsSubject.value.map(p =>
          p._id === postId
            ? { ...p, viewCount: p.viewCount + 1 }
            : p
        );

        this.postsSubject.next(updatedPosts);
      });
  }

}
