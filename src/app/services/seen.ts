import { Injectable, effect, inject, signal } from '@angular/core';
import { Auth } from './auth';
import { StorageService } from './storage';

export type SeenSection = 'orders' | 'customers' | 'consults';

/** Mốc lần cuối mỗi người mở từng mục trong Dashboard, để đếm mục phát sinh mới (lưu trong trình duyệt) */
@Injectable({ providedIn: 'root' })
export class SeenService {
  private authService = inject(Auth);
  private storageService = inject(StorageService);
  private seen = signal<Partial<Record<SeenSection, string>>>({});

  constructor() {
    effect(() => {
      const id = this.authService.user()?.id;
      this.seen.set(id ? (this.storageService.get(this.key(id)) ?? {}) : {});
    });
  }

  private key(userId: string) {
    return 'seen_' + userId;
  }

  /** Số mục tạo sau lần mở gần nhất; chưa mở lần nào thì tất cả đều là mới */
  countNew(section: SeenSection, createdTimes: (string | undefined)[]): number {
    const since = this.seen()[section] ?? '';
    return createdTimes.filter((time) => !!time && time > since).length;
  }

  markSeen(section: SeenSection) {
    const id = this.authService.user()?.id;
    if (!id) return;
    const next = { ...this.seen(), [section]: new Date().toISOString() };
    this.seen.set(next);
    this.storageService.set(this.key(id), next);
  }
}
