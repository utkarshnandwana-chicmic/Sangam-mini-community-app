import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule, NgIf, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent implements OnInit {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  hidePassword = true;


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

  this.loginForm.get('email')?.valueChanges.subscribe(() => {
    this.clearApiError('email');
  });

  this.loginForm.get('password')?.valueChanges.subscribe(() => {
    this.clearApiError('password');
  });
}


onSubmit(): void {

  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    return;
  }

  const { email, password } = this.loginForm.value;

  this.authService.login(email!, password!).subscribe({
    next: () => {
      this.router.navigate(['/home']);
    },
    error: (err) => {

      const message = err?.error?.message || 'Login failed';

      // 🔥 Smart error handling
      if (message.toLowerCase().includes('email')) {
        this.loginForm.get('email')?.setErrors({ apiError: message });
      } 
      else if (message.toLowerCase().includes('password')) {
        this.loginForm.get('password')?.setErrors({ apiError: message });
      } 
      else {
        // fallback
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
