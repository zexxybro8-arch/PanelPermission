import { 
  AdminUser, UserCustomPricing, AdminRuntimePlan, CyberModule, 
  AdminOrder, AdminLicense, AdminSession, AdminActivityLog, 
  AdminOverviewStats, SystemSettingsData, UserProfile 
} from '../types';

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
 * Safely parses server responses and prevents "Unexpected token < or T in JSON"
 * when a non-JSON / HTML error response is received.
 */
async function safeFetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (netErr: any) {
    console.error(`[NETWORK ERROR] Failed to fetch ${url}:`, netErr);
    throw new Error(`Network connection error: ${netErr.message || 'Unable to reach server'}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    const rawText = await res.text();
    // Debug log without exposing user secrets
    console.warn(`[API NON-JSON RESPONSE] ${options.method || 'GET'} ${url}`, {
      status: res.status,
      statusText: res.statusText,
      contentType,
      bodyPreview: rawText.slice(0, 160),
    });

    if (!res.ok) {
      throw new Error(`Server returned error status ${res.status} (${res.statusText || 'Non-JSON'})`);
    }
    throw new Error(`Unexpected non-JSON response from server (${contentType || 'unknown type'})`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (jsonErr: any) {
    console.error(`[JSON PARSE ERROR] Failed to parse JSON from ${url}:`, jsonErr);
    throw new Error('Malformed JSON received from server');
  }

  if (!res.ok) {
    const errorMessage = data?.error || data?.message || `Request failed with status ${res.status}`;
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
  async login(username: string, passKey: string): Promise<{ success: boolean; token: string; user: UserProfile }> {
    const data = await safeFetchJson<{ success: boolean; token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, passKey, authorisedId: username }),
    });

    if (data.token) {
      localStorage.setItem('aegis_auth_token', data.token);
      if (data.user.role === 'admin') {
        localStorage.setItem('aegis_admin_token', data.token);
      }
    }
    return data;
  },

  async adminLogin(username: string, password: string): Promise<{ success: boolean; token: string; user: any }> {
    const data = await safeFetchJson<{ success: boolean; token: string; user: any }>('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (data.token) {
      localStorage.setItem('aegis_admin_token', data.token);
    }
    return data;
  },

  async getMe(): Promise<{ user: UserProfile; licenses: AdminLicense[]; customPricing: UserCustomPricing | null }> {
    return safeFetchJson<{ user: UserProfile; licenses: AdminLicense[]; customPricing: UserCustomPricing | null }>('/api/auth/me', {
      headers: getAuthHeader(),
    });
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
    return safeFetchJson<{
      modules: CyberModule[];
      plans: (AdminRuntimePlan & { userPrice: number; hasCustomPrice: boolean })[];
      userLicenses: AdminLicense[];
      upiQrImage: string;
      settings: any;
    }>(url, {
      headers: getAuthHeader(),
    });
  },

  async createOrder(userId: string, moduleId: string, planId: string): Promise<{ order: AdminOrder; upiQrImageUrl: string }> {
    return safeFetchJson<{ order: AdminOrder; upiQrImageUrl: string }>('/api/portal/orders', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ userId, moduleId, planId }),
    });
  },

  async getOrder(orderId: string): Promise<AdminOrder> {
    const data = await safeFetchJson<{ order: AdminOrder }>(`/api/portal/orders/${encodeURIComponent(orderId)}`, {
      headers: getAuthHeader(),
    });
    return data.order;
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
    return safeFetchJson<{
      stats: AdminOverviewStats;
      recentOrders: AdminOrder[];
      recentLogs: AdminActivityLog[];
      activeSessionsCount: number;
    }>('/api/admin/overview', {
      headers: getAuthHeader(),
    });
  },

  // ==========================================
  // ADMIN: USERS
  // ==========================================
  async getUsers(search?: string): Promise<AdminUser[]> {
    const url = search ? `/api/admin/users?search=${encodeURIComponent(search)}` : '/api/admin/users';
    const data = await safeFetchJson<{ users: AdminUser[] }>(url, {
      headers: getAuthHeader(),
    });
    return data.users;
  },

  async generateCredentials(): Promise<{ authorisedId: string; passKey: string }> {
    return safeFetchJson<{ authorisedId: string; passKey: string }>('/api/admin/users/generate-credentials', {
      headers: getAuthHeader(),
    });
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
    return safeFetchJson<{ user: AdminUser; createdCredentials: { authorisedId: string; passKey: string }; initialLicense?: any }>('/api/admin/users', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(userData),
    });
  },

  async resetUserPassword(userId: string, newPassKey?: string): Promise<{ success: boolean; message: string; newPassKey: string }> {
    return safeFetchJson<{ success: boolean; message: string; newPassKey: string }>(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ newPassKey }),
    });
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    return safeFetchJson<{ success: boolean; message: string }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },

  async updateUserStatus(userId: string, status: 'active' | 'disabled'): Promise<void> {
    await safeFetchJson<{ success: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
  },

  async resetUserSessions(userId: string): Promise<number> {
    const data = await safeFetchJson<{ success: boolean; revokedCount: number }>(`/api/admin/users/${encodeURIComponent(userId)}/reset-sessions`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return data.revokedCount;
  },

  // ==========================================
  // ADMIN: INDIVIDUAL USER PRICING (KEY)
  // ==========================================
  async getCustomPricings(): Promise<{ customPricings: UserCustomPricing[]; globalPlans: AdminRuntimePlan[] }> {
    return safeFetchJson<{ customPricings: UserCustomPricing[]; globalPlans: AdminRuntimePlan[] }>('/api/admin/pricing', {
      headers: getAuthHeader(),
    });
  },

  async getUserPricingDetails(userId: string): Promise<{
    userId: string;
    customPricing: UserCustomPricing | null;
    effectivePlans: (AdminRuntimePlan & { userPrice: number; hasCustomPrice: boolean })[];
  }> {
    return safeFetchJson<{
      userId: string;
      customPricing: UserCustomPricing | null;
      effectivePlans: (AdminRuntimePlan & { userPrice: number; hasCustomPrice: boolean })[];
    }>(`/api/admin/pricing/${encodeURIComponent(userId)}`, {
      headers: getAuthHeader(),
    });
  },

  async saveCustomPricing(
    userId: string,
    prices: { plan15Price: number; plan20Price: number; plan30Price: number; planPermPrice: number }
  ): Promise<UserCustomPricing> {
    const data = await safeFetchJson<{ success: boolean; customPricing: UserCustomPricing }>(`/api/admin/pricing/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(prices),
    });
    return data.customPricing;
  },

  async resetCustomPricing(userId: string): Promise<void> {
    await safeFetchJson<{ success: boolean; reset: boolean }>(`/api/admin/pricing/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },

  // ==========================================
  // ADMIN: RUNTIME PLANS
  // ==========================================
  async getRuntimePlans(): Promise<AdminRuntimePlan[]> {
    const data = await safeFetchJson<{ plans: AdminRuntimePlan[] }>('/api/admin/plans', {
      headers: getAuthHeader(),
    });
    return data.plans;
  },

  async updateRuntimePlan(planId: string, planData: Partial<AdminRuntimePlan>): Promise<AdminRuntimePlan> {
    const data = await safeFetchJson<{ success: boolean; plan: AdminRuntimePlan }>(`/api/admin/plans/${encodeURIComponent(planId)}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(planData),
    });
    return data.plan;
  },

  // ==========================================
  // ADMIN: MODULES
  // ==========================================
  async getModules(): Promise<CyberModule[]> {
    const data = await safeFetchJson<{ modules: CyberModule[] }>('/api/admin/modules', {
      headers: getAuthHeader(),
    });
    return data.modules;
  },

  async createModule(modData: Partial<CyberModule>): Promise<CyberModule> {
    const data = await safeFetchJson<{ success: boolean; module: CyberModule }>('/api/admin/modules', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(modData),
    });
    return data.module;
  },

  async updateModule(modId: string, modData: Partial<CyberModule>): Promise<CyberModule> {
    const data = await safeFetchJson<{ success: boolean; module: CyberModule }>(`/api/admin/modules/${encodeURIComponent(modId)}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(modData),
    });
    return data.module;
  },

  async toggleModule(modId: string): Promise<CyberModule> {
    const data = await safeFetchJson<{ success: boolean; module: CyberModule }>(`/api/admin/modules/${encodeURIComponent(modId)}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeader(),
    });
    return data.module;
  },

  async deleteModule(modId: string): Promise<void> {
    await safeFetchJson<{ success: boolean; message: string }>(`/api/admin/modules/${encodeURIComponent(modId)}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },

  // ==========================================
  // ADMIN: ORDERS & LICENSES
  // ==========================================
  async getOrders(): Promise<AdminOrder[]> {
    const data = await safeFetchJson<{ orders: AdminOrder[] }>('/api/admin/orders', {
      headers: getAuthHeader(),
    });
    return data.orders;
  },

  async updateOrderStatus(orderId: string, status: string): Promise<AdminOrder> {
    const data = await safeFetchJson<{ success: boolean; order: AdminOrder }>(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    return data.order;
  },

  async getLicenses(): Promise<AdminLicense[]> {
    const data = await safeFetchJson<{ licenses: AdminLicense[] }>('/api/admin/licenses', {
      headers: getAuthHeader(),
    });
    return data.licenses;
  },

  async createLicense(licenseData: { userId: string; moduleId: string; planId?: string; durationDays: number }): Promise<AdminLicense> {
    const data = await safeFetchJson<{ success: boolean; license: AdminLicense }>('/api/admin/licenses', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(licenseData),
    });
    return data.license;
  },

  async updateLicenseStatus(licenseId: string, status: 'active' | 'revoked' | 'expired'): Promise<AdminLicense> {
    const data = await safeFetchJson<{ success: boolean; license: AdminLicense }>(`/api/admin/licenses/${encodeURIComponent(licenseId)}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    return data.license;
  },

  async extendLicense(licenseId: string, extraDays: number): Promise<AdminLicense> {
    const data = await safeFetchJson<{ success: boolean; license: AdminLicense }>(`/api/admin/licenses/${encodeURIComponent(licenseId)}/extend`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ extraDays }),
    });
    return data.license;
  },

  // ==========================================
  // SESSIONS & LOGS & SETTINGS
  // ==========================================
  async getSessions(): Promise<AdminSession[]> {
    const data = await safeFetchJson<{ sessions: AdminSession[] }>('/api/admin/sessions', {
      headers: getAuthHeader(),
    });
    return data.sessions;
  },

  async revokeSession(token: string): Promise<void> {
    await safeFetchJson<{ success: boolean }>(`/api/admin/sessions/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },

  async revokeAllSessions(): Promise<number> {
    const data = await safeFetchJson<{ success: boolean; revokedCount: number }>('/api/admin/sessions/revoke-all', {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return data.revokedCount;
  },

  async getLogs(limit = 100): Promise<AdminActivityLog[]> {
    const data = await safeFetchJson<{ logs: AdminActivityLog[] }>(`/api/admin/logs?limit=${limit}`, {
      headers: getAuthHeader(),
    });
    return data.logs;
  },

  async getSettings(): Promise<SystemSettingsData> {
    const data = await safeFetchJson<{ settings: SystemSettingsData }>('/api/admin/settings', {
      headers: getAuthHeader(),
    });
    return data.settings;
  },

  async updateSettings(settings: Partial<SystemSettingsData>): Promise<SystemSettingsData> {
    const data = await safeFetchJson<{ success: boolean; settings: SystemSettingsData }>('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(settings),
    });
    return data.settings;
  },
};
