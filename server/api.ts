import { Router, Request, Response, NextFunction } from 'express';
import { aegisDb, hashPassword } from './db';

export const apiRouter = Router();

// ==========================================
// AUTHENTICATION MIDDLEWARES
// ==========================================
export interface AuthenticatedRequest extends Request {
  userSession?: {
    userId: string;
    username: string;
    clearanceLevel: number;
    role: string;
    token: string;
  };
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const queryToken = req.query.token as string;
  if (queryToken) return queryToken;
  return null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'UNAUTHORIZED: Missing authorization token. Please log in.',
      error: 'Missing authorization token',
    });
  }

  const session = aegisDb.getSessionByToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'UNAUTHORIZED: Session expired or invalid. Please log in again.',
      error: 'Invalid or expired session token',
    });
  }

  req.userSession = {
    userId: session.userId,
    username: session.username,
    clearanceLevel: session.clearanceLevel,
    role: session.role,
    token: session.token,
  };

  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'UNAUTHORIZED: Admin credentials required. Please log in to admin panel.',
      error: 'Admin token required',
    });
  }

  const session = aegisDb.getSessionByToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'UNAUTHORIZED: Admin session has expired. Please authenticate again.',
      error: 'Session expired',
    });
  }

  if (session.role !== 'admin' && session.clearanceLevel < 5) {
    aegisDb.logActivity(session.username, 'ADMIN_ACCESS_DENIED', 'ADMIN_PORTAL', 'WARNING', 'Insufficient clearance level');
    return res.status(403).json({
      success: false,
      message: 'FORBIDDEN: Level 5 Administrative clearance required.',
      error: 'Insufficient clearance level',
    });
  }

  req.userSession = {
    userId: session.userId,
    username: session.username,
    clearanceLevel: session.clearanceLevel,
    role: session.role,
    token: session.token,
  };

  next();
}

// ==========================================
// 1. PUBLIC & AUTH ENDPOINTS
// ==========================================

// POST /api/auth/login
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password, passKey, authorisedId } = req.body;
  const targetId = (authorisedId || username || '').trim();
  const credential = (password || passKey || '').trim();

  if (!targetId || !credential) {
    return res.status(400).json({
      success: false,
      message: 'Invalid authorised ID or pass key. Both fields are required.',
      error: 'Missing credentials',
    });
  }

  const user = aegisDb.getUserByUsername(targetId);
  if (!user) {
    aegisDb.logActivity('GUEST', 'AUTH_FAILED', targetId, 'FAILED', 'Unknown authorized ID');
    return res.status(401).json({
      success: false,
      message: 'Invalid authorised ID or pass key.',
      error: 'Invalid credentials',
    });
  }

  if (user.accountStatus === 'disabled') {
    aegisDb.logActivity('SYSTEM', 'AUTH_BLOCKED', user.username, 'WARNING', 'Account is disabled by administrator');
    return res.status(403).json({
      success: false,
      message: 'ACCOUNT DISABLED: Your access has been deactivated by the administrator.',
      error: 'Account disabled',
    });
  }

  // Cryptographic hash check
  const calculatedHash = hashPassword(credential, user.salt);
  if (calculatedHash !== user.passwordHash) {
    aegisDb.logActivity(user.username, 'AUTH_FAILED', user.username, 'FAILED', 'Incorrect pass key');
    return res.status(401).json({
      success: false,
      message: 'Invalid authorised ID or pass key.',
      error: 'Incorrect credentials',
    });
  }

  // Create active session
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '192.168.1.104';
  const ua = req.headers['user-agent'] || 'Aegis Quantum Client';
  const session = aegisDb.createSession(user, ip, ua);

  aegisDb.logActivity(user.username, 'USER_LOGIN', user.id, 'SUCCESS', `Session created from ${ip}`);

  const userData = {
    id: user.id,
    username: user.username,
    role: user.role,
    clearanceLevel: user.clearanceLevel,
    nodeRegion: user.nodeRegion,
    email: user.email,
  };

  return res.json({
    success: true,
    message: 'Authentication successful. Access granted.',
    data: {
      token: session.token,
      user: userData,
    },
    token: session.token,
    user: userData,
  });
});

