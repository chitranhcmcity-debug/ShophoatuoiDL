import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';

/** Địa chỉ json-server (chạy bằng `npm run server`, đọc ghi file db.json) */
/** Địa chỉ backend Node (AI tư vấn + thanh toán payOS), chạy bằng `npm run backend` */
export const BACKEND_URL = typeof location !== 'undefined' ? `http://${location.hostname}:3001` : 'http://localhost:3001';

export const API_URL = typeof location !== 'undefined' ? `http://${location.hostname}:3000` : 'http://localhost:3000';

/** Các key lưu trên server qua StorageService (mỗi key là 1 bảng trong db.json). products, users, employees, customers, orders đã có service riêng gọi HttpClient. Key khác (currentUser...) lưu ở localStorage của trình duyệt */
export const REMOTE_KEYS = [
  'categories',
  'cart',
  'notifications',
  'favorites',
  'consults',
  'settings',
];

const POLL_MS = 3000;

/**
 * Lưu trữ dữ liệu: các key trong REMOTE_KEYS nằm trên json-server (dùng chung mọi máy),
 * còn lại ở localStorage. Giữ nguyên API get/set/getOrCreate để các service không phải đổi:
 *  - đọc: lấy từ bộ nhớ đệm (đã nạp từ server lúc khởi động, làm mới mỗi vài giây)
 *  - ghi: cập nhật bộ nhớ đệm ngay, rồi so sánh với bản trước để gửi POST / PUT / DELETE lên server
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private cache = new Map<string, any>();
  private raw = new Map<string, string>(); // JSON của lần đồng bộ gần nhất
  private snap = new Map<string, Map<string, string>>(); // id → JSON từng phần tử (với bảng dạng mảng)
  private listeners = new Map<string, Set<() => void>>();
  private queue: Promise<void> = Promise.resolve();
  private pending = 0;
  private writes = 0; // tăng mỗi lần có thay đổi cục bộ; dùng để bỏ kết quả tải về đã cũ
  private timer?: ReturnType<typeof setInterval>;
  private isBrowser: boolean;
  /** false khi không kết nối được server */
  online = false;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private isRemote(key: string) {
    return REMOTE_KEYS.includes(key);
  }

  // ===================== Kết nối server =====================

  /** Nạp toàn bộ dữ liệu từ server (gọi 1 lần khi khởi động app). Trả về false nếu server không chạy */
  async init(): Promise<boolean> {
    if (!this.isBrowser) return true;
    try {
      await this.pull(true); // các service đã khởi tạo trước khi có dữ liệu, cần báo để chúng cập nhật
      this.online = true;
    } catch {
      this.online = false;
    }
    this.timer ??= setInterval(() => this.poll(), POLL_MS);
    return this.online;
  }

  private async fetchAll(): Promise<Record<string, any>> {
    const entries = await Promise.all(
      REMOTE_KEYS.map(async (key) => {
        const res = await fetch(`${API_URL}/${key}`);
        if (!res.ok) throw new Error(`${key}: ${res.status}`);
        return [key, await res.json()] as const;
      })
    );
    return Object.fromEntries(entries);
  }

  /** Lấy dữ liệu mới nhất từ server; notify = báo cho các service có dữ liệu thay đổi */
  private async pull(notify: boolean) {
    const version = this.writes;
    const data = await this.fetchAll();
    if (this.pending > 0 || version !== this.writes) return; // đang ghi dở thì bỏ qua, tránh ghi đè thay đổi chưa gửi xong
    for (const key of REMOTE_KEYS) {
      const text = JSON.stringify(data[key]);
      if (text === this.raw.get(key)) continue;
      this.store(key, data[key]);
      if (notify) this.listeners.get(key)?.forEach((cb) => cb());
    }
  }

  private async poll() {
    if (this.pending > 0) return;
    try {
      const wasOffline = !this.online;
      await this.pull(true);
      this.online = true;
      if (wasOffline) console.info('Đã kết nối lại server dữ liệu');
    } catch {
      this.online = false;
    }
  }

  /** Làm mới 1 bảng ngay lập tức (vd: trước khi tạo mã đơn mới) */
  async refresh(key: string): Promise<void> {
    if (!this.isBrowser || !this.online || this.pending > 0) return;
    try {
      const version = this.writes;
      const res = await fetch(`${API_URL}/${key}`);
      if (!res.ok || this.pending > 0 || version !== this.writes) return;
      const data = await res.json();
      if (JSON.stringify(data) !== this.raw.get(key)) {
        this.store(key, data);
        this.listeners.get(key)?.forEach((cb) => cb());
      }
    } catch {
      /* giữ nguyên dữ liệu đang có */
    }
  }

  /** Chờ các thao tác ghi đang gửi lên server hoàn tất */
  flush(): Promise<void> {
    return this.queue;
  }

  /** Đăng ký nhận thông báo khi dữ liệu của key được làm mới từ server (do máy / tab khác thay đổi) */
  watch(key: string, cb: () => void) {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(cb);
  }

  private store(key: string, data: any) {
    this.cache.set(key, data);
    this.raw.set(key, JSON.stringify(data));
    this.snap.set(key, this.toSnap(data));
  }

  private toSnap(data: any): Map<string, string> {
    const m = new Map<string, string>();
    if (Array.isArray(data)) data.forEach((x) => m.set(String(x.id), JSON.stringify(x)));
    return m;
  }

  /** So sánh với bản trước rồi xếp lịch gửi các thay đổi lên server */
  private sync(key: string, data: any) {
    const text = JSON.stringify(data);
    if (text === this.raw.get(key)) return;
    const ops: { method: string; url: string; body?: string }[] = [];
    const base = `${API_URL}/${key}`;
    const json = { 'Content-Type': 'application/json' };

    if (Array.isArray(data)) {
      const before = this.snap.get(key) ?? new Map<string, string>();
      const after = this.toSnap(data);
      for (const item of data) {
        const id = String(item.id);
        if (item.id === undefined || item.id === null) {
          console.error(`Bản ghi trong "${key}" thiếu id, không lưu được`, item);
          continue;
        }
        if (!before.has(id)) ops.push({ method: 'POST', url: base, body: after.get(id) });
        else if (before.get(id) !== after.get(id)) ops.push({ method: 'PUT', url: `${base}/${encodeURIComponent(id)}`, body: after.get(id) });
      }
      for (const id of before.keys()) {
        if (!after.has(id)) ops.push({ method: 'DELETE', url: `${base}/${encodeURIComponent(id)}` });
      }
      this.snap.set(key, after);
    } else {
      ops.push({ method: 'PUT', url: base, body: text });
    }
    this.raw.set(key, text);
    this.writes++;
    if (!this.online) return; // chưa kết nối server: chỉ giữ tạm trong bộ nhớ

    this.pending++;
    this.queue = this.queue.then(async () => {
      try {
        for (const op of ops) {
          const res = await fetch(op.url, { method: op.method, headers: op.body ? json : undefined, body: op.body });
          if (!res.ok && !(op.method === 'DELETE' && res.status === 404)) throw new Error(`${op.method} ${op.url} → ${res.status}`);
        }
      } catch (e) {
        console.error('Lưu dữ liệu lên server thất bại, đang tải lại dữ liệu từ server', e);
        this.raw.delete(key); // buộc lần làm mới tới nạp lại từ server
      } finally {
        this.pending--;
      }
    });
  }

  // ===================== API giống localStorage =====================

  getOrCreate<T>(key: string, data: T): T {
    if (!this.isBrowser) return data;
    if (this.isRemote(key)) {
      if (this.cache.has(key)) return this.cache.get(key) as T;
      this.set(key, data);
      return data;
    }
    try {
      const value = localStorage.getItem(key);
      if (value && value !== 'undefined') {
        return JSON.parse(value) as T;
      }
    } catch (e) {
      console.warn(`getOrCreate data for key: ${key}`, e);
    }
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  }

  get<T>(key: string): T | null {
    if (!this.isBrowser) return null;
    if (this.isRemote(key)) return (this.cache.get(key) as T) ?? null;
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  set<T>(key: string, data: T): void {
    if (!this.isBrowser) return;
    if (this.isRemote(key)) {
      this.cache.set(key, data);
      this.sync(key, data);
      return;
    }
    localStorage.setItem(key, JSON.stringify(data));
  }

  remove(key: string): void {
    if (this.isBrowser && !this.isRemote(key)) {
      localStorage.removeItem(key);
    }
  }
}
