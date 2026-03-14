import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  login as authLogin,
  signup as authSignup,
  logout as authLogout,
  fetchProfile,
  getToken,
  getCachedUser,
  setOrgId,
  UserProfile,
} from './auth';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check for existing session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          // Try cached user first, then refresh
          const cached = await getCachedUser();
          if (cached) {
            setState({ user: cached, isLoading: false, isAuthenticated: true });
          }
          // Refresh in background
          try {
            const profile = await fetchProfile();
            setState({ user: profile, isLoading: false, isAuthenticated: true });
          } catch {
            // If refresh fails but we have cached, keep it
            if (!cached) {
              setState({ user: null, isLoading: false, isAuthenticated: false });
            }
          }
        } else {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
      } catch {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authLogin(email, password);
    setState({ user: result.user, isLoading: false, isAuthenticated: true });
  }, []);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    const result = await authSignup(email, password, name);
    setState({ user: result.user, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const switchOrganization = useCallback(async (orgId: string) => {
    await setOrgId(orgId);
    // Refresh profile to confirm
    const profile = await fetchProfile();
    setState((prev) => ({ ...prev, user: profile }));
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await fetchProfile();
    setState((prev) => ({ ...prev, user: profile }));
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, signup, logout, switchOrganization, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