// POST /api/auth/admin-login
apiRouter.post('/auth/admin-login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Administrator ID and master pass key are required.',
      error: 'Missing admin credentials',
    });
  }

  const user = aegisDb.getUserByUsername(username);
  if (!user || (user.role !== 'admin' && user.clearanceLevel < 5)) {
    aegisDb.logActivity('GUEST', 'ADMIN_LOGIN_FAILED', username, 'FAILED', 'Non-admin user attempt');
    return res.status(401).json({
      success: false,
      message: 'ACCESS DENIED: Invalid administrator ID or master pass key.',
      error: 'Access denied',
    });
  }

  const calculatedHash = hashPassword(password, user.salt);
  if (calculatedHash !== user.passwordHash) {
    aegisDb.logActivity(username, 'ADMIN_LOGIN_FAILED', username, 'FAILED', 'Incorrect admin password');
    return res.status(401).json({
      success: false,
      message: 'ACCESS DENIED: Invalid administrator ID or master pass key.',
      error: 'Incorrect credentials',
    });
  }

  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const session = aegisDb.createSession(user, ip, 'Aegis Admin Console');

  aegisDb.logActivity(user.username, 'ADMIN_LOGIN', 'ADMIN_PORTAL', 'SUCCESS', 'Administrator logged into management console');

  const userData = {
    id: user.id,
    username: user.username,
    role: user.role,
    clearanceLevel: user.clearanceLevel,
  };

  return res.json({
    success: true,
    message: 'Administrator authentication successful. System Level 5 authorized.',
    data: {
      token: session.token,
      user: userData,
    },
    token: session.token,
    user: userData,
  });
});

// GET /api/auth/me
apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.userSession!;
  const user = aegisDb.getUserById(session.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User profile not found',
      error: 'User not found',
    });
  }

  const licenses = aegisDb.getLicensesForUser(user.id);
  const customPricing = aegisDb.getUserCustomPricing(user.id);

  const userData = {
    id: user.id,
    username: user.username,
    role: user.role,
    clearanceLevel: user.clearanceLevel,
    nodeRegion: user.nodeRegion,
    email: user.email,
    accountStatus: user.accountStatus,
  };

  return res.json({
    success: true,
    message: 'Profile loaded successfully',
    data: {
      user: userData,
      licenses,
      customPricing: customPricing || null,
    },
    user: userData,
    licenses,
    customPricing: customPricing || null,
  });
});

// POST /api/auth/logout
apiRouter.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const token = req.userSession!.token;
  aegisDb.revokeSession(token, req.userSession!.username);
  return res.json({
    success: true,
    message: 'Session revoked successfully. Logged out.',
  });
});

// ==========================================
// 2. USER WEBSITE PORTAL CONFIG & PRICING
// ==========================================

// GET /api/portal/config
apiRouter.get('/portal/config', (req: Request, res: Response) => {
  const token = extractToken(req);
  let userId: string | undefined;

  if (token) {
    const session = aegisDb.getSessionByToken(token);
    if (session) {
      userId = session.userId;
    }
  } else if (req.query.userId) {
    userId = req.query.userId as string;
  }

  // Get active modules
  const modules = aegisDb.getAllModules().filter((m) => m.status === 'enabled');

  // Get plans with user-specific prices calculated on server
  const plans = aegisDb.getRuntimePlansForUser(userId);

  // Get licenses if authenticated
  const userLicenses = userId ? aegisDb.getLicensesForUser(userId) : [];

  return res.json({
    success: true,
    message: 'Portal configuration loaded',
    data: {
      modules,
      plans,
      userLicenses,
      upiQrImage: aegisDb.getSettings().upiQrImageUrl,
      settings: {
        gatewayVersion: aegisDb.getSettings().gatewayVersion,
        requirePoW: aegisDb.getSettings().requirePoW,
        defaultNode: aegisDb.getSettings().defaultNode,
      },
    },
    modules,
    plans,
    userLicenses,
    upiQrImage: aegisDb.getSettings().upiQrImageUrl,
    settings: {
      gatewayVersion: aegisDb.getSettings().gatewayVersion,
      requirePoW: aegisDb.getSettings().requirePoW,
      defaultNode: aegisDb.getSettings().defaultNode,
    },
  });
});

