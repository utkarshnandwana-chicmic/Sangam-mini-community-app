import { inject, Injectable, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../../core/services/api';
import { API_ENDPOINTS } from '../../../constants/api-endpoints';
import { cleanObject } from '../../../core/utils/object.util';

import { ApiResponse } from '../../profile/models/api-response.model';
import { Comment } from '../models/comment.model';
import { ProfileService } from './profile';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private api = inject(ApiService);
  private profileService = inject(ProfileService);

  /* ================= STATE ================= */

  private _comments = signal<Comment[]>([]);
  private _loading = signal<boolean>(false);

  readonly comments = this._comments.asReadonly();
  readonly loading = this._loading.asReadonly();

  /* ================= LOAD ================= */

  loadComments(postId: string): void {

    this._loading.set(true);

    this.api
      .get<ApiResponse<{ items: Comment[] }>>(
        API_ENDPOINTS.COMMENT.GET_ALL,
        { postId, limit: 1000 }
      )
      .subscribe({
        next: (res) => {

          const rootComments = res.data.items;

          if (!rootComments.length) {
            this._comments.set([]);
            this._loading.set(false);
            return;
          }

          const replyRequests = rootComments.map(comment =>
            this.api.get<ApiResponse<{ items: Comment[] }>>(
              API_ENDPOINTS.COMMENT.GET_ALL,
              {
                postId,
                commentId: comment._id,
                limit: 1000
              }
            )
          );

          forkJoin(replyRequests).subscribe({
            next: (replyResponses) => {

              let allComments: Comment[] = [...rootComments];

              replyResponses.forEach(response => {
                allComments = [
                  ...allComments,
                  ...response.data.items
                ];
              });

              this._comments.set(allComments);
              this._loading.set(false);
            },
            error: () => this._loading.set(false)
          });
        },
        error: () => this._loading.set(false)
      });
  }

  /* ================= CREATE ================= */

  createComment(payload: Partial<Comment>): void {

    const cleaned = cleanObject(payload);

    this.api
      .post<ApiResponse<Comment>>(
        API_ENDPOINTS.COMMENT.CREATE,
        cleaned
      )
      .subscribe({
        next: (res) => {

          const currentUser = this.profileService.currentProfile;

          const newComment: Comment = {
            ...res.data,
            user: currentUser || undefined
          };

          this._comments.update(list => [...list, newComment]);
        }
      });
  }

  /* ================= UPDATE ================= */

  updateComment(commentId: string, payload: Partial<Comment>): void {

    const cleaned = cleanObject(payload);

    this.api
      .put<ApiResponse<Comment>>(
        `${API_ENDPOINTS.COMMENT.UPDATE}/${commentId}`,
        cleaned
      )
      .subscribe({
        next: (res) => {

          const updated = res.data;

          this._comments.update(list =>
            list.map(c =>
              c._id === commentId
                ? { ...c, ...updated }
                : c
            )
          );
        }
      });
  }

  /* ================= DELETE ================= */

  deleteComment(commentId: string): void {

    this.api
      .delete<ApiResponse<Comment>>(
        `${API_ENDPOINTS.COMMENT.DELETE}/${commentId}`
      )
      .subscribe({
        next: () => {
          this._comments.update(list =>
            list.filter(c => c._id !== commentId)
          );
        }
      });
  }

  /* ================= LIKE ================= */

  toggleLike(comment: Comment): void {

    const original = this._comments();

    this._comments.update(list =>
      list.map(c => {
        if (c._id !== comment._id) return c;

        const newLiked = !c.isLiked;

        return {
          ...c,
          isLiked: newLiked,
          likesCount: newLiked
            ? (c.likesCount || 0) + 1
            : Math.max((c.likesCount || 1) - 1, 0)
        };
      })
    );

    this.api
      .post<{ data: { liked: boolean } }>(
        `${API_ENDPOINTS.COMMENT.LIKE_TOGGLE}/${comment._id}`,
        {}
      )
      .subscribe({
        next: (res) => {

          const backendLiked = res.data.liked;

          this._comments.update(list =>
            list.map(c =>
              c._id === comment._id
                ? { ...c, isLiked: backendLiked }
                : c
            )
          );
        },
        error: () => this._comments.set(original)
      });
  }

  /* ================= CLEAR ================= */

  clear(): void {
    this._comments.set([]);
  }
}