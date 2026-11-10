import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification, STAFF_TARGET } from '../../interfaces/notification';
import { NotificationService } from '../../services/notification';

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

  icons = { success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill', info: 'bi-info-circle-fill' };

  toggle() {
    this.open.update((v) => !v);
  }
  close() {
    this.open.set(false);
  }

  view(n: AppNotification) {
    this.notificationService.markRead(n.id);
    this.close();
    this.router.navigate([n.target === STAFF_TARGET ? '/dashboard/orders' : '/account']);
  }
}
