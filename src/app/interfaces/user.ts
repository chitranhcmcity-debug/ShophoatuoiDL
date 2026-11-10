export interface User {
  id?: string;
  username: string;
  password: string;
  role: string;
  islocked?: boolean;
  permissions: string[];
}

export interface Employee {
  id?: string;
  image: string;
  fullname: string;
  email: string;
  phone: string;
  address: string;
  birthday?: string;
}

export interface Customer {
  id?: string;
  username: string;
  password: string;
  fullname: string;
  email: string;
  phone: string;
  address: string;
  birthday?: string;
  role: string;
  islocked: boolean;
  createdAt?: string; // ISO, thời điểm tạo tài khoản
}

/** Thông tin người đăng nhập hiện tại (lưu ở localStorage) */
export interface CurrentUser {
  id?: string;
  username: string;
  role: string;
  permissions: string[];
}
