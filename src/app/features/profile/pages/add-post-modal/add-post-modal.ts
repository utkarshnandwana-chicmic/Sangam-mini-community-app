import {
  Component,
  ChangeDetectionStrategy,
  EventEmitter,
  Output,
  Input,
  inject,
  signal,
  OnChanges,
  SimpleChanges,
  computed,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of } from 'rxjs';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

import { FileService } from '../../../../core/services/file-service';
import { PostService } from '../../services/post';
import { ProfileService } from '../../services/profile';
import { SearchService } from '../../../search/search-service';
import { SearchUser } from '../../../search/search.model';
import {
  LocationSearchService,
  LocationSuggestion
} from '../../services/location-search';

import {
  CreatePostRequest,
  Post
} from '../../models/post.model';

import { cleanObject } from '../../../../core/utils/object.util';
import { ApiService } from '../../../../core/services/api';
import { API_ENDPOINTS } from '../../../../constants/api-endpoints';
import { ApiResponse } from '../../models/api-response.model';

@Component({
  selector: 'app-add-post-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-post-modal.html',
  styleUrl: './add-post-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddPostModalComponent implements OnChanges {
  /* =========================
     INPUTS / OUTPUTS
  ========================= */

  @Input() editMode = false;
  @Input() editPost: Post | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() postCreated = new EventEmitter<void>();

  /* =========================
     SERVICES
  ========================= */

  private fileService = inject(FileService);
  private postService = inject(PostService);
  private profileService = inject(ProfileService);
  private searchService = inject(SearchService);
  private locationSearch = inject(LocationSearchService);
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  /* =========================
     FORM
  ========================= */

  form: FormGroup;

  /* =========================
     SIGNAL STATE
  ========================= */

  readonly uploadedMedia = signal<
    { url: string; mediaType: number; thumbnailUrl?: string }[]
  >([]);
  readonly hashtags = signal<string[]>([]);
  readonly taggedUsers = signal<SearchUser[]>([]);
  readonly taggedUserQuery = signal('');
  readonly taggedUserError = signal<string | null>(null);
  readonly locationQuery = signal('');
  readonly selectedLocation = signal<LocationSuggestion | null>(null);
  readonly userSuggestions = computed(() => {
    const selectedIds = new Set(this.taggedUsers().map(user => user._id));
    return this.searchService
      .users()
      .filter(user => !selectedIds.has(user._id));
  });
  readonly locationSuggestions = this.locationSearch.suggestions;
  readonly isLocationLoading = this.locationSearch.loading;
  readonly hasInvalidTaggedUserInput = computed(() =>
    !!this.taggedUserQuery().trim() || !!this.taggedUserError()
  );

readonly currentState = computed(() =>
  JSON.stringify({
    form: this.formState(),
    media: this.uploadedMedia(),
    hashtags: this.hashtags(),
    taggedUserIds: this.taggedUserIdsArray(),
    location: this.selectedLocation()
  })
);

readonly hasChanges = computed(() =>
  this.editMode
    ? this.currentState() !== this.initialState
    : true
);

  private initialState: string | null = null;

  readonly previewUrls = signal<string[]>([]);
  readonly isUploading = signal(false);
  readonly isPosting = signal(false);
  private formState = signal<any>(null);

  constructor(private fb: FormBuilder) {

    this.form = this.fb.group({
      caption: [''],
      visibility: [1],
      postType: [1],
      hideComments: [false],
      hideLikes: [false],
      hideShares: [false],
      audio: [''],
      audioName: [''],
      scanId: ['']
    });

  // Initialize form state
  this.formState.set(this.form.value);

  // Sync changes
  this.form.valueChanges.subscribe(value => {
    this.formState.set(value);
  });


  }

  /* =========================
     PREFILL (EDIT MODE)
  ========================= */

  ngOnChanges(changes: SimpleChanges): void {

    if (!this.editMode || !this.editPost) return;

    this.form.patchValue({
      caption: this.editPost.caption ?? '',
      visibility: 1,
      hideComments: this.editPost.hideComments,
      hideLikes: this.editPost.hideLikes,
      hideShares: this.editPost.hideShares
    });

    // Map Post.media → CreatePostRequest.media
    this.uploadedMedia.set(
      this.editPost.media.map(m => ({
        url: m.url ?? '',
        mediaType: m.mediaType,
        thumbnailUrl: m.thumbnailUrl
      }))
    );

    this.previewUrls.set(
      this.editPost.media.map(m => m.completeUrl ?? '')
    );
    this.hashtags.set(this.normalizeHashtags((this.editPost as any).hashtags));
    this.prefillTaggedUsers(this.editPost);

    const postAny = this.editPost as any;
    const latitude = Number(postAny?.latitude ?? postAny?.location?.coordinates?.[1]);
    const longitude = Number(postAny?.longitude ?? postAny?.location?.coordinates?.[0]);
    const address = typeof postAny?.address === 'string' ? postAny.address : '';
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      this.selectedLocation.set({
        displayName: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        latitude,
        longitude
      });
      this.locationQuery.set(address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    }

    this.initialState = this.serializeState();
  }

private serializeState(): string {
  return JSON.stringify({
    form: this.formState(),
    media: this.uploadedMedia(),
    hashtags: this.hashtags(),
    taggedUserIds: this.taggedUserIdsArray(),
    location: this.selectedLocation()
  });
}

  /* =========================
     FILE UPLOAD
  ========================= */

  onFileSelected(event: Event): void {

    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);

    this.isUploading.set(true);

    this.fileService.uploadMany(files).subscribe({
      next: (res: any) => {

        const uploadedFiles = res?.data?.files ?? [];

        this.uploadedMedia.update(current => [
          ...current,
          ...uploadedFiles.map((file: any) => ({
            url: file.filePath,
            mediaType: 1,
            thumbnailUrl: undefined
          }))
        ]);

        this.previewUrls.update(current => [
          ...current,
          ...uploadedFiles.map((file: any) => file.fileUrl)
        ]);

        this.isUploading.set(false);
      },
      error: () => this.isUploading.set(false)
    });
  }

  removeImage(index: number): void {

    this.uploadedMedia.update(arr =>
      arr.filter((_, i) => i !== index)
    );

    this.previewUrls.update(arr =>
      arr.filter((_, i) => i !== index)
    );
  }

  onHashtagKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    if (!['Enter', ',', 'Tab', ' '].includes(event.key)) return;
    event.preventDefault();
    this.addHashtagsFromInput(input);
  }

  onHashtagBlur(input: HTMLInputElement): void {
    this.addHashtagsFromInput(input);
  }

  removeHashtag(tag: string): void {
    this.hashtags.update(current => current.filter(item => item !== tag));
  }

  onTaggedUserInput(value: string): void {
    this.taggedUserQuery.set(value);
    this.taggedUserError.set(null);
    this.searchService.searchUsers(value);
  }

  addTaggedUser(user: SearchUser): void {
    const exists = this.taggedUsers().some(item => item._id === user._id);
    if (exists) return;

    this.taggedUsers.update(current => [...current, user]);
    this.taggedUserQuery.set('');
    this.taggedUserError.set(null);
    this.searchService.searchUsers('');
  }

  removeTaggedUser(userId: string): void {
    this.taggedUsers.update(current => current.filter(user => user._id !== userId));
  }

  onTaggedUserBlur(): void {
    const query = this.taggedUserQuery().trim();
    if (!query) {
      this.taggedUserError.set(null);
      return;
    }

    this.taggedUserError.set('Please select a valid user from suggestions.');
  }

  onTaggedUserKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const query = this.taggedUserQuery().trim().toLowerCase();
    if (!query) return;

    const exactMatch = this.userSuggestions().find(user =>
      user.userName?.trim().toLowerCase() === query ||
      user.name?.trim().toLowerCase() === query
    );

    if (!exactMatch) {
      this.taggedUserError.set('Please select a valid user from suggestions.');
      return;
    }

    this.addTaggedUser(exactMatch);
  }

  onLocationInput(value: string): void {
    this.locationQuery.set(value);
    this.selectedLocation.set(null);
    this.locationSearch.search(value);
  }

  selectLocation(location: LocationSuggestion): void {
    this.selectedLocation.set(location);
    this.locationQuery.set(location.displayName);
    this.locationSearch.clear();
  }

  clearLocation(): void {
    this.selectedLocation.set(null);
    this.locationQuery.set('');
    this.locationSearch.clear();
  }

  private addHashtagsFromInput(input: HTMLInputElement): void {
    const tokens = this.extractHashtags(input.value);
    if (!tokens.length) {
      input.value = '';
      return;
    }

    this.hashtags.update(current => {
      const set = new Set(current);
      for (const token of tokens) set.add(token);
      return [...set];
    });

    input.value = '';
  }

  /* =========================
     SUBMIT (CREATE / UPDATE)
  ========================= */

