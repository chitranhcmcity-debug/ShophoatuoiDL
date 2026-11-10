import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Customer } from '../interfaces/user';
import { API_URL } from './storage';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private apiUrl = `${API_URL}/customers`;
  customers = signal<Customer[]>([]);

  /** Hoàn tất khi đã tải xong danh sách khách hàng từ API */
  loaded: Promise<void>;

  constructor(private http: HttpClient) {
    this.loaded = this.reload();
  }

  /** Tải lại từ server (kiểm tra tài khoản bị khóa) */
  reload(): Promise<void> {
    return firstValueFrom(this.http.get<Customer[]>(this.apiUrl)).then((data) => {
      if (JSON.stringify(data) !== JSON.stringify(this.customers())) this.customers.set(data);
    });
  }

  getCustomers(): Customer[] {
    return this.customers();
  }
  getCustomerId(id: string): Customer | undefined {
    return this.customers().find((c) => c.id == id);
  }
  addCustomer(customer: Customer): void {
    this.http.post<Customer>(this.apiUrl, { ...customer, createdAt: customer.createdAt ?? new Date().toISOString() }).subscribe((created) => {
      this.customers.update((list) => [...list, created]);
    });
  }
  updateCustomer(customer: any): void {
    if (!customer.id) return;
    this.http.patch<Customer>(`${this.apiUrl}/${customer.id}`, customer).subscribe((updated) => {
      this.customers.update((list) => list.map((c) => (c.id === customer.id ? { ...c, ...updated } : c)));
    });
  }
  removeCustomer(id: string): void {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
      this.customers.update((list) => list.filter((c) => c.id !== id));
    });
  }
}
