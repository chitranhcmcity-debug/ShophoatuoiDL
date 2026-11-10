import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '../../interfaces/permissions';
import { Employee, User } from '../../interfaces/user';
import { Auth } from '../../services/auth';
import { CustomerService } from '../../services/customer';
import { EmployeeService } from '../../services/employee';

@Component({
  selector: 'app-employees',
  imports: [FormsModule],
  templateUrl: './employees.html',
})
export class Employees {
  authService = inject(Auth);
  private employeeService = inject(EmployeeService);
  private customerService = inject(CustomerService);

  users = this.employeeService.users;
  employees = this.employeeService.employees;

  editingId = signal<string | null>(null);
  // bản nháp đang chỉnh sửa / thêm mới (tách khỏi dữ liệu gốc để có thể Cancel)
  newUser = signal<User | null>(null);
  newEmployee = signal<Employee | null>(null);
  draftUser = signal<User | null>(null);
  draftEmployee = signal<Employee | null>(null);

  roleLabels = ROLE_LABELS;
  // quản trị web giao vai trò cho nhân viên; quản lí không có quyền sửa nhân viên
  roleOptions = computed(() => ['manager', 'admin', 'staff']);

  roleBadge(role: string): string {
    return role === 'manager' ? 'text-bg-danger' : role === 'admin' ? 'text-bg-primary' : 'text-bg-secondary';
  }
  getEmployee = (userId: string) => this.employees().find((emp) => emp.id == userId);

  handleAdd() {
    const maxId = this.users().reduce((m, u) => Math.max(m, Number(u.id) || 0), 0);
    const newId = (maxId + 1).toString();
    this.newUser.set({ id: newId, username: '', password: '123456', role: 'staff', islocked: false, permissions: ROLE_PERMISSIONS['staff'] });
    this.newEmployee.set({ id: newId, image: '/image/avatar.svg', fullname: '', email: '', phone: '', address: '' });
  }

  handleSave() {
    if (this.newUser() && this.newEmployee()) {
      if (!this.newUser()!.username.trim() || !this.newEmployee()!.fullname.trim()) {
        alert('Vui lòng nhập tên đăng nhập và họ tên');
        return;
      }
      if (this.users().some((u) => u.username === this.newUser()!.username) || this.customerService.getCustomers().some((c) => c.username === this.newUser()!.username)) {
        alert('Tên đăng nhập đã tồn tại');
        return;
      }
      const nu = this.newUser()!;
      this.employeeService.addUser({ ...nu, permissions: ROLE_PERMISSIONS[nu.role] ?? [] });
      this.employeeService.addEmployee(this.newEmployee()!);
      this.newUser.set(null);
      this.newEmployee.set(null);
    } else if (this.draftUser() && this.draftEmployee()) {
      const du = this.draftUser()!;
      this.employeeService.updateUser({ ...du, permissions: ROLE_PERMISSIONS[du.role] ?? du.permissions });
      this.employeeService.updateEmployee(this.draftEmployee());
      this.handleCancel();
    }
  }

  handleEdit(id: string) {
    this.editingId.set(id);
    this.draftUser.set({ ...this.users().find((u) => u.id == id)! });
    const emp = this.getEmployee(id);
    this.draftEmployee.set(emp ? { ...emp } : { id, image: '/image/avatar.svg', fullname: '', email: '', phone: '', address: '' });
  }

  handleCancel() {
    this.newUser.set(null);
    this.newEmployee.set(null);
    this.draftUser.set(null);
    this.draftEmployee.set(null);
    this.editingId.set(null);
  }

  handleDelete(id: string) {
    if (id === this.authService.user()?.id) {
      alert('Không thể xóa tài khoản đang đăng nhập.');
      return;
    }
    if (!confirm('Bạn có chắc muốn xóa nhân viên này?')) return;
    this.employeeService.deleteUserId(id);
    this.employeeService.deleteEmployeeId(id);
  }

  handleImageChange(event: Event, isNew = false) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = reader.result as string;
      if (isNew) this.newEmployee.update((e) => (e ? { ...e, image } : e));
      else this.draftEmployee.update((e) => (e ? { ...e, image } : e));
    };
    reader.readAsDataURL(input.files[0]);
  }
}
