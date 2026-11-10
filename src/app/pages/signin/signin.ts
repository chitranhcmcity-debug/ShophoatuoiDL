import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-signin',
  imports: [FormsModule, RouterLink],
  templateUrl: './signin.html',
  styleUrl: './signin.css',
})
export class Signin {
  username = '';
  password = '';
  error = '';
  showPassword: boolean = false;

  passwordVisibility() {
    this.showPassword = !this.showPassword;
  }

  constructor(private authService: Auth, private router: Router) {}

  onSignin() {
    const success = this.authService.Signin(this.username, this.password);
    if (success) {
      const role = this.authService.getCurrentUserRole();
      if (role === 'customer') {
        this.router.navigate(['']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } else {
      this.error = 'Sai tài khoản hoặc mật khẩu';
    }
  }
}
