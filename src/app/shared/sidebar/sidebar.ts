import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth-service';

interface SidebarMenuItem {
  label: string;
  path: string;
  icon: 'user' | 'paw' | 'calendar' | 'shopping';
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent {
  readonly menuItems: SidebarMenuItem[] = [
    { label: 'Thông tin người dùng', path: '/thong-tin-nguoi-dung', icon: 'user' },
    { label: 'Quản lý thú cưng', path: '/thu-cung-cua-toi', icon: 'paw' },
    { label: 'Lịch sử đặt lịch', path: '/lich-su-dat-lich', icon: 'calendar' },
    { label: 'Đơn hàng của tôi', path: '/don-hang-cua-toi', icon: 'shopping' },
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/');
  }
}
