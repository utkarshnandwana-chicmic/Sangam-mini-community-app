import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-profile-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-step.html',
  styleUrl: './profile-step.scss'
})
export class ProfileStepComponent {
  constructor(private cdr: ChangeDetectorRef) {}


  @Input() profileForm!: FormGroup;
  @Input() isLoading = false;

  @Output() onSubmit = new EventEmitter<void>();


  isInvalid(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
    return !!(
      control &&
      control.invalid &&
      (control.dirty || control.touched || control.hasError('apiError'))
    );
  }

  get isUsernameChecking(): boolean {
    return this.profileForm.get('userName')?.pending ?? false;
  }



}
