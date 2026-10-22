import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.html',
  styleUrl: './alert.css',
})
export class AlertComponent {
  @Input() type: AlertType = 'info';
  @Input({ required: true }) message = '';
  @Input() description = '';
  @Input() dismissible = true;

  @Output() readonly closed = new EventEmitter<void>();

  dismiss(): void {
    this.closed.emit();
  }
}
