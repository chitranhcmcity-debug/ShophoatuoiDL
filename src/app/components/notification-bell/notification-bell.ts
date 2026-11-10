import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '../../interfaces/notification';
import { NotificationService } from '../../services/notification';

export const NOTIFICATION_ICONS = { success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill', info: 'bi-info-circle-fill' };

@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell {
  notificationService = inject(NotificationService);
  private router = inject(Router);
  open = signal(false);
  icons = NOTIFICATION_ICONS;

  toggle() {
    this.open.update((v) => !v);
  }
  close() {
    this.open.set(false);
  }

  /** Đã xem thì đánh dấu đọc, thông báo biến khỏi chuông */
  view(n: AppNotification) {
    this.notificationService.markRead(n.id);
    this.close();
    this.router.navigateByUrl(this.notificationService.linkOf(n));
  }

  openHistory() {
    this.close();
    this.router.navigateByUrl(this.notificationService.historyLink());
  }
}
