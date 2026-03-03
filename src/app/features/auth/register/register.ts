import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { PhoneStepComponent } from '../registration/phone-step/phone-step';
import { OtpStepComponent } from '../registration/otp-step/otp-step';
import { ProfileStepComponent } from '../registration/profile-step/profile-step';
import { Router } from '@angular/router';
import { RegisterRequest } from '../../../core/model/auth.model';
import { cleanObject } from '../../../core/utils/object.util';
import { switchMap, map, catchError, of, first, timer, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PhoneStepComponent,
    OtpStepComponent,
    ProfileStepComponent
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {

  private destroyRef = inject(DestroyRef);

  currentStep = 1;
  isLoading = false;
  errorMessage = '';
  phoneVerificationToken: string = '';

  phoneForm!: FormGroup;
  otpForm!: FormGroup;
  profileForm!: FormGroup;



  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.initializeForms();
    this.setupApiErrorCleaner();
  }



  // ---------------- UI HELPERS ----------------

  getStepLabel(): string {
    const stepLabels: { [key: number]: string } = {
      1: 'Mobile Number',
      2: 'Security Check',
      3: 'Finalize Profile',
      4: 'Success',
    };
    return stepLabels[this.currentStep] || '';
  }

  private usernameValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value || control.value.length < 3) {
        return of(null);
      }

      return timer(500).pipe(
        switchMap(() => this.authService.checkUsername(control.value)),
        map((res) => {
          return res?.data?.isAvailable ? null : { usernameTaken: true };
        }),
        catchError(() => of(null)),
        first()
      );
    };
  }

  private setupApiErrorCleaner() {
    const forms = [this.phoneForm, this.otpForm, this.profileForm];

    forms.forEach((form) => {
      Object.keys(form.controls).forEach((controlName) => {
        form.get(controlName)?.valueChanges
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            const control = form.get(controlName);

            if (control?.errors?.['apiError']) {
              delete control.errors['apiError'];
              control.setErrors(Object.keys(control.errors).length ? control.errors : null);
            }
          });
      });
    });
  }

  clearAlerts() {
    this.errorMessage = '';
  }

  // ---------------- FORM INIT ----------------

  initializeForms() {
    this.phoneForm = this.fb.group({
      countryCode: ['+91', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
    });

    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$'),
        ],
      ],
      name: ['', Validators.required],
      dob: ['', Validators.required],
      gender: [1, Validators.required],
      userName: [
        '',
        [Validators.required, Validators.minLength(3)],
        [this.usernameValidator()],
      ],
      description: [''],
      address: [''],
      link: [''],
      referralCode: [''],
      privateAccount: [false],
      latestUpdates: [false],
      deviceToken: [''],
      deviceVoipToken: [''],
      languagePreference: [1],
      tags: [[]],
    });
  }

  // ---------------- PHONE STEP ----------------

  sendPhone() {
    if (this.isLoading) return;
    if (this.phoneForm.invalid) return;
    this.clearAlerts();
    this.isLoading = true;

    const { phone, countryCode } = this.phoneForm.value;

    this.authService.registerPhone(phone, countryCode)
      .pipe(
        finalize(() => this.isLoading = false),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          if (res?.data?.phoneVerificationToken) {
            this.phoneVerificationToken = res.data.phoneVerificationToken;
            this.currentStep = 2;
          }
        },
        error: (err) => {
          const message = err?.error?.message || 'Failed to send OTP';
          this.phoneForm.get('phone')?.setErrors({ apiError: message });
        },
      });
  }

  // ---------------- OTP STEP ----------------

  verifyOtp() {
    if (this.isLoading) return;
    if (this.otpForm.invalid) return;
    this.clearAlerts();
    this.isLoading = true;

    this.authService.verifyOTP(this.phoneVerificationToken, this.otpForm.value.otp)
      .pipe(
        finalize(() => this.isLoading = false),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: any) => {
          const jwtToken = res?.data?.token || res?.token;

          if (jwtToken) {
            localStorage.setItem('tempRegisterToken', jwtToken);
          }

          this.currentStep = 3;
        },
        error: (err) => {
          const message = err?.error?.message || 'Invalid OTP';
          this.otpForm.get('otp')?.setErrors({ apiError: message });
        },
      });
  }

  // ---------------- COMPLETE REGISTRATION ----------------

completeRegistration() {
  if (this.isLoading) return;
  if (this.profileForm.invalid) return;

  this.isLoading = true;
  this.clearAlerts();

  const raw = this.profileForm.value;

  const basePayload: RegisterRequest = {
    email: raw.email.toLowerCase().trim(),
    name: raw.name.trim(),
    password: raw.password,
    gender: Number(raw.gender),
    userName: raw.userName.trim(),
  };

  const optionalFields = cleanObject({
    dob: raw.dob ? new Date(raw.dob).toISOString() : undefined,
    latestUpdates: raw.latestUpdates,
    languagePreference: raw.languagePreference,
    description: raw.description?.trim(),
    privateAccount: raw.privateAccount,
    deviceToken: raw.deviceToken?.trim(),
    deviceVoipToken: raw.deviceVoipToken?.trim(),
    address: raw.address?.trim(),
    tags: raw.tags,
    link: raw.link?.trim(),
    referralCode: raw.referralCode?.trim(),
  });

  const finalPayload: RegisterRequest = {
    ...basePayload,
    ...optionalFields
  };

  this.authService.completeRegister(finalPayload)
    .pipe(
      finalize(() => this.isLoading = false),
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe({
      next: () => {
        this.currentStep = 4;

        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1500);
      },
      error: (err) => {
        const message = err?.error?.message || "Registration failed";
        this.profileForm.setErrors({ apiError: message });
      }
    });
}


}
