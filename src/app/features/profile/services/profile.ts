import { inject, Injectable, signal, computed } from '@angular/core';
import { tap } from 'rxjs';

import { ApiService } from '../../../core/services/api';
import { API_ENDPOINTS } from '../../../constants/api-endpoints';

import { ApiResponse } from '../models/api-response.model';
import { Post, CreatePostRequest } from '../models/post.model';
import { ProfileUser } from '../models/profile.model';
import { UpdateProfileRequest } from '../../../core/model/update-profile.model';

import { cleanObject } from '../../../core/utils/object.util';
import { PostService } from './post';
import { AuthService } from '../../../core/services/auth';

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
  private authService = inject(AuthService);

  // =========================
  // STATE
  // =========================

  private _profile = signal<ProfileUser | null>(null);
  private _posts = signal<Post[]>([]);
  private _isNext = signal<boolean>(false);

  private viewedPosts = new Set<string>();

  // =========================
  // PUBLIC SIGNALS
  // =========================

  readonly profile = this._profile.asReadonly();
  readonly posts = this._posts.asReadonly();
  readonly isNext = this._isNext.asReadonly();

  // ✅ Derive counts from profile (NO duplicate state)

  readonly postsCount = computed(() =>
    this._profile()?.postsCount ?? 0
  );

  readonly followerCount = computed(() =>
    this._profile()?.followerCount ?? 0
  );

  readonly followingCount = computed(() =>
    this._profile()?.followingCount ?? 0
  );

  // =========================
  // LOAD PROFILE + POSTS
  // =========================

loadProfile(userId?: string): void {

  const finalUserId = userId || this.authService.getUserId();
  if (!finalUserId) return;

  this.api
    .get<ApiResponse<{ items: ProfileUser[] }>>(
      API_ENDPOINTS.USER.GET_ALL,
      { _id: finalUserId }
    )
    .subscribe({
      next: (res) => {

        const user = res.data.items?.[0];
        if (!user) return;

        // ✅ DO NOT modify profilePicture
        // It should already be filePath stored in DB

        this._profile.set(user);

        this.loadUserPosts(finalUserId).subscribe();
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
  // UPDATE PROFILE
  // =========================

  updateProfile(payload: UpdateProfileRequest) {

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
        })
      );
  }

  // =========================
  // ADD POST (Optimistic)
  // =========================

  addPostOptimistically(post: Post): void {
    this._posts.update(current => [post, ...current]);
  }

  // =========================
  // UPDATE POST
  // =========================

  updatePost(postId: string, payload: Partial<CreatePostRequest>) {

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
      })
    );
  }

  // =========================
  // DELETE POST (Optimistic)
  // =========================

  deletePost(postId: string): void {

    const previousPosts = this._posts();

    this._posts.update(posts =>
      posts.filter(p => p._id !== postId)
    );

    this.postService.deletePost(postId).subscribe({
      error: () => {
        this._posts.set(previousPosts);
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
  // MARK VIEW
  // =========================

  markPostAsViewed(postId: string): void {

    if (this.viewedPosts.has(postId)) return;

    this.viewedPosts.add(postId);

    this.postService.markView(postId).subscribe(() => {

      this._posts.update(posts =>
        posts.map(p =>
          p._id === postId
            ? { ...p, viewCount: (p.viewCount ?? 0) + 1 }
            : p
        )
      );
    });
  }

  // =========================
  // COMMENT COUNT SYNC
  // =========================

  incrementCommentCount(postId: string): void {
    this._posts.update(posts =>
      posts.map(p =>
        p._id === postId
          ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 }
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
              commentsCount: Math.max((p.commentsCount ?? 1) - 1, 0)
            }
          : p
      )
    );
  }

  // =========================
  // CURRENT PROFILE
  // =========================

  get currentProfile(): ProfileUser | null {
    return this._profile();
  }
}