// POST /api/portal/orders (Create order with server-side price validation)
apiRouter.post('/portal/orders', (req: Request, res: Response) => {
  const { userId, username, moduleId, planId } = req.body;

  const targetUser = userId || username || 'GUEST_OPERATOR';
  if (!moduleId || !planId) {
    return res.status(400).json({
      success: false,
      message: 'Module ID and Plan ID are required to create an order',
      error: 'Missing parameters',
    });
  }

  const order = aegisDb.createOrder(targetUser, moduleId, planId);
  return res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: {
      order,
      upiQrImageUrl: aegisDb.getSettings().upiQrImageUrl,
    },
    order,
    upiQrImageUrl: aegisDb.getSettings().upiQrImageUrl,
  });
});

// GET /api/portal/orders/:id
apiRouter.get('/portal/orders/:id', (req: Request, res: Response) => {
  const all = aegisDb.getAllOrders();
  const order = all.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
      error: 'Order not found',
    });
  }
  return res.json({
    success: true,
    message: 'Order retrieved successfully',
    data: { order },
    order,
  });
});

// ==========================================
// 3. ADMIN MANAGEMENT ENDPOINTS (PROTECTED)
// ==========================================

// GET /api/admin/overview
apiRouter.get('/admin/overview', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const stats = aegisDb.getOverviewStats();
  const recentOrders = aegisDb.getAllOrders().slice(0, 5);
  const recentLogs = aegisDb.getActivityLogs(8);
  const activeSessions = aegisDb.getAllActiveSessions();

  return res.json({
    success: true,
    message: 'Overview statistics loaded',
    data: {
      stats,
      recentOrders,
      recentLogs,
      activeSessionsCount: activeSessions.length,
    },
    stats,
    recentOrders,
    recentLogs,
    activeSessionsCount: activeSessions.length,
  });
});

// ==========================================
// ADMIN: USER MANAGEMENT
// ==========================================
// GET /api/admin/users
apiRouter.get('/admin/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const search = ((req.query.search as string) || '').toLowerCase();
  const allUsers = aegisDb.getAllUsers();
  const customPricings = aegisDb.getAllCustomPricings();
  const allLicenses = aegisDb.getAllLicenses();

  const enrichedUsers = allUsers.map((u) => {
    const custom = customPricings.find((cp) => cp.userId === u.id || cp.userId === u.username);
    const userLics = allLicenses.filter((l) => l.userId === u.id || l.username === u.username);
    return {
      ...u,
      hasCustomPricing: !!custom,
      customPricing: custom || null,
      licenseCount: userLics.filter((l) => l.status === 'active').length,
    };
  });

  const finalUsers = !search
    ? enrichedUsers
    : enrichedUsers.filter(
        (u) =>
          u.id.toLowerCase().includes(search) ||
          u.username.toLowerCase().includes(search) ||
          (u.email && u.email.toLowerCase().includes(search))
      );

  return res.json({
    success: true,
    message: 'Users loaded successfully',
    data: { users: finalUsers },
    users: finalUsers,
  });
});

