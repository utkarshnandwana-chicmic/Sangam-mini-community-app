import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  HostListener,
  OnDestroy,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Post } from '../../models/post.model';
import { ProfileUser } from '../../models/profile.model';
import { ImageUrlPipe } from '../../../../core/pipes/image-url-pipe';

import { CommentService } from '../../services/comment';
import { ProfileService } from '../../services/profile';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-post-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ImageUrlPipe
  ],
  templateUrl: './post-modal.html',
  styleUrl: './post-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostModalComponent
  implements OnInit, OnDestroy, OnChanges {

  @Input({ required: true }) post!: Post;
  @Input({ required: true }) profile!: ProfileUser;

  @Output() close = new EventEmitter<void>();
  @Output() toggleLike = new EventEmitter<Post>();
  @Output() editPost = new EventEmitter<Post>();
  @Output() toggleSave = new EventEmitter<Post>();

  currentIndex = 0;
  newComment = '';
  editingCommentId: string | null = null;
  editText = '';
  activeReplyCommentId: string | null = null;
  replyText = '';
  replyToCommentId: string | null = null;
  private lastPostId: string | null = null;

  showMenu = false;

  private commentService = inject(CommentService);
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);

  /* ---------------- COMMENTS SIGNAL ---------------- */

  readonly comments = this.commentService.comments;
  readonly commentsLoading = this.commentService.loading;

  readonly rootComments = computed(() =>
    this.comments().filter(
      c => c.commentId === null || c.commentId === undefined
    )
  );

  getReplies(parentId: string) {
    return this.comments().filter(
      c => String(c.commentId) === String(parentId)
    );
  }

  /* ---------------- OWNER CHECK ---------------- */

  get isOwner(): boolean {
    const currentUserId = this.authService.getUserId();
    return currentUserId === this.post.userId;
  }

  /* ---------------- LIFECYCLE ---------------- */

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    this.loadComments();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
    this.commentService.clear();
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (!this.post?._id) return;

    if (this.post._id !== this.lastPostId) {
      this.lastPostId = this.post._id;
      this.currentIndex = 0;
      this.loadComments();
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

  @HostListener('document:click')
  closeMenu(): void {
    this.showMenu = false;
  }

  onEditPost(): void {
    this.showMenu = false;
    this.editPost.emit(this.post);
  }

  onDeletePost(): void {

    this.showMenu = false;

    const confirmed = confirm('Are you sure you want to delete this post?');
    if (!confirmed) return;

    this.profileService.deletePost(this.post._id);
    this.close.emit();
  }

  /* ---------------- MEDIA ---------------- */

  get hasMultipleMedia(): boolean {
    return this.post?.media?.length > 1;
  }

  get currentMedia() {
    return this.post?.media?.[this.currentIndex];
  }

  isVideo(mediaType: number): boolean {
    return mediaType === 2;
  }

  next(): void {
    if (!this.hasMultipleMedia) return;
    this.currentIndex =
      (this.currentIndex + 1) % this.post.media.length;
  }

  prev(): void {
    if (!this.hasMultipleMedia) return;
    this.currentIndex =
      (this.currentIndex - 1 + this.post.media.length) %
      this.post.media.length;
  }

  /* ---------------- LIKE ---------------- */

  onToggleLike(): void {
    this.toggleLike.emit(this.post);
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

  /* ---------------- PERMISSIONS ---------------- */

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

  trackByCommentId(index: number, item: any) {
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

  /* ---------------- COMMENT EDIT / REPLY ---------------- */

  toggleCommentLike(comment: any): void {
    this.commentService.toggleLike(comment);
  }

  setReply(commentId: string): void {
    this.replyToCommentId = commentId;
  }

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

    this.activeReplyCommentId = null;
    this.replyText = '';
  }

  onToggleSave(): void {
  this.toggleSave.emit(this.post);
}
}