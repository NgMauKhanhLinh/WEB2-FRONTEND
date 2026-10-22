import { computed, Injectable, signal } from '@angular/core';
import {
  AUTH_VIEW_CONTENT,
  AuthScreen,
  AuthViewModel,
} from './auth-view.model';

@Injectable()
export class AuthViewService {
  private readonly currentScreen = signal<AuthScreen>('login');

  readonly screen = this.currentScreen.asReadonly();
  readonly isSplitScreen = computed(
    () => this.currentScreen() === 'login' || this.currentScreen() === 'register',
  );
  readonly viewModel: AuthViewModel = {
    assets: {
      logo: this.assetPath('auth/logo_text.png'),
      loginArtwork: this.assetPath('auth/login-dog.png'),
      registerArtwork: this.assetPath('auth/register-dog.png'),
      recoveryArtwork: this.assetPath('auth/dog_search.png'),
      successArtwork: this.assetPath('auth/success-dog.png'),
    },
    ...AUTH_VIEW_CONTENT,
  };

  openScreen(screen: AuthScreen): void {
    this.currentScreen.set(screen);
  }

  screenContent(screen: AuthScreen, recipient = ''): AuthViewModel['screens'][AuthScreen] {
    const content = AUTH_VIEW_CONTENT.screens[screen];
    return {
      ...content,
      description: content.description.replace('{{recipient}}', recipient),
    };
  }

  private assetPath(path: string): string {
    return `/assets/images/${path}`;
  }
}
