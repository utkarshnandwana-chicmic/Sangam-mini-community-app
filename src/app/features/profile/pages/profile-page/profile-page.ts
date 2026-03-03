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
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ProfileService } from '../../services/profile';
import { PostService } from '../../services/post';
import { Post } from '../../models/post.model';
import { FollowListUser, FollowService } from '../../services/follow';

import { ProfileHeaderComponent } from '../../components/profile-haeder/profile-haeder';
import { ProfileStatsComponent } from '../../components/profile-stats/profile-stats';
import { ProfilePostsGridComponent } from '../../components/posts-grid/posts-grid';
import { PostModalComponent } from '../../components/post-modal/post-modal';
import { AddPostModalComponent } from '../add-post-modal/add-post-modal';
import { AuthService } from '../../../../core/services/auth';
import { ImageUrlPipe } from '../../../../core/pipes/image-url-pipe';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    ProfileHeaderComponent,
    ProfileStatsComponent,
    ProfilePostsGridComponent,
    PostModalComponent,
    AddPostModalComponent,
    ImageUrlPipe
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent implements OnDestroy {

  private profileService = inject(ProfileService);
  private followService = inject(FollowService);
  private postService = inject(PostService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);
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
  showFollowListModal = signal(false);
  activeFollowListTab = signal<'followers' | 'following'>('followers');
  followUsers = signal<FollowListUser[]>([]);
  followListLoading = signal(false);
  followListActionLoading = signal<Record<string, boolean>>({});

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
    this.showFollowListModal.set(false);
    this.followUsers.set([]);

    this.profileService.loadProfile(userId ?? undefined);
  });
}

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
  }

  get canViewPrivateContent(): boolean {
    const currentProfile = this.profile();
    if (!currentProfile) return false;
    if (this.isOwnProfile) return true;
    if (!currentProfile.privateAccount) return true;
    return !!currentProfile.isFollowing;
  }

  get canViewConnections(): boolean {
    const currentProfile = this.profile();
    if (!currentProfile) return false;

    const currentUserId = this.authService.getUserId();
    if (currentUserId && currentProfile._id === currentUserId) {
      return true;
    }

    if (!currentProfile.privateAccount) return true;
    return !!currentProfile.isFollowing;
  }

  get loggedInUserId(): string | null {
    return this.authService.getUserId();
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

  openFollowersModal(): void {
    this.openFollowListModal('followers');
  }

  openFollowingModal(): void {
    this.openFollowListModal('following');
  }

  closeFollowListModal(): void {
    this.showFollowListModal.set(false);
    this.followListLoading.set(false);
    this.followUsers.set([]);
    this.followListActionLoading.set({});
    document.body.style.overflow = 'auto';
  }

  setFollowListTab(tab: 'followers' | 'following'): void {
    if (this.activeFollowListTab() === tab) return;
    this.openFollowListModal(tab);
  }

  navigateToFollowUser(userId: string): void {
    const normalizedUserId = String(userId ?? '').trim();
    if (!normalizedUserId) return;
    this.closeFollowListModal();
    this.router.navigate(['/profile', normalizedUserId]);
  }

  trackByFollowUserId(index: number, user: FollowListUser): string {
    return user._id || String(index);
  }

  isFollowListActionLoading(userId: string): boolean {
    return !!this.followListActionLoading()[userId];
  }

  getFollowListButtonLabel(user: FollowListUser): string {
    if (user.isFollowing) return 'Following';
    if (user.isRequestedFollowing) return 'Requested';
    return 'Follow';
  }

  onToggleFollowFromList(event: Event, user: FollowListUser): void {
    event.stopPropagation();

    const userId = String(user?._id ?? '').trim();
    const ownUserId = this.authService.getUserId();
    if (!userId || userId === ownUserId || this.isFollowListActionLoading(userId)) return;

    const previous = {
      isFollowing: !!user.isFollowing,
      isRequestedFollowing: !!user.isRequestedFollowing
    };
    const shouldFollow = !(previous.isFollowing || previous.isRequestedFollowing);
    const followingCountDelta = shouldFollow ? 1 : -1;
    const optimisticState = {
      isFollowing: shouldFollow ? !user.privateAccount : false,
      isRequestedFollowing: shouldFollow ? !!user.privateAccount : false
    };

    this.followUsers.update((list) =>
      list.map((item) =>
        item._id === userId
          ? { ...item, ...optimisticState }
          : item
      )
    );
    this.followListActionLoading.update((state) => ({
      ...state,
      [userId]: true
    }));
    this.followService.adjustOwnFollowingCount(followingCountDelta);

    this.followService
      .toggleFollowRelation(userId, previous.isFollowing, previous.isRequestedFollowing)
      .pipe(finalize(() => {
        this.followListActionLoading.update((state) => ({
          ...state,
          [userId]: false
        }));
      }))
      .subscribe({
        next: (res) => {
          const requested = !!res?.data?.requested;
          this.followUsers.update((list) =>
            list.map((item) =>
              item._id === userId
                ? {
                    ...item,
                    isFollowing: shouldFollow ? !requested : false,
                    isRequestedFollowing: shouldFollow ? requested : false
                  }
                : item
            )
          );
        },
        error: () => {
          this.followService.adjustOwnFollowingCount(-followingCountDelta);
          this.followUsers.update((list) =>
            list.map((item) =>
              item._id === userId
                ? { ...item, ...previous }
                : item
            )
          );
        }
      });
  }

  shouldShowRemoveFollowerButton(user: FollowListUser): boolean {
    return this.isOwnProfile && this.activeFollowListTab() === 'followers' && user._id !== this.loggedInUserId;
  }

  onRemoveFollowerFromList(event: Event, user: FollowListUser): void {
    event.stopPropagation();

    const userId = String(user?._id ?? '').trim();
    if (!userId || this.isFollowListActionLoading(userId)) return;

    const previousList = this.followUsers();
    this.followUsers.update((list) => list.filter((item) => item._id !== userId));
    this.followListActionLoading.update((state) => ({
      ...state,
      [userId]: true
    }));
    this.followService.adjustOwnFollowerCount(-1);

    this.followService
      .removeFollower(userId)
      .pipe(finalize(() => {
        this.followListActionLoading.update((state) => ({
          ...state,
          [userId]: false
        }));
      }))
      .subscribe({
        error: () => {
          this.followUsers.set(previousList);
          this.followService.adjustOwnFollowerCount(1);
        }
      });
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

  private openFollowListModal(tab: 'followers' | 'following'): void {
    const currentProfile = this.profile();
    if (!currentProfile?._id || !this.canViewConnections) return;

    this.showFollowListModal.set(true);
    this.activeFollowListTab.set(tab);
    this.followUsers.set([]);
    this.followListLoading.set(true);
    document.body.style.overflow = 'hidden';

    this.followService
      .getFollowUsers(currentProfile._id, tab)
      .pipe(finalize(() => this.followListLoading.set(false)))
      .subscribe({
        next: (users) => this.followUsers.set(users),
        error: () => this.followUsers.set([])
      });
  }
}
