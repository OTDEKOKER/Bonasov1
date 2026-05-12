/**
 * BONASO Data Portal - API Client
 * 
 * This is the base HTTP client for communicating with your Django backend.
 * Configure NEXT_PUBLIC_API_URL (or NEXT_PUBLIC_API_BASE_URL) in your environment variables.
 */
import { enqueueMutation, scheduleMutationSync } from '@/lib/offline/mutation-queue';

function normalizeApiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return '/api';
  if (trimmed.startsWith('/')) return trimmed;

  try {
    const url = new URL(trimmed);
    const normalizedPath = url.pathname.replace(/\/+$/, '');
    const isLocalDevHost = url.hostname === '127.0.0.1' || url.hostname === 'localhost';

    if (isLocalDevHost && (!normalizedPath || normalizedPath === '/')) {
      url.pathname = '/api';
      return url.toString().replace(/\/+$/, '');
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
);
const API_REQUEST_TIMEOUT_MS = 15_000;
type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
};

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

function extractFirstErrorMessage(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const nested = extractFirstErrorMessage(item);
      if (nested) return nested;
    }
    return null;
  }

  if (!isObject(payload)) return null;

  const directDetail = typeof payload.detail === 'string' ? payload.detail.trim() : '';
  if (directDetail) return directDetail;

  const directMessage = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (directMessage) return directMessage;

  for (const [key, value] of Object.entries(payload)) {
    const nested = extractFirstErrorMessage(value);
    if (!nested) continue;
    if (key === 'non_field_errors' || key === 'errors') return nested;
    if (key === 'detail' || key === 'message') return nested;
    return `${key}: ${nested}`;
  }

  return null;
}

function extractHtmlTitle(payload: string): string | null {
  const match = payload.match(/<title>([^<]+)<\/title>/i);
  return match?.[1]?.trim() || null;
}

function isHtmlPayload(payload: string): boolean {
  const trimmed = payload.trim();
  return trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html');
}