// GET /api/admin/users/generate-credentials
apiRouter.get('/admin/users/generate-credentials', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const generatedId = aegisDb.generateUniqueAuthorisedId();
  const generatedPassKey = aegisDb.generateSecurePassKey();
  return res.json({
    success: true,
    message: 'Credentials generated successfully',
    data: {
      authorisedId: generatedId,
      passKey: generatedPassKey,
    },
    authorisedId: generatedId,
    passKey: generatedPassKey,
  });
});

// POST /api/admin/users (Create Authorized Account)
apiRouter.post('/admin/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { 
    username, 
    authorisedId, 
    password, 
    passKey, 
    role, 
    clearanceLevel, 
    email, 
    nodeRegion,
    accountStatus,
    customPricing,
    initialModuleId,
    initialPlanId,
    initialDurationDays
  } = req.body;

  const targetUsername = (authorisedId || username || '').trim().toUpperCase();
  const targetPassKey = (passKey || password || '').trim();

  if (!targetUsername || !targetPassKey) {
    return res.status(400).json({
      success: false,
      message: 'Authorised Account ID and Pass Key are required',
      error: 'Missing required credentials',
    });
  }

  // Check uniqueness
  const existing = aegisDb.getUserByUsername(targetUsername);
  if (existing) {
    return res.status(409).json({
      success: false,
      message: `User with Authorised ID '${targetUsername}' already exists`,
      error: 'Duplicate ID',
    });
  }

  // Create user
  const newUser = aegisDb.createUser(
    {
      username: targetUsername,
      password: targetPassKey,
      role: role || 'user',
      clearanceLevel: clearanceLevel || 3,
      email: email || `${targetUsername.toLowerCase()}@aegis-defense.internal`,
      nodeRegion: nodeRegion || 'Asia-SE',
      accountStatus: accountStatus || 'active',
    },
    req.userSession!.username
  );

  // Set initial custom pricing if supplied
  if (customPricing) {
    aegisDb.setCustomPricing(
      newUser.id,
      {
        plan15Price: Number(customPricing.plan15Price || 120),
        plan20Price: Number(customPricing.plan20Price || 135),
        plan30Price: Number(customPricing.plan30Price || 150),
        planPermPrice: Number(customPricing.planPermPrice || 200),
      },
      req.userSession!.username
    );
  }

  // Grant initial module runtime if requested
  let initialLicense = null;
  if (initialModuleId) {
    const mod = aegisDb.getModuleById(initialModuleId);
    initialLicense = aegisDb.provisionLicense(
      newUser.id,
      newUser.username,
      initialModuleId,
      mod ? mod.name : initialModuleId,
      initialPlanId || 'plan-30',
      initialDurationDays || 30,
      req.userSession!.username
    );
  }

  aegisDb.logActivity(
    req.userSession!.username,
    'USER_CREATED',
    newUser.username,
    'SUCCESS',
    `Created authorised user ${newUser.username} with Pass Key.`
  );

  return res.status(201).json({ 
    success: true, 
    message: `Authorised user account '${newUser.username}' created successfully`,
    data: {
      user: newUser,
      createdCredentials: {
        authorisedId: newUser.username,
        passKey: targetPassKey,
      },
      initialLicense,
    },
    user: newUser,
    createdCredentials: {
      authorisedId: newUser.username,
      passKey: targetPassKey,
    },
    initialLicense,
  });
});

// POST /api/admin/users/:id/reset-password
apiRouter.post('/admin/users/:id/reset-password', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { newPassKey } = req.body;
  const generatedKey = (newPassKey || aegisDb.generateSecurePassKey()).trim();
  
  const ok = aegisDb.resetUserPassword(req.params.id, generatedKey, req.userSession!.username);
  if (!ok) {
    return res.status(404).json({
      success: false,
      message: 'User account not found',
      error: 'User account not found',
    });
  }

  return res.json({
    success: true,
    message: 'Pass Key reset successfully',
    data: { newPassKey: generatedKey },
    newPassKey: generatedKey,
  });
});

