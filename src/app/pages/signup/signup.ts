import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Customer } from '../../interfaces/user';
import { CustomerService } from '../../services/customer';
import { EmployeeService } from '../../services/employee';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup implements OnInit {
  customers = signal<Customer[]>([]);
  submitted = false;
  errorMessages: any = {};

  constructor(
    private customerService: CustomerService,
    private employeeService: EmployeeService,
    private router: Router
  ) {}

  signUpForm = new FormGroup({
    username: new FormControl<string>('', [Validators.required]),
    password: new FormControl<string>('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl<string>('', [Validators.required]),
    accept: new FormControl<boolean>(false, [Validators.requiredTrue]),
  });

  ngOnInit(): void {
    this.customers.set(this.customerService.getCustomers());
  }

  onSubmit(): void {
    this.submitted = true;
    const form = this.signUpForm.value;
    this.errorMessages = {};

    if (this.signUpForm.invalid) return;

    if (form.password !== form.confirmPassword) {
      this.errorMessages.confirmPassword = 'Mật khẩu xác nhận không khớp';
      return;
    }
    if (
      this.customers().some((c) => c.username === form.username) ||
      this.employeeService.getUsers().some((u) => u.username === form.username)
    ) {
      this.errorMessages.username = 'Tên đăng nhập đã tồn tại';
      return;
    }
    const maxId = this.customers().reduce((m, c) => Math.max(m, Number(c.id?.replace('cus', '')) || 0), 0);
    const newUser: Customer = {
      id: 'cus' + (maxId + 1),
      username: form.username!,
      password: form.password!,
      fullname: '',
      phone: '',
      email: '',
      address: '',
      role: 'customer',
      islocked: false,
    };
    this.customerService.addCustomer(newUser);
    alert('Đăng ký thành công! Vui lòng đăng nhập.');
    this.router.navigate(['/signin']);
  }
}
