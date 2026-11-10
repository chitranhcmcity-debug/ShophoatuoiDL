import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ORDER_STATUSES, toneOfStatus } from '../../interfaces/order';
import { Auth } from '../../services/auth';
import { CheckoutService } from '../../services/checkout';
import { CustomerService } from '../../services/customer';
import { SettingsService } from '../../services/settings';
import { ProductService } from '../../services/product';

@Component({
  selector: 'app-overview',
  imports: [DatePipe],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  private productService = inject(ProductService);
  private checkoutService = inject(CheckoutService);
  private customerService = inject(CustomerService);
  authService = inject(Auth);
  settings = inject(SettingsService).settings;

  products = this.productService.products;
  orders = this.checkoutService.orders;

  // 5 bước xử lý + trạng thái hủy, màu lấy từ ORDER_STATUSES
  statuses = ORDER_STATUSES.map((s) => ({ name: s.status, tone: s.tone, icon: s.icon }));

  customerCount = computed(() => this.customerService.customers().length);
  revenue = computed(() =>
    this.orders()
      .filter((o) => o.status !== 'Đã hủy')
      .reduce((s, o) => s + o.total, 0)
  );
  lowStock = computed(() => this.products().filter((p) => p.stock < this.settings().lowStockThreshold).sort((a, b) => a.stock - b.stock));
  topSold = computed(() => [...this.products()].sort((a, b) => b.sold - a.sold).slice(0, 5));
  maxSold = computed(() => Math.max(1, ...this.topSold().map((p) => p.sold)));
  recentOrders = computed(() => [...this.orders()].reverse().slice(0, 5));
  statusCounts = computed(() =>
    this.statuses.map((s) => ({ ...s, count: this.orders().filter((o) => o.status === s.name).length }))
  );
  maxStatus = computed(() => Math.max(1, ...this.statusCounts().map((s) => s.count)));

  toneOf = toneOfStatus;
  /** Đơn chưa hoàn tất: chưa giao xong và chưa hủy */
  activeOrders = computed(() => this.orders().filter((o) => o.status !== 'Đã giao' && o.status !== 'Đã hủy').length);
}
