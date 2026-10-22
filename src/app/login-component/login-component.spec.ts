import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../services/auth-service';
import { LoginComponent } from './login-component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: { loginPetClinic: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authService = {
      loginPetClinic: vi.fn().mockReturnValue(of({ access_token: 'token', user: {} })),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([{ path: 'thong-tin-nguoi-dung', children: [] }]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('creates the login form', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Số điện thoại hoặc email');
  });

  it('validates email and phone identifiers before sending credentials', () => {
    component.loginForm.controls['account'].setValue('not-an-account');

    component.onSubmit();

    expect(component.loginForm.invalid).toBe(true);
    expect(authService.loginPetClinic).not.toHaveBeenCalled();
  });

  it('submits Pet Clinic credentials including the remember preference', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.loginForm.setValue({
      account: '0912345678',
      password: 'password',
      remember: true,
    });

    component.onSubmit();

    expect(authService.loginPetClinic).toHaveBeenCalledWith({
      loginId: '0912345678',
      password: 'password',
      remember: true,
    });
    expect(navigate).toHaveBeenCalledWith(['/thong-tin-nguoi-dung']);
  });

  it('trims spaces around the login identifier before sending credentials', () => {
    component.loginForm.setValue({
      account: '  member@example.com  ',
      password: 'password',
      remember: false,
    });

    component.onSubmit();

    expect(authService.loginPetClinic).toHaveBeenCalledWith({
      loginId: 'member@example.com',
      password: 'password',
      remember: false,
    });
  });

  it('shows the authentication error returned by the service', () => {
    authService.loginPetClinic.mockReturnValue(throwError(() => new Error('Thông tin không chính xác.')));
    component.loginForm.setValue({
      account: 'member@example.com',
      password: 'password',
      remember: false,
    });

    component.onSubmit();

    expect(component.errorMessage).toBe('Thông tin không chính xác.');
    expect(component.isLoading).toBe(false);
  });
});
