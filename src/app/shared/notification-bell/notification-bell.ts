import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth-service';
import { NotificationService, UserNotification } from '../../services/notification-service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBellComponent {
  private readonly auth = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isOpen = signal(false);
  readonly notifications = signal<UserNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  activeFilter = 'all';
  searchValue = '';
  private requestSequence = 0;

  get visibleNotifications(): UserNotification[] {
    const search = this.searchValue.trim().toLocaleLowerCase('vi');
    return this.notifications().filter((item) =>
      (this.activeFilter === 'all' || (this.activeFilter === 'unread' ? !item.read : item.read)) &&
      (!search || item.searchableText.toLocaleLowerCase('vi').includes(search)),
    );
  }

  toggle(): void {
    if (!this.isAuthenticated()) return;
    this.isOpen.update((open) => !open);
    if (this.isOpen()) this.loadNotifications();
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.loadNotifications();
  }

  setSearch(value: string): void {
    this.searchValue = value;
    this.loadNotifications();
  }

  markRead(notification: UserNotification): void {
    if (notification.read) return;
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications.update((items) => items.map((item) => item.id === notification.id ? { ...item, read: true } : item));
        this.unreadCount.update((count) => Math.max(0, count - 1));
      },
      error: (error: Error) => this.errorMessage.set(error.message),
    });
  }

  markAllRead(): void {
    if (!this.unreadCount()) return;
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((items) => items.map((item) => ({ ...item, read: true })));
        this.unreadCount.set(0);
      },
      error: (error: Error) => this.errorMessage.set(error.message),
    });
  }

  close(): void {
    this.isOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.close();
  }

  private loadNotifications(): void {
    const requestId = ++this.requestSequence;
    this.loading.set(true);
    this.errorMessage.set('');
    this.notificationService.getNotifications(this.activeFilter, this.searchValue).subscribe({
      next: (items) => {
        if (requestId !== this.requestSequence) return;
        this.notifications.set(items);
        this.loading.set(false);
        if (this.activeFilter === 'all' && !this.searchValue) {
          this.unreadCount.set(items.filter((item) => !item.read).length);
        }
      },
      error: (error: Error) => {
        if (requestId !== this.requestSequence) return;
        this.errorMessage.set(error.message);
        this.loading.set(false);
      },
    });
  }
}
