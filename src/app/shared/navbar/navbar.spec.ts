import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { NavbarComponent } from './navbar';

describe('NavbarComponent', () => {
  const authService = {
    logout: vi.fn(),
    isAuthenticated: vi.fn(() => false),
    currentUser: vi.fn(() => null),
  };

  beforeEach(async () => {
    authService.logout.mockClear();
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('renders the primary navigation and guest actions', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.desktop-nav .nav-entry').length).toBe(7);
    expect(fixture.nativeElement.querySelector('.login-button')?.textContent).toContain('ĐĂNG NHẬP');
    expect(fixture.nativeElement.querySelector('.appointment-button')?.getAttribute('href')).toBe('/dat-lich');
  });

  it('sends searches and category links to their matching routes', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const component = fixture.componentInstance;

    component.searchTerm = 'thức ăn';
    component.submitSearch();
    expect(navigate).toHaveBeenLastCalledWith(['/search'], { queryParams: { q: 'thức ăn' } });

    component.navigateCategory('Thức ăn');
    expect(navigate).toHaveBeenLastCalledWith(['/san-pham'], { queryParams: { category: 'Thức ăn' } });
  });

  it('clears the session and returns home on logout', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    const router = TestBed.inject(Router);
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture.componentInstance.logout();

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });
});
