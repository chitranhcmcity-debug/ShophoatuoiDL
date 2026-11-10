import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Pagination } from '../../components/pagination/pagination';
import { Auth } from '../../services/auth';
import { ConsultService } from '../../services/consult';

type Filter = 'all' | 'new' | 'done';

@Component({
  selector: 'app-consults',
  imports: [DatePipe, Pagination],
  templateUrl: './consults.html',
})
export class Consults {
  private consultService = inject(ConsultService);
  authService = inject(Auth);

  consults = this.consultService.consults;
  filter = signal<Filter>('all');

  newCount = computed(() => this.consults().filter((c) => !c.contacted).length);
  filters = computed<{ key: Filter; label: string; count: number }[]>(() => [
    { key: 'all', label: 'Tất cả', count: this.consults().length },
    { key: 'new', label: 'Chưa liên hệ', count: this.newCount() },
    { key: 'done', label: 'Đã liên hệ', count: this.consults().length - this.newCount() },
  ]);

  filtered = computed(() => {
    const f = this.filter();
    return [...this.consults()]
      .filter((c) => f === 'all' || c.contacted === (f === 'done'))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // mới nhất lên đầu
  });

  // phân trang
  page = signal(1);
  pageSize = signal(10);
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  setFilter(f: Filter) {
    this.filter.set(f);
    this.page.set(1);
  }

  toggleContacted(id: string, contacted: boolean) {
    if (!this.authService.hasPermission('consult.update')) return;
    this.consultService.setContacted(id, contacted);
  }

  delete(id: string) {
    if (!this.authService.hasPermission('consult.delete')) return;
    if (confirm('Xóa yêu cầu tư vấn này?')) this.consultService.remove(id);
  }
}
