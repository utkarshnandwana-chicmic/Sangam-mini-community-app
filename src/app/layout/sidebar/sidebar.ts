import { Component } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { RouterModule, Router } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule, MatListModule, MatDividerModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

onLogout() {
  this.authService.logout().subscribe({
    next: () => {
      this.router.navigateByUrl('/login', { replaceUrl: true });
    },
    error: () => {
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  });
}

}
