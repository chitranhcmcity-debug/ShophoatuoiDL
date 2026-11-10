import { Component, OnInit, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CheckoutService } from '../../services/checkout';
import { CustomerService } from '../../services/customer';
import { EmployeeService } from '../../services/employee';
import { SettingsService } from '../../services/settings';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit {
  private checkoutService = inject(CheckoutService);
  private customerService = inject(CustomerService);
  private employeeService = inject(EmployeeService);
  private router = inject(Router);

  currentUser = this.checkoutService.currentUser;
  private settings = inject(SettingsService).settings;
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

  private fb = inject(FormBuilder);
  formData = this.fb.group({
    fullname: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^0\d{9}$/)]],
    email: ['', [Validators.required, Validators.email]],
    address: ['', Validators.required],
    note: [''],
  });

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

  shippingFee(): number {
    return this.shippingOptions.find((o) => o.key === this.shipping)?.fee ?? 0;
  }
  total(): number {
    return this.subtotal() + this.shippingFee();
  }

  async handleSubmit(): Promise<void> {
    if (this.formData.invalid || this.userCarts().length === 0) {
      alert('Vui lòng kiểm tra lại thông tin và giỏ hàng.');
      this.formData.markAllAsTouched();
      return;
    }
    try {
      this.updateUserInfo();
      const v = this.formData.value;
      const ok = await this.checkoutService.checkout(
        { fullname: v.fullname!, phone: v.phone!, address: v.address!, note: v.note ?? '' },
        this.shippingFee()
      );
      if (ok) {
        alert('Đặt hàng thành công! Cảm ơn bạn đã mua hoa tại Hoa Tươi DL.');
        this.router.navigate(['/account'], { queryParams: { tab: 'orders' } });
      }
    } catch (error) {
      console.error('Lỗi thanh toán:', error);
      alert('Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại.');
    }
  }

  /** Cập nhật lại thông tin khách hàng / nhân viên theo form (vd: đổi địa chỉ giao) */
  private updateUserInfo(): void {
    const user = this.currentUser();
    if (!user) return;
    const v = this.formData.value;
    const info = { id: user.id, fullname: v.fullname, phone: v.phone, email: v.email, address: v.address };
    if (user.role === 'customer') {
      this.customerService.updateCustomer(info);
    } else {
      this.employeeService.updateEmployee(info);
    }
  }
}
