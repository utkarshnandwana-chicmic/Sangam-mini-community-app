import { inject, Injectable, signal } from '@angular/core';
import { finalize, map, Observable, of, switchMap } from 'rxjs';

import { ApiService } from '../../../core/services/api';
import { API_ENDPOINTS } from '../../../constants/api-endpoints';
import { PostService } from '../../profile/services/post';
import { ApiResponse } from '../../profile/models/api-response.model';
import { Post } from '../../profile/models/post.model';
import { Comment } from '../../profile/models/comment.model';
import { AuthService } from '../../../core/services/auth';
import { ProfileService } from '../../profile/services/profile';

interface FeedResponseData {
  items: Post[];
  isNext: boolean;
}

interface FilteredPage {
  items: Post[];
  rawCount: number;
  isNext: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HomeFeedService {
  private api = inject(ApiService);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);

  private readonly pageSize = 10;

  private _posts = signal<Post[]>([]);
  private _loading = signal(false);
  private _loadingMore = signal(false);
  private _isNext = signal(false);
  private _rawSkip = signal(0);
  private followingUserIds = new Set<string>();
  private _commentsByPost = signal<Record<string, Comment[]>>({});
  private _commentsLoadingByPost = signal<Record<string, boolean>>({});
  private _commentsHasMoreByPost = signal<Record<string, boolean>>({});
  private _repliesByComment = signal<Record<string, Comment[]>>({});
  private _repliesLoadingByComment = signal<Record<string, boolean>>({});

  readonly posts = this._posts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly isNext = this._isNext.asReadonly();
  readonly commentsByPost = this._commentsByPost.asReadonly();
  readonly commentsLoadingByPost = this._commentsLoadingByPost.asReadonly();
  readonly commentsHasMoreByPost = this._commentsHasMoreByPost.asReadonly();
  readonly repliesByComment = this._repliesByComment.asReadonly();
  readonly repliesLoadingByComment = this._repliesLoadingByComment.asReadonly();

