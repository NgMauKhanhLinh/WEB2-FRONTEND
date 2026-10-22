import { Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface GallerySlide {
  title: string;
  images: string[];
  paragraphs: string[];
  grid?: boolean;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePageComponent {
  readonly benefits = [
    { label: 'Đội ngũ có tay nghề cao', icon: 'commitment-icon-team.png' },
    { label: 'Bác sĩ giàu kinh nghiệm', icon: 'commitment-icon-doctor.png' },
    { label: 'Sản phẩm xuất xứ rõ ràng', icon: 'commitment-icon-food.png' },
    { label: 'Thực phẩm chất lượng', icon: 'commitment-icon-treats.png' },
    { label: 'Tư vấn tận tình', icon: 'commitment-icon-house.png' },
    { label: 'Cấp cứu khẩn cấp', icon: 'commitment-icon-emergency.png' },
  ];

  readonly milestones = [
    {
      year: '2020',
      image: 'timeline2020.png',
      copy: 'Thành lập từ một cửa hàng cung cấp dịch vụ khám chữa bệnh cho thú cưng, với thiết bị hiện đại và đội ngũ bác sĩ giàu kinh nghiệm.',
    },
    {
      year: '2021',
      image: 'timeline2021.png',
      copy: 'Mở rộng sang các sản phẩm dành cho thú cưng và phát triển thêm nhiều điểm chăm sóc để phục vụ khách hàng.',
    },
    {
      year: '2023',
      image: 'timeline2023.png',
      copy: 'Bổ sung dịch vụ Spa & Grooming, mang đến giải pháp chăm sóc toàn diện và không ngừng mở rộng hệ thống.',
    },
    {
      year: '2026',
      image: 'timeline2026.png',
      copy: 'Hệ thống Dr. Pet’s House tiếp tục phát triển với 10 chi nhánh và hơn 10.000 ca chữa bệnh thành công.',
    },
  ];

  readonly services = [
    {
      title: 'KHÁM & ĐIỀU TRỊ',
      image: 'service-medical.png',
      href: '/dat-lich',
      copy: 'Đội ngũ bác sĩ thú y giàu kinh nghiệm cung cấp dịch vụ từ kiểm tra sức khỏe định kỳ đến phẫu thuật chuyên sâu, đảm bảo thú cưng của bạn luôn trong trạng thái tốt nhất.',
      points: [
        'Tiêm phòng và tẩy giun định kỳ',
        'Chẩn đoán hình ảnh siêu âm, X-quang',
        'Xét nghiệm máu và vi sinh',
      ],
    },
    {
      title: 'GROOMING & SPA',
      image: 'service-grooming.png',
      href: '/dich-vu/grooming-spa',
      copy: 'Giúp thú cưng luôn sạch sẽ và xinh xắn với dịch vụ làm đẹp chuyên nghiệp, sử dụng sản phẩm an toàn cho làn da nhạy cảm.',
      points: [
        'Tắm, sấy và vệ sinh tai móng',
        'Cắt tỉa lông tạo kiểu chuyên nghiệp',
        'Massage thư giãn cho thú cưng',
      ],
    },
    {
      title: 'PET SHOP',
      image: 'service-shop.png',
      href: '/cua-hang',
      copy: 'Cung cấp nhu yếu phẩm chất lượng cao từ thức ăn dinh dưỡng, phụ kiện đến đồ chơi thông minh dành riêng cho chó và mèo.',
      points: [
        'Thức ăn hạt và Pate nhập khẩu',
        'Phụ kiện vòng cổ, chuồng và nệm',
        'Vitamin và thực phẩm chức năng',
      ],
    },
  ];

  readonly galleries: GallerySlide[] = [
    {
      title: 'Khu vực tiền sảnh và quầy lễ tân',
      images: ['lobby-main.png', 'lobby-thumb1.png', 'lobby-thumb2.png', 'lobby-thumb3.png'].map(
        (name) => this.image(name),
      ),
      paragraphs: [
        'Dr. Pet’s House mang đến trải nghiệm chăm sóc cao cấp với mức giá hợp lý.',
        'Sảnh đón tiếp rộng rãi, thoáng mát và quầy lễ tân luôn sẵn sàng hỗ trợ làm thủ tục nhanh chóng.',
        'Bạn có thể thư giãn tại khu vực chờ trong khi đội ngũ chăm sóc các bé.',
      ],
    },
    {
      title: 'Không gian mua sắm tiện lợi',
      images: ['shop-main.png', 'shop-thumb-1.png', 'shop-thumb-2.png', 'shop-thumb-3.png'].map(
        (name) => this.figma(name),
      ),
      paragraphs: [
        'Không gian mua sắm được phân khu khoa học, giúp bạn dễ dàng tìm sản phẩm phù hợp.',
        'Các mặt hàng được cập nhật thường xuyên và đội ngũ nhân viên luôn sẵn sàng tư vấn tận tình.',
      ],
    },
    {
      title: 'Không gian spa thư giãn',
      images: ['spa-main.png', 'spa-thumb-1.png', 'spa-thumb-2.png', 'spa-thumb-3.png'].map(
        (name) => this.figma(name),
      ),
      paragraphs: [
        'Khu vực Spa & Grooming được thiết kế để thú cưng cảm thấy bình tĩnh và thoải mái.',
        'Không gian sạch sẽ, thoáng mát và mỗi bé đều được chăm sóc riêng.',
      ],
    },
    {
      title: 'Không gian khám bệnh chuyên nghiệp',
      images: [
        'clinic-main.png',
        'clinic-thumb-1.png',
        'clinic-thumb-2.png',
        'clinic-thumb-3.png',
      ].map((name) => this.figma(name)),
      paragraphs: [
        'Không gian khám và điều trị được vệ sinh nghiêm ngặt, hạn chế nguy cơ lây nhiễm chéo.',
        'Trang thiết bị hiện đại giúp bác sĩ chẩn đoán chính xác và tư vấn phác đồ phù hợp.',
      ],
    },
    {
      title: '9 chi nhánh khác',
      images: Array.from({ length: 9 }, (_, index) => this.figma(`branch-${index + 1}.png`)),
      paragraphs: [
        'Đến năm 2026, hệ thống Dr. Pet’s House đã phát triển với 10 chi nhánh tại TP. Hồ Chí Minh và các khu vực lân cận.',
        'Chúng tôi trân trọng sự tin tưởng, đồng hành của khách hàng trong hành trình chăm sóc thú cưng.',
      ],
      grid: true,
    },
  ];

  readonly doctors = [
    {
      name: 'Bs. Trần Văn Nhân',
      role: 'Kinh nghiệm 20 năm',
      school: 'Tốt nghiệp Trường Đại Học Nông Lâm, ĐHQG TPHCM',
      image: 'doctor-1.png',
    },
    {
      name: 'Bs. Võ Công Nam',
      role: 'Kinh nghiệm 14 năm',
      school: 'Tốt nghiệp Trường Đại Học Nông Lâm, ĐHQG TPHCM',
      image: 'doctor-2.png',
    },
    {
      name: 'Bs. Nguyễn Thu Hồng',
      role: 'Kinh nghiệm 5 năm',
      school: 'Tốt nghiệp Trường Đại học Công Nghệ TPHCM',
      image: 'doctor-3.png',
    },
    {
      name: 'Bs. Trần Phương Trâm',
      role: 'Kinh nghiệm 7 năm',
      school: 'Tốt nghiệp Trường Đại Học Nông Lâm, ĐHQG TPHCM',
      image: 'doctor-4.png',
    },
    {
      name: 'Bs. Đỗ Nhất Tâm',
      role: 'Kinh nghiệm 7 năm',
      school: 'Tốt nghiệp Trường Đại Học Nông Lâm, ĐHQG TPHCM',
      image: 'doctor-5.png',
    },
    {
      name: 'Bs. Huỳnh Gia Khánh',
      role: 'Kinh nghiệm 7 năm',
      school: 'Tốt nghiệp Trường Đại học Công Nghệ TPHCM',
      image: 'doctor-6.png',
    },
    {
      name: 'Bs. Nguyễn Phương Nhi',
      role: 'Kinh nghiệm 5 năm',
      school: 'Tốt nghiệp Trường Đại học Công Nghệ TPHCM',
      image: 'doctor-7.png',
    },
    {
      name: 'Bs. Nguyễn Minh Anh',
      role: 'Kinh nghiệm 10 năm',
      school: 'Tốt nghiệp Trường Đại Học Nông Lâm, ĐHQG TPHCM',
      image: 'doctor-8.png',
    },
  ];

  readonly testimonials = [
    {
      quote: 'Đội ngũ bác sĩ tận tình, giải thích rõ ràng và chăm sóc bé rất chu đáo.',
      name: 'Khách hàng Dr. Pet',
    },
    {
      quote: 'Không gian sạch sẽ, dịch vụ chuyên nghiệp. Tôi luôn yên tâm khi đưa bé đến khám.',
      name: 'Gia đình Bông',
    },
    {
      quote: 'Bé được chăm sóc nhẹ nhàng, nhân viên thân thiện và tư vấn rất hữu ích.',
      name: 'Gia đình Miu',
    },
  ];

  readonly activeGalleryIndex = signal(0);
  readonly doctorPage = signal(0);
  readonly previewImageIndex = signal<number | null>(null);

  get activeGallery(): GallerySlide {
    return this.galleries[this.activeGalleryIndex()];
  }

  get visibleDoctors() {
    const page = this.doctorPage();
    return this.doctors.slice(page * 4, page * 4 + 4);
  }

  get previewImage(): string | null {
    const index = this.previewImageIndex();
    if (index === null) return null;
    return this.activeGallery.images[index] ?? null;
  }

  moveGallery(direction: number): void {
    this.activeGalleryIndex.update(
      (index) => (index + direction + this.galleries.length) % this.galleries.length,
    );
    this.previewImageIndex.set(null);
  }

  moveDoctorPage(direction: number): void {
    const pages = Math.ceil(this.doctors.length / 4);
    this.doctorPage.update((page) => (page + direction + pages) % pages);
  }

  openPreview(index: number): void {
    this.previewImageIndex.set(index);
  }

  movePreview(direction: number): void {
    const index = this.previewImageIndex();
    if (index === null) return;
    const length = this.activeGallery.images.length;
    this.previewImageIndex.set((index + direction + length) % length);
  }

  closePreview(): void {
    this.previewImageIndex.set(null);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (this.previewImageIndex() === null) return;
    if (event.key === 'Escape') this.closePreview();
    if (event.key === 'ArrowLeft') this.movePreview(-1);
    if (event.key === 'ArrowRight') this.movePreview(1);
  }

  image(name: string): string {
    return `/assets/images/about/${name}`;
  }

  figma(name: string): string {
    return `/assets/images/about/figma/${name}`;
  }
}
