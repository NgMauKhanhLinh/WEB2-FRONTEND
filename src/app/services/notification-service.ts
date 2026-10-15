import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AuthService } from './auth-service';

export interface UserNotification {
  id: string;
  type: string;
  content: string;
  title: string;
  searchableText: string;
  createdAt: string;
  read: boolean;
  petName: string;
  icon: string;
}

interface ApiEnvelope<T> {
  EC?: number;
  EM?: string;
  DT?: T;
}

const API_BASE = 'http://localhost:8080/api/v1';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  getNotifications(status = 'all', search = ''): Observable<UserNotification[]> {
    const params = new HttpParams().set('status', status).set('search', search);
    return this.http.get<unknown>(`${API_BASE}/notifications`, {
      params,
      headers: this.headers(),
      withCredentials: true,
    }).pipe(
      map((response) => {
        const payload = this.unwrap<unknown>(response);
        const items = Array.isArray(payload)
          ? payload
          : payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>)['notifications'])
            ? (payload as { notifications: unknown[] }).notifications
            : null;
        if (!items) throw new Error('Dữ liệu thông báo không hợp lệ.');
        return items.map((value) => {
          const item = value as Record<string, unknown>;
          const pet = item['pet'] && typeof item['pet'] === 'object' ? item['pet'] as Record<string, unknown> : {};
          return {
            id: String(item['notification_id'] ?? item['id'] ?? ''),
            type: String(item['notification_type'] ?? item['type'] ?? 'system'),
            content: String(item['content'] ?? ''),
            title: String(item['title'] ?? ''),
            searchableText: String(item['searchable_text'] ?? item['content'] ?? item['title'] ?? ''),
            createdAt: String(item['created_at'] ?? ''),
            read: Boolean(item['is_read'] ?? item['read']),
            petName: String(pet['pet_name'] ?? ''),
            icon: String(pet['profile_image_url'] ?? (item['notification_type'] === 'appointment' ? '/assets/images/notification/icon-calendar.svg' : '/assets/images/notification/icon-note.svg')),
          };
        });
      }),
    );
  }

  markAsRead(notificationId: string): Observable<unknown> {
    return this.http.patch<unknown>(`${API_BASE}/notifications/${encodeURIComponent(notificationId)}/read`, {}, {
      headers: this.headers(),
      withCredentials: true,
    }).pipe(map((response) => this.unwrap(response)));
  }

  markAllAsRead(): Observable<unknown> {
    return this.http.patch<unknown>(`${API_BASE}/notifications/read-all`, {}, {
      headers: this.headers(),
      withCredentials: true,
    }).pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T = unknown>(response: unknown): T {
    if (response && typeof response === 'object' && 'EC' in response) {
      const envelope = response as ApiEnvelope<T>;
      if (envelope.EC !== undefined && envelope.EC !== 0) throw new Error(envelope.EM || 'Không thể tải thông báo.');
      if (envelope.DT === undefined) throw new Error('Máy chủ trả về dữ liệu trống.');
      return envelope.DT;
    }
    return response as T;
  }

  private headers(): HttpHeaders {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = this.auth.getAccessToken();
    return token ? headers.set('Authorization', `Bearer ${token}`) : headers;
  }
}
