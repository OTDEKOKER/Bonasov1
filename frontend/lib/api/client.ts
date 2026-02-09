/**
 * BONASO Data Portal - API Client
 * 
 * This is the base HTTP client for communicating with your Django backend.
 * Configure NEXT_PUBLIC_API_URL in your environment variables.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
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

