import { QrConfig } from "../types";
import {
  UserProfile,
  AdminLicense,
  UserCustomPricing,
  Customer,
  CustomerStats,
  CustomerCreationInput,
  CreatedCustomerResult,
  AdminOverviewStats,
  AdminOrder,
  AdminActivityLog,
  AdminUser,
  AdminRuntimePlan,
  CyberModule,
  AdminSession,
  SystemSettingsData,
  GeneratedKeyRecord,
  VerifyKeyResult,
  UserVerificationFee,
  VerificationRequest,
} from '../types';
import { appStore } from '../store/appStore';
import { storage } from '../store/storage';

/**
 * Pure Frontend API Adapter
 * Directly routes all calls to appStore & storage without any backend or network fetch calls.
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
    const result = await appStore.login(loginId, passKey);
    if (result.token) {
      localStorage.setItem('aegis_auth_token', result.token);
      if (result.user?.role === 'admin') {
        localStorage.setItem('aegis_admin_token', result.token);
      }
    }
    return result;
  },

  async adminLogin(username: string, password: string): Promise<{ success: boolean; message: string; token: string; user: any }> {
    const result = await appStore.adminLogin(username, password);
    if (result.token) {
      localStorage.setItem('aegis_admin_token', result.token);
    }
    return result;
  },

  async getMe(userId?: string): Promise<{ user: UserProfile; licenses: AdminLicense[]; customPricing: UserCustomPricing | null }> {
    return appStore.getMe(userId);
  },

  async logout(): Promise<{ success: boolean }> {
    localStorage.removeItem('aegis_auth_token');
    localStorage.removeItem('aegis_admin_token');
    return { success: true };
  },

  // ==========================================
  // CUSTOMER MANAGEMENT
  // ==========================================
  async getCustomers(): Promise<{ stats: CustomerStats; customers: Customer[]; modules: CyberModule[] }> {
    return appStore.getCustomersData();
  },

  async generateCustomerCredentials(): Promise<{ customer_id: string; password: string }> {
    return appStore.generateCustomerCredentials();
  },

  async createCustomer(input: CustomerCreationInput): Promise<CreatedCustomerResult> {
    return appStore.createCustomerRecord(input);
  },

  async updateCustomer(id: string, updateData: Partial<Customer>): Promise<{ success: boolean; message: string; customer: Customer }> {
    const updated = appStore.updateCustomerRecord(id, updateData);
    return {
      success: true,
      message: 'Customer record updated successfully.',
      customer: updated,
    };
  },

  async resetCustomerPassword(id: string, newPassword?: string): Promise<{ success: boolean; message: string; newPassword: string; customer_id: string; username: string }> {
    return appStore.resetCustomerPasswordRecord(id, newPassword);
  },

  async toggleCustomerBlock(id: string): Promise<{ success: boolean; status: 'active' | 'blocked' }> {
    return appStore.toggleCustomerBlockRecord(id);
  },

  async extendCustomerExpiry(id: string, options: { days?: number; customDate?: string }): Promise<{ success: boolean; expiry_date: string }> {
    return appStore.extendCustomerExpiryRecord(id, options);
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    return appStore.deleteCustomerRecord(id);
  },

  async buyPanel(panelId: string, transactionRef?: string, paymentNote?: string, customerId?: string): Promise<{ success: boolean; message: string; panel_id: string; permission: any; panel_permissions?: Record<string, any> }> {
    return appStore.buyPanelRecord(panelId, transactionRef, paymentNote, customerId);
  },

  async updateCustomerPanelPermissions(customerId: string, panelId: string, permissions: { verify_access?: boolean; files_access?: boolean; setup_access?: boolean; payment_status?: 'none' | 'pending' | 'approved' | 'rejected'; purchased?: boolean }): Promise<{ success: boolean; message: string; panel_permissions: Record<string, any> }> {
    return appStore.updateCustomerPanelPermissionsRecord(customerId, panelId, permissions);
  },

  async bulkUpdateCustomerPanelPermissions(customerId: string, action: 'unlock_all' | 'lock_all'): Promise<{ success: boolean; message: string; panel_permissions: Record<string, any> }> {
    return appStore.bulkUpdateCustomerPanelPermissionsRecord(customerId, action);
  },

  // ==========================================
  // PORTAL & PRICING
  // ==========================================
  async getPortalConfig(userId?: string, panelId?: string): Promise<{ modules: CyberModule[]; plans: AdminRuntimePlan[]; userLicenses: AdminLicense[]; upiQrImage: string; settings: SystemSettingsData; panel_permissions?: Record<string, any>; customer?: any }> {
    return appStore.getPortalConfig(userId, panelId);
  },

  async savePanelPricing(panelId: string, pricing: any): Promise<void> {
    return appStore.savePanelPricing(panelId, pricing);
  },

  async saveCustomerPricing(customerId: string, pricing: any): Promise<void> {
    return appStore.saveCustomerPricing(customerId, pricing);
  },

  getEffectivePrice(customerId: string, panelId: string, durationIdentifier: string | number | null): number {
    return appStore.getEffectivePrice(customerId, panelId, durationIdentifier);
  },

  async createOrder(
    userId: string, 
    moduleId: string, 
    planId: string, 
    customPlan?: { 
      planName: string; 
      finalPrice: number; 
      durationDays?: number | null; 
      durationType?: 'DAYS' | 'PERMANENT'; 
    }
  ): Promise<{ order: AdminOrder; upiQrImageUrl: string }> {
    return appStore.createOrder(userId, moduleId, planId, customPlan);
  },

  async getOrder(orderId: string): Promise<AdminOrder> {
    return appStore.getOrder(orderId);
  },

  // ==========================================
  // ADMIN DASHBOARD
  // ==========================================
  async getAdminOverview(): Promise<{ stats: AdminOverviewStats; recentOrders: AdminOrder[]; recentLogs: AdminActivityLog[]; activeSessionsCount: number }> {
    return appStore.getAdminOverview();
  },

  async getUsers(search?: string): Promise<AdminUser[]> {
    return appStore.getUsers(search);
  },

  async generateCredentials(): Promise<{ authorisedId: string; passKey: string }> {
    return appStore.generateCredentials();
  },

  async createUser(userData: any): Promise<{ user: AdminUser; createdCredentials: { authorisedId: string; passKey: string }; initialLicense?: any }> {
    return appStore.createUser(userData);
  },

  async resetUserPassword(userId: string, newPassKey?: string): Promise<{ success: boolean; message: string; newPassKey: string }> {
    return appStore.resetUserPassword(userId, newPassKey);
  },

  async deleteUser(userId: string): Promise<void> {
    appStore.deleteUser(userId);
  },

  async updateUserStatus(userId: string, status: 'active' | 'disabled'): Promise<void> {
    appStore.updateUserStatus(userId, status);
  },

  async resetUserSessions(userId: string): Promise<number> {
    return appStore.resetUserSessions(userId);
  },

  async getCustomPricings(): Promise<{ matrix: UserCustomPricing[]; defaultPlans: AdminRuntimePlan[] }> {
    return appStore.getPricingMatrix();
  },

  async getUserPricingDetails(userId: string): Promise<{ customPricing: UserCustomPricing | null }> {
    return appStore.getUserPricingDetails(userId);
  },

  async saveCustomPricing(userId: string, prices: { plan15Price?: number; plan20Price?: number; plan30Price?: number; planPermPrice?: number }): Promise<{ success: boolean; message: string; pricing: UserCustomPricing }> {
    return appStore.saveCustomPricing({
      userId,
      plan15Price: prices.plan15Price || 120,
      plan20Price: prices.plan20Price || 135,
      plan30Price: prices.plan30Price || 150,
      planPermPrice: prices.planPermPrice || 200,
    });
  },

  async resetCustomPricing(userId: string): Promise<{ success: boolean; message: string }> {
    return appStore.resetCustomPricing(userId);
  },

  // ==========================================
  // RUNTIME PLANS MANAGEMENT
  // ==========================================
  async getRuntimePlans(): Promise<AdminRuntimePlan[]> {
    return appStore.getRuntimePlans();
  },

  async createRuntimePlan(planData: Omit<AdminRuntimePlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; message: string; plan: AdminRuntimePlan }> {
    return appStore.createPlan(planData);
  },

  async updateRuntimePlan(planId: string, planData: Partial<Omit<AdminRuntimePlan, 'id'>>): Promise<{ success: boolean; message: string; plan: AdminRuntimePlan }> {
    return appStore.updatePlan(planId, planData);
  },

  async deleteRuntimePlan(planId: string): Promise<void> {
    appStore.deletePlan(planId);
  },

  // ==========================================
  // ACCESS MODULES / PANELS MANAGEMENT
  // ==========================================
  async getModules(): Promise<CyberModule[]> {
    return appStore.getModules();
  },

  async createModule(modData: Partial<CyberModule>): Promise<{ success: boolean; message: string; module: CyberModule }> {
    return appStore.createModule(modData);
  },

  async updateModule(modId: string, modData: Partial<CyberModule>): Promise<{ success: boolean; message: string; module: CyberModule }> {
    return appStore.updateModule(modId, modData);
  },

  async toggleModule(modId: string): Promise<{ success: boolean; message: string; module: CyberModule }> {
    return appStore.toggleModuleStatus(modId);
  },

  async deleteModule(modId: string): Promise<void> {
    appStore.deleteModule(modId);
  },

  async assignCustomersToPanel(panelId: string, assignedCustomerIds: string[]): Promise<{ success: boolean; message: string; module: CyberModule }> {
    return appStore.updateModule(panelId, { assignedCustomerIds });
  },

  // ==========================================
  // PANEL CONTENT (FILES & SETUP)
  // ==========================================
  getPanelContent(panelId: string) {
    return appStore.getPanelContent(panelId);
  },

  async updatePanelContent(
    panelId: string,
    data: {
      filesEnabled?: boolean;
      setupEnabled?: boolean;
      files?: any[];
      setup?: any;
    }
  ) {
    return appStore.updatePanelContentData(panelId, data);
  },

  async togglePanelFiles(panelId: string, enabled?: boolean) {
    return appStore.togglePanelFilesButton(panelId, enabled);
  },

  async togglePanelSetup(panelId: string, enabled?: boolean) {
    return appStore.togglePanelSetupButton(panelId, enabled);
  },

  // ==========================================
  // ORDERS MANAGEMENT
  // ==========================================
  async getOrders(): Promise<AdminOrder[]> {
    return appStore.getOrders();
  },

  async updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean; message: string; order: AdminOrder; license?: AdminLicense }> {
    const targetStatus = status === 'PAID' ? 'PAID' : status === 'CANCELLED' ? 'CANCELLED' : 'FAILED';
    return appStore.verifyOrderPayment(orderId, targetStatus);
  },

  // ==========================================
  // LICENSES & SESSIONS & LOGS
  // ==========================================
  async getLicenses(): Promise<AdminLicense[]> {
    return appStore.getLicenses();
  },

  async createLicense(data: any): Promise<{ success: boolean; message: string; license: AdminLicense }> {
    return appStore.issueLicense(data);
  },

  async updateLicenseStatus(licenseId: string, status: string): Promise<any> {
    if (status === 'revoked' || status === 'suspended' || status === 'expired') {
      return appStore.revokeLicense(licenseId);
    }
    const lic = appStore.getLicenses().find(l => l.id === licenseId);
    if (!lic) throw new Error('License not found');
    lic.status = 'active';
    return { success: true, message: 'License status updated', license: lic };
  },

  async extendLicense(licenseId: string, days: number): Promise<{ success: boolean; message: string; license: AdminLicense }> {
    return appStore.extendLicense(licenseId, days);
  },

  async getSessions(): Promise<AdminSession[]> {
    return appStore.getSessions();
  },

  async revokeSession(sessionId: string): Promise<void> {
    appStore.revokeSession(sessionId);
  },

  async revokeAllSessions(): Promise<number> {
    return appStore.revokeAllSessions();
  },

  async getLogs(): Promise<AdminActivityLog[]> {
    return appStore.getLogs();
  },

  // ==========================================
  // SYSTEM SETTINGS
  // ==========================================
  async getSettings(): Promise<SystemSettingsData> {
    return appStore.getSettings();
  },

  async updateSettings(settings: Partial<SystemSettingsData>): Promise<{ success: boolean; message: string; settings: SystemSettingsData }> {
    return appStore.updateSettings(settings);
  },

  // ==========================================
  // IMPORT / EXPORT / RESET
  // ==========================================
  
  // ==========================================
  // QR CONFIG MANAGEMENT
  // ==========================================
  getQrConfigs: async function(): Promise<QrConfig[]> {
    return appStore.getQrConfigs();
  },
  getEffectiveQr: function(
    customerId?: string,
    panelId?: string,
    durationKey?: '15Days' | '20Days' | '30Days' | 'permanent'
  ): { qrImageUrl: string | null; isCustom: boolean; isConfigured: boolean; configId?: string } {
    return appStore.getEffectiveQr(customerId, panelId, durationKey);
  },
  saveQrConfig: async function(config: QrConfig): Promise<{ success: boolean; message: string; config: QrConfig }> {
    return appStore.saveQrConfig(config);
  },
  deleteQrConfig: async function(id: string): Promise<void> {
    return appStore.deleteQrConfig(id);
  },

  // ==========================================
  // GENERATED KEYS & VERIFICATION
  // ==========================================
  async generateKeyForOrder(
    orderId: string,
    customerId?: string,
    panelId?: string,
    durationDays?: number | null,
    durationName?: string,
    durationType?: 'DAYS' | 'PERMANENT',
    price?: number
  ): Promise<GeneratedKeyRecord> {
    return appStore.generateKeyForOrder(orderId, customerId, panelId, durationDays, durationName, durationType, price);
  },

  async verifyKey(keyInput: string, panelId?: string): Promise<VerifyKeyResult> {
    return appStore.verifyKey(keyInput, panelId);
  },

  async verifyAccessCredentials(idInput: string, passwordInput: string, panelId?: string): Promise<VerifyKeyResult> {
    return appStore.verifyAccessCredentials(idInput, passwordInput, panelId);
  },

  async getGeneratedKeys(userId?: string, panelId?: string): Promise<GeneratedKeyRecord[]> {
    return appStore.getGeneratedKeys(userId, panelId);
  },

  // ==========================================
  // USER VERIFICATION FEES
  // ==========================================
  async getUserVerificationFee(userId: string): Promise<number> {
    return appStore.getUserVerificationFee(userId);
  },

  async saveUserVerificationFee(userId: string, customFee: number, enabled: boolean): Promise<{ success: boolean; message: string; fee: UserVerificationFee }> {
    return appStore.saveUserVerificationFee(userId, customFee, enabled);
  },

  async resetUserVerificationFee(userId: string): Promise<{ success: boolean; message: string }> {
    return appStore.resetUserVerificationFee(userId);
  },

  async createVerificationRequest(
    userId: string,
    username: string,
    panelId: string,
    panelName: string,
    accessId: string,
    accessPassword: string,
    fee: number
  ): Promise<VerificationRequest> {
    return appStore.createVerificationRequest(userId, username, panelId, panelName, accessId, accessPassword, fee);
  },

  async approveVerificationRequest(requestId: string, adminUsername: string): Promise<{ success: boolean }> {
    appStore.approveVerificationRequest(requestId, adminUsername);
    return { success: true };
  },

  async rejectVerificationRequest(requestId: string, adminUsername: string): Promise<{ success: boolean }> {
    appStore.rejectVerificationRequest(requestId, adminUsername);
    return { success: true };
  },

  exportAppState(): string {
    return appStore.exportState();
  },

  importAppState(jsonString: string): { success: boolean; message: string } {
    return appStore.importState(jsonString);
  },

  resetAppState(): { success: boolean; message: string } {
    return appStore.resetState();
  },
};
