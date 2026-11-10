import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotificationBell } from '../../components/notification-bell/notification-bell';
import { ROLE_LABELS } from '../../interfaces/permissions';
import { Auth } from '../../services/auth';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBell],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  authService = inject(Auth);
  private dataService = inject(DataService);

  // tone = màu của ô biểu tượng (xem bảng màu trong styles.css)
  menus = [
    { path: '/dashboard', label: 'Tổng quan', icon: 'bi-grid-1x2-fill', tone: 'plum', exact: true, perm: 'dashboard.view' },
    { path: '/dashboard/products', label: 'Sản phẩm', icon: 'bi-flower2', tone: 'rose', exact: false, perm: 'product.view' },
    { path: '/dashboard/orders', label: 'Đơn hàng', icon: 'bi-bag-heart-fill', tone: 'amber', exact: false, perm: 'order.view' },
    { path: '/dashboard/employees', label: 'Nhân viên', icon: 'bi-person-vcard-fill', tone: 'sapphire', exact: false, perm: 'employee.view' },
    { path: '/dashboard/customers', label: 'Khách hàng', icon: 'bi-people-fill', tone: 'emerald', exact: false, perm: 'customer.view' },
    { path: '/dashboard/consults', label: 'Tư vấn', icon: 'bi-chat-heart-fill', tone: 'rose', exact: false, perm: 'consult.view' },
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
