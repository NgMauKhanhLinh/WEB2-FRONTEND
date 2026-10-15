import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthModalComponent } from './auth-modal/auth-modal';
import { authGuard } from './guards/auth.guard';

const petClinicPage = () => import('./pet-clinic-page/pet-clinic-page').then((module) => module.PetClinicPageComponent);
const petManagementPage = () => import('./pet-management/pet-management').then((module) => module.PetManagementComponent);

const routes: Routes = [
  { path: '', loadComponent: petClinicPage, data: { home: true } },
  { path: 'login', component: AuthModalComponent },
  { path: 'profile', redirectTo: 'thong-tin-nguoi-dung' },
  { path: 'dat-lich', loadComponent: petClinicPage, data: { title: 'Đặt lịch khám', summary: 'Chọn dịch vụ phù hợp và đặt lịch chăm sóc cho thú cưng.' } },
  { path: 'booking', redirectTo: 'dat-lich' },
  { path: 'petshop', redirectTo: 'cua-hang' },
  { path: 'cua-hang', loadComponent: petClinicPage, data: { title: 'Cửa hàng thú cưng', summary: 'Sản phẩm chất lượng được lựa chọn dành riêng cho thú cưng.' } },
  { path: 'products', redirectTo: 'san-pham' },
  { path: 'san-pham', loadComponent: petClinicPage, data: { title: 'Sản phẩm cho thú cưng', summary: 'Khám phá thức ăn, phụ kiện và sản phẩm chăm sóc.' } },
  { path: 'product-details/:productId/write-review', loadComponent: petClinicPage, data: { title: 'Viết đánh giá', summary: 'Chia sẻ trải nghiệm của bạn về sản phẩm.' }, canActivate: [authGuard] },
  { path: 'product-details/:productId', loadComponent: petClinicPage, data: { title: 'Chi tiết sản phẩm', summary: 'Thông tin sản phẩm và hướng dẫn lựa chọn.' } },
  { path: 'product-details', redirectTo: 'san-pham' },
  { path: 'cart', loadComponent: petClinicPage, data: { title: 'Giỏ hàng', summary: 'Kiểm tra các sản phẩm bạn đã chọn.' } },
  { path: 'blog/kien-thuc', redirectTo: 'blog' },
  { path: 'bai-viet/kien-thuc', redirectTo: 'blog' },
  { path: 'blog/so-cuu/:postId', loadComponent: petClinicPage, data: { title: 'Sơ cứu thú cưng', summary: 'Kiến thức cần thiết giúp bạn chăm sóc thú cưng an toàn.' } },
  { path: 'bai-viet/so-cuu/:postId', redirectTo: 'blog/so-cuu/:postId' },
  { path: 'blog/so-cuu', loadComponent: petClinicPage, data: { title: 'Sơ cứu thú cưng', summary: 'Hướng dẫn xử lý các tình huống thường gặp.' } },
  { path: 'bai-viet/so-cuu', redirectTo: 'blog/so-cuu' },
  { path: 'blog/cong-dong', loadComponent: petClinicPage, data: { title: 'Cộng đồng yêu thú cưng', summary: 'Câu chuyện và kinh nghiệm từ cộng đồng.' } },
  { path: 'bai-viet/cong-dong', redirectTo: 'blog/cong-dong' },
  { path: 'blog/:postId', loadComponent: petClinicPage, data: { title: 'Bài viết', summary: 'Kiến thức và tin tức dành cho người yêu thú cưng.' } },
  { path: 'bai-viet/:postId', redirectTo: 'blog/:postId' },
  { path: 'blog', loadComponent: petClinicPage, data: { title: 'Bài viết', summary: 'Kiến thức chăm sóc thú cưng từ đội ngũ Dr. Pet.' } },
  { path: 'bai-viet', redirectTo: 'blog' },
  { path: 'rescue', redirectTo: 'cuu-tro' },
  { path: 'cuu-tro', loadComponent: petClinicPage, data: { title: 'Cứu trợ và nhận nuôi', summary: 'Cùng trao cơ hội cho những người bạn đang cần một mái ấm.' } },
  { path: 'search', loadComponent: petClinicPage, data: { title: 'Tìm kiếm', summary: 'Kết quả tìm kiếm trên Dr. Pet’s House.' } },
  { path: 'about', redirectTo: 've-chung-toi' },
  { path: 've-chung-toi', loadComponent: () => import('./about-page/about-page').then((module) => module.AboutPageComponent) },
  { path: 'contact', redirectTo: 'lien-he' },
  { path: 'lien-he', loadComponent: petClinicPage, data: { title: 'Liên hệ', summary: 'Chúng tôi luôn sẵn sàng giải đáp và hỗ trợ bạn.' } },
  { path: 'policy', redirectTo: 'policies/doi-tra-hang' },
  { path: 'policies/doi-tra-hang', loadComponent: petClinicPage, data: { title: 'Chính sách đổi trả', summary: 'Thông tin chính sách dành cho khách hàng.' } },
  { path: 'policies/:slug', loadComponent: petClinicPage, data: { title: 'Chính sách', summary: 'Thông tin và quy định dịch vụ của Dr. Pet’s House.' } },
  { path: 'services/groomng-spa', redirectTo: 'dich-vu/grooming-spa' },
  { path: 'services/grooming-spa', redirectTo: 'dich-vu/grooming-spa' },
  { path: 'dich-vu/grooming-spa', loadComponent: petClinicPage, data: { title: 'Grooming & Spa', summary: 'Dịch vụ chăm sóc và làm đẹp nhẹ nhàng cho thú cưng.' } },
  { path: 'services/kham-dieu-tri', redirectTo: 'dich-vu/kham-dieu-tri' },
  { path: 'dich-vu/kham-dieu-tri', loadComponent: petClinicPage, data: { title: 'Khám và điều trị', summary: 'Chăm sóc sức khỏe thú cưng cùng đội ngũ bác sĩ tận tâm.' } },
  { path: 'dich-vu', redirectTo: 'dich-vu/kham-dieu-tri' },
  { path: 'checkout', loadComponent: petClinicPage, data: { title: 'Thanh toán', summary: 'Hoàn tất đơn hàng của bạn.' } },
  { path: 'thong-tin-nguoi-dung', loadComponent: () => import('./user-profile/user-profile').then((module) => module.UserProfileComponent) , canActivate: [authGuard] },
  { path: 'thu-cung-cua-toi/them-moi', loadComponent: petManagementPage , canActivate: [authGuard] },
  { path: 'thu-cung-cua-toi/:id/chinh-sua', loadComponent: petManagementPage , canActivate: [authGuard] },
  { path: 'thu-cung-cua-toi/:id', loadComponent: petManagementPage , canActivate: [authGuard] },
  { path: 'thu-cung-cua-toi', loadComponent: petManagementPage , canActivate: [authGuard] },
  { path: 'lich-su-dat-lich', loadComponent: petClinicPage, data: { title: 'Lịch sử đặt lịch', summary: 'Theo dõi lịch hẹn chăm sóc thú cưng.' }, canActivate: [authGuard] },
  { path: 'don-hang-cua-toi/:orderId', loadComponent: petClinicPage, data: { title: 'Chi tiết đơn hàng', summary: 'Thông tin và trạng thái đơn hàng.' }, canActivate: [authGuard] },
  { path: 'don-hang-cua-toi', loadComponent: petClinicPage, data: { title: 'Đơn hàng của tôi', summary: 'Theo dõi các đơn hàng của bạn.' }, canActivate: [authGuard] },
  { path: '**', loadComponent: petClinicPage, data: { title: 'Không tìm thấy trang', summary: 'Đường dẫn này không tồn tại hoặc đã được thay đổi.' } },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
