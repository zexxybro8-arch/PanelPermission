import React, { useState, useEffect } from 'react';
import { CyberNetworkCanvas } from './components/CyberNetworkCanvas';
import { CyberHeader } from './components/CyberHeader';
import { CyberLoginCard } from './components/CyberLoginCard';
import { CyberDashboard } from './components/CyberDashboard';
import { SecurityTerminalModal } from './components/SecurityTerminalModal';
import { AdminPortal } from './components/admin/AdminPortal';
import { UserProfile, ServerNode, TelemetryLog } from './types';
import { cyberAudio } from './utils/cyberAudio';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

const AVAILABLE_NODES: ServerNode[] = [
  { id: 'sg-01', name: 'SG-01 (Singapore)', region: 'Asia-SE', latencyMs: 12, status: 'optimal', encryption: 'KYBER-1024' },
  { id: 'tyo-02', name: 'TYO-02 (Tokyo)', region: 'Asia-East', latencyMs: 19, status: 'optimal', encryption: 'KYBER-1024' },
  { id: 'fra-04', name: 'FRA-04 (Frankfurt)', region: 'EU-Central', latencyMs: 28, status: 'optimal', encryption: 'KYBER-1024' },
  { id: 'iad-01', name: 'IAD-01 (US-East)', region: 'US-East', latencyMs: 41, status: 'optimal', encryption: 'KYBER-1024' },
];

const INITIAL_LOGS: TelemetryLog[] = [
  { id: '1', timestamp: '15:32:01', type: 'INFO', source: 'GATEWAY_CORE', message: 'Kyber-1024 quantum lattice session engine initialized', payloadHash: '0x8f..3b' },
  { id: '2', timestamp: '15:32:14', type: 'HANDSHAKE', source: 'TLS_1.3', message: 'Zero-downgrade cipher suite negotiated with edge cluster', payloadHash: '0x1c..9e' },
  { id: '3', timestamp: '15:32:45', type: 'SEC_ALERT', source: 'WAF_SENTINEL', message: 'Automated fingerprint scanner probe mitigated from 185.220.101.5', payloadHash: '0x44..a1' },
  { id: '4', timestamp: '15:33:02', type: 'SUCCESS', source: 'ENTROPY_POOL', message: 'Hardware random number generator (TRNG) pool refreshed', payloadHash: '0x7b..e2' },
  { id: '5', timestamp: '15:33:20', type: 'INFO', source: 'NODE_DISPATCH', message: 'Edge latency benchmark: SG-01 (12ms), TYO-02 (19ms)', payloadHash: '0x3a..ff' },
];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedNode, setSelectedNode] = useState<ServerNode>(AVAILABLE_NODES[0]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [currentView, setCurrentView] = useState<'portal' | 'admin'>(() => {
    return window.location.pathname.startsWith('/admin') || window.location.hash === '#admin' ? 'admin' : 'portal';
  });

  // Modals state
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // Live telemetry stream
  const [logs, setLogs] = useState<TelemetryLog[]>(INITIAL_LOGS);

  // Sync URL state and handle popstate (browser back/forward navigation)
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

  // Restore authenticated session securely on initial load
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem('aegis_auth_session');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        // Validate token integrity and expiration timestamp
        if (
          parsed &&
          parsed.token &&
          parsed.expiresAt &&
          parsed.expiresAt > Date.now()
        ) {
          const restoredUser: UserProfile = {
            id: parsed.id || 'USER_10024',
            username: parsed.username,
            codename: `${parsed.username}_OPERATOR`,
            clearanceLevel: parsed.clearanceLevel || 3,
            role: parsed.role || (parsed.username === 'ADMINXD' ? 'admin' : 'user'),
            terminalId: parsed.terminalId || `TERM-${Math.floor(1000 + Math.random() * 9000)}-X`,
            ipAddress: '192.168.1.104 [VPN ENCRYPTED]',
            nodeRegion: parsed.nodeRegion || AVAILABLE_NODES[0].region,
            avatarSeed: parsed.username,
            sessionToken: parsed.token,
            loginTime: new Date(parsed.createdAt || Date.now()).toISOString(),
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
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleAudio = () => {
    const nextState = !isAudioMuted;
    setIsAudioMuted(nextState);
    cyberAudio.setMuted(nextState);
    if (!nextState) {
      cyberAudio.playClick(1200);
    }
  };

  const handleLoginSuccess = (authenticatedUser: UserProfile) => {
    setUser(authenticatedUser);
    // Securely persist authenticated session descriptor on the device
    try {
      const sessionData = {
        id: authenticatedUser.id || 'USER_10024',
        username: authenticatedUser.username,
        role: authenticatedUser.role,
        token: authenticatedUser.sessionToken,
        clearanceLevel: authenticatedUser.clearanceLevel,
        nodeRegion: authenticatedUser.nodeRegion,
        terminalId: authenticatedUser.terminalId,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration window
      };
      localStorage.setItem('aegis_auth_session', JSON.stringify(sessionData));
    } catch {
      // ignore storage quota errors
    }
  };

  const handleLogout = () => {
    // Clear remembered session on logout
    try {
      localStorage.removeItem('aegis_auth_session');
      localStorage.removeItem('aegis_auth_token');
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
        {/* Top Cyber System Bar */}
        <CyberHeader
          onOpenTerminal={() => setIsTerminalOpen(true)}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          availableNodes={AVAILABLE_NODES}
          isAudioMuted={isAudioMuted}
          onToggleAudio={handleToggleAudio}
          onNavigateAdmin={navigateToAdmin}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-12">
          {!user ? (
            <div className="w-full flex justify-center items-center my-auto">
              {/* Main 3D Cyber Login Interface Card */}
              <CyberLoginCard
                onLoginSuccess={handleLoginSuccess}
                onOpenTerminal={() => setIsTerminalOpen(true)}
                selectedRegion={selectedNode.region}
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

        {/* Global Futuristic Footer */}
        <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-900/80 text-[11px] font-mono-code text-slate-500 z-10">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>GATEWAY ROUTED VIA {selectedNode.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Clearly Visible ADMIN PANEL Button in Footer */}
            <button
              type="button"
              id="footer-admin-panel-btn"
              onClick={navigateToAdmin}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,242,254,0.2)] font-bold text-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>ADMIN PANEL</span>
              <span className="text-[10px] text-cyan-400 font-mono-code bg-slate-900 px-1.5 py-0.2 rounded border border-cyan-500/30">
                /admin
              </span>
            </button>

            <span className="text-slate-700 hidden sm:inline">|</span>

            <button
              onClick={() => setIsTerminalOpen(true)}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              LIVE TELEMETRY
            </button>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span>AEGIS CORE DEFENSE © 2026</span>
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
    </div>
  );
}
