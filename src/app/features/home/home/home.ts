import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { HomeFeedService } from './home-feed.service';
import { Post } from '../../profile/models/post.model';
import { Comment } from '../../profile/models/comment.model';
import { ImageUrlPipe } from '../../../core/pipes/image-url-pipe';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUrlPipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  private feedService = inject(HomeFeedService);
  private authService = inject(AuthService);
  private router = inject(Router);

  posts = this.feedService.posts;
  loading = this.feedService.loading;
  loadingMore = this.feedService.loadingMore;
  isNext = this.feedService.isNext;
  commentsByPost = this.feedService.commentsByPost;
  commentsLoadingByPost = this.feedService.commentsLoadingByPost;
  commentsHasMoreByPost = this.feedService.commentsHasMoreByPost;
  repliesByComment = this.feedService.repliesByComment;
  repliesLoadingByComment = this.feedService.repliesLoadingByComment;
  commentDrafts = signal<Record<string, string>>({});
  commentComposerOpen = signal<Record<string, boolean>>({});
  commentPreviewOpen = signal<Record<string, boolean>>({});
  replyComposerOpen = signal<Record<string, boolean>>({});
  replyDrafts = signal<Record<string, string>>({});
  repliesOpen = signal<Record<string, boolean>>({});
  mediaIndex = signal<Record<string, number>>({});

  constructor() {
    this.feedService.loadInitialFeed();
  }

  trackByPostId(index: number, post: Post): string {
    return post._id || String(index);
  }

  firstMedia(post: Post) {
    return post.media?.[0] ?? null;
  }

  locationText(post: Post): string {
    const postAny = post as any;
    return String(postAny?.address ?? postAny?.locationName ?? postAny?.placeName ?? '').trim();
  }

  currentMedia(post: Post) {
    const media = post.media ?? [];
    if (!media.length) return null;
    const index = this.mediaIndex()[post._id] ?? 0;
    return media[index] ?? media[0];
  }

  hasMultipleMedia(post: Post): boolean {
    return (post.media?.length ?? 0) > 1;
  }

  nextMedia(event: Event, post: Post): void {
    event.stopPropagation();
    const total = post.media?.length ?? 0;
    if (total < 2) return;

    this.mediaIndex.update((current) => {
      const index = current[post._id] ?? 0;
      return { ...current, [post._id]: (index + 1) % total };
    });
  }

  prevMedia(event: Event, post: Post): void {
    event.stopPropagation();
    const total = post.media?.length ?? 0;
    if (total < 2) return;

    this.mediaIndex.update((current) => {
      const index = current[post._id] ?? 0;
      return { ...current, [post._id]: (index - 1 + total) % total };
    });
  }

  onToggleLike(post: Post): void {
    this.feedService.toggleLike(post);
  }

  goToUserProfile(event: Event, userId?: string): void {
    event.stopPropagation();
    const id = String(userId ?? '').trim();
    if (!id) return;
    this.router.navigate(['/profile', id]);
  }

  onToggleSave(post: Post): void {
    const isOwnPost = post.userId === this.authService.getUserId();
    if (isOwnPost && !post.isSaved) return;
    this.feedService.toggleSave(post);
  }

  toggleCommentComposer(postId: string): void {
    this.commentComposerOpen.update((current) => ({
      ...current,
      [postId]: !current[postId]
    }));
  }

  toggleCommentsPreview(postId: string): void {
    const isOpen = !!this.commentPreviewOpen()[postId];
    this.commentPreviewOpen.update((current) => ({
      ...current,
      [postId]: !isOpen
    }));

    if (!isOpen && !this.commentsByPost()[postId]) {
      this.feedService.loadInitialComments(postId);
    }
  }

  updateCommentDraft(postId: string, value: string): void {
    this.commentDrafts.update((current) => ({
      ...current,
      [postId]: value
    }));
  }

  commentDraft(postId: string): string {
    return this.commentDrafts()[postId] ?? '';
  }

  submitComment(postId: string): void {
    const content = this.commentDraft(postId).trim();
    if (!content) return;

    this.feedService.addComment(postId, content);
    this.commentDrafts.update((current) => ({
      ...current,
      [postId]: ''
    }));
  }

  loadMore(): void {
    this.feedService.loadMoreFeed();
  }

  commentsForPost(postId: string): Comment[] {
    return this.commentsByPost()[postId] ?? [];
  }

  isCommentsLoading(postId: string): boolean {
    return !!this.commentsLoadingByPost()[postId];
  }

  hasMoreComments(postId: string): boolean {
    return !!this.commentsHasMoreByPost()[postId];
  }

  loadMoreComments(postId: string): void {
    this.feedService.loadMoreComments(postId);
  }

  repliesForComment(commentId: string): Comment[] {
    return this.repliesByComment()[commentId] ?? [];
  }

  isRepliesLoading(commentId: string): boolean {
    return !!this.repliesLoadingByComment()[commentId];
  }

  toggleReplies(postId: string, commentId: string): void {
    const isOpen = !!this.repliesOpen()[commentId];
    this.repliesOpen.update((current) => ({
      ...current,
      [commentId]: !isOpen
    }));

    if (!isOpen && !this.repliesByComment()[commentId]) {
      this.feedService.loadReplies(postId, commentId);
    }
  }

  toggleReplyComposer(commentId: string): void {
    this.replyComposerOpen.update((current) => ({
      ...current,
      [commentId]: !current[commentId]
    }));
  }

  replyDraft(commentId: string): string {
    return this.replyDrafts()[commentId] ?? '';
  }

  updateReplyDraft(commentId: string, value: string): void {
    this.replyDrafts.update((current) => ({
      ...current,
      [commentId]: value
    }));
  }

  submitReply(postId: string, commentId: string): void {
    const content = this.replyDraft(commentId).trim();
    if (!content) return;

    this.feedService.addReply(postId, commentId, content);
    this.replyDrafts.update((current) => ({
      ...current,
      [commentId]: ''
    }));
    this.replyComposerOpen.update((current) => ({
      ...current,
      [commentId]: false
    }));
    this.repliesOpen.update((current) => ({
      ...current,
      [commentId]: true
    }));
  }

  canDeleteComment(post: Post, comment: Comment): boolean {
    const currentUserId = this.authService.getUserId();
    if (!currentUserId) return false;
    return comment.userId === currentUserId || post.userId === currentUserId;
  }

  toggleCommentLike(postId: string, comment: Comment, parentCommentId?: string): void {
    this.feedService.toggleCommentLike(postId, comment._id, parentCommentId);
  }

  deleteComment(postId: string, comment: Comment, parentCommentId?: string): void {
    this.feedService.deleteComment(postId, comment._id, parentCommentId);
  }
}
