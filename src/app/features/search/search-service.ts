import { inject, Injectable, signal } from '@angular/core';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of, Subject, switchMap, tap } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { SearchItem, SearchUser } from './search.model';
import { ApiResponse } from '../profile/models/api-response.model';
import { API_ENDPOINTS } from '../../constants/api-endpoints';


@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private static readonly RECENT_CACHE_KEY = 'search.recent.cache.v1';

  private api = inject(ApiService);
  private searchQuery$ = new Subject<string>();

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

  constructor() {
    this.setupSearchStream();
  }

  private setupSearchStream(): void {
    this.searchQuery$
      .pipe(
        map((value) => value.trim()),
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((query) => {
          this._error.set(null);

          if (query.length < 2) {
            this._users.set([]);
            this._loading.set(false);
            return of<SearchUser[] | null>(null);
          }

          this._loading.set(true);

          return this.api
            .get<ApiResponse<{ items: SearchUser[] }>>(
              API_ENDPOINTS.USER.GET_ALL,
              { search: query }
            )
            .pipe(
              map((res) => res.data.items),
              catchError(() => {
                this._error.set('Search failed');
                return of([] as SearchUser[]);
              }),
              finalize(() => this._loading.set(false))
            );
        }),
        tap((users) => {
          if (users !== null) {
            this._users.set(users);
          }
        })
      )
      .subscribe();
  }

  // =========================
  // LOAD RECENT SEARCHES
  // =========================

  loadRecent(): void {

    if (this._recentLoaded()) return;
    this.hydrateRecentFromCache();
    this._recentLoaded.set(true);

    this.api
      .get<ApiResponse<{ searches: SearchItem[] }>>(
        API_ENDPOINTS.SEARCH.BASE
      )
      .subscribe({
        next: res => {
          const searches = res.data.searches ?? [];
          this._searches.set(searches);
          this.persistRecentToCache(searches);
        },
        error: () => {
          // Keep cached recent searches if network fails.
        }
      });
  }

  // =========================
  // LIVE USER SEARCH
  // =========================

  searchUsers(query: string): void {
    this.searchQuery$.next(query);
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
        this._searches.update(current => {
          const next = [
          res.data.data,
          ...current
          ];
          this.persistRecentToCache(next);
          return next;
        });
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
    this.persistRecentToCache(this._searches());

    this.api
      .delete(`${API_ENDPOINTS.SEARCH.BASE}/${search._id}`)
      .subscribe({
        error: () => {
          this._searches.set(previous);
          this.persistRecentToCache(previous);
        }
      });
  }

  clearRecent(): void {
    this._searches.set([]);
    this._recentLoaded.set(true);
    this.persistRecentToCache([]);
  }

  private hydrateRecentFromCache(): void {
    try {
      const raw = localStorage.getItem(SearchService.RECENT_CACHE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const cached = parsed
        .filter((item: unknown) => !!item && typeof item === 'object')
        .map((item: any) => ({
          _id: String(item._id ?? ''),
          text: String(item.text ?? ''),
          searchBy: String(item.searchBy ?? ''),
          createdAt: String(item.createdAt ?? ''),
          searchAt: String(item.searchAt ?? ''),
          updatedAt: String(item.updatedAt ?? '')
        }))
        .filter((item: SearchItem) => !!item._id && !!item.text);

      if (cached.length) {
        this._searches.set(cached);
      }
    } catch {
      // Ignore malformed cache.
    }
  }

  private persistRecentToCache(searches: SearchItem[]): void {
    try {
      localStorage.setItem(
        SearchService.RECENT_CACHE_KEY,
        JSON.stringify(searches)
      );
    } catch {
      // Ignore storage errors.
    }
  }
}
