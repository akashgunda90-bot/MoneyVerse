import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { LanguageCode } from '../types';
import {
  UserCog,
  Globe,
  Lock,
  IndianRupee,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const LANGUAGES: { code: LanguageCode; name: string; native: string }[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
];

interface ProfileSettingsPageProps {
  onNavigate: (page: string) => void;
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({ onNavigate }) => {
  const { t, language, setLanguage } = useLanguage();
  const { user, refreshUser, refreshSummary, logout } = useAuth();

  // Profile fields
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthly_income?.toString() || '0');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);

    try {
      await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName.trim(),
          monthly_income: parseFloat(monthlyIncome) || 0.0,
        }),
      });
      await refreshUser();
      await refreshSummary();
      setProfileMsg(t('msg_saved'));
    } catch (err: any) {
      setProfileErr(err.message || t('msg_error'));
    }
  };

  const handleLanguageChange = async (newLang: LanguageCode) => {
    await setLanguage(newLang);
    await refreshUser();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);

    if (!oldPassword || newPassword.length < 6) {
      setPwErr('New password must be at least 6 characters.');
      return;
    }

    try {
      await apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });
      setPwMsg('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPwErr(err.message || 'Failed to update password');
    }
  };

  const handleLogout = async () => {
    await logout();
    onNavigate('landing');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center space-x-2">
          <UserCog className="w-6 h-6 text-purple-400" />
          <span>{t('profile_title')}</span>
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">{t('profile_subtitle')}</p>
      </div>

      {/* Language Preference Section */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center space-x-2.5">
          <Globe className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">{t('profile_language_section')}</h2>
        </div>
        <p className="text-xs text-gray-400">{t('profile_language_desc')}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {LANGUAGES.map((langItem) => (
            <button
              key={langItem.code}
              onClick={() => handleLanguageChange(langItem.code)}
              className={`p-3 rounded-xl border text-center transition-all ${
                language === langItem.code
                  ? 'bg-purple-600/30 border-purple-400 text-white shadow-md shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <p className="font-bold text-xs">{langItem.native}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">{langItem.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* User Information Section */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <h2 className="text-sm font-bold text-white">{t('profile_info_section')}</h2>

        {profileMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{profileMsg}</span>
          </div>
        )}
        {profileErr && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{profileErr}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('auth_username')}
              </label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium opacity-60 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('auth_email')}
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium opacity-60 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('auth_full_name')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('auth_monthly_income')}
              </label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="25000"
                min="0"
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/30 transition-all flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{t('action_save')}</span>
          </button>
        </form>
      </div>

      {/* Security & Password Section */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center space-x-2">
          <Lock className="w-5 h-5 text-purple-400" />
          <h2 className="text-sm font-bold text-white">{t('profile_security_section')}</h2>
        </div>

        {pwMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{pwMsg}</span>
          </div>
        )}
        {pwErr && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{pwErr}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('profile_old_password')}
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('profile_new_password')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 chars"
                required
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-all"
          >
            {t('profile_change_pw_btn')}
          </button>
        </form>
      </div>

      {/* Logout Action */}
      <div className="glass-panel p-6 rounded-2xl border border-rose-500/20 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Sign out of MONEYVERSE 2.0</h3>
          <p className="text-xs text-gray-400 mt-0.5">Clears your active session token from this browser.</p>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-colors flex items-center space-x-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('nav_logout')}</span>
        </button>
      </div>
    </div>
  );
};
