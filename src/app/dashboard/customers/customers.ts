import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Customer } from '../../interfaces/user';
import { Auth } from '../../services/auth';
import { CustomerService } from '../../services/customer';
import { EmployeeService } from '../../services/employee';

const EMPTY_CUSTOMER: Customer = {
  id: '',
  username: '',
  password: '',
  fullname: '',
  phone: '',
  email: '',
  address: '',
  role: 'customer',
  islocked: false,
};

@Component({
  selector: 'app-customers',
  imports: [FormsModule],
  templateUrl: './customers.html',
})
export class Customers {
  customerService = inject(CustomerService);
  private employeeService = inject(EmployeeService);
  authService = inject(Auth);
  customers = this.customerService.customers;

  canSeePassword = computed(() => this.authService.hasPermission('customer.password'));

  newCustomer: Customer = { ...EMPTY_CUSTOMER };
  editingId = signal<string | null>(null);
  draft = signal<Customer | null>(null);
  showPasswords = signal<{ [key: string]: boolean }>({});

  /** Kiểm tra dữ liệu dùng chung cho thêm/sửa; trả về thông báo lỗi hoặc null. `selfId` là khách đang sửa (bỏ qua khi so trùng). */
  private validate(c: Customer, selfId?: string): string | null {
    const username = c.username.trim().toLowerCase();
    const email = c.email?.trim().toLowerCase();
    if (!username) return 'Vui lòng nhập tên đăng nhập';
    // không có quyền xem mật khẩu thì không có ô nhập, nên không bắt buộc
    if (this.canSeePassword() && !c.password.trim()) return 'Vui lòng nhập mật khẩu';
    const others = this.customers().filter((x) => x.id !== selfId);
    if (others.some((x) => x.username.trim().toLowerCase() === username) || this.employeeService.getUsers().some((u) => u.username.trim().toLowerCase() === username)) {
      return 'Tên đăng nhập đã tồn tại';
    }
    if (email && others.some((x) => x.email?.trim().toLowerCase() === email)) return 'Email đã tồn tại';
    return null;
  }

  addCustomer(): void {
    if (!this.authService.hasPermission('customer.create')) return;
    const error = this.validate(this.newCustomer);
    if (error) {
      alert(error);
      return;
    }
    const maxId = this.customers().reduce((m, c) => Math.max(m, Number(c.id?.replace('cus', '')) || 0), 0);
    this.customerService.addCustomer({
      ...this.newCustomer,
      username: this.newCustomer.username.trim(),
      email: this.newCustomer.email.trim(),
      id: 'cus' + (maxId + 1),
    });
    this.newCustomer = { ...EMPTY_CUSTOMER };
  }

  editCustomer(id: string): void {
    if (!this.authService.hasPermission('customer.update')) return;
    const customer = this.customerService.getCustomerId(id);
    if (!customer) return;
    this.editingId.set(id);
    this.draft.set({ ...customer });
  }
  cancelEdit(): void {
    this.editingId.set(null);
    this.draft.set(null);
  }
  updateCustomer(): void {
    const draft = this.draft();
    if (!draft || !this.authService.hasPermission('customer.update')) return;
    const error = this.validate(draft, draft.id);
    if (error) {
      alert(error);
      return;
    }
    this.customerService.updateCustomer({ ...draft, username: draft.username.trim(), email: draft.email.trim() });
    this.cancelEdit();
  }
  deleteCustomer(id: string): void {
    if (!this.authService.hasPermission('customer.delete')) return;
    if (confirm('Bạn có chắc muốn xóa khách hàng này?')) this.customerService.removeCustomer(id);
  }
  togglePasswordVisibility(id: string): void {
    if (!this.canSeePassword()) return;
    this.showPasswords.update((map) => ({ ...map, [id]: !map[id] }));
  }
}
