import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

import { ProfileService } from '../../services/profile';
import { ProfileUser } from '../../models/profile.model';
import { Post } from '../../models/post.model';

import { ProfileHeaderComponent } from '../../components/profile-haeder/profile-haeder';
import { ProfileStatsComponent } from '../../components/profile-stats/profile-stats';
import { ProfilePostsGridComponent } from '../../components/posts-grid/posts-grid';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    ProfileHeaderComponent,
    ProfileStatsComponent,
    ProfilePostsGridComponent
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent implements OnInit {

  private profileService = inject(ProfileService);

  // =============================
  // OBSERVABLE STREAMS
  // =============================

  profile$: Observable<ProfileUser | null> =
    this.profileService.profile$;

  posts$: Observable<Post[]> =
    this.profileService.posts$;

  loading$: Observable<boolean> =
    this.profileService.loading$;

  error$: Observable<string | null> =
    this.profileService.error$;

  followerCount$ =
    this.profileService.followerCount$;

  followingCount$ =
    this.profileService.followingCount$;

  postsCount$ =
    this.profileService.postsCount$;

  // =============================
  // INIT
  // =============================

  ngOnInit(): void {
    this.profileService.loadProfile(); // ✅ Only this
  }

  // =============================
  // EVENTS
  // =============================

  onToggleLike(post: Post): void {
    this.profileService.toggleLike(post);
  }

onViewPost(postId: string): void {
  this.profileService.markPostAsViewed(postId);
}

}
