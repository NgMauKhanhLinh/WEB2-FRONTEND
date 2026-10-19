import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { HttpContextToken } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, mergeMap, of, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth-service';

const AUTH_RETRY = new HttpContextToken<boolean>(() => false);

const AUTH_ENDPOINTS_WITHOUT_BEARER = [
  '/login',
  '/register',
  '/verify-register-otp',
  '/forgot-password',
  '/verify-otp',
  '/reset-password',
  '/refresh',
];

const AUTH_ENDPOINTS_WITHOUT_REFRESH = [
  ...AUTH_ENDPOINTS_WITHOUT_BEARER,
  '/logout',
];

const isAuthEndpointUrl = (url: string): boolean =>
  AUTH_ENDPOINTS_WITHOUT_BEARER.some((path) => url.includes(path));

const isAuthExpired = (error: unknown): boolean => {
  if (error instanceof HttpErrorResponse) {
    return error.status === 401 || error.error?.EC === -999;
  }
  return false;
};

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getAccessToken();

  const requestWithToken = token && !isAuthEndpointUrl(request.url)
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  const refreshAndRetry = (error: unknown) => {
    if (!isAuthExpired(error)) return throwError(() => error);

    const isAuthEndpoint = AUTH_ENDPOINTS_WITHOUT_REFRESH.some((path) => request.url.includes(path));
    const alreadyRetried = request.context.get(AUTH_RETRY);
    if (isAuthEndpoint || alreadyRetried || !auth.getAccessToken()) {
      return throwError(() => error);
    }

    return auth.refreshAccessToken().pipe(
      switchMap((newToken) => next(request.clone({
        setHeaders: { Authorization: `Bearer ${newToken}` },
        context: request.context.set(AUTH_RETRY, true),
        withCredentials: true,
      }))),
      catchError((refreshError: unknown) => {
        auth.logout();
        void router.navigate(['/login'], { queryParams: { reason: 'session-expired' } });
        return throwError(() => refreshError);
      }),
    );
  };

  return next(requestWithToken).pipe(
    mergeMap((event) => {
      // The React client treats EC=-999 as an expired session even when HTTP status is 200.
      if (event instanceof HttpResponse && (event.body as { EC?: number } | null)?.EC === -999) {
        return throwError(() => new HttpErrorResponse({
          status: 401,
          statusText: 'Unauthorized',
          url: request.url,
          error: event.body,
        }));
      }
      return of(event);
    }),
    catchError((error: unknown) => refreshAndRetry(error)),
  );
};