// DELETE /api/admin/users/:id
apiRouter.delete('/admin/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const ok = aegisDb.deleteUser(req.params.id, req.userSession!.username);
  if (!ok) {
    return res.status(404).json({
      success: false,
      message: 'User account not found',
      error: 'User account not found',
    });
  }
  return res.json({
    success: true,
    message: 'User account permanently deleted',
  });
});

// PATCH /api/admin/users/:id/status
apiRouter.patch('/admin/users/:id/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (status !== 'active' && status !== 'disabled') {
    return res.status(400).json({
      success: false,
      message: 'Status must be either active or disabled',
      error: 'Invalid status',
    });
  }

  const ok = aegisDb.updateUserStatus(req.params.id, status);
  if (!ok) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      error: 'User not found',
    });
  }

  aegisDb.logActivity(req.userSession!.username, 'USER_STATUS_UPDATED', req.params.id, 'SUCCESS', `User status set to ${status}.`);
  return res.json({
    success: true,
    message: `User status changed to ${status}`,
  });
});

// POST /api/admin/users/:id/reset-sessions
apiRouter.post('/admin/users/:id/reset-sessions', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const count = aegisDb.revokeAllUserSessions(req.params.id, req.userSession!.username);
  return res.json({
    success: true,
    message: `Revoked ${count} active user sessions`,
    revokedCount: count,
  });
});

// ==========================================
// ADMIN: INDIVIDUAL USER PRICING (KEY REQUIREMENT)
// ==========================================
// GET /api/admin/pricing
apiRouter.get('/admin/pricing', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const customPricings = aegisDb.getAllCustomPricings();
  const globalPlans = aegisDb.getAllRuntimePlans();
  return res.json({
    success: true,
    message: 'Pricing loaded successfully',
    data: { customPricings, globalPlans },
    customPricings,
    globalPlans,
  });
});

// GET /api/admin/pricing/:userId
apiRouter.get('/admin/pricing/:userId', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.userId;
  const custom = aegisDb.getUserCustomPricing(userId);
  const plansForUser = aegisDb.getRuntimePlansForUser(userId);

  return res.json({
    success: true,
    message: 'User pricing details loaded',
    data: {
      userId,
      customPricing: custom || null,
      effectivePlans: plansForUser,
    },
    userId,
    customPricing: custom || null,
    effectivePlans: plansForUser,
  });
});

// PUT /api/admin/pricing/:userId (Set / update custom pricing)
apiRouter.put('/admin/pricing/:userId', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.userId;
  const { plan15Price, plan20Price, plan30Price, planPermPrice } = req.body;

  if (
    plan15Price === undefined ||
    plan20Price === undefined ||
    plan30Price === undefined ||
    planPermPrice === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: 'All 4 plan prices must be specified',
      error: 'Incomplete price parameters',
    });
  }

  const updated = aegisDb.setCustomPricing(
    userId,
    {
      plan15Price: Number(plan15Price),
      plan20Price: Number(plan20Price),
      plan30Price: Number(plan30Price),
      planPermPrice: Number(planPermPrice),
    },
    req.userSession!.username
  );

  return res.json({
    success: true,
    message: 'Custom user pricing updated successfully',
    data: { customPricing: updated },
    customPricing: updated,
  });
});

// DELETE /api/admin/pricing/:userId (Reset to default)
apiRouter.delete('/admin/pricing/:userId', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.userId;
  const deleted = aegisDb.resetCustomPricing(userId, req.userSession!.username);
  return res.json({
    success: true,
    message: 'Custom pricing reset to global defaults',
    reset: deleted,
  });
});

// ==========================================
// ADMIN: GLOBAL RUNTIME PLANS
// ==========================================
// GET /api/admin/plans
apiRouter.get('/admin/plans', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const plans = aegisDb.getAllRuntimePlans();
  return res.json({
    success: true,
    message: 'Runtime plans loaded',
    data: { plans },
    plans,
  });
});

