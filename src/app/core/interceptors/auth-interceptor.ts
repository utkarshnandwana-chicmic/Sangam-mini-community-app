import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Get the token
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('tempRegisterToken');

  // Clone request with token if exists
  const clonedReq = token
    ? req.clone({
        setHeaders: {
          authorization: token
        }
      })
    : req;

  // Handle response
  return next(clonedReq).pipe(
    catchError((error: any) => {
      // Redirect to 403 if unauthorized
      if (error.status === 403) {
        router.navigate(['/403']);
      }
      return throwError(() => error);
    })
  );
};
