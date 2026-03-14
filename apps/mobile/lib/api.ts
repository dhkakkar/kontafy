import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, getOrgId, clearTokens, saveTokens } from './auth';

/**
 * Base URL for the Kontafy API.
 * Update this when deploying to production.
 */
const BASE_URL = __DEV__
  ? 'http://localhost:3001'
  : 'https://api.kontafy.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor: attach access token and org-id header.
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const orgId = await getOrgId();
    if (orgId) {
      config.headers['x-org-id'] = orgId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Response interceptor: handle 401 by attempting token refresh.
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = await import('./auth');
        const newTokens = await refreshToken();
        if (newTokens) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
          return api(originalRequest);
        }
      } catch {
        await clearTokens();
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// ─── Typed API helpers ──────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, any>;
}
