import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Product } from '../../interfaces/product';
import { AiChatService, ChatMessage } from '../../services/ai-chat';
import { ProductService } from '../../services/product';

@Component({
  selector: 'app-ai-chat',
  imports: [FormsModule, RouterLink],
  templateUrl: './ai-chat.html',
  styleUrl: './ai-chat.css',
})
export class AiChat {
  chat = inject(AiChatService);
  productService = inject(ProductService);

  text = '';
  suggestions = [
    'Tặng mẹ sinh nhật, tầm 500k',
    'Hoa khai trương cho bạn, khoảng 1 triệu',
    'Hoa tặng người yêu dịp kỷ niệm',
    'Hoa chia buồn trang trọng',
  ];

  private body = viewChild<ElementRef<HTMLElement>>('body');

  constructor() {
    // Tự cuộn xuống tin nhắn mới nhất
    effect(() => {
      this.chat.messages();
      this.chat.loading();
      this.chat.open();
      setTimeout(() => {
        const el = this.body()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }

  send(text = this.text): void {
    this.chat.send(text);
    this.text = '';
  }

  onEnter(e: Event): void {
    const ev = e as KeyboardEvent;
    if (ev.shiftKey) return;
    ev.preventDefault();
    this.send();
  }

  /** Thay mã [[p01]] trong câu trả lời bằng tên sản phẩm */
  display(m: ChatMessage): string {
    return m.content.replace(/\[\[(\w+)\]\]/g, (_, id) => {
      const p = this.find(id);
      return p ? `“${p.title}”` : '';
    });
  }

  products(m: ChatMessage): Product[] {
    return (m.productIds || []).map((id) => this.find(id)).filter((p): p is Product => !!p);
  }

  price(p: Product): string {
    return this.productService.discountPrice(p.price, p.discount).toLocaleString('vi-VN') + 'đ';
  }

  private find(id: string): Product | undefined {
    return this.productService.products().find((p) => p.id === id);
  }
}
