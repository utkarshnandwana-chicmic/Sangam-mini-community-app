import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  DestroyRef
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
    this.profileService.toggleLike(post);
  }

  onToggleSave(post: Post): void {

    const previous = post.isSaved;

    // Optimistic update
    this.savedPosts.update(list =>
      list.map(p =>
        p._id === post._id
          ? { ...p, isSaved: !previous }
          : p
      )
    );

    this.postService.toggleSave(post._id).subscribe({
      next: (res) => {
        const updated = res.data.isSaved;

        this.savedPosts.update(list =>
          list.map(p =>
            p._id === post._id
              ? { ...p, isSaved: updated }
              : p
          )
        );

        if (!updated && this.activeTab() === 'saved') {
          this.savedPosts.update(list =>
            list.filter(p => p._id !== post._id)
          );
        }
      },
      error: () => {
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
}