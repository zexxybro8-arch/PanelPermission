import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  AdminUser,
  UserCustomPricing,
  AdminRuntimePlan,
  CyberModule,
  AdminOrder,
  AdminLicense,
  AdminSession,
  AdminActivityLog,
  AdminOverviewStats,
  SystemSettingsData,
  UserProfile,
  Customer,
  CustomerStats,
  CustomerCreationInput,
  CreatedCustomerResult,
  PanelPricing,
  CustomerPricing,
} from '../types';
import { storage } from './storage';

export interface StoredCustomerRecord extends Customer {
  raw_password?: string;
}

export interface StoredUserAccount {
  id: string;
  username: string;
  passwordHash?: string;
  rawPassKey: string;
  role: 'admin' | 'operator' | 'user';
  clearanceLevel: number;
  accountStatus: 'active' | 'disabled';
  email: string;
  nodeRegion: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AppStoreState {
  users: StoredUserAccount[];
  customers: StoredCustomerRecord[];
  userPricing: Record<string, UserCustomPricing>;
  runtimePlans: AdminRuntimePlan[];
  modules: CyberModule[];
  orders: AdminOrder[];
  licenses: AdminLicense[];
  sessions: AdminSession[];
  activityLogs: AdminActivityLog[];
  settings: SystemSettingsData;
  panelPricing: Record<string, PanelPricing>;
  customerPricing: Record<string, CustomerPricing>;
}

const STORAGE_KEY = 'aegis_defense_frontend_store_v1';

export class AppStore {
  public state: AppStoreState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadFromStorage();
    this.initRealtimeSync();
  }