// PUT /api/admin/plans/:id
apiRouter.put('/admin/plans/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const updated = aegisDb.updateRuntimePlan(req.params.id, req.body, req.userSession!.username);
  if (!updated) {
    return res.status(404).json({
      success: false,
      message: 'Plan not found',
      error: 'Plan not found',
    });
  }
  return res.json({
    success: true,
    message: 'Runtime plan updated successfully',
    data: { plan: updated },
    plan: updated,
  });
});

// ==========================================
// ADMIN: MODULE MANAGEMENT
// ==========================================
// GET /api/admin/modules
apiRouter.get('/admin/modules', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const modules = aegisDb.getAllModules();
  return res.json({
    success: true,
    message: 'Modules loaded successfully',
    data: { modules },
    modules,
  });
});

// POST /api/admin/modules
apiRouter.post('/admin/modules', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id, name, version, description, tag, icon, status, requiredRuntime } = req.body;
  if (!id || !name) {
    return res.status(400).json({
      success: false,
      message: 'Module ID and name are required',
      error: 'Missing fields',
    });
  }

  const existing = aegisDb.getModuleById(id);
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'Module ID already exists',
      error: 'Duplicate ID',
    });
  }

  const mod = aegisDb.createModule(
    {
      id,
      name,
      version: version || '1.0.0',
      description: description || 'Module runtime description',
      tag: tag || 'SYSTEM',
      icon: icon || 'Zap',
      status: status || 'enabled',
      requiredRuntime: requiredRuntime || '15+ Days',
    },
    req.userSession!.username
  );

  return res.status(201).json({
    success: true,
    message: 'Module created successfully',
    data: { module: mod },
    module: mod,
  });
});

// PUT /api/admin/modules/:id
apiRouter.put('/admin/modules/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const mod = aegisDb.updateModule(req.params.id, req.body, req.userSession!.username);
  if (!mod) {
    return res.status(404).json({
      success: false,
      message: 'Module not found',
      error: 'Module not found',
    });
  }
  return res.json({
    success: true,
    message: 'Module updated successfully',
    data: { module: mod },
    module: mod,
  });
});

// PATCH /api/admin/modules/:id/toggle
apiRouter.patch('/admin/modules/:id/toggle', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const mod = aegisDb.toggleModuleStatus(req.params.id, req.userSession!.username);
  if (!mod) {
    return res.status(404).json({
      success: false,
      message: 'Module not found',
      error: 'Module not found',
    });
  }
  return res.json({
    success: true,
    message: `Module status updated to ${mod.status}`,
    data: { module: mod },
    module: mod,
  });
});

// DELETE /api/admin/modules/:id
apiRouter.delete('/admin/modules/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const deleted = aegisDb.deleteModule(req.params.id, req.userSession!.username);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Module not found',
      error: 'Module not found',
    });
  }
  return res.json({
    success: true,
    message: 'Module deleted successfully',
  });
});

// ==========================================
// ADMIN: ORDERS & PAYMENTS MANAGEMENT
// ==========================================
// GET /api/admin/orders
apiRouter.get('/admin/orders', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const orders = aegisDb.getAllOrders();
  return res.json({
    success: true,
    message: 'Orders loaded successfully',
    data: { orders },
    orders,
  });
});

// PATCH /api/admin/orders/:id/status
apiRouter.patch('/admin/orders/:id/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required',
      error: 'Missing status',
    });
  }

  const order = aegisDb.updateOrderStatus(req.params.id, status, req.userSession!.username);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
      error: 'Order not found',
    });
  }
  return res.json({
    success: true,
    message: `Order status updated to ${status}`,
    data: { order },
    order,
  });
});

// ==========================================
// ADMIN: LICENSES / ACCESS MANAGEMENT
// ==========================================
// GET /api/admin/licenses
apiRouter.get('/admin/licenses', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const licenses = aegisDb.getAllLicenses();
  return res.json({
    success: true,
    message: 'Licenses loaded successfully',
    data: { licenses },
    licenses,
  });
});

