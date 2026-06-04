import { HttpInterceptorFn, HttpErrorResponse, HttpEvent, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth';
import { catchError, throwError, switchMap, BehaviorSubject, filter, take, Observable } from 'rxjs';
import { Router } from '@angular/router';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const token = authService.getToken();
  if (token) {
    req = addToken(req, token);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        console.warn('Interceptor: Recibido 401, iniciando refresco...');
        return handle401Error(req, next, authService, router);
      }
      return throwError(() => error);
    })
  );
};

const addToken = (req: HttpRequest<unknown>, token: string): HttpRequest<unknown> => {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
};

const handle401Error = (
  req: HttpRequest<unknown>, 
  next: HttpHandlerFn, 
  authService: AuthService, 
  router: Router
): Observable<HttpEvent<unknown>> => {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((res: any) => {
        isRefreshing = false;
        const newToken = res.accessToken || res.tokens?.accessToken;
        console.log('Interceptor: Token refrescado exitosamente');
        refreshTokenSubject.next(newToken);
        return next(addToken(req, newToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        console.error('Interceptor: Refresh token inválido, cerrando sesión');
        authService.logout();
        router.navigate(['/login']);
        return throwError(() => err);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next(addToken(req, token!)))
    );
  }
};
