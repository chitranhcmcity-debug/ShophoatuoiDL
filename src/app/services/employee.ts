import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, firstValueFrom, forkJoin } from 'rxjs';
import { Employee, User } from '../interfaces/user';
import { API_URL } from './storage';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private apiUrl = API_URL; // json-server URL

  users = signal<User[]>([]);
  employees = signal<Employee[]>([]);

  /** Hoàn tất khi đã tải xong users và employees từ API */
  loaded: Promise<void>;

  constructor(private http: HttpClient) {
    this.loaded = this.loadData();
  }

  private loadData(): Promise<void> {
    return firstValueFrom(
      forkJoin([this.http.get<User[]>(`${this.apiUrl}/users`), this.http.get<Employee[]>(`${this.apiUrl}/employees`)])
    ).then(([users, employees]) => {
      this.users.set(users);
      this.employees.set(employees);
    });
  }

  // ============ USERS ============
  getUsers(): User[] {
    return this.users();
  }
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }
  addUser(user: User): void {
    this.http.post<User>(`${this.apiUrl}/users`, user).subscribe((newUser) => {
      this.users.update((list) => [...list, newUser]);
    });
  }
  updateUser(user: any): void {
    if (!user.id) return;
    this.http.patch<User>(`${this.apiUrl}/users/${user.id}`, user).subscribe((updated) => {
      this.users.update((list) => list.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
    });
  }
  deleteUserId(id: string): void {
    this.http.delete(`${this.apiUrl}/users/${id}`).subscribe(() => {
      this.users.update((list) => list.filter((u) => u.id !== id));
    });
  }

  // ============ EMPLOYEES ============
  getEmployees(): Employee[] {
    return this.employees();
  }
  getEmployeeById(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/employees/${id}`);
  }
  addEmployee(employee: Employee): void {
    this.http.post<Employee>(`${this.apiUrl}/employees`, employee).subscribe((newEmp) => {
      this.employees.update((list) => [...list, newEmp]);
    });
  }
  updateEmployee(employee: any): void {
    if (!employee.id) return;
    this.http.patch<Employee>(`${this.apiUrl}/employees/${employee.id}`, employee).subscribe((updated) => {
      this.employees.update((list) => list.map((e) => (e.id === employee.id ? { ...e, ...updated } : e)));
    });
  }
  deleteEmployeeId(id: string): void {
    this.http.delete(`${this.apiUrl}/employees/${id}`).subscribe(() => {
      this.employees.update((list) => list.filter((e) => e.id !== id));
    });
  }
}
