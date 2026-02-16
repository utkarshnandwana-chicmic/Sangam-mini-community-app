import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-step.html',
  styleUrl: './profile-step.scss'
})
export class ProfileStepComponent {
  @Input() profileForm!: FormGroup;
  @Input() isLoading = false;
  
  // FIX: Change 'onRegister' to 'onSubmit' so it matches (onSubmit) in the parent HTML
  @Output() onSubmit = new EventEmitter<void>(); 

  isInvalid(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
return !!(
  control &&
  control.invalid &&
  (control.dirty || control.touched || control.hasError('apiError'))
);
  }
}