function formatUnexpectedHtmlError(bodyText: string): string {
  const title = extractHtmlTitle(bodyText);
  const missingApiEndpointMatch = title?.match(/^Page not found at (\/api\/.+)$/i);

  if (
    title?.includes('/users/') &&
    (API_BASE_URL.startsWith('http://127.0.0.1') || API_BASE_URL.startsWith('http://localhost')) &&
    !/\/api$/i.test(API_BASE_URL)
  ) {
    return 'The API base URL is missing /api. Set NEXT_PUBLIC_API_URL to http://127.0.0.1:8000/api and restart the dev server.';
  }

  if (missingApiEndpointMatch?.[1]) {
    return `This endpoint is not available on this backend: ${missingApiEndpointMatch[1]}`;
  }

  if (title) {
    return `The server returned an HTML error page: ${title}`;
  }

  return 'The server returned an unexpected HTML error page.';
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
    message = payload.message || extractFirstErrorMessage(payload.errors) || message;
    errors = payload.errors ?? null;
    meta = payload.meta ?? null;
  } else if (isObject(payload)) {
    const detail = typeof payload.detail === 'string' ? payload.detail : undefined;
    const msg = typeof payload.message === 'string' ? payload.message : undefined;
    message = detail || msg || extractFirstErrorMessage(payload) || message;
    errors = 'errors' in payload ? payload.errors : payload;
  } else if (typeof payload === 'string' && payload.trim()) {
    message = payload;
    errors = payload;
  } else if (Array.isArray(payload) && payload.length > 0) {
    message = extractFirstErrorMessage(payload) || message;
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

const AUTH_HEADER_EXCLUDED_ENDPOINT_PREFIXES = [
  '/users/request-token/',
  '/users/token/refresh/',
  '/manage/users/reset_password/',
  '/manage/users/reset_password_confirm/',
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

function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isPrivateIpv4Host(hostname: string): boolean {
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;

  const match = hostname.match(/^172\.(\d+)\.\d+\.\d+$/);
  if (!match) return false;

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function buildNetworkErrorMessage(requestUrl: string, error: Error): string {
  const timeoutMessage = error.message.includes('timed out');

  try {
    const url = new URL(requestUrl);
    if (
      typeof window !== 'undefined' &&
      isPrivateIpv4Host(url.hostname) &&
      isLocalhostHost(window.location.hostname)
    ) {
      return `Cannot reach ${url.origin}. The frontend is configured to use a private LAN IP, but this browser is running locally. If the backend is on this machine, set NEXT_PUBLIC_API_URL to http://127.0.0.1:8000/api and restart the dev server.`;
    }

    if (timeoutMessage) {
      return `Timed out reaching ${url.origin}. Check that the backend server is running and that NEXT_PUBLIC_API_URL points to a reachable host.`;
    }
  } catch {
    if (timeoutMessage) {
      return `Timed out reaching ${requestUrl}. Check that the backend server is running and that NEXT_PUBLIC_API_URL points to a reachable host.`;
    }
  }

  return `Failed to fetch ${requestUrl}`;
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

function shouldAttachAuthHeader(endpoint: string): boolean {
  return !AUTH_HEADER_EXCLUDED_ENDPOINT_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

function applyAuthHeader(endpoint: string, headers: Headers): Headers {
  if (!shouldAttachAuthHeader(endpoint)) {
    headers.delete('Authorization');
    return headers;
  }

  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

function buildRequestConfig(endpoint: string, options: RequestInit) {
  const requestUrl = resolveApiUrl(endpoint);
  const headers = applyAuthHeader(endpoint, prepareHeaders(options));
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
  options: ApiRequestOptions = {},
  retry: boolean = true
): Promise<Response> {
  const { timeoutMs, ...requestOptions } = options;
  const { requestUrl, headers } = buildRequestConfig(endpoint, requestOptions);
  const requestTimeoutMs = timeoutMs ?? API_REQUEST_TIMEOUT_MS;

  const doFetch = async (overrideHeaders?: HeadersInit) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<Response>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Request timed out after ${Math.round(requestTimeoutMs / 1000)}s`));
      }, requestTimeoutMs);
    });

    try {
      const fetchPromise = fetch(requestUrl, {
        ...requestOptions,
        headers: overrideHeaders ?? headers,
      });
      return await Promise.race([fetchPromise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

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
  options: ApiRequestOptions = {},
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
      fallbackMessage:
        err instanceof Error ? buildNetworkErrorMessage(debugUrl, err) : `Failed to fetch ${debugUrl}`,
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
        payload: isHtmlPayload(bodyText) ? { detail: formatUnexpectedHtmlError(bodyText) } : bodyText || undefined,
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
      const shouldResetSession = shouldAttachAuthHeader(endpoint) && (tokenInvalid || response.status === 401);
      if (shouldResetSession) {
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
  get: <T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | null | undefined>,
    requestOptions?: { timeoutMs?: number },
  ) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        const normalized = String(value);
        if (!normalized) return;
        searchParams.append(key, normalized);
      });
    }

    const query = searchParams.toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return apiRequest<T>(url, { method: 'GET', timeoutMs: requestOptions?.timeoutMs });
  },
  
  post: <T>(
    endpoint: string,
    body?: unknown,
    requestOptions?: { timeoutMs?: number },
  ) => 
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      timeoutMs: requestOptions?.timeoutMs,
    }),
  
  put: <T>(
    endpoint: string,
    body?: unknown,
    requestOptions?: { timeoutMs?: number },
  ) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      timeoutMs: requestOptions?.timeoutMs,
    }),
  
  patch: <T>(
    endpoint: string,
    body?: unknown,
    requestOptions?: { timeoutMs?: number },
  ) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      timeoutMs: requestOptions?.timeoutMs,
    }),
  
  delete: <T>(endpoint: string, requestOptions?: { timeoutMs?: number }) =>
    apiRequest<T>(endpoint, { method: 'DELETE', timeoutMs: requestOptions?.timeoutMs }),
};

export default api;
