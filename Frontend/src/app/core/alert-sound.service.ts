import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AlertSoundService {
  private audio: HTMLAudioElement | null = null;
  private unlocked = false;
  private queued = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.audio = new Audio('/alert.mp3');
      this.audio.preload = 'auto';
      document.addEventListener('click', () => this.unlock(), { once: true });
      document.addEventListener('keydown', () => this.unlock(), { once: true });
    }
  }

  private unlock(): void {
    if (this.unlocked || !this.audio) return;
    this.audio.load();
    this.audio.play().then(() => {
      this.audio?.pause();
      this.audio!.currentTime = 0;
    }).catch(() => {});
    this.unlocked = true;
    if (this.queued) {
      this.queued = false;
      this.play();
    }
  }

  play(): void {
    if (!this.audio) return;
    if (!this.unlocked) {
      this.queued = true;
      return;
    }
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {});
  }
}
