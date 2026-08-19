import { 
  AdminUser, UserCustomPricing, AdminRuntimePlan, CyberModule, 
  AdminOrder, AdminLicense, AdminSession, AdminActivityLog, 
  AdminOverviewStats, SystemSettingsData, UserProfile 
} from '../types';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('aegis_admin_token') || localStorage.getItem('aegis_auth_token');
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
  return {
    'Content-Type': 'application/json',
  };
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
  async login(username: string, passKey: string): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, passKey }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }
    localStorage.setItem('aegis_auth_token', data.token);
    if (data.user.role === 'admin') {
      localStorage.setItem('aegis_admin_token', data.token);
    }
    return data;
  },

  async adminLogin(username: string, password: string): Promise<{ token: string; user: any }> {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Admin login failed');
    }
    localStorage.setItem('aegis_admin_token', data.token);
    return data;
  },

  async getMe(): Promise<{ user: UserProfile; licenses: AdminLicense[]; customPricing: UserCustomPricing | null }> {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      throw new Error('Failed to fetch profile');
    }
    return res.json();
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
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
    const res = await fetch(url, {
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      throw new Error('Failed to load portal configuration');
    }
    return res.json();
  },

  async createOrder(userId: string, moduleId: string, planId: string): Promise<{ order: AdminOrder; upiQrImageUrl: string }> {
    const res = await fetch('/api/portal/orders', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ userId, moduleId, planId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create order');
    }
    return data;
  },

  async getOrder(orderId: string): Promise<AdminOrder> {
    const res = await fetch(`/api/portal/orders/${orderId}`, {
      headers: getAuthHeader(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error('Failed to fetch order');
    }
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
    const res = await fetch('/api/admin/overview', {
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      throw new Error('Failed to load admin overview');
    }
    return res.json();
  },

  // ==========================================
  // ADMIN: USERS
  // ==========================================
  async getUsers(search?: string): Promise<AdminUser[]> {
    const url = search ? `/api/admin/users?search=${encodeURIComponent(search)}` : '/api/admin/users';
    const res = await fetch(url, {
      headers: getAuthHeader(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load users');
    }
    return data.users;
  },

  async generateCredentials(): Promise<{ authorisedId: string; passKey: string }> {
    const res = await fetch('/api/admin/users/generate-credentials', {
      headers: getAuthHeader(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to generate credentials');
    }
    return data;
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
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create user');
    }
    return data;
  },

  async resetUserPassword(userId: string, newPassKey?: string): Promise<{ success: boolean; message: string; newPassKey: string }> {
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ newPassKey }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset pass key');
    }
    return data;
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete user');
    }
    return data;
  },

  async updateUserStatus(userId: string, status: 'active' | 'disabled'): Promise<void> {
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update user status');
    }
  },

  async resetUserSessions(userId: string): Promise<number> {
    const res = await fetch(`/api/admin/users/${userId}/reset-sessions`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    const data = await res.json();
    return data.revokedCount;
  },

  // ==========================================
  // ADMIN: INDIVIDUAL USER PRICING (KEY)
  // ==========================================
  async getCustomPricings(): Promise<{ customPricings: UserCustomPricing[]; globalPlans: AdminRuntimePlan[] }> {
    const res = await fetch('/api/admin/pricing', {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to load custom pricings');
    return res.json();
  },

  async getUserPricingDetails(userId: string): Promise<{
    userId: string;
    customPricing: UserCustomPricing | null;
    effectivePlans: (AdminRuntimePlan & { userPrice: number; hasCustomPrice: boolean })[];
  }> {
    const res = await fetch(`/api/admin/pricing/${userId}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to load user pricing');
    return res.json();
  },

  async saveCustomPricing(
    userId: string,
    prices: { plan15Price: number; plan20Price: number; plan30Price: number; planPermPrice: number }
  ): Promise<UserCustomPricing> {
    const res = await fetch(`/api/admin/pricing/${userId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(prices),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save custom pricing');
    return data.customPricing;
  },

  async resetCustomPricing(userId: string): Promise<void> {
    const res = await fetch(`/api/admin/pricing/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to reset custom pricing');
  },

  // ==========================================
  // ADMIN: RUNTIME PLANS
  // ==========================================
  async getRuntimePlans(): Promise<AdminRuntimePlan[]> {
    const res = await fetch('/api/admin/plans', {
      headers: getAuthHeader(),
    });
    const data = await res.json();
    return data.plans;
  },

  async updateRuntimePlan(planId: string, planData: Partial<AdminRuntimePlan>): Promise<AdminRuntimePlan> {
    const res = await fetch(`/api/admin/plans/${planId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(planData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update plan');
    return data.plan;
  },

  // ==========================================
  // ADMIN: MODULES
  // ==========================================
  async getModules(): Promise<CyberModule[]> {
    const res = await fetch('/api/admin/modules', {
      headers: getAuthHeader(),
    });
    const data = await res.json();
    return data.modules;
  },

  async createModule(modData: Partial<CyberModule>): Promise<CyberModule> {
    const res = await fetch('/api/admin/modules', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(modData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create module');
    return data.module;
  },

  async updateModule(modId: string, modData: Partial<CyberModule>): Promise<CyberModule> {
    const res = await fetch(`/api/admin/modules/${modId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(modData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update module');
    return data.module;
  },

  async toggleModule(modId: string): Promise<CyberModule> {
    const res = await fetch(`/api/admin/modules/${modId}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeader(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle module');
    return data.module;
  },

  async deleteModule(modId: string): Promise<void> {
    const res = await fetch(`/api/admin/modules/${modId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to delete module');
  },

  // ==========================================
  // ADMIN: ORDERS & LICENSES
  // ==========================================
  async getOrders(): Promise<AdminOrder[]> {
    const res = await fetch('/api/admin/orders', {
      headers: getAuthHeader(),
    });
    const data = await res.json();
    return data.orders;
  },

  async updateOrderStatus(orderId: string, status: string): Promise<AdminOrder> {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update order status');
    return data.order;
  },

  async getLicenses(): Promise<AdminLicense[]> {
    const res = await fetch('/api/admin/licenses', {
      headers: getAuthHeader(),
    });
    const data = await res.json();
    return data.licenses;
  },

  async createLicense(data: { userId: string; moduleId: string; planId?: string; durationDays: number }): Promise<AdminLicense> {
    const res = await fetch('/api/admin/licenses', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Failed to grant license');
    return resData.license;
  },

  async updateLicenseStatus(licenseId: string, status: 'active' | 'revoked' | 'expired'): Promise<AdminLicense> {
    const res = await fetch(`/api/admin/licenses/${licenseId}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update license status');
    return data.license;
  },

  async extendLicense(licenseId: string, extraDays: number): Promise<AdminLicense> {
    const res = await fetch(`/api/admin/licenses/${licenseId}/extend`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ extraDays }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to extend license');
    return data.license;
  },

  // ==========================================
  // SESSIONS & LOGS & SETTINGS
  // ==========================================
  async getSessions(): Promise<AdminSession[]> {
    const res = await fetch('/api/admin/sessions', {
      headers: getAuthHeader(),
    });
    const data = await res.json();
    return data.sessions;
  },

  async revokeSession(token: string): Promise<void> {
    const res = await fetch(`/api/admin/sessions/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to revoke session');
  },

  async revokeAllSessions(): Promise<number> {
    const res = await fetch('/api/admin/sessions/revoke-all', {
      method: 'POST',
      headers: getAuthHeader(),
    });
    const data = await res.json();
    return data.revokedCount;
  },

  async getLogs(limit = 100): Promise<AdminActivityLog[]> {
    const res = await fetch(`/api/admin/logs?limit=${limit}`, {
      headers: getAuthHeader(),
    });
    const data = await res.json();
    return data.logs;
  },

  async getSettings(): Promise<SystemSettingsData> {
    const res = await fetch('/api/admin/settings', {
      headers: getAuthHeader(),
    });
    const data = await res.json();
    return data.settings;
  },

  async updateSettings(settings: Partial<SystemSettingsData>): Promise<SystemSettingsData> {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    return data.settings;
  },
};
