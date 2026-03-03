import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  switchMap,
  tap
} from 'rxjs';

export interface LocationSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
}

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationSearchService {
  private httpBackend = inject(HttpBackend);
  private http = new HttpClient(this.httpBackend);
  private query$ = new Subject<string>();

  private _suggestions = signal<LocationSuggestion[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  readonly suggestions = this._suggestions.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() {
    this.setupStream();
  }

  search(query: string): void {
    this.query$.next(query);
  }

  clear(): void {
    this._suggestions.set([]);
    this._error.set(null);
    this._loading.set(false);
  }

  private setupStream(): void {
    this.query$
      .pipe(
        map(value => value.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          this._error.set(null);

          if (query.length < 2) {
            this._suggestions.set([]);
            this._loading.set(false);
            return of<LocationSuggestion[] | null>(null);
          }

          this._loading.set(true);

          const params = new HttpParams()
            .set('q', query)
            .set('format', 'jsonv2')
            .set('limit', '6')
            .set('addressdetails', '0');

          return this.http
            .get<NominatimItem[]>('https://nominatim.openstreetmap.org/search', { params })
            .pipe(
              map(items => items.map(item => ({
                displayName: item.display_name,
                latitude: Number(item.lat),
                longitude: Number(item.lon)
              }))),
              catchError(() => {
                this._error.set('Unable to fetch locations');
                return of([] as LocationSuggestion[]);
              }),
              finalize(() => this._loading.set(false))
            );
        }),
        tap(suggestions => {
          if (suggestions !== null) {
            this._suggestions.set(suggestions);
          }
        })
      )
      .subscribe();
  }
}
