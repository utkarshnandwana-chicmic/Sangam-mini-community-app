import {
  Component,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { switchMap, of } from 'rxjs';

import { EditProfileFormComponent } from './edit-profile';
import { ProfileService } from '../services/profile';
import { UpdateProfileRequest } from '../../../core/model/update-profile.model';
import { FileService } from '../../../core/services/file-service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    CommonModule,
    EditProfileFormComponent
  ],
  template: `
    <ng-container *ngIf="profile() as profile">
      <app-edit-profile-form
        [profile]="profile"
        (save)="onSave($event)"
        (fileSelected)="onFileSelected($event)">
      </app-edit-profile-form>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditProfileContainer {

  private profileService = inject(ProfileService);
  private router = inject(Router);
  private fileService = inject(FileService);

  readonly profile = this.profileService.profile;

  private selectedFile: File | null = null;

  /* ---------------- FILE SELECT ---------------- */

  onFileSelected(file: File | null): void {
    this.selectedFile = file;
  }

  /* ---------------- SAVE FLOW ---------------- */

  onSave(payload: UpdateProfileRequest): void {

    if (!payload && !this.selectedFile) return;

    const upload$ = this.selectedFile
      ? this.fileService.upload(this.selectedFile)
      : of(null);

    upload$
      .pipe(
        switchMap(uploadRes => {

          const profileImagePath = uploadRes?.data?.filePath;

          const finalPayload: UpdateProfileRequest = {
            ...payload,
            ...(profileImagePath && { profilePicture: profileImagePath })
          };

          return this.profileService.updateProfile(finalPayload);
        })
      )
      .subscribe({
        next: () => {
          this.selectedFile = null;
          this.router.navigate(['/profile']);
        }
      });
  }
}