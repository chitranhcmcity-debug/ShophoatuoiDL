import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';

const DURATION_MS = 1200;

/** Số chạy từ 0 tới giá trị thật khi cuộn tới. Ví dụ: <span [appCountUp]="72"></span> */
@Directive({ selector: '[appCountUp]' })
export class CountUp implements OnInit, OnDestroy {
  appCountUp = input.required<number>();

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: IntersectionObserver;
  private frame = 0;

  ngOnInit() {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      this.show(this.appCountUp());
      return;
    }
    this.show(0);
    this.observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        this.observer?.disconnect();
        this.run();
      }
    });
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    cancelAnimationFrame(this.frame);
  }

  private run() {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.show(Math.round(this.appCountUp() * eased));
      if (t < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  private show(value: number) {
    this.host.nativeElement.textContent = value.toLocaleString('vi-VN');
  }
}
