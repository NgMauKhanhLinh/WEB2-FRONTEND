import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { FooterComponent } from './footer';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([{ path: '**', children: [] }])],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
  });

  it('renders the brand, contact information and footer link groups', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.footer-logo img')?.getAttribute('src')).toBe('/assets/images/home/logo.png');
    expect(element.querySelector('.footer-brand-block h2')?.textContent?.trim()).toBe('TRUNG TÂM CHĂM SÓC THÚ CƯNG');
    expect(element.querySelectorAll('.footer-column').length).toBe(4);
    expect(element.textContent).toContain('086 8686868');
    expect(element.textContent).toContain('Chính sách bảo mật');
  });

  it('expands one mobile link section at a time', () => {
    fixture.componentInstance.toggleSection('quick');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Bảng giá dịch vụ');

    fixture.componentInstance.toggleSection('services');
    fixture.detectChanges();
    expect(fixture.componentInstance.openSection).toBe('services');
    expect(fixture.nativeElement.textContent).toContain('Khám & Điều trị');
  });

  it('selects the compact footer on account routes and white variant on content routes', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/thong-tin-nguoi-dung');
    fixture.detectChanges();
    expect(fixture.componentInstance.variant()).toBe('account');
    expect(fixture.nativeElement.querySelector('footer')?.classList.contains('footer-account')).toBe(true);

    await router.navigateByUrl('/blog');
    fixture.detectChanges();
    expect(fixture.componentInstance.variant()).toBe('white');
    expect(fixture.nativeElement.querySelector('footer')?.classList.contains('footer-white')).toBe(true);
  });
});
