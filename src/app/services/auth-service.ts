import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, delay, map, of, tap, throwError } from 'rxjs';

// Định nghĩa kiểu dữ liệu User trả về từ Backend
export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  systemRole: 'ADMIN' | 'USER';
}

// Định nghĩa dữ liệu trả về từ API Login thành công
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

const AUTH_SESSION_KEY = 'drPetAuthSession';
const REMEMBER_LOGIN_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable({
  providedIn: 'root' // Service này có thể inject ở bất cứ đâu trong dự án
})
export class AuthService {
  // Base URL khớp với cấu hình chạy trên cùng máy (Localhost) của backend
  private readonly baseUrl = 'http://localhost:8080/api/v1';

  // Quản lý trạng thái đăng nhập toàn cục bằng Angular Signal (Thay thế cho useAuth Context của React)
  private readonly currentUserSignal = signal<User | null>(null);
  private readonly tokenSignal = signal<string | null>(null);

  // Expose các giá trị ra ngoài dưới dạng Read-Only Signals để các Component lắng nghe giao diện công khai
  currentUser = computed(() => this.currentUserSignal());
  isAuthenticated = computed(() => !!this.currentUserSignal());

  constructor(private readonly http: HttpClient) {
    // Tự động kiểm tra lại trạng thái đăng nhập từ LocalStorage khi khởi tạo ứng dụng
    this.autoLogin();
  }