// POST /api/admin/licenses (Manually assign license)
apiRouter.post('/admin/licenses', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { userId, moduleId, planId, durationDays } = req.body;
  if (!userId || !moduleId) {
    return res.status(400).json({
      success: false,
      message: 'User ID and Module ID are required',
      error: 'Missing fields',
    });
  }

  const user = aegisDb.getUserById(userId) || aegisDb.getUserByUsername(userId);
  const mod = aegisDb.getModuleById(moduleId);

  const lic = aegisDb.provisionLicense(
    user ? user.id : userId,
    user ? user.username : userId,
    moduleId,
    mod ? mod.name : moduleId,
    planId || 'manual-grant',
    durationDays !== undefined ? parseInt(durationDays, 10) : 30,
    req.userSession!.username
  );

  return res.status(201).json({
    success: true,
    message: 'License provisioned successfully',
    data: { license: lic },
    license: lic,
  });
});

// PATCH /api/admin/licenses/:id/status
apiRouter.patch('/admin/licenses/:id/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  const lic = aegisDb.updateLicenseStatus(req.params.id, status, req.userSession!.username);
  if (!lic) {
    return res.status(404).json({
      success: false,
      message: 'License not found',
      error: 'License not found',
    });
  }
  return res.json({
    success: true,
    message: `License status updated to ${status}`,
    data: { license: lic },
    license: lic,
  });
});

// PATCH /api/admin/licenses/:id/extend
apiRouter.patch('/admin/licenses/:id/extend', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { extraDays } = req.body;
  const days = extraDays !== undefined ? parseInt(extraDays, 10) : 30;
  const lic = aegisDb.extendLicenseExpiry(req.params.id, days, req.userSession!.username);
  if (!lic) {
    return res.status(404).json({
      success: false,
      message: 'License not found',
      error: 'License not found',
    });
  }
  return res.json({
    success: true,
    message: `License extended by ${days} days`,
    data: { license: lic },
    license: lic,
  });
});

// ==========================================
// ADMIN: SESSIONS & LOGS
// ==========================================
// GET /api/admin/sessions
apiRouter.get('/admin/sessions', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const sessions = aegisDb.getAllActiveSessions();
  return res.json({
    success: true,
    message: 'Sessions loaded successfully',
    data: { sessions },
    sessions,
  });
});

// DELETE /api/admin/sessions/:token
apiRouter.delete('/admin/sessions/:token', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const ok = aegisDb.revokeSession(req.params.token, req.userSession!.username);
  return res.json({
    success: ok,
    message: ok ? 'Session revoked successfully' : 'Session not found',
  });
});

// POST /api/admin/sessions/revoke-all
apiRouter.post('/admin/sessions/revoke-all', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const sessions = aegisDb.getAllActiveSessions();
  let count = 0;
  for (const s of sessions) {
    if (s.userId !== req.userSession!.userId) {
      aegisDb.revokeSession(s.token, req.userSession!.username);
      count++;
    }
  }
  return res.json({
    success: true,
    message: `Terminated ${count} active sessions`,
    revokedCount: count,
  });
});

// GET /api/admin/logs
apiRouter.get('/admin/logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const logs = aegisDb.getActivityLogs(limit);
  return res.json({
    success: true,
    message: 'Activity logs loaded',
    data: { logs },
    logs,
  });
});

// GET /api/admin/settings
apiRouter.get('/admin/settings', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    message: 'Settings loaded',
    data: { settings: aegisDb.getSettings() },
    settings: aegisDb.getSettings(),
  });
});

// PUT /api/admin/settings
apiRouter.put('/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const updated = aegisDb.updateSettings(req.body, req.userSession!.username);
  return res.json({
    success: true,
    message: 'System settings updated successfully',
    data: { settings: updated },
    settings: updated,
  });
});
