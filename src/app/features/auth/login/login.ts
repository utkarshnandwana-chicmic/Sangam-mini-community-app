import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { NgIf } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { NoLeadingSpaceDirective } from '../../../core/directives/no-leading-space.directive';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, NgIf, RouterLink, NoLeadingSpaceDirective],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);

  hidePassword = true;
  readonly isSubmitting = signal(false);


  loginForm = this.fb.group({
    email:['', [Validators.required, Validators.email]],
    password: ['', [Validators.required,      Validators.pattern(
  '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$'
)]]
  })

ngOnInit(): void {

  if (this.authService.isLoggedIn()) {
    this.router.navigate(['/home']);
  }

  this.loginForm.get('email')?.valueChanges
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.clearApiError('email'));

  this.loginForm.get('password')?.valueChanges
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.clearApiError('password'));
}


onSubmit(): void {

  if (this.isSubmitting()) return;

  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    return;
  }

  this.isSubmitting.set(true);
  const { email, password } = this.loginForm.value;

  this.authService.login(email!, password!)
    .pipe(
      finalize(() => this.isSubmitting.set(false)),
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe({
      next: () => {
        this.toast.success('Login successful');
        this.router.navigate(['/home']);
      },
      error: (err) => {

        const message = err?.error?.message || 'Login failed';

        if (message.toLowerCase().includes('email')) {
          this.loginForm.get('email')?.setErrors({ apiError: message });
        } 
        else if (message.toLowerCase().includes('password')) {
          this.loginForm.get('password')?.setErrors({ apiError: message });
        } 
        else {
          this.loginForm.setErrors({ apiError: message });
        }
      }
    });
}

private clearApiError(controlName: string) {
  const control = this.loginForm.get(controlName);

  if (control?.errors?.['apiError']) {
    delete control.errors['apiError'];
    control.setErrors(Object.keys(control.errors).length ? control.errors : null);
  }
}



}
