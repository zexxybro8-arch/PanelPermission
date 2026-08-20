import React, { useState, useEffect } from 'react';
import { 
  Users, Search, UserPlus, Shield, Key, Power, 
  RotateCcw, DollarSign, Check, X, AlertTriangle, RefreshCw,
  Copy, Sparkles, Trash2, ShieldCheck, Eye, EyeOff, Boxes,
  Sliders, Calendar, Clock, AlertCircle, Edit3, Lock, Unlock,
  CheckCircle2, ChevronDown, Filter
} from 'lucide-react';
import { Customer, CustomerStats, CyberModule, CustomerCreationInput } from '../../types';
import { apiClient } from '../../services/apiClient';
import { extractErrorMessage } from '../../utils/errorMessage';

interface AdminCustomerManagementTabProps {
  onRefreshParent?: () => void;
}

export const AdminCustomerManagementTab: React.FC<AdminCustomerManagementTabProps> = ({
  onRefreshParent,
}) => {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modules, setModules] = useState<CyberModule[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    expiredUsers: 0,
  });

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED' | 'EXPIRED'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'id' | 'username' | 'price_asc' | 'price_desc' | 'expiry'>('newest');

  // Create Customer Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPrice, setNewPrice] = useState<number>(120);
  const [newStatus, setNewStatus] = useState<'active' | 'blocked'>('active');
  const [newExpiryDate, setNewExpiryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [newAssignedModules, setNewAssignedModules] = useState<string[]>(['mod-1']);
  const [createFormError, setCreateFormError] = useState('');

  // Created Credentials Success Modal (For Copying)
  const [createdResultModal, setCreatedResultModal] = useState<{
    customer_id: string;
    username: string;
    password: string;
    display_name?: string;
    price: number;
    status: 'active' | 'blocked';
    expiry_date: string;
    assigned_modules: string[];
  } | null>(null);

  // Edit Customer Modal State
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(120);
  const [editStatus, setEditStatus] = useState<'active' | 'blocked'>('active');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editModules, setEditModules] = useState<string[]>([]);
  const [editFormError, setEditFormError] = useState('');

  // Reset Password Modal State
  const [resetModalCustomer, setResetModalCustomer] = useState<Customer | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSuccessData, setResetSuccessData] = useState<{
    customer_id: string;
    username: string;
    newPassword: string;
  } | null>(null);

  // Quick Change Price Modal
  const [priceModalCustomer, setPriceModalCustomer] = useState<Customer | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState<number>(120);

  // Quick Change Expiry Modal
  const [expiryModalCustomer, setExpiryModalCustomer] = useState<Customer | null>(null);
  const [customExpiryInput, setCustomExpiryInput] = useState<string>('');

  // Manage Modules Modal
  const [modulesModalCustomer, setModulesModalCustomer] = useState<Customer | null>(null);
  const [selectedModulesList, setSelectedModulesList] = useState<string[]>([]);

  // Confirmation Modals (Block, Delete)
  const [confirmBlockCustomer, setConfirmBlockCustomer] = useState<Customer | null>(null);
  const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState<Customer | null>(null);

  // Toast / Copy Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${label} successfully.`);
    } catch {
      showToast(`Failed to copy to clipboard.`);
    }
  };

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getCustomers();
      setCustomers(data.customers || []);
      setStats(data.stats || {
        totalUsers: 0,
        activeUsers: 0,
        blockedUsers: 0,
        expiredUsers: 0,
      });
      if (data.modules && data.modules.length > 0) {
        setModules(data.modules);
      }
    } catch (err: unknown) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  // Preset Date Setter
  const setExpiryDaysFromNow = (days: number, isEdit = false) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const formatted = d.toISOString().split('T')[0];
    if (isEdit) {
      setEditExpiryDate(formatted);
    } else {
      setNewExpiryDate(formatted);
    }
  };

  // Generate ID & Password for Creation Modal
  const handleGenerateCreateCredentials = async () => {
    try {
      const data = await apiClient.generateCustomerCredentials();
      setNewCustomerId(data.customer_id);
      setNewPassword(data.password);
    } catch {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let id = 'CUST-';
      for (let i = 0; i < 5; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
      setNewCustomerId(id);
      setNewPassword(`VB-${Math.random().toString(36).substring(2, 8).toUpperCase()}!`);
    }
  };

  const handleOpenCreateModal = () => {
    handleGenerateCreateCredentials();
    setNewUsername('');
    setNewDisplayName('');
    setNewPrice(120);
    setNewStatus('active');
    setExpiryDaysFromNow(30, false);
    setNewAssignedModules(modules.length > 0 ? [modules[0].id] : ['mod-1']);
    setCreateFormError('');
    setIsCreateModalOpen(true);
  };

  // Handle Create Customer Submission
  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFormError('');

    if (!newUsername.trim()) {
      setCreateFormError('Username is required.');
      return;
    }

    if (!newPassword.trim()) {
      setCreateFormError('Password is required.');
      return;
    }

    setActionLoading('create-customer');
    try {
      const payload: CustomerCreationInput = {
        customer_id: newCustomerId.trim(),
        username: newUsername.trim(),
        password: newPassword.trim(),
        display_name: newDisplayName.trim() || undefined,
        price: Number(newPrice) || 120,
        status: newStatus,
        expiry_date: new Date(newExpiryDate).toISOString(),
        assigned_modules: newAssignedModules,
      };

      const result = await apiClient.createCustomer(payload);
      setIsCreateModalOpen(false);
      setCreatedResultModal(result.credentials);
      await fetchCustomerData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: unknown) {
      setCreateFormError(extractErrorMessage(err, 'Failed to create customer.'));
    } finally {
      setActionLoading(null);
    }
  };

  // Open Edit Customer Modal
  const handleOpenEditModal = (c: Customer) => {
    setEditCustomer(c);
    setEditUsername(c.username);
    setEditDisplayName(c.display_name || '');
    setEditPrice(c.price);
    setEditStatus(c.status);
    setEditExpiryDate(c.expiry_date.split('T')[0]);
    setEditModules(c.assigned_modules || []);
    setEditFormError('');
  };

  // Submit Edit Customer
  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    setEditFormError('');

    if (!editUsername.trim()) {
      setEditFormError('Username is required.');
      return;
    }

    setActionLoading(`edit-${editCustomer.id}`);
    try {
      await apiClient.updateCustomer(editCustomer.id, {
        username: editUsername.trim(),
        display_name: editDisplayName.trim() || undefined,
        price: Number(editPrice),
        status: editStatus,
        expiry_date: new Date(editExpiryDate).toISOString(),
        assigned_modules: editModules,
      });

      setEditCustomer(null);
      showToast(`Customer ${editCustomer.customer_id} updated successfully.`);
      await fetchCustomerData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: unknown) {
      setEditFormError(extractErrorMessage(err, 'Failed to update customer.'));
    } finally {
      setActionLoading(null);
    }
  };

  // Execute Block / Unblock Toggle
  const handleExecuteToggleBlock = async () => {
    if (!confirmBlockCustomer) return;
    setActionLoading(`toggle-${confirmBlockCustomer.id}`);
    try {
      const res = await apiClient.toggleCustomerBlock(confirmBlockCustomer.id);
      showToast(`Customer is now ${res.status.toUpperCase()}.`);
      setConfirmBlockCustomer(null);
      await fetchCustomerData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, 'Failed to toggle block status.'));
    } finally {
      setActionLoading(null);
    }
  };

  // Execute Delete Customer
  const handleExecuteDelete = async () => {
    if (!confirmDeleteCustomer) return;
    setActionLoading(`delete-${confirmDeleteCustomer.id}`);
    try {
      await apiClient.deleteCustomer(confirmDeleteCustomer.id);
      showToast(`Customer ${confirmDeleteCustomer.customer_id} permanently deleted.`);
      setConfirmDeleteCustomer(null);
      await fetchCustomerData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, 'Failed to delete customer.'));
    } finally {
      setActionLoading(null);
    }
  };

  // Open Reset Password Modal
  const handleOpenResetModal = async (c: Customer) => {
    setResetModalCustomer(c);
    setResetSuccessData(null);
    try {
      const gen = await apiClient.generateCustomerCredentials();
      setResetPasswordInput(gen.password);
    } catch {
      setResetPasswordInput(`VB-${Math.random().toString(36).substring(2, 8).toUpperCase()}!`);
    }
  };

  // Submit Reset Password
  const handleExecuteResetPassword = async () => {
    if (!resetModalCustomer) return;
    if (!resetPasswordInput.trim()) return;

    setActionLoading(`reset-pass-${resetModalCustomer.id}`);
    try {
      const res = await apiClient.resetCustomerPassword(resetModalCustomer.id, resetPasswordInput.trim());
      setResetSuccessData({
        customer_id: resetModalCustomer.customer_id,
        username: resetModalCustomer.username,
        newPassword: res.newPassword,
      });
      showToast(`Password reset successfully for ${resetModalCustomer.username}.`);
      await fetchCustomerData();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, 'Failed to reset password.'));
    } finally {
      setActionLoading(null);
    }
  };

  // Quick Change Price
  const handleOpenPriceModal = (c: Customer) => {
    setPriceModalCustomer(c);
    setCustomPriceInput(c.price);
  };

  const handleSaveQuickPrice = async () => {
    if (!priceModalCustomer) return;
    setActionLoading(`price-${priceModalCustomer.id}`);
    try {
      await apiClient.updateCustomer(priceModalCustomer.id, {
        price: Number(customPriceInput),
      });
      showToast(`Price for ${priceModalCustomer.customer_id} updated to ₹${customPriceInput}.`);
      setPriceModalCustomer(null);
      await fetchCustomerData();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, 'Failed to update price.'));
    } finally {
      setActionLoading(null);
    }
  };

  // Quick Change Expiry
  const handleOpenExpiryModal = (c: Customer) => {
    setExpiryModalCustomer(c);
    setCustomExpiryInput(c.expiry_date.split('T')[0]);
  };

  const handleSaveQuickExpiry = async (days?: number) => {
    if (!expiryModalCustomer) return;
    setActionLoading(`expiry-${expiryModalCustomer.id}`);
    try {
      if (typeof days === 'number') {
        await apiClient.extendCustomerExpiry(expiryModalCustomer.id, { days });
      } else {
        await apiClient.extendCustomerExpiry(expiryModalCustomer.id, { customDate: customExpiryInput });
      }
      showToast(`Expiry updated successfully.`);
      setExpiryModalCustomer(null);
      await fetchCustomerData();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, 'Failed to update expiry.'));
    } finally {
      setActionLoading(null);
    }
  };

  // Manage Modules Modal
  const handleOpenModulesModal = (c: Customer) => {
    setModulesModalCustomer(c);
    setSelectedModulesList(c.assigned_modules || []);
  };

  const handleToggleModuleInList = (modId: string) => {
    if (selectedModulesList.includes(modId)) {
      setSelectedModulesList(selectedModulesList.filter(id => id !== modId));
    } else {
      setSelectedModulesList([...selectedModulesList, modId]);
    }
  };

  const handleSaveQuickModules = async () => {
    if (!modulesModalCustomer) return;
    setActionLoading(`mod-${modulesModalCustomer.id}`);
    try {
      await apiClient.updateCustomer(modulesModalCustomer.id, {
        assigned_modules: selectedModulesList,
      });
      showToast(`Module permissions updated for ${modulesModalCustomer.username}.`);
      setModulesModalCustomer(null);
      await fetchCustomerData();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, 'Failed to update module permissions.'));
    } finally {
      setActionLoading(null);
    }
  };

  // Filtering & Sorting Logic
  const now = new Date();
  const filteredCustomers = customers.filter(c => {
    const isSearchMatch = 
      c.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.display_name && c.display_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!isSearchMatch) return false;

    const isExpired = new Date(c.expiry_date) < now;

    if (statusFilter === 'ACTIVE') {
      return c.status === 'active' && !isExpired;
    }
    if (statusFilter === 'BLOCKED') {
      return c.status === 'blocked';
    }
    if (statusFilter === 'EXPIRED') {
      return c.status !== 'blocked' && isExpired;
    }
    return true;
  });

  // Sort logic
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    if (sortBy === 'id') {
      return a.customer_id.localeCompare(b.customer_id);
    }
    if (sortBy === 'username') {
      return a.username.localeCompare(b.username);
    }
    if (sortBy === 'price_asc') {
      return a.price - b.price;
    }
    if (sortBy === 'price_desc') {
      return b.price - a.price;
    }
    if (sortBy === 'expiry') {
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    }
    return 0;
  });

  // Format Helper for Expiry badge
  const getExpiryBadgeInfo = (expiryDateStr: string, status: 'active' | 'blocked') => {
    const expDate = new Date(expiryDateStr);
    const diffMs = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (status === 'blocked') {
      return {
        label: 'BLOCKED',
        colorClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
      };
    }

    if (diffDays <= 0) {
      const daysAgo = Math.abs(diffDays);
      return {
        label: daysAgo === 0 ? 'EXPIRES TODAY' : `EXPIRED (${daysAgo}d ago)`,
        colorClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      };
    }

    if (diffDays <= 3) {
      return {
        label: `${diffDays} DAYS LEFT (SOON)`,
        colorClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      };
    }

    return {
      label: `${diffDays} DAYS LEFT`,
      colorClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
    };
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-cyan-950/95 border border-cyan-500/50 text-cyan-200 text-xs font-mono-code flex items-center gap-2 shadow-[0_0_25px_rgba(0,242,254,0.35)] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30 uppercase">
              ADMIN CONTROL PANEL
            </span>
            <span className="text-xs text-slate-500 font-mono-code">// PERSISTENT CUSTOMER REPOSITORY</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide">
            CUSTOMER MANAGEMENT
          </h2>
          <p className="text-xs text-slate-400 font-mono-code mt-0.5">
            Full administrative control over customer profiles, isolated pricing, login credentials, expiry dates, and module access permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchCustomerData}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-mono-code flex items-center gap-2 transition-colors cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">REFRESH</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs font-mono-code flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.3)] transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>+ CREATE NEW CUSTOMER</span>
          </button>
        </div>
      </div>

      {/* 4 Dashboard Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Users */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider">TOTAL USERS</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-white mt-2">
            {stats.totalUsers}
          </div>
          <div className="text-[10px] font-mono-code text-cyan-400/80 mt-1 flex items-center gap-1">
            <span>REGISTERED IN SYSTEM</span>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider">ACTIVE USERS</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-emerald-400 mt-2">
            {stats.activeUsers}
          </div>
          <div className="text-[10px] font-mono-code text-emerald-400/80 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>AUTHENTICATED & VALID</span>
          </div>
        </div>

        {/* Blocked Users */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-rose-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider">BLOCKED USERS</span>
            <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-rose-400 mt-2">
            {stats.blockedUsers}
          </div>
          <div className="text-[10px] font-mono-code text-rose-400/80 mt-1 flex items-center gap-1">
            <span>ADMIN LOCKED ACCESS</span>
          </div>
        </div>

        {/* Expired Users */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 p-4 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider">EXPIRED USERS</span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-amber-400 mt-2">
            {stats.expiredUsers}
          </div>
          <div className="text-[10px] font-mono-code text-amber-400/80 mt-1 flex items-center gap-1">
            <span>RUNTIME EXPIRED</span>
          </div>
        </div>
      </div>

      {/* Search, Status Tabs & Sorting Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
        {/* Search Box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4 text-cyan-400/80" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="SEARCH CUSTOMER ID OR USERNAME..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-mono-code text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 overflow-x-auto">
          {(['ALL', 'ACTIVE', 'BLOCKED', 'EXPIRED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono-code font-bold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono-code text-slate-500 hidden sm:inline">SORT:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-mono-code text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            <option value="newest">Newest Created</option>
            <option value="id">Customer ID (A-Z)</option>
            <option value="username">Username (A-Z)</option>
            <option value="price_asc">Price (Low to High)</option>
            <option value="price_desc">Price (High to Low)</option>
            <option value="expiry">Expiry (Soonest)</option>
          </select>
        </div>
      </div>

      {/* Customer Directory Table & Mobile Cards */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400 font-mono-code text-xs flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span>QUERYING ENCRYPTED CUSTOMER DATABASE...</span>
          </div>
        ) : sortedCustomers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-mono-code text-xs flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-8 h-8 text-slate-600" />
            <span>NO CUSTOMERS FOUND MATCHING CRITERIA</span>
            <button
              onClick={handleOpenCreateModal}
              className="mt-2 px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-xs hover:bg-cyan-900"
            >
              + Create First Customer
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-mono-code text-slate-400">
                    <th className="py-3.5 px-4">CUSTOMER ID</th>
                    <th className="py-3.5 px-4">USERNAME</th>
                    <th className="py-3.5 px-4">PRICE</th>
                    <th className="py-3.5 px-4">STATUS</th>
                    <th className="py-3.5 px-4">EXPIRY</th>
                    <th className="py-3.5 px-4">MODULES</th>
                    <th className="py-3.5 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-code text-xs">
                  {sortedCustomers.map((cust) => {
                    const badgeInfo = getExpiryBadgeInfo(cust.expiry_date, cust.status);
                    return (
                      <tr
                        key={cust.id}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        {/* Customer ID */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                              {cust.customer_id}
                            </span>
                            <button
                              onClick={() => copyToClipboard(cust.customer_id, 'Customer ID')}
                              className="text-slate-500 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100"
                              title="Copy Customer ID"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Username & Name */}
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-bold text-slate-100">{cust.username}</span>
                            {cust.display_name && (
                              <div className="text-[10px] text-slate-400 font-sans">
                                {cust.display_name}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleOpenPriceModal(cust)}
                            className="inline-flex items-center gap-1 text-cyan-300 font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/40 transition-colors"
                            title="Click to edit price"
                          >
                            <span>₹{cust.price}</span>
                            <Edit3 className="w-2.5 h-2.5 text-slate-500" />
                          </button>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {cust.status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-500/30">
                              <Lock className="w-2.5 h-2.5" />
                              BLOCKED
                            </span>
                          )}
                        </td>

                        {/* Expiry */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleOpenExpiryModal(cust)}
                            className="text-left group/exp cursor-pointer"
                            title="Click to change expiry"
                          >
                            <div className="text-slate-300 text-[11px]">
                              {cust.expiry_date.split('T')[0]}
                            </div>
                            <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded border mt-0.5 ${badgeInfo.colorClass}`}>
                              {badgeInfo.label}
                            </span>
                          </button>
                        </td>

                        {/* Modules */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleOpenModulesModal(cust)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 cursor-pointer"
                            title="Manage module access"
                          >
                            <Boxes className="w-3 h-3 text-cyan-400" />
                            <span>{cust.assigned_modules?.length || 0} Modules</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEditModal(cust)}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-950 hover:text-cyan-300 text-slate-400 border border-slate-700/60 transition-colors"
                              title="Edit Customer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password Button */}
                            <button
                              onClick={() => handleOpenResetModal(cust)}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-950 hover:text-amber-300 text-slate-400 border border-slate-700/60 transition-colors"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* Block / Unblock Button */}
                            <button
                              onClick={() => setConfirmBlockCustomer(cust)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                cust.status === 'active'
                                  ? 'bg-slate-800/80 hover:bg-rose-950 hover:text-rose-300 text-slate-400 border-slate-700/60'
                                  : 'bg-emerald-950 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900'
                              }`}
                              title={cust.status === 'active' ? 'Block Customer' : 'Unblock Customer'}
                            >
                              {cust.status === 'active' ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setConfirmDeleteCustomer(cust)}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950 hover:text-rose-400 text-slate-400 border border-slate-700/60 transition-colors"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-slate-800/70 p-3 space-y-3">
              {sortedCustomers.map((cust) => {
                const badgeInfo = getExpiryBadgeInfo(cust.expiry_date, cust.status);
                return (
                  <div
                    key={cust.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-code font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded text-xs border border-cyan-500/30">
                          {cust.customer_id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(cust.customer_id, 'Customer ID')}
                          className="text-slate-500 hover:text-cyan-400"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        {cust.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-rose-950 text-rose-400 border border-rose-500/30">
                            BLOCKED
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono-code">
                      <div>
                        <span className="text-slate-500 text-[10px]">USERNAME</span>
                        <div className="text-white font-bold">{cust.username}</div>
                        {cust.display_name && (
                          <div className="text-slate-400 text-[10px]">{cust.display_name}</div>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">PRICE</span>
                        <div className="text-cyan-300 font-bold">₹{cust.price}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">EXPIRY</span>
                        <div className="text-slate-300 text-[11px]">{cust.expiry_date.split('T')[0]}</div>
                        <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded border mt-0.5 ${badgeInfo.colorClass}`}>
                          {badgeInfo.label}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">MODULES</span>
                        <div className="text-slate-300 text-[11px]">{cust.assigned_modules?.length || 0} Assigned</div>
                      </div>
                    </div>

                    {/* Mobile Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                      <button
                        onClick={() => handleOpenEditModal(cust)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code flex items-center justify-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>EDIT</span>
                      </button>
                      <button
                        onClick={() => handleOpenResetModal(cust)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code flex items-center justify-center gap-1"
                      >
                        <Key className="w-3 h-3" />
                        <span>RESET</span>
                      </button>
                      <button
                        onClick={() => setConfirmBlockCustomer(cust)}
                        className={`p-1.5 rounded-lg border ${
                          cust.status === 'active'
                            ? 'bg-slate-800 text-slate-300 border-slate-700'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {cust.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteCustomer(cust)}
                        className="p-1.5 rounded-lg bg-slate-800 text-rose-400 border border-slate-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. CREATE NEW CUSTOMER MODAL */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 w-full max-w-xl text-slate-100 shadow-[0_0_60px_-15px_rgba(0,242,254,0.3)] my-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="text-[10px] font-mono-code font-bold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  NEW RECORD CREATION
                </span>
                <h3 className="text-xl font-display font-bold text-white mt-1">
                  CREATE NEW CUSTOMER
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createFormError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-mono-code flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{createFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-4 font-mono-code text-xs">
              {/* Customer ID & Generate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold">CUSTOMER ID (UNIQUE)</label>
                  <button
                    type="button"
                    onClick={handleGenerateCreateCredentials}
                    className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    GENERATE ID
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={newCustomerId}
                    onChange={(e) => setNewCustomerId(e.target.value)}
                    placeholder="e.g. CUST-84920"
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-cyan-300 font-bold focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newCustomerId, 'Customer ID')}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Copy ID"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Username & Nickname */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">USERNAME *</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. johndoe"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(newUsername, 'Username')}
                      className="px-2.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                      title="Copy Username"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">NAME / NICKNAME (OPTIONAL)</label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {/* Password & Generate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold">PASSWORD *</label>
                  <button
                    type="button"
                    onClick={async () => {
                      const gen = await apiClient.generateCustomerCredentials();
                      setNewPassword(gen.password);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    GENERATE PASSWORD
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter strong customer password"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newPassword, 'Password')}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Copy Password"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Price & Presets */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">PRICE (₹)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-32 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-cyan-300 font-bold focus:outline-none focus:border-cyan-500/50"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[120, 135, 150, 200].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPrice(p)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs border ${
                          newPrice === p
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        ₹{p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Account Status & Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">ACCOUNT STATUS</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewStatus('active')}
                      className={`flex-1 py-2 rounded-xl font-bold border transition-colors ${
                        newStatus === 'active'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-500/50'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                    >
                      ACTIVE
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStatus('blocked')}
                      className={`flex-1 py-2 rounded-xl font-bold border transition-colors ${
                        newStatus === 'blocked'
                          ? 'bg-rose-950 text-rose-400 border-rose-500/50'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                    >
                      BLOCKED
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">EXPIRY DATE</label>
                  <input
                    type="date"
                    required
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {[7, 15, 30, 90, 365].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setExpiryDaysFromNow(days, false)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px]"
                      >
                        +{days >= 365 ? '1yr' : `${days}d`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Module Permissions Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-bold">ASSIGNED MODULES</label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setNewAssignedModules(modules.map(m => m.id))}
                      className="text-cyan-400 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setNewAssignedModules([])}
                      className="text-slate-400 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-44 overflow-y-auto">
                  {modules.map((mod) => {
                    const isChecked = newAssignedModules.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setNewAssignedModules(newAssignedModules.filter(id => id !== mod.id));
                            } else {
                              setNewAssignedModules([...newAssignedModules, mod.id]);
                            }
                          }}
                          className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                        />
                        <div className="truncate">
                          <div className="font-bold text-xs truncate">{mod.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{mod.tag}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create-customer'}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.3)] cursor-pointer"
                >
                  {actionLoading === 'create-customer' ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-slate-950" />
                  )}
                  <span>CREATE CUSTOMER</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CREATED CREDENTIALS CONFIRMATION & COPY MODAL */}
      {/* ======================================================== */}
      {createdResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 w-full max-w-lg text-slate-100 shadow-[0_0_60px_-15px_rgba(16,185,129,0.3)] my-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                  CUSTOMER RECORD READY
                </span>
                <h3 className="text-lg font-display font-bold text-white mt-0.5">
                  CUSTOMER CREATED SUCCESSFULLY
                </h3>
              </div>
            </div>

            <p className="text-xs font-mono-code text-slate-400 mb-4 leading-relaxed">
              Share the credentials below with the customer. The customer can use either their Customer ID or Username along with the Pass Key to log in.
            </p>

            {/* Credentials Card */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono-code text-xs">
              {/* Customer ID */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500">CUSTOMER ID</span>
                  <div className="text-cyan-300 font-bold text-sm">{createdResultModal.customer_id}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(createdResultModal.customer_id, 'Customer ID')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Copy ID</span>
                </button>
              </div>

              {/* Username */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500">USERNAME</span>
                  <div className="text-white font-bold text-sm">{createdResultModal.username}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(createdResultModal.username, 'Username')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Copy User</span>
                </button>
              </div>

              {/* Password */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500">PASS KEY / PASSWORD</span>
                  <div className="text-emerald-400 font-bold text-sm">{createdResultModal.password}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(createdResultModal.password, 'Password')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copy Pass</span>
                </button>
              </div>

              {/* Price & Expiry */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-500">PRICE</span>
                  <div className="text-cyan-300 font-bold">₹{createdResultModal.price}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">EXPIRY DATE</span>
                  <div className="text-slate-300">{createdResultModal.expiry_date.split('T')[0]}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 mt-5">
              <button
                onClick={() => {
                  const fullText = `=== VERIFY // BUY CREDENTIALS ===\nCustomer ID: ${createdResultModal.customer_id}\nUsername: ${createdResultModal.username}\nPass Key: ${createdResultModal.password}\nPrice: ₹${createdResultModal.price}\nExpiry Date: ${createdResultModal.expiry_date.split('T')[0]}\n=================================`;
                  copyToClipboard(fullText, 'All Credentials');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono-code font-bold flex items-center justify-center gap-2 border border-slate-700"
              >
                <Copy className="w-4 h-4 text-cyan-400" />
                <span>COPY ALL DETAILS</span>
              </button>

              <button
                onClick={() => setCreatedResultModal(null)}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono-code text-xs"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. EDIT CUSTOMER MODAL */}
      {/* ======================================================== */}
      {editCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl text-slate-100 my-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="text-[10px] font-mono-code font-bold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  EDIT CUSTOMER PROFILE
                </span>
                <h3 className="text-xl font-display font-bold text-white mt-1">
                  EDIT {editCustomer.customer_id}
                </h3>
              </div>
              <button
                onClick={() => setEditCustomer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editFormError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-mono-code flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleEditCustomerSubmit} className="space-y-4 font-mono-code text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">USERNAME *</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">NAME / NICKNAME</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="Optional display name"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">PRICE (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-cyan-300 font-bold focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">STATUS</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="active">Active (Permitted)</option>
                    <option value="blocked">Blocked (Denied)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">EXPIRY DATE</label>
                <input
                  type="date"
                  required
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {[7, 15, 30, 60, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExpiryDaysFromNow(days, true)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      +{days}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Module Checkboxes */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">ASSIGNED MODULE ACCESS</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-40 overflow-y-auto">
                  {modules.map((mod) => {
                    const isChecked = editModules.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setEditModules(editModules.filter(id => id !== mod.id));
                            } else {
                              setEditModules([...editModules, mod.id]);
                            }
                          }}
                          className="rounded border-slate-700 text-cyan-500"
                        />
                        <span className="font-bold text-xs truncate">{mod.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === `edit-${editCustomer.id}`}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-2"
                >
                  {actionLoading === `edit-${editCustomer.id}` && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>SAVE CHANGES</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. RESET PASSWORD MODAL */}
      {/* ======================================================== */}
      {resetModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 w-full max-w-md text-slate-100 font-mono-code text-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/40">
                  CREDENTIALS OVERRIDE
                </span>
                <h3 className="text-lg font-display font-bold text-white mt-1">
                  RESET PASS KEY FOR {resetModalCustomer.username}
                </h3>
              </div>
              <button
                onClick={() => setResetModalCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSuccessData ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    PASSWORD RESET COMPLETED
                  </div>
                  <div className="text-slate-300">
                    New Pass Key for <strong className="text-white">{resetSuccessData.username}</strong>:
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-bold text-sm tracking-wider flex items-center justify-between">
                    <span>{resetSuccessData.newPassword}</span>
                    <button
                      onClick={() => copyToClipboard(resetSuccessData.newPassword, 'New Password')}
                      className="text-slate-400 hover:text-emerald-300"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setResetModalCustomer(null)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  CLOSE
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-bold">NEW PASS KEY / PASSWORD</label>
                    <button
                      type="button"
                      onClick={async () => {
                        const gen = await apiClient.generateCustomerCredentials();
                        setResetPasswordInput(gen.password);
                      }}
                      className="text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate Strong Key
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-amber-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalCustomer(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteResetPassword}
                    disabled={actionLoading === `reset-pass-${resetModalCustomer.id}`}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-2"
                  >
                    {actionLoading === `reset-pass-${resetModalCustomer.id}` && (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>RESET PASS KEY</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. QUICK CHANGE PRICE MODAL */}
      {/* ======================================================== */}
      {priceModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 w-full max-w-sm text-slate-100 font-mono-code text-xs">
            <h3 className="text-base font-display font-bold text-white mb-2">
              UPDATE PRICE FOR {priceModalCustomer.customer_id}
            </h3>
            <p className="text-slate-400 text-[11px] mb-4">
              This price applies specifically to customer <strong>{priceModalCustomer.username}</strong> without affecting any other customer.
            </p>

            <div className="mb-4">
              <label className="block text-slate-300 font-bold mb-1">PRICE (₹)</label>
              <input
                type="number"
                min="0"
                value={customPriceInput}
                onChange={(e) => setCustomPriceInput(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-cyan-300 font-bold text-sm focus:outline-none focus:border-cyan-500/50"
              />
              <div className="flex items-center gap-1.5 mt-2">
                {[120, 135, 150, 180, 200].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCustomPriceInput(p)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                  >
                    ₹{p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPriceModalCustomer(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300"
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveQuickPrice}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
              >
                SAVE PRICE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. QUICK CHANGE EXPIRY MODAL */}
      {/* ======================================================== */}
      {expiryModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm text-slate-100 font-mono-code text-xs">
            <h3 className="text-base font-display font-bold text-white mb-2">
              CHANGE EXPIRY FOR {expiryModalCustomer.customer_id}
            </h3>
            <p className="text-slate-400 text-[11px] mb-4">
              Current expiry: <strong className="text-white">{expiryModalCustomer.expiry_date.split('T')[0]}</strong>
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-slate-300 mb-1">QUICK EXTEND</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[7, 15, 30, 60, 90, 180].map((d) => (
                    <button
                      key={d}
                      onClick={() => handleSaveQuickExpiry(d)}
                      className="py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 text-slate-300 font-bold text-center"
                    >
                      +{d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">CUSTOM DATE</label>
                <input
                  type="date"
                  value={customExpiryInput}
                  onChange={(e) => setCustomExpiryInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setExpiryModalCustomer(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleSaveQuickExpiry()}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
              >
                SET EXPIRY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MANAGE MODULES MODAL */}
      {/* ======================================================== */}
      {modulesModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md text-slate-100 font-mono-code text-xs">
            <h3 className="text-base font-display font-bold text-white mb-1">
              MANAGE MODULE PERMISSIONS
            </h3>
            <p className="text-slate-400 text-[11px] mb-4">
              Toggle access permissions for customer <strong>{modulesModalCustomer.username}</strong>.
            </p>

            <div className="space-y-2 mb-5 max-h-60 overflow-y-auto">
              {modules.map((mod) => {
                const isSelected = selectedModulesList.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    onClick={() => handleToggleModuleInList(mod.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{mod.name}</div>
                      <div className="text-[10px] text-slate-500">{mod.tag}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      isSelected ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-700'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setModulesModalCustomer(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300"
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveQuickModules}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
              >
                APPLY PERMISSIONS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. CONFIRM BLOCK / UNBLOCK MODAL */}
      {/* ======================================================== */}
      {confirmBlockCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm text-slate-100 font-mono-code text-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-display font-bold text-white">
                {confirmBlockCustomer.status === 'active' ? 'BLOCK CUSTOMER?' : 'UNBLOCK CUSTOMER?'}
              </h3>
            </div>

            <p className="text-slate-400 leading-relaxed mb-4">
              {confirmBlockCustomer.status === 'active'
                ? `Are you sure you want to BLOCK customer ${confirmBlockCustomer.customer_id} (${confirmBlockCustomer.username})? The customer will be immediately locked out from the gateway.`
                : `Are you sure you want to UNBLOCK customer ${confirmBlockCustomer.customer_id} (${confirmBlockCustomer.username})? This will restore gateway access.`}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmBlockCustomer(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300"
              >
                CANCEL
              </button>
              <button
                onClick={handleExecuteToggleBlock}
                className={`px-4 py-2 rounded-xl font-bold ${
                  confirmBlockCustomer.status === 'active'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {confirmBlockCustomer.status === 'active' ? 'CONFIRM BLOCK' : 'CONFIRM UNBLOCK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. CONFIRM PERMANENT DELETE MODAL */}
      {/* ======================================================== */}
      {confirmDeleteCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl p-6 w-full max-w-sm text-slate-100 font-mono-code text-xs shadow-[0_0_50px_rgba(244,63,94,0.3)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-500/60 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-display font-bold text-white">
                PERMANENTLY DELETE CUSTOMER?
              </h3>
            </div>

            <p className="text-rose-200/90 leading-relaxed mb-4">
              Are you sure you want to permanently delete customer <strong>{confirmDeleteCustomer.customer_id}</strong> ({confirmDeleteCustomer.username})? This action is permanent and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteCustomer(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300"
              >
                CANCEL
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                DELETE PERMANENTLY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
