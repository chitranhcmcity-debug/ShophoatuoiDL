import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Pagination } from '../../components/pagination/pagination';
import { ProductCard } from '../../components/product-card/product-card';
import { ProductService } from '../../services/product';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, ProductCard, Pagination],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  categories = this.productService.getCategories();
  selectedSlug = signal<string>('');
  keyword = signal<string>('');
  sortBy = signal<string>('newest');
  sorts = [
    { key: 'newest', label: 'Mới nhất' },
    { key: 'sold', label: 'Bán chạy' },
    { key: 'views', label: 'Nổi bật' },
    { key: 'priceAsc', label: 'Giá thấp' },
    { key: 'priceDesc', label: 'Giá cao' },
  ];

  // phân trang
  currentPage = signal(1);
  pageSize = signal(8);

  productCount = computed(() => this.productService.products().length);
  currentCategory = computed(() => this.productService.getCategory(this.selectedSlug()));

  /** Lọc theo danh mục + từ khóa, sau đó sắp xếp */
  filtered = computed(() => {
    const slug = this.selectedSlug();
    const q = this.keyword().trim().toLowerCase();
    let list = this.productService.products().filter(
      (p) => (!slug || p.category === slug) && (!q || p.title.toLowerCase().includes(q))
    );
    const price = (p: { price: number; discount: number }) => this.productService.discountPrice(p.price, p.discount);
    switch (this.sortBy()) {
      case 'sold':
        list = [...list].sort((a, b) => b.sold - a.sold);
        break;
      case 'views':
        list = [...list].sort((a, b) => b.views - a.views);
        break;
      case 'priceAsc':
        list = [...list].sort((a, b) => price(a) - price(b));
        break;
      case 'priceDesc':
        list = [...list].sort((a, b) => price(b) - price(a));
        break;
      default:
        list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return list;
  });


  pagedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.selectedSlug.set(params.get('slug') ?? '');
      this.currentPage.set(1);
    });
    this.route.queryParamMap.subscribe((params) => {
      this.keyword.set(params.get('q') ?? '');
      this.currentPage.set(1);
    });
  }

  countByCategory(slug: string) {
    return this.productService.countByCategory(slug);
  }

  changeSort(key: string) {
    this.sortBy.set(key);
    this.currentPage.set(1);
  }

}
