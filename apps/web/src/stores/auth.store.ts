import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  avatarUrl?: string;
}

interface Organization {
  id: string;
  name: string;
  gstin?: string;
  logoUrl?: string;
  financialYearStart: number; // month 1-12
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isSuperadmin: boolean;
  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  setSuperadmin: (isSuperadmin: boolean) => void;
  login: (user: User, org: Organization, isSuperadmin?: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      isAuthenticated: false,
      isSuperadmin: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setOrganization: (organization) => set({ organization }),
      setSuperadmin: (isSuperadmin) => set({ isSuperadmin }),
      login: (user, organization, isSuperadmin = false) =>
        set({ user, organization, isAuthenticated: true, isSuperadmin }),
      logout: () =>
        set({ user: null, organization: null, isAuthenticated: false, isSuperadmin: false }),
    }),
    {
      name: "kontafy-auth",
    }
  )
);
