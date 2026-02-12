/**
 * BONASO Data Portal - API Client
 * 
 * This is the base HTTP client for communicating with your Django backend.
 * Configure NEXT_PUBLIC_API_URL in your environment variables.
 */
import { enqueueMutation, scheduleMutationSync } from '@/lib/offline/mutation-queue';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
  offlineQueued?: boolean;
  queuedId?: number;
}

export type ApiError = Error & {
  status: number;
  errors?: unknown;
};

function makeApiError(message: string, status: number, errors?: unknown): ApiError {
  const err = new Error(message) as ApiError;
  err.name = 'ApiError';
  err.status = status;
  err.errors = errors;
  return err;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const NON_QUEUEABLE_ENDPOINT_PREFIXES = [
  '/users/request-token/',
  '/users/token/refresh/',
  '/users/logout/',
  '/manage/users/set_password/',
  '/manage/users/reset_password/',
  '/manage/users/reset_password_confirm/',
  '/users/admin-reset-password/',
];

function canQueueOfflineMutation(endpoint: string, method: string): boolean {
  if (!MUTATION_METHODS.has(method.toUpperCase())) return false;
  return !NON_QUEUEABLE_ENDPOINT_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

function headersToRecord(headers: HeadersInit): Record<string, string> {
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  if (Array.isArray(headers)) {
    const out: Record<string, string> = {};
    for (const [key, value] of headers) {
      out[String(key)] = String(value);
    }
    return out;
  }

  return Object.fromEntries(
    Object.entries(headers as Record<string, string>).map(([key, value]) => [key, String(value)]),
  );
}

function parseQueuedData<T>(body: BodyInit | null | undefined): T {
  if (typeof body !== 'string') return {} as T;
  try {
    return JSON.parse(body) as T;
  } catch {
    return {} as T;
  }
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
 * Refresh the access token using the refresh token (no recursion into apiRequest).
 */
async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/users/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      clearAuthTokens();
      return null;
    }

    const data = await response.json();
    if (!data?.access) {
      clearAuthTokens();
      return null;
    }

    setAuthTokens(data.access, refresh);
    return data.access as string;
  } catch {
    clearAuthTokens();
    return null;
  }
}

/**
 * Base fetch wrapper with authentication and error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retry: boolean = true
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const requestUrl = `${API_BASE_URL}${endpoint}`;

  const doFetch = async (overrideHeaders?: HeadersInit) =>
    fetch(requestUrl, {
      ...options,
      headers: overrideHeaders ?? headers,
    });

  let response: Response;
  try {
    response = await doFetch();
  } catch (err) {
    if (
      typeof window !== 'undefined' &&
      canQueueOfflineMutation(endpoint, method) &&
      (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError'))
    ) {
      const queuedId = await enqueueMutation({
        url: requestUrl,
        method: method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        headers: headersToRecord(headers),
        body: typeof options.body === 'string' ? options.body : undefined,
      });
      await scheduleMutationSync();

      return {
        data: parseQueuedData<T>(options.body),
        message: 'Request queued for sync when back online.',
        status: 202,
        offlineQueued: true,
        queuedId,
      };
    }

    // Browser network errors (DNS, refused, offline) throw TypeError("Failed to fetch").
    const debugUrl =
      typeof window !== 'undefined' && requestUrl.startsWith('/')
        ? `${window.location.origin}${requestUrl}`
        : requestUrl;
    throw makeApiError(
      `Failed to fetch ${debugUrl}`,
      0,
      err instanceof Error ? { name: err.name, message: err.message } : err,
    );
  }

  if (
    response.status === 401 &&
    retry &&
    !endpoint.startsWith('/users/token/refresh/') &&
    !endpoint.startsWith('/users/request-token/')
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders: HeadersInit = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };
      response = await doFetch(retryHeaders);
    }
  }
  
  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    if (!response.ok) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch {}
      throw makeApiError(bodyText || 'Server error', response.status);
    }
    return { data: {} as T, status: response.status };
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 401) {
      const detail = data?.detail || data?.message || '';
      const code = data?.code || data?.errors?.code;
      const tokenInvalid =
        code === 'token_not_valid' ||
        String(detail).toLowerCase().includes('token not valid');
      if (tokenInvalid) {
        clearAuthTokens();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    throw makeApiError(
      data?.detail || data?.message || 'An error occurred',
      response.status,
      data?.errors || data,
    );
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
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  
  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};

export default api;
