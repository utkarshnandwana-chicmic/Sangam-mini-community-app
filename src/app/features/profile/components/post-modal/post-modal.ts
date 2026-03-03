import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  HostListener,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  inject,
  computed,
  signal,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of } from 'rxjs';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NoLeadingSpaceDirective } from '../../../../core/directives/no-leading-space.directive';

import { Post } from '../../models/post.model';
import { ProfileUser } from '../../models/profile.model';
import { ImageUrlPipe } from '../../../../core/pipes/image-url-pipe';

import { CommentService } from '../../services/comment';
import { ProfileService } from '../../services/profile';
import { AuthService } from '../../../../core/services/auth';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog';
import { ApiService } from '../../../../core/services/api';
import { ApiResponse } from '../../models/api-response.model';
import { API_ENDPOINTS } from '../../../../constants/api-endpoints';

@Component({
  selector: 'app-post-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ImageUrlPipe,
    NoLeadingSpaceDirective
  ],
  templateUrl: './post-modal.html',
  styleUrl: './post-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostModalComponent implements OnDestroy, OnChanges {

  @Input({ required: true }) post!: Post;
  @Input({ required: true }) profile!: ProfileUser;

  @Output() close = new EventEmitter<void>();
  @Output() toggleLike = new EventEmitter<Post>();
  @Output() editPost = new EventEmitter<Post>();
  @Output() toggleSave = new EventEmitter<Post>();

  private commentService = inject(CommentService);
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private confirmDialog = inject(ConfirmDialogService);
  private router = inject(Router);
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  /* ---------------- STATE ---------------- */

  currentIndex = 0;
  newComment = '';
  editingCommentId: string | null = null;
  editText = '';
  activeReplyCommentId: string | null = null;
  replyText = '';
  replyToCommentId: string | null = null;
  private lastPostId: string | null = null;
  showMenu = false;
  private preloadedMedia = new Set<string>();
  mediaLoading = true;
  readonly defaultAvatarUrl = '/default-avatar.svg';
  private requestedTaggedIds = new Set<string>();
  readonly resolvedTaggedUserNames = signal<Record<string, string>>({});

  readonly postAuthor = computed(() => {
    const nestedUser = (this.post?.user ?? {}) as Record<string, any>;
    const fallbackUserName = this.profile?.userName ?? '';

    const userName =
      nestedUser?.['userName'] ||
      this.post?.userName ||
      fallbackUserName;

    const profilePicture =
      nestedUser?.['profilePicture'] ||
      nestedUser?.['profilePic'] ||
      nestedUser?.['avatar'] ||
      nestedUser?.['image'] ||
      this.post?.profilePicture ||
      (this.post as any)?.profilePic ||
      (this.post as any)?.avatar ||
      null;

    return {
      userName,
      profilePicture
    };
  });

  readonly visibleHashtags = computed(() => {
    const raw = this.post?.hashtags;
    if (!Array.isArray(raw)) return [];

    return raw
      .map(tag => String(tag ?? '').trim().replace(/^#+/, ''))
      .filter(Boolean);
  });

  readonly visibleTaggedUsers = computed(() => {
    const postAny = this.post as any;

    const fromTaggedUsers = Array.isArray(postAny?.taggedUsers)
      ? postAny.taggedUsers
      : [];

    const mappedUsers = fromTaggedUsers.map((user: any) => ({
      userId: String(user?._id ?? '').trim(),
      userName: String(user?.userName ?? user?.name ?? user?._id ?? '').trim()
    }))
      .filter((user: { userId: string; userName: string }) => !!user.userName);

    const fromIds = Array.isArray(this.post?.taggedUserIds) ? this.post!.taggedUserIds : [];
    const resolvedMap = this.resolvedTaggedUserNames();
    const mappedIds = fromIds
      .map(value => String(value ?? '').trim())
      .filter(Boolean)
      .map(id => ({
        userId: id,
        userName: String(resolvedMap[id] ?? '').trim()
      }))
      .filter((user: { userId: string; userName: string }) => !!user.userName);

    const seen = new Set<string>();
    const merged = [...mappedUsers, ...mappedIds].filter(user => {
      if (seen.has(user.userName)) return false;
      seen.add(user.userName);
      return true;
    });

    return merged;
  });

  readonly visibleLocationName = computed(() => {
    const postAny = this.post as any;
    return String(
      postAny?.address ??
      postAny?.locationName ??
      postAny?.placeName ??
      ''
    ).trim();
  });

  /* ---------------- COMMENTS ---------------- */

  readonly comments = this.commentService.comments;
  readonly commentsLoading = this.commentService.loading;

  readonly rootComments = computed(() =>
    this.comments().filter(c => !c.commentId)
  );

  readonly repliesMap = computed(() => {
    const map = new Map<string, any[]>();
    for (const comment of this.comments()) {
      if (comment.commentId) {
        const key = String(comment.commentId);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(comment);
      }
    }
    return map;
  });

  /* ---------------- OWNER CHECK ---------------- */

  get isOwner(): boolean {
    const currentUserId = this.authService.getUserId();
    return currentUserId === this.post.userId;
  }

  get canToggleSave(): boolean {
    return !this.isOwner || this.post.isSaved;
  }

  /* ---------------- LIFECYCLE ---------------- */

  ngOnChanges(changes: SimpleChanges): void {

    if (!this.post?._id) return;

    if (this.post._id !== this.lastPostId) {
      this.lastPostId = this.post._id;
      this.currentIndex = 0;
      this.mediaLoading = true;
      this.loadComments();
      this.preloadVisibleMedia();
    }
    this.resolveTaggedUserNames();

    this.toggleScrollLock(true);
  }

  ngOnDestroy(): void {
    this.toggleScrollLock(false);
    this.commentService.clear();
  }

  private toggleScrollLock(locked: boolean): void {
    document.body.style.overflow = locked ? 'hidden' : 'auto';

    const mainContent = document.querySelector('.main-content-area') as HTMLElement | null;
    if (mainContent) {
      mainContent.style.overflow = locked ? 'hidden' : 'auto';
    }
  }

  private loadComments(): void {
    if (!this.post?._id) return;
    this.commentService.loadComments(this.post._id);
  }

  /* ---------------- MENU ---------------- */

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.showMenu = !this.showMenu;
  }

  @HostListener('document:click', ['$event'])
  closeMenu(event: Event): void {
    if (!(event.target as HTMLElement).closest('.menu-wrapper')) {
      this.showMenu = false;
    }
  }

  onEditPost(): void {
    this.showMenu = false;
    this.editPost.emit(this.post);
  }

async onDeletePost(): Promise<void> {

  this.showMenu = false;

  const confirmed = await this.confirmDialog.confirm({
    title: 'Delete Post',
    message: 'Are you sure you want to delete this post?',
    confirmText: 'Delete',
    cancelText: 'Cancel'
  });

  if (!confirmed) return;

  this.profileService.deletePost(this.post._id);
  this.close.emit();
}

  /* ---------------- MEDIA ---------------- */

  get hasMultipleMedia(): boolean {
    return (this.post?.media?.length ?? 0) > 1;
  }

  get currentMedia(): Post['media'][number] | undefined {
    return this.post?.media?.[this.currentIndex];
  }

  getMediaSource(media: Post['media'][number]): string {
    return media.completeUrl || media.url || '';
  }

  private preloadVisibleMedia(): void {
    const mediaList = this.post?.media ?? [];
    if (!mediaList.length) return;

    const current = mediaList[this.currentIndex];
    if (current) this.preloadImage(this.getMediaSource(current));

    if (mediaList.length > 1) {
      const nextIndex = (this.currentIndex + 1) % mediaList.length;
      const prevIndex = (this.currentIndex - 1 + mediaList.length) % mediaList.length;
      this.preloadImage(this.getMediaSource(mediaList[nextIndex]));
      this.preloadImage(this.getMediaSource(mediaList[prevIndex]));
    }
  }

  private preloadImage(url: string): void {
    if (!url || this.preloadedMedia.has(url)) return;
    this.preloadedMedia.add(url);

    const image = new Image();
    image.src = url;
  }

  isVideo(mediaType: number): boolean {
    return mediaType === 2;
  }

  next(): void {
    if (!this.hasMultipleMedia) return;
    this.mediaLoading = true;
    this.currentIndex =
      (this.currentIndex + 1) % this.post.media.length;
    this.preloadVisibleMedia();
  }

  prev(): void {
    if (!this.hasMultipleMedia) return;
    this.mediaLoading = true;
    this.currentIndex =
      (this.currentIndex - 1 + this.post.media.length) %
      this.post.media.length;
    this.preloadVisibleMedia();
  }

  onMediaLoaded(): void {
    this.mediaLoading = false;
  }

  /* ---------------- LIKE / SAVE ---------------- */

  onToggleLike(): void {
    this.toggleLike.emit(this.post);
  }

  onToggleSave(): void {
    this.toggleSave.emit(this.post);
  }

  navigateToTaggedUser(userId: string): void {
    const normalizedUserId = String(userId ?? '').trim();
    if (!normalizedUserId) return;

    this.close.emit();
    this.router.navigate(['/profile', normalizedUserId]);
  }

  private resolveTaggedUserNames(): void {
    const ids = Array.isArray(this.post?.taggedUserIds)
      ? this.post.taggedUserIds.map(id => String(id ?? '').trim()).filter(Boolean)
      : [];

    const known = this.resolvedTaggedUserNames();
    const unresolved = ids.filter(id => !known[id] && !this.requestedTaggedIds.has(id));
    if (!unresolved.length) return;

    unresolved.forEach(id => this.requestedTaggedIds.add(id));

    const calls = unresolved.map(id =>
      this.api
        .get<ApiResponse<{ items: Array<{ userName?: string }> }>>(
          API_ENDPOINTS.USER.GET_ALL,
          { _id: id }
        )
        .pipe(
          map(res => ({
            id,
            userName: String(res?.data?.items?.[0]?.userName ?? '').trim()
          })),
          catchError(() => of({ id, userName: '' }))
        )
    );

    forkJoin(calls)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(results => {
        this.resolvedTaggedUserNames.update((current: Record<string, string>) => {
          const next = { ...current };
          for (const result of results) {
            if (result.userName) {
              next[result.id] = result.userName;
            }
          }
          return next;
        });
      });
  }

  /* ---------------- COMMENT CREATE ---------------- */

  submitComment(): void {

    const content = this.newComment.trim();
    if (!content) return;

    const payload: any = {
      postId: this.post._id,
      content
    };

    if (this.replyToCommentId) {
      payload.commentId = this.replyToCommentId;
    }

    this.commentService.createComment(payload);
    this.profileService.incrementCommentCount(this.post._id);

    this.newComment = '';
    this.replyToCommentId = null;
  }

  /* ---------------- COMMENT DELETE ---------------- */

  onDelete(commentId: string): void {
    this.commentService.deleteComment(commentId);
    this.profileService.decrementCommentCount(this.post._id);
  }

  /* ---------------- COMMENT PERMISSIONS ---------------- */

  canDeleteComment(comment: any): boolean {
    const currentUserId = this.authService.getUserId();
    if (!currentUserId) return false;

    return (
      comment.userId === currentUserId ||
      this.post.userId === currentUserId
    );
  }

  canEditComment(comment: any): boolean {
    const currentUserId = this.authService.getUserId();
    return comment.userId === currentUserId;
  }

  trackByCommentId(index: number, item: any): string {
    return item._id;
  }

  /* ---------------- KEYBOARD ---------------- */

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  @HostListener('document:keydown.arrowRight')
  onArrowRight(): void {
    this.next();
  }

  @HostListener('document:keydown.arrowLeft')
  onArrowLeft(): void {
    this.prev();
  }

  /* ---------------- COMMENT LIKE ---------------- */

  toggleCommentLike(comment: any): void {
    this.commentService.toggleLike(comment);
  }

  /* ---------------- COMMENT EDIT / REPLY ---------------- */

  startEdit(comment: any): void {
    this.editingCommentId = comment._id;
    this.editText = comment.content;
  }

  saveEdit(commentId: string): void {

    const content = this.editText.trim();
    if (!content) return;

    this.commentService.updateComment(commentId, { content });

    this.editingCommentId = null;
    this.editText = '';
  }

  openReplyBox(commentId: string): void {

    if (this.activeReplyCommentId === commentId) {
      this.activeReplyCommentId = null;
      this.replyText = '';
      return;
    }

    this.activeReplyCommentId = commentId;
    this.replyText = '';
  }

  submitReply(parentCommentId: string): void {

    const content = this.replyText.trim();
    if (!content) return;

    this.commentService.createComment({
      postId: this.post._id,
      content,
      commentId: parentCommentId
    });
    this.profileService.incrementCommentCount(this.post._id);

    this.activeReplyCommentId = null;
    this.replyText = '';
  }
}
