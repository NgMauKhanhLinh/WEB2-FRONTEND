import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertComponent } from './alert';

describe('AlertComponent', () => {
  let fixture: ComponentFixture<AlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertComponent);
    fixture.componentRef.setInput('message', 'Đã lưu thành công');
    fixture.detectChanges();
  });

  it('renders the message and optional description', () => {
    fixture.componentRef.setInput('description', 'Thông tin đã được cập nhật.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Đã lưu thành công');
    expect(fixture.nativeElement.textContent).toContain('Thông tin đã được cập nhật.');
  });

  it('emits the close event when dismissed', () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    fixture.nativeElement.querySelector('button').click();

    expect(closed).toHaveBeenCalledOnce();
  });
});
