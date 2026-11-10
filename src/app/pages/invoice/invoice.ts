import { DatePipe, Location } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ORDER_CANCELLED, paymentLabel } from '../../interfaces/order';
import { CheckoutService } from '../../services/checkout';
import { SettingsService } from '../../services/settings';

@Component({
  selector: 'app-invoice',
  imports: [DatePipe],
  templateUrl: './invoice.html',
  styleUrl: './invoice.css',
})
export class Invoice {
  private checkoutService = inject(CheckoutService);
  private location = inject(Location);
  private orderId = inject(ActivatedRoute).snapshot.paramMap.get('id');

  shop = inject(SettingsService).settings;
  paymentLabel = paymentLabel;

  order = computed(() => this.checkoutService.orders().find((o) => o.id === this.orderId));
  buyer = computed(() => {
    const o = this.order();
    return o ? this.checkoutService.findCurrentUserInfo(o.userId)?.fullname : undefined;
  });
  subtotal = computed(() => this.checkoutService.calculateSubtotal(this.order()?.items ?? []));
  /** Đơn cũ chưa lưu phí giao: lấy phần chênh lệch với tổng tiền */
  shippingFee = computed(() => this.order()?.shippingFee ?? (this.order()?.total ?? 0) - this.subtotal());
  isCancelled = computed(() => this.order()?.status === ORDER_CANCELLED.status);

  money(value: number): string {
    return value.toLocaleString('vi-VN') + 'đ';
  }
  print() {
    window.print();
  }
  back() {
    this.location.back();
  }
}