  /**
   * Hàm gọi API Đăng nhập (POST /api/v1/auth/login)
   * @param credentials chứa identifier (SĐT/Email) và password
   */
  login(credentials: { identifier: string; password: string; remember?: boolean }): Observable<LoginResponse> {
    const url = `${this.baseUrl}/auth/login`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<LoginResponse>(url, credentials, { headers }).pipe(
      map((response) => this.unwrapResponse(response)),
      tap((response) => {
        // Cập nhật trạng thái local state nội bộ thông qua Signal
        this.tokenSignal.set(response.access_token);
        this.currentUserSignal.set(response.user);

        // Lưu thông tin đăng nhập nếu người dùng chọn "Ghi nhớ đăng nhập" (Remember me)
        if (credentials.remember) {
          localStorage.setItem('accessToken', response.access_token);
          localStorage.setItem('userData', JSON.stringify(response.user));
        }
      }),
      catchError((error) => {
        // Xử lý và ném lỗi từ Backend (ví dụ: Sai mật khẩu, Tài khoản không tồn tại) về cho Component hứng
        const errorMessage = error?.error?.EM || error?.error?.message || error?.message || 'Đăng nhập thất bại. Vui lòng thử lại!';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // loginPetClinic(credentials: { loginId: string; password: string; remember?: boolean }): Observable<LoginResponse> {
  //   const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  //   return this.http.post<LoginResponse | ApiResponse<LoginResponse>>(`${this.baseUrl}/login`, {
  //     login_id: credentials.loginId,
  //     password: credentials.password,
  //     remember_me: credentials.remember ?? false,
  //   }, { headers }).pipe(
  //     map((response) => {
  //       const unwrapped = this.unwrapResponse(response);
  //       return { ...unwrapped, user: this.normalizeUser(unwrapped.user) };
  //     }),
  //     tap((response) => {
  //       this.persistPetClinicLogin(response, Boolean(credentials.remember));
  //     }),
  //     catchError((error) => {
  //       const errorMessage = error?.error?.EM || error?.error?.message || error?.message || 'Đăng nhập thất bại. Vui lòng thử lại!';
  //       return throwError(() => new Error(errorMessage));
  //     })
  //   );
  // }
    loginPetClinic(credentials: { loginId: string; password: string; remember?: boolean }): Observable<LoginResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    
    // ================= BẮT ĐẦU ĐOẠN MOCK TÀI KHOẢN ADMIN ĐỂ KIỂM THỬ =================
    const inputId = String(credentials.loginId ?? '').trim();
    const inputPassword = String(credentials.password ?? '');

    // Nếu nhập đúng tài khoản kiểm thử này, hệ thống tự động xử lý offline
    if (inputId === 'admin@test.com' && inputPassword === 'admin123') {
      
      // 1. Tạo dữ liệu Admin giả lập khớp cấu trúc Interface hệ thống yêu cầu
      const mockAdminResponse: LoginResponse = {
        access_token: 'mock-jwt-token-petclinic-admin-2026',
        user: {
          id: 'admin-uuid-1111-2222',
          fullName: 'Quản trị viên Hệ thống',
          email: 'admin@test.com',
          phone: '0987654321',
          systemRole: 'ADMIN' // Gắn quyền ADMIN cho giao diện kiểm tra
        }
      };

      // 2. Kích hoạt lưu trữ Session & Signals y hệt luồng đăng nhập thật thành công
      this.persistPetClinicLogin(mockAdminResponse, Boolean(credentials.remember));

      // 3. Trả về Observable thành công kèm độ trễ mạng giả lập 300ms (Không gọi API thật nữa)
      return of(mockAdminResponse).pipe(delay(300));
    }
    // ================= END MOCK CODE ===============================================

    // Giữ nguyên luồng gọi HTTP thật phía dưới dành cho các tài khoản khác khi nối API backend sau này
    return this.http.post<LoginResponse | ApiResponse<LoginResponse>>(`${this.baseUrl}/login`, {
      login_id: credentials.loginId,
      password: credentials.password,
      remember_me: credentials.remember ?? false,
    }, { headers }).pipe(
      map((response) => {
        const unwrapped = this.unwrapResponse(response);
        return { ...unwrapped, user: this.normalizeUser(unwrapped.user) };
      }),
      tap((response) => {
        this.persistPetClinicLogin(response, Boolean(credentials.remember));
      }),
      catchError((error) => {
        const errorMessage = error?.error?.EM || error?.error?.message || error?.message || 'Đăng nhập thất bại. Vui lòng thử lại!';
        return throwError(() => new Error(errorMessage));
      })
    );
  }


  register(data: RegisterRequest): Observable<unknown> {
    return this.postAuthRequest('/register', {
      full_name: data.fullName,
      phone: data.phone || undefined,
      email: data.email || undefined,
      password: data.password,
    });
  }

  verifyRegisterOtp(data: { loginId: string; otpCode: string }): Observable<unknown> {
    return this.postAuthRequest('/verify-register-otp', {
      login_id: data.loginId,
      otp_code: data.otpCode,
    });
  }

  forgotPassword(email: string): Observable<unknown> {
    return this.postAuthRequest('/forgot-password', { email });
  }

  verifyForgotOtp(data: { email: string; otpCode: string }): Observable<OtpVerificationResponse> {
    return this.postAuthRequest<OtpVerificationResponse>('/verify-otp', {
      email: data.email,
      otp_code: data.otpCode,
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

  updateCurrentUser(updates: Partial<User>): void {
    const currentUser = this.currentUserSignal();
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updates };
    this.currentUserSignal.set(updatedUser);
    const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;
    if (storage.getItem('accessToken')) {
      storage.setItem('userData', JSON.stringify(updatedUser));
    }
  }

  /**
   * Hàm Đăng xuất - Xóa sạch trạng thái và bộ nhớ cache trình duyệt
   */
  logout(): void {
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(AUTH_SESSION_KEY);
      storage.removeItem('accessToken');
      storage.removeItem('userData');
      storage.removeItem('isAuthenticated');
    }
  }

  /**
   * Hàm tự động khôi phục phiên đăng nhập khi F5 lại trang web
   */
  private autoLogin(): void {
    for (const storage of [localStorage, sessionStorage]) {
      const savedSession = storage.getItem(AUTH_SESSION_KEY);
      const savedToken = storage.getItem('accessToken');
      const savedUser = storage.getItem('userData');

      if (savedSession) {
        const session = JSON.parse(savedSession) as { authenticated?: boolean; expiresAt?: number | null };
        if (!session.authenticated || (session.expiresAt && session.expiresAt <= Date.now())) {
          storage.removeItem(AUTH_SESSION_KEY);
          storage.removeItem('accessToken');
          storage.removeItem('userData');
          continue;
        }
      }

      if (savedToken && savedUser) {
        this.tokenSignal.set(savedToken);
        this.currentUserSignal.set(this.normalizeUser(JSON.parse(savedUser)));
        return;
      }
    }
  }

  /**
   * Hàm lấy Token hiện tại phục vụ cho việc đính kèm vào các API cần quyền bảo mật (Interceptor)
   */
  getAccessToken(): string | null {
    return this.tokenSignal() || localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  }

  private persistPetClinicLogin(response: LoginResponse, remember: boolean): void {
    this.tokenSignal.set(response.access_token);
    this.currentUserSignal.set(response.user);

    const storage = remember ? localStorage : sessionStorage;
    for (const candidate of [localStorage, sessionStorage]) {
      candidate.removeItem(AUTH_SESSION_KEY);
      candidate.removeItem('accessToken');
      candidate.removeItem('userData');
      candidate.removeItem('isAuthenticated');
    }

    storage.setItem(AUTH_SESSION_KEY, JSON.stringify({
      authenticated: true,
      createdAt: Date.now(),
      expiresAt: remember ? Date.now() + REMEMBER_LOGIN_MS : null,
      remember,
    }));
    storage.setItem('accessToken', response.access_token);
    storage.setItem('userData', JSON.stringify(response.user));
  }

  private postAuthRequest<T = unknown>(path: string, body: object): Observable<T> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<T | ApiResponse<T>>(`${this.baseUrl}${path}`, body, { headers }).pipe(
      map((response) => this.unwrapResponse(response)),
      catchError((error) => {
        const errorMessage = error?.error?.EM || error?.error?.message || error?.message || 'Yêu cầu xác thực thất bại.';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  private normalizeUser(value: unknown): User {
    const user = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return {
      id: String(user['id'] ?? user['user_id'] ?? user['userId'] ?? ''),
      fullName: String(user['fullName'] ?? user['full_name'] ?? ''),
      email: String(user['email'] ?? ''),
      phone: String(user['phone'] ?? ''),
      systemRole: user['systemRole'] === 'ADMIN' || user['role_code'] === 'ADMIN' ? 'ADMIN' : 'USER',
    };
  }

  private unwrapResponse<T>(response: T | ApiResponse<T>): T {
    if (
      response &&
      typeof response === 'object' &&
      'EC' in response &&
      response.EC !== undefined &&
      response.EC !== 0
    ) {
      throw new Error(response.EM || 'Yêu cầu xác thực thất bại.');
    }

    if (response && typeof response === 'object' && 'DT' in response && response.DT !== undefined) {
      return response.DT;
    }

    return response as T;
  }
}
