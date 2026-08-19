import { 
  AdminUser, UserCustomPricing, AdminRuntimePlan, CyberModule, 
  AdminOrder, AdminLicense, AdminSession, AdminActivityLog, 
  AdminOverviewStats, SystemSettingsData, UserProfile 
} from '../types';
import { extractErrorMessage } from '../utils/errorMessage';

/**
 * Resolves the API Base URL dynamically.
 * Priority:
 * 1. VITE_API_BASE_URL / VITE_API_URL / VITE_BACKEND_URL (for decoupled/external deployments)
 * 2. Empty string '' (for unified full-stack deployments where the backend serves static frontend assets)
 */
export function getApiBaseUrl(): string {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const envUrl = (
    (metaEnv ? (
      metaEnv.VITE_API_BASE_URL ||
      metaEnv.VITE_API_URL ||
      metaEnv.VITE_BACKEND_URL ||
      ''
    ) : '')
  ).trim();

  return envUrl.replace(/\/+$/, '');
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('aegis_admin_token') || localStorage.getItem('aegis_auth_token');
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Robust JSON Fetcher
 * Safely parses server responses, extracts human-readable messages, supports credentials/cookies,
 * and outputs sanitized development/production network diagnostics.
 */
async function safeFetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resolvedUrl = resolveApiUrl(path);
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Guarantees cookies and cross-origin credentials are sent
  };

  const startMs = Date.now();
  let res: Response;
  try {
    res = await fetch(resolvedUrl, fetchOptions);
  } catch (netErr: any) {
    const friendlyNetMsg = extractErrorMessage(netErr, 'Unable to reach the security server. Check network or CORS configuration.');
    console.warn(`[AEGIS DIAGNOSTIC] ❌ NETWORK/CORS FAILURE: ${options.method || 'GET'} ${resolvedUrl}`, {
      error: friendlyNetMsg,
      resolvedUrl,
      durationMs: Date.now() - startMs,
    });
    throw new Error(`Connection error: ${friendlyNetMsg}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    const rawText = await res.text();
    console.warn(`[AEGIS DIAGNOSTIC] ⚠️ NON-JSON RESPONSE: ${options.method || 'GET'} ${resolvedUrl}`, {
      status: res.status,
      statusText: res.statusText,
      contentType,
      bodyPreview: rawText.slice(0, 160),
    });

    if (!res.ok) {
      throw new Error(`Security server responded with error (${res.status} ${res.statusText || 'Error'})`);
    }
    throw new Error(`Unexpected non-JSON response from server (${contentType || 'text/html'})`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (jsonErr: any) {
    console.error(`[AEGIS DIAGNOSTIC] ❌ JSON PARSE ERROR: ${resolvedUrl}`, jsonErr);
    throw new Error('Malformed security payload received from gateway');
  }

  // Diagnostic log for successful or handled response (NO passwords, tokens, or cookies logged)
  console.log(`[AEGIS DIAGNOSTIC] ✅ ${options.method || 'GET'} ${resolvedUrl}`, {
    status: res.status,
    contentType,
    success: data?.success ?? res.ok,
    sanitizedMessage: typeof data?.message === 'string' ? data.message : undefined,
    durationMs: Date.now() - startMs,
  });

  if (!res.ok) {
    const errorMessage = extractErrorMessage(data, `Request failed with status ${res.status}`);
    throw new Error(errorMessage);
  }

  return data as T;
}

export const apiClient = {
  getAdminToken(): string | null {
    return localStorage.getItem('aegis_admin_token');
  },

  getAuthToken(): string | null {
    return localStorage.getItem('aegis_auth_token');
  },

  // ==========================================
  // AUTH
  // ==========================================
  async login(username: string, passKey: string): Promise<{ success: boolean; message: string; token: string; user: UserProfile }> {
    const res = await safeFetchJson<any>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, passKey, authorisedId: username }),
    });

    const token = res?.data?.token || res?.token;
    const user = res?.data?.user || res?.user;
    const message = extractErrorMessage(res, 'Authentication successful');

    if (token) {
      localStorage.setItem('aegis_auth_token', token);
      if (user?.role === 'admin') {
        localStorage.setItem('aegis_admin_token', token);
      }
    }
    return {
      success: true,
      message,
      token,
      user,
    };
  },

  async adminLogin(username: string, password: string): Promise<{ success: boolean; message: string; token: string; user: any }> {
    const res = await safeFetchJson<any>('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const token = res?.data?.token || res?.token;
    const user = res?.data?.user || res?.user;
    const message = extractErrorMessage(res, 'Admin authentication successful');

    if (token) {
      localStorage.setItem('aegis_admin_token', token);
    }
    return {
      success: true,
      message,
      token,
      user,
    };
  },

  async getMe(): Promise<{ user: UserProfile; licenses: AdminLicense[]; customPricing: UserCustomPricing | null }> {
    const res = await safeFetchJson<any>('/api/auth/me', {
      headers: getAuthHeader(),
    });
    return {
      user: res?.data?.user || res?.user,
      licenses: res?.data?.licenses || res?.licenses || [],
      customPricing: res?.data?.customPricing || res?.customPricing || null,
    };
  },

  async logout(): Promise<void> {
    try {
      await safeFetchJson('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeader(),
      });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('aegis_auth_token');
      localStorage.removeItem('aegis_admin_token');
    }
  },

  // ==========================================
  // PORTAL (USER-FACING PORTAL CONFIG & REAL PRICING)
  // ==========================================
  async getPortalConfig(userId?: string): Promise<{
    modules: CyberModule[];
    plans: (AdminRuntimePlan & { userPrice: number; hasCustomPrice: boolean })[];
    userLicenses: AdminLicense[];
    upiQrImage: string;
    settings: any;
  }> {
    const url = userId ? `/api/portal/config?userId=${encodeURIComponent(userId)}` : '/api/portal/config';
    const res = await safeFetchJson<any>(url, {
      headers: getAuthHeader(),
    });
    const d = res?.data || res;
    return {
      modules: d?.modules || [],
      plans: d?.plans || [],
      userLicenses: d?.userLicenses || [],
      upiQrImage: d?.upiQrImage || '',
      settings: d?.settings || {},
    };
  },

  async createOrder(userId: string, moduleId: string, planId: string): Promise<{ order: AdminOrder; upiQrImageUrl: string }> {
    const res = await safeFetchJson<any>('/api/portal/orders', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ userId, moduleId, planId }),
    });
    const d = res?.data || res;
    return {
      order: d?.order,
      upiQrImageUrl: d?.upiQrImageUrl || '',
    };
  },

  async getOrder(orderId: string): Promise<AdminOrder> {
    const res = await safeFetchJson<any>(`/api/portal/orders/${encodeURIComponent(orderId)}`, {
      headers: getAuthHeader(),
    });
    return res?.data?.order || res?.order;
  },

  // ==========================================
  // ADMIN DASHBOARD & OVERVIEW
  // ==========================================
  async getAdminOverview(): Promise<{
    stats: AdminOverviewStats;
    recentOrders: AdminOrder[];
    recentLogs: AdminActivityLog[];
    activeSessionsCount: number;
  }> {
    const res = await safeFetchJson<any>('/api/admin/overview', {
      headers: getAuthHeader(),
    });
    const d = res?.data || res;
    return {
      stats: d?.stats,
      recentOrders: d?.recentOrders || [],
      recentLogs: d?.recentLogs || [],
      activeSessionsCount: d?.activeSessionsCount || 0,
    };
  },

  // ==========================================
  // ADMIN: USERS
  // ==========================================
  async getUsers(search?: string): Promise<AdminUser[]> {
    const url = search ? `/api/admin/users?search=${encodeURIComponent(search)}` : '/api/admin/users';
    const res = await safeFetchJson<any>(url, {
      headers: getAuthHeader(),
    });
    return res?.data?.users || res?.users || [];
  },

  async generateCredentials(): Promise<{ authorisedId: string; passKey: string }> {
    const res = await safeFetchJson<any>('/api/admin/users/generate-credentials', {
      headers: getAuthHeader(),
    });
    const d = res?.data || res;
    return {
      authorisedId: d?.authorisedId,
      passKey: d?.passKey,
    };
  },

  async createUser(userData: {
    username?: string;
    authorisedId?: string;
    password?: string;
    passKey?: string;
    role?: string;
    clearanceLevel?: number;
    email?: string;
    nodeRegion?: string;
    accountStatus?: string;
    customPricing?: {
      plan15Price?: number;
      plan20Price?: number;
      plan30Price?: number;
      planPermPrice?: number;
    };
    initialModuleId?: string;
    initialPlanId?: string;
    initialDurationDays?: number;
  }): Promise<{ user: AdminUser; createdCredentials: { authorisedId: string; passKey: string }; initialLicense?: any }> {
    const res = await safeFetchJson<any>('/api/admin/users', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(userData),
    });
    const d = res?.data || res;
    return {
      user: d?.user,
      createdCredentials: d?.createdCredentials,
      initialLicense: d?.initialLicense,
    };
  },

  async resetUserPassword(userId: string, newPassKey?: string): Promise<{ success: boolean; message: string; newPassKey: string }> {
    const res = await safeFetchJson<any>(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ newPassKey }),
    });
    const message = extractErrorMessage(res, 'Pass Key reset successfully');
    const newKey = res?.data?.newPassKey || res?.newPassKey;
    return {
      success: true,
      message,
      newPassKey: newKey,
    };
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    const res = await safeFetchJson<any>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return {
      success: true,
      message: extractErrorMessage(res, 'User account permanently deleted'),
    };
  },

  async updateUserStatus(userId: string, status: 'active' | 'disabled'): Promise<void> {
    await safeFetchJson<any>(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
  },

  async resetUserSessions(userId: string): Promise<number> {
    const res = await safeFetchJson<any>(`/api/admin/users/${encodeURIComponent(userId)}/reset-sessions`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return res?.data?.revokedCount || res?.revokedCount || 0;
  },

  // ==========================================
  // ADMIN: INDIVIDUAL USER PRICING (KEY)
  // ==========================================
  async getCustomPricings(): Promise<{ customPricings: UserCustomPricing[]; globalPlans: AdminRuntimePlan[] }> {
    const res = await safeFetchJson<any>('/api/admin/pricing', {
      headers: getAuthHeader(),
    });
    const d = res?.data || res;
    return {
      customPricings: d?.customPricings || [],
      globalPlans: d?.globalPlans || [],
    };
  },

  async getUserPricingDetails(userId: string): Promise<{
    userId: string;
    customPricing: UserCustomPricing | null;
    effectivePlans: (AdminRuntimePlan & { userPrice: number; hasCustomPrice: boolean })[];
  }> {
    const res = await safeFetchJson<any>(`/api/admin/pricing/${encodeURIComponent(userId)}`, {
      headers: getAuthHeader(),
    });
    const d = res?.data || res;
    return {
      userId: d?.userId,
      customPricing: d?.customPricing || null,
      effectivePlans: d?.effectivePlans || [],
    };
  },

  async saveCustomPricing(
    userId: string,
    prices: { plan15Price: number; plan20Price: number; plan30Price: number; planPermPrice: number }
  ): Promise<UserCustomPricing> {
    const res = await safeFetchJson<any>(`/api/admin/pricing/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(prices),
    });
    return res?.data?.customPricing || res?.customPricing;
  },

  async resetCustomPricing(userId: string): Promise<void> {
    await safeFetchJson<any>(`/api/admin/pricing/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },

  // ==========================================
  // ADMIN: RUNTIME PLANS
  // ==========================================
  async getRuntimePlans(): Promise<AdminRuntimePlan[]> {
    const res = await safeFetchJson<any>('/api/admin/plans', {
      headers: getAuthHeader(),
    });
    return res?.data?.plans || res?.plans || [];
  },

  async updateRuntimePlan(planId: string, planData: Partial<AdminRuntimePlan>): Promise<AdminRuntimePlan> {
    const res = await safeFetchJson<any>(`/api/admin/plans/${encodeURIComponent(planId)}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(planData),
    });
    return res?.data?.plan || res?.plan;
  },

  // ==========================================
  // ADMIN: MODULES
  // ==========================================
  async getModules(): Promise<CyberModule[]> {
    const res = await safeFetchJson<any>('/api/admin/modules', {
      headers: getAuthHeader(),
    });
    return res?.data?.modules || res?.modules || [];
  },

  async createModule(modData: Partial<CyberModule>): Promise<CyberModule> {
    const res = await safeFetchJson<any>('/api/admin/modules', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(modData),
    });
    return res?.data?.module || res?.module;
  },

  async updateModule(modId: string, modData: Partial<CyberModule>): Promise<CyberModule> {
    const res = await safeFetchJson<any>(`/api/admin/modules/${encodeURIComponent(modId)}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(modData),
    });
    return res?.data?.module || res?.module;
  },

  async toggleModule(modId: string): Promise<CyberModule> {
    const res = await safeFetchJson<any>(`/api/admin/modules/${encodeURIComponent(modId)}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeader(),
    });
    return res?.data?.module || res?.module;
  },

  async deleteModule(modId: string): Promise<void> {
    await safeFetchJson<any>(`/api/admin/modules/${encodeURIComponent(modId)}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },

  // ==========================================
  // ADMIN: ORDERS & LICENSES
  // ==========================================
  async getOrders(): Promise<AdminOrder[]> {
    const res = await safeFetchJson<any>('/api/admin/orders', {
      headers: getAuthHeader(),
    });
    return res?.data?.orders || res?.orders || [];
  },

  async updateOrderStatus(orderId: string, status: string): Promise<AdminOrder> {
    const res = await safeFetchJson<any>(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    return res?.data?.order || res?.order;
  },

  async getLicenses(): Promise<AdminLicense[]> {
    const res = await safeFetchJson<any>('/api/admin/licenses', {
      headers: getAuthHeader(),
    });
    return res?.data?.licenses || res?.licenses || [];
  },

  async createLicense(licenseData: { userId: string; moduleId: string; planId?: string; durationDays: number }): Promise<AdminLicense> {
    const res = await safeFetchJson<any>('/api/admin/licenses', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(licenseData),
    });
    return res?.data?.license || res?.license;
  },

  async updateLicenseStatus(licenseId: string, status: 'active' | 'revoked' | 'expired'): Promise<AdminLicense> {
    const res = await safeFetchJson<any>(`/api/admin/licenses/${encodeURIComponent(licenseId)}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    return res?.data?.license || res?.license;
  },

  async extendLicense(licenseId: string, extraDays: number): Promise<AdminLicense> {
    const res = await safeFetchJson<any>(`/api/admin/licenses/${encodeURIComponent(licenseId)}/extend`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ extraDays }),
    });
    return res?.data?.license || res?.license;
  },

  // ==========================================
  // SESSIONS & LOGS & SETTINGS
  // ==========================================
  async getSessions(): Promise<AdminSession[]> {
    const res = await safeFetchJson<any>('/api/admin/sessions', {
      headers: getAuthHeader(),
    });
    return res?.data?.sessions || res?.sessions || [];
  },

  async revokeSession(token: string): Promise<void> {
    await safeFetchJson<any>(`/api/admin/sessions/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },

  async revokeAllSessions(): Promise<number> {
    const res = await safeFetchJson<any>('/api/admin/sessions/revoke-all', {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return res?.data?.revokedCount || res?.revokedCount || 0;
  },

  async getLogs(limit = 100): Promise<AdminActivityLog[]> {
    const res = await safeFetchJson<any>(`/api/admin/logs?limit=${limit}`, {
      headers: getAuthHeader(),
    });
    return res?.data?.logs || res?.logs || [];
  },

  async getSettings(): Promise<SystemSettingsData> {
    const res = await safeFetchJson<any>('/api/admin/settings', {
      headers: getAuthHeader(),
    });
    return res?.data?.settings || res?.settings;
  },

  async updateSettings(settings: Partial<SystemSettingsData>): Promise<SystemSettingsData> {
    const res = await safeFetchJson<any>('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(settings),
    });
    return res?.data?.settings || res?.settings;
  },
};
