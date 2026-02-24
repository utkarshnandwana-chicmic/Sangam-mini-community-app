import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ProfileUser } from '../../models/profile.model';
import { AuthService } from '../../../../core/services/auth';
import { ImageUrlPipe } from '../../../../core/pipes/image-url-pipe';

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

  @Input({ required: true }) profile!: ProfileUser;

  readonly isOwnProfile = computed(() => {
    const currentUserId = this.authService.getUserId();
    return !!this.profile && currentUserId === this.profile._id;
  });

  onEditProfile(): void {
    this.router.navigate(['/profile/edit']);
  }

}