  loadInitialFeed(): void {
    this._loading.set(true);
    this._posts.set([]);
    this._isNext.set(false);
    this._rawSkip.set(0);
    this.followingUserIds.clear();

    this.api
      .get<ApiResponse<{ items: Array<{ _id?: string; userId?: string }> }>>(
        API_ENDPOINTS.USER.GET_ALL,
        { isFollowing: true, limit: 1000, skip: 0 }
      )
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: (res) => {
          const followingItems = Array.isArray(res?.data?.items) ? res.data.items : [];
          const ownUserId = String(this.authService.getUserId() ?? '').trim();
          this.followingUserIds = new Set(
            followingItems
              .map((item) => String(item?._id ?? item?.userId ?? '').trim())
              .filter(Boolean)
          );
          if (ownUserId) {
            this.followingUserIds.add(ownUserId);
          }

          if (!this.followingUserIds.size) {
            this._posts.set([]);
            this._isNext.set(false);
            return;
          }

          this.fetchFilteredPage(0).subscribe({
            next: (data) => {
              this._rawSkip.set(data.rawCount);
              this._posts.set(data.items || []);
              this._isNext.set(!!data.isNext);
            },
            error: () => {
              this._posts.set([]);
              this._isNext.set(false);
            }
          });
        },
        error: () => {
          this._posts.set([]);
          this._isNext.set(false);
        }
      });
  }

  loadMoreFeed(): void {
    if (this._loadingMore() || !this._isNext()) return;

    this._loadingMore.set(true);
    const skip = this._rawSkip();

    this.fetchFilteredPage(skip)
      .pipe(finalize(() => this._loadingMore.set(false)))
      .subscribe({
        next: (data) => {
          this._rawSkip.update((current) => current + data.rawCount);
          const existingIds = new Set(this._posts().map((post) => post._id));
          const incoming = (data.items || []).filter((post) => !existingIds.has(post._id));
          this._posts.update((current) => [...current, ...incoming]);
          this._isNext.set(!!data.isNext);
        },
        error: () => {
          // keep existing feed
        }
      });
  }

  toggleLike(post: Post): void {
    const previous = this._posts();
    const postId = post._id;
    const previousLiked = !!post.isLiked;
    const optimisticLiked = !previousLiked;
    const previousLikes = post.likesCount ?? 0;
    const optimisticLikes = optimisticLiked
      ? previousLikes + 1
      : Math.max(previousLikes - 1, 0);

    this.updatePost(postId, { isLiked: optimisticLiked, likesCount: optimisticLikes });

    this.postService.toggleLike(postId).subscribe({
      next: (res) => {
        const backendLiked = !!res?.data?.liked;
        const finalLikes = backendLiked
          ? (previousLiked ? previousLikes : previousLikes + 1)
          : (previousLiked ? Math.max(previousLikes - 1, 0) : previousLikes);

        this.updatePost(postId, { isLiked: backendLiked, likesCount: finalLikes });
      },
      error: () => {
        this._posts.set(previous);
      }
    });
  }

  toggleSave(post: Post): void {
    const previous = this._posts();
    const postId = post._id;
    const optimisticSaved = !post.isSaved;

    this.updatePost(postId, { isSaved: optimisticSaved });

    this.postService.setSavedState(postId, optimisticSaved).subscribe({
      next: (res) => {
        const backendState =
          res?.data?.isSaved ??
          res?.data?.saved;
        const finalState = typeof backendState === 'boolean'
          ? backendState
          : optimisticSaved;

        this.updatePost(postId, { isSaved: finalState });
      },
      error: () => {
        this._posts.set(previous);
      }
    });
  }

  addComment(postId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;

    this.updatePost(postId, {
      commentsCount: (this._posts().find((p) => p._id === postId)?.commentsCount ?? 0) + 1
    });

    this.api
      .post<ApiResponse<Comment>>(
        API_ENDPOINTS.COMMENT.CREATE,
        { postId, content: trimmed }
      )
      .subscribe({
        next: (res) => {
          const user = this.resolveCurrentUser();
          const newComment: Comment = {
            ...res.data,
            user: res?.data?.user ?? user
          };

          this._commentsByPost.update((current) => {
            const existing = current[postId] ?? [];
            return { ...current, [postId]: [newComment, ...existing] };
          });
        },
        error: () => {
          const existing = this._posts().find((p) => p._id === postId);
          if (!existing) return;
          this.updatePost(postId, {
            commentsCount: Math.max((existing.commentsCount ?? 1) - 1, 0)
          });
        }
      });
  }

  addReply(postId: string, commentId: string, content: string): void {
    const trimmed = content.trim();
    if (!trimmed) return;

    this.updatePost(postId, {
      commentsCount: (this._posts().find((p) => p._id === postId)?.commentsCount ?? 0) + 1
    });

    this.api
      .post<ApiResponse<Comment>>(
        API_ENDPOINTS.COMMENT.CREATE,
        { postId, commentId, content: trimmed }
      )
      .subscribe({
        next: (res) => {
          const user = this.resolveCurrentUser();
          const newReply: Comment = {
            ...res.data,
            user: res?.data?.user ?? user
          };

          this._repliesByComment.update((current) => {
            const existing = current[commentId] ?? [];
            return { ...current, [commentId]: [...existing, newReply] };
          });
        },
        error: () => {
          const existing = this._posts().find((p) => p._id === postId);
          if (!existing) return;
          this.updatePost(postId, {
            commentsCount: Math.max((existing.commentsCount ?? 1) - 1, 0)
          });
        }
      });
  }

  loadInitialComments(postId: string): void {
    this._commentsLoadingByPost.update((current) => ({ ...current, [postId]: true }));

    this.api
      .get<ApiResponse<{ items: Comment[] }>>(
        API_ENDPOINTS.COMMENT.GET_ALL,
        { postId, limit: 3, skip: 0 }
      )
      .pipe(finalize(() => {
        this._commentsLoadingByPost.update((current) => ({ ...current, [postId]: false }));
      }))
      .subscribe({
        next: (res) => {
          const items = Array.isArray(res?.data?.items) ? res.data.items : [];
          this._commentsByPost.update((current) => ({ ...current, [postId]: items }));
          this._commentsHasMoreByPost.update((current) => ({ ...current, [postId]: items.length === 3 }));
        },
        error: () => {
          this._commentsByPost.update((current) => ({ ...current, [postId]: [] }));
          this._commentsHasMoreByPost.update((current) => ({ ...current, [postId]: false }));
        }
      });
  }

  loadMoreComments(postId: string): void {
    if (this._commentsLoadingByPost()[postId] || !this._commentsHasMoreByPost()[postId]) return;

    this._commentsLoadingByPost.update((current) => ({ ...current, [postId]: true }));

    const existing = this._commentsByPost()[postId] ?? [];
    const skip = existing.length;

    this.api
      .get<ApiResponse<{ items: Comment[] }>>(
        API_ENDPOINTS.COMMENT.GET_ALL,
        { postId, limit: 3, skip }
      )
      .pipe(finalize(() => {
        this._commentsLoadingByPost.update((current) => ({ ...current, [postId]: false }));
      }))
      .subscribe({
        next: (res) => {
          const incoming = Array.isArray(res?.data?.items) ? res.data.items : [];
          const seen = new Set(existing.map((comment) => comment._id));
          const merged = [...existing, ...incoming.filter((comment) => !seen.has(comment._id))];

          this._commentsByPost.update((current) => ({ ...current, [postId]: merged }));
          this._commentsHasMoreByPost.update((current) => ({ ...current, [postId]: incoming.length === 3 }));
        },
        error: () => {
          // Keep existing comment list.
        }
      });
  }

  loadReplies(postId: string, commentId: string): void {
    this._repliesLoadingByComment.update((current) => ({ ...current, [commentId]: true }));

    this.api
      .get<ApiResponse<{ items: Comment[] }>>(
        API_ENDPOINTS.COMMENT.GET_ALL,
        { postId, commentId, limit: 100, skip: 0 }
      )
      .pipe(finalize(() => {
        this._repliesLoadingByComment.update((current) => ({ ...current, [commentId]: false }));
      }))
      .subscribe({
        next: (res) => {
          const items = Array.isArray(res?.data?.items) ? res.data.items : [];
          this._repliesByComment.update((current) => ({ ...current, [commentId]: items }));
        },
        error: () => {
          this._repliesByComment.update((current) => ({ ...current, [commentId]: [] }));
        }
      });
  }

  toggleCommentLike(postId: string, commentId: string, parentCommentId?: string): void {
    const isReply = !!parentCommentId;
    const source = isReply
      ? (this._repliesByComment()[parentCommentId!] ?? [])
      : (this._commentsByPost()[postId] ?? []);
    const target = source.find((item) => item._id === commentId);
    if (!target) return;

    const originalLiked = !!target.isLiked;
    const originalLikes = target.likesCount ?? 0;
    const optimisticLiked = !originalLiked;
    const optimisticLikes = optimisticLiked ? originalLikes + 1 : Math.max(originalLikes - 1, 0);

    this.patchComment(postId, commentId, {
      isLiked: optimisticLiked,
      likesCount: optimisticLikes
    }, parentCommentId);

    this.api
      .post<{ data: { liked: boolean } }>(
        `${API_ENDPOINTS.COMMENT.LIKE_TOGGLE}/${commentId}`,
        {}
      )
      .subscribe({
        next: (res) => {
          const backendLiked = !!res?.data?.liked;
          const finalLikes = backendLiked
            ? (originalLiked ? originalLikes : originalLikes + 1)
            : (originalLiked ? Math.max(originalLikes - 1, 0) : originalLikes);

          this.patchComment(postId, commentId, {
            isLiked: backendLiked,
            likesCount: finalLikes
          }, parentCommentId);
        },
        error: () => {
          this.patchComment(postId, commentId, {
            isLiked: originalLiked,
            likesCount: originalLikes
          }, parentCommentId);
        }
      });
  }

  deleteComment(postId: string, commentId: string, parentCommentId?: string): void {
    const previousRoots = this._commentsByPost();
    const previousReplies = this._repliesByComment();
    const previousPost = this._posts().find((p) => p._id === postId);

    if (!parentCommentId) {
      const childReplies = this._repliesByComment()[commentId] ?? [];
      this._commentsByPost.update((current) => ({
        ...current,
        [postId]: (current[postId] ?? []).filter((item) => item._id !== commentId)
      }));
      this._repliesByComment.update((current) => {
        const next = { ...current };
        delete next[commentId];
        return next;
      });
      const removedTotal = 1 + childReplies.length;
      this.updatePost(postId, {
        commentsCount: Math.max((previousPost?.commentsCount ?? removedTotal) - removedTotal, 0)
      });
    } else {
      this._repliesByComment.update((current) => ({
        ...current,
        [parentCommentId]: (current[parentCommentId] ?? []).filter((item) => item._id !== commentId)
      }));
      this.updatePost(postId, {
        commentsCount: Math.max((previousPost?.commentsCount ?? 1) - 1, 0)
      });
    }

    this.api
      .delete<ApiResponse<Comment>>(
        `${API_ENDPOINTS.COMMENT.DELETE}/${commentId}`
      )
      .subscribe({
        error: () => {
          this._commentsByPost.set(previousRoots);
          this._repliesByComment.set(previousReplies);
          if (previousPost) {
            this.updatePost(postId, { commentsCount: previousPost.commentsCount });
          }
        }
      });
  }

  private fetchFeed(skip: number) {
    return this.api
      .get<ApiResponse<FeedResponseData>>(
        API_ENDPOINTS.POST.GET_ALL,
        {
          limit: this.pageSize,
          skip,
          sortKey: 'createdAt',
          sortOrder: -1
        }
      )
      .pipe(
        map((res) => ({
          items: (Array.isArray(res?.data?.items) ? res.data.items : []).filter((post) =>
            this.followingUserIds.has(String(post?.userId ?? '').trim())
          ),
          rawCount: Array.isArray(res?.data?.items) ? res.data.items.length : 0,
          isNext: !!res?.data?.isNext
        }))
      );
  }

  private fetchFilteredPage(skip: number): Observable<FilteredPage> {
    return this.fetchFeed(skip).pipe(
      switchMap((page) => {
        if (page.items.length > 0 || !page.isNext || page.rawCount === 0) {
          return of(page);
        }

        const nextSkip = skip + page.rawCount;
        return this.fetchFilteredPage(nextSkip).pipe(
          map((nextPage) => ({
            ...nextPage,
            rawCount: page.rawCount + nextPage.rawCount
          }))
        );
      })
    );
  }

  private updatePost(postId: string, patch: Partial<Post>): void {
    this._posts.update((list) =>
      list.map((post) =>
        post._id === postId ? { ...post, ...patch } : post
      )
    );
  }

  private patchComment(
    postId: string,
    commentId: string,
    patch: Partial<Comment>,
    parentCommentId?: string
  ): void {
    if (parentCommentId) {
      this._repliesByComment.update((current) => ({
        ...current,
        [parentCommentId]: (current[parentCommentId] ?? []).map((item) =>
          item._id === commentId ? { ...item, ...patch } : item
        )
      }));
      return;
    }

    this._commentsByPost.update((current) => ({
      ...current,
      [postId]: (current[postId] ?? []).map((item) =>
        item._id === commentId ? { ...item, ...patch } : item
      )
    }));
  }

  private resolveCurrentUser(): Comment['user'] | undefined {
    const ownId = this.authService.getUserId();
    if (!ownId) return undefined;

    const profile = this.profileService.currentProfile;
    if (profile && profile._id === ownId) {
      return {
        _id: profile._id,
        userName: profile.userName,
        name: profile.name,
        profilePicture: profile.profilePicture
      };
    }

    return {
      _id: ownId,
      userName: 'you',
      name: 'You',
      profilePicture: undefined
    };
  }
}
