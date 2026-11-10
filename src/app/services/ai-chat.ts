import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Địa chỉ server AI (server/ai-server.mjs) */
export const AI_URL =
  typeof location !== 'undefined' ? `http://${location.hostname}:3001/api/chat` : 'http://localhost:3001/api/chat';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  productIds?: string[];
  error?: boolean;
}

const STORAGE_KEY = 'aiChatHistory';
const WELCOME: ChatMessage = {
  role: 'assistant',
  content:
    'Xin chào! Mình là trợ lý tư vấn của Hoa Tươi DL 🌸 Bạn muốn tặng hoa cho ai, dịp gì và tầm bao nhiêu tiền? Mình gợi ý mẫu phù hợp nhé.',
};

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private http = inject(HttpClient);

  messages = signal<ChatMessage[]>(this.restore());
  loading = signal(false);
  open = signal(false);

  async send(text: string): Promise<void> {
    const content = text.trim();
    if (!content || this.loading()) return;

    this.messages.update((list) => [...list, { role: 'user', content }]);
    this.loading.set(true);
    try {
      // Gửi lịch sử hội thoại (bỏ lời chào và các tin báo lỗi)
      const history = this.messages()
        .filter((m) => m !== WELCOME && !m.error)
        .map(({ role, content }) => ({ role, content }));
      const res = await firstValueFrom(
        this.http.post<{ reply: string; productIds: string[] }>(AI_URL, { messages: history })
      );
      this.push({ role: 'assistant', content: res.reply, productIds: res.productIds });
    } catch (err) {
      const e = err as HttpErrorResponse;
      const msg =
        e.status === 0
          ? 'Không kết nối được server AI (cổng 3001). Hãy chạy: npm run ai'
          : e.error?.error || 'Có lỗi xảy ra, bạn thử lại nhé.';
      this.push({ role: 'assistant', content: msg, error: true });
    } finally {
      this.loading.set(false);
    }
  }

  clear(): void {
    this.messages.set([WELCOME]);
    this.save();
  }

  private push(m: ChatMessage): void {
    this.messages.update((list) => [...list, m]);
    this.save();
  }

  private save(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages().slice(-30)));
    } catch {}
  }

  private restore(): ChatMessage[] {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) return [WELCOME, ...saved.filter((m: ChatMessage) => m.content !== WELCOME.content)];
    } catch {}
    return [WELCOME];
  }
}
