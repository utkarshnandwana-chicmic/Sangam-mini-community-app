import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../../core/services/api';
import { SearchItem, SearchUser } from './search.model';
import { ApiResponse } from '../profile/models/api-response.model';
import { API_ENDPOINTS } from '../../constants/api-endpoints';


@Injectable({
  providedIn: 'root'
})
export class SearchService {

  private api = inject(ApiService);

  // =========================
  // STATE (Signals)
  // =========================

  private _searches = signal<SearchItem[]>([]);
  private _users = signal<SearchUser[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _recentLoaded = signal<boolean>(false);

  // =========================
  // PUBLIC READONLY SIGNALS
  // =========================

  readonly searches = this._searches.asReadonly();
  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // =========================
  // LOAD RECENT SEARCHES
  // =========================

  loadRecent(): void {

    if (this._recentLoaded()) return;

    this.api
      .get<ApiResponse<{ searches: SearchItem[] }>>(
        API_ENDPOINTS.SEARCH.BASE
      )
      .subscribe(res => {
        this._searches.set(res.data.searches);
        this._recentLoaded.set(true);
      });
  }

  // =========================
  // LIVE USER SEARCH
  // =========================

  searchUsers(query: string): void {

    if (!query || query.length < 2) {
      this._users.set([]);
      return;
    }

    this._loading.set(true);

    this.api
      .get<ApiResponse<{ items: SearchUser[] }>>(
        API_ENDPOINTS.USER.GET_ALL,
        { search: query }
      )
      .subscribe({
        next: (res) => {
          this._users.set(res.data.items);
        },
        error: () => {
          this._error.set('Search failed');
        },
        complete: () => {
          this._loading.set(false);
        }
      });
  }

  // =========================
  // SAVE TO RECENT
  // =========================

  saveToRecent(text: string): void {

    const exists = this._searches()
      .some(s => s.text.toLowerCase() === text.toLowerCase());

    if (exists) return;

    this.api
      .post<ApiResponse<{ data: SearchItem }>>(
        API_ENDPOINTS.SEARCH.BASE,
        { text }
      )
      .subscribe(res => {
        this._searches.update(current => [
          res.data.data,
          ...current
        ]);
      });
  }

  // =========================
  // CLICK RECENT SEARCH
  // =========================

  triggerRecentSearch(text: string): void {
    this.searchUsers(text);
  }

  // =========================
  // DELETE RECENT SEARCH
  // =========================

  delete(search: SearchItem): void {

    const previous = this._searches();

    this._searches.update(current =>
      current.filter(s => s._id !== search._id)
    );

    this.api
      .delete(`${API_ENDPOINTS.SEARCH.BASE}/${search._id}`)
      .subscribe({
        error: () => this._searches.set(previous)
      });
  }
}