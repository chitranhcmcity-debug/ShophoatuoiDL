import { Injectable, computed, signal } from '@angular/core';
import { AppNotification, STAFF_TARGET } from '../interfaces/notification';
import { Auth } from './auth';
import { StorageService } from './storage';

const MAX_KEEP = 100;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private key = 'notifications';
  all = signal<AppNotification[]>([]);

  /** Thông báo dành cho người đang đăng nhập (mới nhất lên đầu) */
  mine = computed(() => {
    const user = this.authService.user();
    if (!user) return [];
    const isStaff = user.role !== 'customer' && this.authService.hasPermission('order.view');
    return this.all()
      .filter((n) => (n.target === STAFF_TARGET ? isStaff : n.target === user.id))
      .sort((a, b) => b.time.localeCompare(a.time));
  });
  unreadCount = computed(() => this.mine().filter((n) => !n.read).length);

  constructor(private authService: Auth, private storageService: StorageService) {
    this.all.set(storageService.getOrCreate<AppNotification[]>(this.key, []));

    // Máy / tab khác (vd: khách vừa hủy đơn) thêm thông báo thì chuông ở đây cập nhật theo
    storageService.watch(this.key, () => this.all.set(this.storageService.get<AppNotification[]>(this.key) ?? []));
  }

  private save() {
    this.storageService.set(this.key, this.all());
  }

  push(n: Omit<AppNotification, 'id' | 'time' | 'read'>) {
    // đọc lại từ storage để không ghi đè thông báo do tab khác vừa thêm
    const current = this.storageService.get<AppNotification[]>(this.key) ?? this.all();
    const item: AppNotification = {
      ...n,
      id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6),
      time: new Date().toISOString(),
      read: false,
    };
    this.all.set([...current, item].slice(-MAX_KEEP));
    this.save();
  }

  markRead(id: string) {
    this.all.update((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)));
    this.save();
  }

  markAllRead() {
    const ids = new Set(this.mine().map((n) => n.id));
    this.all.update((l) => l.map((n) => (ids.has(n.id) ? { ...n, read: true } : n)));
    this.save();
  }
}
