import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { Category, Product } from '../interfaces/product';
import { Auth } from './auth';
import { API_URL, StorageService } from './storage';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = `${API_URL}/products`;
  private categories: Category[];
  products = signal<Product[]>([]);

  /** Từ khóa tìm kiếm */
  keyword = signal('');
  /** Danh sách sau khi lọc theo từ khóa */
  allProducts = computed(() => {
    const q = this.keyword().trim().toLowerCase();
    if (!q) return this.products();
    return this.products().filter((p) => p.title.toLowerCase().includes(q));
  });

  /** Sản phẩm mỗi người dùng đã thả tim: { userId: [productId, ...] } */
  private favoritesKey = 'favorites';
  likes = signal<{ id: string; productIds: string[] }[]>([]);

  /** Hoàn tất khi đã tải xong danh sách sản phẩm từ API */
  loaded: Promise<void>;

  constructor(private http: HttpClient, private storageService: StorageService, private authService: Auth) {
    this.likes.set(storageService.getOrCreate<{ id: string; productIds: string[] }[]>(this.favoritesKey, []));
    storageService.watch(this.favoritesKey, () => this.likes.set(storageService.get<{ id: string; productIds: string[] }[]>(this.favoritesKey) ?? []));
    this.categories = storageService.getOrCreate<Category[]>('categories', []);
    storageService.watch('categories', () => (this.categories = storageService.get<Category[]>('categories') ?? []));
    this.loaded = firstValueFrom(this.http.get<Product[]>(this.apiUrl)).then((data) => this.products.set(data));
  }

  getProducts(): Product[] {
    return this.products();
  }
  getCategories(): Category[] {
    return this.categories;
  }
  getCategory(slug: string): Category | undefined {
    return this.categories.find((c) => c.slug === slug);
  }
  getProductById(id: string): Product | undefined {
    return this.products().find((p) => p.id === id);
  }
  getByCategory(slug: string): Product[] {
    return this.products().filter((p) => p.category === slug);
  }
  countByCategory(slug: string): number {
    return this.getByCategory(slug).length;
  }

  discountPrice(price: number, discount: number): number {
    return price - price * (discount / 100);
  }

  onSearch(query: string) {
    this.keyword.set(query);
  }

  /** Lấy 1 sản phẩm theo id từ API */
  getProductId(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }
  create(p: Product): void {
    this.http.post<Product>(this.apiUrl, p).subscribe((created) => {
      this.products.update((list) => [...list, created]);
    });
  }
  update(id: string, p: Product): void {
    this.http.put<Product>(`${this.apiUrl}/${id}`, p).subscribe((updated) => {
      this.products.update((list) => list.map((x) => (x.id === id ? updated : x)));
    });
  }
  delete(id: string): void {
    this.http.delete<void>(`${this.apiUrl}/${id}`).subscribe(() => {
      this.products.update((list) => list.filter((x) => x.id !== id));
    });
  }
  increaseView(id: string): void {
    const p = this.getProductById(id);
    if (!p) return;
    this.http.patch<Product>(`${this.apiUrl}/${id}`, { views: p.views + 1 }).subscribe((updated) => {
      this.products.update((list) => list.map((x) => (x.id === id ? updated : x)));
    });
  }
  /** Người dùng hiện tại đã thả tim sản phẩm này chưa */
  isFavorite(id: string): boolean {
    const u = this.authService.user();
    return !!u && !!this.likes().find((l) => l.id === u.id)?.productIds.includes(id);
  }
  /** Số tim thực = số tài khoản đang thả tim sản phẩm này */
  favoriteCount(id: string): number {
    return this.likes().filter((l) => l.productIds.includes(id)).length;
  }
  /** Phải đăng nhập; bấm lần 1 để tim, bấm lại để bỏ tim (mỗi tài khoản tối đa 1 tim / sản phẩm) */
  favorite(id: string): boolean {
    const u = this.authService.user();
    if (!u) {
      alert('Vui lòng đăng nhập để thả tim sản phẩm!');
      return false;
    }
    const mine = this.likes().find((l) => l.id === u.id)?.productIds ?? [];
    const productIds = mine.includes(id) ? mine.filter((x) => x !== id) : [...mine, id];
    const rest = this.likes().filter((l) => l.id !== u.id);
    const likes = [...rest, { id: u.id!, productIds }];
    this.likes.set(likes);
    this.storageService.set(this.favoritesKey, likes);
    return true;
  }
}
