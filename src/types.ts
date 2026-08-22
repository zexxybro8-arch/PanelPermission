export type AuthTab = 'credentials';

export interface PanelDownloadFile {
  id: string;
  panelId: string;
  title: string;
  downloadUrl: string;
  description?: string;
  version?: string;
  fileSize?: string;
  orderIndex?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PanelSetupStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
}

export interface PanelSetupContent {
  panelId: string;
  enabled: boolean;
  videoUrl?: string;
  videoTitle?: string;
  instructions?: string;
  steps: PanelSetupStep[];
  importantNotes?: string[];
  imageUrl?: string;
  updatedAt?: string;
}

export interface CyberModule {
  id: string;
  name: string;
  description: string;
  tag: string;
  version: string;
  enabled: boolean;
  status?: 'active' | 'inactive';
  price?: number;
  icon?: string;
  imageUrl?: string;
  requiredRuntime?: string;
  orderIndex?: number;
  assignedCustomers?: Array<{ id: string; customer_id: string; username: string }>;
  assignedCustomerIds?: string[];
  filesEnabled?: boolean;
  setupEnabled?: boolean;
  files?: PanelDownloadFile[];
  setup?: PanelSetupContent;
}

export interface PanelPermissionState {
  purchased: boolean;
  payment_status: 'none' | 'pending' | 'approved' | 'rejected';
  verify_access: boolean;
  files_access: boolean;
  setup_access: boolean;
  payment_ref?: string;
  payment_note?: string;
  purchased_at?: string;
  approved_at?: string;
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
  panel_permissions?: Record<string, PanelPermissionState>;
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
  panel_permissions?: Record<string, PanelPermissionState>;
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
  panel_permissions?: Record<string, PanelPermissionState>;
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
    panel_permissions?: Record<string, PanelPermissionState>;
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
  globalVerificationFee?: number;
  showFilesSetupGuide?: boolean;
}

export interface UserVerificationFee {
  id: string;
  userId: string;
  username: string;
  customFee: number;
  enabled: boolean;
  updatedAt: string;
}

export interface PanelPricing {
  "15Days": number;
  "20Days": number;
  "30Days": number;
  "permanent": number;
}

export type CustomerPricing = Record<string, {
  "15Days": number | null;
  "20Days": number | null;
  "30Days": number | null;
  "permanent": number | null;
}>;


// ==========================================
// QR MANAGEMENT ENTITIES
// ==========================================
export interface QrConfig {
  id: string; // unique ID
  panelId: string;
  duration: '15Days' | '20Days' | '30Days' | 'permanent';
  customerId?: string; // Optional: If specific to a customer
  price?: number;
  qrImageUrl: string;
  enabled: boolean;
  updatedAt: string;
}

// ==========================================
// GENERATED KEYS & CREDENTIALS ENTITIES
// ==========================================
export interface GeneratedKeyCredentials {
  id: string; // Generated Access ID (e.g. AG-7K4P9X2M)
  password: string; // Generated Access Password (e.g. Q8N4-LP7Z-2X)
}

export interface GeneratedKeyRecord {
  id: string;
  credentialId?: string;
  key: string;
  userId: string;
  username: string;
  panelId: string;
  panelName: string;
  orderId: string;
  generatedId: string; // Unique generated panel ID (e.g. AG-7K4P9X2M)
  generatedPassword: string; // Unique generated panel password (e.g. Q8N4-LP7Z-2X)
  duration: string;
  durationDays: number;
  credentials: GeneratedKeyCredentials;
  createdAt: string;
  expiresAt: string | null;
  status: 'active' | 'revoked' | 'expired';
  testMode: boolean;
  isTestMode?: boolean;

  // Verification tracking
  verified?: boolean;
  verifiedAt?: string | null;
  lastVerifiedAt?: string | null;
  verificationCount?: number;
}

export interface VerifyKeyResult {
  valid: boolean;
  message: string;
  keyRecord?: GeneratedKeyRecord;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  username: string;
  panelId: string;
  panelName: string;
  accessId: string;
  accessPassword: string;
  fee: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  createdAt: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  orderId?: string | null;
}

