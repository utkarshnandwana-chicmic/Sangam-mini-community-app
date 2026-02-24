import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
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

  @Output() createPost = new EventEmitter<void>(); // 👈 NEW

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

onLogout(): void {
  this.authService.logout().subscribe();
  this.router.navigateByUrl('/login', { replaceUrl: true });
}

  onCreatePost() {    
    this.createPost.emit(); 
  }
}
