import { 
  AdminUser, UserCustomPricing, AdminRuntimePlan, CyberModule, 
  AdminOrder, AdminLicense, AdminSession, AdminActivityLog, 
  AdminOverviewStats, SystemSettingsData, UserProfile,
  Customer, CustomerStats, CustomerCreationInput, CreatedCustomerResult
} from '../types';
import { appStore } from '../store/appStore';

/**
 * Universal API Service
 * Dispatches to Express backend endpoints with automatic fallback to persistent reactive store.
 */
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
  async login(loginId: string, passKey: string): Promise<{ success: boolean; message: string; token: string; user: UserProfile & { customer_id?: string; price?: number; expiry_date?: string; assigned_modules?: string[] } }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, passKey }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'INVALID CUSTOMER ID OR PASSWORD');
      }

      if (data.token) {
        localStorage.setItem('aegis_auth_token', data.token);
        if (data.user?.role === 'admin') {
          localStorage.setItem('aegis_admin_token', data.token);
        }
      }

      return data;
    } catch (err: unknown) {
      // If network fails, check client store fallback
      if (err instanceof Error && (err.message.includes('BLOCKED') || err.message.includes('EXPIRED') || err.message.includes('INVALID'))) {
        throw err;
      }
      return appStore.login(loginId, passKey);
    }
  },

  async adminLogin(username: string, password: string): Promise<{ success: boolean; message: string; token: string; user: any }> {
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'INVALID ADMIN CREDENTIALS');
      }

      if (data.token) {
        localStorage.setItem('aegis_admin_token', data.token);
      }

      return data;
    } catch {
      const result = await appStore.adminLogin(username, password);
      if (result.token) {
        localStorage.setItem('aegis_admin_token', result.token);
      }
      return result;
    }
  },

  async getMe(userId?: string): Promise<{ user: UserProfile; licenses: AdminLicense[]; customPricing: UserCustomPricing | null }> {
    try {
      const token = this.getAuthToken();
      if (token) {
        const res = await fetch('/api/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            return {
              user: {
                id: data.user.id,
                username: data.user.username,
                codename: `${data.user.username}_OPERATOR`,
                clearanceLevel: data.user.clearanceLevel || 3,
                role: data.user.role || 'user',
                terminalId: `TERM-${Math.floor(1000 + Math.random() * 9000)}-X`,
                ipAddress: '192.168.1.104 [VPN ENCRYPTED]',
                nodeRegion: 'Asia-SE',
                avatarSeed: data.user.username,
                sessionToken: token,
                loginTime: new Date().toISOString(),
              },
              licenses: [],
              customPricing: null,
            };
          }
        }
      }
    } catch {
      // fallback
    }
    return appStore.getMe(userId);
  },

  async logout(): Promise<void> {
    try {
      localStorage.removeItem('aegis_auth_token');
      localStorage.removeItem('aegis_admin_token');
      localStorage.removeItem('aegis_auth_session');
    } catch {
      // ignore
    }
  },

  // ==========================================
  // CUSTOMER MANAGEMENT API
  // ==========================================
  async getCustomers(): Promise<{ stats: CustomerStats; customers: Customer[]; modules: CyberModule[] }> {
    try {
      const res = await fetch('/api/admin/customers', {
        headers: { 'Authorization': `Bearer ${this.getAdminToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          stats: data.stats,
          customers: data.customers,
          modules: data.modules,
        };
      }
    } catch (err) {
      console.warn('Failed to fetch customers from server, using local store:', err);
    }
    return appStore.getCustomersData();
  },

  async generateCustomerCredentials(): Promise<{ customer_id: string; password: string }> {
    try {
      const res = await fetch('/api/admin/generate-credentials', {
        headers: { 'Authorization': `Bearer ${this.getAdminToken()}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return appStore.generateCustomerCredentials();
  },

  async createCustomer(input: CustomerCreationInput): Promise<CreatedCustomerResult> {
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAdminToken()}`,
        },
        body: JSON.stringify(input),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create customer');
      }

      // Sync local store
      appStore.addCustomerRecord(data.customer, input.password);

      return {
        customer: data.customer,
        credentials: data.credentials,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('exists')) {
        throw err;
      }
      return appStore.createCustomerRecord(input);
    }
  },

  async updateCustomer(id: string, updateData: Partial<Customer>): Promise<Customer> {
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAdminToken()}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update customer');
      }

      appStore.updateCustomerRecord(id, updateData);
      return data.customer;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('taken')) {
        throw err;
      }
      return appStore.updateCustomerRecord(id, updateData);
    }
  },

  async resetCustomerPassword(id: string, newPassword?: string): Promise<{ success: boolean; message: string; newPassword: string; customer_id: string; username: string }> {
    try {
      const res = await fetch(`/api/admin/customers/${id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAdminToken()}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to reset password');
      }

      appStore.resetCustomerPasswordRecord(id, data.newPassword);
      return data;
    } catch {
      return appStore.resetCustomerPasswordRecord(id, newPassword);
    }
  },

  async toggleCustomerBlock(id: string): Promise<{ success: boolean; status: 'active' | 'blocked' }> {
    try {
      const res = await fetch(`/api/admin/customers/${id}/toggle-block`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAdminToken()}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to toggle block status');
      }

      appStore.toggleCustomerBlockRecord(id);
      return data;
    } catch {
      return appStore.toggleCustomerBlockRecord(id);
    }
  },

  async extendCustomerExpiry(id: string, options: { days?: number; customDate?: string }): Promise<{ success: boolean; expiry_date: string }> {
    try {
      const res = await fetch(`/api/admin/customers/${id}/extend-expiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAdminToken()}`,
        },
        body: JSON.stringify(options),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to extend expiry');
      }

      appStore.extendCustomerExpiryRecord(id, options);
      return data;
    } catch {
      return appStore.extendCustomerExpiryRecord(id, options);
    }
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAdminToken()}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete customer');
      }

      appStore.deleteCustomerRecord(id);
      return data;
    } catch {
      return appStore.deleteCustomerRecord(id);
    }
  },

  // ==========================================
  // PORTAL & PRICING
  // ==========================================
  async getPortalConfig(userId?: string): Promise<{
    modules: CyberModule[];
    plans: (AdminRuntimePlan & { userPrice: number; hasCustomPrice: boolean })[];
    userLicenses: AdminLicense[];
    upiQrImage: string;
    settings: any;
  }> {
    try {
      const token = this.getAuthToken();
      const queryParam = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const res = await fetch(`/api/portal/config${queryParam}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.modules)) {
          return {
            modules: data.modules,
            plans: data.plans || [],
            userLicenses: data.userLicenses || [],
            upiQrImage: data.upiQrImage || '',
            settings: data.settings || {},
          };
        }
      }
    } catch {
      // fallback
    }
    return appStore.getPortalConfig(userId);
  },

  async createOrder(userId: string, moduleId: string, planId: string): Promise<{ order: AdminOrder; upiQrImageUrl: string }> {
    return appStore.createOrder(userId, moduleId, planId);
  },

  async getOrder(orderId: string): Promise<AdminOrder> {
    return appStore.getOrder(orderId);
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
    return appStore.getAdminOverview();
  },

  // ==========================================
  // ADMIN: USERS
  // ==========================================
  async getUsers(search?: string): Promise<AdminUser[]> {
    return appStore.getUsers(search);
  },

  async generateCredentials(): Promise<{ authorisedId: string; passKey: string }> {
    return appStore.generateCredentials();
  },

  async createUser(userData: any): Promise<any> {
    return appStore.createUser(userData);
  },

  async resetUserPassword(userId: string, newPassKey?: string): Promise<{ success: boolean; message: string; newPassKey: string }> {
    return appStore.resetUserPassword(userId, newPassKey);
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    return appStore.deleteUser(userId);
  },

  async updateUserStatus(userId: string, status: 'active' | 'disabled'): Promise<void> {
    appStore.updateUserStatus(userId, status);
  },

  async resetUserSessions(userId: string): Promise<number> {
    return 1;
  },

  // ==========================================
  // ADMIN: INDIVIDUAL USER PRICING
  // ==========================================
  async getCustomPricings(): Promise<{ customPricings: UserCustomPricing[]; globalPlans: AdminRuntimePlan[] }> {
    const matrix = appStore.getPricingMatrix();
    return {
      customPricings: matrix.matrix,
      globalPlans: matrix.defaultPlans,
    };
  },

  async getUserPricingDetails(userId: string): Promise<{
    userId: string;
    customPricing: UserCustomPricing | null;
    effectivePlans: (AdminRuntimePlan & { userPrice: number; hasCustomPrice: boolean })[];
  }> {
    const config = appStore.getPortalConfig(userId);
    const me = appStore.getMe(userId);
    return {
      userId,
      customPricing: me.customPricing,
      effectivePlans: config.plans,
    };
  },

  async saveCustomPricing(
    userId: string,
    prices: { plan15Price: number; plan20Price: number; plan30Price: number; planPermPrice: number }
  ): Promise<UserCustomPricing> {
    const res = appStore.saveCustomPricing({ userId, ...prices });
    return res.pricing;
  },

  async resetCustomPricing(userId: string): Promise<void> {
    appStore.saveCustomPricing({
      userId,
      plan15Price: 120,
      plan20Price: 135,
      plan30Price: 150,
      planPermPrice: 200,
    });
  },

  // ==========================================
  // ADMIN: RUNTIME PLANS
  // ==========================================
  async getRuntimePlans(): Promise<AdminRuntimePlan[]> {
    return appStore.getRuntimePlans();
  },

  async createRuntimePlan(planData: Partial<AdminRuntimePlan>): Promise<AdminRuntimePlan> {
    const res = appStore.createPlan(planData);
    return res.plan;
  },

  async updateRuntimePlan(planId: string, planData: Partial<AdminRuntimePlan>): Promise<AdminRuntimePlan> {
    const res = appStore.updatePlan(planId, planData);
    return res.plan;
  },

  async deleteRuntimePlan(planId: string): Promise<void> {
    appStore.deletePlan(planId);
  },

  // ==========================================
  // ADMIN: ACCESS PANELS & MODULES
  // ==========================================
  async getModules(): Promise<CyberModule[]> {
    try {
      const res = await fetch('/api/admin/modules', {
        headers: { 'Authorization': `Bearer ${this.getAdminToken()}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return appStore.getModules();
  },

  async createModule(modData: Partial<CyberModule>): Promise<CyberModule> {
    try {
      const res = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAdminToken()}`,
        },
        body: JSON.stringify(modData),
      });
      if (res.ok) {
        const data = await res.json();
        // Sync local store
        appStore.createModule(data.module || data.panel || modData);
        return data.module || data.panel;
      }
    } catch {
      // fallback
    }
    const res = appStore.createModule(modData);
    return res.module;
  },

  async updateModule(modId: string, modData: Partial<CyberModule>): Promise<CyberModule> {
    try {
      const res = await fetch(`/api/admin/modules/${modId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAdminToken()}`,
        },
        body: JSON.stringify(modData),
      });
      if (res.ok) {
        const data = await res.json();
        appStore.updateModule(modId, data.module || data.panel || modData);
        return data.module || data.panel;
      }
    } catch {
      // fallback
    }
    const res = appStore.updateModule(modId, modData);
    return res.module;
  },

  async toggleModule(modId: string): Promise<CyberModule> {
    try {
      const res = await fetch(`/api/admin/modules/${modId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAdminToken()}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        appStore.toggleModuleStatus(modId);
        return data.module || data.panel;
      }
    } catch {
      // fallback
    }
    const res = appStore.toggleModuleStatus(modId);
    return res.module;
  },

  async deleteModule(modId: string): Promise<void> {
    try {
      const res = await fetch(`/api/admin/modules/${modId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAdminToken()}`,
        },
      });
      if (res.ok) {
        appStore.deleteModule(modId);
        return;
      }
    } catch {
      // fallback
    }
    appStore.deleteModule(modId);
  },

  async assignCustomersToPanel(panelId: string, assignedCustomerIds: string[]): Promise<CyberModule> {
    try {
      const res = await fetch(`/api/admin/modules/${panelId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAdminToken()}`,
        },
        body: JSON.stringify({ assignedCustomerIds }),
      });
      if (res.ok) {
        const data = await res.json();
        appStore.updateModule(panelId, { assignedCustomerIds });
        return data.module || data.panel;
      }
    } catch {
      // fallback
    }
    const res = appStore.updateModule(panelId, { assignedCustomerIds });
    return res.module;
  },

  // ==========================================
  // ADMIN: ORDERS & LICENSES
  // ==========================================
  async getOrders(): Promise<AdminOrder[]> {
    return appStore.getOrders();
  },

  async updateOrderStatus(orderId: string, status: string): Promise<AdminOrder> {
    const res = appStore.verifyOrderPayment(orderId, status as any);
    return res.order;
  },

  async getLicenses(): Promise<AdminLicense[]> {
    return appStore.getLicenses();
  },

  async createLicense(licenseData: { userId: string; moduleId: string; planId?: string; durationDays: number }): Promise<AdminLicense> {
    const res = appStore.issueLicense(licenseData);
    return res.license;
  },

  async updateLicenseStatus(licenseId: string, status: 'active' | 'revoked' | 'expired'): Promise<AdminLicense> {
    appStore.revokeLicense(licenseId);
    const lics = appStore.getLicenses();
    return lics.find((l) => l.id === licenseId)!;
  },

  async extendLicense(licenseId: string, extraDays: number): Promise<AdminLicense> {
    const res = appStore.extendLicense(licenseId, extraDays);
    return res.license;
  },

  // ==========================================
  // SESSIONS, LOGS & SETTINGS
  // ==========================================
  async getSessions(): Promise<AdminSession[]> {
    return appStore.getSessions();
  },

  async revokeSession(token: string): Promise<void> {
    appStore.revokeSession(token);
  },

  async revokeAllSessions(): Promise<number> {
    return 1;
  },

  async getLogs(limit = 100): Promise<AdminActivityLog[]> {
    return appStore.getLogs().slice(0, limit);
  },

  async getSettings(): Promise<SystemSettingsData> {
    return appStore.getSettings();
  },

  async updateSettings(settings: Partial<SystemSettingsData>): Promise<SystemSettingsData> {
    const res = appStore.updateSettings(settings);
    return res.settings;
  },
};

