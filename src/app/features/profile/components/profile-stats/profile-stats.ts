import {
  ChangeDetectionStrategy,
  Component,
  Input
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

}