submit(): void {

  if (!this.uploadedMedia().length) return;

  this.isPosting.set(true);

  const raw = this.form.value;

  // =========================
  // UPDATE MODE
  // =========================

  if (this.editMode && this.editPost) {

    const updatePayload: Partial<CreatePostRequest> = {
      visibility: Number(raw.visibility),
      media: this.uploadedMedia(),
      ...cleanObject({
        caption: raw.caption?.trim(),
        hashtags: this.hashtagsArray(),
        taggedUserIds: this.taggedUserIdsArray(),
        hideComments: raw.hideComments,
        hideLikes: raw.hideLikes,
        hideShares: raw.hideShares,
        ...this.locationPayload(),
        audio: raw.audio?.trim(),
        audioName: raw.audioName?.trim(),
        scanId: raw.scanId?.trim()
      })
    };

    this.profileService
      .updatePost(this.editPost._id, updatePayload)
      .subscribe({
        next: () => {
          this.isPosting.set(false);
          this.close.emit();
        },
        error: () => this.isPosting.set(false)
      });

    return;
  }

  // =========================
  // CREATE MODE
  // =========================

  const createPayload: CreatePostRequest = {
    visibility: Number(raw.visibility), // required
    postType: Number(raw.postType),     // required for create
    media: this.uploadedMedia(),
    ...cleanObject({
      caption: raw.caption?.trim(),
      hashtags: this.hashtagsArray(),
      taggedUserIds: this.taggedUserIdsArray(),
      hideComments: raw.hideComments,
      hideLikes: raw.hideLikes,
      hideShares: raw.hideShares,
      ...this.locationPayload(),
      audio: raw.audio?.trim(),
      audioName: raw.audioName?.trim(),
      scanId: raw.scanId?.trim()
    })
  };

  this.postService.createPost(createPayload).subscribe({
    next: (res: any) => {

      const createdPost: Post | undefined = res?.data;

      if (createdPost) {
        this.profileService.addPostOptimistically(createdPost);
      }

      this.isPosting.set(false);
      this.postCreated.emit();
      this.close.emit();
    },
    error: () => this.isPosting.set(false)
  });
}

  /* =========================
     HELPERS
  ========================= */

  private taggedUserIdsArray(): string[] | undefined {
    const ids = this.taggedUsers()
      .map(user => user._id)
      .filter(Boolean);
    return ids.length ? [...new Set(ids)] : undefined;
  }

  private locationPayload():
    | {
        address: string;
        location: {
          type: 'Point';
          coordinates: [number, number];
        };
      }
    | undefined {
    const selected = this.selectedLocation();
    if (!selected) return undefined;

    return {
      address: selected.displayName,
      location: {
        type: 'Point',
        coordinates: [selected.longitude, selected.latitude]
      }
    };
  }

  private hashtagsArray(): string[] | undefined {
    const tags = this.hashtags().map(tag => tag.trim()).filter(Boolean);
    return tags.length ? tags : undefined;
  }

  private normalizeHashtags(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map(item => String(item ?? '').trim().replace(/^#+/, ''))
      .filter(Boolean);
  }

  private extractHashtags(value: string): string[] {
    if (!value) return [];

    const rawTokens = value
      .split(/[\s,#]+/)
      .map(token => token.trim().replace(/^#+/, ''))
      .filter(Boolean);

    return rawTokens;
  }

  private prefillTaggedUsers(post: Post): void {
    const fromTaggedUsers = Array.isArray((post as any)?.taggedUsers)
      ? (post as any).taggedUsers
      : [];

    const validUsersFromObject = fromTaggedUsers
      .map((user: any) => ({
        _id: String(user?._id ?? '').trim(),
        userName: String(user?.userName ?? '').trim(),
        name: String(user?.name ?? user?.userName ?? '').trim(),
        profilePicture: user?.profilePicture,
        isFollower: false,
        isFollowing: false
      }))
      .filter((user: SearchUser) => !!user._id && !!user.userName);

    if (validUsersFromObject.length) {
      this.taggedUsers.set(validUsersFromObject);
      return;
    }

    const taggedIds = Array.isArray(post.taggedUserIds)
      ? post.taggedUserIds.map(id => String(id ?? '').trim()).filter(Boolean)
      : [];

    if (!taggedIds.length) {
      this.taggedUsers.set([]);
      return;
    }

    const requests = taggedIds.map(id =>
      this.api
        .get<ApiResponse<{ items: SearchUser[] }>>(
          API_ENDPOINTS.USER.GET_ALL,
          { _id: id }
        )
        .pipe(
          map(res => res?.data?.items?.[0] ?? null),
          catchError(() => of(null))
        )
    );

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(users => {
        const validUsers = users
          .filter((user): user is SearchUser => !!user?._id && !!user?.userName)
          .map(user => ({
            _id: user._id,
            userName: user.userName,
            name: user.name,
            profilePicture: user.profilePicture,
            isFollower: user.isFollower,
            isFollowing: user.isFollowing
          }));

        this.taggedUsers.set(validUsers);
        this.initialState = this.serializeState();
      });
  }
}
