import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../services/auth-service';

const PHONE_PATTERN = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-component.html',
  styleUrls: ['./login-component.css'],
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';
  isLoading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.loginForm = this.fb.group({
      account: ['', [Validators.required, LoginComponent.accountValidator]],
      password: ['', [Validators.required]],
      remember: [false],
    });
  }

  static accountValidator(control: AbstractControl): { account: true } | null {
    const value = String(control.value ?? '').trim();
    return !value || PHONE_PATTERN.test(value) || EMAIL_PATTERN.test(value)
      ? null
      : { account: true };
  }

  // onSubmit(): void {
  //   if (this.loginForm.invalid) {
  //     this.loginForm.markAllAsTouched();
  //     return;
  //   }

  //   this.isLoading = true;
  //   this.errorMessage = '';

  //   const { account, password, remember } = this.loginForm.getRawValue();
  //   const loginId = String(account ?? '').trim();

  //   this.authService.loginPetClinic({
  //     loginId,
  //     password: password ?? '',
  //     remember: Boolean(remember),
  //   }).subscribe({
  //     next: () => {
  //       this.isLoading = false;
  //       void this.router.navigate(['/thong-tin-nguoi-dung']);
  //     },
  //     error: (err: Error) => {
  //       this.isLoading = false;
  //       this.errorMessage = err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
  //     },
  //   });
  // }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { account, password, remember } = this.loginForm.getRawValue();
    const loginId = String(account ?? '').trim();

    // CHẶN BẮT BUỘC: Không cho gọi đến AuthService khi dùng tài khoản Admin test
    if (loginId === 'admin@test.com' && password === 'admin123') {
      setTimeout(() => {
        this.isLoading = false;
        localStorage.setItem('access_token', 'mock-jwt-token-admin');
        void this.router.navigate(['/thong-tin-nguoi-dung']);
      }, 500);
      return; // <--- Cực kỳ quan trọng: Dòng này ngăn lệnh gọi API phía dưới
    }

    // Lệnh gọi API thật (sẽ bị lỗi nếu chưa bật Backend)
    this.authService
      .loginPetClinic({
        loginId,
        password: password ?? '',
        remember: Boolean(remember),
      })
      .subscribe({
        // ... giữ nguyên ...
      });
  }
}
