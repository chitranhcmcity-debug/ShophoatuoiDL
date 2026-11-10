import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DELIVERY_SLOTS, FAST_DELIVERY_SLOT, PAYMENT_METHODS } from '../../interfaces/order';
import { CheckoutService } from '../../services/checkout';
import { PaymentService } from '../../services/payment';
import { SettingsService } from '../../services/settings';
import { localDate } from '../../utils/date';

const PICKUP_ADDRESS = 'Nhận tại cửa hàng';

function notPastDate(control: AbstractControl): ValidationErrors | null {
  return control.value && control.value < localDate() ? { past: true } : null;
}

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit {
  private checkoutService = inject(CheckoutService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  currentUser = this.checkoutService.currentUser;
  private paymentService = inject(PaymentService);
  placing = this.checkoutService.placing;
  /** Đang chuyển sang trang payOS */
  redirecting = signal(false);
  settings = inject(SettingsService).settings;
  paymentMethods = PAYMENT_METHODS;
  today = localDate();

  get shippingOptions() {
    const fee = this.settings().fastShippingFee;
    return [
      { key: 'free', label: 'Giao hàng tiêu chuẩn (Freeship)', fee: 0 },
      { key: 'fast', label: `Giao nhanh 60 phút: ${fee.toLocaleString('vi-VN')}đ`, fee },
      { key: 'pickup', label: 'Nhận tại cửa hàng', fee: 0 },
    ];
  }
  shipping = 'free';

  userCarts = computed(() => (this.currentUser() ? this.checkoutService.getActiveUserCarts() : []));
  subtotal = computed(() => this.checkoutService.calculateSubtotal(this.userCarts()));

  formData = this.fb.group({
    fullname: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^0\d{9}$/)]],
    email: ['', [Validators.required, Validators.email]],
    address: ['', Validators.required],
    note: [''],
    deliveryDate: [this.today, [Validators.required, notPastDate]],
    deliverySlot: ['', Validators.required],
    paymentMethod: ['cod', Validators.required],
  });

  constructor() {
    // Đổi ngày mà khung giờ đã chọn không còn hợp lệ thì bắt chọn lại
    this.formData.controls.deliveryDate.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.dropUnavailableSlot());
  }

  ngOnInit(): void {
    const user = this.currentUser();
    if (!user) return;
    const info = this.checkoutService.findCurrentUserInfo(user.id!);
    if (info) {
      this.formData.patchValue({
        fullname: info.fullname,
        phone: info.phone,
        email: info.email,
        address: info.address,
      });
    }
  }

  /** Khung giờ còn chọn được: trong ngày hôm nay thì bỏ các khung đã qua */
  get slots() {
    if (this.formData.controls.deliveryDate.value !== localDate()) return DELIVERY_SLOTS;
    const hour = new Date().getHours();
    return DELIVERY_SLOTS.filter((s) => s.endHour > hour);
  }

  private dropUnavailableSlot(): boolean {
    const slot = this.formData.controls.deliverySlot;
    if (!slot.value || this.slots.some((s) => s.label === slot.value)) return false;
    slot.setValue('');
    return true;
  }

  /** Nhận tại cửa hàng thì không cần địa chỉ; giao nhanh thì không cần chọn ngày giờ */
  setShipping(key: string) {
    this.shipping = key;
    const { address, deliveryDate, deliverySlot } = this.formData.controls;
    address.setValidators(key === 'pickup' ? [] : [Validators.required]);
    deliveryDate.setValidators(key === 'fast' ? [] : [Validators.required, notPastDate]);
    deliverySlot.setValidators(key === 'fast' ? [] : [Validators.required]);
    [address, deliveryDate, deliverySlot].forEach((c) => c.updateValueAndValidity());
  }

  shippingFee(): number {
    return this.shippingOptions.find((o) => o.key === this.shipping)?.fee ?? 0;
  }
  total(): number {
    return this.subtotal() + this.shippingFee();
  }

  async handleSubmit(): Promise<void> {
    const fast = this.shipping === 'fast';
    if (!fast && this.dropUnavailableSlot()) {
      alert('Khung giờ bạn chọn vừa qua, vui lòng chọn khung giờ khác.');
      return;
    }
    if (this.formData.invalid || this.userCarts().length === 0) {
      alert('Vui lòng kiểm tra lại thông tin và giỏ hàng.');
      this.formData.markAllAsTouched();
      return;
    }
    if (this.placing() || this.redirecting()) return;
    const v = this.formData.value;
    const option = this.shippingOptions.find((o) => o.key === this.shipping)!;
    const order = await this.checkoutService.checkout(
      {
        fullname: v.fullname!,
        phone: v.phone!,
        email: v.email!,
        address: this.shipping === 'pickup' ? PICKUP_ADDRESS : v.address!,
        note: v.note ?? '',
        deliveryDate: fast ? localDate() : v.deliveryDate!,
        deliverySlot: fast ? FAST_DELIVERY_SLOT : v.deliverySlot!,
        paymentMethod: v.paymentMethod!,
      },
      { method: option.key, label: fast ? 'Giao nhanh 60 phút' : option.label, fee: option.fee }
    );
    if (!order) return;
    if (order.paymentMethod === 'payos') {
      this.redirecting.set(true);
      try {
        // Chuyển sang trang quét QR của payOS; xong payOS đưa khách về /payment-result
        await this.paymentService.payWithPayos(order.id);
        return;
      } catch (err) {
        this.redirecting.set(false);
        alert(`Đã tạo đơn ${order.id} nhưng chưa mở được trang thanh toán.\n${this.paymentService.errorMessage(err)}\nBạn có thể thanh toán lại trong mục Đơn hàng.`);
      }
    } else {
      alert('Đặt hàng thành công! Cảm ơn bạn đã mua hoa tại Hoa Tươi DL.');
    }
    this.router.navigate(['/account'], { queryParams: { tab: 'orders' } });
  }
}
