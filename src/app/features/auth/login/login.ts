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

  errorMessage: string = '';
  hidePassword = true;


  loginForm = this.fb.group({
    email:['', [Validators.required, Validators.email]],
    password: ['', [Validators.required,      Validators.pattern(
  '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$'
)]]
  })

  ngOnInit(): void {
      if(this.authService.isLoggedIn()){
        this.router.navigate(['/home']);
      }
  }

  onSubmit():void{
    if(this.loginForm.valid){
      const {email, password} = this.loginForm.value;
      this.errorMessage = '';

       this.authService.login(email!, password!).subscribe({
        next: (res)=>{
          this.router.navigate(['/home']);
        },
        error: (err)=>{
          console.log('Full error: ', err);
          
        this.errorMessage = err.error?.message || 'Login failed';
        }
       })

    }

  }

}
