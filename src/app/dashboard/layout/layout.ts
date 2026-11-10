import { Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { NotificationBell } from '../../components/notification-bell/notification-bell';
import { ROLE_LABELS } from '../../interfaces/permissions';
import { Auth } from '../../services/auth';
import { CheckoutService } from '../../services/checkout';
import { ConsultService } from '../../services/consult';
import { CustomerService } from '../../services/customer';
import { DataService } from '../../services/data';
import { SeenSection, SeenService } from '../../services/seen';

/** Mục menu có đếm số phát sinh mới */
const SECTIONS: Record<string, SeenSection> = {
  '/dashboard/orders': 'orders',
  '/dashboard/customers': 'customers',
  '/dashboard/consults': 'consults',
};

const sectionOf = (url: string) => Object.entries(SECTIONS).find(([path]) => url.startsWith(path))?.[1];

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBell],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  authService = inject(Auth);
  private dataService = inject(DataService);
  private router = inject(Router);
  private seenService = inject(SeenService);
  private checkoutService = inject(CheckoutService);
  private customerService = inject(CustomerService);
  private consultService = inject(ConsultService);

  private url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  /** Số mục mới theo đường dẫn menu; mục đang mở không hiện số */
  badges = computed<Record<string, number>>(() => {
    const counts: Record<SeenSection, number> = {
      orders: this.seenService.countNew('orders', this.checkoutService.orders().map((o) => o.createdAt)),
      customers: this.seenService.countNew('customers', this.customerService.customers().map((c) => c.createdAt)),
      consults: this.seenService.countNew('consults', this.consultService.consults().map((c) => c.createdAt)),
    };
    const open = sectionOf(this.url());
    return Object.fromEntries(Object.entries(SECTIONS).map(([path, section]) => [path, section === open ? 0 : counts[section]]));
  });

  constructor() {
    // Vào hoặc rời một mục thì xem như đã xem hết mục đó
    let current = this.router.url;
    const markSeen = (url: string) => {
      const section = sectionOf(url);
      if (section) this.seenService.markSeen(section);
    };
    markSeen(current);
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((e) => {
        markSeen(current);
        current = (e as NavigationEnd).urlAfterRedirects;
        markSeen(current);
      });
    inject(DestroyRef).onDestroy(() => markSeen(current));
  }

  // tone = màu của ô biểu tượng (xem bảng màu trong styles.css)
  menus = [
    { path: '/dashboard', label: 'Tổng quan', icon: 'bi-grid-1x2-fill', tone: 'plum', exact: true, perm: 'dashboard.view' },
    { path: '/dashboard/products', label: 'Sản phẩm', icon: 'bi-flower2', tone: 'rose', exact: false, perm: 'product.view' },
    { path: '/dashboard/orders', label: 'Đơn hàng', icon: 'bi-bag-heart-fill', tone: 'amber', exact: false, perm: 'order.view' },
    { path: '/dashboard/employees', label: 'Nhân viên', icon: 'bi-person-vcard-fill', tone: 'sapphire', exact: false, perm: 'employee.view' },
    { path: '/dashboard/customers', label: 'Khách hàng', icon: 'bi-people-fill', tone: 'emerald', exact: false, perm: 'customer.view' },
    { path: '/dashboard/consults', label: 'Tư vấn', icon: 'bi-chat-heart-fill', tone: 'rose', exact: false, perm: 'consult.view' },
    { path: '/dashboard/notifications', label: 'Thông báo', icon: 'bi-bell-fill', tone: 'amber', exact: false, perm: 'dashboard.view' },
    { path: '/dashboard/reports', label: 'Báo cáo', icon: 'bi-graph-up-arrow', tone: 'emerald', exact: false, perm: 'report.view' },
    { path: '/dashboard/permissions', label: 'Phân quyền', icon: 'bi-shield-lock-fill', tone: 'sapphire', exact: false, perm: 'permission.view' },
    { path: '/dashboard/settings', label: 'Cấu hình', icon: 'bi-gear-fill', tone: 'gold', exact: false, perm: 'system.manage' },
  ];
  visibleMenus = computed(() => this.menus.filter((m) => this.authService.hasPermission(m.perm)));
  roleLabel = computed(() => ROLE_LABELS[this.authService.user()?.role ?? ''] ?? '');
  initial = computed(() => (this.authService.user()?.username ?? '?').charAt(0).toUpperCase());
  today = new Date();
  files = ['products', 'categories', 'users', 'employees', 'customers', 'orders'];

  download(name: string) {
    this.dataService.download(name);
  }
  resetData() {
    if (confirm('Khôi phục toàn bộ dữ liệu về file JSON gốc? Mọi thay đổi sẽ bị mất.')) {
      this.dataService.reset();
    }
  }
}
