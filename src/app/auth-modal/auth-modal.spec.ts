import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthModalComponent } from './auth-modal';
import { AuthService } from '../services/auth-service';

describe('AuthModalComponent', () => {
  let fixture: ComponentFixture<AuthModalComponent>;
  let component: AuthModalComponent;
  let authService: {
    loginPetClinic: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    forgotPassword: ReturnType<typeof vi.fn>;
    verifyRegisterOtp: ReturnType<typeof vi.fn>;
    verifyForgotOtp: ReturnType<typeof vi.fn>;
    resetPassword: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      loginPetClinic: vi.fn().mockReturnValue(of({ access_token: 'token', user: {} })),
      register: vi.fn().mockReturnValue(of({})),
      forgotPassword: vi.fn().mockReturnValue(of({})),
      verifyRegisterOtp: vi.fn().mockReturnValue(of({})),
      verifyForgotOtp: vi.fn().mockReturnValue(of({ reset_token: 'reset-token' })),
      resetPassword: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [AuthModalComponent],
      providers: [
        provideHttpClient(),
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the login dialog and its validation messages', () => {
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(component.screen).toBe('login');

    component.submitLogin();
    fixture.detectChanges();

    expect(component.validationAttempted).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Vui lòng nhập số điện thoại hoặc email.');
  });

  it('submits valid login credentials through AuthService', () => {
    component.loginForm.setValue({
      account: '0912345678',
      password: 'password',
      remember: true,
    });

    component.submitLogin();

    expect(authService.loginPetClinic).toHaveBeenCalledWith({
      loginId: '0912345678',
      password: 'password',
      remember: true,
    });
  });

  it('requires matching registration passwords before continuing', () => {
    component.openScreen('register');
    component.registerForm.setValue({
      name: 'Nguyen Van A',
      phone: '0912345678',
      email: 'a@example.com',
      password: 'Password1',
      confirmPassword: 'Password2',
    });

    component.submitRegister();

    expect(authService.register).not.toHaveBeenCalled();
    expect(component.confirmationError(component.registerForm)).toContain('chưa khớp');
  });

  it('moves a successful registration into OTP verification and then the success screen', () => {
    component.openScreen('register');
    component.registerForm.setValue({
      name: 'Nguyen Van A',
      phone: '0912345678',
      email: 'a@example.com',
      password: 'Password1',
      confirmPassword: 'Password1',
    });

    component.submitRegister();

    expect(authService.register).toHaveBeenCalledWith({
      fullName: 'Nguyen Van A',
      phone: '0912345678',
      email: 'a@example.com',
      password: 'Password1',
    });
    expect(component.screen).toBe('registerOtp');

    component.otp = ['1', '2', '3', '4', '5', '6'];
    component.submitOtp();

    expect(authService.verifyRegisterOtp).toHaveBeenCalledWith({
      loginId: 'a@example.com',
      otpCode: '123456',
    });
    expect(component.screen).toBe('success');
  });

  it('keeps API failures visible to the user', () => {
    authService.loginPetClinic.mockReturnValue(throwError(() => new Error('Sai thông tin đăng nhập')));
    component.loginForm.setValue({
      account: 'user@example.com',
      password: 'password',
      remember: false,
    });

    component.submitLogin();

    expect(component.submitError).toBe('Sai thông tin đăng nhập');
    expect(component.submitting).toBe(false);
  });
});
