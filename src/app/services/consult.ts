import { Injectable, signal } from '@angular/core';
import { Consult } from '../interfaces/consult';
import { STAFF_TARGET } from '../interfaces/notification';
import { Auth } from './auth';
import { NotificationService } from './notification';
import { StorageService } from './storage';

@Injectable({ providedIn: 'root' })
export class ConsultService {
  private key = 'consults';
  consults = signal<Consult[]>([]);

  constructor(
    private storageService: StorageService,
    private notificationService: NotificationService,
    private authService: Auth
  ) {
    this.consults.set(storageService.getOrCreate<Consult[]>(this.key, []));
    // Khách vừa gửi yêu cầu ở máy / tab khác thì danh sách tự cập nhật
    storageService.watch(this.key, () => this.consults.set(storageService.get<Consult[]>(this.key) ?? []));
  }

  private commit(list: Consult[]) {
    this.consults.set(list);
    this.storageService.set(this.key, list);
  }

  add(info: Pick<Consult, 'fullname' | 'phone' | 'note'>) {
    const item: Consult = { ...info, id: 'k' + Date.now(), createdAt: new Date().toISOString(), contacted: false };
    this.commit([...this.consults(), item]);
    this.notificationService.push({
      target: STAFF_TARGET,
      link: '/dashboard/consults',
      perm: 'consult.view',
      tone: 'info',
      title: 'Yêu cầu tư vấn mới',
      message: `${item.fullname} · ${item.phone}`,
    });
  }

  setContacted(id: string, contacted: boolean) {
    const by = this.authService.user()?.username;
    this.commit(
      this.consults().map((c) =>
        c.id === id ? { ...c, contacted, contactedBy: contacted ? by : undefined, contactedAt: contacted ? new Date().toISOString() : undefined } : c
      )
    );
  }

  remove(id: string) {
    this.commit(this.consults().filter((c) => c.id !== id));
  }
}
