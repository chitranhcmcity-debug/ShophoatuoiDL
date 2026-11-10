import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductCard } from '../../components/product-card/product-card';
import { CountUp } from '../../directives/count-up';
import { Reveal } from '../../directives/reveal';
import { ProductService } from '../../services/product';
import { ConsultService } from '../../services/consult';
import { SettingsService } from '../../services/settings';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ReactiveFormsModule, ProductCard, Reveal, CountUp],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private productService = inject(ProductService);
  private consultService = inject(ConsultService);
  private settings = inject(SettingsService).settings;

  // ===== Slider =====
  banners = [
    { image: '/image/banners/banner1.jpg', title: 'HOA TƯƠI DL', sub: 'Giao hoa nhanh 60 phút - Miễn phí ship', link: 'hoa-sinh-nhat' },
    { image: '/image/banners/banner2.jpg', title: 'HOA TÌNH YÊU', sub: 'Gửi trao yêu thương - Giảm đến 15%', link: 'hoa-tinh-yeu' },
    { image: '/image/banners/banner3.jpg', title: 'HOA TẶNG NGÀY LỄ', sub: '8/3 - 20/10 - 20/11 - Quà tặng ý nghĩa', link: 'hoa-8-3' },
    { image: '/image/banners/banner4.jpg', title: 'HOA KHAI TRƯƠNG', sub: 'Kệ hoa sang trọng - Phát lộc phát tài', link: 'hoa-khai-truong' },
  ];
  currentBanner = signal(0);

  // ===== Danh mục + sản phẩm theo từng danh mục =====
  categories = this.productService.getCategories();
  rows = computed(() =>
    this.categories.map((category) => ({
      category,
      items: this.productService.products().filter((p) => p.category === category.slug).slice(0, 4),
    }))
  );

  // ===== Bán chạy nhất + Hoa mới về =====
  bestSellers = computed(() => [...this.productService.products()].sort((a, b) => b.sold - a.sold).slice(0, 8));
  newest = computed(() => [...this.productService.products()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4));

  // ===== Giá sốc hôm nay (sản phẩm có giảm giá) =====
  flashSale = computed(() =>
    [...this.productService.products()].filter((p) => p.discount >= 8).sort((a, b) => b.discount - a.discount).slice(0, 4)
  );
  countdown = signal('00:00:00');

  // ===== FAQ =====
  openFaq = signal<number | null>(0);
  faqs = [
    { q: 'Shop giao hoa trong bao lâu?', a: 'Hoa Tươi DL giao hoa nhanh trong vòng 60 phút đối với khu vực nội thành, tối đa 90 phút với đơn hàng theo yêu cầu.' },
    { q: 'Phí vận chuyển được tính như thế nào?', a: 'Miễn phí giao hàng trong bán kính 5km với đơn từ 400.000đ. Các khu vực xa hơn phụ thu từ 20.000đ.' },
    { q: 'Làm sao để biết hoa tươi, đúng mẫu?', a: 'Chúng tôi cam kết hoa tươi 100%, đúng mẫu đã đặt. Nếu không hài lòng, shop đổi lại hoặc hoàn tiền.' },
    { q: 'Shop hỗ trợ những hình thức thanh toán nào?', a: 'Thanh toán khi nhận hàng (COD) hoặc chuyển khoản ngân hàng.' },
  ];

  branches = [
    { city: 'Hồ Chí Minh', addresses: ['12 Nguyễn Văn Linh, Quận 7', '45 Lê Văn Việt, TP. Thủ Đức', '210 Cách Mạng Tháng 8, Quận 3'] },
    { city: 'Hà Nội', addresses: ['88 Cầu Giấy, Cầu Giấy', '15 Nguyễn Trãi, Thanh Xuân'] },
    { city: 'Đà Nẵng', addresses: ['120 Nguyễn Văn Linh, Hải Châu'] },
    { city: 'Cần Thơ', addresses: ['30 Nguyễn Văn Cừ, Ninh Kiều'] },
  ];

  stats = computed(() => [
    { icon: 'bi-flower1', value: this.productService.products().length, suffix: '+', label: 'Mẫu hoa đang bán' },
    { icon: 'bi-grid-fill', value: this.categories.length, suffix: '', label: 'Chủ đề hoa' },
    { icon: 'bi-shop', value: this.branches.reduce((n, b) => n + b.addresses.length, 0), suffix: '', label: 'Chi nhánh toàn quốc' },
    { icon: 'bi-lightning-charge-fill', value: 60, suffix: ' phút', label: 'Giao nhanh nội thành' },
  ]);

  steps = [
    { icon: 'bi-search-heart', title: 'Chọn mẫu hoa', text: 'Xem theo chủ đề hoặc tìm nhanh mẫu bạn thích.' },
    { icon: 'bi-cart-check', title: 'Đặt hàng', text: 'Nhập địa chỉ, lời nhắn và cách giao hàng.' },
    { icon: 'bi-flower2', title: 'Cắm hoa', text: 'Hoa tươi trong ngày được nghệ nhân cắm theo mẫu.' },
    { icon: 'bi-truck', title: 'Giao tận nơi', text: 'Giao nhanh trong 60 phút khu vực nội thành.' },
  ];

  blogs = [
    { day: '12', month: '03', title: 'Ý nghĩa các loài hoa tặng ngày 8/3', excerpt: 'Mỗi loài hoa mang một thông điệp riêng, cùng tìm hiểu để chọn đúng món quà cho người phụ nữ của bạn.' },
    { day: '20', month: '10', title: 'Cách cắm hoa sinh nhật đẹp tại nhà', excerpt: 'Chỉ với vài bước đơn giản bạn có thể tự tay cắm một bình hoa tươi lâu và rực rỡ.' },
    { day: '05', month: '01', title: 'Bí quyết giữ hoa tươi lâu hơn', excerpt: 'Cắt cuống xiên, thay nước mỗi ngày và tránh ánh nắng trực tiếp là những mẹo nhỏ hiệu quả.' },
  ];

  testimonials = [
    { name: 'Nguyễn Thu Hà', text: 'Hoa giao đúng giờ, đẹp hơn cả hình. Người nhận rất bất ngờ và vui!' },
    { name: 'Trần Minh Quân', text: 'Đặt kệ hoa khai trương rất sang trọng, nhân viên tư vấn nhiệt tình.' },
    { name: 'Lê Phương Anh', text: 'Giá hợp lý, hoa tươi lâu. Mình sẽ tiếp tục ủng hộ shop.' },
  ];

  // ===== Form tư vấn (Reactive Forms) =====
  consultForm = new FormGroup({
    fullname: new FormControl<string>('', [Validators.required, Validators.minLength(3)]),
    phone: new FormControl<string>('', [Validators.required, Validators.pattern(/^0\d{9}$/)]),
    note: new FormControl<string>(''),
  });
  consultSent = signal(false);

  // ===== Hiệu ứng khi cuộn trang =====
  private slider = viewChild<ElementRef<HTMLElement>>('slider');
  private progress = viewChild<ElementRef<HTMLElement>>('progress');
  private quoteImg = viewChild<ElementRef<HTMLElement>>('quoteImg');
  private reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private ticking = false;
  showTop = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    const slide = setInterval(() => this.nextBanner(), 4000);
    const tick = setInterval(() => this.updateCountdown(), 1000);
    this.updateCountdown();
    const onScroll = () => {
      if (this.ticking) return;
      this.ticking = true;
      requestAnimationFrame(() => {
        this.ticking = false;
        this.updateScroll();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    afterNextRender(() => this.updateScroll());
    destroyRef.onDestroy(() => {
      clearInterval(slide);
      clearInterval(tick);
      window.removeEventListener('scroll', onScroll);
    });
  }

  private updateScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const bar = this.progress()?.nativeElement;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    this.showTop.set(y > 600);
    if (this.reduceMotion) return;

    // Ảnh banner trôi chậm hơn nội dung, chữ mờ dần khi cuộn qua
    const slider = this.slider()?.nativeElement;
    if (slider) {
      const height = slider.offsetHeight;
      slider.style.setProperty('--hero-shift', `${Math.min(y * 0.12, height * 0.08)}px`);
      slider.style.setProperty('--hero-fade', String(Math.max(1 - y / height, 0)));
    }

    const img = this.quoteImg()?.nativeElement;
    const box = img?.parentElement?.getBoundingClientRect();
    if (img && box && box.bottom > 0 && box.top < window.innerHeight) {
      const limit = box.height * 0.1;
      const offset = (box.top + box.height / 2 - window.innerHeight / 2) * -0.1;
      img.style.transform = `translateY(${Math.max(-limit, Math.min(limit, offset))}px) scale(1.2)`;
    }
  }

  scrollTop() {
    window.scrollTo({ top: 0, behavior: this.reduceMotion ? 'auto' : 'smooth' });
  }

  nextBanner() {
    this.currentBanner.update((i) => (i + 1) % this.banners.length);
  }
  prevBanner() {
    this.currentBanner.update((i) => (i - 1 + this.banners.length) % this.banners.length);
  }
  goBanner(i: number) {
    this.currentBanner.set(i);
  }

  private updateCountdown() {
    const now = new Date();
    const end = new Date(now);
    const [hour, minute] = this.settings().flashSaleEnd.split(':').map(Number);
    end.setHours(hour, minute, 0, 0);
    if (end <= now) end.setDate(end.getDate() + 1); // đã qua giờ kết thúc thì đếm tới ngày mai
    const s = Math.floor((end.getTime() - now.getTime()) / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    this.countdown.set(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
  }

  toggleFaq(i: number) {
    this.openFaq.update((cur) => (cur === i ? null : i));
  }

  isFieldInvalid(field: string): boolean | null {
    const control = this.consultForm.get(field);
    return control && control.invalid && (control.dirty || control.touched);
  }

  sendConsult() {
    if (this.consultForm.invalid) {
      this.consultForm.markAllAsTouched();
      return;
    }
    const v = this.consultForm.getRawValue();
    this.consultService.add({ fullname: v.fullname!, phone: v.phone!, note: v.note ?? '' });
    this.consultForm.reset();
    this.consultSent.set(true);
  }
}
