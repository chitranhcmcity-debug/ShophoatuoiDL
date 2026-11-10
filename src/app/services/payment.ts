import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Order } from '../interfaces/order';
import { BACKEND_URL } from './storage';

/**
 * Thanh toán payOS. Angular KHÔNG giữ khóa payOS: mọi thao tác đi qua backend Node
 * (server/payos.mjs), backend tự lấy số tiền từ đơn hàng nên khách không sửa giá được.
 */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  private url = `${BACKEND_URL}/api/payos`;

  /** Tạo link thanh toán rồi chuyển khách sang trang payOS */
  async payWithPayos(orderId: string): Promise<void> {
    const res = await firstValueFrom(this.http.post<{ checkoutUrl: string }>(`${this.url}/create`, { orderId }));
    location.href = res.checkoutUrl;
  }

  /** Hỏi backend (backend hỏi lại payOS) xem đơn đã được thanh toán chưa */
  verify(orderId: string): Promise<{ paymentStatus: string; payosStatus?: string; order: Order }> {
    return firstValueFrom(this.http.get<{ paymentStatus: string; payosStatus?: string; order: Order }>(`${this.url}/verify`, { params: { orderId } }));
  }

  /**
   * Đơn payOS vừa bị hủy: backend hỏi payOS, nếu khách chưa trả thì hủy link (khách không trả nhầm được),
   * nếu khách đã kịp trả thì ghi nhận đã thanh toán + chờ hoàn tiền.
   */
  cancelLink(orderId: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.url}/cancel`, { orderId }));
  }

  /** Lấy câu báo lỗi dễ hiểu từ lỗi HTTP */
  errorMessage(err: unknown): string {
    const e = err as HttpErrorResponse;
    if (e?.status === 0) return 'Không kết nối được máy chủ thanh toán (cổng 3001). Hãy chạy: npm run backend';
    return e?.error?.error || 'Có lỗi khi thanh toán, vui lòng thử lại.';
  }
}
