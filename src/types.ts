export type AuthTab = 'credentials';

export interface CyberModule {
  id: string;
  name: string;
  description: string;
  tag: string;
  version: string;
  enabled: boolean;
  icon?: string;
  requiredRuntime?: string;
  orderIndex?: number;
}

export interface UserProfile {
  id?: string;
  customer_id?: string;
  username: string;
  codename: string;
  clearanceLevel: number;
  role: string;
  terminalId: string;
  ipAddress: string;
  nodeRegion: string;
  avatarSeed: string;
  sessionToken: string;
  loginTime: string;
  email?: string;
  price?: number;
  status?: 'active' | 'blocked';
  expiry_date?: string;
  assigned_modules?: string[];
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARN' | 'SEC_ALERT' | 'HANDSHAKE';
  source: string;
  message: string;
  payloadHash?: string;
}

export interface ServerNode {
  id: string;
  name: string;
  region: string;
  latencyMs: number;
  status: 'optimal' | 'congested' | 'maintenance';
  encryption: string;
}

export interface ThreatItem {
  id: string;
  threatType: string;
  originIp: string;
  country: string;
  mitigation: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeAgo: string;
}

// ==========================================
// CUSTOMER MANAGEMENT ENTITIES
// ==========================================

export interface Customer {
  id: string;
  customer_id: string;
  username: string;
  password_hash?: string;
  display_name?: string;
  price: number;
  status: 'active' | 'blocked';
  expiry_date: string;
  assigned_modules: string[];
  created_at: string;
  updated_at: string;
}

export interface CustomerStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  expiredUsers: number;
}

export interface CustomerCreationInput {
  customer_id?: string;
  username: string;
  password: string;
  display_name?: string;
  price: number;
  status: 'active' | 'blocked';
  expiry_date: string;
  assigned_modules: string[];
}

export interface CreatedCustomerResult {
  customer: Customer;
  credentials: {
    customer_id: string;
    username: string;
    password: string;
    display_name?: string;
    price: number;
    status: 'active' | 'blocked';
    expiry_date: string;
    assigned_modules: string[];
  };
}

// ==========================================
// ADMIN PANEL ENTITIES
// ==========================================

export interface AdminUser {
  id: string;
  username: string;
  role: 'admin' | 'operator' | 'user';
  clearanceLevel: number;
  accountStatus: 'active' | 'disabled';
  email?: string;
  nodeRegion: string;
  createdAt: string;
  lastLoginAt?: string;
  hasCustomPricing?: boolean;
  customPricing?: UserCustomPricing | null;
  licenseCount?: number;
}

export interface UserCustomPricing {
  id: string;
  userId: string;
  plan15Price: number;
  plan20Price: number;
  plan30Price: number;
  planPermPrice: number;
  updatedAt: string;
  updatedBy: string;
}

export interface AdminRuntimePlan {
  id: string;
  name: string;
  durationDays: number;
  defaultPrice: number;
  status: 'active' | 'inactive';
  badge: string;
  isPopular?: boolean;
  description: string;
  userPrice?: number;
  hasCustomPrice?: boolean;
}

export interface AdminOrder {
  id: string;
  userId: string;
  username: string;
  moduleId: string;
  moduleName: string;
  planId: string;
  planName: string;
  durationDays: number;
  finalPrice: number;
  paymentStatus: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
  transactionRef: string;
  paymentMethod: string;
  runtimeStart?: string;
  runtimeExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLicense {
  id: string;
  userId: string;
  username: string;
  moduleId: string;
  moduleName: string;
  planId: string;
  isPermanent: boolean;
  durationDays: number;
  startsAt: string;
  expiresAt: string | null;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
  createdBy: string;
}

export interface AdminSession {
  id: string;
  userId: string;
  username: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  clearanceLevel: number;
  role: string;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface AdminActivityLog {
  id: string;
  timestamp: string;
  adminId: string;
  action: string;
  targetResource: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILED';
  details: string;
}

export interface AdminOverviewStats {
  totalUsers: number;
  activeUsers: number;
  disabledUsers?: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  activeLicenses: number;
  expiredLicenses: number;
  totalRevenue: number;
  activeSessionsCount: number;
  totalModules: number;
  gatewayStatus: string;
  encryptionStandard: string;
}

export interface SystemSettingsData {
  gatewayVersion: string;
  maintenanceMode: boolean;
  requirePoW: boolean;
  defaultNode: string;
  upiQrImageUrl: string;
  sessionTimeoutHours: number;
}
