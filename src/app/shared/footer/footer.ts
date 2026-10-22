import { Component, DestroyRef, computed, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ServicePricingComponent } from '../service-pricing/service-pricing';

interface FooterLink {
  label: string;
  path: string;
}

interface FooterSection {
  id: string;
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, ServicePricingComponent],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
  readonly sections: FooterSection[] = [
    {
      id: 'quick',
      title: 'Liên kết nhanh',
      links: [
        { label: 'Trang chủ', path: '/' },
        { label: 'Bảng giá dịch vụ', path: '/dich-vu/grooming-spa' },
        { label: 'Mua sắm', path: '/cua-hang' },
        { label: 'Lịch sử đơn hàng', path: '/don-hang-cua-toi' },
        { label: 'Hồ sơ thú cưng', path: '/thu-cung-cua-toi' },
        { label: 'Lịch sử đặt lịch', path: '/lich-su-dat-lich' },
        { label: 'Thông tin cứu trợ', path: '/cuu-tro' },
      ],
    },
    {
      id: 'services',
      title: 'Dịch vụ nổi bật',
      links: [
        { label: 'Khám & Điều trị', path: '/dich-vu/kham-dieu-tri' },
        { label: 'Grooming & Spa', path: '/dich-vu/grooming-spa' },
        { label: 'Mua sắm sản phẩm', path: '/cua-hang' },
      ],
    },
    {
      id: 'general',
      title: 'Thông tin chung',
      links: [
        { label: 'Về chúng tôi', path: '/ve-chung-toi' },
        { label: 'Liên hệ', path: '/lien-he' },
        { label: 'Danh sách chi nhánh', path: '/lien-he#branches' },
      ],
    },
    {
      id: 'support',
      title: 'Hỗ trợ khách hàng',
      links: [
        {
          label: 'Chính sách đặt lịch, đổi lịch & hủy lịch',
          path: '/policies/dat-lich-doi-huy-lich',
        },
        { label: 'Chính sách vận chuyển', path: '/policies/van-chuyen' },
        { label: 'Chính sách đổi/trả hàng', path: '/policies/doi-tra-hang' },
        { label: 'Chính sách thanh toán', path: '/policies/phuong-thuc-thanh-toan' },
        { label: 'Chính sách bán hàng', path: '/policies/huong-dan-mua-hang' },
        { label: 'Chính sách bảo mật', path: '/policies/bao-mat' },
      ],
    },
    {
      id: 'legal',
      title: 'Thông tin pháp lý',
      links: [
        { label: 'Chính sách bảo mật', path: '/policies/bao-mat' },
        { label: 'Điều khoản dịch vụ', path: '/policies/dieu-khoan-dich-vu' },
        { label: 'Cài đặt cookie', path: '/policies/cookie' },
      ],
    },
  ];

  openSection = '';
  readonly isPricingOpen = signal(false);
  private readonly currentUrl = signal('/');
  readonly variant = computed(() => {
    const path = this.currentUrl().split(/[?#]/, 1)[0];
    if (
      /^\/(thong-tin-nguoi-dung|thu-cung-cua-toi|lich-su-dat-lich|don-hang-cua-toi)(\/|$)/.test(
        path,
      )
    ) {
      return 'account';
    }
    if (
      /^\/(policies|lien-he|contact|blog|bai-viet|cuu-tro|search|san-pham|product-details)(\/|$)/.test(
        path,
      )
    ) {
      return 'white';
    }
    return 'blue';
  });

  constructor(
    private readonly router: Router,
    destroyRef: DestroyRef,
  ) {
    this.currentUrl.set(router.url);
    router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }

  toggleSection(id: string): void {
    this.openSection = this.openSection === id ? '' : id;
  }

  navigateToPricing(): void {
    this.isPricingOpen.set(true);
  }
}
