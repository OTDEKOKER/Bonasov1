/**
 * Authentication Service
 * 
 * Handles login, logout, password reset, and user session management.
 * Endpoints match your Django backend with Simple JWT.
 */

import { api, setAuthTokens, clearAuthTokens, getRefreshToken } from '../client';
import type { User } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface JWTTokenResponse {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user?: User;
}

export interface PasswordChangeRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  uid: string;
  token: string;
  new_password: string;
}

export interface AdminResetPasswordRequest {
  user_id: number;
  new_password: string;
}

// ============================================================================
// Auth Service
// ============================================================================

export const authService = {
  /**
   * Login with username/email and password
   * Django endpoint: POST /api/request-token/
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data } = await api.post<JWTTokenResponse>('/request-token/', credentials);
    setAuthTokens(data.access, data.refresh);
    
    // Fetch user info after login
    try {
      const user = await this.getCurrentUser();
      return { ...data, user };
    } catch {
      return data;
    }
  },

  /**
   * Refresh the access token
   * Django endpoint: POST /api/token/refresh/
   */
  async refreshToken(): Promise<string> {
    const refresh = getRefreshToken();
    if (!refresh) throw new Error('No refresh token available');
    
    const { data } = await api.post<{ access: string }>('/token/refresh/', { refresh });
    setAuthTokens(data.access, refresh);
    return data.access;
  },

  /**
   * Logout current user
   * Django endpoint: POST /api/logout/
   */
  async logout(): Promise<void> {
    try {
      await api.post('/logout/');
    } finally {
      clearAuthTokens();
    }
  },

  /**
   * Get current authenticated user
   * Django endpoint: GET /api/me/
   */
  async getCurrentUser(): Promise<User> {
    const { data } = await api.get<User>('/me/');
    return data;
  },

  /**
   * Create a new user (registration)
   * Django endpoint: POST /api/create-user/
   */
  async createUser(userData: Partial<User> & { password: string }): Promise<User> {
    const { data } = await api.post<User>('/create-user/', userData);
    return data;
  },

  /**
   * Admin reset password for a user
   * Django endpoint: POST /api/admin-reset-password/
   */
  async adminResetPassword(request: AdminResetPasswordRequest): Promise<void> {
    await api.post('/admin-reset-password/', request);
  },

  /**
   * Change password for logged in user (via Djoser)
   * Django endpoint: POST /api/manage/users/set_password/
   */
  async changePassword(request: PasswordChangeRequest): Promise<void> {
    await api.post('/manage/users/set_password/', {
      current_password: request.old_password,
      new_password: request.new_password,
      re_new_password: request.confirm_password,
    });
  },

  /**
   * Request password reset email (via Djoser)
   * Django endpoint: POST /api/manage/users/reset_password/
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    await api.post('/manage/users/reset_password/', request);
  },

  /**
   * Confirm password reset with token (via Djoser)
   * Django endpoint: POST /api/manage/users/reset_password_confirm/
   */
  async confirmPasswordReset(request: PasswordResetConfirm): Promise<void> {
    await api.post('/manage/users/reset_password_confirm/', request);
  },

  /**
   * Test connection to backend
   * Django endpoint: GET /api/test-connection/
   */
  async testConnection(): Promise<boolean> {
    try {
      await api.get('/test-connection/');
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if user is authenticated (client-side only)
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access_token');
  },
};

export default authService;
