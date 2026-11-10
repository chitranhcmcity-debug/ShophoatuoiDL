import { Component, computed, effect, input, model } from '@angular/core';

/**
 * Phân trang dùng chung.
 *   <app-pagination [total]="list().length" [(page)]="page" [(pageSize)]="pageSize" />
 */
@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination {
  total = input.required<number>();
  sizes = input<number[]>([5, 10, 20, 50]);
  page = model(1);
  pageSize = model(10);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  from = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));

  constructor() {
    // xóa bớt dữ liệu làm số trang giảm: tự lùi về trang cuối
    effect(() => {
      if (this.page() > this.totalPages()) this.page.set(this.totalPages());
    });
  }

  /** Danh sách nút trang, ví dụ: 1 ... 4 5 6 ... 12 */
  pages = computed<(number | string)[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const result: (number | string)[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) result.push('...');
    for (let i = start; i <= end; i++) result.push(i);
    if (end < total - 1) result.push('...');
    result.push(total);
    return result;
  });

  go(p: number | string) {
    if (typeof p === 'number' && p >= 1 && p <= this.totalPages() && p !== this.page()) {
      this.page.set(p);
    }
  }

  changeSize(event: Event) {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.page.set(1);
  }
}
