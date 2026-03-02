import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { RouterModule, Router } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, MatListModule, MatDividerModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Sidebar {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogout(): void {
    this.authService.logout().subscribe();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  onCreatePost(): void {
    this.router.navigateByUrl('/posts/create');
  }

  isProfileTabActive(): boolean {
    const currentPath = this.router.url.split('?')[0].split('#')[0];
    const ownUserId = this.authService.getUserId();

    if (currentPath === '/profile' || currentPath === '/profile/edit') {
      return true;
    }

    return !!ownUserId && currentPath === `/profile/${ownUserId}`;
  }
}
