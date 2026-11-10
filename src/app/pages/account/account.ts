import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NotificationHistory } from '../../components/notification-history/notification-history';
import { OrderTracking } from '../../components/order-tracking/order-tracking';
import { Order, isPaid, paymentBadge, paymentLabel, toneOfStatus } from '../../interfaces/order';
import { Auth } from '../../services/auth';
import { CheckoutService } from '../../services/checkout';
import { CustomerService } from '../../services/customer';
import { EmployeeService } from '../../services/employee';
import { PaymentService } from '../../services/payment';
import { SettingsService } from '../../services/settings';

type Tab = 'info' | 'password' | 'orders' | 'notifications';
const TABS: Tab[] = ['info', 'password', 'orders', 'notifications'];

@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, OrderTracking, NotificationHistory],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account implements OnInit {
  authService = inject(Auth);
  private customerService = inject(CustomerService);
  private employeeService = inject(EmployeeService);
  private route = inject(ActivatedRoute);
  private checkoutService = inject(CheckoutService);
  orders = this.checkoutService.userOrders;
  private paymentService = inject(PaymentService);
  private settings = inject(SettingsService).settings;
  paymentBadge = paymentBadge;
  isPaid = isPaid;
  payingId = signal('');

  /** Đơn chọn payOS mà chưa trả tiền (và chưa bị hủy) thì cho thanh toán lại */
  canPay(o: Order): boolean {
    return o.paymentMethod === 'payos' && !isPaid(o) && o.status !== 'Đã hủy';
  }

  async payAgain(o: Order): Promise<void> {
    this.payingId.set(o.id);
    try {
      await this.paymentService.payWithPayos(o.id);
    } catch (err) {
      alert(this.paymentService.errorMessage(err));
      this.payingId.set('');
    }
  }
  canCancel = (o: Order) => this.checkoutService.canCustomerCancel(o);

  async cancelOrder(o: Order) {
    const refundNotice = isPaid(o)
      ? `Đơn đã thanh toán ${o.total.toLocaleString('vi-VN')}đ. Nếu hủy, shop sẽ hoàn tiền cho bạn trong ${this.settings().refundDays}.\n`
      : '';
    const reason = prompt(`${refundNotice}Bạn muốn hủy đơn ${o.id}? Nhập lý do hủy:`, 'Đổi ý, không muốn mua nữa');
    if (reason === null) return;
    if (await this.checkoutService.cancelByCustomer(o.id, reason.trim())) {
      this.trackingId.set(o.id); // mở luôn phần theo dõi để khách thấy đơn đã hủy
      this.message.set('Đã hủy đơn ' + o.id + '.');
    }
  }

  tab = signal<Tab>('info');
  toneOf = toneOfStatus;
  paymentLabel = paymentLabel;
  trackingId = signal<string | null>(null);
  toggleTracking(id: string) {
    this.trackingId.update((cur) => (cur === id ? null : id));
  }
  message = signal('');
  fullname = signal('');
  email = signal('');

  infoForm = new FormGroup({
    ho: new FormControl<string>(''),
    ten: new FormControl<string>('', [Validators.required]),
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    phone: new FormControl<string>('', [Validators.required, Validators.pattern(/^0\d{9}$/)]),
    birthday: new FormControl<string>(''),
    address: new FormControl<string>('', [Validators.required]),
  });

  passwordForm = new FormGroup({
    current: new FormControl<string>('', [Validators.required]),
    password: new FormControl<string>('', [Validators.required, Validators.minLength(6)]),
    confirm: new FormControl<string>('', [Validators.required]),
  });
  passwordError = signal('');

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((p) => {
      const t = p.get('tab');
      this.tab.set(TABS.includes(t as Tab) ? (t as Tab) : 'info');
      this.message.set('');
    });
    this.loadProfile();
  }

  private get isCustomer() {
    return this.authService.user()?.role === 'customer';
  }

  private getProfile() {
    const id = this.authService.user()?.id;
    if (!id) return undefined;
    return this.isCustomer
      ? this.customerService.getCustomerId(id)
      : this.employeeService.getEmployees().find((e) => e.id === id);
  }

  private loadProfile() {
    const p = this.getProfile();
    if (!p) return;
    const parts = (p.fullname ?? '').trim().split(/\s+/).filter(Boolean);
    const ten = parts.pop() ?? '';
    this.infoForm.patchValue({
      ho: parts.join(' '),
      ten,
      email: p.email,
      phone: p.phone,
      birthday: p.birthday ?? '',
      address: p.address,
    });
    this.fullname.set(p.fullname);
    this.email.set(p.email);
  }

  isInvalid(form: FormGroup, field: string): boolean {
    const c = form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  updateInfo() {
    if (this.infoForm.invalid) {
      this.infoForm.markAllAsTouched();
      return;
    }
    const v = this.infoForm.value;
    const info = {
      id: this.authService.user()!.id,
      fullname: `${v.ho ?? ''} ${v.ten ?? ''}`.trim(),
      email: v.email,
      phone: v.phone,
      birthday: v.birthday,
      address: v.address,
    };
    if (this.isCustomer) this.customerService.updateCustomer(info);
    else this.employeeService.updateEmployee(info);
    this.fullname.set(info.fullname);
    this.email.set(info.email!);
    this.message.set('Cập nhật thông tin thành công!');
  }

  changePassword() {
    this.passwordError.set('');
    this.message.set('');
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const v = this.passwordForm.value;
    const id = this.authService.user()!.id!;
    const account = this.isCustomer
      ? this.customerService.getCustomerId(id)
      : this.employeeService.getUsers().find((u) => u.id === id);
    if (!account || account.password !== v.current) {
      this.passwordError.set('Mật khẩu hiện tại không đúng');
      return;
    }
    if (v.password !== v.confirm) {
      this.passwordError.set('Mật khẩu xác nhận không khớp');
      return;
    }
    if (this.isCustomer) this.customerService.updateCustomer({ id, password: v.password });
    else this.employeeService.updateUser({ id, password: v.password });
    this.passwordForm.reset();
    this.message.set('Đổi mật khẩu thành công!');
  }
}
