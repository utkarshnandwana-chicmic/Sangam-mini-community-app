import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  signal,
  computed,
  effect
} from '@angular/core';

import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ProfileService } from '../../services/profile';
import { PostService } from '../../services/post';
import { Post } from '../../models/post.model';

import { ProfileHeaderComponent } from '../../components/profile-haeder/profile-haeder';
import { ProfileStatsComponent } from '../../components/profile-stats/profile-stats';
import { ProfilePostsGridComponent } from '../../components/posts-grid/posts-grid';
import { PostModalComponent } from '../../components/post-modal/post-modal';
import { AddPostModalComponent } from '../add-post-modal/add-post-modal';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    ProfileHeaderComponent,
    ProfileStatsComponent,
    ProfilePostsGridComponent,
    PostModalComponent,
    AddPostModalComponent
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent implements OnDestroy {

  private profileService = inject(ProfileService);
  private postService = inject(PostService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  /* -------------------- SERVICE SIGNALS -------------------- */

  profile = this.profileService.profile;
  posts = this.profileService.posts;
  profileLoading = this.profileService.profileLoading;

  /* -------------------- TAB STATE -------------------- */

  activeTab = signal<'posts' | 'saved'>('posts');
  savedPosts = signal<Post[]>([]);

  /* -------------------- VIEW MODAL STATE -------------------- */

  selectedPostId = signal<string | null>(null);

  readonly selectedPost = computed(() => {
    const id = this.selectedPostId();
    if (!id) return null;

    const currentList =
      this.activeTab() === 'posts'
        ? this.posts()
        : this.savedPosts();

    return currentList.find(p => p._id === id) ?? null;
  });

  /* -------------------- EDIT MODAL STATE -------------------- */

  selectedEditPost: Post | null = null;
  showEditModal = false;

  /* -------------------- ROUTE REACTIVE LOAD -------------------- */

  private routeParamSignal = toSignal(
    this.route.paramMap,
    { initialValue: this.route.snapshot.paramMap }
  );

constructor() {
  effect(() => {
    const params = this.routeParamSignal();
    const userId = params?.get('id');

    // Reset tab + saved data on profile switch
    this.activeTab.set('posts');
    this.savedPosts.set([]);
    this.selectedPostId.set(null);

    this.profileService.loadProfile(userId ?? undefined);
  });
}

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
  }

  /* -------------------- TAB SWITCH -------------------- */

  switchToPosts(): void {
    this.activeTab.set('posts');
  }

  switchToSaved(): void {
    this.activeTab.set('saved');

    if (this.savedPosts().length) return;

    this.loadSavedPosts();
  }

  private loadSavedPosts(): void {
    this.postService.getPosts({ isSaved: true })
      .subscribe(res => {
        this.savedPosts.set(res.data.items);
      });
  }

  /* -------------------- EVENTS -------------------- */

  onToggleLike(post: Post): void {
    if (!post?._id) return;

    const postId = post._id;
    const previousLiked = !!post.isLiked;
    const previousLikes = post.likesCount ?? 0;
    const optimisticLiked = !previousLiked;
    const optimisticLikes = this.computeLikesCount(
      previousLikes,
      previousLiked,
      optimisticLiked
    );

    this.profileService.setPostLikeState(postId, optimisticLiked, optimisticLikes);
    this.savedPosts.update(list =>
      list.map(p =>
        p._id === postId
          ? { ...p, isLiked: optimisticLiked, likesCount: optimisticLikes }
          : p
      )
    );

    this.postService.toggleLike(postId).subscribe({
      next: (res) => {
        const backendLiked = !!res?.data?.liked;
        const finalLikes = this.computeLikesCount(
          previousLikes,
          previousLiked,
          backendLiked
        );

        this.profileService.setPostLikeState(postId, backendLiked, finalLikes);
        this.savedPosts.update(list =>
          list.map(p =>
            p._id === postId
              ? { ...p, isLiked: backendLiked, likesCount: finalLikes }
              : p
          )
        );
      },
      error: () => {
        this.profileService.setPostLikeState(postId, previousLiked, previousLikes);
        this.savedPosts.update(list =>
          list.map(p =>
            p._id === postId
              ? { ...p, isLiked: previousLiked, likesCount: previousLikes }
              : p
          )
        );
      }
    });
  }

  onToggleSave(post: Post): void {
    if (!post?._id) return;
    const isOwnPost = post.userId === this.authService.getUserId();
    if (isOwnPost && !post.isSaved) return;

    const previous = post.isSaved;
    const optimistic = !previous;

    this.profileService.setPostSavedState(post._id, optimistic);

    // Optimistic update
    this.savedPosts.update(list =>
      list.map(p =>
        p._id === post._id
          ? { ...p, isSaved: optimistic }
          : p
      )
    );

    this.postService.setSavedState(post._id, optimistic).subscribe({
      next: (res) => {
        const backendState =
          res?.data?.isSaved ??
          res?.data?.saved ??
          (res as any)?.isSaved ??
          (res as any)?.saved;

        const updated = typeof backendState === 'boolean'
          ? backendState
          : optimistic;

        const finalState = updated;
        this.profileService.setPostSavedState(post._id, finalState);

        this.savedPosts.update(list =>
          list.map(p =>
            p._id === post._id
              ? { ...p, isSaved: finalState }
              : p
          )
        );

        if (!finalState && this.activeTab() === 'saved') {
          this.savedPosts.update(list =>
            list.filter(p => p._id !== post._id)
          );
        }
      },
      error: () => {
        this.profileService.setPostSavedState(post._id, previous);
        // rollback
        this.savedPosts.update(list =>
          list.map(p =>
            p._id === post._id
              ? { ...p, isSaved: previous }
              : p
          )
        );
      }
    });
  }

  onViewPost(post: Post): void {
    if (!post) return;

    this.profileService.markPostAsViewed(post._id);
    this.selectedPostId.set(post._id);
    document.body.style.overflow = 'hidden';
  }

  closePost(): void {
    this.selectedPostId.set(null);
    document.body.style.overflow = 'auto';
  }

get isOwnProfile(): boolean {
  const currentUserId = this.authService.getUserId();
  const profile = this.profile(); // 👈 important
  return !!profile && profile._id === currentUserId;
}

  /* -------------------- EDIT FLOW -------------------- */

  openEditModal(post: Post): void {
    this.selectedEditPost = post;
    this.showEditModal = true;

    this.selectedPostId.set(null);
    document.body.style.overflow = 'auto';
  }

  closeEditModal(): void {
    this.selectedEditPost = null;
    this.showEditModal = false;
  }

  private computeLikesCount(
    likesCount: number,
    fromLiked: boolean,
    toLiked: boolean
  ): number {
    if (fromLiked === toLiked) return likesCount;
    return toLiked
      ? likesCount + 1
      : Math.max(likesCount - 1, 0);
  }
}
