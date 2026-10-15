import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  systemRole: 'ADMIN' | 'USER';
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface RegisterRequest {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

interface ApiResponse<T> {
  EC?: number;
  EM?: string;
  DT?: T;
}

interface OtpVerificationResponse {
  reset_token?: string;
}

interface StoredSession {
  authenticated: boolean;
  createdAt: number;
  expiresAt: number | null;
  remember: boolean;
}

const AUTH_SESSION_KEY = 'drPetAuthSession';
const REMEMBER_LOGIN_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = 'http://localhost:8080/api/v1';
  private readonly currentUserSignal = signal<User | null>(null);
  private readonly tokenSignal = signal<string | null>(null);

  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => Boolean(this.currentUserSignal()));

  constructor(private readonly http: HttpClient) {
    this.restoreSession();
  }

  loginPetClinic(credentials: { loginId: string; password: string; remember?: boolean }): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '69420',
    });

    return this.http.post<LoginResponse | ApiResponse<LoginResponse>>(
      `${this.baseUrl}/login`,
      {
        login_id: credentials.loginId.trim(),
        password: credentials.password,
        remember_me: Boolean(credentials.remember),
      },
      { headers, withCredentials: true },
    ).pipe(
      map((response) => {
        const result = this.unwrapResponse(response);
        if (!result?.access_token || !result?.user) {
          throw new Error('Máy chủ không trả về token hoặc thông tin người dùng hợp lệ.');
        }
        return { ...result, user: this.normalizeUser(result.user) };
      }),
      tap((response) => this.persistSession(response, Boolean(credentials.remember))),
      catchError((error) => throwError(() => this.toAuthError(error, 'Đăng nhập thất bại. Vui lòng thử lại.'))),
    );
  }

  /** Compatibility wrapper for components using the older login method. */
  login(credentials: { identifier: string; password: string; remember?: boolean }): Observable<LoginResponse> {
    return this.loginPetClinic({
      loginId: credentials.identifier,
      password: credentials.password,
      remember: credentials.remember,
    });
  }

  register(data: RegisterRequest): Observable<unknown> {
    return this.postAuthRequest('/register', {
      full_name: data.fullName.trim(),
      phone: data.phone.trim() || undefined,
      email: data.email.trim() || undefined,
      password: data.password,
    });
  }

  verifyRegisterOtp(data: { loginId: string; otpCode: string }): Observable<unknown> {
    return this.postAuthRequest('/verify-register-otp', {
      login_id: data.loginId.trim(),
      otp_code: data.otpCode.trim(),
    });
  }

  forgotPassword(email: string): Observable<unknown> {
    return this.postAuthRequest('/forgot-password', { email: email.trim() });
  }

  verifyForgotOtp(data: { email: string; otpCode: string }): Observable<OtpVerificationResponse> {
    return this.postAuthRequest<OtpVerificationResponse>('/verify-otp', {
      email: data.email.trim(),
      otp_code: data.otpCode.trim(),
    });
  }

  resetPassword(data: { resetToken: string; newPassword: string }): Observable<unknown> {
    return this.postAuthRequest('/reset-password', {
      reset_token: data.resetToken,
      new_password: data.newPassword,
    });
  }

  changePassword(data: { oldPassword: string; newPassword: string }): Observable<unknown> {
    return this.postAuthRequest('/change-password', {
      old_password: data.oldPassword,
      new_password: data.newPassword,
    });
  }

  /** Clears client-side credentials. The caller may separately invoke the backend logout endpoint. */
  logout(): void {
    this.clearSession();
  }

  logoutRemote(): Observable<unknown> {
    return this.postAuthRequest('/logout', {}).pipe(
      catchError((error) => {
        // Local logout must still be possible when the server is unreachable.
        return throwError(() => this.toAuthError(error, 'Không thể kết nối máy chủ để đăng xuất.'));
      }),
    );
  }

  updateCurrentUser(updates: Partial<User>): void {
    const current = this.currentUserSignal();
    if (!current) return;
    const updated = { ...current, ...updates };
    this.currentUserSignal.set(updated);
    const storage = this.getActiveStorage();
    if (storage.getItem('accessToken')) storage.setItem('userData', JSON.stringify(updated));
  }

  getAccessToken(): string | null {
    return this.tokenSignal() || this.safeStorageGet(localStorage, 'accessToken') || this.safeStorageGet(sessionStorage, 'accessToken');
  }

  private persistSession(response: LoginResponse, remember: boolean): void {
    this.clearSession();
    const storage = remember ? localStorage : sessionStorage;
    const session: StoredSession = {
      authenticated: true,
      createdAt: Date.now(),
      expiresAt: remember ? Date.now() + REMEMBER_LOGIN_MS : null,
      remember,
    };
    storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    storage.setItem('accessToken', response.access_token);
    storage.setItem('userData', JSON.stringify(response.user));
    this.tokenSignal.set(response.access_token);
    this.currentUserSignal.set(response.user);
  }

  private restoreSession(): void {
    for (const storage of [localStorage, sessionStorage]) {
      const token = this.safeStorageGet(storage, 'accessToken');
      const userData = this.safeStorageGet(storage, 'userData');
      const rawSession = this.safeStorageGet(storage, AUTH_SESSION_KEY);
      if (!token || !userData) {
        if (rawSession) this.removeSessionFrom(storage);
        continue;
      }
      try {
        const session = rawSession ? JSON.parse(rawSession) as StoredSession : null;
        if (session && (!session.authenticated || (session.expiresAt !== null && session.expiresAt <= Date.now()))) {
          this.removeSessionFrom(storage);
          continue;
        }
        const user = this.normalizeUser(JSON.parse(userData));
        if (!user.id && !user.email && !user.phone) {
          this.removeSessionFrom(storage);
          continue;
        }
        this.tokenSignal.set(token);
        this.currentUserSignal.set(user);
        return;
      } catch {
        this.removeSessionFrom(storage);
      }
    }
  }

  private clearSession(): void {
    this.removeSessionFrom(localStorage);
    this.removeSessionFrom(sessionStorage);
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
  }

  private removeSessionFrom(storage: Storage): void {
    storage.removeItem(AUTH_SESSION_KEY);
    storage.removeItem('accessToken');
    storage.removeItem('access_token');
    storage.removeItem('userData');
    storage.removeItem('isAuthenticated');
  }

  private getActiveStorage(): Storage {
    return localStorage.getItem('accessToken') ? localStorage : sessionStorage;
  }

  private safeStorageGet(storage: Storage, key: string): string | null {
    try { return storage.getItem(key); } catch { return null; }
  }

  refreshAccessToken(): Observable<string> {
    return this.http.post<LoginResponse | ApiResponse<LoginResponse> | { access_token?: string; DT?: { access_token?: string } }>(
      `${this.baseUrl}/refresh`,
      {},
      { withCredentials: true },
    ).pipe(
      map((response: any) => {
        const payload = response && typeof response === 'object' && 'DT' in response ? response.DT : response;
        const token = payload?.access_token;
        if (!token) throw new Error('Không thể làm mới phiên đăng nhập.');
        return String(token);
      }),
      tap((token) => {
        this.tokenSignal.set(token);
        const storage = this.getActiveStorage();
        storage.setItem('accessToken', token);
      }),
      catchError((error) => throwError(() => this.toAuthError(error, 'Phiên đăng nhập đã hết hạn.'))),
    );
  }

  private postAuthRequest<T = unknown>(path: string, body: object): Observable<T> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '69420',
    });
    return this.http.post<T | ApiResponse<T>>(`${this.baseUrl}${path}`, body, {
      headers,
      withCredentials: true,
    }).pipe(
      map((response) => this.unwrapResponse(response)),
      catchError((error) => throwError(() => this.toAuthError(error, 'Yêu cầu xác thực thất bại.'))),
    );
  }

  private normalizeUser(value: unknown): User {
    const user = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const role = String(user['systemRole'] ?? user['role_code'] ?? user['roleCode'] ?? user['role'] ?? '').toUpperCase();
    return {
      id: String(user['id'] ?? user['user_id'] ?? user['userId'] ?? ''),
      fullName: String(user['fullName'] ?? user['full_name'] ?? ''),
      email: String(user['email'] ?? ''),
      phone: String(user['phone'] ?? ''),
      systemRole: role.includes('ADMIN') ? 'ADMIN' : 'USER',
    };
  }

  private unwrapResponse<T>(response: T | ApiResponse<T>): T {
    if (response && typeof response === 'object' && 'EC' in response && response.EC !== undefined && response.EC !== 0) {
      throw new Error(response.EM || 'Yêu cầu không thành công.');
    }
    if (response && typeof response === 'object' && 'DT' in response && response.DT !== undefined) {
      return response.DT;
    }
    return response as T;
  }

  private toAuthError(error: any, fallback: string): Error {
    return new Error(error?.error?.EM || error?.error?.message || error?.message || fallback);
  }
}
