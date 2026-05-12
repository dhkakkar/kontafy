/**
 * Browser auth client. Same call shape as the previous Supabase client so
 * existing call sites (signInWithPassword, signUp, signOut, getSession,
 * getUser) work unchanged. Tokens are persisted in cookies so the Next.js
 * middleware can gate routes on the server side.
 */

const ACCESS_COOKIE = "kontafy-access";
const REFRESH_COOKIE = "kontafy-refresh";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/v1";

const ACCESS_COOKIE_MAX_AGE = 60 * 60; // 1 hour, matches access JWT TTL
const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

interface SessionData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email: string; phone: string | null };
}

interface AuthError {
  message: string;
}

function persistSession(s: SessionData) {
  writeCookie(ACCESS_COOKIE, s.access_token, ACCESS_COOKIE_MAX_AGE);
  writeCookie(REFRESH_COOKIE, s.refresh_token, REFRESH_COOKIE_MAX_AGE);
}

function clearSession() {
  clearCookie(ACCESS_COOKIE);
  clearCookie(REFRESH_COOKIE);
}

export function createClient() {
  return {
    auth: {
      async signInWithPassword({
        email,
        password,
      }: {
        email: string;
        password: string;
      }): Promise<{
        data: { user: SessionData["user"] | null; session: SessionData | null };
        error: AuthError | null;
      }> {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json?.success) {
            return {
              data: { user: null, session: null },
              error: {
                message:
                  json?.error?.message ||
                  json?.message ||
                  "Invalid email or password",
              },
            };
          }
          const session = json.data as SessionData;
          persistSession(session);
          return { data: { user: session.user, session }, error: null };
        } catch {
          return {
            data: { user: null, session: null },
            error: { message: "Network error. Please try again." },
          };
        }
      },

      async signUp({
        email,
        password,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: Record<string, unknown> };
      }): Promise<{
        data: { user: { id: string; email: string } | null; session: null };
        error: AuthError | null;
      }> {
        try {
          const meta = options?.data as
            | { full_name?: string; name?: string }
            | undefined;
          const res = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password,
              name: meta?.full_name || meta?.name,
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json?.success) {
            return {
              data: { user: null, session: null },
              error: {
                message:
                  json?.error?.message ||
                  json?.message ||
                  "Registration failed",
              },
            };
          }
          return {
            data: { user: json.data.user, session: null },
            error: null,
          };
        } catch {
          return {
            data: { user: null, session: null },
            error: { message: "Network error. Please try again." },
          };
        }
      },

      async signOut() {
        const access_token = readCookie(ACCESS_COOKIE);
        const refresh_token = readCookie(REFRESH_COOKIE);
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(access_token
                ? { Authorization: `Bearer ${access_token}` }
                : {}),
            },
            body: JSON.stringify({ refresh_token }),
          });
        } catch {
          // best-effort; clear local tokens regardless
        }
        clearSession();
        return { error: null };
      },

      async getSession() {
        const access_token = readCookie(ACCESS_COOKIE);
        if (!access_token) {
          return { data: { session: null }, error: null };
        }
        return {
          data: {
            session: {
              access_token,
              refresh_token: readCookie(REFRESH_COOKIE) || "",
            },
          },
          error: null,
        };
      },

      async getUser() {
        const access_token = readCookie(ACCESS_COOKIE);
        if (!access_token) {
          return { data: { user: null }, error: null };
        }
        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json?.success) {
            return {
              data: { user: null },
              error: { message: "Unauthorized" },
            };
          }
          return { data: { user: json.data }, error: null };
        } catch {
          return {
            data: { user: null },
            error: { message: "Network error" },
          };
        }
      },
    },
  };
}
