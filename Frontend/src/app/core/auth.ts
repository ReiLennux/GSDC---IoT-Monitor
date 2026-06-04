import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private token = signal<string | null>(localStorage.getItem('token'));

  constructor(private http: HttpClient) {}

  login(credentials: { email: string; password: any }) {
    return this.http.post<{ tokens: { accessToken: string; refreshToken: string } }>('/api/v1/auth/login', credentials)
      .pipe(tap(res => {
        this.saveTokens(res.tokens.accessToken, res.tokens.refreshToken);
      }));
  }

  refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http.post<{ accessToken: string; refreshToken: string }>('/api/v1/auth/refresh', { refreshToken })
      .pipe(tap(res => {
        this.saveTokens(res.accessToken, res.refreshToken);
      }));
  }

  private saveTokens(access: string, refresh: string) {
    localStorage.setItem('token', access);
    localStorage.setItem('refreshToken', refresh);
    this.token.set(access);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    this.token.set(null);
  }

  getToken() {
    return this.token();
  }

  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }
}
