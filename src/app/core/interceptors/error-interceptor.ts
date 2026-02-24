import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {

  const toast = inject(ToastService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      if (error.status === 0) {
        toast.error('Network error. Check your connection.');
      }
else if (error.status === 401) {
  localStorage.removeItem('token');
  localStorage.removeItem('tempRegisterToken');
  toast.error('Session expired. Please login again.');
router.navigateByUrl('/login', { replaceUrl: true });}
      else if (error.status >= 500) {
        toast.error('Server error. Please try again.');
      }
      else {
        toast.error(error.error?.message || 'Something went wrong.');
      }

      return throwError(() => error);
    })
  );
};