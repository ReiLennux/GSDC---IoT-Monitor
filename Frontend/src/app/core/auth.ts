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
    return this.http.post<{ tokens: { accessToken: string } }>('/api/v1/auth/login', credentials)
      .pipe(tap(res => {
        const token = res.tokens.accessToken;
        localStorage.setItem('token', token);
        this.token.set(token);
      }));
  }

  logout() {
    localStorage.removeItem('token');
    this.token.set(null);
  }

  getToken() {
    return this.token();
  }
}
