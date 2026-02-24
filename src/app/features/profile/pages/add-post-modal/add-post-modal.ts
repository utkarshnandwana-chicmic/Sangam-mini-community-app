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
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

import { FileService } from '../../../../core/services/file-service';
import { PostService } from '../../services/post';
import { ProfileService } from '../../services/profile';

import {
  CreatePostRequest,
  Post
} from '../../models/post.model';

import { cleanObject } from '../../../../core/utils/object.util';

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

readonly currentState = computed(() =>
  JSON.stringify({
    form: this.formState(),
    media: this.uploadedMedia()
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
      hashtags: [''],
      taggedUserIds: [''],
      visibility: [1],
      postType: [1],
      hideComments: [false],
      hideLikes: [false],
      hideShares: [false],
      address: [''],
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

    this.initialState = this.serializeState();
  }

private serializeState(): string {
  return JSON.stringify({
    form: this.formState(),
    media: this.uploadedMedia()
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
        hashtags: this.parseCommaArray(raw.hashtags),
        taggedUserIds: this.parseCommaArray(raw.taggedUserIds),
        hideComments: raw.hideComments,
        hideLikes: raw.hideLikes,
        hideShares: raw.hideShares,
        address: raw.address?.trim(),
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
      hashtags: this.parseCommaArray(raw.hashtags),
      taggedUserIds: this.parseCommaArray(raw.taggedUserIds),
      hideComments: raw.hideComments,
      hideLikes: raw.hideLikes,
      hideShares: raw.hideShares,
      address: raw.address?.trim(),
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

  private parseCommaArray(value: string): string[] | undefined {

    if (!value) return undefined;

    const arr = value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    return arr.length ? arr : undefined;
  }
}