import * as SecureStore from 'expo-secure-store';
import api from './api';

const KEYS = {
  ACCESS_TOKEN: 'kontafy_access_token',
  REFRESH_TOKEN: 'kontafy_refresh_token',
  ORG_ID: 'kontafy_org_id',
  USER: 'kontafy_user',
} as const;

// ─── Token storage ──────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function getRefreshTokenValue(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function saveTokens(accessToken: string, refreshTokenVal: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshTokenVal);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.ORG_ID);
  await SecureStore.deleteItemAsync(KEYS.USER);
}

// ─── Org ID ─────────────────────────────────────────────────────────

export async function getOrgId(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ORG_ID);
}

export async function setOrgId(orgId: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.ORG_ID, orgId);
}

// ─── User cache ─────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  organizations: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export async function getCachedUser(): Promise<UserProfile | null> {
  const raw = await SecureStore.getItemAsync(KEYS.USER);
  return raw ? JSON.parse(raw) : null;
}

export async function setCachedUser(user: UserProfile): Promise<void> {
  await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
}

// ─── Auth actions ───────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<{ user: UserProfile; access_token: string; refresh_token: string }> {
  const { data } = await api.post('/auth/login', { email, password });
  const result = data.data ?? data;

  await saveTokens(result.access_token, result.refresh_token);

  // Fetch user profile after login
  const profile = await fetchProfile();
  if (profile && profile.organizations?.length > 0) {
    await setOrgId(profile.organizations[0].id);
  }

  return { ...result, user: profile };
}

export async function signup(
  email: string,
  password: string,
  name?: string,
): Promise<{ user: UserProfile; access_token: string; refresh_token: string }> {
  const { data } = await api.post('/auth/signup', { email, password, name });
  const result = data.data ?? data;

  await saveTokens(result.access_token, result.refresh_token);

  const profile = await fetchProfile();
  return { ...result, user: profile };
}

export async function fetchProfile(): Promise<UserProfile> {
  const { data } = await api.get('/auth/me');
  const profile: UserProfile = data.data ?? data;
  await setCachedUser(profile);
  return profile;
}

export async function refreshToken(): Promise<{ access_token: string; refresh_token: string } | null> {
  const rt = await getRefreshTokenValue();
  if (!rt) return null;

  const { data } = await api.post('/auth/refresh', { refresh_token: rt });
  const result = data.data ?? data;
  await saveTokens(result.access_token, result.refresh_token);
  return result;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // ignore errors on logout
  }
  await clearTokens();
}
