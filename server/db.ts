import crypto from 'crypto';

// Types for relational entities
export interface UserEntity {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: 'admin' | 'operator' | 'user';
  clearanceLevel: number;
  accountStatus: 'active' | 'disabled';
  email?: string;
  nodeRegion: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserPricingEntity {
  id: string;
  userId: string;
  plan15Price: number;
  plan20Price: number;
  plan30Price: number;
  planPermPrice: number;
  updatedAt: string;
  updatedBy: string;
}

export interface RuntimePlanEntity {
  id: string;
  name: string;
  durationDays: number; // -1 for permanent
  defaultPrice: number;
  status: 'active' | 'inactive';
  badge: string;
  isPopular?: boolean;
  description: string;
}

export interface ModuleEntity {
  id: string;
  name: string;
  version: string;
  description: string;
  tag: string;
  icon: string;
  status: 'enabled' | 'disabled';
  requiredRuntime: string;
  orderIndex: number;
}

export interface OrderEntity {
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

export interface LicenseEntity {
  id: string;
  userId: string;
  username: string;
  moduleId: string;
  moduleName: string;
  planId: string;
  isPermanent: boolean;
  durationDays: number;
  startsAt: string;
  expiresAt: string | null; // null for permanent
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
  createdBy: string;
}

export interface SessionEntity {
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

export interface ActivityLogEntity {
  id: string;
  timestamp: string;
  adminId: string;
  action: string;
  targetResource: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILED';
  details: string;
}

export interface SystemSettings {
  gatewayVersion: string;
  maintenanceMode: boolean;
  requirePoW: boolean;
  defaultNode: string;
  upiQrImageUrl: string;
  sessionTimeoutHours: number;
}

// Password hashing utility using SHA-256 + Salt
export function hashPassword(password: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateSessionToken(): string {
  return 'AEGIS-' + crypto.randomBytes(24).toString('hex').toUpperCase();
}

// Database initial state
class AegisDatabase {
  private users: Map<string, UserEntity> = new Map();
  private userPricing: Map<string, UserPricingEntity> = new Map();
  private runtimePlans: Map<string, RuntimePlanEntity> = new Map();
  private modules: Map<string, ModuleEntity> = new Map();
  private orders: Map<string, OrderEntity> = new Map();
  private licenses: Map<string, LicenseEntity> = new Map();
  private sessions: Map<string, SessionEntity> = new Map();
  private activityLogs: ActivityLogEntity[] = [];
  private settings: SystemSettings = {
    gatewayVersion: 'v4.8.2',
    maintenanceMode: false,
    requirePoW: true,
    defaultNode: 'SG-01 (Singapore)',
    upiQrImageUrl: 'https://i.ibb.co/jPq2zZBP/IMG-20260819-221909-884.jpg',
    sessionTimeoutHours: 168, // 7 days
  };

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Seed Default Admin & Operator accounts
    const envAdminUsername = process.env.ADMIN_USERNAME || 'ADMINXD';
    const envAdminPassword = process.env.ADMIN_PASSWORD || 'ADMIN5921N';
    const adminSalt = generateSalt();
    const adminUser: UserEntity = {
      id: 'USER_ADMINXD',
      username: envAdminUsername,
      passwordHash: hashPassword(envAdminPassword, adminSalt),
      salt: adminSalt,
      role: 'admin',
      clearanceLevel: 5,
      accountStatus: 'active',
      email: 'admin@aegis-defense.internal',
      nodeRegion: 'Asia-SE',
      createdAt: '2026-01-10T08:00:00.000Z',
      lastLoginAt: new Date().toISOString(),
    };
    this.users.set(adminUser.id, adminUser);

    const user10025Salt = generateSalt();
    const user10025: UserEntity = {
      id: 'USER_10025',
      username: 'USER_10025',
      passwordHash: hashPassword('PASS10025', user10025Salt),
      salt: user10025Salt,
      role: 'user',
      clearanceLevel: 3,
      accountStatus: 'active',
      email: 'user10025@network.node',
      nodeRegion: 'EU-Central',
      createdAt: '2026-02-14T11:20:00.000Z',
    };
    this.users.set(user10025.id, user10025);

    const user10026Salt = generateSalt();
    const user10026: UserEntity = {
      id: 'USER_10026',
      username: 'USER_10026',
      passwordHash: hashPassword('PASS10026', user10026Salt),
      salt: user10026Salt,
      role: 'user',
      clearanceLevel: 2,
      accountStatus: 'active',
      email: 'user10026@edge.internal',
      nodeRegion: 'US-East',
      createdAt: '2026-02-15T09:12:00.000Z',
    };
    this.users.set(user10026.id, user10026);

    const userVipSalt = generateSalt();
    const userVip: UserEntity = {
      id: 'USER_VIP_SHIELD',
      username: 'VIP_OPERATOR',
      passwordHash: hashPassword('SHIELD990', userVipSalt),
      salt: userVipSalt,
      role: 'user',
      clearanceLevel: 4,
      accountStatus: 'active',
      email: 'vip@cybercorps.global',
      nodeRegion: 'Asia-East',
      createdAt: '2026-02-01T14:45:00.000Z',
    };
    this.users.set(userVip.id, userVip);

    // 2. Seed Default Global Runtime Plans
    const plans: RuntimePlanEntity[] = [
      {
        id: 'plan-15',
        name: '15 DAYS RUNTIME',
        durationDays: 15,
        defaultPrice: 120,
        status: 'active',
        badge: 'BASIC',
        description: 'Standard 15-day operational license with continuous telemetry routing.',
      },
      {
        id: 'plan-20',
        name: '20 DAYS RUNTIME',
        durationDays: 20,
        defaultPrice: 135,
        status: 'active',
        badge: 'STANDARD',
        description: 'Extended 20-day license with multi-cluster fallback routing.',
      },
      {
        id: 'plan-30',
        name: '30 DAYS RUNTIME',
        durationDays: 30,
        defaultPrice: 150,
        status: 'active',
        badge: 'RECOMMENDED',
        isPopular: true,
        description: 'Full monthly access license with priority hardware TRNG entropy allocation.',
      },
      {
        id: 'plan-perm',
        name: 'PERMANENT RUNTIME',
        durationDays: -1,
        defaultPrice: 200,
        status: 'active',
        badge: 'LIFETIME',
        description: 'Non-expiring permanent license with unrestricted module dispatch clearance.',
      },
    ];
    for (const p of plans) {
      this.runtimePlans.set(p.id, p);
    }

    // 3. Seed Custom Pricing Override Example for USER_10025
    const customPricing10025: UserPricingEntity = {
      id: 'UPRIC_10025',
      userId: 'USER_10025',
      plan15Price: 100,
      plan20Price: 115,
      plan30Price: 130,
      planPermPrice: 180,
      updatedAt: new Date().toISOString(),
      updatedBy: 'ADMINXD',
    };
    this.userPricing.set('USER_10025', customPricing10025);

    // 4. Seed Modules
    const initialModules: ModuleEntity[] = [
      {
        id: 'angry-mod',
        name: 'ANGRY MOD',
        version: '2.4.0',
        description: 'Advanced telemetry instrumentation & sandboxed runtime virtualization environment.',
        tag: 'V2.4 KERNEL',
        icon: 'Zap',
        status: 'enabled',
        requiredRuntime: '15+ Days',
        orderIndex: 1,
      },
      {
        id: 'bala-mod-xyz',
        name: 'BALA MOD XYZ',
        version: '5.2.0',
        description: 'Next-generation high-frequency vector accelerator & dynamic memory runtime interceptor.',
        tag: 'XYZ MATRIX',
        icon: 'Flame',
        status: 'enabled',
        requiredRuntime: '15+ Days',
        orderIndex: 2,
      },
      {
        id: 'gk-panel',
        name: 'GK PANEL',
        version: '1.8.2',
        description: 'Kernel dispatch inspector and real-time buffer telemetry monitor.',
        tag: 'SYS OVERLAY',
        icon: 'Cpu',
        status: 'enabled',
        requiredRuntime: '15+ Days',
        orderIndex: 3,
      },
      {
        id: 'rapid-core',
        name: 'RAPID CORE',
        version: '3.1.0',
        description: 'High-frequency thread scheduler and ultra-low latency packet optimizer.',
        tag: 'LATENCY ENGINE',
        icon: 'Activity',
        status: 'enabled',
        requiredRuntime: '20+ Days',
        orderIndex: 4,
      },
      {
        id: 'dripclint',
        name: 'DRIPCLINT',
        version: '1.2.9',
        description: 'UI stream layout interceptor and dynamic HUD render layer synchronization.',
        tag: 'STREAM SYNC',
        icon: 'Droplets',
        status: 'enabled',
        requiredRuntime: '15+ Days',
        orderIndex: 5,
      },
      {
        id: 'xyz-cheats',
        name: 'XYZ CHEATS',
        version: '4.0.1',
        description: 'Algorithmic 3D coordinate vector math solver and memory diagnostic analyzer.',
        tag: 'VECTOR MATH',
        icon: 'Crosshair',
        status: 'enabled',
        requiredRuntime: '30+ Days',
        orderIndex: 6,
      },
      {
        id: 'silent-cheats',
        name: 'SILENT CHEATS',
        version: '2.0.4',
        description: 'Stealth process sandbox auditor and zero-footprint memory trace wiper.',
        tag: 'ZERO TRACE',
        icon: 'EyeOff',
        status: 'enabled',
        requiredRuntime: 'Permanent',
        orderIndex: 7,
      },
    ];
    for (const m of initialModules) {
      this.modules.set(m.id, m);
    }

    // 5. Seed Initial Orders & Licenses
    const order1: OrderEntity = {
      id: 'ORD-98214',
      userId: 'USER_10025',
      username: 'USER_10025',
      moduleId: 'bala-mod-xyz',
      moduleName: 'BALA MOD XYZ',
      planId: 'plan-30',
      planName: '30 DAYS RUNTIME',
      durationDays: 30,
      finalPrice: 130, // applied custom price!
      paymentStatus: 'PAID',
      transactionRef: 'UPI-TXN-8849102914',
      paymentMethod: 'UPI_QR',
      runtimeStart: '2026-02-15T10:00:00.000Z',
      runtimeExpiry: '2026-03-17T10:00:00.000Z',
      createdAt: '2026-02-15T09:58:00.000Z',
      updatedAt: '2026-02-15T10:00:00.000Z',
    };
    this.orders.set(order1.id, order1);

    const lic1: LicenseEntity = {
      id: 'LIC-77401',
      userId: 'USER_10025',
      username: 'USER_10025',
      moduleId: 'bala-mod-xyz',
      moduleName: 'BALA MOD XYZ',
      planId: 'plan-30',
      isPermanent: false,
      durationDays: 30,
      startsAt: '2026-02-15T10:00:00.000Z',
      expiresAt: '2026-03-17T10:00:00.000Z',
      status: 'active',
      createdAt: '2026-02-15T10:00:00.000Z',
      createdBy: 'SYSTEM_GATEWAY',
    };
    this.licenses.set(lic1.id, lic1);

    const order2: OrderEntity = {
      id: 'ORD-98215',
      userId: 'USER_VIP_SHIELD',
      username: 'VIP_OPERATOR',
      moduleId: 'angry-mod',
      moduleName: 'ANGRY MOD',
      planId: 'plan-perm',
      planName: 'PERMANENT RUNTIME',
      durationDays: -1,
      finalPrice: 200,
      paymentStatus: 'PAID',
      transactionRef: 'UPI-TXN-5592810034',
      paymentMethod: 'UPI_QR',
      runtimeStart: '2026-02-10T12:00:00.000Z',
      createdAt: '2026-02-10T11:55:00.000Z',
      updatedAt: '2026-02-10T12:00:00.000Z',
    };
    this.orders.set(order2.id, order2);

    const lic2: LicenseEntity = {
      id: 'LIC-77402',
      userId: 'USER_VIP_SHIELD',
      username: 'VIP_OPERATOR',
      moduleId: 'angry-mod',
      moduleName: 'ANGRY MOD',
      planId: 'plan-perm',
      isPermanent: true,
      durationDays: -1,
      startsAt: '2026-02-10T12:00:00.000Z',
      expiresAt: null, // non-expiring
      status: 'active',
      createdAt: '2026-02-10T12:00:00.000Z',
      createdBy: 'ADMINXD',
    };
    this.licenses.set(lic2.id, lic2);

    const order3: OrderEntity = {
      id: 'ORD-98216',
      userId: 'USER_10026',
      username: 'USER_10026',
      moduleId: 'rapid-core',
      moduleName: 'RAPID CORE',
      planId: 'plan-15',
      planName: '15 DAYS RUNTIME',
      durationDays: 15,
      finalPrice: 120,
      paymentStatus: 'PENDING',
      transactionRef: 'UPI-TXN-PENDING-771',
      paymentMethod: 'UPI_QR',
      createdAt: '2026-02-19T10:15:00.000Z',
      updatedAt: '2026-02-19T10:15:00.000Z',
    };
    this.orders.set(order3.id, order3);

    // 6. Seed Initial Activity Logs
    this.logActivity('SYSTEM', 'SYSTEM_INITIALIZATION', 'GATEWAY_CORE', 'SUCCESS', 'Kyber-1024 cryptographic database loaded with 4 seed operators.');
    this.logActivity('ADMINXD', 'PRICE_OVERRIDE_UPDATED', 'USER_10025', 'SUCCESS', 'Custom pricing override configured for USER_10025 (15D: ₹100, 30D: ₹130, PERM: ₹180).');
    this.logActivity('ADMINXD', 'LICENSE_PROVISIONED', 'LIC-77402', 'SUCCESS', 'Permanent lifetime license granted for ANGRY MOD to VIP_OPERATOR.');
  }

  // Activity logger helper
  public logActivity(
    adminId: string,
    action: string,
    targetResource: string,
    result: 'SUCCESS' | 'WARNING' | 'FAILED',
    details: string
  ) {
    const log: ActivityLogEntity = {
      id: 'LOG-' + Date.now().toString(16) + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      adminId,
      action,
      targetResource,
      result,
      details,
    };
    this.activityLogs.unshift(log);
    if (this.activityLogs.length > 500) {
      this.activityLogs.pop();
    }
    return log;
  }

  // ==========================================
  // USER METHODS
  // ==========================================
  public generateUniqueAuthorisedId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    let isUnique = false;
    while (!isUnique) {
      let rand = '';
      for (let i = 0; i < 5; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      id = `USR-${rand}`;
      if (!this.getUserById(id) && !this.getUserByUsername(id)) {
        isUnique = true;
      }
    }
    return id;
  }

  public generateSecurePassKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const chunk = (len: number) => {
      let str = '';
      for (let i = 0; i < len; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return str;
    };
    return `AEGIS-${chunk(4)}-${chunk(4)}`;
  }

  public getAllUsers(): UserEntity[] {
    return Array.from(this.users.values());
  }

  public getUserById(id: string): UserEntity | undefined {
    return this.users.get(id);
  }

  public getUserByUsername(username: string): UserEntity | undefined {
    const normalized = username.trim().toUpperCase();
    for (const user of this.users.values()) {
      if (user.username.toUpperCase() === normalized || user.id.toUpperCase() === normalized) {
        return user;
      }
    }
    return undefined;
  }

  public createUser(
    userData: {
      username: string;
      password: string;
      role?: 'admin' | 'operator' | 'user';
      clearanceLevel?: number;
      email?: string;
      nodeRegion?: string;
      accountStatus?: 'active' | 'disabled';
    },
    adminId?: string
  ): UserEntity {
    const salt = generateSalt();
    const id = userData.username.toUpperCase().startsWith('USR-')
      ? userData.username.toUpperCase()
      : (userData.username.toUpperCase().startsWith('USER_') ? userData.username.toUpperCase() : `USR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
    
    const newUser: UserEntity = {
      id,
      username: userData.username.toUpperCase().trim(),
      passwordHash: hashPassword(userData.password.trim(), salt),
      salt,
      role: userData.role || 'user',
      clearanceLevel: userData.clearanceLevel || 3,
      accountStatus: userData.accountStatus || 'active',
      email: userData.email || `${userData.username.toLowerCase()}@node.internal`,
      nodeRegion: userData.nodeRegion || 'Asia-SE',
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, newUser);
    if (adminId) {
      this.logActivity(
        adminId,
        'USER_ACCOUNT_CREATED',
        id,
        'SUCCESS',
        `Admin created authorized account ${id} with status ${newUser.accountStatus}`
      );
    }
    return newUser;
  }

  public resetUserPassword(userId: string, newPassKey: string, adminId: string): boolean {
    const user = this.getUserById(userId) || this.getUserByUsername(userId);
    if (!user) return false;

    const newSalt = generateSalt();
    user.salt = newSalt;
    user.passwordHash = hashPassword(newPassKey.trim(), newSalt);

    // Revoke old sessions for security
    this.revokeAllUserSessions(user.id, adminId);
    this.logActivity(adminId, 'USER_PASSKEY_RESET', user.username, 'SUCCESS', `Pass Key regenerated for ${user.username}.`);
    return true;
  }

  public deleteUser(userId: string, adminId: string): boolean {
    const user = this.getUserById(userId) || this.getUserByUsername(userId);
    if (!user) return false;

    this.users.delete(user.id);
    this.userPricing.delete(user.id);
    this.revokeAllUserSessions(user.id, adminId);

    // Revoke all licenses
    for (const lic of this.licenses.values()) {
      if (lic.userId === user.id || lic.username === user.username) {
        lic.status = 'revoked';
      }
    }

    this.logActivity(adminId, 'USER_DELETED', user.username, 'SUCCESS', `Account ${user.username} deleted.`);
    return true;
  }

  public updateUserStatus(id: string, status: 'active' | 'disabled'): boolean {
    const user = this.users.get(id) || this.getUserByUsername(id);
    if (!user) return false;
    user.accountStatus = status;
    if (status === 'disabled') {
      this.revokeAllUserSessions(user.id, 'SYSTEM');
    }
    return true;
  }

  // ==========================================
  // PRICING CALCULATION (CRITICAL REQUIREMENT)
  // ==========================================
  public getUserCustomPricing(userId: string): UserPricingEntity | undefined {
    return this.userPricing.get(userId);
  }

  public getAllCustomPricings(): UserPricingEntity[] {
    return Array.from(this.userPricing.values());
  }

  public setCustomPricing(userId: string, prices: {
    plan15Price: number;
    plan20Price: number;
    plan30Price: number;
    planPermPrice: number;
  }, adminId: string): UserPricingEntity {
    const existing = this.userPricing.get(userId);
    const entry: UserPricingEntity = {
      id: existing ? existing.id : 'UPRIC_' + Date.now().toString(16),
      userId,
      plan15Price: Math.max(0, prices.plan15Price),
      plan20Price: Math.max(0, prices.plan20Price),
      plan30Price: Math.max(0, prices.plan30Price),
      planPermPrice: Math.max(0, prices.planPermPrice),
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    };
    this.userPricing.set(userId, entry);
    this.logActivity(adminId, 'PRICE_OVERRIDE_UPDATED', userId, 'SUCCESS', 
      `Prices set: 15D=₹${entry.plan15Price}, 20D=₹${entry.plan20Price}, 30D=₹${entry.plan30Price}, PERM=₹${entry.planPermPrice}`);
    return entry;
  }

  public resetCustomPricing(userId: string, adminId: string): boolean {
    const existed = this.userPricing.delete(userId);
    if (existed) {
      this.logActivity(adminId, 'PRICE_OVERRIDE_RESET', userId, 'SUCCESS', 'Custom prices reset to global default catalogue.');
    }
    return existed;
  }

  // Resolves the exact final price for a user and plan (never trust client!)
  public calculateApplicablePrice(userId: string, planId: string): number {
    const custom = this.userPricing.get(userId);
    if (custom) {
      if (planId === 'plan-15') return custom.plan15Price;
      if (planId === 'plan-20') return custom.plan20Price;
      if (planId === 'plan-30') return custom.plan30Price;
      if (planId === 'plan-perm') return custom.planPermPrice;
    }

    const globalPlan = this.runtimePlans.get(planId);
    if (globalPlan) {
      return globalPlan.defaultPrice;
    }

    // Default fallback
    if (planId === 'plan-15') return 120;
    if (planId === 'plan-20') return 135;
    if (planId === 'plan-30') return 150;
    if (planId === 'plan-perm') return 200;
    return 150;
  }

  // Returns runtime plans with user's specific price overrides applied
  public getRuntimePlansForUser(userId?: string): Array<RuntimePlanEntity & { userPrice: number; hasCustomPrice: boolean }> {
    const userCustom = userId ? this.userPricing.get(userId) : undefined;
    const result = [];

    for (const plan of this.runtimePlans.values()) {
      let userPrice = plan.defaultPrice;
      let hasCustomPrice = false;

      if (userCustom) {
        if (plan.id === 'plan-15' && userCustom.plan15Price !== undefined) {
          userPrice = userCustom.plan15Price;
          hasCustomPrice = true;
        } else if (plan.id === 'plan-20' && userCustom.plan20Price !== undefined) {
          userPrice = userCustom.plan20Price;
          hasCustomPrice = true;
        } else if (plan.id === 'plan-30' && userCustom.plan30Price !== undefined) {
          userPrice = userCustom.plan30Price;
          hasCustomPrice = true;
        } else if (plan.id === 'plan-perm' && userCustom.planPermPrice !== undefined) {
          userPrice = userCustom.planPermPrice;
          hasCustomPrice = true;
        }
      }

      result.push({
        ...plan,
        userPrice,
        hasCustomPrice,
      });
    }

    return result;
  }

  // ==========================================
  // RUNTIME PLANS CRUD
  // ==========================================
  public getAllRuntimePlans(): RuntimePlanEntity[] {
    return Array.from(this.runtimePlans.values());
  }

  public updateRuntimePlan(id: string, data: Partial<RuntimePlanEntity>, adminId: string): RuntimePlanEntity | null {
    const plan = this.runtimePlans.get(id);
    if (!plan) return null;

    if (data.name !== undefined) plan.name = data.name;
    if (data.durationDays !== undefined) plan.durationDays = data.durationDays;
    if (data.defaultPrice !== undefined) plan.defaultPrice = Math.max(0, data.defaultPrice);
    if (data.status !== undefined) plan.status = data.status;
    if (data.badge !== undefined) plan.badge = data.badge;
    if (data.description !== undefined) plan.description = data.description;
    if (data.isPopular !== undefined) plan.isPopular = data.isPopular;

    this.logActivity(adminId, 'RUNTIME_PLAN_UPDATED', id, 'SUCCESS', `Plan ${plan.name} updated: ₹${plan.defaultPrice}`);
    return plan;
  }

  // ==========================================
  // MODULES CRUD
  // ==========================================
  public getAllModules(): ModuleEntity[] {
    return Array.from(this.modules.values()).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getModuleById(id: string): ModuleEntity | undefined {
    return this.modules.get(id);
  }

  public createModule(data: Omit<ModuleEntity, 'orderIndex'>, adminId: string): ModuleEntity {
    const orderIndex = this.modules.size + 1;
    const newModule: ModuleEntity = {
      ...data,
      orderIndex,
    };
    this.modules.set(newModule.id, newModule);
    this.logActivity(adminId, 'MODULE_CREATED', newModule.id, 'SUCCESS', `Module ${newModule.name} created.`);
    return newModule;
  }

  public updateModule(id: string, data: Partial<ModuleEntity>, adminId: string): ModuleEntity | null {
    const mod = this.modules.get(id);
    if (!mod) return null;

    if (data.name !== undefined) mod.name = data.name;
    if (data.version !== undefined) mod.version = data.version;
    if (data.description !== undefined) mod.description = data.description;
    if (data.tag !== undefined) mod.tag = data.tag;
    if (data.icon !== undefined) mod.icon = data.icon;
    if (data.status !== undefined) mod.status = data.status;
    if (data.requiredRuntime !== undefined) mod.requiredRuntime = data.requiredRuntime;

    this.logActivity(adminId, 'MODULE_UPDATED', id, 'SUCCESS', `Module ${mod.name} updated.`);
    return mod;
  }

  public toggleModuleStatus(id: string, adminId: string): ModuleEntity | null {
    const mod = this.modules.get(id);
    if (!mod) return null;
    mod.status = mod.status === 'enabled' ? 'disabled' : 'enabled';
    this.logActivity(adminId, 'MODULE_STATUS_TOGGLED', id, 'SUCCESS', `Module ${mod.name} set to ${mod.status}.`);
    return mod;
  }

  public deleteModule(id: string, adminId: string): boolean {
    const mod = this.modules.get(id);
    if (!mod) return false;
    this.modules.delete(id);
    this.logActivity(adminId, 'MODULE_DELETED', id, 'WARNING', `Module ${mod.name} deleted.`);
    return true;
  }

  // ==========================================
  // ORDERS & PAYMENTS
  // ==========================================
  public getAllOrders(): OrderEntity[] {
    return Array.from(this.orders.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrdersForUser(userId: string): OrderEntity[] {
    return this.getAllOrders().filter((o) => o.userId === userId);
  }

  public createOrder(userId: string, moduleId: string, planId: string): OrderEntity {
    const user = this.getUserById(userId) || this.getUserByUsername(userId);
    const mod = this.getModuleById(moduleId);
    const plan = this.runtimePlans.get(planId);

    const finalPrice = this.calculateApplicablePrice(user ? user.id : userId, planId);
    const id = 'ORD-' + Math.floor(10000 + Math.random() * 90000);

    const newOrder: OrderEntity = {
      id,
      userId: user ? user.id : userId,
      username: user ? user.username : userId,
      moduleId,
      moduleName: mod ? mod.name : moduleId,
      planId,
      planName: plan ? plan.name : planId,
      durationDays: plan ? plan.durationDays : 30,
      finalPrice,
      paymentStatus: 'PENDING',
      transactionRef: 'UPI-TXN-' + Math.floor(1000000000 + Math.random() * 9000000000),
      paymentMethod: 'UPI_QR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(id, newOrder);
    return newOrder;
  }

  public updateOrderStatus(
    orderId: string,
    status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED',
    adminId: string
  ): OrderEntity | null {
    const order = this.orders.get(orderId);
    if (!order) return null;

    order.paymentStatus = status;
    order.updatedAt = new Date().toISOString();

    if (status === 'PAID') {
      const now = new Date();
      order.runtimeStart = now.toISOString();

      if (order.durationDays > 0) {
        const exp = new Date(now.getTime() + order.durationDays * 24 * 60 * 60 * 1000);
        order.runtimeExpiry = exp.toISOString();
      } else {
        order.runtimeExpiry = undefined; // Permanent
      }

      // Automatically grant license upon verified payment
      this.provisionLicense(order.userId, order.username, order.moduleId, order.moduleName, order.planId, order.durationDays, adminId);
    }

    this.logActivity(adminId, 'ORDER_STATUS_CHANGED', orderId, 'SUCCESS', `Order ${orderId} marked as ${status}.`);
    return order;
  }

  // ==========================================
  // LICENSES
  // ==========================================
  public getAllLicenses(): LicenseEntity[] {
    return Array.from(this.licenses.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getLicensesForUser(userId: string): LicenseEntity[] {
    return this.getAllLicenses().filter((l) => l.userId === userId || l.username.toUpperCase() === userId.toUpperCase());
  }

  public provisionLicense(
    userId: string,
    username: string,
    moduleId: string,
    moduleName: string,
    planId: string,
    durationDays: number,
    adminId: string
  ): LicenseEntity {
    const now = new Date();
    const isPermanent = durationDays <= 0;
    const expiresAt = isPermanent
      ? null
      : new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const licId = 'LIC-' + Math.floor(10000 + Math.random() * 90000);
    const license: LicenseEntity = {
      id: licId,
      userId,
      username,
      moduleId,
      moduleName,
      planId,
      isPermanent,
      durationDays,
      startsAt: now.toISOString(),
      expiresAt,
      status: 'active',
      createdAt: now.toISOString(),
      createdBy: adminId,
    };

    this.licenses.set(licId, license);
    this.logActivity(adminId, 'LICENSE_PROVISIONED', licId, 'SUCCESS', `License granted to ${username} for ${moduleName} (${isPermanent ? 'Permanent' : `${durationDays} Days`})`);
    return license;
  }

  public updateLicenseStatus(licenseId: string, status: 'active' | 'revoked' | 'expired', adminId: string): LicenseEntity | null {
    const lic = this.licenses.get(licenseId);
    if (!lic) return null;
    lic.status = status;
    this.logActivity(adminId, 'LICENSE_STATUS_UPDATED', licenseId, 'SUCCESS', `License ${licenseId} changed to ${status}.`);
    return lic;
  }

  public extendLicenseExpiry(licenseId: string, extraDays: number, adminId: string): LicenseEntity | null {
    const lic = this.licenses.get(licenseId);
    if (!lic) return null;

    if (extraDays <= 0) {
      lic.isPermanent = true;
      lic.expiresAt = null;
      lic.durationDays = -1;
    } else {
      const currentExpiry = lic.expiresAt ? new Date(lic.expiresAt) : new Date();
      const base = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(base.getTime() + extraDays * 24 * 60 * 60 * 1000);
      lic.expiresAt = newExpiry.toISOString();
      lic.isPermanent = false;
      lic.status = 'active';
    }

    this.logActivity(adminId, 'LICENSE_EXTENDED', licenseId, 'SUCCESS', `License ${licenseId} extended by ${extraDays > 0 ? `${extraDays} days` : 'Permanent'}.`);
    return lic;
  }

  // ==========================================
  // SESSIONS
  // ==========================================
  public createSession(user: UserEntity, ipAddress: string, userAgent: string): SessionEntity {
    const token = generateSessionToken();
    const now = Date.now();
    const session: SessionEntity = {
      id: 'SESS-' + crypto.randomBytes(8).toString('hex'),
      userId: user.id,
      username: user.username,
      token,
      ipAddress,
      userAgent,
      clearanceLevel: user.clearanceLevel,
      role: user.role,
      isActive: true,
      createdAt: now,
      expiresAt: now + this.settings.sessionTimeoutHours * 60 * 60 * 1000,
    };
    this.sessions.set(token, session);
    user.lastLoginAt = new Date().toISOString();
    return session;
  }

  public getSessionByToken(token: string): SessionEntity | undefined {
    const sess = this.sessions.get(token);
    if (!sess) return undefined;
    if (!sess.isActive || sess.expiresAt < Date.now()) {
      return undefined;
    }
    return sess;
  }

  public revokeSession(token: string, adminId: string): boolean {
    const sess = this.sessions.get(token);
    if (!sess) return false;
    sess.isActive = false;
    this.logActivity(adminId, 'SESSION_REVOKED', sess.username, 'SUCCESS', `Session ${sess.id} revoked.`);
    return true;
  }

  public revokeAllUserSessions(userId: string, adminId: string): number {
    let count = 0;
    for (const sess of this.sessions.values()) {
      if ((sess.userId === userId || sess.username.toUpperCase() === userId.toUpperCase()) && sess.isActive) {
        sess.isActive = false;
        count++;
      }
    }
    this.logActivity(adminId, 'ALL_USER_SESSIONS_REVOKED', userId, 'SUCCESS', `Revoked ${count} sessions for user ${userId}.`);
    return count;
  }

  public getAllActiveSessions(): SessionEntity[] {
    const now = Date.now();
    return Array.from(this.sessions.values()).filter((s) => s.isActive && s.expiresAt > now);
  }

  // ==========================================
  // ACTIVITY LOGS
  // ==========================================
  public getActivityLogs(limit = 100): ActivityLogEntity[] {
    return this.activityLogs.slice(0, limit);
  }

  // ==========================================
  // DASHBOARD METRICS (DYNAMIC DATABASE CALCULATION)
  // ==========================================
  public getOverviewStats() {
    const allUsers = this.getAllUsers();
    const activeUsers = allUsers.filter((u) => u.accountStatus === 'active');
    const disabledUsers = allUsers.filter((u) => u.accountStatus === 'disabled');
    const allOrders = this.getAllOrders();
    const paidOrders = allOrders.filter((o) => o.paymentStatus === 'PAID');
    const pendingOrders = allOrders.filter((o) => o.paymentStatus === 'PENDING');
    
    const allLicenses = this.getAllLicenses();
    const now = new Date();
    const activeLicenses = allLicenses.filter((l) => {
      if (l.status !== 'active') return false;
      if (l.isPermanent) return true;
      if (!l.expiresAt) return true;
      return new Date(l.expiresAt) > now;
    });
    const expiredLicenses = allLicenses.filter((l) => {
      if (l.status === 'expired') return true;
      if (l.isPermanent) return false;
      if (l.expiresAt && new Date(l.expiresAt) <= now) return true;
      return false;
    });

    const totalRevenue = paidOrders.reduce((acc, curr) => acc + (curr.finalPrice || 0), 0);
    const activeSessions = this.getAllActiveSessions();

    return {
      totalUsers: allUsers.length,
      activeUsers: activeUsers.length,
      disabledUsers: disabledUsers.length,
      totalOrders: allOrders.length,
      pendingOrders: pendingOrders.length,
      completedOrders: paidOrders.length,
      activeLicenses: activeLicenses.length,
      expiredLicenses: expiredLicenses.length,
      totalRevenue,
      activeSessionsCount: activeSessions.length,
      totalModules: this.modules.size,
      gatewayStatus: 'OPTIMAL',
      encryptionStandard: 'KYBER-1024 / AES-256',
    };
  }

  // Settings
  public getSettings(): SystemSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<SystemSettings>, adminId: string): SystemSettings {
    this.settings = { ...this.settings, ...newSettings };
    this.logActivity(adminId, 'SETTINGS_UPDATED', 'SYSTEM_CONFIG', 'SUCCESS', 'Gateway core settings updated.');
    return { ...this.settings };
  }
}

export const aegisDb = new AegisDatabase();
