import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { OllamaStatus } from '../types';
import {
  LayoutDashboard,
  SplitSquareVertical,
  Mic,
  Milestone,
  ReceiptIndianRupee,
  BarChart3,
  UserCog,
  LogOut,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Home
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}) => {
  const { t } = useLanguage();
  const { user, summary, logout } = useAuth();
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiRequest<OllamaStatus>('/ai/status');
        setOllamaStatus(res);
      } catch {
        setOllamaStatus({
          is_connected: false,
          model: 'qwen2.5:3b',
          available_models: [],
          message: 'Unable to reach backend AI check'
        });
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { id: 'mirror', label: t('nav_mirror'), icon: SplitSquareVertical },
    { id: 'voice', label: t('nav_voice'), icon: Mic },
    { id: 'goals', label: t('nav_goals'), icon: Milestone },
    { id: 'expenses', label: t('nav_expenses'), icon: ReceiptIndianRupee },
    { id: 'reports', label: t('nav_reports'), icon: BarChart3 },
    { id: 'profile', label: t('nav_profile'), icon: UserCog },
  ];

  const handleSelect = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  const handleLogout = async () => {
    await logout();
    onNavigate('landing');
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 lg:top-[65px] left-0 h-screen lg:h-[calc(100vh-65px)] w-64 glass-panel border-r border-white/10 z-50 transition-transform duration-300 ease-in-out flex flex-col justify-between p-4 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Quick Balance Snapshot */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-transparent border border-purple-500/20">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
              {t('dash_stat_balance')}
            </p>
            <p className="text-xl font-black text-white mt-0.5">
              ₹{summary ? summary.available_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
              <span>{t('dash_stat_income')}:</span>
              <span className="font-semibold text-emerald-400">
                ₹{summary ? summary.monthly_income.toLocaleString('en-IN') : '0'}
              </span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/20 border border-purple-500/40 text-purple-200 shadow-md shadow-purple-900/20'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Area: Ollama Status & Logout */}
        <div className="space-y-3 pt-4 border-t border-white/10">
          {/* Ollama Status Badge */}
          <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-gray-300 font-mono">qwen2.5:3b</span>
            </div>
            {ollamaStatus?.is_connected ? (
              <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ready</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-amber-400 font-medium" title={ollamaStatus?.message}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Offline</span>
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent transition-colors"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>{t('nav_logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
