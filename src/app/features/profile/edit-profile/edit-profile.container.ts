import {
  Component,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EditProfileFormComponent } from './edit-profile';
import { ProfileService } from '../services/profile';
import { UpdateProfileRequest } from '../../../core/model/update-profile.model';
import { FileService } from '../../../core/services/file-service';

// import { UpdateProfileRequest } from '../models/update-profile.model';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    CommonModule,
    EditProfileFormComponent
  ],
  template: `
    <ng-container *ngIf="profile$ | async as profile">

      <app-edit-profile-form
        [profile]="profile"
        [loading]="loading$ | async"
        (save)="onSave($event)"
          (fileSelected)="onFileSelected($event)">
>
      </app-edit-profile-form>

    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditProfileContainer {

  private profileService = inject(ProfileService);
  private router = inject(Router);
  private fileService = inject(FileService);

  // =========================
  // PUBLIC STREAMS
  // =========================

  readonly profile$ = this.profileService.profile$;
  readonly loading$ = this.profileService.loading$;

  private selectedFile: File | null = null;


onFileSelected(file: File | null): void {
  this.selectedFile = file;
}


  // =========================
  // SAVE HANDLER
  // =========================

onSave(payload: UpdateProfileRequest): void {

  if (!payload && !this.selectedFile) {
    return;
  }

  const proceedUpdate = (profileImagePath?: string) => {

    const finalPayload: UpdateProfileRequest = {
      ...payload,
      ...(profileImagePath && { profilePicture: profileImagePath })
    };

    this.profileService
      .updateProfile(finalPayload)
      .subscribe({
        next: () => {
          this.router.navigate(['/profile']);
        }
      });
  };

  if (this.selectedFile) {
    this.fileService.upload(this.selectedFile).subscribe({
      next: (res) => {
        const filePath = res?.data?.filePath;
        proceedUpdate(filePath);
      }
    });
  } else {
    proceedUpdate();
  }
}

}
