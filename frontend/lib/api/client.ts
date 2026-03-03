/**
 * BONASO Data Portal - API Client
 * 
 * This is the base HTTP client for communicating with your Django backend.
 * Configure NEXT_PUBLIC_API_URL in your environment variables.
 */
import { enqueueMutation, scheduleMutationSync } from '@/lib/offline/mutation-queue';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

type ApiMeta = Record<string, unknown>;

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta | null;
  message?: string | null;
  errors?: unknown | null;
  status: number;
  offlineQueued?: boolean;
  queuedId?: number;
}

export type ApiError = Error & {
  status: number;
  errors?: unknown;
  meta?: ApiMeta | null;
  response?: ApiResponse<null>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isApiEnvelope(value: unknown): value is ApiResponse<unknown> {
  if (!isObject(value)) return false;
  if (!('data' in value)) return false;
  return 'meta' in value || 'message' in value || 'errors' in value;
}

export function normalizeApiError(params: {
  status: number;
  payload?: unknown;
  fallbackMessage?: string;
}): ApiError {
  const { status, payload, fallbackMessage } = params;
  const payloadIsEnvelope = isApiEnvelope(payload);
  let message = fallbackMessage || 'Request failed';
  let errors: unknown = null;
  let meta: ApiMeta | null = null;

  if (payloadIsEnvelope) {
    message = payload.message || message;
    errors = payload.errors ?? null;
    meta = payload.meta ?? null;
  } else if (isObject(payload)) {
    const detail = typeof payload.detail === 'string' ? payload.detail : undefined;
    const msg = typeof payload.message === 'string' ? payload.message : undefined;
    message = detail || msg || message;
    errors = 'errors' in payload ? payload.errors : payload;
  } else if (typeof payload === 'string' && payload.trim()) {
    message = payload;
    errors = payload;
  } else if (Array.isArray(payload) && payload.length > 0) {
    errors = payload;
  }

  const err = new Error(message) as ApiError;
  err.name = 'ApiError';
  err.status = status;
  const resolvedErrors = errors ?? (payloadIsEnvelope ? null : payload ?? null);
  err.errors = resolvedErrors;
  err.meta = meta ?? null;
  err.response = {
    data: null,
    meta: meta ?? null,
    message,
    errors: resolvedErrors,
    status,
  };
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

function resolveApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  if (endpoint.startsWith(API_BASE_URL)) {
    return endpoint;
  }
  const base = API_BASE_URL;
  if (base.endsWith('/') && endpoint.startsWith('/')) {
    return `${base}${endpoint.slice(1)}`;
  }
  if (!base.endsWith('/') && !endpoint.startsWith('/')) {
    return `${base}/${endpoint}`;
  }
  return `${base}${endpoint}`;
}

function prepareHeaders(options: RequestInit): Headers {
  const headers = new Headers(options.headers || {});
  const hasContentType = headers.has('Content-Type');
  const body = options.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isStringBody = typeof body === 'string';
  if (!hasContentType && body && !isFormData && isStringBody) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

function applyAuthHeader(headers: Headers): Headers {
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

function buildRequestConfig(endpoint: string, options: RequestInit) {
  const requestUrl = resolveApiUrl(endpoint);
  const headers = applyAuthHeader(prepareHeaders(options));
  return { requestUrl, headers };
}

function normalizeApiResponse<T>(payload: unknown, status: number): ApiResponse<T> {
  if (isApiEnvelope(payload)) {
    return {
      data: (payload.data ?? null) as T,
      meta: (payload.meta ?? null) as ApiMeta | null,
      message: payload.message ?? null,
      errors: payload.errors ?? null,
      status,
    };
  }
  return {
    data: (payload ?? null) as T,
    meta: null,
    message: null,
    errors: null,
    status,
  };
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
 * Base fetch wrapper with authentication and token refresh
 */
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
  retry: boolean = true
): Promise<Response> {
  const { requestUrl, headers } = buildRequestConfig(endpoint, options);

  const doFetch = async (overrideHeaders?: HeadersInit) =>
    fetch(requestUrl, {
      ...options,
      headers: overrideHeaders ?? headers,
    });

  let response = await doFetch();
  if (
    response.status === 401 &&
    retry &&
    !endpoint.startsWith('/users/token/refresh/') &&
    !endpoint.startsWith('/users/request-token/')
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      response = await doFetch(retryHeaders);
    }
  }

  return response;
}

/**
 * Base API request wrapper with auth, offline support, and normalized responses
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retry: boolean = true
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const { requestUrl, headers } = buildRequestConfig(endpoint, options);

  let response: Response;
  try {
    response = await fetchWithAuth(endpoint, options, retry);
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
        meta: { queued: true },
        errors: null,
        status: 202,
        offlineQueued: true,
        queuedId,
      };
    }

    const debugUrl =
      typeof window !== 'undefined' && requestUrl.startsWith('/')
        ? `${window.location.origin}${requestUrl}`
        : requestUrl;
    throw normalizeApiError({
      status: 0,
      payload: err instanceof Error ? { name: err.name, message: err.message } : err,
      fallbackMessage: `Failed to fetch ${debugUrl}`,
    });
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    if (!response.ok) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch {}
      throw normalizeApiError({
        status: response.status,
        payload: bodyText || undefined,
        fallbackMessage: 'Server error',
      });
    }
    return normalizeApiResponse<T>(null, response.status);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      const detail = isObject(data)
        ? (data.detail as string | undefined) || (data.message as string | undefined)
        : '';
      const directCode = isObject(data) ? (data.code as string | undefined) : undefined;
      const nestedErrors = isObject(data) ? data.errors : undefined;
      const nestedCode = isObject(nestedErrors) ? (nestedErrors.code as string | undefined) : undefined;
      const code = directCode || nestedCode;
      const tokenInvalid =
        code === 'token_not_valid' ||
        String(detail || '').toLowerCase().includes('token not valid');
      if (tokenInvalid) {
        clearAuthTokens();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    throw normalizeApiError({
      status: response.status,
      payload: data,
      fallbackMessage: 'An error occurred',
    });
  }

  return normalizeApiResponse<T>(data, response.status);
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
