import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-stats.html',
  styleUrl: './profile-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileStatsComponent {

  @Input({ required: true }) postsCount: number = 0;
  @Input({ required: true }) followerCount: number = 0;
  @Input({ required: true }) followingCount: number = 0;
  @Input() connectionsClickable: boolean = true;
  @Output() openFollowers = new EventEmitter<void>();
  @Output() openFollowing = new EventEmitter<void>();

  onFollowersClick(): void {
    if (!this.connectionsClickable) return;
    this.openFollowers.emit();
  }

  onFollowingClick(): void {
    if (!this.connectionsClickable) return;
    this.openFollowing.emit();
  }
}
