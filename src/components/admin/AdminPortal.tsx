import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, DollarSign, Layers, Boxes, 
  ShoppingCart, Key, ShieldAlert, FileText, Settings, 
  LogOut, ExternalLink, ShieldCheck, RefreshCw, Menu, X, ChevronRight
} from 'lucide-react';
import { 
  AdminOverviewStats, AdminUser, UserCustomPricing, 
  AdminRuntimePlan, CyberModule, AdminOrder, AdminLicense, 
  AdminSession, AdminActivityLog, SystemSettingsData 
} from '../../types';
import { apiClient } from '../../services/apiClient';

import { AdminOverviewTab } from './AdminOverviewTab';
import { AdminCustomerManagementTab } from './AdminCustomerManagementTab';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminUserPricingTab } from './AdminUserPricingTab';
import { AdminRuntimePlansTab } from './AdminRuntimePlansTab';
import { AdminModulesTab } from './AdminModulesTab';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminLicensesTab } from './AdminLicensesTab';
import { AdminSessionsTab } from './AdminSessionsTab';
import { AdminLogsTab } from './AdminLogsTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import { AdminLoginModal } from './AdminLoginModal';

interface AdminPortalProps {
  onBackToPortal: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToPortal }) => {
  const [activeTab, setActiveTab] = useState<string>('customers');
  const [targetPricingUserId, setTargetPricingUserId] = useState<string>('USER_10025');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!apiClient.getAdminToken());
  const [loading, setLoading] = useState(true);

  // Loaded State
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<AdminRuntimePlan[]>([]);
  const [modules, setModules] = useState<CyberModule[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [licenses, setLicenses] = useState<AdminLicense[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [settings, setSettings] = useState<SystemSettingsData | null>(null);

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const [
        overviewRes,
        usersRes,
        plansRes,
        modulesRes,
        ordersRes,
        licensesRes,
        sessionsRes,
        logsRes,
        settingsRes,
      ] = await Promise.all([
        apiClient.getAdminOverview(),
        apiClient.getUsers(),
        apiClient.getRuntimePlans(),
        apiClient.getModules(),
        apiClient.getOrders(),
        apiClient.getLicenses(),
        apiClient.getSessions(),
        apiClient.getLogs(),
        apiClient.getSettings(),
      ]);

      setStats(overviewRes.stats);
      setUsers(usersRes);
      setPlans(plansRes);
      setModules(modulesRes);
      setOrders(ordersRes);
      setLicenses(licensesRes);
      setSessions(sessionsRes);
      setLogs(logsRes);
      setSettings(settingsRes);
      setIsAuthenticated(true);
    } catch (err: unknown) {
      console.warn('Admin session validation failed or level 5 clearance required:', err);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const handleSelectUserForPricing = (userId: string) => {
    setTargetPricingUserId(userId);
    setActiveTab('pricing');
  };

  const handleLogout = async () => {
    await apiClient.logout();
    setIsAuthenticated(false);
  };

  const navItems = [
    { 
      id: 'customers', 
      label: 'CUSTOMER MANAGEMENT', 
      icon: Users, 
      highlight: true, 
      badge: 'PRO' 
    },
    { id: 'modules', label: 'ACCESS PANELS', icon: Boxes, highlight: true, badge: `${modules.length}` },
    { id: 'overview', label: 'OVERVIEW', icon: LayoutDashboard },
    { id: 'users', label: 'USER DIRECTORY', icon: Users, badge: `${users.length}` },
    { 
      id: 'pricing', 
      label: 'USER PRICING', 
      icon: DollarSign, 
      highlight: true, 
      badge: 'CUSTOM' 
    },
    { id: 'plans', label: 'RUNTIME PLANS', icon: Layers, badge: `${plans.length}` },
    { id: 'orders', label: 'ORDERS & PAYMENTS', icon: ShoppingCart, badge: `${orders.filter(o => o.paymentStatus === 'PENDING').length || ''}` },
    { id: 'licenses', label: 'LICENSES & KEYS', icon: Key, badge: `${licenses.length}` },
    { id: 'sessions', label: 'USER SESSIONS', icon: ShieldAlert, badge: `${sessions.length}` },
    { id: 'logs', label: 'ACTIVITY AUDIT', icon: FileText },
    { id: 'settings', label: 'SETTINGS', icon: Settings },
  ];

  if (!isAuthenticated) {
    return (
      <AdminLoginModal
        onSuccess={() => {
          setIsAuthenticated(true);
          fetchAllAdminData();
        }}
        onCancel={onBackToPortal}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 max-w-full overflow-x-hidden relative">
      {/* Background Neon Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
      </div>

      {/* Top Admin Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-cyan-500/20 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/60 hidden min-[380px]:flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.3)] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xs sm:text-sm tracking-widest text-white">
                  VERIFY // BUY
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 hidden min-[400px]:inline-block">
                  ROOT ADMIN [LEVEL 5]
                </span>
              </div>
              <span className="text-[10px] font-mono-code text-slate-400 hidden sm:block">
                CENTRALIZED COMMAND &amp; PRICING CONTROLLER
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToPortal}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-xs font-mono-code text-cyan-300 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">USER PORTAL</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
            title="Terminate Admin Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Admin Body: Sidebar + Dynamic Content Canvas */}
      <div className="flex-1 flex relative z-10">
        {/* Sidebar Navigation (Desktop) */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-md p-4 hidden lg:flex flex-col justify-between shrink-0 space-y-6">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono-code text-slate-500 tracking-wider px-3 uppercase block mb-2 font-bold">
              ADMIN CONTROL NODES
            </span>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono-code font-bold flex items-center justify-between transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(0,242,254,0.15)]'
                      : item.highlight
                      ? 'bg-slate-900/90 text-amber-300 border border-amber-500/30 hover:bg-amber-950/30'
                      : 'text-slate-400 hover:bg-slate-900/60 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-300' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                        item.highlight
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : isActive
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono-code space-y-1 text-slate-400">
            <div className="flex items-center justify-between text-slate-300 font-bold">
              <span>ADMIN: SAGAR551</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[10px] text-slate-500">Post-Quantum SHA-256 Session Encrypted</p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="w-72 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-display font-bold text-sm text-white">ADMIN MENU</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5 overflow-y-auto flex-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono-code font-bold flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                          : 'text-slate-400 hover:bg-slate-900 text-left'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* Content Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'customers' && (
            <AdminCustomerManagementTab
              onRefreshParent={fetchAllAdminData}
            />
          )}

          {activeTab === 'overview' && (
            <AdminOverviewTab
              stats={stats}
              recentOrders={orders.slice(0, 5)}
              recentLogs={logs.slice(0, 5)}
              loading={loading}
              onRefresh={fetchAllAdminData}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'users' && (
            <AdminUsersTab
              users={users}
              onRefresh={fetchAllAdminData}
              onSelectUserForPricing={handleSelectUserForPricing}
            />
          )}

          {activeTab === 'pricing' && (
            <AdminUserPricingTab
              users={users}
              onPricingUpdated={fetchAllAdminData}
            />
          )}

          {activeTab === 'plans' && (
            <AdminRuntimePlansTab
              plans={plans}
              onRefresh={fetchAllAdminData}
            />
          )}

          {activeTab === 'modules' && (
            <AdminModulesTab
              modules={modules}
              onRefresh={fetchAllAdminData}
            />
          )}

          {activeTab === 'orders' && (
            <AdminOrdersTab
              orders={orders}
              onRefresh={fetchAllAdminData}
            />
          )}

          {activeTab === 'licenses' && (
            <AdminLicensesTab
              licenses={licenses}
              users={users}
              modules={modules}
              onRefresh={fetchAllAdminData}
            />
          )}

          {activeTab === 'sessions' && (
            <AdminSessionsTab
              sessions={sessions}
              onRefresh={fetchAllAdminData}
            />
          )}

          {activeTab === 'logs' && (
            <AdminLogsTab
              logs={logs}
              onRefresh={fetchAllAdminData}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsTab
              settings={settings}
              onRefresh={fetchAllAdminData}
            />
          )}
        </main>
      </div>
    </div>
  );
};
