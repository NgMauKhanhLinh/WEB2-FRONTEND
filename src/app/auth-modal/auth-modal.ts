import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, QueryList, ViewChildren } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

type AuthScreen = 'login' | 'register' | 'forgot' | 'resetOtp' | 'registerOtp' | 'reset' | 'success';

const PHONE_PATTERN = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-modal.html',
  styleUrl: './auth-modal.css',
})
export class AuthModalComponent {
  @ViewChildren('otpInput') private otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  screen: AuthScreen = 'login';
  submitting = false;
  validationAttempted = false;
  submitError = '';
  resetToken = '';
  otp = ['', '', '', '', '', ''];
  showLoginPassword = false;
  showRegisterPassword = false;
  showRegisterConfirmation = false;
  showResetPassword = false;
  showResetConfirmation = false;

  readonly loginForm = new FormGroup({
    account: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, AuthModalComponent.accountValidator],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    remember: new FormControl(false, { nonNullable: true }),
  });

  readonly registerForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(PHONE_PATTERN)],
    }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(PASSWORD_PATTERN)],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly forgotForm = new FormGroup({
    account: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, AuthModalComponent.accountValidator],
    }),
  });

  readonly resetForm = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(PASSWORD_PATTERN)],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.close();
  }

  static accountValidator(control: AbstractControl): { account: true } | null {
    const value = String(control.value ?? '').trim();
    return !value || PHONE_PATTERN.test(value) || EMAIL_PATTERN.test(value) ? null : { account: true };
  }

  get isSplitScreen(): boolean {
    return this.screen === 'login' || this.screen === 'register';
  }

  get otpRecipient(): string {
    if (this.screen === 'registerOtp') {
      return this.registerForm.controls.email.value.trim() || this.registerForm.controls.phone.value.trim();
    }
    return this.forgotForm.controls.account.value.trim();
  }

  get screenHeading(): string {
    switch (this.screen) {
      case 'login': return 'Đăng nhập';
      case 'register': return 'Đăng ký tài khoản';
      case 'forgot': return 'Quên mật khẩu?';
      case 'resetOtp':
      case 'registerOtp': return 'Xác nhận mã OTP';
      case 'reset': return 'Tạo mật khẩu mới';
      case 'success': return 'Đăng ký thành công!';
    }
  }

  get screenDescription(): string {
    switch (this.screen) {
      case 'login': return 'Vui lòng nhập thông tin của bạn.';
      case 'register': return 'Tạo tài khoản để chăm sóc thú cưng thuận tiện hơn.';
      case 'forgot': return 'Nhập email đã đăng ký để nhận mã xác nhận.';
      case 'resetOtp':
      case 'registerOtp': return `Chúng tôi đã gửi mã 6 số đến ${this.otpRecipient}.`;
      case 'reset': return 'Nhập mật khẩu mới cho tài khoản của bạn.';
      case 'success': return 'Chào mừng bạn đến với Dr. Pet’s House.';
    }
  }

  close(): void {
    void this.router.navigateByUrl('/');
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  openScreen(screen: AuthScreen): void {
    this.screen = screen;
    this.submitError = '';
    this.validationAttempted = false;
    this.otp = ['', '', '', '', '', ''];
  }

  fieldError(form: FormGroup, name: string): string {
    if (!this.validationAttempted) return '';
    const control = form.get(name);
    if (!control?.errors) return '';
    if (control.errors['required']) {
      if (name === 'account' || name === 'phone') return 'Vui lòng nhập số điện thoại hoặc email.';
      if (name === 'password') return 'Vui lòng nhập mật khẩu.';
      return 'Vui lòng điền thông tin.';
    }
    if (control.errors['account']) return 'Vui lòng nhập đúng số điện thoại hoặc email.';
    if (control.errors['email']) return 'Email không đúng định dạng.';
    if (control.errors['pattern'] && name === 'phone') return 'Số điện thoại không đúng định dạng.';
    if (control.errors['pattern']) return 'Mật khẩu cần tối thiểu 8 ký tự, gồm 1 chữ hoa và 1 số.';
    return '';
  }

  confirmationError(form: FormGroup): string {
    if (!this.validationAttempted || !form.get('confirmPassword')?.touched) return '';
    return form.get('confirmPassword')?.value === form.get('password')?.value
      ? ''
      : 'Mật khẩu xác nhận chưa khớp.';
  }

  submitLogin(): void {
    this.validationAttempted = true;
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    this.submitting = true;
    this.submitError = '';
    const { account, password, remember } = this.loginForm.getRawValue();
    this.authService.loginPetClinic({ loginId: account.trim(), password, remember }).subscribe({
      next: () => {
        this.submitting = false;
        void this.router.navigate(['/thong-tin-nguoi-dung']);
      },
      error: (error: Error) => {
        this.submitting = false;
        this.submitError = error.message || 'Đăng nhập không thành công.';
      },
    });
  }

  submitRegister(): void {
    this.validationAttempted = true;
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid || !this.passwordsMatch(this.registerForm)) return;

    this.submitting = true;
    this.submitError = '';
    const form = this.registerForm.getRawValue();
    this.authService.register({
      fullName: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      password: form.password,
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.openScreen('registerOtp');
      },
      error: (error: Error) => {
        this.submitting = false;
        this.submitError = error.message || 'Đăng ký không thành công.';
      },
    });
  }

  submitForgotPassword(): void {
    this.validationAttempted = true;
    this.forgotForm.markAllAsTouched();
    if (this.forgotForm.invalid) return;

    const email = this.forgotForm.controls.account.value.trim();
    if (!EMAIL_PATTERN.test(email)) {
      this.submitError = 'Hệ thống hiện chỉ hỗ trợ khôi phục mật khẩu bằng email.';
      return;
    }

    this.submitting = true;
    this.submitError = '';
    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.submitting = false;
        this.openScreen('resetOtp');
      },
      error: (error: Error) => {
        this.submitting = false;
        this.submitError = error.message || 'Không thể gửi mã xác nhận.';
      },
    });
  }

  updateOtp(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    this.otp[index] = digit;
    input.value = digit;
    if (digit) this.otpInputs.get(index + 1)?.nativeElement.focus();
  }

  handleOtpKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otp[index]) {
      this.otpInputs.get(index - 1)?.nativeElement.focus();
    }
    if (event.key === 'ArrowLeft') this.otpInputs.get(index - 1)?.nativeElement.focus();
    if (event.key === 'ArrowRight') this.otpInputs.get(index + 1)?.nativeElement.focus();
  }

  pasteOtp(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    this.otp = Array.from({ length: 6 }, (_, index) => pasted[index] ?? '');
    this.otpInputs.get(Math.min(pasted.length, 5))?.nativeElement.focus();
  }

  submitOtp(): void {
    const code = this.otp.join('');
    if (code.length !== 6 || this.submitting) return;
    this.submitting = true;
    this.submitError = '';

    if (this.screen === 'registerOtp') {
      const loginId = this.registerForm.controls.email.value.trim() || this.registerForm.controls.phone.value.trim();
      this.authService.verifyRegisterOtp({ loginId, otpCode: code }).subscribe({
        next: () => {
          this.submitting = false;
          this.openScreen('success');
        },
        error: (error: Error) => {
          this.submitting = false;
          this.submitError = error.message || 'Mã OTP không hợp lệ.';
        },
      });
      return;
    }

    this.authService.verifyForgotOtp({ email: this.otpRecipient, otpCode: code }).subscribe({
      next: (response) => {
        this.submitting = false;
        this.resetToken = response.reset_token ?? '';
        this.openScreen('reset');
      },
      error: (error: Error) => {
        this.submitting = false;
        this.submitError = error.message || 'Mã OTP không hợp lệ.';
      },
    });
  }

  submitResetPassword(): void {
    this.validationAttempted = true;
    this.resetForm.markAllAsTouched();
    if (this.resetForm.invalid || !this.passwordsMatch(this.resetForm)) return;
    if (!this.resetToken) {
      this.submitError = 'Mã đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu mã mới.';
      return;
    }

    this.submitting = true;
    this.submitError = '';
    this.authService.resetPassword({
      resetToken: this.resetToken,
      newPassword: this.resetForm.controls.password.value,
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.openScreen('login');
      },
      error: (error: Error) => {
        this.submitting = false;
        this.submitError = error.message || 'Không thể đổi mật khẩu.';
      },
    });
  }

  private passwordsMatch(form: FormGroup): boolean {
    return form.get('password')?.value === form.get('confirmPassword')?.value;
  }
}
