import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { ProfileService } from '../../services/profile';
import { Post } from '../../models/post.model';

import { ProfileHeaderComponent } from '../../components/profile-haeder/profile-haeder';
import { ProfileStatsComponent } from '../../components/profile-stats/profile-stats';
import { ProfilePostsGridComponent } from '../../components/posts-grid/posts-grid';
import { PostModalComponent } from '../../components/post-modal/post-modal';
import { AddPostModalComponent } from '../add-post-modal/add-post-modal';
import { PostService } from '../../services/post';

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
export class ProfilePageComponent implements OnInit, OnDestroy {

  private profileService = inject(ProfileService);
  private postService = inject(PostService); // ✅

  /* -------------------- SIGNAL STATE -------------------- */

  profile = this.profileService.profile;
  posts = this.profileService.posts;
  loading = this.profileService.loading;
  error = this.profileService.error;

  followerCount = this.profileService.followerCount;
  followingCount = this.profileService.followingCount;
  postsCount = this.profileService.postsCount;

  /* -------------------- TAB STATE -------------------- */

  activeTab = signal<'posts' | 'saved'>('posts');

  savedPosts = signal<Post[]>([]);
  savedLoading = signal(false);

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

  /* -------------------- INIT -------------------- */

  ngOnInit(): void {
    this.profileService.loadProfile();
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

  loadSavedPosts(): void {

    this.savedLoading.set(true);

    this.postService.getPosts({
      isSaved: true
    }).subscribe({
      next: (res) => {
        this.savedPosts.set(res.data.items);
        this.savedLoading.set(false);
      },
      error: () => {
        this.savedLoading.set(false);
      }
    });
  }

  /* -------------------- EVENTS -------------------- */

  onToggleLike(post: Post): void {
    this.profileService.toggleLike(post);
  }

onToggleSave(post: Post): void {

  post.isSaved = !post.isSaved;

  this.postService.toggleSave(post._id).subscribe({
    next: (res) => {

      post.isSaved = res.data.isSaved;

      // If unsaved inside saved tab → remove instantly
      if (!post.isSaved && this.activeTab() === 'saved') {
        this.savedPosts.set(
          this.savedPosts().filter(p => p._id !== post._id)
        );
      }
    },
    error: () => {
      post.isSaved = !post.isSaved;
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