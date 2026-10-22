import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertComponent, AlertType } from '../shared/alert/alert';
import { SidebarComponent } from '../shared/sidebar/sidebar';
import { ContactBranch, ContactService } from '../services/contact-service';
import { AuthService } from '../services/auth-service';
import { AdoptionPartner, AdoptionPet, AdoptionRequest, ProductReview, SearchResult, StorefrontService } from '../services/storefront-service';
import { AppointmentHistoryItem, AppointmentSlot, BookingService, BookingServiceOption, PetSpecies } from '../services/booking-service';
import { OrderRecord, OrderService } from '../services/order-service';
import { UserAddressRecord, UserProfileService } from '../services/user-profile-service';

type PageKind =
  | 'home' | 'generic' | 'about' | 'contact' | 'policy' | 'medical' | 'grooming'
  | 'shop' | 'products' | 'product' | 'review' | 'cart' | 'checkout' | 'booking'
  | 'blog' | 'blog-detail' | 'first-aid' | 'first-aid-detail' | 'community' | 'rescue' | 'search'
  | 'profile' | 'pets' | 'pet-detail' | 'pet-form' | 'appointments' | 'orders'
  | 'order-detail' | 'not-found';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  rating: number;
  description: string;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface ServiceCard {
  title: string;
  text: string;
  image: string;
  link: string;
}

