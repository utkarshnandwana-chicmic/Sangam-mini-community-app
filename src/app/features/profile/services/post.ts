import { Injectable } from '@angular/core';
import { ApiService } from '../../../core/services/api';
import { API_ENDPOINTS } from '../../../constants/api-endpoints';

import { CreatePostRequest, Post } from '../models/post.model';
import { ApiResponse } from '../models/api-response.model';
import { cleanObject } from '../../../core/utils/object.util';

interface SaveToggleApiResponse {
  data?: {
    isSaved?: boolean;
    saved?: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class PostService {

  constructor(private api: ApiService) {}

  // =========================
  // CREATE POST
  // =========================

  createPost(payload: CreatePostRequest) {
    return this.api.post<ApiResponse<Post>>(
      API_ENDPOINTS.POST.CREATE,
      payload
    );
  }

  // =========================
  // UPDATE POST
  // =========================

  updatePost(postId: string, payload: Partial<CreatePostRequest>) {

    const cleanedPayload = cleanObject(payload);

    return this.api.put<ApiResponse<Post>>(
      `${API_ENDPOINTS.POST.UPDATE}/${postId}`,
      cleanedPayload
    );
  }

  // =========================
  // LIKE TOGGLE
  // =========================

  toggleLike(postId: string) {
    return this.api.post<{ data: { liked: boolean } }>(
      `${API_ENDPOINTS.POST.LIKE_TOGGLE}/${postId}`,
      {}
    );
  }

  // =========================
  // SAVE TOGGLE  ✅ NEW
  // =========================

  setSavedState(postId: string, shouldSave: boolean) {
    return this.api.post<SaveToggleApiResponse>(
      `${API_ENDPOINTS.POST.SAVE}/${postId}`,
      {}
    );
  }

  // =========================
  // GET POSTS (Reusable)
  // =========================

  getPosts(params?: {
    userId?: string;
    isSaved?: boolean;
    page?: number;
    limit?: number;
  }) {

    const cleanedParams = cleanObject(params || {});

return this.api.get<ApiResponse<{
  items: Post[];
  isNext: boolean;
}>>(
  API_ENDPOINTS.POST.GET_ALL,
  cleanedParams
);
  }

  // =========================
  // MARK VIEW
  // =========================

  markView(postId: string) {
    return this.api.post(
      `${API_ENDPOINTS.POST.VIEW}/${postId}`,
      {}
    );
  }

  // =========================
  // DELETE POST (Future Safe)
  // =========================

  deletePost(postId: string) {
    return this.api.delete(
      `${API_ENDPOINTS.POST.DELETE}/${postId}`
    );
  }
}
