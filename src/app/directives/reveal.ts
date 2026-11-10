import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';

/** Phần tử rơi từ từ xuống vị trí khi cuộn tới. Ví dụ: appReveal, [revealDelay]="$index * 100" */
@Directive({ selector: '[appReveal]' })
export class Reveal implements OnInit, OnDestroy {
  revealDelay = input(0);

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: IntersectionObserver;

  ngOnInit() {
    const el = this.host.nativeElement;
    el.classList.add('scroll-reveal');
    el.style.setProperty('--reveal-delay', `${this.revealDelay()}ms`);
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          this.observer?.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' } // đợi vào hẳn màn hình để thấy trọn lúc rơi
    );
    this.observer.observe(el);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
