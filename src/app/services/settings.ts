import { Injectable, signal } from '@angular/core';
import { DEFAULT_SETTINGS, SystemSettings } from '../interfaces/settings';
import { StorageService } from './storage';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private key = 'settings';
  settings = signal<SystemSettings>(DEFAULT_SETTINGS);

  constructor(private storageService: StorageService) {
    this.settings.set({ ...DEFAULT_SETTINGS, ...storageService.getOrCreate<Partial<SystemSettings>>(this.key, {}) });

    // Admin vừa lưu cấu hình ở máy khác thì tự cập nhật
    storageService.watch(this.key, () =>
      this.settings.set({ ...DEFAULT_SETTINGS, ...(this.storageService.get<Partial<SystemSettings>>(this.key) ?? {}) })
    );
  }

  save(s: SystemSettings) {
    this.settings.set(s);
    this.storageService.set(this.key, s);
  }
  reset() {
    this.save({ ...DEFAULT_SETTINGS });
  }
}
