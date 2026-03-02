import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SearchService } from '../search-service';
import { SearchItem, SearchUser } from '../search.model';
import { ImageUrlPipe } from '../../../core/pipes/image-url-pipe';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';



@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageUrlPipe],
  templateUrl: './search.html',
  styleUrl: './search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComponent implements OnInit {

  private searchService = inject(SearchService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  searchControl = new FormControl('', { nonNullable: true });

  searches = this.searchService.searches;
  users = this.searchService.users;
  loading = this.searchService.loading;
  readonly defaultAvatarUrl = '/default-avatar.svg';

  ngOnInit(): void {

    this.searchService.loadRecent();

    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.searchService.searchUsers(value ?? '');
      });
  }

  // When clicking a searched user
  selectUser(user: SearchUser): void {

    this.searchService.saveToRecent(user.userName);

    this.router.navigate(['/profile', user._id]);
  }

  // When clicking recent search
  selectRecent(search: SearchItem): void {

    this.searchControl.setValue(search.text);

    this.searchService.triggerRecentSearch(search.text);
  }

  delete(search: SearchItem): void {
    this.searchService.delete(search);
  }

  clearRecent(): void {
    this.searchService.clearRecent();
  }

  trackByUserId(index: number, user: SearchUser): string {
    return user._id;
  }

  trackBySearchId(index: number, search: SearchItem): string {
    return search._id;
  }

  onUserAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    if (img.src.includes('default-avatar.svg')) return;
    img.src = this.defaultAvatarUrl;
  }
}
