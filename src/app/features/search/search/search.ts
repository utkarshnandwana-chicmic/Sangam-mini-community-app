import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Router } from '@angular/router';
import { SearchService } from '../search-service';
import { SearchItem, SearchUser } from '../search.model';
import { ImageUrlPipe } from '../../../core/pipes/image-url-pipe';



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

  searchControl = new FormControl('', { nonNullable: true });

  searches = this.searchService.searches;
  users = this.searchService.users;
  loading = this.searchService.loading;

  ngOnInit(): void {

    this.searchService.loadRecent();

    this.searchControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged()
      )
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
}