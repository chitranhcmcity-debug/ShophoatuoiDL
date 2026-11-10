import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Auth } from './auth';
import { CheckoutService } from './checkout';
import { CustomerService } from './customer';
import { EmployeeService } from './employee';
import { ProductService } from './product';
import { API_URL, REMOTE_KEYS, StorageService } from './storage';

/** Bảng không bị xóa khi "Khôi phục dữ liệu gốc" (cấu hình hệ thống do admin đặt) */
const KEEP_ON_RESET = ['settings'];
/** Các bảng được các service gọi HttpClient trực tiếp */
const API_TABLES = ['products', 'users', 'employees', 'customers', 'orders'];

@Injectable({ providedIn: 'root' })
export class DataService {
  private storage = inject(StorageService);
  private http = inject(HttpClient);
  private productService = inject(ProductService);
  private employeeService = inject(EmployeeService);
  private customerService = inject(CustomerService);
  private checkoutService = inject(CheckoutService);
  private authService = inject(Auth);

  /** Chạy 1 lần khi khởi động app: nạp dữ liệu từ json-server (db.json) */
  async loadAll(): Promise<void> {
    const ok = await this.storage.init();
    try {
      await Promise.all([
        this.productService.loaded,
        this.employeeService.loaded,
        this.customerService.loaded,
        this.checkoutService.loaded,
      ]);
    } catch {
      if (ok) console.error('Không tải được dữ liệu từ API');
    }
    this.authService.startSessionWatch();
    if (!ok) {
      alert('Không kết nối được máy chủ dữ liệu (port 3000).\nHãy chạy: npm run server (hoặc npm run dev) rồi tải lại trang.');
    }
  }

  /** Khôi phục dữ liệu gốc: ghi đè db.json bằng nội dung file public/data/db.seed.json */
  async reset(): Promise<void> {
    const res = await fetch('/data/db.seed.json');
    const seed = (await res.json()) as Record<string, any[]>;
    for (const key of API_TABLES) {
      if (!(key in seed)) continue;
      const current = await firstValueFrom(this.http.get<{ id: string }[]>(`${API_URL}/${key}`));
      await Promise.all(current.map((x) => firstValueFrom(this.http.delete(`${API_URL}/${key}/${x.id}`))));
      for (const item of seed[key]) await firstValueFrom(this.http.post(`${API_URL}/${key}`, item));
    }
    for (const key of REMOTE_KEYS) {
      if (!KEEP_ON_RESET.includes(key) && key in seed) this.storage.set(key, seed[key]);
    }
    await this.storage.flush();
    this.storage.remove('currentUser');
    location.href = '/';
  }

  /** Tải dữ liệu hiện tại về thành file .json */
  async download(name: string): Promise<void> {
    const data = await firstValueFrom(this.http.get<any[]>(`${API_URL}/${name}`));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
