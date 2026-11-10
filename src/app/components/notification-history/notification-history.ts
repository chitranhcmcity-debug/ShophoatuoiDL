import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '../../interfaces/notification';
import { NotificationService } from '../../services/notification';
import { NOTIFICATION_ICONS } from '../notification-bell/notification-bell';
import { Pagination } from '../pagination/pagination';

/** Lịch sử toàn bộ thông báo của người đang đăng nhập (dùng ở Dashboard và trang Tài khoản) */
@Component({
  selector: 'app-notification-history',
  imports: [DatePipe, Pagination],
  templateUrl: './notification-history.html',
  styleUrl: './notification-history.css',
})
export class NotificationHistory {
  notificationService = inject(NotificationService);
  private router = inject(Router);
  icons = NOTIFICATION_ICONS;

  onlyUnread = signal(false);
  list = computed(() => this.notificationService.mine().filter((n) => !this.onlyUnread() || !n.read));

  page = signal(1);
  pageSize = signal(10);
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.list().slice(start, start + this.pageSize());
  });

  showUnread(value: boolean) {
    this.onlyUnread.set(value);
    this.page.set(1);
  }

  open(n: AppNotification) {
    this.notificationService.markRead(n.id);
    this.router.navigateByUrl(this.notificationService.linkOf(n));
  }
}
