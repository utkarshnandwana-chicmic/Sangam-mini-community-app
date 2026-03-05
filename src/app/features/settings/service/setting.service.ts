import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../../core/services/api';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog';
import { ApiResponse } from '../../profile/models/api-response.model';
import { API_ENDPOINTS } from '../../../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class UserSettingsService {

  private api = inject(ApiService);
  private confirmService = inject(ConfirmDialogService);

  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private _success = signal<string | null>(null);

  // Password signals
  private _oldPassword = signal('');
  private _newPassword = signal('');
  private _confirmPassword = signal('');

  // Getters
  readonly oldPassword = this._oldPassword.asReadonly();
  readonly newPassword = this._newPassword.asReadonly();
  readonly confirmPassword = this._confirmPassword.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly success = this._success.asReadonly();

  readonly passwordsMatch = computed(() => this._newPassword() === this._confirmPassword());
  readonly isNewPasswordValid = computed(() => this._newPassword().length >= 8 &&
    /[A-Z]/.test(this._newPassword()) && /[0-9]/.test(this._newPassword()) && /[^A-Za-z0-9]/.test(this._newPassword())
  );
  readonly canSubmit = computed(() => !!this._oldPassword() && this.passwordsMatch() && this.isNewPasswordValid());

  // Setters
  setOldPassword(val: string) { this._oldPassword.set(val); }
  setNewPassword(val: string) { this._newPassword.set(val); }
  setConfirmPassword(val: string) { this._confirmPassword.set(val); }

  changePassword() {
    if (!this.canSubmit()) { this._error.set('Fix validation errors'); return; }

    this._loading.set(true);
    this._error.set(null);
    this._success.set(null);

    const payload = { oldPassword: this._oldPassword(), newPassword: this._newPassword() };

    this.api.post<ApiResponse<null>>(API_ENDPOINTS.USER.CHANGE_PASSWORD, payload)
      .pipe(catchError(err => { this._error.set(err?.message); return of(null); }))
      .subscribe(res => {
        if (res?.status) {
          this._success.set(res.message || 'Password changed successfully');
          this._oldPassword.set(''); this._newPassword.set(''); this._confirmPassword.set('');
        }
        this._loading.set(false);
      });
  }

  async confirmDelete() {
    const confirmed = await this.confirmService.confirm({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete your account? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (confirmed) {
      this.deleteAccount();
    }
  }

  private deleteAccount() {
    this._loading.set(true);
    this._error.set(null);

    this.api.delete<ApiResponse<null>>(API_ENDPOINTS.USER.DELETE)
      .pipe(catchError(err => { this._error.set(err?.message); return of(null); }))
      .subscribe(res => {
        if (res?.status) {
          this._success.set(res.message || 'Account deleted successfully');
          // TODO: trigger logout here
        }
        this._loading.set(false);
      });
  }
}
