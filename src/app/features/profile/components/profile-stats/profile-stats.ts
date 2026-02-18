import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileUser } from '../../models/profile.model';


@Component({
  selector: 'app-profile-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-stats.html',
  styleUrl: './profile-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileStatsComponent {

@Input({ required: true }) postsCount!: number;
@Input({ required: true }) followerCount!: number;
@Input({ required: true }) followingCount!: number;
  profile!: ProfileUser;

}
