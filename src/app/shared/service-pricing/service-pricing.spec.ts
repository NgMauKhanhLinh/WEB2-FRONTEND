import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DEFAULT_PRICING, ServicePricingService } from './service-pricing.service';
import { ServicePricingComponent } from './service-pricing';

describe('ServicePricingComponent', () => {
  let fixture: ComponentFixture<ServicePricingComponent>;
  const pricingService = {
    getPricingMatrix: vi.fn(() => of(DEFAULT_PRICING)),
  };

  beforeEach(async () => {
    pricingService.getPricingMatrix.mockReset();
    pricingService.getPricingMatrix.mockReturnValue(of(DEFAULT_PRICING));
    await TestBed.configureTestingModule({
      imports: [ServicePricingComponent],
      providers: [{ provide: ServicePricingService, useValue: pricingService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ServicePricingComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  });

  it('loads all service price rows and filters by category', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('tbody tr').length).toBe(18);
    expect(element.textContent).toContain('Combo Tắm 11 bước');

    fixture.componentInstance.selectFilter('medical');
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr').length).toBe(6);
    expect(element.textContent).toContain('Khám & Điều trị');
    expect(element.textContent).not.toContain('Combo Tắm 11 bước');
  });

  it('keeps reference prices and announces API errors', () => {
    pricingService.getPricingMatrix.mockReturnValue(throwError(() => new Error('Không kết nối được máy chủ.')));
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Không kết nối được máy chủ.');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Tắm & Sấy khô');
  });

  it('emits close requests from the close button', () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.pricing-close')?.click();
    expect(closed).toHaveBeenCalledOnce();
  });
});
