import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../components/pagination/pagination';
import { Product } from '../../interfaces/product';
import { Auth } from '../../services/auth';
import { ProductService } from '../../services/product';

@Component({
  selector: 'app-products',
  imports: [FormsModule, CurrencyPipe, Pagination],
  templateUrl: './products.html',
})
export class Products {
  private productService = inject(ProductService);
  authService = inject(Auth);
  products = this.productService.products;
  // phân trang
  page = signal(1);
  pageSize = signal(10);
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.products().slice(start, start + this.pageSize());
  });

  formProduct = signal<Product>(this.emptyProduct());
  isEditMode = signal(false);
  categories = this.productService.getCategories();

  categoryName(slug: string): string {
    return this.productService.getCategory(slug)?.name ?? slug;
  }

  private emptyProduct(): Product {
    return {
      id: '',
      title: '',
      image: '',
      category: 'hoa-sinh-nhat',
      description: '',
      price: 0,
      discount: 0,
      stock: 0,
      views: 0,
      sold: 0,
      favorites: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      freeship: true,
    };
  }

  private validateForm(): boolean {
    const f = this.formProduct();
    if (!f.title.trim()) return alert('Vui lòng nhập tên sản phẩm'), false;
    if (f.price <= 0 || isNaN(f.price)) return alert('Giá phải lớn hơn 0'), false;
    if (f.discount < 0 || f.discount > 100) return alert('Giảm giá phải từ 0 đến 100'), false;
    if (f.stock < 0 || isNaN(f.stock)) return alert('Tồn kho không hợp lệ'), false;
    return true;
  }

  submitForm(): void {
    if (!this.validateForm()) return;
    if (this.isEditMode()) {
      this.productService.update(this.formProduct().id, { ...this.formProduct() });
    } else {
      this.productService.create({
        ...this.formProduct(),
        id: 'p' + Date.now(),
        image: this.formProduct().image || '/image/products/hoa-sinh-nhat-1.jpg',
      });
    }
    this.resetForm();
  }

  editProduct(p: Product): void {
    this.isEditMode.set(true);
    this.formProduct.set({ ...p });
    window.scrollTo(0, 0);
  }

  deleteProduct(id: string): void {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    this.productService.delete(id);
    this.resetForm();
  }

  resetForm(): void {
    this.isEditMode.set(false);
    this.formProduct.set(this.emptyProduct());
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const reader = new FileReader();
      reader.onload = () => {
        this.formProduct.update((f) => ({ ...f, image: reader.result as string }));
      };
      reader.readAsDataURL(input.files[0]);
    }
  }
}
