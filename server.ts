import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

interface StoredCustomer {
  id: string;
  customer_id: string;
  username: string;
  password_hash: string;
  display_name?: string;
  price: number;
  status: 'active' | 'blocked';
  expiry_date: string;
  assigned_modules: string[];
  created_at: string;
  updated_at: string;
}

interface StoredPanel {
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
}

interface ServerDatabase {
  customers: StoredCustomer[];
  admin: {
    username: string;
    password_hash: string;
    role: string;
  };
  modules: StoredPanel[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "customers.json");

const DEFAULT_MODULES: StoredPanel[] = [
  { 
    id: 'mod-1', 
    name: 'BALA MOD XYZ', 
    description: 'Advanced real-time packet scanner, zero-day threat nullifier, and telemetry analyzer.', 
    tag: 'DEFENSE', 
    version: '4.2', 
    enabled: true,
    status: 'active',
    price: 120,
    icon: 'Flame',
    imageUrl: '',
    requiredRuntime: '15-30 Days',
    orderIndex: 1
  },
  { 
    id: 'mod-2', 
    name: 'ANGRY MOD', 
    description: 'High-frequency lattice cryptographic decryption node with quantum resistance.', 
    tag: 'LATTICE', 
    version: '3.1', 
    enabled: true,
    status: 'active',
    price: 150,
    icon: 'Zap',
    imageUrl: '',
    requiredRuntime: '20+ Days',
    orderIndex: 2
  },
  { 
    id: 'mod-3', 
    name: 'RAPID CORE', 
    description: 'Low-latency network gateway traffic optimizer and dynamic load orchestrator.', 
    tag: 'CORE', 
    version: '5.0', 
    enabled: true,
    status: 'active',
    price: 135,
    icon: 'Activity',
    imageUrl: '',
    requiredRuntime: '15+ Days',
    orderIndex: 3
  },
  { 
    id: 'mod-4', 
    name: 'ZERO TRACE', 
    description: 'Stealth obfuscation proxy with rotating ephemeral egress IP meshes.', 
    tag: 'STEALTH', 
    version: '2.8', 
    enabled: true,
    status: 'active',
    price: 140,
    icon: 'EyeOff',
    imageUrl: '',
    requiredRuntime: '30+ Days',
    orderIndex: 4
  },
  { 
    id: 'mod-5', 
    name: 'DRIPCLINT', 
    description: 'High-yield memory barrier protection and runtime sandbox fortification.', 
    tag: 'FIREWALL', 
    version: '6.4', 
    enabled: true,
    status: 'active',
    price: 160,
    icon: 'Droplets',
    imageUrl: '',
    requiredRuntime: 'Permanent / 30D',
    orderIndex: 5
  },
];

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(verifyHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function loadDatabase(): ServerDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      if (data && data.admin) {
        if (data.admin.username !== 'SAGAR551') {
          data.admin.username = 'SAGAR551';
          data.admin.password_hash = hashPassword('SAGAR@SAGAR1');
          saveDatabase(data);
        }
      }
      return data;
    }
  } catch (err) {
    console.error("Error reading database file, initializing fresh:", err);
  }

  // Initial database state
  const initialDb: ServerDatabase = {
    customers: [],
    admin: {
      username: "SAGAR551",
      password_hash: hashPassword("SAGAR@SAGAR1"),
      role: "admin",
    },
    modules: DEFAULT_MODULES,
  };

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: ServerDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save database:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory reference that stays synchronized with disk
  let db = loadDatabase();

  // Helper to generate unique Customer ID
  function generateUniqueCustomerId(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = 'CUST-';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!db.customers.some(c => c.customer_id === code)) {
        return code;
      }
    }
    return `CUST-${Date.now().toString(36).toUpperCase()}`;
  }

  // Helper to generate strong password
  function generateSecurePassword(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pass = 'VB-';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  // ==========================================
  // AUTHENTICATION API ROUTES
  // ==========================================

  // Customer Login Route
  app.post("/api/auth/login", (req, res) => {
    const { loginId, username, password, passKey } = req.body;
    const identifier = (loginId || username || "").toString().trim();
    const providedPass = (password || passKey || "").toString().trim();

    if (!identifier || !providedPass) {
      return res.status(400).json({
        success: false,
        message: "INVALID CUSTOMER ID OR PASSWORD",
      });
    }

    db = loadDatabase();

    // Check if it's admin logging in via the main gateway
    if (identifier.toUpperCase() === db.admin.username.toUpperCase() || identifier.toUpperCase() === 'SAGAR551') {
      if (verifyPassword(providedPass, db.admin.password_hash) || (db.admin.username === 'SAGAR551' && providedPass === 'SAGAR@SAGAR1')) {
        const token = `admin_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
        return res.json({
          success: true,
          message: `PANEL ACCESS GRANTED // ${db.admin.username}`,
          token,
          user: {
            id: 'admin-root',
            username: db.admin.username,
            role: 'admin',
            clearanceLevel: 5,
            accountStatus: 'active',
            price: 0,
            expiry_date: new Date(Date.now() + 365 * 86400000).toISOString(),
            assigned_modules: db.modules.map(m => m.id),
          },
        });
      }
    }

    // Lookup customer by customer_id OR username (case-insensitive)
    const customer = db.customers.find(
      c => c.customer_id.toUpperCase() === identifier.toUpperCase() ||
           c.username.toLowerCase() === identifier.toLowerCase()
    );

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "INVALID CUSTOMER ID OR PASSWORD",
      });
    }

    // Verify Password
    const isPassValid = verifyPassword(providedPass, customer.password_hash);
    if (!isPassValid) {
      return res.status(401).json({
        success: false,
        message: "INVALID CUSTOMER ID OR PASSWORD",
      });
    }

    // Check Blocked Status
    if (customer.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: "ACCOUNT BLOCKED — PLEASE CONTACT ADMIN.",
      });
    }

    // Check Expiry Date
    const now = new Date();
    const expiry = new Date(customer.expiry_date);
    if (expiry < now) {
      return res.status(403).json({
        success: false,
        message: "ACCOUNT EXPIRED — PLEASE CONTACT ADMIN.",
      });
    }

    // Successful login - return session token and customer's isolated data
    const token = `cust_${customer.id}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    return res.json({
      success: true,
      message: `PANEL ACCESS GRANTED // ${customer.username}`,
      token,
      user: {
        id: customer.id,
        customer_id: customer.customer_id,
        username: customer.username,
        display_name: customer.display_name,
        price: customer.price,
        status: customer.status,
        expiry_date: customer.expiry_date,
        assigned_modules: customer.assigned_modules || [],
        role: 'user',
        clearanceLevel: 3,
      },
    });
  });

  // Admin Dedicated Login Route
  app.post("/api/auth/admin-login", (req, res) => {
    const { username, password } = req.body;
    const trimmedUser = (username || "").toString().trim();
    const trimmedPass = (password || "").toString().trim();

    db = loadDatabase();

    if (
      (trimmedUser.toUpperCase() === db.admin.username.toUpperCase() || trimmedUser.toUpperCase() === "SAGAR551") &&
      (verifyPassword(trimmedPass, db.admin.password_hash) || (db.admin.username === "SAGAR551" && trimmedPass === "SAGAR@SAGAR1"))
    ) {
      const token = `admin_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      return res.json({
        success: true,
        message: "ADMIN ROOT AUTHENTICATED",
        token,
        user: {
          username: db.admin.username || "SAGAR551",
          role: "admin",
          clearanceLevel: 5,
        },
      });
    }

    return res.status(401).json({
      success: false,
      message: "INVALID ADMIN CREDENTIALS",
    });
  });

  // Current User Self Query (Customer isolated view)
  app.get("/api/me", (req, res) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return res.status(401).json({ success: false, message: "UNAUTHORIZED" });
    }

    db = loadDatabase();

    if (token.startsWith("admin_")) {
      return res.json({
        success: true,
        user: {
          username: db.admin.username,
          role: "admin",
          clearanceLevel: 5,
        },
      });
    }

    // Extract customer ID from token
    const match = token.match(/^cust_([^_]+)_/);
    if (!match) {
      return res.status(401).json({ success: false, message: "INVALID SESSION TOKEN" });
    }

    const customerId = match[1];
    const customer = db.customers.find(c => c.id === customerId);

    if (!customer) {
      return res.status(404).json({ success: false, message: "CUSTOMER NOT FOUND" });
    }

    // Enforce real-time status and expiry
    if (customer.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: "ACCOUNT BLOCKED — PLEASE CONTACT ADMIN.",
      });
    }

    if (new Date(customer.expiry_date) < new Date()) {
      return res.status(403).json({
        success: false,
        message: "ACCOUNT EXPIRED — PLEASE CONTACT ADMIN.",
      });
    }

    // Return ONLY their own customer profile
    return res.json({
      success: true,
      user: {
        id: customer.id,
        customer_id: customer.customer_id,
        username: customer.username,
        display_name: customer.display_name,
        price: customer.price,
        status: customer.status,
        expiry_date: customer.expiry_date,
        assigned_modules: customer.assigned_modules || [],
        role: 'user',
        clearanceLevel: 3,
      },
    });
  });

  // ==========================================
  // ADMIN CUSTOMER MANAGEMENT API ROUTES
  // ==========================================

  // Generate ID / Password helper
  app.get("/api/admin/generate-credentials", (_req, res) => {
    res.json({
      customer_id: generateUniqueCustomerId(),
      password: generateSecurePassword(),
    });
  });

  // List all customers + calculated stats
  app.get("/api/admin/customers", (req, res) => {
    db = loadDatabase();
    const now = new Date();

    const totalUsers = db.customers.length;
    const activeUsers = db.customers.filter(c => c.status === 'active' && new Date(c.expiry_date) >= now).length;
    const blockedUsers = db.customers.filter(c => c.status === 'blocked').length;
    const expiredUsers = db.customers.filter(c => c.status !== 'blocked' && new Date(c.expiry_date) < now).length;

    const stats = {
      totalUsers,
      activeUsers,
      blockedUsers,
      expiredUsers,
    };

    // Return list without revealing password hashes
    const sanitizedCustomers = db.customers.map(c => ({
      id: c.id,
      customer_id: c.customer_id,
      username: c.username,
      display_name: c.display_name,
      price: c.price,
      status: c.status,
      expiry_date: c.expiry_date,
      assigned_modules: c.assigned_modules || [],
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

    return res.json({
      success: true,
      stats,
      customers: sanitizedCustomers,
      modules: db.modules,
    });
  });

  // Create new customer
  app.post("/api/admin/customers", (req, res) => {
    db = loadDatabase();
    const {
      customer_id,
      username,
      password,
      display_name,
      price,
      status,
      expiry_date,
      assigned_modules,
    } = req.body;

    const targetCustomerId = (customer_id || generateUniqueCustomerId()).toString().trim().toUpperCase();
    const targetUsername = (username || "").toString().trim();
    const targetPassword = (password || generateSecurePassword()).toString().trim();
    const targetPrice = typeof price === 'number' ? price : Number(price) || 120;
    const targetStatus = status === 'blocked' ? 'blocked' : 'active';
    const targetModules = Array.isArray(assigned_modules) ? assigned_modules : ['mod-1'];
    
    // Default 30 days expiry if not provided
    const targetExpiry = expiry_date || new Date(Date.now() + 30 * 86400000).toISOString();

    if (!targetUsername) {
      return res.status(400).json({ success: false, message: "Username is required." });
    }

    // Check unique Customer ID
    if (db.customers.some(c => c.customer_id.toUpperCase() === targetCustomerId)) {
      return res.status(400).json({ success: false, message: `Customer ID "${targetCustomerId}" already exists. Please use a unique ID.` });
    }

    // Check unique Username
    if (db.customers.some(c => c.username.toLowerCase() === targetUsername.toLowerCase())) {
      return res.status(400).json({ success: false, message: `Username "${targetUsername}" already exists.` });
    }

    const now = new Date().toISOString();
    const newCustomer: StoredCustomer = {
      id: `cust_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      customer_id: targetCustomerId,
      username: targetUsername,
      password_hash: hashPassword(targetPassword),
      display_name: display_name ? display_name.trim() : undefined,
      price: targetPrice,
      status: targetStatus,
      expiry_date: targetExpiry,
      assigned_modules: targetModules,
      created_at: now,
      updated_at: now,
    };

    db.customers.unshift(newCustomer);
    saveDatabase(db);

    return res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      customer: {
        id: newCustomer.id,
        customer_id: newCustomer.customer_id,
        username: newCustomer.username,
        display_name: newCustomer.display_name,
        price: newCustomer.price,
        status: newCustomer.status,
        expiry_date: newCustomer.expiry_date,
        assigned_modules: newCustomer.assigned_modules,
        created_at: newCustomer.created_at,
        updated_at: newCustomer.updated_at,
      },
      credentials: {
        customer_id: newCustomer.customer_id,
        username: newCustomer.username,
        password: targetPassword,
        display_name: newCustomer.display_name,
        price: newCustomer.price,
        status: newCustomer.status,
        expiry_date: newCustomer.expiry_date,
        assigned_modules: newCustomer.assigned_modules,
      },
    });
  });

  // Edit customer
  app.put("/api/admin/customers/:id", (req, res) => {
    db = loadDatabase();
    const { id } = req.params;
    const customerIndex = db.customers.findIndex(c => c.id === id || c.customer_id === id);

    if (customerIndex === -1) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    const current = db.customers[customerIndex];
    const {
      username,
      display_name,
      price,
      status,
      expiry_date,
      assigned_modules,
    } = req.body;

    if (username && username.trim().toLowerCase() !== current.username.toLowerCase()) {
      const exists = db.customers.some(
        (c, idx) => idx !== customerIndex && c.username.toLowerCase() === username.trim().toLowerCase()
      );
      if (exists) {
        return res.status(400).json({ success: false, message: `Username "${username}" already taken.` });
      }
      current.username = username.trim();
    }

    if (typeof display_name !== 'undefined') current.display_name = display_name ? display_name.trim() : '';
    if (typeof price !== 'undefined') current.price = Number(price);
    if (status) current.status = status === 'blocked' ? 'blocked' : 'active';
    if (expiry_date) current.expiry_date = expiry_date;
    if (Array.isArray(assigned_modules)) current.assigned_modules = assigned_modules;
    current.updated_at = new Date().toISOString();

    db.customers[customerIndex] = current;
    saveDatabase(db);

    return res.json({
      success: true,
      message: "Customer updated successfully.",
      customer: {
        id: current.id,
        customer_id: current.customer_id,
        username: current.username,
        display_name: current.display_name,
        price: current.price,
        status: current.status,
        expiry_date: current.expiry_date,
        assigned_modules: current.assigned_modules,
        created_at: current.created_at,
        updated_at: current.updated_at,
      },
    });
  });

  // Reset Customer Password
  app.post("/api/admin/customers/:id/reset-password", (req, res) => {
    db = loadDatabase();
    const { id } = req.params;
    const { newPassword } = req.body;

    const customer = db.customers.find(c => c.id === id || c.customer_id === id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    const targetPass = (newPassword || generateSecurePassword()).toString().trim();
    customer.password_hash = hashPassword(targetPass);
    customer.updated_at = new Date().toISOString();
    saveDatabase(db);

    return res.json({
      success: true,
      message: `Password reset successfully for ${customer.username}.`,
      newPassword: targetPass,
      customer_id: customer.customer_id,
      username: customer.username,
    });
  });

  // Toggle Block / Unblock
  app.post("/api/admin/customers/:id/toggle-block", (req, res) => {
    db = loadDatabase();
    const { id } = req.params;
    const customer = db.customers.find(c => c.id === id || c.customer_id === id);

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    customer.status = customer.status === 'active' ? 'blocked' : 'active';
    customer.updated_at = new Date().toISOString();
    saveDatabase(db);

    return res.json({
      success: true,
      message: `Customer ${customer.customer_id} (${customer.username}) is now ${customer.status.toUpperCase()}.`,
      status: customer.status,
    });
  });

  // Change / Extend Expiry
  app.post("/api/admin/customers/:id/extend-expiry", (req, res) => {
    db = loadDatabase();
    const { id } = req.params;
    const { days, customDate } = req.body;

    const customer = db.customers.find(c => c.id === id || c.customer_id === id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    if (customDate) {
      customer.expiry_date = new Date(customDate).toISOString();
    } else if (typeof days === 'number') {
      const currentExpiry = new Date(customer.expiry_date);
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      customer.expiry_date = new Date(baseDate.getTime() + days * 86400000).toISOString();
    }
    customer.updated_at = new Date().toISOString();
    saveDatabase(db);

    return res.json({
      success: true,
      message: `Expiry date updated for ${customer.username}.`,
      expiry_date: customer.expiry_date,
    });
  });

  // Delete Customer
  app.delete("/api/admin/customers/:id", (req, res) => {
    db = loadDatabase();
    const { id } = req.params;
    const initialLen = db.customers.length;
    db.customers = db.customers.filter(c => c.id !== id && c.customer_id !== id);

    if (db.customers.length === initialLen) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    saveDatabase(db);
    return res.json({
      success: true,
      message: "Customer permanently deleted.",
    });
  });

  // Helper to enrich modules with assigned customers
  function getEnrichedPanels(database: ServerDatabase) {
    return database.modules.map(mod => {
      const assignedCustomers = database.customers
        .filter(c => Array.isArray(c.assigned_modules) && c.assigned_modules.includes(mod.id))
        .map(c => ({
          id: c.id,
          customer_id: c.customer_id,
          username: c.username,
        }));
      const assignedCustomerIds = assignedCustomers.map(c => c.id);
      return {
        ...mod,
        status: mod.status || (mod.enabled ? 'active' : 'inactive'),
        price: mod.price || 120,
        imageUrl: mod.imageUrl || '',
        assignedCustomers,
        assignedCustomerIds,
      };
    });
  }

  // Admin Panels / Modules Management
  app.get(["/api/admin/modules", "/api/admin/panels"], (req, res) => {
    db = loadDatabase();
    return res.json(getEnrichedPanels(db));
  });

  // Create Panel
  app.post(["/api/admin/modules", "/api/admin/panels"], (req, res) => {
    db = loadDatabase();
    const {
      id,
      name,
      description,
      tag,
      version,
      enabled,
      status,
      price,
      icon,
      imageUrl,
      requiredRuntime,
      assignedCustomerIds,
    } = req.body;

    const rawId = (id || name || `panel-${Date.now()}`).toString().trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    let finalId = rawId || `panel-${Date.now()}`;
    let counter = 1;
    while (db.modules.some(m => m.id === finalId)) {
      finalId = `${rawId}-${counter++}`;
    }

    const newPanel: StoredPanel = {
      id: finalId,
      name: (name || 'NEW ACCESS PANEL').toString().trim().toUpperCase(),
      description: (description || 'Cybersecurity operational access panel.').toString().trim(),
      tag: (tag || 'CUSTOM').toString().trim().toUpperCase(),
      version: (version || '1.0.0').toString().trim(),
      enabled: enabled !== false,
      status: status === 'inactive' ? 'inactive' : 'active',
      price: typeof price === 'number' ? price : Number(price) || 120,
      icon: icon || 'Shield',
      imageUrl: (imageUrl || '').toString().trim(),
      requiredRuntime: (requiredRuntime || '15+ Days').toString().trim(),
      orderIndex: db.modules.length + 1,
    };

    db.modules.push(newPanel);

    // If specific customers were assigned
    if (Array.isArray(assignedCustomerIds) && assignedCustomerIds.length > 0) {
      db.customers.forEach(cust => {
        if (assignedCustomerIds.includes(cust.id) || assignedCustomerIds.includes(cust.customer_id)) {
          if (!cust.assigned_modules.includes(newPanel.id)) {
            cust.assigned_modules.push(newPanel.id);
            cust.updated_at = new Date().toISOString();
          }
        }
      });
    }

    saveDatabase(db);

    const enriched = getEnrichedPanels(db).find(p => p.id === newPanel.id);
    return res.status(201).json({
      success: true,
      message: `Panel "${newPanel.name}" created successfully.`,
      module: enriched || newPanel,
      panel: enriched || newPanel,
    });
  });

  // Edit Panel
  app.put(["/api/admin/modules/:id", "/api/admin/panels/:id"], (req, res) => {
    db = loadDatabase();
    const { id } = req.params;
    const panelIdx = db.modules.findIndex(m => m.id === id);

    if (panelIdx === -1) {
      return res.status(404).json({ success: false, message: "Panel not found." });
    }

    const current = db.modules[panelIdx];
    const {
      name,
      description,
      tag,
      version,
      enabled,
      status,
      price,
      icon,
      imageUrl,
      requiredRuntime,
      assignedCustomerIds,
    } = req.body;

    if (name) current.name = name.toString().trim().toUpperCase();
    if (typeof description !== 'undefined') current.description = description.toString().trim();
    if (tag) current.tag = tag.toString().trim().toUpperCase();
    if (version) current.version = version.toString().trim();
    if (typeof enabled !== 'undefined') current.enabled = Boolean(enabled);
    if (status) current.status = status === 'inactive' ? 'inactive' : 'active';
    if (typeof price !== 'undefined') current.price = Number(price);
    if (icon) current.icon = icon;
    if (typeof imageUrl !== 'undefined') current.imageUrl = imageUrl.toString().trim();
    if (requiredRuntime) current.requiredRuntime = requiredRuntime.toString().trim();

    db.modules[panelIdx] = current;

    // Synchronize customer assignments if provided
    if (Array.isArray(assignedCustomerIds)) {
      db.customers.forEach(cust => {
        const shouldHave = assignedCustomerIds.includes(cust.id) || assignedCustomerIds.includes(cust.customer_id);
        const hasIt = cust.assigned_modules.includes(id);

        if (shouldHave && !hasIt) {
          cust.assigned_modules.push(id);
          cust.updated_at = new Date().toISOString();
        } else if (!shouldHave && hasIt) {
          cust.assigned_modules = cust.assigned_modules.filter(mId => mId !== id);
          cust.updated_at = new Date().toISOString();
        }
      });
    }

    saveDatabase(db);

    const enriched = getEnrichedPanels(db).find(p => p.id === id);
    return res.json({
      success: true,
      message: `Panel "${current.name}" updated successfully.`,
      module: enriched || current,
      panel: enriched || current,
    });
  });

  // Toggle Panel Status
  app.post(["/api/admin/modules/:id/toggle", "/api/admin/panels/:id/toggle"], (req, res) => {
    db = loadDatabase();
    const { id } = req.params;
    const panel = db.modules.find(m => m.id === id);

    if (!panel) {
      return res.status(404).json({ success: false, message: "Panel not found." });
    }

    panel.enabled = !panel.enabled;
    panel.status = panel.enabled ? 'active' : 'inactive';
    saveDatabase(db);

    return res.json({
      success: true,
      message: `Panel "${panel.name}" is now ${panel.enabled ? 'ENABLED' : 'DISABLED'}.`,
      module: panel,
      panel,
    });
  });

  // Assign / Unassign Customers to Panel
  app.post(["/api/admin/modules/:id/assign", "/api/admin/panels/:id/assign"], (req, res) => {
    db = loadDatabase();
    const { id } = req.params;
    const { assignedCustomerIds } = req.body;

    const panel = db.modules.find(m => m.id === id);
    if (!panel) {
      return res.status(404).json({ success: false, message: "Panel not found." });
    }

    if (Array.isArray(assignedCustomerIds)) {
      db.customers.forEach(cust => {
        const shouldHave = assignedCustomerIds.includes(cust.id) || assignedCustomerIds.includes(cust.customer_id);
        const hasIt = cust.assigned_modules.includes(id);

        if (shouldHave && !hasIt) {
          cust.assigned_modules.push(id);
          cust.updated_at = new Date().toISOString();
        } else if (!shouldHave && hasIt) {
          cust.assigned_modules = cust.assigned_modules.filter(mId => mId !== id);
          cust.updated_at = new Date().toISOString();
        }
      });
      saveDatabase(db);
    }

    const enriched = getEnrichedPanels(db).find(p => p.id === id);
    return res.json({
      success: true,
      message: `Panel access updated successfully.`,
      module: enriched || panel,
      panel: enriched || panel,
    });
  });

  // Delete Panel
  app.delete(["/api/admin/modules/:id", "/api/admin/panels/:id"], (req, res) => {
    db = loadDatabase();
    const { id } = req.params;
    const initialLen = db.modules.length;
    db.modules = db.modules.filter(m => m.id !== id);

    if (db.modules.length === initialLen) {
      return res.status(404).json({ success: false, message: "Panel not found." });
    }

    // Clean up assignments from all customers
    db.customers.forEach(cust => {
      if (cust.assigned_modules.includes(id)) {
        cust.assigned_modules = cust.assigned_modules.filter(mId => mId !== id);
        cust.updated_at = new Date().toISOString();
      }
    });

    saveDatabase(db);
    return res.json({
      success: true,
      message: "Panel permanently deleted.",
    });
  });

  // Customer Portal Configuration Route (Only returns assigned panels for authenticated customer)
  app.get("/api/portal/config", (req, res) => {
    db = loadDatabase();
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();
    const userId = (req.query.userId || req.query.username || "").toString();

    let targetCustomer: StoredCustomer | undefined;

    if (token && token.startsWith("cust_")) {
      const match = token.match(/^cust_([^_]+)_/);
      if (match) {
        targetCustomer = db.customers.find(c => c.id === match[1] || c.customer_id === match[1]);
      }
    }

    if (!targetCustomer && userId) {
      targetCustomer = db.customers.find(
        c => c.id === userId || c.customer_id.toUpperCase() === userId.toUpperCase() || c.username.toLowerCase() === userId.toLowerCase()
      );
    }

    // If target customer found, filter to only assigned enabled panels
    let accessibleModules = db.modules;
    if (targetCustomer) {
      const assignedIds = Array.isArray(targetCustomer.assigned_modules) ? targetCustomer.assigned_modules : [];
      accessibleModules = db.modules.filter(m => assignedIds.includes(m.id) && m.enabled !== false);
    }

    return res.json({
      modules: accessibleModules.map(m => ({
        ...m,
        imageUrl: m.imageUrl || '',
        price: m.price || 120,
      })),
      plans: [
        { id: 'plan-15', name: '15 DAYS ACCESS', durationDays: 15, defaultPrice: targetCustomer?.price || 120, userPrice: targetCustomer?.price || 120, status: 'active', badge: 'STANDARD', description: '15 days full tactical access pass', hasCustomPrice: true },
        { id: 'plan-30', name: '30 DAYS ACCESS', durationDays: 30, defaultPrice: (targetCustomer?.price || 120) * 1.5, userPrice: (targetCustomer?.price || 120) * 1.5, status: 'active', badge: 'RECOMMENDED', description: '30 days extended access pass', hasCustomPrice: true },
      ],
      userLicenses: [],
      upiQrImage: '',
    });
  });

  // SPA Static / Vite dev server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VERIFY // BUY Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