  private initRealtimeSync() {
    try {
      // 1. Customers real-time listener
      onSnapshot(collection(db, 'customers'), (snapshot) => {
        const list: StoredCustomerRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as StoredCustomerRecord);
        });
        if (list.length > 0) {
          this.state.customers = list;
          this.saveToStorageOnly();
          this.notify();
        }
      }, (err) => console.warn('Firestore customers sync error:', err));

      // 2. Modules / Panels real-time listener
      onSnapshot(collection(db, 'modules'), (snapshot) => {
        const list: CyberModule[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as CyberModule);
        });
        if (list.length > 0) {
          this.state.modules = list;
          this.saveToStorageOnly();
          this.notify();
        }
      }, (err) => console.warn('Firestore modules sync error:', err));

      // 3. Plans real-time listener
      onSnapshot(collection(db, 'plans'), (snapshot) => {
        const list: AdminRuntimePlan[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as AdminRuntimePlan);
        });
        if (list.length > 0) {
          this.state.runtimePlans = list;
          this.saveToStorageOnly();
          this.notify();
        }
      }, (err) => console.warn('Firestore plans sync error:', err));

      // 4. Orders real-time listener
      onSnapshot(collection(db, 'orders'), (snapshot) => {
        const list: AdminOrder[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as AdminOrder);
        });
        this.state.orders = list;
        this.saveToStorageOnly();
        this.notify();
      }, (err) => console.warn('Firestore orders sync error:', err));

      // 5. Users real-time listener
      onSnapshot(collection(db, 'users'), (snapshot) => {
        const list: StoredUserAccount[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as StoredUserAccount);
        });
        if (list.length > 0) {
          this.state.users = list;
          this.saveToStorageOnly();
          this.notify();
        }
      }, (err) => console.warn('Firestore users sync error:', err));

      // 6. Custom Pricing real-time listener
      onSnapshot(collection(db, 'userPricing'), (snapshot) => {
        const map: Record<string, UserCustomPricing> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserCustomPricing;
          if (data && data.userId) {
            map[data.userId] = data;
          }
        });
        this.state.userPricing = map;
        this.saveToStorageOnly();
        this.notify();
      }, (err) => console.warn('Firestore userPricing sync error:', err));

      // 7. System Settings real-time listener
      onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
        if (docSnap.exists()) {
          this.state.settings = docSnap.data() as SystemSettingsData;
          this.saveToStorageOnly();
          this.notify();
        }
      }, (err) => console.warn('Firestore settings sync error:', err));

      // 8. Panel Pricing real-time listener
      onSnapshot(collection(db, 'panelPricing'), (snapshot) => {
        const map: Record<string, PanelPricing> = {};
        snapshot.forEach((docSnap) => {
          map[docSnap.id] = docSnap.data() as PanelPricing;
        });
        this.state.panelPricing = map;
        this.saveToStorageOnly();
        this.notify();
      }, (err) => console.warn('Firestore panelPricing sync error:', err));

      // 9. Customer Pricing real-time listener
      onSnapshot(collection(db, 'customerPricing'), (snapshot) => {
        const map: Record<string, CustomerPricing> = {};
        snapshot.forEach((docSnap) => {
          map[docSnap.id] = docSnap.data() as CustomerPricing;
        });
        this.state.customerPricing = map;
        this.saveToStorageOnly();
        this.notify();
      }, (err) => console.warn('Firestore customerPricing sync error:', err));

      // Seed initial data if Firestore database is empty
      this.seedFirestoreIfEmpty();
    } catch (err) {
      console.error('Failed to initialize Firestore real-time sync:', err);
    }
  }

  private async seedFirestoreIfEmpty() {
    try {
      const custSnap = await getDocs(collection(db, 'customers'));
      if (custSnap.empty) {
        for (const c of this.state.customers) {
          await this.syncDocToFirestore('customers', c.id, c);
        }
      }

      const modSnap = await getDocs(collection(db, 'modules'));
      if (modSnap.empty) {
        for (const m of this.state.modules) {
          await this.syncDocToFirestore('modules', m.id, m);
        }
      }

      const planSnap = await getDocs(collection(db, 'plans'));
      if (planSnap.empty) {
        for (const p of this.state.runtimePlans) {
          await this.syncDocToFirestore('plans', p.id, p);
        }
      }

      const userSnap = await getDocs(collection(db, 'users'));
      if (userSnap.empty) {
        for (const u of this.state.users) {
          await this.syncDocToFirestore('users', u.id, u);
        }
      }

      const settingsSnap = await getDocs(collection(db, 'settings'));
      if (settingsSnap.empty) {
        await this.syncDocToFirestore('settings', 'global', this.state.settings);
      }
    } catch (err) {
      console.warn('Failed seeding Firestore:', err);
    }
  }

  private saveToStorageOnly(): void {
    storage.saveAppState(this.state);
  }

  public async syncDocToFirestore(colName: string, docId: string, data: any) {
    try {
      const cleanData = JSON.parse(JSON.stringify(data));
      await setDoc(doc(db, colName, docId), cleanData, { merge: true });
    } catch (err) {
      console.error(`Failed to sync ${colName}/${docId} to Firestore:`, err);
    }
  }

  public async deleteDocFromFirestore(colName: string, docId: string) {
    try {
      await deleteDoc(doc(db, colName, docId));
    } catch (err) {
      console.error(`Failed to delete ${colName}/${docId} from Firestore:`, err);
    }
  }

  private getDefaultState(): AppStoreState {
    const now = new Date().toISOString();
    return {
      customers: [
        {
          id: 'CUST-1001',
          customer_id: 'CUST-1001',
          username: 'CUST-1001',
          raw_password: 'PASS1001',
          display_name: 'TACTICAL CLIENT 1001',
          status: 'active',
          price: 120,
          expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
          assigned_modules: ['MOD-AEGIS-SENTINEL', 'MOD-SPECTRE-FIREWALL', 'MOD-NEURAL-VAULT', 'MOD-CYBER-SCOUT'],
          panel_permissions: {
            'MOD-AEGIS-SENTINEL': { verify_access: false, files_access: false, setup_access: false, payment_status: 'none', purchased: false },
            'MOD-SPECTRE-FIREWALL': { verify_access: false, files_access: false, setup_access: false, payment_status: 'none', purchased: false },
            'MOD-NEURAL-VAULT': { verify_access: false, files_access: false, setup_access: false, payment_status: 'none', purchased: false },
            'MOD-CYBER-SCOUT': { verify_access: false, files_access: false, setup_access: false, payment_status: 'none', purchased: false },
          },
          created_at: now,
          updated_at: now,
        },
      ],
      users: [
        {
          id: 'USR-SAGAR551',
          username: 'SAGAR551',
          rawPassKey: 'SAGAR@SAGAR1',
          role: 'admin',
          clearanceLevel: 5,
          accountStatus: 'active',
          email: 'admin.sec@aegis-defense.internal',
          nodeRegion: 'Global-Core',
          createdAt: now,
        },
        {
          id: 'USR-10025',
          username: 'USER_10025',
          rawPassKey: 'PASS10025',
          role: 'user',
          clearanceLevel: 3,
          accountStatus: 'active',
          email: 'user10025@aegis-defense.internal',
          nodeRegion: 'Asia-SE',
          createdAt: now,
        },
        {
          id: 'USR-CYBERVIP',
          username: 'CYBER_VIP',
          rawPassKey: 'CYBER999',
          role: 'user',
          clearanceLevel: 4,
          accountStatus: 'active',
          email: 'cyber.vip@aegis-defense.internal',
          nodeRegion: 'US-East',
          createdAt: now,
        },
        {
          id: 'USR-VIPSECURE',
          username: 'VIP_SECURE',
          rawPassKey: 'VIPSECURE888',
          role: 'user',
          clearanceLevel: 4,
          accountStatus: 'active',
          email: 'vip.secure@aegis-defense.internal',
          nodeRegion: 'EU-West',
          createdAt: now,
        },
      ],
      userPricing: {
        'USR-10025': {
          id: 'PRC-10025',
          userId: 'USR-10025',
          plan15Price: 100,
          plan20Price: 120,
          plan30Price: 130,
          planPermPrice: 180,
          updatedAt: now,
          updatedBy: 'SAGAR551',
        },
        'USR-CYBERVIP': {
          id: 'PRC-CYBERVIP',
          userId: 'USR-CYBERVIP',
          plan15Price: 90,
          plan20Price: 110,
          plan30Price: 120,
          planPermPrice: 160,
          updatedAt: now,
          updatedBy: 'SAGAR551',
        },
      },
      runtimePlans: [
        {
          id: 'plan-15',
          name: '15 DAYS RUNTIME',
          durationDays: 15,
          defaultPrice: 120,
          status: 'active',
          badge: 'BASIC',
          isPopular: false,
          description: '15 days full access to selected cybersecurity module',
        },
        {
          id: 'plan-20',
          name: '20 DAYS RUNTIME',
          durationDays: 20,
          defaultPrice: 135,
          status: 'active',
          badge: 'STANDARD',
          isPopular: false,
          description: '20 days tactical cybersecurity operations runtime',
        },
        {
          id: 'plan-30',
          name: '30 DAYS RUNTIME',
          durationDays: 30,
          defaultPrice: 150,
          status: 'active',
          badge: 'RECOMMENDED',
          isPopular: true,
          description: '30 days extended high-throughput enterprise runtime',
        },
        {
          id: 'plan-perm',
          name: 'PERMANENT RUNTIME',
          durationDays: -1,
          defaultPrice: 200,
          status: 'active',
          badge: 'LIFETIME',
          isPopular: false,
          description: 'Lifetime perpetual license without expiration',
        },
      ],
      modules: [
        {
          id: 'MOD-AEGIS-SENTINEL',
          name: 'Aegis Quantum Sentinel',
          version: '4.8.2-PRO',
          description: 'Deep neural traffic telemetry, automated DDoS nullification & heuristic zero-day mitigation.',
          tag: 'CORE DEFENSE',
          icon: 'Shield',
          enabled: true,
          requiredRuntime: 'Standard Cyber Runtime (15-30 Days or Perm)',
          orderIndex: 1,
        },
        {
          id: 'MOD-SPECTRE-FIREWALL',
          name: 'Spectre L7 Protocol Shield',
          version: '3.1.0-ELITE',
          description: 'Layer-7 application gateway firewall with deep packet inspection and zero-trust protocol filtering.',
          tag: 'GATEWAY FIREWALL',
          icon: 'Flame',
          enabled: true,
          requiredRuntime: 'Standard Cyber Runtime (15-30 Days or Perm)',
          orderIndex: 2,
        },
        {
          id: 'MOD-NEURAL-VAULT',
          name: 'Neural Key Vault & HSM',
          version: '2.9.4-QUANTUM',
          description: 'Post-quantum lattice cryptographic store with real-time entropy injection & dynamic key rotation.',
          tag: 'CRYPTOGRAPHY',
          icon: 'Lock',
          enabled: true,
          requiredRuntime: 'Standard Cyber Runtime (15-30 Days or Perm)',
          orderIndex: 3,
        },
        {
          id: 'MOD-CYBER-SCOUT',
          name: 'Cyber Reconnaissance Mesh',
          version: '5.0.1-TACTICAL',
          description: 'Continuous attack surface discovery, asset vulnerability scanning & dark-web threat feeds.',
          tag: 'THREAT INTEL',
          icon: 'Radio',
          enabled: true,
          requiredRuntime: 'Standard Cyber Runtime (15-30 Days or Perm)',
          orderIndex: 4,
        },
      ],
      orders: [
        {
          id: 'ORD-84920',
          userId: 'USR-10025',
          username: 'USER_10025',
          moduleId: 'MOD-AEGIS-SENTINEL',
          moduleName: 'Aegis Quantum Sentinel',
          planId: 'plan-30',
          planName: '30 DAYS RUNTIME',
          durationDays: 30,
          finalPrice: 130,
          paymentStatus: 'PAID',
          transactionRef: 'UPI-TXN-9481029481',
          paymentMethod: 'UPI_QR',
          runtimeStart: new Date(Date.now() - 5 * 86400000).toISOString(),
          runtimeExpiry: new Date(Date.now() + 25 * 86400000).toISOString(),
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      ],
      licenses: [
        {
          id: 'LIC-SENTINEL-10025',
          userId: 'USR-10025',
          username: 'USER_10025',
          moduleId: 'MOD-AEGIS-SENTINEL',
          moduleName: 'Aegis Quantum Sentinel',
          planId: 'plan-30',
          isPermanent: false,
          durationDays: 30,
          startsAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          expiresAt: new Date(Date.now() + 25 * 86400000).toISOString(),
          status: 'active',
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          createdBy: 'SAGAR551',
        },
      ],
      sessions: [
        {
          id: 'SESS-001',
          userId: 'USR-SAGAR551',
          username: 'SAGAR551',
          token: 'AEGIS-ACTIVE-01',
          ipAddress: '127.0.0.1 (Local Core)',
          userAgent: 'Aegis Quantum Admin Console',
          clearanceLevel: 5,
          role: 'admin',
          isActive: true,
          createdAt: Date.now() - 3600000,
          expiresAt: Date.now() + 600000000,
        },
      ],
      activityLogs: [
        {
          id: 'LOG-001',
          timestamp: new Date().toISOString(),
          adminId: 'SYSTEM',
          action: 'GATEWAY_INITIALIZED',
          targetResource: 'AEGIS_CORE',
          result: 'SUCCESS',
          details: 'Frontend-only application core initialized in browser memory and local storage.',
        },
      ],
      settings: {
        gatewayVersion: 'v4.8.2',
        maintenanceMode: false,
        requirePoW: true,
        defaultNode: 'SG-01 (Singapore)',
        upiQrImageUrl: 'https://i.ibb.co/jPq2zZBP/IMG-20260819-221909-884.jpg',
        sessionTimeoutHours: 168,
      },
      panelPricing: {},
      customerPricing: {},
    };
  }

  private loadFromStorage(): AppStoreState {
    try {
      const parsed = storage.loadAppState();
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.modules)) {
        if (!Array.isArray(parsed.customers)) {
          parsed.customers = [];
        }
        if (!parsed.panelPricing) {
          parsed.panelPricing = {};
        }
        if (!parsed.customerPricing) {
          parsed.customerPricing = {};
        }
        // Ensure stored admin matches current SAGAR551 credentials
        const adminIdx = parsed.users.findIndex((u: any) => u.role === 'admin' || u.username === 'SAGAR551');
        if (adminIdx !== -1) {
          parsed.users[adminIdx] = {
            ...parsed.users[adminIdx],
            id: 'USR-SAGAR551',
            username: 'SAGAR551',
            rawPassKey: 'SAGAR@SAGAR1',
            role: 'admin',
            clearanceLevel: 5,
            accountStatus: 'active',
          };
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    const def = this.getDefaultState();
    this.saveToStorage(def);
    return def;
  }

  private saveToStorage(state = this.state): void {
    storage.saveAppState(state);
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // ignore
      }
    });
  }

  private logActivity(
    adminId: string,
    action: string,
    targetResource: string,
    result: 'SUCCESS' | 'WARNING' | 'FAILED',
    details: string
  ) {
    const log: AdminActivityLog = {
      id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
      timestamp: new Date().toISOString(),
      adminId,
      action,
      targetResource,
      result,
      details,
    };
    this.state.activityLogs.unshift(log);
    if (this.state.activityLogs.length > 100) {
      this.state.activityLogs.pop();
    }
    this.saveToStorage();
  }

  private buildUserProfile(user: StoredUserAccount, sessionToken: string): UserProfile {
    return {
      id: user.id,
      username: user.username,
      codename: user.role === 'admin' ? 'CYBER-COMMANDER-01' : `OPERATOR-${user.username.replace(/[^A-Z0-9]/gi, '')}`,
      clearanceLevel: user.clearanceLevel,
      role: user.role,
      terminalId: `TERM-${user.nodeRegion.substring(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      ipAddress: '192.168.1.104 [VPN ENCRYPTED]',
      nodeRegion: user.nodeRegion,
      avatarSeed: user.username,
      sessionToken,
      loginTime: new Date().toISOString(),
      email: user.email,
    };
  }

  // ==========================================
  // CUSTOMER MANAGEMENT METHODS
  // ==========================================

  public getCustomersData(): { stats: CustomerStats; customers: Customer[]; modules: CyberModule[] } {
    const now = new Date();
    const customers = this.state.customers || [];
    const totalUsers = customers.length;
    const activeUsers = customers.filter(c => c.status === 'active' && new Date(c.expiry_date) >= now).length;
    const blockedUsers = customers.filter(c => c.status === 'blocked').length;
    const expiredUsers = customers.filter(c => c.status !== 'blocked' && new Date(c.expiry_date) < now).length;

    return {
      stats: {
        totalUsers,
        activeUsers,
        blockedUsers,
        expiredUsers,
      },
      customers: customers.map(c => ({
        id: c.id,
        customer_id: c.customer_id,
        username: c.username,
        display_name: c.display_name,
        price: c.price,
        status: c.status,
        expiry_date: c.expiry_date,
        assigned_modules: c.assigned_modules || [],
        panel_permissions: c.panel_permissions || {},
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      modules: this.state.modules,
    };
  }

  public generateCustomerCredentials(): { customer_id: string; password: string } {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let customer_id = 'CUST-';
    for (let i = 0; i < 5; i++) {
      customer_id += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const passChars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let password = 'VB-';
    for (let i = 0; i < 8; i++) {
      password += passChars.charAt(Math.floor(Math.random() * passChars.length));
    }

    return { customer_id, password };
  }

  public createCustomerRecord(input: CustomerCreationInput): CreatedCustomerResult {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let targetId = input.customer_id ? input.customer_id.trim().toUpperCase() : '';
    if (!targetId) {
      targetId = 'CUST-';
      for (let i = 0; i < 5; i++) {
        targetId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    const targetUsername = input.username.trim();
    const targetPassword = input.password.trim();

    if (!targetUsername) {
      throw new Error('Username is required.');
    }

    if (this.state.customers.some(c => c.customer_id.toUpperCase() === targetId.toUpperCase())) {
      throw new Error(`Customer ID "${targetId}" already exists. Please use a unique ID.`);
    }

    if (this.state.customers.some(c => c.username.toLowerCase() === targetUsername.toLowerCase())) {
      throw new Error(`Username "${targetUsername}" already exists.`);
    }

    const now = new Date().toISOString();
    const newCust: StoredCustomerRecord = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customer_id: targetId,
      username: targetUsername,
      raw_password: targetPassword,
      display_name: input.display_name ? input.display_name.trim() : undefined,
      price: typeof input.price === 'number' ? input.price : Number(input.price) || 120,
      status: input.status === 'blocked' ? 'blocked' : 'active',
      expiry_date: input.expiry_date || new Date(Date.now() + 30 * 86400000).toISOString(),
      assigned_modules: Array.isArray(input.assigned_modules) ? input.assigned_modules : ['mod-1'],
      created_at: now,
      updated_at: now,
    };

    this.state.customers.unshift(newCust);
    this.logActivity('SAGAR551', 'CUSTOMER_CREATED', newCust.customer_id, 'SUCCESS', `Created customer ${newCust.username} (${newCust.customer_id})`);
    this.saveToStorage();
    this.syncDocToFirestore('customers', newCust.id, newCust);

    return {
      customer: {
        id: newCust.id,
        customer_id: newCust.customer_id,
        username: newCust.username,
        display_name: newCust.display_name,
        price: newCust.price,
        status: newCust.status,
        expiry_date: newCust.expiry_date,
        assigned_modules: newCust.assigned_modules,
        created_at: newCust.created_at,
        updated_at: newCust.updated_at,
      },
      credentials: {
        customer_id: newCust.customer_id,
        username: newCust.username,
        password: targetPassword,
        display_name: newCust.display_name,
        price: newCust.price,
        status: newCust.status,
        expiry_date: newCust.expiry_date,
        assigned_modules: newCust.assigned_modules,
      },
    };
  }

  public addCustomerRecord(customer: Customer, rawPass?: string): void {
    if (!this.state.customers.some(c => c.id === customer.id)) {
      this.state.customers.unshift({
        ...customer,
        raw_password: rawPass,
      });
      this.saveToStorage();
    }
  }

  public updateCustomerRecord(id: string, updates: Partial<Customer>): Customer {
    const customer = this.state.customers.find(c => c.id === id || c.customer_id === id);
    if (!customer) throw new Error('Customer not found');

    if (updates.username && updates.username.toLowerCase() !== customer.username.toLowerCase()) {
      if (this.state.customers.some(c => c.id !== customer.id && c.username.toLowerCase() === updates.username!.toLowerCase())) {
        throw new Error(`Username "${updates.username}" already taken.`);
      }
      customer.username = updates.username;
    }

    if (typeof updates.display_name !== 'undefined') customer.display_name = updates.display_name;
    if (typeof updates.price !== 'undefined') customer.price = Number(updates.price);
    if (updates.status) customer.status = updates.status;
    if (updates.expiry_date) customer.expiry_date = updates.expiry_date;
    if (Array.isArray(updates.assigned_modules)) customer.assigned_modules = updates.assigned_modules;
    customer.updated_at = new Date().toISOString();

    this.logActivity('SAGAR551', 'CUSTOMER_UPDATED', customer.customer_id, 'SUCCESS', `Updated customer ${customer.username}`);
    this.saveToStorage();
    this.syncDocToFirestore('customers', customer.id, customer);
    return customer;
  }

  public resetCustomerPasswordRecord(id: string, newPassword?: string): { success: boolean; message: string; newPassword: string; customer_id: string; username: string } {
    const customer = this.state.customers.find(c => c.id === id || c.customer_id === id);
    if (!customer) throw new Error('Customer not found');

    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pass = newPassword ? newPassword.trim() : '';
    if (!pass) {
      pass = 'VB-';
      for (let i = 0; i < 8; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    customer.raw_password = pass;
    customer.updated_at = new Date().toISOString();
    this.logActivity('SAGAR551', 'PASSWORD_RESET', customer.customer_id, 'SUCCESS', `Reset password for ${customer.username}`);
    this.saveToStorage();
    this.syncDocToFirestore('customers', customer.id, customer);

    return {
      success: true,
      message: `Password reset successfully for ${customer.username}.`,
      newPassword: pass,
      customer_id: customer.customer_id,
      username: customer.username,
    };
  }

  public toggleCustomerBlockRecord(id: string): { success: boolean; status: 'active' | 'blocked' } {
    const customer = this.state.customers.find(c => c.id === id || c.customer_id === id);
    if (!customer) throw new Error('Customer not found');

    customer.status = customer.status === 'active' ? 'blocked' : 'active';
    customer.updated_at = new Date().toISOString();
    this.logActivity('SAGAR551', customer.status === 'blocked' ? 'CUSTOMER_BLOCKED' : 'CUSTOMER_UNBLOCKED', customer.customer_id, 'SUCCESS', `Changed status to ${customer.status}`);
    this.saveToStorage();
    this.syncDocToFirestore('customers', customer.id, customer);

    return {
      success: true,
      status: customer.status,
    };
  }

  public extendCustomerExpiryRecord(id: string, options: { days?: number; customDate?: string }): { success: boolean; expiry_date: string } {
    const customer = this.state.customers.find(c => c.id === id || c.customer_id === id);
    if (!customer) throw new Error('Customer not found');

    if (options.customDate) {
      customer.expiry_date = new Date(options.customDate).toISOString();
    } else if (typeof options.days === 'number') {
      const cur = new Date(customer.expiry_date);
      const base = cur > new Date() ? cur : new Date();
      customer.expiry_date = new Date(base.getTime() + options.days * 86400000).toISOString();
    }
    customer.updated_at = new Date().toISOString();
    this.logActivity('SAGAR551', 'EXPIRY_EXTENDED', customer.customer_id, 'SUCCESS', `Extended expiry for ${customer.username}`);
    this.saveToStorage();
    this.syncDocToFirestore('customers', customer.id, customer);

    return {
      success: true,
      expiry_date: customer.expiry_date,
    };
  }

  public deleteCustomerRecord(id: string): { success: boolean; message: string } {
    const initialLen = this.state.customers.length;
    const target = this.state.customers.find(c => c.id === id || c.customer_id === id);
    this.state.customers = this.state.customers.filter(c => c.id !== id && c.customer_id !== id);

    if (this.state.customers.length === initialLen) {
      throw new Error('Customer not found');
    }

    this.logActivity('SAGAR551', 'CUSTOMER_DELETED', target?.customer_id || id, 'SUCCESS', `Deleted customer ${target?.username}`);
    this.saveToStorage();
    if (target) {
      this.deleteDocFromFirestore('customers', target.id);
    }

    return {
      success: true,
      message: 'Customer permanently deleted.',
    };
  }

  public updateCustomerPanelPermissionsRecord(
    customerId: string,
    panelId: string,
    permissions: {
      verify_access?: boolean | string;
      files_access?: boolean | string;
      setup_access?: boolean | string;
      payment_status?: 'none' | 'pending' | 'approved' | 'rejected';
      purchased?: boolean | string;
    }
  ): { success: boolean; message: string; panel_permissions: Record<string, any> } {
    const customer = this.state.customers.find(
      (c) => c.id === customerId || c.customer_id === customerId || c.username === customerId
    );
    if (!customer) throw new Error('Customer not found');

    if (!customer.panel_permissions) {
      customer.panel_permissions = {};
    }

    const existing = customer.panel_permissions[panelId] || {
      verify_access: false,
      files_access: false,
      setup_access: false,
      payment_status: 'none',
      purchased: false,
    };

    const cleanPermissions: Record<string, any> = {};
    if (permissions.verify_access !== undefined) {
      cleanPermissions.verify_access = Boolean(permissions.verify_access === true || permissions.verify_access === 'true' || permissions.verify_access === 'ON');
    }
    if (permissions.files_access !== undefined) {
      cleanPermissions.files_access = Boolean(permissions.files_access === true || permissions.files_access === 'true' || permissions.files_access === 'ON');
    }
    if (permissions.setup_access !== undefined) {
      cleanPermissions.setup_access = Boolean(permissions.setup_access === true || permissions.setup_access === 'true' || permissions.setup_access === 'ON');
    }
    if (permissions.purchased !== undefined) {
      cleanPermissions.purchased = Boolean(permissions.purchased === true || permissions.purchased === 'true');
    }
    if (permissions.payment_status !== undefined) {
      cleanPermissions.payment_status = permissions.payment_status;
    }

    customer.panel_permissions[panelId] = {
      ...existing,
      ...cleanPermissions,
    };

    customer.updated_at = new Date().toISOString();

    console.log('[ADMIN SAVE PERMISSIONS]', {
      'CUSTOMER ID': customer.customer_id,
      'PANEL ID': panelId,
      'VERIFY': customer.panel_permissions[panelId].verify_access,
      'FILES': customer.panel_permissions[panelId].files_access,
      'SETUP': customer.panel_permissions[panelId].setup_access,
    });

    this.logActivity(
      'SAGAR551',
      'PANEL_PERMISSIONS_UPDATED',
      `${customer.customer_id}:${panelId}`,
      'SUCCESS',
      `Updated panel ${panelId} permissions for customer ${customer.username}`
    );
    this.saveToStorage();
    this.syncDocToFirestore('customers', customer.id, customer);

    return {
      success: true,
      message: 'Panel permissions updated successfully.',
      panel_permissions: customer.panel_permissions,
    };
  }

  public bulkUpdateCustomerPanelPermissionsRecord(
    customerId: string,
    action: 'unlock_all' | 'lock_all'
  ): { success: boolean; message: string; panel_permissions: Record<string, any> } {
    const customer = this.state.customers.find(
      (c) => c.id === customerId || c.customer_id === customerId || c.username === customerId
    );
    if (!customer) throw new Error('Customer not found');

    if (!customer.panel_permissions) {
      customer.panel_permissions = {};
    }

    const stateVal = action === 'unlock_all';
    const modulesToUpdate = this.state.modules.length > 0
      ? this.state.modules
      : [{ id: 'MOD-AEGIS-SENTINEL' }, { id: 'mod-1' }];

    modulesToUpdate.forEach((m) => {
      const existing = customer.panel_permissions![m.id] || {
        verify_access: false,
        files_access: false,
        setup_access: false,
        payment_status: 'none',
        purchased: false,
      };
      customer.panel_permissions![m.id] = {
        ...existing,
        verify_access: stateVal,
        files_access: stateVal,
        setup_access: stateVal,
      };
    });

    customer.updated_at = new Date().toISOString();

    console.log('[ADMIN SAVE BULK PERMISSIONS]', {
      customerId: customer.customer_id,
      action,
      savedPermissions: customer.panel_permissions,
    });

    this.logActivity(
      'SAGAR551',
      'BULK_PERMISSIONS_UPDATED',
      customer.customer_id,
      'SUCCESS',
      `Applied ${action} for customer ${customer.username}`
    );
    this.saveToStorage();
    this.syncDocToFirestore('customers', customer.id, customer);

    return {
      success: true,
      message: `All panel permissions ${action === 'unlock_all' ? 'enabled' : 'locked'} successfully.`,
      panel_permissions: customer.panel_permissions,
    };
  }

  public buyPanelRecord(
    panelId: string,
    transactionRef?: string,
    paymentNote?: string,
    customerId?: string
  ): { success: boolean; message: string; panel_id: string; permission: any; panel_permissions?: Record<string, any> } {
    const customer = this.state.customers.find(
      (c) => c.id === customerId || c.customer_id === customerId || c.username === customerId
    );

    if (customer) {
      if (!customer.panel_permissions) customer.panel_permissions = {};
      const prev = customer.panel_permissions[panelId] || {
        verify_access: false,
        files_access: false,
        setup_access: false,
        payment_status: 'none',
        purchased: false,
      };

      const permission = {
        verify_access: Boolean(prev.verify_access) === true,
        files_access: Boolean(prev.files_access) === true,
        setup_access: Boolean(prev.setup_access) === true,
        purchased: true,
        payment_status: 'pending' as const,
        payment_ref: transactionRef || '',
        payment_note: paymentNote || '',
        purchased_at: new Date().toISOString(),
      };

      customer.panel_permissions[panelId] = {
        ...prev,
        ...permission,
      };
      customer.updated_at = new Date().toISOString();

      // Create an order in orders store
      const orderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
      const mod = this.state.modules.find((m) => m.id === panelId);
      const newOrder = {
        id: orderId,
        userId: customer.id,
        username: customer.username,
        moduleId: panelId,
        moduleName: mod ? mod.name : panelId,
        planId: 'plan-custom',
        planName: 'Panel License Purchase',
        durationDays: 30,
        finalPrice: customer.price || mod?.price || 120,
        paymentStatus: 'PENDING' as const,
        transactionRef: transactionRef || ('UPI-TXN-' + Math.floor(1000000000 + Math.random() * 9000000000)),
        paymentMethod: 'UPI_QR' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.state.orders.unshift(newOrder);

      this.saveToStorage();
      this.syncDocToFirestore('customers', customer.id, customer);
      this.syncDocToFirestore('orders', newOrder.id, newOrder);

      return {
        success: true,
        message: 'PAYMENT RECEIVED // AWAITING ADMIN APPROVAL',
        panel_id: panelId,
        permission: customer.panel_permissions[panelId],
        panel_permissions: customer.panel_permissions,
      };
    }

    return {
      success: false,
      message: 'CUSTOMER NOT FOUND',
      panel_id: panelId,
      permission: null,
    };
  }

  public exportState(): string {
    return storage.exportAppState(this.state);
  }

  public importState(jsonString: string): { success: boolean; message: string } {
    const res = storage.importAppState(jsonString);
    if (res.success && res.newState) {
      this.state = res.newState;
      this.notify();
    }
    return { success: res.success, message: res.message };
  }

  public resetState(): { success: boolean; message: string } {
    storage.clearAppState();
    this.state = this.getDefaultState();
    this.saveToStorage();
    this.notify();
    return { success: true, message: 'Application state reset to factory defaults.' };
  }

  // ==========================================
  // AUTHENTICATION (PURE FRONTEND)
  // ==========================================

  public async login(identifier: string, passKey: string): Promise<{ success: boolean; message: string; token: string; user: UserProfile & { customer_id?: string; price?: number; expiry_date?: string; assigned_modules?: string[] } }> {
    const target = identifier.trim();
    const cleanPass = passKey.trim();

    if (!target || !cleanPass) {
      throw new Error('INVALID CUSTOMER ID OR PASSWORD');
    }

    // Direct Administrator check
    if (target.toUpperCase() === 'SAGAR551' && cleanPass === 'SAGAR@SAGAR1') {
      const token = 'AEGIS-ADMIN-' + Math.random().toString(36).substring(2).toUpperCase();
      this.logActivity('SAGAR551', 'ADMIN_LOGIN', 'CLIENT_GATEWAY', 'SUCCESS', 'Administrator logged into panel');
      const adminAcc = this.state.users.find((u) => u.username === 'SAGAR551') || this.state.users[0];
      return {
        success: true,
        message: 'Administrator authentication successful. System Level 5 authorized.',
        token,
        user: this.buildUserProfile(adminAcc, token),
      };
    }

    // Check Customer record first
    const customer = (this.state.customers || []).find(
      c => c.customer_id.toUpperCase() === target.toUpperCase() ||
           c.username.toLowerCase() === target.toLowerCase()
    );

    if (customer) {
      const isPassValid = customer.raw_password === cleanPass || customer.raw_password?.toLowerCase() === cleanPass.toLowerCase();
      if (!isPassValid) {
        this.logActivity('GUEST', 'AUTH_FAILED', target, 'FAILED', 'Incorrect customer password');
        throw new Error('INVALID CUSTOMER ID OR PASSWORD');
      }

      if (customer.status === 'blocked') {
        this.logActivity(customer.username, 'AUTH_BLOCKED', customer.customer_id, 'FAILED', 'Customer account blocked');
        throw new Error('ACCOUNT BLOCKED — PLEASE CONTACT ADMIN.');
      }

      const now = new Date();
      if (new Date(customer.expiry_date) < now) {
        this.logActivity(customer.username, 'AUTH_EXPIRED', customer.customer_id, 'FAILED', 'Customer account expired');
        throw new Error('ACCOUNT EXPIRED — PLEASE CONTACT ADMIN.');
      }

      const token = `cust_${customer.id}_${Date.now()}`;
      this.logActivity(customer.username, 'CUSTOMER_LOGIN', customer.customer_id, 'SUCCESS', 'Customer authenticated');

      return {
        success: true,
        message: `PANEL ACCESS GRANTED // ${customer.username}`,
        token,
        user: {
          id: customer.id,
          customer_id: customer.customer_id,
          username: customer.username,
          codename: `OPERATOR-${customer.username.replace(/[^A-Z0-9]/gi, '')}`,
          clearanceLevel: 3,
          role: 'user',
          terminalId: `TERM-CUST-${customer.customer_id.replace(/[^A-Z0-9]/gi, '')}`,
          ipAddress: '192.168.1.104 [VPN ENCRYPTED]',
          nodeRegion: 'Asia-SE',
          avatarSeed: customer.username,
          sessionToken: token,
          loginTime: new Date().toISOString(),
          price: customer.price,
          expiry_date: customer.expiry_date,
          assigned_modules: customer.assigned_modules || [],
          panel_permissions: customer.panel_permissions || {},
        },
      };
    }

    const user = this.state.users.find(
      (u) => u.username.toUpperCase() === target.toUpperCase() || u.id.toUpperCase() === target.toUpperCase()
    );

    if (!user) {
      this.logActivity('GUEST', 'AUTH_FAILED', target, 'FAILED', 'Unknown Authorised ID');
      throw new Error('INVALID CUSTOMER ID OR PASSWORD');
    }

    if (user.accountStatus === 'disabled') {
      this.logActivity(user.username, 'AUTH_BLOCKED', user.username, 'FAILED', 'Account disabled');
      throw new Error('ACCOUNT BLOCKED — PLEASE CONTACT ADMIN.');
    }

    const isMatch = user.rawPassKey === cleanPass || user.rawPassKey.toUpperCase() === cleanPass.toUpperCase();

    if (!isMatch) {
      this.logActivity(user.username, 'AUTH_FAILED', user.username, 'FAILED', 'Incorrect pass key');
      throw new Error('INVALID CUSTOMER ID OR PASSWORD');
    }

    user.lastLoginAt = new Date().toISOString();
    const token = 'AEGIS-USR-' + Math.random().toString(36).substring(2).toUpperCase();
    this.logActivity(user.username, 'USER_LOGIN', user.id, 'SUCCESS', 'User authenticated');
    this.saveToStorage();

    return {
      success: true,
      message: 'Authentication successful. Access granted.',
      token,
      user: this.buildUserProfile(user, token),
    };
  }

  public async adminLogin(username: string, password: string): Promise<{ success: boolean; message: string; token: string; user: any }> {
    const cleanUser = username.trim().toUpperCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      throw new Error('INVALID ADMIN CREDENTIALS');
    }

    if (cleanUser === 'SAGAR551' && cleanPass === 'SAGAR@SAGAR1') {
      const token = 'AEGIS-ADMIN-' + Math.random().toString(36).substring(2).toUpperCase();
      this.logActivity('SAGAR551', 'ADMIN_LOGIN', 'ADMIN_PORTAL', 'SUCCESS', 'Administrator logged into Level 5 Management Console');
      return {
        success: true,
        message: 'Administrator authentication successful. System Level 5 authorized.',
        token,
        user: {
          id: 'USR-SAGAR551',
          username: 'SAGAR551',
          role: 'admin',
          clearanceLevel: 5,
        },
      };
    }

    const adminUser = this.state.users.find(
      (u) => (u.username.toUpperCase() === cleanUser || u.id.toUpperCase() === cleanUser) && u.role === 'admin'
    );

    if (adminUser && (adminUser.rawPassKey === cleanPass || (cleanUser === 'SAGAR551' && cleanPass === 'SAGAR@SAGAR1'))) {
      const token = 'AEGIS-ADMIN-' + Math.random().toString(36).substring(2).toUpperCase();
      this.logActivity(adminUser.username, 'ADMIN_LOGIN', 'ADMIN_PORTAL', 'SUCCESS', 'Administrator logged in');
      return {
        success: true,
        message: 'Administrator authentication successful. System Level 5 authorized.',
        token,
        user: {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role,
          clearanceLevel: adminUser.clearanceLevel,
        },
      };
    }

    this.logActivity('GUEST', 'ADMIN_LOGIN_FAILED', cleanUser, 'FAILED', 'Invalid admin credentials');
    throw new Error('INVALID ADMIN CREDENTIALS');
  }

  public getMe(userId?: string): { user: UserProfile; licenses: AdminLicense[]; customPricing: UserCustomPricing | null } {
    let user = this.state.users.find((u) => u.id === userId || u.username === userId);
    if (!user) {
      user = this.state.users.find((u) => u.username === 'SAGAR551') || this.state.users[0];
    }
    const licenses = this.state.licenses.filter((l) => l.userId === user?.id || l.username === user?.username);
    const customPricing = user ? this.state.userPricing[user.id] || null : null;

    return {
      user: this.buildUserProfile(user, 'AEGIS-ACTIVE-SESSION'),
      licenses,
      customPricing: customPricing
        ? {
            id: customPricing.id || `PRC-${user.id}`,
            userId: user.id,
            plan15Price: customPricing.plan15Price,
            plan20Price: customPricing.plan20Price,
            plan30Price: customPricing.plan30Price,
            planPermPrice: customPricing.planPermPrice,
            updatedAt: customPricing.updatedAt,
            updatedBy: customPricing.updatedBy,
          }
        : null,
    };
  }

  // ==========================================
  // PORTAL & PRICING
  // ==========================================

  public getEffectivePrice(customerId: string, panelId: string, durationKey: '15Days' | '20Days' | '30Days' | 'permanent'): number {
    if (customerId) {
      const customer = this.state.customers.find(c => c.id === customerId || c.customer_id === customerId || c.username?.toLowerCase() === customerId.toLowerCase());
      const targetId = customer ? customer.id : customerId;
      const custPricing = this.state.customerPricing?.[targetId];
      if (custPricing && custPricing[panelId]) {
        const val = custPricing[panelId][durationKey];
        if (typeof val === 'number' && val > 0) {
          return val;
        }
      }
    }

    if (panelId && this.state.panelPricing?.[panelId]) {
      const val = this.state.panelPricing[panelId][durationKey];
      if (typeof val === 'number' && val > 0) {
        return val;
      }
    }

    const customer = customerId ? this.state.customers.find(c => c.id === customerId || c.customer_id === customerId || c.username?.toLowerCase() === customerId.toLowerCase()) : null;
    const panel = this.state.modules.find(m => m.id === panelId);
    const basePrice = customer?.price ?? panel?.price ?? 120;

    if (durationKey === '15Days') return basePrice;
    if (durationKey === '20Days') return Math.round(basePrice * 1.15);
    if (durationKey === '30Days') return Math.round(basePrice * 1.25);
    if (durationKey === 'permanent') return Math.round(basePrice * 1.8);

    return basePrice;
  }

  public async savePanelPricing(panelId: string, pricing: PanelPricing) {
    if (!this.state.panelPricing) {
      this.state.panelPricing = {};
    }
    this.state.panelPricing[panelId] = pricing;
    this.saveToStorage();
    await this.syncDocToFirestore('panelPricing', panelId, pricing);
  }

  public async saveCustomerPricing(customerId: string, pricing: CustomerPricing) {
    if (!this.state.customerPricing) {
      this.state.customerPricing = {};
    }
    this.state.customerPricing[customerId] = pricing;
    this.saveToStorage();
    await this.syncDocToFirestore('customerPricing', customerId, pricing);
  }

  public getPortalConfig(userId?: string, panelId?: string) {
    const user = userId ? this.state.users.find((u) => u.id === userId || u.username.toUpperCase() === userId.toUpperCase()) : null;
    const customer = userId ? this.state.customers.find((c) => c.id === userId || c.customer_id.toUpperCase() === userId.toUpperCase() || c.username.toLowerCase() === userId.toLowerCase()) : null;
    const targetUserId = user ? user.id : (customer ? customer.id : userId);
    const customPricing = targetUserId ? this.state.userPricing[targetUserId] : null;

    const plans = this.state.runtimePlans
      .filter((p) => p.status === 'active')
      .map((plan) => {
        let durationKey: '15Days' | '20Days' | '30Days' | 'permanent' = '30Days';
        if (plan.id === 'plan-15' || plan.durationDays === 15) durationKey = '15Days';
        else if (plan.id === 'plan-20' || plan.durationDays === 20) durationKey = '20Days';
        else if (plan.id === 'plan-30' || plan.durationDays === 30) durationKey = '30Days';
        else if (plan.id === 'plan-perm' || plan.id === 'plan-permanent' || plan.durationDays === -1 || plan.durationDays === 3650) durationKey = 'permanent';

        let userPrice = plan.defaultPrice;
        let hasCustomPrice = false;

        if (panelId) {
          userPrice = this.getEffectivePrice(targetUserId || '', panelId, durationKey);
          
          const custPricing = targetUserId ? (this.state.customerPricing?.[targetUserId] || this.state.customerPricing?.[customer?.id || '']) : null;
          const specificOverride = custPricing?.[panelId]?.[durationKey];
          const globalOverride = this.state.panelPricing?.[panelId]?.[durationKey];
          if ((typeof specificOverride === 'number' && specificOverride > 0) || (typeof globalOverride === 'number' && globalOverride > 0)) {
            hasCustomPrice = true;
          }
        } else {
          if (customer && typeof customer.price === 'number') {
            if (plan.id === 'plan-15') userPrice = customer.price;
            else if (plan.id === 'plan-20') userPrice = Math.round(customer.price * 1.15);
            else if (plan.id === 'plan-30') userPrice = Math.round(customer.price * 1.25);
            else if (plan.id === 'plan-perm') userPrice = Math.round(customer.price * 1.8);
            hasCustomPrice = true;
          } else if (customPricing) {
            if (plan.id === 'plan-15' && customPricing.plan15Price !== undefined) {
              userPrice = customPricing.plan15Price;
              hasCustomPrice = true;
            } else if (plan.id === 'plan-20' && customPricing.plan20Price !== undefined) {
              userPrice = customPricing.plan20Price;
              hasCustomPrice = true;
            } else if (plan.id === 'plan-30' && customPricing.plan30Price !== undefined) {
              userPrice = customPricing.plan30Price;
              hasCustomPrice = true;
            } else if (plan.id === 'plan-perm' && customPricing.planPermPrice !== undefined) {
              userPrice = customPricing.planPermPrice;
              hasCustomPrice = true;
            }
          }
        }

        return {
          ...plan,
          userPrice,
          hasCustomPrice,
        };
      });

    const userLicenses = targetUserId ? this.state.licenses.filter((l) => l.userId === targetUserId || l.username === user?.username) : [];

    // Filter modules if customer has specific assigned modules
    let visibleModules = this.state.modules.filter((m) => m.enabled !== false && m.status !== 'inactive');
    if (customer && Array.isArray(customer.assigned_modules)) {
      visibleModules = visibleModules.filter((m) => customer.assigned_modules.includes(m.id));
    }

    return {
      modules: visibleModules,
      plans,
      userLicenses,
      upiQrImage: this.state.settings.upiQrImageUrl,
      settings: this.state.settings,
      panel_permissions: customer?.panel_permissions || {},
      customer: customer ? {
        id: customer.id,
        customer_id: customer.customer_id,
        username: customer.username,
        status: customer.status,
        expiry_date: customer.expiry_date,
        assigned_modules: customer.assigned_modules || [],
        panel_permissions: customer.panel_permissions || {},
      } : null,
    };
  }

  public createOrder(userId: string, moduleId: string, planId: string, customPlan?: { planName: string; finalPrice: number; durationDays: number }): { order: AdminOrder; upiQrImageUrl: string } {
    const user = this.state.users.find((u) => u.id === userId || u.username.toUpperCase() === userId.toUpperCase());
    const customer = this.state.customers.find((c) => c.id === userId || c.customer_id.toUpperCase() === userId.toUpperCase() || c.username.toLowerCase() === userId.toLowerCase());
    const mod = this.state.modules.find((m) => m.id === moduleId);
    const plan = this.state.runtimePlans.find((p) => p.id === planId);

    const targetUserId = user ? user.id : (customer ? customer.id : userId);
    
    let durationKey: '15Days' | '20Days' | '30Days' | 'permanent' = '30Days';
    if (planId === 'plan-15' || plan?.durationDays === 15) durationKey = '15Days';
    else if (planId === 'plan-20' || plan?.durationDays === 20) durationKey = '20Days';
    else if (planId === 'plan-30' || plan?.durationDays === 30) durationKey = '30Days';
    else if (planId === 'plan-perm' || planId === 'plan-permanent' || plan?.durationDays === -1 || plan?.durationDays === 3650) durationKey = 'permanent';

    const finalPrice = customPlan?.finalPrice ?? this.getEffectivePrice(targetUserId, moduleId, durationKey);

    const planName = customPlan?.planName ?? plan?.name ?? planId;
    const durationDays = customPlan?.durationDays ?? plan?.durationDays ?? 30;

    const orderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
    const newOrder: AdminOrder = {
      id: orderId,
      userId: targetUserId,
      username: user ? user.username : (customer ? customer.username : userId),
      moduleId,
      moduleName: mod ? mod.name : moduleId,
      planId,
      planName,
      durationDays,
      finalPrice,
      paymentStatus: 'PENDING',
      transactionRef: 'UPI-TXN-' + Math.floor(1000000000 + Math.random() * 9000000000),
      paymentMethod: 'UPI_QR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.orders.unshift(newOrder);
    this.saveToStorage();

    return {
      order: newOrder,
      upiQrImageUrl: this.state.settings.upiQrImageUrl,
    };
  }

  public getOrder(orderId: string): AdminOrder {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    return order;
  }

  // ==========================================
  // ADMIN DASHBOARD
  // ==========================================

  public getAdminOverview(): { stats: AdminOverviewStats; recentOrders: AdminOrder[]; recentLogs: AdminActivityLog[]; activeSessionsCount: number } {
    const totalOrders = this.state.orders.length;
    const paidOrders = this.state.orders.filter((o) => o.paymentStatus === 'PAID');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.finalPrice, 0);
    const activeLicenses = this.state.licenses.filter((l) => l.status === 'active').length;

    return {
      stats: {
        totalUsers: this.state.users.length,
        activeUsers: this.state.users.filter((u) => u.accountStatus === 'active').length,
        disabledUsers: this.state.users.filter((u) => u.accountStatus === 'disabled').length,
        activeLicenses,
        expiredLicenses: this.state.licenses.filter((l) => l.status === 'expired').length,
        totalOrders,
        pendingOrders: this.state.orders.filter((o) => o.paymentStatus === 'PENDING').length,
        completedOrders: paidOrders.length,
        totalRevenue,
        activeSessionsCount: this.state.sessions.filter((s) => s.isActive).length || 1,
        totalModules: this.state.modules.length,
        gatewayStatus: 'OPERATIONAL (Level 5 Core Active)',
        encryptionStandard: 'AES-256-GCM + Post-Quantum Lattice',
      },
      recentOrders: this.state.orders.slice(0, 5),
      recentLogs: this.state.activityLogs.slice(0, 8),
      activeSessionsCount: this.state.sessions.filter((s) => s.isActive).length || 1,
    };
  }

  // ==========================================
  // USERS MANAGEMENT
  // ==========================================

  public getUsers(search?: string): AdminUser[] {
    let users: AdminUser[] = this.state.users.map((u) => {
      const customPrice = this.state.userPricing[u.id];
      const licCount = this.state.licenses.filter((l) => l.userId === u.id || l.username === u.username).length;
      return {
        id: u.id,
        username: u.username,
        role: u.role,
        clearanceLevel: u.clearanceLevel,
        accountStatus: u.accountStatus,
        email: u.email,
        nodeRegion: u.nodeRegion,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        licenseCount: licCount,
        hasCustomPricing: !!customPrice,
        customPricing: customPrice
          ? {
              id: customPrice.id || `PRC-${u.id}`,
              userId: u.id,
              plan15Price: customPrice.plan15Price,
              plan20Price: customPrice.plan20Price,
              plan30Price: customPrice.plan30Price,
              planPermPrice: customPrice.planPermPrice,
              updatedAt: customPrice.updatedAt,
              updatedBy: customPrice.updatedBy,
            }
          : null,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      users = users.filter((u) => u.username.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    return users;
  }

  public generateCredentials(): { authorisedId: string; passKey: string } {
    const idNum = Math.floor(10000 + Math.random() * 90000);
    const authId = `USER_${idNum}`;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let key = '';
    for (let i = 0; i < 8; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return {
      authorisedId: authId,
      passKey: `KEY-${key}`,
    };
  }

  public createUser(userData: any): { user: AdminUser; createdCredentials: { authorisedId: string; passKey: string }; initialLicense?: any } {
    const username = (userData.authorisedId || userData.username || '').trim().toUpperCase();
    const passKey = (userData.passKey || userData.password || '').trim();

    if (!username || !passKey) {
      throw new Error('Authorised Account ID and Pass Key are required');
    }

    if (this.state.users.some((u) => u.username.toUpperCase() === username)) {
      throw new Error(`User with Authorised ID '${username}' already exists`);
    }

    const userId = 'USR-' + Math.floor(10000 + Math.random() * 90000);
    const newUser: StoredUserAccount = {
      id: userId,
      username,
      rawPassKey: passKey,
      role: userData.role || 'user',
      clearanceLevel: userData.clearanceLevel || 3,
      email: userData.email || `${username.toLowerCase()}@aegis-defense.internal`,
      nodeRegion: userData.nodeRegion || 'Asia-SE',
      accountStatus: userData.accountStatus || 'active',
      createdAt: new Date().toISOString(),
    };

    this.state.users.push(newUser);
    this.syncDocToFirestore('users', newUser.id, newUser);

    if (userData.customPricing) {
      const customP = {
        id: `PRC-${userId}`,
        userId,
        plan15Price: Number(userData.customPricing.plan15Price || 120),
        plan20Price: Number(userData.customPricing.plan20Price || 135),
        plan30Price: Number(userData.customPricing.plan30Price || 150),
        planPermPrice: Number(userData.customPricing.planPermPrice || 200),
        updatedAt: new Date().toISOString(),
        updatedBy: 'SAGAR551',
      };
      this.state.userPricing[userId] = customP;
      this.syncDocToFirestore('userPricing', userId, customP);
    }

    let initialLicense = null;
    if (userData.initialModuleId) {
      const mod = this.state.modules.find((m) => m.id === userData.initialModuleId);
      const licId = 'LIC-' + Math.floor(10000 + Math.random() * 90000);
      const duration = userData.initialDurationDays || 30;
      initialLicense = {
        id: licId,
        userId,
        username,
        moduleId: userData.initialModuleId,
        moduleName: mod ? mod.name : userData.initialModuleId,
        planId: userData.initialPlanId || 'plan-30',
        isPermanent: duration <= 0,
        durationDays: duration,
        startsAt: new Date().toISOString(),
        expiresAt: duration > 0 ? new Date(Date.now() + duration * 86400000).toISOString() : null,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        createdBy: 'SAGAR551',
      };
      this.state.licenses.unshift(initialLicense);
    }

    this.logActivity('SAGAR551', 'USER_CREATED', username, 'SUCCESS', `Created account ${username}`);
    this.saveToStorage();

    return {
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        clearanceLevel: newUser.clearanceLevel,
        accountStatus: newUser.accountStatus,
        email: newUser.email,
        nodeRegion: newUser.nodeRegion,
        createdAt: newUser.createdAt,
      },
      createdCredentials: {
        authorisedId: username,
        passKey,
      },
      initialLicense,
    };
  }

  public updateUserStatus(id: string, status: 'active' | 'disabled'): { success: boolean; message: string } {
    const user = this.state.users.find((u) => u.id === id || u.username === id);
    if (!user) throw new Error('User not found');
    user.accountStatus = status;
    this.logActivity('SAGAR551', 'USER_STATUS_UPDATE', user.username, 'SUCCESS', `Set status to ${status}`);
    this.saveToStorage();
    this.syncDocToFirestore('users', user.id, user);
    return { success: true, message: `User status changed to ${status}` };
  }

  public resetUserPassword(userId: string, newPassKey?: string): { success: boolean; message: string; newPassKey: string } {
    const user = this.state.users.find((u) => u.id === userId || u.username === userId);
    if (!user) throw new Error('User not found');
    const generated = newPassKey || 'KEY-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    user.rawPassKey = generated;
    this.logActivity('SAGAR551', 'PASSKEY_RESET', user.username, 'SUCCESS', `Reset pass key for ${user.username}`);
    this.saveToStorage();
    this.syncDocToFirestore('users', user.id, user);
    return { success: true, message: 'Pass Key reset successfully', newPassKey: generated };
  }

  public deleteUser(userId: string): { success: boolean; message: string } {
    const user = this.state.users.find((u) => u.id === userId || u.username === userId);
    if (!user) throw new Error('User not found');
    this.state.users = this.state.users.filter((u) => u.id !== user.id);
    delete this.state.userPricing[user.id];
    this.logActivity('SAGAR551', 'USER_DELETED', user.username, 'SUCCESS', `Deleted user ${user.username}`);
    this.saveToStorage();
    this.deleteDocFromFirestore('users', user.id);
    this.deleteDocFromFirestore('userPricing', user.id);
    return { success: true, message: 'User permanently deleted' };
  }

  // ==========================================
  // PRICING MATRIX (INDIVIDUAL USER PRICING)
  // ==========================================

  public getPricingMatrix(): { matrix: UserCustomPricing[]; defaultPlans: AdminRuntimePlan[] } {
    const matrix: UserCustomPricing[] = [];
    for (const u of this.state.users) {
      if (u.role === 'admin') continue;
      const custom = this.state.userPricing[u.id];
      matrix.push({
        id: custom?.id || `PRC-${u.id}`,
        userId: u.id,
        plan15Price: custom ? custom.plan15Price : 120,
        plan20Price: custom ? custom.plan20Price : 135,
        plan30Price: custom ? custom.plan30Price : 150,
        planPermPrice: custom ? custom.planPermPrice : 200,
        updatedAt: custom ? custom.updatedAt : u.createdAt,
        updatedBy: custom ? custom.updatedBy : 'SYSTEM_DEFAULT',
      });
    }
    return {
      matrix,
      defaultPlans: this.state.runtimePlans,
    };
  }

  public resetUserSessions(userId: string): number {
    return 1;
  }

  public revokeAllSessions(): number {
    this.state.sessions = [];
    this.saveToStorage();
    return 1;
  }

  public getUserPricingDetails(userId: string): { customPricing: UserCustomPricing | null } {
    const user = this.state.users.find((u) => u.id === userId || u.username === userId);
    const custom = user ? this.state.userPricing[user.id] || null : null;
    return { customPricing: custom };
  }

  public saveCustomPricing(data: {
    userId: string;
    plan15Price: number;
    plan20Price: number;
    plan30Price: number;
    planPermPrice: number;
  }): { success: boolean; message: string; pricing: UserCustomPricing } {
    const user = this.state.users.find((u) => u.id === data.userId || u.username === data.userId);
    if (!user) throw new Error('User not found');

    const pricing: UserCustomPricing = {
      id: `PRC-${user.id}`,
      userId: user.id,
      plan15Price: Number(data.plan15Price),
      plan20Price: Number(data.plan20Price),
      plan30Price: Number(data.plan30Price),
      planPermPrice: Number(data.planPermPrice),
      updatedAt: new Date().toISOString(),
      updatedBy: 'SAGAR551',
    };
    this.state.userPricing[user.id] = pricing;
    this.logActivity('SAGAR551', 'PRICING_UPDATED', user.username, 'SUCCESS', `Updated custom rates for ${user.username}`);
    this.saveToStorage();
    this.syncDocToFirestore('userPricing', user.id, pricing);
    return {
      success: true,
      message: `Custom pricing for ${user.username} saved successfully`,
      pricing,
    };
  }

  public resetCustomPricing(userId: string): { success: boolean; message: string } {
    const user = this.state.users.find((u) => u.id === userId || u.username === userId);
    if (user) {
      delete this.state.userPricing[user.id];
      this.saveToStorage();
      this.deleteDocFromFirestore('userPricing', user.id);
    }
    return { success: true, message: 'Reset custom pricing to defaults' };
  }

  // ==========================================
  // RUNTIME PLANS MANAGEMENT
  // ==========================================

  public getRuntimePlans(): AdminRuntimePlan[] {
    return this.state.runtimePlans;
  }

  public createPlan(planData: Partial<AdminRuntimePlan>): { success: boolean; message: string; plan: AdminRuntimePlan } {
    const id = 'plan-' + Math.random().toString(36).substring(2, 6);
    const newPlan: AdminRuntimePlan = {
      id,
      name: planData.name || 'CUSTOM RUNTIME',
      durationDays: Number(planData.durationDays || 30),
      defaultPrice: Number(planData.defaultPrice || 100),
      status: planData.status || 'active',
      badge: planData.badge || 'TIER',
      isPopular: !!planData.isPopular,
      description: planData.description || 'Custom runtime duration pass',
    };
    this.state.runtimePlans.push(newPlan);
    this.logActivity('SAGAR551', 'PLAN_CREATED', newPlan.name, 'SUCCESS', `Created plan ${newPlan.name}`);
    this.saveToStorage();
    this.syncDocToFirestore('plans', newPlan.id, newPlan);
    return { success: true, message: 'Plan created successfully', plan: newPlan };
  }

  public updatePlan(id: string, updates: Partial<AdminRuntimePlan>): { success: boolean; message: string; plan: AdminRuntimePlan } {
    const plan = this.state.runtimePlans.find((p) => p.id === id);
    if (!plan) throw new Error('Plan not found');
    Object.assign(plan, updates);
    this.logActivity('SAGAR551', 'PLAN_UPDATED', plan.name, 'SUCCESS', `Updated plan ${plan.name}`);
    this.saveToStorage();
    this.syncDocToFirestore('plans', plan.id, plan);
    return { success: true, message: 'Plan updated successfully', plan };
  }

  public deletePlan(id: string): { success: boolean; message: string } {
    this.state.runtimePlans = this.state.runtimePlans.filter((p) => p.id !== id);
    this.logActivity('SAGAR551', 'PLAN_DELETED', id, 'SUCCESS', `Deleted plan ${id}`);
    this.saveToStorage();
    this.deleteDocFromFirestore('plans', id);
    return { success: true, message: 'Plan deleted successfully' };
  }

  // ==========================================
  // MODULES MANAGEMENT
  // ==========================================

  public getModules(): CyberModule[] {
    const customers = this.state.customers || [];
    return this.state.modules.map((m) => {
      const assigned = customers
        .filter((c) => Array.isArray(c.assigned_modules) && c.assigned_modules.includes(m.id))
        .map((c) => ({
          id: c.id,
          customer_id: c.customer_id,
          username: c.username,
        }));
      return {
        ...m,
        status: m.status || (m.enabled ? 'active' : 'inactive'),
        price: m.price || 120,
        imageUrl: m.imageUrl || '',
        assignedCustomers: assigned,
        assignedCustomerIds: assigned.map((c) => c.id),
      };
    });
  }

  public createModule(moduleData: Partial<CyberModule>): { success: boolean; message: string; module: CyberModule } {
    const rawId = (moduleData.id || moduleData.name || 'MOD-' + Math.random().toString(36).substring(2, 8)).toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const id = rawId || 'mod-' + Date.now();
    const newMod: CyberModule = {
      id,
      name: moduleData.name || 'New Access Panel',
      version: moduleData.version || '1.0.0',
      description: moduleData.description || 'Cybersecurity operational access panel',
      tag: moduleData.tag || 'CUSTOM',
      icon: moduleData.icon || 'Shield',
      imageUrl: moduleData.imageUrl || '',
      price: typeof moduleData.price === 'number' ? moduleData.price : 120,
      status: moduleData.status || 'active',
      enabled: moduleData.enabled !== undefined ? moduleData.enabled : true,
      requiredRuntime: moduleData.requiredRuntime || '15+ Days Access',
      orderIndex: this.state.modules.length + 1,
    };
    this.state.modules.push(newMod);

    // Sync assigned customers if provided
    if (Array.isArray(moduleData.assignedCustomerIds) && this.state.customers) {
      this.state.customers.forEach((cust) => {
        if (moduleData.assignedCustomerIds!.includes(cust.id) || moduleData.assignedCustomerIds!.includes(cust.customer_id)) {
          if (!cust.assigned_modules.includes(newMod.id)) {
            cust.assigned_modules.push(newMod.id);
            cust.updated_at = new Date().toISOString();
            this.syncDocToFirestore('customers', cust.id, cust);
          }
        }
      });
    }

    this.logActivity('SAGAR551', 'PANEL_CREATED', newMod.name, 'SUCCESS', `Created panel ${newMod.name}`);
    this.saveToStorage();
    this.syncDocToFirestore('modules', newMod.id, newMod);
    return { success: true, message: 'Panel created successfully', module: newMod };
  }

  public updateModule(id: string, updates: Partial<CyberModule>): { success: boolean; message: string; module: CyberModule } {
    const mod = this.state.modules.find((m) => m.id === id);
    if (!mod) throw new Error('Panel not found');
    Object.assign(mod, updates);

    // Sync assigned customers if provided
    if (Array.isArray(updates.assignedCustomerIds) && this.state.customers) {
      this.state.customers.forEach((cust) => {
        const shouldHave = updates.assignedCustomerIds!.includes(cust.id) || updates.assignedCustomerIds!.includes(cust.customer_id);
        const hasIt = cust.assigned_modules.includes(id);
        if (shouldHave && !hasIt) {
          cust.assigned_modules.push(id);
          cust.updated_at = new Date().toISOString();
          this.syncDocToFirestore('customers', cust.id, cust);
        } else if (!shouldHave && hasIt) {
          cust.assigned_modules = cust.assigned_modules.filter((mId) => mId !== id);
          cust.updated_at = new Date().toISOString();
          this.syncDocToFirestore('customers', cust.id, cust);
        }
      });
    }

    this.logActivity('SAGAR551', 'PANEL_UPDATED', mod.name, 'SUCCESS', `Updated panel ${mod.name}`);
    this.saveToStorage();
    this.syncDocToFirestore('modules', mod.id, mod);
    return { success: true, message: 'Panel updated successfully', module: mod };
  }

  public toggleModuleStatus(id: string): { success: boolean; message: string; module: CyberModule } {
    const mod = this.state.modules.find((m) => m.id === id);
    if (!mod) throw new Error('Panel not found');
    mod.enabled = !mod.enabled;
    mod.status = mod.enabled ? 'active' : 'inactive';
    this.logActivity('SAGAR551', 'PANEL_TOGGLED', mod.name, 'SUCCESS', `Toggled ${mod.name} status to ${mod.enabled}`);
    this.saveToStorage();
    this.syncDocToFirestore('modules', mod.id, mod);
    return { success: true, message: `Panel status changed to ${mod.enabled ? 'Enabled' : 'Disabled'}`, module: mod };
  }

  public deleteModule(id: string): { success: boolean; message: string } {
    this.state.modules = this.state.modules.filter((m) => m.id !== id);
    // Cleanup assignments
    if (this.state.customers) {
      this.state.customers.forEach((cust) => {
        if (cust.assigned_modules.includes(id)) {
          cust.assigned_modules = cust.assigned_modules.filter((mId) => mId !== id);
          cust.updated_at = new Date().toISOString();
          this.syncDocToFirestore('customers', cust.id, cust);
        }
      });
    }
    this.logActivity('SAGAR551', 'PANEL_DELETED', id, 'SUCCESS', `Deleted panel ${id}`);
    this.saveToStorage();
    this.deleteDocFromFirestore('modules', id);
    return { success: true, message: 'Panel deleted successfully' };
  }

  // ==========================================
  // ORDERS MANAGEMENT
  // ==========================================

  public getOrders(): AdminOrder[] {
    return this.state.orders;
  }

  public verifyOrderPayment(
    orderId: string,
    status: 'PAID' | 'FAILED' | 'CANCELLED'
  ): { success: boolean; message: string; order: AdminOrder; license?: AdminLicense } {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    order.paymentStatus = status;
    order.updatedAt = new Date().toISOString();

    let createdLicense: AdminLicense | undefined = undefined;
    if (status === 'PAID') {
      const now = new Date();
      order.runtimeStart = now.toISOString();
      if (order.durationDays > 0) {
        order.runtimeExpiry = new Date(now.getTime() + order.durationDays * 86400000).toISOString();
      }

      const licId = 'LIC-' + Math.floor(10000 + Math.random() * 90000);
      createdLicense = {
        id: licId,
        userId: order.userId,
        username: order.username,
        moduleId: order.moduleId,
        moduleName: order.moduleName,
        planId: order.planId,
        isPermanent: order.durationDays <= 0,
        durationDays: order.durationDays,
        startsAt: now.toISOString(),
        expiresAt: order.durationDays > 0 ? new Date(now.getTime() + order.durationDays * 86400000).toISOString() : null,
        status: 'active',
        createdAt: now.toISOString(),
        createdBy: 'SAGAR551',
      };
      this.state.licenses.unshift(createdLicense);
    }

    this.logActivity('SAGAR551', 'ORDER_STATUS_UPDATE', order.id, 'SUCCESS', `Order ${order.id} marked as ${status}`);
    this.saveToStorage();
    this.syncDocToFirestore('orders', order.id, order);

    return {
      success: true,
      message: `Order marked as ${status} successfully. ${createdLicense ? 'License activated.' : ''}`,
      order,
      license: createdLicense,
    };
  }

  // ==========================================
  // LICENSES MANAGEMENT
  // ==========================================

  public getLicenses(): AdminLicense[] {
    return this.state.licenses;
  }

  public issueLicense(data: any): { success: boolean; message: string; license: AdminLicense } {
    const user = this.state.users.find((u) => u.id === data.userId || u.username === data.username);
    const mod = this.state.modules.find((m) => m.id === data.moduleId);
    const licId = 'LIC-' + Math.floor(10000 + Math.random() * 90000);
    const duration = Number(data.durationDays || 30);

    const lic: AdminLicense = {
      id: licId,
      userId: user ? user.id : data.userId,
      username: user ? user.username : data.username || data.userId,
      moduleId: data.moduleId,
      moduleName: mod ? mod.name : data.moduleId,
      planId: data.planId || 'plan-30',
      isPermanent: duration <= 0,
      durationDays: duration,
      startsAt: new Date().toISOString(),
      expiresAt: duration > 0 ? new Date(Date.now() + duration * 86400000).toISOString() : null,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: 'SAGAR551',
    };

    this.state.licenses.unshift(lic);
    this.logActivity('SAGAR551', 'LICENSE_ISSUED', lic.id, 'SUCCESS', `Granted ${lic.moduleName} to ${lic.username}`);
    this.saveToStorage();

    return { success: true, message: 'License provisioned successfully', license: lic };
  }

  public revokeLicense(licenseId: string): { success: boolean; message: string } {
    const lic = this.state.licenses.find((l) => l.id === licenseId);
    if (!lic) throw new Error('License not found');
    lic.status = 'revoked';
    this.logActivity('SAGAR551', 'LICENSE_REVOKED', lic.id, 'SUCCESS', `Revoked license ${lic.id}`);
    this.saveToStorage();
    return { success: true, message: 'License revoked successfully' };
  }

  public extendLicense(licenseId: string, extraDays: number): { success: boolean; message: string; license: AdminLicense } {
    const lic = this.state.licenses.find((l) => l.id === licenseId);
    if (!lic) throw new Error('License not found');

    if (extraDays <= 0) {
      lic.isPermanent = true;
      lic.expiresAt = null;
      lic.durationDays = -1;
    } else {
      const cur = lic.expiresAt ? new Date(lic.expiresAt) : new Date();
      const base = cur > new Date() ? cur : new Date();
      lic.expiresAt = new Date(base.getTime() + extraDays * 86400000).toISOString();
      lic.isPermanent = false;
      lic.status = 'active';
    }

    this.logActivity('SAGAR551', 'LICENSE_EXTENDED', lic.id, 'SUCCESS', `Extended license ${lic.id}`);
    this.saveToStorage();
    return { success: true, message: 'License extended successfully', license: lic };
  }

  // ==========================================
  // SESSIONS, LOGS & SETTINGS
  // ==========================================

  public getSessions(): AdminSession[] {
    return this.state.sessions;
  }

  public revokeSession(token: string): { success: boolean; message: string } {
    this.state.sessions = this.state.sessions.filter((s) => s.token !== token);
    this.logActivity('SAGAR551', 'SESSION_REVOKED', token, 'SUCCESS', `Revoked session ${token}`);
    this.saveToStorage();
    return { success: true, message: 'Session revoked successfully' };
  }

  public getLogs(): AdminActivityLog[] {
    return this.state.activityLogs;
  }

  public getSettings(): SystemSettingsData {
    return this.state.settings;
  }

  public updateSettings(settingsData: Partial<SystemSettingsData>): { success: boolean; message: string; settings: SystemSettingsData } {
    Object.assign(this.state.settings, settingsData);
    this.logActivity('SAGAR551', 'SETTINGS_UPDATED', 'CORE_CONFIG', 'SUCCESS', 'Updated system settings');
    this.saveToStorage();
    this.syncDocToFirestore('settings', 'global', this.state.settings);
    return { success: true, message: 'Settings updated successfully', settings: this.state.settings };
  }
}

export const appStore = new AppStore();
