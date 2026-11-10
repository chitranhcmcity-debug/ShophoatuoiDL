import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { CheckoutService } from '../../services/checkout';
import { ProductService } from '../../services/product';
import { localDate } from '../../utils/date';
import { DayRow, buildReport, reportCsv } from './report-data';

const MAX_AXIS_LABELS = 10;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDate(d);
}

const firstOfMonth = () => localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

/** Bước chia trục tròn: 1, 2, 5 x 10^n, khoảng 4 vạch */
function niceStep(max: number): number {
  const raw = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const ratio = raw / magnitude;
  return (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * magnitude;
}

/** Số gọn cho trục: 500k, 1,5tr */
function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

@Component({
  selector: 'app-reports',
  imports: [DatePipe],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports {
  private checkoutService = inject(CheckoutService);
  private productService = inject(ProductService);

  from = signal(firstOfMonth());
  to = signal(localDate());
  hovered = signal<DayRow | null>(null);

  presets = [
    { label: 'Hôm nay', from: () => localDate() },
    { label: '7 ngày', from: () => daysAgo(6) },
    { label: 'Tháng này', from: firstOfMonth },
  ];

  invalid = computed(() => !this.from() || !this.to() || this.from() > this.to());

  report = computed(() =>
    buildReport(this.checkoutService.orders(), this.invalid() ? '9999-12-31' : this.from(), this.invalid() ? '0000-01-01' : this.to(), (id) => this.categoryOf(id))
  );

  stats = computed(() => {
    const r = this.report();
    return [
      { label: 'Doanh thu', value: this.money(r.revenue), note: 'Chỉ tính đơn đã giao' },
      { label: 'Đơn đã giao', value: String(r.delivered), note: 'Trong khoảng đã chọn' },
      { label: 'Đơn đã hủy', value: String(r.cancelled), note: 'Theo ngày hủy' },
      { label: 'Trung bình mỗi đơn', value: this.money(r.average), note: 'Doanh thu / đơn đã giao' },
    ];
  });

  chart = computed(() => {
    const days = this.report().days;
    const max = Math.max(...days.map((d) => d.revenue), 0);
    if (days.length < 2 || max === 0) return null;
    const step = niceStep(max);
    const top = Math.ceil(max / step) * step;
    const ticks = Array.from({ length: top / step + 1 }, (_, i) => ({ label: compact(i * step), percent: ((i * step) / top) * 100 }));
    const labelEvery = Math.ceil(days.length / MAX_AXIS_LABELS);
    const peak = days.findIndex((d) => d.revenue === max);
    return {
      ticks,
      bars: days.map((day, i) => ({
        day,
        percent: (day.revenue / top) * 100,
        showDate: i % labelEvery === 0,
        peakLabel: i === peak ? compact(max) : null,
      })),
    };
  });

  maxCategory = computed(() => Math.max(1, ...this.report().categories.map((c) => c.revenue)));
  topProducts = computed(() => this.report().products.slice(0, 10));

  private categoryOf(productId: string): string {
    const product = this.productService.getProductById(productId);
    return (product && this.productService.getCategory(product.category)?.name) || 'Khác';
  }

  money(value: number): string {
    return value.toLocaleString('vi-VN') + 'đ';
  }

  applyPreset(from: string) {
    this.from.set(from);
    this.to.set(localDate());
  }

  isActive(from: string): boolean {
    return this.from() === from && this.to() === localDate();
  }

  exportCsv() {
    if (this.invalid()) return;
    const blob = new Blob([reportCsv(this.report(), this.from(), this.to())], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bao-cao-doanh-thu_${this.from()}_${this.to()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
