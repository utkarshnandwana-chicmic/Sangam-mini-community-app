import { Component, Output, EventEmitter } from '@angular/core';
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
})
export class Sidebar {

  @Output() createPost = new EventEmitter<void>(); // 👈 NEW

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

  onCreatePost() {
    console.log("Create Clicked");
    
    this.createPost.emit(); 
  }
}
