import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('tempRegisterToken');

  if (!token) {
    return next(req);
  }

  const clonedReq = req.clone({
    setHeaders: {
      authorization: token
    }
  });

  return next(clonedReq);
};
