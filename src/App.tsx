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
  const [currentView, setCurrentView] = useState<'portal' | 'admin'>(() => {
    return window.location.pathname.startsWith('/admin') || window.location.hash === '#admin' ? 'admin' : 'portal';
  });

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

  // Restore authenticated session from localStorage
  useEffect(() => {
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
          const restoredUser: UserProfile = {
            id: parsed.id || 'USR-10025',
            username: parsed.username,
            codename: `${parsed.username}_OPERATOR`,
            clearanceLevel: parsed.clearanceLevel || 3,
            role: parsed.role || (parsed.username === 'SAGAR551' ? 'admin' : 'user'),
            terminalId: parsed.terminalId || `TERM-${Math.floor(1000 + Math.random() * 9000)}-X`,
            ipAddress: '192.168.1.104 [VPN ENCRYPTED]',
            nodeRegion: parsed.nodeRegion || 'Asia-SE',
            avatarSeed: parsed.username,
            sessionToken: parsed.token,
            loginTime: new Date(parsed.createdAt || Date.now()).toISOString(),
            email: parsed.email,
          };
          setUser(restoredUser);
        } else {
          localStorage.removeItem('aegis_auth_session');
        }
      }
    } catch {
      localStorage.removeItem('aegis_auth_session');
    }
  }, []);

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
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('aegis_auth_session');
      localStorage.removeItem('aegis_auth_token');
      localStorage.removeItem('aegis_admin_token');
    } catch {
      // ignore
    }
    setUser(null);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

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
