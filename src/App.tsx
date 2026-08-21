import React, { useState, useEffect } from 'react';
import { CyberNetworkCanvas } from './components/CyberNetworkCanvas';
import { CyberHeader } from './components/CyberHeader';
import { CyberLoginCard } from './components/CyberLoginCard';
import { CyberDashboard } from './components/CyberDashboard';
import { SecurityTerminalModal } from './components/SecurityTerminalModal';
import { AdminPortal } from './components/admin/AdminPortal';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { UserProfile, TelemetryLog } from './types';
import { apiClient } from './services/apiClient';

const INITIAL_LOGS: TelemetryLog[] = [
  { id: '1', timestamp: '15:32:01', type: 'INFO', source: 'GATEWAY_CORE', message: 'Kyber-1024 quantum lattice session engine initialized', payloadHash: '0x8f..3b' },
  { id: '2', timestamp: '15:32:14', type: 'HANDSHAKE', source: 'TLS_1.3', message: 'Zero-downgrade cipher suite negotiated with edge cluster', payloadHash: '0x1c..9e' },
  { id: '3', timestamp: '15:32:45', type: 'SEC_ALERT', source: 'WAF_SENTINEL', message: 'Automated fingerprint scanner probe mitigated from 185.220.101.5', payloadHash: '0x44..a1' },
  { id: '4', timestamp: '15:33:02', type: 'SUCCESS', source: 'ENTROPY_POOL', message: 'Hardware random number generator (TRNG) pool refreshed', payloadHash: '0x7b..e2' },
  { id: '5', timestamp: '15:33:20', type: 'INFO', source: 'NODE_DISPATCH', message: 'Edge latency benchmark: SG-01 (12ms), TYO-02 (19ms)', payloadHash: '0x3a..ff' },
];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isValidating, setIsValidating] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('aegis_auth_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        return !!(parsed && parsed.token && parsed.expiresAt && parsed.expiresAt > Date.now());
      }
    } catch {
      // ignore
    }
    return false;
  });
  const [currentView, setCurrentView] = useState<'portal' | 'admin'>(() => {
    return window.location.pathname.startsWith('/admin') || window.location.hash === '#admin' ? 'admin' : 'portal';
  });

  const handleLogout = () => {
    try {
      localStorage.removeItem('aegis_auth_session');
      localStorage.removeItem('aegis_auth_token');
      localStorage.removeItem('aegis_admin_token');
    } catch {
      // ignore
    }
    setUser(null);
    if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/admin')) {
      window.history.replaceState({}, '', '/');
      window.dispatchEvent(new Event('popstate'));
    }
  };

  // Modals state
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // Live telemetry stream
  const [logs, setLogs] = useState<TelemetryLog[]>(INITIAL_LOGS);

  // Sync URL state and handle popstate
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/admin') || window.location.hash === '#admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('portal');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToAdmin = () => {
    if (window.location.pathname !== '/admin') {
      window.history.pushState({}, '', '/admin');
    }
    setCurrentView('admin');
  };

  const navigateToPortal = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setCurrentView('portal');
  };

  // Securely verify session token with backend database
  useEffect(() => {
    let active = true;
    const verifySession = async () => {
      try {
        const storedSession = localStorage.getItem('aegis_auth_session');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          if (
            parsed &&
            parsed.token &&
            parsed.expiresAt &&
            parsed.expiresAt > Date.now()
          ) {
            const res = await fetch('/api/me', {
              headers: {
                'Authorization': `Bearer ${parsed.token}`
              }
            });

            if (!res.ok) {
              throw new Error('Unauthorized or expired session');
            }

            const data = await res.json();
            if (active) {
              if (data.success && data.user) {
                const validatedUser: UserProfile = {
                  id: data.user.id,
                  customer_id: data.user.customer_id,
                  username: data.user.username,
                  codename: `OPERATOR-${data.user.username.replace(/[^A-Z0-9]/gi, '')}`,
                  clearanceLevel: data.user.clearanceLevel || 3,
                  role: data.user.role || (data.user.username === 'SAGAR551' ? 'admin' : 'user'),
                  terminalId: `TERM-CUST-${data.user.customer_id ? data.user.customer_id.replace(/[^A-Z0-9]/gi, '') : 'X'}`,
                  ipAddress: '192.168.1.104 [VPN ENCRYPTED]',
                  nodeRegion: 'Asia-SE',
                  avatarSeed: data.user.username,
                  sessionToken: parsed.token,
                  loginTime: new Date(parsed.createdAt || Date.now()).toISOString(),
                  email: data.user.email || `${data.user.username}@aegis-defense.internal`,
                  price: data.user.price,
                  expiry_date: data.user.expiry_date,
                  assigned_modules: data.user.assigned_modules || [],
                  panel_permissions: data.user.panel_permissions || {},
                };
                setUser(validatedUser);
              } else {
                handleLogout();
              }
            }
          } else {
            handleLogout();
          }
        }
      } catch (err) {
        if (active) {
          handleLogout();
        }
      } finally {
        if (active) {
          setIsValidating(false);
        }
      }
    };

    verifySession();
    return () => {
      active = false;
    };
  }, []);

  // Redirect unauthenticated visitors trying to access protected paths
  useEffect(() => {
    if (!isValidating && !user) {
      const path = window.location.pathname;
      if (path !== '/' && !path.startsWith('/admin')) {
        window.history.replaceState({}, '', '/');
        window.dispatchEvent(new Event('popstate'));
      }
    }
  }, [isValidating, user]);

  // Redirect authenticated user at root `/` to `/dashboard`
  useEffect(() => {
    if (user && window.location.pathname === '/') {
      window.history.replaceState({}, '', '/dashboard');
      window.dispatchEvent(new Event('popstate'));
    }
  }, [user]);

  // Periodic Telemetry Simulator
  useEffect(() => {
    const interval = setInterval(() => {
      const ts = new Date().toISOString().slice(11, 19);
      const sources = ['WAF_FIREWALL', 'TLS_CIPHER', 'QUANTUM_SEED', 'SESSION_AUTH', 'NODE_ROUTER'];
      const messages = [
        'Rotated ephemeral zero-knowledge token hash',
        'Intercepted and dropped malformed TCP packet probe',
        'Synchronized edge routing state with Tokyo node',
        'Verified cryptographic certificate pinning integrity',
        'Zero-trust peer audit passed with 0 warnings',
      ];
      const types: TelemetryLog['type'][] = ['INFO', 'SUCCESS', 'HANDSHAKE', 'WARN'];

      const randomSource = sources[Math.floor(Math.random() * sources.length)];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const randomHash = `0x${Math.random().toString(16).substring(2, 6)}..${Math.random().toString(16).substring(2, 4)}`;

      const newLog: TelemetryLog = {
        id: Date.now().toString(),
        timestamp: ts,
        type: randomType,
        source: randomSource,
        message: randomMsg,
        payloadHash: randomHash,
      };

      setLogs((prev) => [...prev.slice(-40), newLog]);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = (authenticatedUser: UserProfile) => {
    setUser(authenticatedUser);
    try {
      const sessionData = {
        id: authenticatedUser.id || 'USR-10025',
        username: authenticatedUser.username,
        role: authenticatedUser.role,
        token: authenticatedUser.sessionToken,
        clearanceLevel: authenticatedUser.clearanceLevel,
        nodeRegion: authenticatedUser.nodeRegion,
        terminalId: authenticatedUser.terminalId,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        email: authenticatedUser.email,
      };
      localStorage.setItem('aegis_auth_session', JSON.stringify(sessionData));
    } catch {
      // ignore
    }
    window.history.pushState({}, '', '/dashboard');
    window.dispatchEvent(new Event('popstate'));
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  // If restoring / validating secure session
  if (isValidating) {
    return (
      <div className="min-h-screen bg-[#06080d] text-slate-100 relative flex flex-col justify-center items-center overflow-hidden font-mono-code select-none">
        <CyberNetworkCanvas interactive={false} />
        <div className="relative z-10 flex flex-col items-center gap-6 p-8 rounded-3xl cyber-glass border border-cyan-500/20 shadow-[0_0_50px_rgba(0,242,254,0.15)] max-w-sm w-full mx-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10" />
            <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 border-r-cyan-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border border-dashed border-cyan-500/30 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-sm font-display font-bold text-white tracking-widest uppercase">
              AUTHORIZING QUANTUM LINK
            </h3>
            <p className="text-[10px] text-cyan-400/70 uppercase tracking-widest animate-pulse">
              Verifying Cryptographic Session...
            </p>
          </div>
          <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
            <div className="h-full bg-cyan-400 animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  // If viewing Admin Panel route: /admin
  if (currentView === 'admin') {
    return (
      <AdminPortal
        onBackToPortal={navigateToPortal}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 relative flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 3D Three.js Animated Network Canvas */}
      <CyberNetworkCanvas interactive={true} />

      {/* Main UI Layout Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Cyber System Bar - Clicking AEGIS logo opens Admin Login */}
        <CyberHeader
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
          user={user}
          onLogout={handleLogout}
          onOpenTerminal={() => setIsTerminalOpen(true)}
          onOpenAdmin={navigateToAdmin}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-12">
          {!user ? (
            <div className="w-full flex justify-center items-center my-auto">
              {/* Main 3D Cyber Login Interface Card */}
              <CyberLoginCard
                onLoginSuccess={handleLoginSuccess}
                selectedRegion="Asia-SE"
              />
            </div>
          ) : (
            /* Post-Login Authenticated Cyber Command Console */
            <CyberDashboard
              user={user}
              onLogout={handleLogout}
              onOpenTerminal={() => setIsTerminalOpen(true)}
              onOpenAdmin={navigateToAdmin}
            />
          )}
        </main>

        {/* Global Premium Trust Footer */}
        <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border-t border-slate-900/90 z-10">
          {/* Trust Statement Capsule */}
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-950/80 border border-cyan-500/30 shadow-[0_0_20px_-3px_rgba(0,242,254,0.15)] text-xs font-mono-code">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            </span>
            <span className="text-slate-300 font-semibold tracking-wider uppercase">
              SECURE &amp; TRUSTED BUY
            </span>
            <span className="text-cyan-400/60 font-bold">•</span>
            <span className="text-cyan-300 font-bold tracking-wider drop-shadow-[0_0_8px_rgba(0,242,254,0.35)]">
              10K+ PEOPLE
            </span>
          </div>

          {/* Clean Portal Copyright / Identifier */}
          <div className="flex items-center gap-2 text-[11px] font-mono-code text-slate-500">
            <span className="tracking-widest">VERIFY // BUY © 2026</span>
          </div>
        </footer>
      </div>

      {/* Live Security Terminal Drawer */}
      <SecurityTerminalModal
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        logs={logs}
        onClearLogs={handleClearLogs}
      />

      {/* Admin Login Modal (Triggered by clicking AEGIS logo in header) */}
      {isAdminLoginModalOpen && (
        <AdminLoginModal
          onSuccess={() => {
            setIsAdminLoginModalOpen(false);
            navigateToAdmin();
          }}
          onCancel={() => setIsAdminLoginModalOpen(false)}
        />
      )}
    </div>
  );
}