@Component({
  selector: 'app-pet-clinic-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent, SidebarComponent],
  templateUrl: './pet-clinic-page.html',
  styleUrls: ['./pet-clinic-page.css', './pet-clinic-page-extra.css'],
})
export class PetClinicPageComponent {
  private bookingSlotRequestId = 0;
  private pendingRebook: { petName: string; services: { serviceId: string; serviceType: 'clinic' | 'grooming' }[] } | null = null;
  title = 'Dr. Pet’s House';
  summary = 'Chăm sóc toàn diện cho những người bạn bốn chân.';
  isHome = false;
  pageKind: PageKind = 'home';
  searchQuery = '';
  selectedCategory = 'all';
  cartQuantity = 1;
  readonly cartItems = signal<CartItem[]>(this.loadStoredCart());
  readonly cartSubtotal = computed(() => this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0));
  bookingStep = 1;
  selectedService = '';
  selectedServiceId = '';
  readonly selectedServiceIds = signal<string[]>([]);
  readonly selectedBookingServiceType = signal<'clinic' | 'grooming'>('clinic');
  selectedDate = '';
  selectedTime = '';
  selectedSlotId = '';
  readonly minBookingDate = new Date().toISOString().slice(0, 10);
  readonly bookingServices = signal<BookingServiceOption[]>([]);
  readonly bookingServicesLoading = signal(false);
  readonly bookingServicesError = signal('');
  readonly bookingSlots = signal<AppointmentSlot[]>([]);
  readonly bookingSlotsLoading = signal(false);
  readonly bookingSlotsError = signal('');
  readonly bookingSpecies = signal<PetSpecies[]>([]);
  readonly bookingSpeciesError = signal('');
  readonly bookingSubmitting = signal(false);
  readonly bookingSuccess = signal(false);
  readonly bookingForm = { petName: '', speciesId: '', customerName: '', phone: '', notes: '' };
  bookingPaymentMethod: 'store' | 'online' = 'store';
  readonly appointments = signal<AppointmentHistoryItem[]>([]);
  readonly appointmentsLoading = signal(false);
  readonly appointmentsError = signal('');
  readonly appointmentFilters = [
    { value: 'all', label: 'Tất cả' },
    { value: 'pending_payment', label: 'Chờ thanh toán' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
    { value: 'no_show', label: 'Không đến' },
  ];
  readonly appointmentFilter = signal('all');
  appointmentSearchInput = '';
  readonly appointmentSearchQuery = signal('');
  readonly appointmentSortOrder = signal<'newest' | 'oldest'>('newest');
  readonly appointmentActionLoadingId = signal('');
  readonly appointmentActionMessage = signal<{ type: AlertType; text: string } | null>(null);
  readonly reviewAppointmentId = signal('');
  reviewRating = 0;
  reviewComment = '';
  readonly checkoutForm = { fullName: '', email: '', phone: '', address: '', ward: '', district: '', city: '' };
  checkoutNote = '';
  checkoutPaymentMethod = 'cod';
  checkoutOnlineProvider = 'vnpay';
  checkoutCoupon = '';
  readonly checkoutDiscount = signal(0);
  readonly checkoutCouponError = signal('');
  readonly checkoutCouponMessage = signal('');
  readonly checkoutSubmitting = signal(false);
  readonly checkoutError = signal('');
  readonly checkoutSuccess = signal<{ id: string; code: string } | null>(null);
  readonly checkoutAddresses = signal<UserAddressRecord[]>([]);
  readonly checkoutAddressId = signal('');
  readonly checkoutAddressesLoading = signal(false);
  readonly checkoutAddressesError = signal('');
  readonly orders = signal<OrderRecord[]>([]);
  readonly ordersLoading = signal(false);
  readonly ordersError = signal('');
  readonly selectedOrder = signal<OrderRecord | null>(null);
  readonly orderDetailLoading = signal(false);
  readonly orderDetailError = signal('');
  notice = '';
  noticeType: AlertType = 'success';
  contactForm = { name: '', gender: '', phone: '', email: '', message: '' };
  readonly contactSubmitting = signal(false);
  readonly contactSubmitted = signal(false);
  readonly contactError = signal('');
  readonly branchQuery = signal('');
  readonly branches = signal<ContactBranch[]>([]);
  readonly selectedBranchId = signal('');
  readonly branchesLoading = signal(false);
  readonly branchesError = signal('');
  readonly productsLoading = signal(false);
  readonly productsError = signal('');
  readonly productReviews = signal<ProductReview[]>([]);
  readonly reviewsLoading = signal(false);
  readonly reviewsError = signal('');
  readonly reviewActionError = signal('');
  readonly likedReviewIds = signal<string[]>([]);
  readonly products = signal<Product[]>(Array.from({ length: 12 }, (_, index) => {
    const price = 45000 + index * 12500;
    const category = ['Thức ăn', 'Đồ dùng thiết yếu', 'Chăm sóc sức khỏe', 'Đồ chơi', 'Phụ kiện'][index % 5];
    return {
      id: String(index + 1),
      name: `${['Hạt dinh dưỡng', 'Đồ dùng chăm sóc', 'Sản phẩm sức khỏe', 'Đồ chơi thú cưng', 'Phụ kiện'][index % 5]} cho thú cưng ${index + 1}`,
      category,
      price,
      image: index === 0 ? '/assets/images/product/detail-image.png' : '/assets/images/product/card-placeholder.png',
      rating: 4.5,
      description: 'Sản phẩm chăm sóc thú cưng được tuyển chọn với chất lượng đảm bảo.',
      stock: 0,
    };
  }));
  readonly searchResponse = signal<SearchResult | null>(null);
  readonly searchLoading = signal(false);
  readonly searchError = signal('');
  readonly searchType = signal('all');
  readonly searchSort = signal('relevant');
  readonly rescuePets = signal<AdoptionPet[]>([
    { id: 'mimi-1', name: 'Mimi', description: 'Mimi được cứu vào một chiều mưa và đang tìm một gia đình thật dịu dàng.', status: 'Mèo Tam Thể đang phục hồi tốt sau khi được chăm sóc.', need: 'Cần hạt, pate và người nhận nuôi có kinh nghiệm.', state: 'waiting', image: '/assets/images/rescue/figma-photo-1.png' },
    { id: 'mimi-2', name: 'Mimi', description: 'Mimi là cô mèo nhỏ nhắn, thích sưởi nắng và rất quấn người.', status: 'Mèo Tam Thể đã tiêm phòng cơ bản.', need: 'Cần người chăm sóc lâu dài và vật dụng vệ sinh.', state: 'waiting', image: '/assets/images/rescue/mimi.png' },
    { id: 'lucy', name: 'Lucy', description: 'Một bé mèo hiền, quen sống trong nhà và đang học tin người trở lại.', status: 'Đang theo dõi sức khỏe, ăn uống ổn định.', need: 'Cần hỗ trợ chi phí khám định kỳ.', state: 'adopted', image: '/assets/images/rescue/figma-photo-2.png' },
    { id: 'nau', name: 'Nâu', description: 'Nâu được đón về từ khu chợ nhỏ, ngoan và hợp với gia đình yên tĩnh.', status: 'Đã tẩy giun, đang tăng cân tốt.', need: 'Cần thức ăn mềm và nhà tạm.', state: 'adopted', image: '/assets/images/rescue/figma-photo-3.png' },
    { id: 'bong', name: 'Bông', description: 'Bông thân thiện, thích được vuốt ve và có thể hòa nhập với mèo khác.', status: 'Sức khỏe ổn định, còn hơi nhát.', need: 'Cần người nhận nuôi kiên nhẫn.', state: 'waiting', image: '/assets/images/rescue/figma-photo-4.png' },
    { id: 'miu', name: 'Miu', description: 'Miu nhỏ người, sạch sẽ, phù hợp căn hộ và người mới nuôi mèo.', status: 'Đã khám tổng quát, không phát hiện bất thường.', need: 'Cần cát vệ sinh, hạt kitten và đồ chơi.', state: 'adopted', image: '/assets/images/rescue/figma-photo-5.png' },
  ]);
  readonly rescuePartners = signal<AdoptionPartner[]>([
    { id: 'vawa', name: 'Vietnam Animal Welfare Association', href: 'https://www.facebook.com/vawa.org/', region: 'Khu vực miền Nam', address: '675B, Nguyễn Kiệm, phường 9, Quận Phú Nhuận, TP. Hồ Chí Minh', description: 'Hội Bảo vệ Động vật Việt Nam là tổ chức phi lợi nhuận đã đăng ký hoạt động.', image: '/assets/images/rescue/partner-vawa.png' },
    { id: 'backyard', name: 'Nhóm cứu hộ chó mèo Sân Nhà Nhiều Chó', href: 'https://www.facebook.com/Sannhanhieucho', region: 'Khu vực miền Bắc', address: 'Hà Nội', description: 'Nhóm cứu hộ hoạt động tích cực giúp đỡ thú cưng bị bỏ rơi.', image: '/assets/images/rescue/partner-snnc.png' },
    { id: 'saigon-time', name: 'Trạm Cứu Hộ Chó Mèo Sài Gòn Time', href: 'https://www.facebook.com/savesgt', region: 'Khu vực miền Nam', address: 'TP. Hồ Chí Minh', description: 'Giải cứu và chăm sóc chó mèo bị bỏ rơi, già yếu hoặc bệnh tật.', image: '/assets/images/rescue/partner-saigon-time.png' },
  ]);
  readonly rescuePartnersError = signal('');
  readonly myAdoptionRequests = signal<AdoptionRequest[]>([]);
  readonly myRequestsLoading = signal(false);
  readonly myRequestsError = signal('');
  readonly rescueKeyword = signal('');
  readonly rescueStatus = signal('all');
  readonly selectedAdoptionPet = signal<AdoptionPet | null>(null);
  readonly adoptionSubmitting = signal(false);
  readonly adoptionError = signal('');
  readonly adoptionSuccess = signal('');
  readonly adoptionForm = {
    fullName: '',
    phone: '',
    gender: '',
    birthYear: '',
    address: '',
    housingType: '',
    familyConsent: '',
    currentPets: '',
    aloneTime: '',
    adoptionReason: '',
    futurePlan: '',
  };
  readonly reviewForm = { rating: '', content: '' };
  readonly rescuePage = signal(1);
  readonly policySlug = signal('');
  readonly searchResults = computed(() => this.searchResponse()?.results);
  readonly filteredRescuePets = computed(() => {
    const keyword = this.rescueKeyword().trim().toLocaleLowerCase('vi');
    return this.rescuePets().filter((pet) =>
      (this.rescueStatus() === 'all' || pet.state === this.rescueStatus()) &&
      (!keyword || `${pet.name} ${pet.description} ${pet.status}`.toLocaleLowerCase('vi').includes(keyword)),
    );
  });
  readonly visibleRescuePets = computed(() => this.filteredRescuePets().slice((this.rescuePage() - 1) * 6, this.rescuePage() * 6));
  readonly policyTitle = computed(() => this.policyDetails[this.policySlug()]?.title ?? 'Chính sách đổi - trả hàng');
  readonly policySections = computed(() => this.policyDetails[this.policySlug()]?.sections ?? this.policyDetails['doi-tra-hang'].sections);
  readonly policyLinks = [
    { slug: 'phuong-thuc-thanh-toan', title: 'Chính sách thanh toán' },
    { slug: 'dat-lich-doi-huy-lich', title: 'Chính sách đặt lịch, đổi lịch & hủy lịch' },
    { slug: 'van-chuyen', title: 'Chính sách vận chuyển' },
    { slug: 'doi-tra-hang', title: 'Chính sách đổi - trả hàng' },
    { slug: 'bao-mat', title: 'Chính sách bảo mật' },
    { slug: 'cau-hoi-thuong-gap', title: 'Câu hỏi thường gặp' },
    { slug: 'dieu-khoan-dich-vu', title: 'Điều khoản dịch vụ' },
  ];
  readonly policyDetails: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
    'phuong-thuc-thanh-toan': { title: 'Chính sách thanh toán', sections: [
      { heading: 'I. Phương thức thanh toán', body: 'Dr. Pet’s House hỗ trợ nhiều hình thức thanh toán để bạn mua sắm và đặt lịch thuận tiện.' },
      { heading: '1. Thanh toán khi nhận hàng (COD)', body: 'Thanh toán trực tiếp cho nhân viên giao hàng sau khi kiểm tra kiện hàng.' },
      { heading: '2. Chuyển khoản ngân hàng', body: 'Thông tin chuyển khoản sẽ được cung cấp khi bạn xác nhận đơn hàng. Vui lòng ghi rõ mã đơn để chúng tôi đối soát.' },
    ] },
    'dat-lich-doi-huy-lich': { title: 'Chính sách đặt lịch, đổi lịch & hủy lịch', sections: [
      { heading: 'Đặt lịch', body: 'Khách hàng chọn dịch vụ, chi nhánh, ngày và khung giờ còn trống trên hệ thống. Lịch được xác nhận sau khi nhận thông báo thành công.' },
      { heading: 'Đổi lịch hoặc hủy lịch', body: 'Vui lòng liên hệ Dr. Pet’s House sớm nhất có thể nếu cần thay đổi lịch hẹn để chúng tôi hỗ trợ và sắp xếp khung giờ phù hợp.' },
      { heading: 'Đến trễ hoặc không thể tham dự', body: 'Nếu đến trễ, lịch hẹn có thể cần điều chỉnh theo tình hình tiếp nhận tại chi nhánh.' },
    ] },
    'van-chuyen': { title: 'Chính sách vận chuyển', sections: [
      { heading: 'Phạm vi giao hàng', body: 'Dr. Pet’s House tiếp nhận giao sản phẩm theo khu vực được hỗ trợ tại bước thanh toán.' },
      { heading: 'Thời gian giao hàng', body: 'Thời gian giao dự kiến được thông báo khi xác nhận đơn và có thể thay đổi theo địa chỉ, thời tiết hoặc đơn vị vận chuyển.' },
      { heading: 'Phí vận chuyển', body: 'Phí vận chuyển được hiển thị hoặc xác nhận trước khi hoàn tất đơn hàng.' },
    ] },
    'doi-tra-hang': { title: 'Chính sách đổi - trả hàng', sections: [
      { heading: '1. Điều kiện đổi trả', body: 'Sản phẩm còn nguyên tem nhãn, chưa qua sử dụng và có hóa đơn mua hàng. Vui lòng liên hệ đội ngũ chăm sóc khách hàng trong vòng 7 ngày kể từ khi nhận hàng.' },
      { heading: '2. Trường hợp được hỗ trợ', body: 'Sản phẩm bị lỗi kỹ thuật, hư hỏng trong quá trình vận chuyển hoặc giao không đúng với đơn đặt hàng sẽ được kiểm tra và hỗ trợ đổi phù hợp.' },
      { heading: '3. Quy trình thực hiện', body: 'Gửi mã đơn hàng cùng hình ảnh sản phẩm qua kênh hỗ trợ. Nhân viên sẽ xác nhận thông tin và hướng dẫn bạn hoàn tất thủ tục.' },
    ] },
    'bao-mat': { title: 'Chính sách bảo mật', sections: [
      { heading: 'Thông tin chúng tôi thu thập', body: 'Thông tin liên hệ và dữ liệu cần thiết để cung cấp dịch vụ, hỗ trợ lịch hẹn và xử lý đơn hàng.' },
      { heading: 'Sử dụng và bảo vệ dữ liệu', body: 'Thông tin được sử dụng cho hoạt động chăm sóc khách hàng và được bảo vệ theo quy định áp dụng.' },
      { heading: 'Quyền của khách hàng', body: 'Bạn có thể liên hệ với chúng tôi để yêu cầu kiểm tra hoặc cập nhật thông tin cá nhân.' },
    ] },
    'cau-hoi-thuong-gap': { title: 'Câu hỏi thường gặp', sections: [
      { heading: 'Làm thế nào để đặt lịch khám?', body: 'Chọn Đặt lịch, chọn dịch vụ, chi nhánh và khung giờ phù hợp rồi điền thông tin liên hệ.' },
      { heading: 'Tôi có thể đổi lịch hẹn không?', body: 'Có. Hãy liên hệ với chi nhánh hoặc đội ngũ hỗ trợ sớm nhất để được kiểm tra khung giờ thay thế.' },
      { heading: 'Làm sao để được tư vấn sản phẩm?', body: 'Gửi lời nhắn qua trang Liên hệ hoặc gọi hotline 0868.686.868.' },
    ] },
    'dieu-khoan-dich-vu': { title: 'Điều khoản dịch vụ', sections: [
      { heading: 'Sử dụng dịch vụ', body: 'Khi sử dụng website và dịch vụ, khách hàng vui lòng cung cấp thông tin chính xác và tuân thủ hướng dẫn của nhân viên.' },
      { heading: 'Thông tin sản phẩm và lịch hẹn', body: 'Thông tin, giá bán và khả năng tiếp nhận có thể được cập nhật. Chúng tôi sẽ xác nhận các thay đổi quan trọng trước khi thực hiện.' },
      { heading: 'Liên hệ hỗ trợ', body: 'Nếu có câu hỏi về điều khoản, vui lòng liên hệ đội ngũ chăm sóc khách hàng của Dr. Pet’s House.' },
    ] },
  };
  readonly visibleBranches = computed(() => {
    const query = this.branchQuery().trim().toLocaleLowerCase('vi');
    if (!query) return this.branches();
    return this.branches().filter((branch) =>
      `${branch.name} ${branch.address} ${branch.phone}`.toLocaleLowerCase('vi').includes(query),
    );
  });
  readonly selectedBranch = computed(() =>
    this.branches().find((branch) => branch.id === this.selectedBranchId()) ?? this.branches()[0],
  );
  readonly visibleBookingServices = computed(() =>
    (this.bookingServices().length ? this.bookingServices() : this.serviceOptions)
      .filter((service) => service.type === this.selectedBookingServiceType()),
  );
  readonly filteredAppointments = computed(() => {
    const query = this.appointmentSearchQuery().trim().toLocaleLowerCase('vi');
    const items = this.appointments().filter((appointment) =>
      (this.appointmentFilter() === 'all' || appointment.status === this.appointmentFilter()) &&
      (!query || `${appointment.code} ${appointment.petName} ${appointment.serviceName} ${appointment.date} ${appointment.startTime}`.toLocaleLowerCase('vi').includes(query)),
    );
    return items.sort((a, b) => {
      const dateA = new Date(a.rawDate || a.date).getTime();
      const dateB = new Date(b.rawDate || b.date).getTime();
      return this.appointmentSortOrder() === 'oldest' ? dateA - dateB : dateB - dateA;
    });
  });

  readonly serviceOptions: BookingServiceOption[] = [
    { id: '', name: 'Khám tổng quát', description: 'Đội ngũ chuyên môn chăm sóc tận tình.', price: 150000, type: 'clinic' },
    { id: '', name: 'Tiêm phòng', description: 'Tư vấn lịch tiêm và chăm sóc sau tiêm.', price: 250000, type: 'clinic' },
    { id: '', name: 'Grooming & Spa', description: 'Chăm sóc và làm đẹp nhẹ nhàng cho thú cưng.', price: 300000, type: 'grooming' },
  ];

  readonly timeOptions = ['08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00'];

  readonly blogPosts = [
    { title: 'Lịch tiêm phòng 5-trong-1 cần thiết cho chó con từ 2 tháng tuổi', category: 'Sức khỏe', image: '/assets/images/blog/featured-vaccine.png', date: '4 Tháng 6, 2024' },
    { title: 'Chó mèo bị cảm lạnh: Dấu hiệu và cách chăm sóc', category: 'Sức khỏe', image: '/assets/images/blog/post-placeholder.png', date: '12 Tháng 5, 2024' },
    { title: 'Chọn khẩu phần phù hợp theo độ tuổi của mèo', category: 'Dinh dưỡng', image: '/assets/images/blog/trending-placeholder.png', date: '3 Tháng 6, 2024' },
    { title: 'Hướng dẫn vệ sinh tai an toàn tại nhà', category: 'Vệ sinh & Làm đẹp', image: '/assets/images/blog/post-placeholder.png', date: '1 Tháng 6, 2024' },
  ];

  readonly services: ServiceCard[] = [
    {
      title: 'Khám và điều trị',
      text: 'Đội ngũ bác sĩ chuyên khoa cùng trang thiết bị hiện đại, chẩn đoán chính xác, điều trị tận tâm và hỗ trợ cấp cứu cho bé yêu 24/7.',
      image: '/assets/images/home/service-1.png',
      link: '/dich-vu/kham-dieu-tri',
    },
    {
      title: 'Grooming & Spa',
      text: 'Dịch vụ tắm sấy, cắt tỉa lông và chăm sóc vệ sinh giúp thú cưng luôn sạch sẽ, khỏe mạnh và thoải mái.',
      image: '/assets/images/home/service-2.png',
      link: '/dich-vu/grooming-spa',
    },
    {
      title: 'Pet shop',
      text: 'Cung cấp đa dạng sản phẩm dành cho thú cưng như thức ăn, phụ kiện, đồ chơi và sản phẩm chăm sóc sức khỏe từ nhiều thương hiệu uy tín.',
      image: '/assets/images/home/service-3.png',
      link: '/cua-hang',
    },
  ];

  readonly features = [
    'Đội ngũ bác sĩ giàu kinh nghiệm',
    'Chăm sóc tận tâm, minh bạch',
    'Không gian thân thiện với thú cưng',
    'Dịch vụ và sản phẩm toàn diện',
  ];

  readonly categories = [
    { name: 'Thức ăn', image: '/assets/images/home/category1.png' },
    { name: 'Đồ chơi', image: '/assets/images/home/category2.png' },
    { name: 'Chăm sóc', image: '/assets/images/home/category3.png' },
    { name: 'Phụ kiện', image: '/assets/images/home/category4.png' },
    { name: 'Sức khỏe', image: '/assets/images/home/category5.png' },
  ];

  readonly doctors = [
    { name: 'BS. Nguyễn Minh Anh', image: '/assets/images/home/doctor-1.png' },
    { name: 'BS. Trần Quốc Huy', image: '/assets/images/home/doctor-2.png' },
    { name: 'BS. Lê Khánh Linh', image: '/assets/images/home/doctor-3.png' },
    { name: 'BS. Phạm Đức Thành', image: '/assets/images/home/doctor-4.png' },
  ];
  readonly homeProducts = computed(() =>
    this.products().slice(0, 6).map((product) => ({
      ...product,
      image: '/assets/images/home/product-placeholder.png',
    })),
  );
  readonly featuredHomePost = {
    author: 'John Doe',
    date: 'Aug 23, 2021',
    title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.',
    description: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    image: '/assets/images/home/blog-featured.png',
  };
  readonly homeBlogPosts = [
    {
      author: 'John Doe',
      date: 'Aug 23, 2021',
      title: '8 Figma design systems that you can download for free today.',
      link: '/blog',
    },
    {
      author: 'John Doe',
      date: 'Aug 23, 2021',
      title: '8 Figma design systems that you can download for free today.',
      link: '/blog',
    },
    {
      author: 'John Doe',
      date: 'Aug 23, 2021',
      title: '8 Figma design systems that you can download for free today.',
      link: '/blog',
    },
  ];

  constructor(
    route: ActivatedRoute,
    private readonly router: Router,
    readonly authService: AuthService,
    private readonly contactService: ContactService,
    private readonly storefrontService: StorefrontService,
    private readonly bookingService: BookingService,
    private readonly orderService: OrderService,
    private readonly userProfileService: UserProfileService,
    private readonly sanitizer: DomSanitizer,
  ) {
    route.data.subscribe((data) => {
      this.title = data['title'] ?? this.title;
      this.summary = data['summary'] ?? this.summary;
      this.isHome = data['home'] === true;
      this.pageKind = this.resolvePage(this.title, this.router.url);
      if (this.pageKind === 'contact') this.loadBranches();
      if (this.pageKind === 'booking') {
        const rebook = this.router.getCurrentNavigation()?.extras.state?.['rebookAppointment'];
        if (rebook && typeof rebook === 'object') {
          const value = rebook as { petName?: unknown; services?: unknown[] };
          this.pendingRebook = {
            petName: typeof value.petName === 'string' ? value.petName : '',
            services: Array.isArray(value.services) ? value.services.flatMap((item) => {
              if (!item || typeof item !== 'object') return [];
              const service = item as Record<string, unknown>;
              const serviceId = String(service['serviceId'] ?? service['id'] ?? '');
              if (!serviceId) return [];
              return [{
                serviceId,
                serviceType: service['serviceTypeId'] === 'grooming' ? 'grooming' as const : 'clinic' as const,
              }];
            }) : [],
          };
        }
        this.loadBranches();
        this.loadBookingOptions();
      }
      if (this.pageKind === 'appointments') this.loadAppointments();
      if (this.pageKind === 'checkout') this.loadCheckoutAddresses();
      if (this.pageKind === 'orders') this.loadOrders();
      if (['shop', 'products', 'product', 'review'].includes(this.pageKind)) this.loadProducts();
      if (this.pageKind === 'rescue') this.loadRescue();
    });
    route.queryParamMap.subscribe((params) => {
      this.selectedCategory = params.get('category') ?? 'all';
      this.searchQuery = params.get('q') ?? '';
      this.searchType.set(params.get('type') ?? 'all');
      this.searchSort.set(params.get('sort') ?? 'relevant');
      if (this.pageKind === 'search') this.loadSearch(params.get('q') ?? '');
    });
    route.paramMap.subscribe((params) => {
      this.policySlug.set(params.get('slug') ?? 'doi-tra-hang');
      if (['product', 'review'].includes(this.pageKind) && params.get('productId')) this.loadProduct(params.get('productId')!);
      if (this.pageKind === 'order-detail' && params.get('orderId')) this.loadOrder(params.get('orderId')!);
    });
  }

  get visibleProducts(): Product[] {
    const query = this.searchQuery.trim().toLocaleLowerCase('vi');
    return this.products().filter((product) => {
      const matchesCategory = this.selectedCategory === 'all' || product.category === this.selectedCategory;
      const matchesQuery = !query || product.name.toLocaleLowerCase('vi').includes(query);
      return matchesCategory && matchesQuery;
    });
  }

  get selectedProduct(): Product {
    const match = this.router.url.match(/product-details\/([^/]+)/);
    return this.products().find((product) => product.id === match?.[1]) ?? this.products()[0];
  }

  get subtotal(): number {
    return this.cartSubtotal();
  }

  get checkoutTotal(): number {
    return Math.max(0, this.subtotal - this.checkoutDiscount());
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  formatMaybePrice(value: unknown): string {
    const price = Number(value);
    return this.formatPrice(Number.isFinite(price) ? price : 0);
  }

  decreaseCartQuantity(): void {
    this.cartQuantity = Math.max(1, this.cartQuantity - 1);
  }

  dismissNotice(): void {
    this.notice = '';
  }

  addToCart(productName: string): void {
    const product = this.products().find((item) => item.name === productName)
      ?? this.searchResponse()?.results.products.find((item) => item.name === productName);
    if (!product) {
      this.noticeType = 'error';
      this.notice = 'Không tìm thấy sản phẩm để thêm vào giỏ.';
      return;
    }
    this.cartItems.update((items) => {
      const match = items.find((item) => item.id === product.id);
      return match
        ? items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + this.cartQuantity } : item)
        : [...items, { ...product, quantity: this.cartQuantity }];
    });
    this.persistCart(this.cartItems());
    this.noticeType = 'success';
    this.notice = `Đã thêm "${productName}" vào giỏ hàng.`;
    this.cartQuantity = 1;
  }

  increaseCartQuantity(): void {
    this.cartQuantity += 1;
  }

  updateCartQuantity(productId: string, quantity: number): void {
    const updated = this.cartItems()
      .map((item) => item.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item)
      .filter((item) => item.quantity > 0);
    this.cartItems.set(updated);
    this.persistCart(updated);
  }

  clearCart(): void {
    this.cartItems.set([]);
    this.persistCart([]);
  }

  selectedCheckoutAddress(): UserAddressRecord | undefined {
    return this.checkoutAddresses().find((address) => address.id === this.checkoutAddressId());
  }

  applyCheckoutCoupon(): void {
    const code = this.checkoutCoupon.trim();
    if (!code) {
      this.checkoutCouponError.set('Vui lòng nhập mã giảm giá.');
      this.checkoutCouponMessage.set('');
      return;
    }
    if (!this.authService.isAuthenticated()) {
      this.checkoutCouponError.set('Vui lòng đăng nhập để kiểm tra mã giảm giá.');
      this.checkoutCouponMessage.set('');
      return;
    }
    this.checkoutCouponError.set('');
    this.checkoutCouponMessage.set('');
    this.orderService.applyVoucher(code, this.subtotal).subscribe({
      next: (discount) => {
        this.checkoutDiscount.set(Math.min(discount, this.subtotal));
        this.checkoutCouponMessage.set(`Đã áp dụng giảm ${this.formatPrice(discount)}.`);
      },
      error: (error: Error) => {
        this.checkoutDiscount.set(0);
        this.checkoutCouponError.set(this.userFacingError(error));
      },
    });
  }

  submitCheckout(): void {
    if (!this.cartItems().length) {
      this.checkoutError.set('Giỏ hàng đang trống.');
      return;
    }
    if (!this.authService.isAuthenticated() && !this.checkoutForm.fullName.trim()) {
      this.checkoutError.set('Vui lòng nhập họ và tên người nhận.');
      return;
    }
    if (this.authService.isAuthenticated() && !this.selectedCheckoutAddress()) {
      this.checkoutError.set('Vui lòng chọn hoặc thêm địa chỉ nhận hàng trong hồ sơ.');
      return;
    }

    this.checkoutSubmitting.set(true);
    this.checkoutError.set('');
    const paymentMethod = this.checkoutPaymentMethod === 'cod' ? 'cod' : 'online';
    const request = this.authService.isAuthenticated()
      ? this.orderService.checkoutAuthenticated({
          addressId: this.selectedCheckoutAddress()!.id,
          paymentMethod,
          voucherCode: this.checkoutCoupon.trim(),
          note: this.checkoutNote,
          items: this.cartItems(),
        })
      : this.orderService.checkoutGuest({
          guest: {
            fullName: this.checkoutForm.fullName,
            phone: this.checkoutForm.phone,
            email: this.checkoutForm.email,
            address: this.checkoutForm.address,
            ward: this.checkoutForm.ward,
            district: this.checkoutForm.district,
            city: this.checkoutForm.city,
          },
          paymentMethod,
          voucherCode: '',
          note: this.checkoutNote,
          items: this.cartItems(),
        });
    request.subscribe({
      next: (result) => {
        const order = result && typeof result === 'object' ? result as Record<string, unknown> : {};
        this.checkoutSuccess.set({
          id: String(order['order_id'] ?? order['id'] ?? ''),
          code: String(order['order_code'] ?? order['code'] ?? ''),
        });
        this.clearCart();
        this.checkoutSubmitting.set(false);
      },
      error: (error: Error) => {
        this.checkoutError.set(this.userFacingError(error));
        this.checkoutSubmitting.set(false);
      },
    });
  }

  searchProducts(): void {
    const query = this.searchQuery.trim();
    void this.router.navigate(['/search'], {
      queryParams: { q: query || null, type: this.searchType(), sort: this.searchSort() },
    });
  }

  submitProductReview(form: { rating: number; content: string }): void {
    const productId = this.router.url.match(/product-details\/([^/]+)/)?.[1];
    if (!productId) return;
    this.notice = '';
    this.storefrontService.createProductReview(productId, Number(form.rating), form.content.trim()).subscribe({
      next: () => {
        this.noticeType = 'success';
        this.notice = 'Cảm ơn bạn đã chia sẻ đánh giá về sản phẩm.';
        this.reviewForm.rating = '';
        this.reviewForm.content = '';
        this.loadProductReviews(productId);
      },
      error: (error: Error) => {
        this.noticeType = 'error';
        this.notice = this.userFacingError(error);
      },
    });
  }

  submitReviewForm(): void {
    this.submitProductReview({ rating: Number(this.reviewForm.rating), content: this.reviewForm.content });
  }

  openAdoptionForm(pet: AdoptionPet): void {
    if (pet.state === 'adopted') return;
    const user = this.authService.currentUser();
    this.adoptionForm.fullName = user?.fullName ?? '';
    this.adoptionForm.phone = user?.phone ?? '';
    this.selectedAdoptionPet.set(pet);
    this.adoptionError.set('');
    this.adoptionSuccess.set('');
  }

  closeAdoptionForm(): void {
    this.selectedAdoptionPet.set(null);
  }

  submitAdoptionRequest(values: Record<string, string>): void {
    const pet = this.selectedAdoptionPet();
    if (!pet) return;
    this.adoptionSubmitting.set(true);
    this.adoptionError.set('');
    this.storefrontService.createAdoptionRequest(pet.id, values).subscribe({
      next: (response) => {
        this.adoptionSubmitting.set(false);
        this.adoptionSuccess.set(`Đã gửi yêu cầu nhận nuôi ${pet.name}. Đội ngũ sẽ sớm liên hệ với bạn.`);
        const responseRecord = response && typeof response === 'object' ? response as Record<string, unknown> : {};
        this.myAdoptionRequests.update((requests) => [{
          id: String(responseRecord['adoption_request_id'] ?? responseRecord['id'] ?? Date.now()),
          petId: pet.id,
          petName: pet.name,
          petImage: pet.image,
          status: 'pending',
          statusLabel: 'Đang chờ duyệt',
          submittedAt: new Date().toISOString(),
          reason: values['adoptionReason'] || values['futurePlan'] || '',
        }, ...requests]);
        Object.assign(this.adoptionForm, {
          fullName: '', phone: '', gender: '', birthYear: '', address: '', housingType: '',
          familyConsent: '', currentPets: '', aloneTime: '', adoptionReason: '', futurePlan: '',
        });
        this.selectedAdoptionPet.set(null);
      },
      error: (error: Error) => {
        this.adoptionSubmitting.set(false);
        this.adoptionError.set(this.userFacingError(error));
      },
    });
  }

  changeRescuePage(page: number): void {
    this.rescuePage.set(Math.min(Math.max(1, page), Math.max(1, Math.ceil(this.filteredRescuePets().length / 6))));
  }

  get rescueTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRescuePets().length / 6));
  }

  policyIsActive(slug: string): boolean {
    return this.policySlug() === slug;
  }

  private loadProducts(): void {
    this.productsLoading.set(true);
    this.productsError.set('');
    this.storefrontService.getProducts().subscribe({
      next: (products) => {
        if (products.length) this.products.set(products);
        this.productsLoading.set(false);
      },
      error: (error: Error) => {
        this.productsLoading.set(false);
        this.productsError.set(`${this.userFacingError(error)} Đang hiển thị dữ liệu mẫu.`);
      },
    });
  }

  private loadProduct(productId: string): void {
    this.storefrontService.getProduct(productId).subscribe({
      next: (product) => this.products.update((products) => [
        product,
        ...products.filter((existing) => existing.id !== product.id),
      ]),
      error: (error: Error) => this.productsError.set(this.userFacingError(error)),
    });
    this.loadProductReviews(productId);
  }

  loadProductReviews(productId: string): void {
    this.reviewsLoading.set(true);
    this.reviewsError.set('');
    this.storefrontService.getProductReviews(productId).subscribe({
      next: (reviews) => {
        this.productReviews.set(reviews);
        this.reviewsLoading.set(false);
      },
      error: (error: Error) => {
        this.reviewsError.set(this.userFacingError(error));
        this.reviewsLoading.set(false);
      },
    });
  }

  likeReview(reviewId: string): void {
    this.reviewActionError.set('');
    this.storefrontService.likeProductReview(reviewId).subscribe({
      next: () => {
        this.likedReviewIds.update((ids) => ids.includes(reviewId) ? ids : [...ids, reviewId]);
      },
      error: (error: Error) => this.reviewActionError.set(this.userFacingError(error)),
    });
  }

  private loadSearch(query: string): void {
    if (!query.trim()) {
      this.searchResponse.set(null);
      this.searchError.set('');
      return;
    }
    this.searchLoading.set(true);
    this.searchError.set('');
    this.storefrontService.search(query, this.searchType(), this.searchSort()).subscribe({
      next: (result) => {
        this.searchResponse.set(result);
        this.searchLoading.set(false);
      },
      error: (error: Error) => {
        this.searchLoading.set(false);
        this.searchError.set(this.userFacingError(error));
      },
    });
  }

  private loadRescue(): void {
    this.storefrontService.getAdoptionPets().subscribe({
      next: (pets) => { if (pets.length) this.rescuePets.set(pets); },
      error: (error: Error) => this.adoptionError.set(`${this.userFacingError(error)} Đang hiển thị hồ sơ mẫu.`),
    });
    this.storefrontService.getRescuePartners().subscribe({
      next: (partners) => {
        if (partners.length) this.rescuePartners.set(partners);
        this.rescuePartnersError.set('');
      },
      error: (error: Error) => this.rescuePartnersError.set(`${this.userFacingError(error)} Đang hiển thị danh sách đối tác mẫu.`),
    });
    if (this.authService.isAuthenticated()) {
      this.myRequestsLoading.set(true);
      this.myRequestsError.set('');
      this.storefrontService.getMyAdoptionRequests().subscribe({
        next: (requests) => {
          this.myAdoptionRequests.set(requests);
          this.myRequestsLoading.set(false);
        },
        error: (error: Error) => {
          this.myRequestsError.set(this.userFacingError(error));
          this.myRequestsLoading.set(false);
        },
      });
    } else {
      this.myAdoptionRequests.set([]);
    }
  }

  private userFacingError(error: Error): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'Không thể kết nối với máy chủ. Vui lòng thử lại sau.';
      const response = error.error as { EM?: string; message?: string } | null;
      if (response?.EM || response?.message) return response.EM || response.message || error.message;
    }
    return /^(http failure response|failed to fetch|load failed|networkerror)/i.test(error.message)
      ? 'Không thể kết nối với máy chủ. Vui lòng thử lại sau.'
      : error.message;
  }

  private loadStoredCart(): CartItem[] {
    try {
      const stored = localStorage.getItem('petclinic.cart');
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is CartItem =>
        item && typeof item === 'object' && typeof item['id'] === 'string' &&
        typeof item['quantity'] === 'number' && item['quantity'] > 0,
      );
    } catch {
      return [];
    }
  }

  private persistCart(items: CartItem[]): void {
    try {
      if (items.length) localStorage.setItem('petclinic.cart', JSON.stringify(items));
      else localStorage.removeItem('petclinic.cart');
    } catch {
      this.noticeType = 'warning';
      this.notice = 'Giỏ hàng hiện chỉ được lưu trong phiên này do trình duyệt không cho phép lưu dữ liệu.';
    }
  }

  submitContact(): void {
    this.contactSubmitting.set(true);
    this.contactError.set('');
    this.contactSubmitted.set(false);
    this.contactService.submitMessage(this.contactForm).subscribe({
      next: () => {
        this.contactSubmitting.set(false);
        this.contactSubmitted.set(true);
        this.contactForm = { name: '', gender: '', phone: '', email: '', message: '' };
      },
      error: (error: Error) => {
        this.contactSubmitting.set(false);
        this.contactError.set(error.message);
      },
    });
  }

  googleMapsLink(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  googleMapsEmbedLink(address: string): SafeResourceUrl {
    const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=14&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  private loadBranches(): void {
    if (this.branchesLoading()) return;
    const fallbackBranches = this.contactService.getFallbackBranches();
    this.branches.set(fallbackBranches);
    this.selectedBranchId.set(fallbackBranches[0]?.id ?? '');
    this.branchesLoading.set(true);
    this.branchesError.set('');
    this.contactService.getBranches().subscribe({
      next: (branches) => {
        if (branches.length) {
          this.branches.set(branches);
          if (!branches.some((branch) => branch.id === this.selectedBranchId())) {
            this.selectedBranchId.set(branches[0].id);
          }
        }
        this.branchesLoading.set(false);
      },
      error: (error: Error) => {
        this.branchesError.set(`${error.message} Đang hiển thị danh sách chi nhánh dự phòng.`);
        this.branchesLoading.set(false);
      },
    });
  }

  selectBookingService(service: BookingServiceOption): void {
    if (!service.id) {
      this.noticeType = 'warning';
      this.notice = 'Không thể đặt lịch bằng dữ liệu mẫu. Kết nối máy chủ để chọn dịch vụ khả dụng.';
      return;
    }
    this.selectedServiceIds.update((ids) => ids.includes(service.id)
      ? ids.filter((id) => id !== service.id)
      : [...ids, service.id]);
    this.selectedServiceId = this.selectedServiceIds()[0] ?? '';
    const firstSelected = (this.bookingServices().length ? this.bookingServices() : this.serviceOptions)
      .find((item) => item.id === this.selectedServiceId);
    this.selectedService = firstSelected?.name ?? '';
    this.selectedTime = '';
    this.selectedSlotId = '';
    this.loadAppointmentSlots();
  }

  changeBookingServiceType(type: 'clinic' | 'grooming'): void {
    if (this.selectedBookingServiceType() === type) return;
    this.selectedBookingServiceType.set(type);
    this.selectedServiceIds.set([]);
    this.selectedServiceId = '';
    this.selectedService = '';
    this.selectedSlotId = '';
    this.selectedTime = '';
    this.loadAppointmentSlots();
  }

  onBookingBranchChange(branchId: string): void {
    this.selectedBranchId.set(branchId);
    this.selectedTime = '';
    this.selectedSlotId = '';
    this.loadAppointmentSlots();
  }

  onBookingDateChange(date: string): void {
    this.selectedDate = date;
    this.selectedTime = '';
    this.selectedSlotId = '';
    this.loadAppointmentSlots();
  }

  selectBookingSlot(slot: AppointmentSlot): void {
    if (!slot.available) return;
    this.selectedTime = slot.label;
    this.selectedSlotId = slot.id;
  }

  submitBooking(): void {
    if (!this.selectedServiceIds().some(Boolean) || !this.selectedSlotId || !this.bookingForm.speciesId) {
      this.noticeType = 'warning';
      this.notice = 'Vui lòng chọn ít nhất một dịch vụ, khung giờ còn trống và loài thú cưng.';
      return;
    }
    if (!this.bookingForm.petName.trim() || !this.bookingForm.customerName.trim() || !this.bookingForm.phone.trim()) {
      this.noticeType = 'warning';
      this.notice = 'Vui lòng nhập tên thú cưng, họ tên chủ nuôi và số điện thoại.';
      return;
    }

    this.bookingSubmitting.set(true);
    this.bookingSuccess.set(false);
    this.notice = '';
    this.bookingService.bookAppointment({
      slotId: this.selectedSlotId,
      services: this.selectedServiceIds().map((serviceId) => ({ serviceId, quantity: 1 })),
      petName: this.bookingForm.petName,
      speciesId: this.bookingForm.speciesId,
      customerName: this.bookingForm.customerName,
      customerPhone: this.bookingForm.phone,
      notes: this.bookingForm.notes,
      paymentMethod: this.bookingPaymentMethod,
    }).subscribe({
      next: () => {
        this.bookingSubmitting.set(false);
        this.bookingSuccess.set(true);
        this.noticeType = 'success';
        this.notice = 'Đã gửi yêu cầu đặt lịch thành công.';
      },
      error: (error: Error) => {
        this.bookingSubmitting.set(false);
        this.noticeType = 'error';
        this.notice = this.userFacingError(error);
      },
    });
  }

  private loadBookingOptions(): void {
    this.bookingServicesLoading.set(true);
    this.bookingServicesError.set('');
    this.bookingService.getServices().subscribe({
      next: (services) => {
        this.bookingServices.set(services);
        if (this.pendingRebook) {
          const validServices = this.pendingRebook.services.filter((item) => services.some((service) => service.id === item.serviceId));
          this.selectedServiceIds.set(validServices.map((item) => item.serviceId));
          this.selectedServiceId = validServices[0]?.serviceId ?? '';
          this.selectedBookingServiceType.set(validServices[0]?.serviceType ?? 'clinic');
          this.selectedService = services.find((service) => service.id === this.selectedServiceId)?.name ?? '';
          this.bookingForm.petName = this.pendingRebook.petName;
          this.pendingRebook = null;
          if (!validServices.length) {
            this.noticeType = 'warning';
            this.notice = 'Không thể đặt lại tự động vì dịch vụ cũ không còn khả dụng. Vui lòng chọn dịch vụ mới.';
          }
        }
        this.bookingServicesLoading.set(false);
      },
      error: (error: Error) => {
        this.bookingServicesError.set(this.userFacingError(error));
        this.bookingServicesLoading.set(false);
      },
    });
    this.bookingService.getPetSpecies().subscribe({
      next: (species) => this.bookingSpecies.set(species),
      error: (error: Error) => this.bookingSpeciesError.set(this.userFacingError(error)),
    });
  }

  private loadAppointments(): void {
    this.appointmentsLoading.set(true);
    this.appointmentsError.set('');
    this.bookingService.getAppointmentHistory().subscribe({
      next: (appointments) => {
        this.appointments.set(appointments);
        this.appointmentsLoading.set(false);
      },
      error: (error: Error) => {
        this.appointmentsError.set(this.userFacingError(error));
        this.appointmentsLoading.set(false);
      },
    });
  }

  appointmentCount(status: string): number {
    return status === 'all'
      ? this.appointments().length
      : this.appointments().filter((appointment) => appointment.status === status).length;
  }

  appointmentAction(appointment: AppointmentHistoryItem, action: 'pay' | 'cancel' | 'reschedule' | 'rebook' | 'review'): void {
    if (action === 'reschedule') {
      this.appointmentActionMessage.set({
        type: 'warning',
        text: 'Backend chưa hỗ trợ đổi lịch trực tiếp. Bạn có thể đặt lịch mới nếu cần đổi giờ.',
      });
      return;
    }
    if (action === 'rebook') {
      const services = appointment.services.length
        ? appointment.services
        : appointment.serviceId
          ? [{ id: appointment.serviceId, serviceId: appointment.serviceId, name: appointment.serviceName, serviceTypeId: appointment.serviceType, quantity: 1 }]
          : [];
      void this.router.navigateByUrl('/dat-lich', {
        state: { rebookAppointment: { petName: appointment.petName, serviceTypeId: services[0]?.serviceTypeId, services, sourceAppointmentId: appointment.id } },
      });
      return;
    }
    if (action === 'review') {
      this.reviewAppointmentId.set(appointment.id);
      this.reviewRating = 0;
      this.reviewComment = '';
      return;
    }
    const verb = action === 'cancel' ? 'hủy' : 'xác nhận thanh toán';
    if (!globalThis.confirm(`Bạn có chắc muốn ${verb} lịch hẹn ${appointment.code ? `#${appointment.code}` : `#${appointment.id}`}?`)) return;
    this.appointmentActionLoadingId.set(appointment.id);
    this.appointmentActionMessage.set(null);
    const request = action === 'cancel'
      ? this.bookingService.cancelAppointment(appointment.id)
      : this.bookingService.checkoutAppointment(appointment.id, 'store');
    request.subscribe({
      next: () => {
        this.appointments.update((items) => items.map((item) => item.id !== appointment.id ? item : action === 'cancel'
          ? { ...item, status: 'cancelled', statusLabel: 'Đã hủy', canCancel: false, canReschedule: false, canRebook: true }
          : { ...item, status: 'confirmed', statusLabel: 'Đã xác nhận', paymentMethod: 'store', paymentStatus: 'waiting_store_payment', canCancel: true, canReschedule: true }));
        this.appointmentActionMessage.set({
          type: 'success',
          text: action === 'cancel'
            ? 'Đã hủy lịch hẹn thành công.'
            : 'Đã xác nhận lịch hẹn. Bạn có thể thanh toán tại phòng khám khi đến sử dụng dịch vụ.',
        });
        this.appointmentActionLoadingId.set('');
      },
      error: (error: Error) => {
        this.appointmentActionMessage.set({ type: 'error', text: this.userFacingError(error) });
        this.appointmentActionLoadingId.set('');
      },
    });
  }

  submitAppointmentReview(): void {
    const appointment = this.appointments().find((item) => item.id === this.reviewAppointmentId());
    if (!appointment || !appointment.serviceId || !this.reviewRating) {
      this.appointmentActionMessage.set({
        type: 'error',
        text: 'Không thể xác định dịch vụ hoặc số sao đánh giá. Vui lòng kiểm tra lịch hẹn.',
      });
      return;
    }
    this.appointmentActionLoadingId.set(appointment.id);
    this.bookingService.createServiceReview(appointment.serviceId, this.reviewRating, this.reviewComment).subscribe({
      next: () => {
        this.appointments.update((items) => items.map((item) => item.id === appointment.id ? { ...item, reviewed: true, canReview: false } : item));
        this.reviewAppointmentId.set('');
        this.appointmentActionMessage.set({ type: 'success', text: 'Đã gửi đánh giá dịch vụ thành công.' });
        this.appointmentActionLoadingId.set('');
      },
      error: (error: Error) => {
        this.appointmentActionMessage.set({ type: 'error', text: this.userFacingError(error) });
        this.appointmentActionLoadingId.set('');
      },
    });
  }

  private loadCheckoutAddresses(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.checkoutAddresses.set([]);
      this.checkoutAddressId.set('');
      return;
    }
    this.checkoutAddressesLoading.set(true);
    this.checkoutAddressesError.set('');
    this.userProfileService.getAddresses(user.id).subscribe({
      next: (addresses) => {
        this.checkoutAddresses.set(addresses);
        this.checkoutAddressId.set(addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? '');
        this.checkoutAddressesLoading.set(false);
      },
      error: (error: Error) => {
        this.checkoutAddressesError.set(this.userFacingError(error));
        this.checkoutAddressesLoading.set(false);
      },
    });
  }

  private loadOrders(): void {
    this.ordersLoading.set(true);
    this.ordersError.set('');
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.ordersLoading.set(false);
      },
      error: (error: Error) => {
        this.ordersError.set(this.userFacingError(error));
        this.ordersLoading.set(false);
      },
    });
  }

  private loadOrder(orderId: string): void {
    this.orderDetailLoading.set(true);
    this.orderDetailError.set('');
    this.orderService.getOrder(orderId).subscribe({
      next: (order) => {
        this.selectedOrder.set(order);
        this.orderDetailLoading.set(false);
      },
      error: (error: Error) => {
        this.orderDetailError.set(this.userFacingError(error));
        this.orderDetailLoading.set(false);
      },
    });
  }

  private loadAppointmentSlots(): void {
    const requestId = ++this.bookingSlotRequestId;
    if (!this.selectedDate || !this.selectedBranchId()) {
      this.bookingSlots.set([]);
      this.bookingSlotsError.set('');
      this.bookingSlotsLoading.set(false);
      return;
    }
    this.bookingSlotsLoading.set(true);
    this.bookingSlotsError.set('');
    this.bookingService.getAppointmentSlots(
      this.selectedDate,
      this.selectedBranchId(),
      this.selectedBookingServiceType(),
    ).subscribe({
      next: (slots) => {
        if (requestId !== this.bookingSlotRequestId) return;
        this.bookingSlots.set(slots);
        this.bookingSlotsLoading.set(false);
      },
      error: (error: Error) => {
        if (requestId !== this.bookingSlotRequestId) return;
        this.bookingSlots.set([]);
        this.bookingSlotsError.set(this.userFacingError(error));
        this.bookingSlotsLoading.set(false);
      },
    });
  }

  continueBooking(): void {
    if (this.bookingStep === 1 && !this.selectedServiceIds().some(Boolean)) {
      this.noticeType = 'warning';
      this.notice = 'Vui lòng chọn ít nhất một dịch vụ được tải từ máy chủ trước khi tiếp tục.';
      return;
    }
    if (this.bookingStep === 2 && (!this.selectedDate || !this.selectedBranchId() || !this.selectedSlotId)) {
      this.noticeType = 'warning';
      this.notice = 'Vui lòng chọn chi nhánh, ngày và khung giờ còn trống.';
      return;
    }
    this.dismissNotice();
    this.bookingStep = Math.min(this.bookingStep + 1, 3);
  }

  private resolvePage(title: string, url: string): PageKind {
    if (url === '/' || this.isHome) return 'home';
    if (url.startsWith('/product-details/') && url.includes('/write-review')) return 'review';
    if (url.startsWith('/product-details/')) return 'product';
    if (url.includes('/blog/so-cuu/') || url.includes('/bai-viet/so-cuu/')) return 'first-aid-detail';
    if (url.includes('/blog/cong-dong') || url.includes('/bai-viet/cong-dong')) return 'community';
    if (url.includes('/blog/so-cuu') || url.includes('/bai-viet/so-cuu')) return 'first-aid';
    if ((url.startsWith('/blog/') || url.startsWith('/bai-viet/')) && !url.includes('/kien-thuc') && !url.includes('/cong-dong')) return 'blog-detail';
    if (/^\/(blog|bai-viet)(\/kien-thuc)?$/.test(url)) return 'blog';
    if (url.startsWith('/thu-cung-cua-toi/them-moi') || url.includes('/chinh-sua')) return 'pet-form';
    if (url.startsWith('/thu-cung-cua-toi/')) return 'pet-detail';

    const titleMap: Record<string, PageKind> = {
      'Đặt lịch khám': 'booking',
      'Cửa hàng thú cưng': 'shop',
      'Sản phẩm cho thú cưng': 'products',
      'Chi tiết sản phẩm': 'product',
      'Viết đánh giá': 'review',
      'Giỏ hàng': 'cart',
      'Thanh toán': 'checkout',
      'Sơ cứu thú cưng': 'first-aid',
      'Cộng đồng yêu thú cưng': 'community',
      'Bài viết': 'blog',
      'Cứu trợ và nhận nuôi': 'rescue',
      'Tìm kiếm': 'search',
      'Về chúng tôi': 'about',
      'Liên hệ': 'contact',
      'Chính sách': 'policy',
      'Chính sách đổi trả': 'policy',
      'Grooming & Spa': 'grooming',
      'Khám và điều trị': 'medical',
      'Thông tin người dùng': 'profile',
      'Thú cưng của tôi': 'pets',
      'Hồ sơ thú cưng': 'pet-detail',
      'Thêm thú cưng': 'pet-form',
      'Cập nhật hồ sơ thú cưng': 'pet-form',
      'Lịch sử đặt lịch': 'appointments',
      'Đơn hàng của tôi': 'orders',
      'Chi tiết đơn hàng': 'order-detail',
      'Không tìm thấy trang': 'not-found',
    };
    return titleMap[title] ?? 'generic';
  }
}
