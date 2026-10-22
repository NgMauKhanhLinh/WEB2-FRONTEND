import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePageComponent } from './home-page';

describe('HomePageComponent', () => {
  let fixture: ComponentFixture<HomePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
  });

  it('renders the about story, service offerings, milestones, and doctors', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('TRUNG TÂM CHĂM SÓC THÚ CƯNG');
    expect(element.textContent).toContain('Hành trình phát triển');
    expect(element.textContent).toContain('KHÁM & ĐIỀU TRỊ');
    expect(element.querySelectorAll('.doctor-grid article').length).toBe(4);
    expect(element.querySelector('.hero-logo')?.getAttribute('src')).toBe('/assets/images/home/hero-logo.png');
  });

  it('cycles gallery and doctor content and supports image preview navigation', () => {
    const component = fixture.componentInstance;
    component.moveGallery(1);
    expect(component.activeGallery.title).toBe('Không gian mua sắm tiện lợi');
    component.openPreview(0);
    component.movePreview(1);
    expect(component.previewImage).toContain('shop-thumb-1.png');
    component.closePreview();
    expect(component.previewImage).toBeNull();

    component.moveDoctorPage(1);
    fixture.detectChanges();
    expect(component.visibleDoctors[0].name).toBe('Bs. Đỗ Nhất Tâm');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Bs. Đỗ Nhất Tâm');
  });
});
