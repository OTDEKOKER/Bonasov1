/**
 * BONASO Data Portal - API Client
 * 
 * This is the base HTTP client for communicating with your Django backend.
 * Configure NEXT_PUBLIC_API_URL in your environment variables.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Get the JWT access token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * Get the JWT refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

/**
 * Set JWT tokens after login
 */
export function setAuthTokens(access: string, refresh: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }
}

/**
 * Clear all auth tokens on logout
 */
export function clearAuthTokens(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

// Legacy exports for compatibility
export const setAuthToken = (token: string) => setAuthTokens(token, '');
export const clearAuthToken = clearAuthTokens;

/**
 * Base fetch wrapper with authentication and error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    if (!response.ok) {
      throw {
        message: 'Server error',
        status: response.status,
      } as ApiError;
    }
    return { data: {} as T, status: response.status };
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw {
      message: data.detail || data.message || 'An error occurred',
      status: response.status,
      errors: data.errors || data,
    } as ApiError;
  }
  
  return { data, status: response.status };
}

/**
 * API Client with typed methods
 */
export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) => {
    const url = params 
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint;
    return apiRequest<T>(url, { method: 'GET' });
  },
  
  post: <T>(endpoint: string, body?: unknown) => 
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};

export default api;
