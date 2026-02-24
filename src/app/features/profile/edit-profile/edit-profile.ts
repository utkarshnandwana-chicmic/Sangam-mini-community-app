import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  AsyncValidatorFn
} from '@angular/forms';

import { CommonModule } from '@angular/common';
import { of, timer, switchMap, map, catchError, first } from 'rxjs';

import { AuthService } from '../../../core/services/auth';
import { ProfileUser } from '../models/profile.model';
import { UpdateProfileRequest } from '../../../core/model/update-profile.model';
import { ImageUrlPipe } from '../../../core/pipes/image-url-pipe';

@Component({
  selector: 'app-edit-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageUrlPipe],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.scss'
})
export class EditProfileFormComponent implements OnChanges {

  @Input({ required: true }) profile!: ProfileUser;
  @Input() loading: boolean = false;

  @Output() fileSelected = new EventEmitter<File | null>();
  @Output() save = new EventEmitter<UpdateProfileRequest>();

  private initialValue!: UpdateProfileRequest;

  form: FormGroup;
  previewUrl: string | null = null;
  selectedFile: File | null = null;
  imageChanged = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      userName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(30)
        ],
        [this.usernameValidator()]
      ],
      description: [''],
      link: [''],
      privateAccount: [false]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['profile'] || !this.profile) return;

    const value: UpdateProfileRequest = {
      name: this.profile.name,
      userName: this.profile.userName,
      description: this.profile.description ?? '',
      link: this.profile.link ?? '',
      privateAccount: this.profile.privateAccount
    };

    this.form.patchValue(value);
    this.initialValue = value;
    this.form.markAsPristine();

    this.previewUrl = null;
    this.imageChanged = false;
  }

  private usernameValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {

      if (!control.value || control.value.length < 3) {
        return of(null);
      }

      if (this.initialValue &&
          control.value === this.initialValue.userName) {
        return of(null);
      }

      return timer(500).pipe(
        switchMap(() =>
          this.authService.checkUsername(control.value)
        ),
        map((res: any) =>
          res?.data?.isAvailable ? null : { usernameTaken: true }
        ),
        catchError(() => of(null)),
        first()
      );
    };
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const current = this.form.value;

    const changed = Object.keys(current)
      .filter(key =>
        current[key as keyof typeof current] !==
        this.initialValue[key as keyof typeof this.initialValue]
      )
      .reduce((acc, key) => {
        acc[key as keyof UpdateProfileRequest] =
          current[key as keyof typeof current];
        return acc;
      }, {} as UpdateProfileRequest);

    this.save.emit(changed);
  }

  onFileChange(event: any): void {

    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) return;

    this.selectedFile = file;
    this.imageChanged = true;

    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };

    reader.readAsDataURL(file);

    this.fileSelected.emit(file);
  }

}