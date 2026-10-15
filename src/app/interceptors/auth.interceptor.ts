import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth-service';

const AUTH_ENDPOINTS_WITHOUT_REFRESH = [
  '/login',
  '/register',
  '/verify-register-otp',
  '/forgot-password',
  '/verify-otp',
  '/reset-password',
  '/refresh',
];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getAccessToken();

  const requestWithToken = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(requestWithToken).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      const isAuthEndpoint = AUTH_ENDPOINTS_WITHOUT_REFRESH.some((path) => request.url.includes(path));
      const alreadyRetried = request.headers.has('X-Auth-Retry');
      if (isAuthEndpoint || alreadyRetried || !auth.getAccessToken()) {
        return throwError(() => error);
      }

      return auth.refreshAccessToken().pipe(
        switchMap((newToken) => next(request.clone({
          setHeaders: {
            Authorization: `Bearer ${newToken}`,
            'X-Auth-Retry': '1',
          },
          withCredentials: true,
        }))),
        catchError((refreshError: unknown) => {
          auth.logout();
          void router.navigate(['/login'], { queryParams: { reason: 'session-expired' } });
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
