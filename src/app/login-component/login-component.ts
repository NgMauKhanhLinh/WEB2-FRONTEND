import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth-service';

const PHONE_PATTERN = /^(?:\\+84|0)(?:3|5|7|8|9)\\d{8}$/;
const EMAIL_PATTERN = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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
    private readonly route: ActivatedRoute,
  ) {
    this.loginForm = this.fb.group({
      account: ['', [Validators.required, LoginComponent.accountValidator]],
      password: ['', [Validators.required]],
      remember: [false],
    });
  }

  static accountValidator(control: AbstractControl): { account: true } | null {
    const value = String(control.value ?? '').trim();
    return !value || PHONE_PATTERN.test(value) || EMAIL_PATTERN.test(value) ? null : { account: true };
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const { account, password, remember } = this.loginForm.getRawValue();

    this.authService.loginPetClinic({
      loginId: String(account ?? '').trim(),
      password: String(password ?? ''),
      remember: Boolean(remember),
    }).subscribe({
      next: () => {
        this.isLoading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const target = returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
          ? returnUrl
          : '/thong-tin-nguoi-dung';
        void this.router.navigateByUrl(target);
      },
      error: (error: Error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      },
    });
  }
}
