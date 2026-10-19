import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth-service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('posts registration fields using the Pet Clinic API contract', () => {
    let result: unknown;
    service.register({
      fullName: 'Nguyen Van A',
      phone: '0912345678',
      email: 'a@example.com',
      password: 'Password1',
    }).subscribe((response) => {
      result = response;
    });

    const request = http.expectOne('http://localhost:8080/api/v1/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      full_name: 'Nguyen Van A',
      phone: '0912345678',
      email: 'a@example.com',
      password: 'Password1',
    });
    request.flush({ EC: 0, DT: { accepted: true } });

    expect(result).toEqual({ accepted: true });
  });

  it('posts login fields using the Pet Clinic API contract', () => {
    let result: unknown;
    service.loginPetClinic({
      loginId: 'a@example.com',
      password: 'Password1',
      remember: true,
    }).subscribe((response) => {
      result = response;
    });

    const request = http.expectOne('http://localhost:8080/api/v1/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      login_id: 'a@example.com',
      password: 'Password1',
      remember_me: true,
    });
    request.flush({
      EC: 0,
      DT: {
        access_token: 'access-token',
        user: {
          user_id: 'user-1',
          full_name: 'Nguyen Van A',
          email: 'a@example.com',
          phone: '0912345678',
          role_code: 'CUSTOMER',
        },
      },
    });

    expect(result).toEqual({
      access_token: 'access-token',
      user: {
        id: 'user-1',
        fullName: 'Nguyen Van A',
        email: 'a@example.com',
        phone: '0912345678',
        systemRole: 'USER',
      },
    });
    expect(localStorage.getItem('accessToken')).toBe('access-token');
    expect(sessionStorage.getItem('accessToken')).toBeNull();
  });

  it('keeps a non-remembered session in sessionStorage only', () => {
    service.loginPetClinic({
      loginId: '0912345678',
      password: 'Password1',
      remember: false,
    }).subscribe();

    const request = http.expectOne('http://localhost:8080/api/v1/login');
    request.flush({
      EC: 0,
      DT: {
        access_token: 'temporary-token',
        user: { user_id: 'user-2', full_name: 'Nguyen Van B', phone: '0912345678' },
      },
    });

    expect(sessionStorage.getItem('accessToken')).toBe('temporary-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('refreshes the access token using the backend refresh endpoint', () => {
    let refreshedToken = '';
    service.refreshAccessToken().subscribe((token) => refreshedToken = token);

    const request = http.expectOne('http://localhost:8080/api/v1/refresh');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ EC: 0, DT: { access_token: 'refreshed-token' } });

    expect(refreshedToken).toBe('refreshed-token');
  });

  it('clears local and session credentials on logout', () => {
    localStorage.setItem('accessToken', 'old-local-token');
    localStorage.setItem('access_token', 'legacy-token');
    sessionStorage.setItem('accessToken', 'old-session-token');
    localStorage.setItem('userData', JSON.stringify({ user_id: 'user-1' }));

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('userData')).toBeNull();
  });
});
