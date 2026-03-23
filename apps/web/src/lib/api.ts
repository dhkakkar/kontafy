import { createClient } from "@/lib/supabase/client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (typeof window !== "undefined") {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          headers["Authorization"] = `Bearer ${data.session.access_token}`;
        }
      } catch {
        // Silently fail if Supabase is not available
      }

      // Add organization ID from persisted auth store
      try {
        const stored = localStorage.getItem("kontafy-auth");
        if (stored) {
          const parsed = JSON.parse(stored);
          const orgId = parsed?.state?.organization?.id;
          if (orgId) {
            headers["X-Org-Id"] = orgId;
          }
        }
      } catch {
        // Silently fail
      }
    }

    return headers;
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(path, params);
    const authHeaders = await this.getAuthHeaders();

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...authHeaders,
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: "An error occurred",
      }));
      // API returns { success: false, error: { code, message, ... } }
      const errorMessage =
        error?.error?.message || error?.message || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: "GET", params });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE_URL);
