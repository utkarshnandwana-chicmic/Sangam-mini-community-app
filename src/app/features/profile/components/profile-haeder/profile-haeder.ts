import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  OnChanges,
  SimpleChanges
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
export class ProfileHeaderComponent implements OnChanges {

  private authService = inject(AuthService);
  private router = inject(Router);

  @Input({ required: true }) profile!: ProfileUser;

  isOwnProfile = false;

  // =========================
  // Detect changes properly (OnPush safe)
  // =========================

  ngOnChanges(changes: SimpleChanges): void {

    if (!changes['profile'] || !this.profile) return;

    const currentUserId = this.authService.getUserId();

    this.isOwnProfile = currentUserId === this.profile._id;
  }

  // =========================
  // Navigate to Edit Page
  // =========================

  onEditProfile(): void {
    this.router.navigate(['/profile/edit']);
  }
}
