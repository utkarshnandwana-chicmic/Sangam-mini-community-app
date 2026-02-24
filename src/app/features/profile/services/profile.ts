import { inject, Injectable, signal } from '@angular/core';
import { finalize, switchMap, tap } from 'rxjs';

import { ApiService } from '../../../core/services/api';
import { API_ENDPOINTS } from '../../../constants/api-endpoints';

import { ApiResponse } from '../models/api-response.model';
import { Post, CreatePostRequest } from '../models/post.model';
import { ProfileUser } from '../models/profile.model';
import { UpdateProfileRequest } from '../../../core/model/update-profile.model';

import { cleanObject } from '../../../core/utils/object.util';
import { PostService } from './post';

interface PaginatedPosts {
  items: Post[];
  isNext: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private api = inject(ApiService);
  private postService = inject(PostService);

  // =========================
  // STATE (Signals)
  // =========================

  private _profile = signal<ProfileUser | null>(null);
  private _posts = signal<Post[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _isNext = signal<boolean>(false);

  private _followerCount = signal<number>(0);
  private _followingCount = signal<number>(0);
  private _postsCount = signal<number>(0);

  private viewedPosts = new Set<string>();

  // =========================
  // PUBLIC READONLY SIGNALS
  // =========================

  readonly profile = this._profile.asReadonly();
  readonly posts = this._posts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isNext = this._isNext.asReadonly();

  readonly followerCount = this._followerCount.asReadonly();
  readonly followingCount = this._followingCount.asReadonly();
  readonly postsCount = this._postsCount.asReadonly();

  // =========================
  // LOAD PROFILE + POSTS
  // =========================

  loadProfile(): void {

    this._loading.set(true);
    this._error.set(null);

    this.api
      .get<ApiResponse<ProfileUser>>(API_ENDPOINTS.USER.DETAILS)
      .pipe(
        switchMap((res) => {

          const profile = res.data;
          this._profile.set(profile);

          this.loadCounts(profile._id);

          return this.loadUserPosts(profile._id);
        }),
        finalize(() => this._loading.set(false))
      )
      .subscribe({
        error: () => {
          this._error.set('Failed to load profile.');
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
          this._posts.set(res.data.items);
          this._isNext.set(res.data.isNext);
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

          this._followerCount.set(user?.followerCount ?? 0);
          this._followingCount.set(user?.followingCount ?? 0);
          this._postsCount.set(user?.postsCount ?? 0);
        }
      });
  }

  // =========================
  // UPDATE PROFILE
  // =========================

  updateProfile(payload: UpdateProfileRequest) {

    this._loading.set(true);
    this._error.set(null);

    const cleanedPayload = cleanObject(payload);

    return this.api
      .put<ApiResponse<ProfileUser>>(
        API_ENDPOINTS.USER.UPDATE,
        cleanedPayload
      )
      .pipe(
        tap((res) => {

          const updatedUser = res.data;
          const current = this._profile();

          if (current) {
            this._profile.set({
              ...current,
              ...updatedUser
            });
          }
        }),
        finalize(() => this._loading.set(false))
      );
  }

  // =========================
  // ADD POST (Optimistic Insert)
  // =========================

  addPostOptimistically(post: Post): void {

    this._posts.update(current => [
      post,
      ...current
    ]);

    this._postsCount.update(count => count + 1);
  }

  // =========================
  // UPDATE POST
  // =========================

  updatePost(postId: string, payload: Partial<CreatePostRequest>) {

    this._loading.set(true);
    this._error.set(null);

    return this.postService.updatePost(postId, payload).pipe(
      tap((res) => {

        const updatedPost = res.data;

        this._posts.update(posts =>
          posts.map(p =>
            p._id === postId
              ? { ...p, ...updatedPost }
              : p
          )
        );
      }),
      finalize(() => this._loading.set(false))
    );
  }

  // =========================
// DELETE POST (Optimistic)
// =========================

deletePost(postId: string): void {

  const previousPosts = this._posts();
  const previousCount = this._postsCount();

  // Optimistically remove from UI
  this._posts.update(posts =>
    posts.filter(p => p._id !== postId)
  );

  this._postsCount.update(count =>
    Math.max(count - 1, 0)
  );

  this.postService.deletePost(postId).subscribe({
    error: () => {
      // Rollback if API fails
      this._posts.set(previousPosts);
      this._postsCount.set(previousCount);
    }
  });
}

  // =========================
  // LIKE TOGGLE (Optimistic)
  // =========================

  toggleLike(post: Post): void {

    const previousPosts = this._posts();

    const updatedPosts = previousPosts.map(p => {
      if (p._id !== post._id) return p;

      const newLiked = !p.isLiked;

      return {
        ...p,
        isLiked: newLiked,
        likesCount: newLiked
          ? (p.likesCount ?? 0) + 1
          : Math.max((p.likesCount ?? 1) - 1, 0)
      };
    });

    this._posts.set(updatedPosts);

    this.postService.toggleLike(post._id).subscribe({
      next: (res) => {

        const backendLiked = res.data.liked;

        this._posts.update(posts =>
          posts.map(p =>
            p._id === post._id
              ? { ...p, isLiked: backendLiked }
              : p
          )
        );
      },
      error: () => {
        this._posts.set(previousPosts);
      }
    });
  }

  // =========================
  // COMMENT COUNT SYNC
  // =========================

  incrementCommentCount(postId: string): void {

    this._posts.update(posts =>
      posts.map(p =>
        p._id === postId
          ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
          : p
      )
    );
  }

  decrementCommentCount(postId: string): void {

    this._posts.update(posts =>
      posts.map(p =>
        p._id === postId
          ? {
              ...p,
              commentsCount: Math.max((p.commentsCount || 1) - 1, 0)
            }
          : p
      )
    );
  }

  // =========================
  // MARK POST AS VIEWED
  // =========================

  markPostAsViewed(postId: string): void {

    if (this.viewedPosts.has(postId)) return;

    this.viewedPosts.add(postId);

    this.postService.markView(postId).subscribe(() => {

      this._posts.update(posts =>
        posts.map(p =>
          p._id === postId
            ? { ...p, viewCount: p.viewCount + 1 }
            : p
        )
      );
    });
  }

  // =========================
  // GET CURRENT PROFILE
  // =========================

  get currentProfile(): ProfileUser | null {
    return this._profile();
  }
}