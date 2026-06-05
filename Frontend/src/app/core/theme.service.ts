import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDark = signal(false);

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') {
      this.isDark.set(true);
      document.querySelector('html')?.classList.add('my-app-dark');
    }
  }

  toggleTheme() {
    this.isDark.update(v => !v);
    const element = document.querySelector('html');
    if (this.isDark()) {
      element?.classList.add('my-app-dark');
      localStorage.setItem(STORAGE_KEY, 'dark');
    } else {
      element?.classList.remove('my-app-dark');
      localStorage.setItem(STORAGE_KEY, 'light');
    }
  }
}
