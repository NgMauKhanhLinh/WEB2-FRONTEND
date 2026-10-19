import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { NotificationBellComponent } from '../notification-bell/notification-bell';

interface NavbarLink {
  label: string;
  path: string;
  category?: string;
  children?: NavbarLink[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, NotificationBellComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly currentUser = this.auth.currentUser;
  readonly logo = '/assets/images/home/logo.png';
  readonly avatar = '/assets/images/navbar/avatar.png';
  readonly links: NavbarLink[] = [
    { label: 'Trang chủ', path: '/' },
    {
      label: 'Dịch vụ',
      path: '/dich-vu',
      children: [
        { label: 'Khám & Điều trị', path: '/dich-vu/kham-dieu-tri' },
        { label: 'Grooming & Spa', path: '/dich-vu/grooming-spa' },
      ],
    },
    {
      label: 'Mua sắm',
      path: '/cua-hang',
      children: [
        { label: 'Thức ăn', path: '/san-pham', category: 'Thức ăn' },
        { label: 'Đồ dùng thiết yếu', path: '/san-pham', category: 'Đồ dùng thiết yếu' },
        { label: 'Chăm sóc sức khỏe', path: '/san-pham', category: 'Chăm sóc sức khỏe' },
        { label: 'Đồ chơi', path: '/san-pham', category: 'Đồ chơi' },
        { label: 'Phụ kiện', path: '/san-pham', category: 'Phụ kiện' },
      ],
    },
    {
      label: 'Blog',
      path: '/blog',
      children: [
        { label: 'Kiến thức thú cưng', path: '/blog' },
        { label: 'Cộng đồng chia sẻ', path: '/blog/cong-dong' },
        { label: 'Cẩm nang sơ cứu', path: '/blog/so-cuu' },
      ],
    },
    { label: 'Cứu trợ', path: '/cuu-tro' },
    { label: 'Về chúng tôi', path: '/ve-chung-toi' },
    { label: 'Liên hệ', path: '/lien-he' },
  ];
  readonly accountLinks: NavbarLink[] = [
    { label: 'Thông tin người dùng', path: '/thong-tin-nguoi-dung' },
    { label: 'Quản lý thú cưng', path: '/thu-cung-cua-toi' },
    { label: 'Lịch sử đặt lịch', path: '/lich-su-dat-lich' },
    { label: 'Đơn hàng của tôi', path: '/don-hang-cua-toi' },
  ];
  readonly searchTerms = [
    'Khám và điều trị',
    'Grooming & Spa',
    'Thức ăn',
    'Đồ dùng thiết yếu',
    'Chăm sóc sức khỏe',
    'Đồ chơi',
    'Phụ kiện',
    'Cẩm nang sơ cứu',
  ];

  searchTerm = '';
  searchOpen = false;
  mobileMenuOpen = false;
  accountMenuOpen = false;
  expandedMenu = '';

  get filteredSearchTerms(): string[] {
    const query = this.searchTerm.trim().toLocaleLowerCase('vi');
    if (!query) return [];
    return this.searchTerms.filter((term) => term.toLocaleLowerCase('vi').includes(query)).slice(0, 5);
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closeOverlays();
  }

  submitSearch(term = this.searchTerm): void {
    const query = term.trim();
    this.closeOverlays();
    void this.router.navigate(['/search'], query ? { queryParams: { q: query } } : {});
  }

  toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
    this.mobileMenuOpen = false;
    this.accountMenuOpen = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.searchOpen = false;
    this.accountMenuOpen = false;
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen = !this.accountMenuOpen;
    this.mobileMenuOpen = false;
  }

  toggleExpandedMenu(label: string): void {
    this.expandedMenu = this.expandedMenu === label ? '' : label;
  }

  navigateCategory(category: string): void {
    this.closeOverlays();
    void this.router.navigate(['/san-pham'], { queryParams: { category } });
  }

  logout(): void {
    this.closeOverlays();
    this.auth.logoutRemote().subscribe({ error: () => undefined });
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }

  closeOverlays(): void {
    this.searchOpen = false;
    this.mobileMenuOpen = false;
    this.accountMenuOpen = false;
    this.expandedMenu = '';
  }

  isCategoryLink(link: NavbarLink): boolean {
    return Boolean(link.category);
  }

  categoryFor(link: NavbarLink): string {
    return link.category ?? '';
  }
}
