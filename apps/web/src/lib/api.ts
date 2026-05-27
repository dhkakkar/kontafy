import { createClient } from "@/lib/auth/client";

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
      const payload = await response.json().catch(() => ({
        message: "An error occurred",
      }));
      // API returns { success: false, error: { code, message, details, ... } }
      // We need callers to be able to render inline field errors, so attach
      // the structured `code` and `details` (notably `details.field`) to the
      // Error instance — without this, fields like the COA add-account
      // modal can only show a generic toast and look silent on duplicate
      // code / name conflicts.
      const apiError = payload?.error || {};
      const message =
        apiError.message || payload?.message || `HTTP ${response.status}`;
      const err = new Error(message) as Error & {
        status?: number;
        code?: string;
        details?: any;
        field?: string;
      };
      err.status = response.status;
      err.code = apiError.code;
      err.details = apiError.details;
      err.field = apiError.details?.field;
      throw err;
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

  /**
   * Fetch a binary response (xlsx, pdf, csv...) and return it as a Blob plus
   * the server-supplied filename. Callers feed the blob into a temporary
   * anchor to trigger the browser download.
   *
   * Kept separate from `request()` because that path always JSON-decodes the
   * response and would mangle a binary payload.
   */
  async download(
    path: string,
    params?: Record<string, string>,
  ): Promise<{ blob: Blob; filename: string }> {
    const url = this.buildUrl(path, params);
    const authHeaders = await this.getAuthHeaders();
    // Strip the JSON Content-Type from auth headers since this is a GET.
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(authHeaders as Record<string, string>)) {
      if (k.toLowerCase() !== "content-type") headers[k] = v;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      // Try to parse a JSON error body (the API uses the same shape on every
      // failed request) so the caller can show a useful message.
      const payload = await response.json().catch(() => ({
        message: "Download failed",
      }));
      const apiError = payload?.error || {};
      throw new Error(
        apiError.message || payload?.message || `HTTP ${response.status}`,
      );
    }

    // The backend sets Content-Disposition with the suggested filename. Pull
    // it out so the saved file matches what the API picked.
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/.exec(disposition);
    const filename = match ? decodeURIComponent(match[1]) : "download.bin";
    const blob = await response.blob();
    return { blob, filename };
  }
}

export const api = new ApiClient(API_BASE_URL);
