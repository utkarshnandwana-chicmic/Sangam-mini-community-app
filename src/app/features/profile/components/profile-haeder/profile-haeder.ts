import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ProfileUser } from '../../models/profile.model';
import { AuthService } from '../../../../core/services/auth';
import { ImageUrlPipe } from '../../../../core/pipes/image-url-pipe';
import { FollowService } from '../../services/follow';

@Component({
  selector: 'app-profile-header',
  standalone: true,
  imports: [CommonModule, ImageUrlPipe],
  templateUrl: './profile-haeder.html',
  styleUrl: './profile-haeder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileHeaderComponent {

  private authService = inject(AuthService);
  private router = inject(Router);
  private followService = inject(FollowService);

  @Input({ required: true }) profile!: ProfileUser;
  followActionLoading = this.followService.followActionLoading;

  get followButtonLabel(): string {
    if (this.profile?.isFollowing) return 'Following';
    if (this.profile?.isRequestedFollowing) return 'Requested';
    return 'Follow';
  }

  get isFollowingState(): boolean {
    return !!this.profile?.isFollowing;
  }

  get showMessageButton(): boolean {
    return !!this.profile && (!this.profile.privateAccount || !!this.profile.isFollowing);
  }

  get canTriggerFollow(): boolean {
    return !this.isOwnProfile && !!this.profile;
  }

get isOwnProfile(): boolean {
  const currentUserId = this.authService.getUserId();
  return !!this.profile && currentUserId === this.profile._id;
}

  onEditProfile(): void {
    this.router.navigate(['/profile/edit']);
  }

  onFollow(): void {
    if (!this.canTriggerFollow || !this.profile?._id) return;
    this.followService.toggleFollowUser(this.profile._id).subscribe();
  }

  onMessage(): void {
    if (!this.profile?._id || this.isOwnProfile) return;
    this.router.navigate(['/chat'], {
      queryParams: { userId: this.profile._id }
    });
  }
}
