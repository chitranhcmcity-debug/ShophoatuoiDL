import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Order, PAYMENT } from '../../interfaces/order';
import { CheckoutService } from '../../services/checkout';
import { PaymentService } from '../../services/payment';

type State = 'checking' | 'paid' | 'cancelled' | 'pending' | 'error';

/** payOS đưa khách về trang này sau khi thanh toán / hủy: /payment-result?orderId=o12 */
@Component({
  selector: 'app-payment-result',
  imports: [RouterLink],
  templateUrl: './payment-result.html',
  styleUrl: './payment-result.css',
})
export class PaymentResult implements OnInit {
  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentService);
  private checkoutService = inject(CheckoutService);

  orderId = '';
  state = signal<State>('checking');
  order = signal<Order | null>(null);
  error = signal('');
  retrying = signal(false);

  async ngOnInit(): Promise<void> {
    this.orderId = this.route.snapshot.queryParamMap.get('orderId') ?? '';
    if (!this.orderId) {
      this.state.set('error');
      this.error.set('Thiếu mã đơn hàng.');
      return;
    }
    await this.check();
  }

  /** Không tin tham số trên URL (khách tự sửa được): luôn hỏi backend, backend hỏi lại payOS */
  async check(): Promise<void> {
    this.state.set('checking');
    try {
      const res = await this.paymentService.verify(this.orderId);
      this.order.set(res.order);
      this.state.set(
        res.paymentStatus === PAYMENT.PAID ? 'paid' : res.paymentStatus === PAYMENT.CANCELLED ? 'cancelled' : 'pending'
      );
      this.checkoutService.loadOrders().catch(() => {});
    } catch (err) {
      this.state.set('error');
      this.error.set(this.paymentService.errorMessage(err));
    }
  }

  async retry(): Promise<void> {
    this.retrying.set(true);
    try {
      await this.paymentService.payWithPayos(this.orderId);
    } catch (err) {
      alert(this.paymentService.errorMessage(err));
      this.retrying.set(false);
    }
  }
}
