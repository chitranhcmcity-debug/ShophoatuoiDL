export interface Product {
  id: string;
  title: string;
  image: string;
  category: string; // slug của danh mục
  description: string;
  price: number;
  discount: number; // phần trăm
  stock: number;
  views: number;
  sold: number;
  favorites: number;
  createdAt: string;
  freeship: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}
