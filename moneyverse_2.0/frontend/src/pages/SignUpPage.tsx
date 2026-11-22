import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Eye, EyeOff, Lock, User, Mail, Sparkles, ArrowRight, AlertCircle, IndianRupee, Globe } from 'lucide-react';
import { LanguageCode } from '../types';

interface SignUpPageProps {
  onNavigate: (page: string) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate }) => {
  const { t, language, setLanguage } = useLanguage();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState<string>('25000');
  const [preferredLang, setPreferredLang] = useState<LanguageCode>(language);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('auth_err_password_match'));
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          full_name: fullName.trim() || username.trim(),
          preferred_language: preferredLang,
          monthly_income: parseFloat(monthlyIncome) || 0.0,
        }),
      });

      // Update active language to newly chosen preferred language
      setLanguage(preferredLang);
      login(data.token, data.user);
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || t('msg_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center p-4 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-lg glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">{t('auth_create_account')}</h2>
          <p className="text-xs text-gray-400 mt-1">{t('auth_signup_subtitle')}</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('auth_username')} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. rahul123"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs font-medium"
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('auth_full_name')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              {t('auth_email')} *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Baseline Income */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('auth_monthly_income')}
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder="25000"
                  min="0"
                  className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs font-medium"
                />
              </div>
            </div>

            {/* Preferred Language */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('auth_pref_language')}
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value as LanguageCode)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs font-medium bg-[#0f172a]"
                >
                  <option value="en">English</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('auth_password')} *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  required
                  className="w-full pl-9 pr-8 py-2 rounded-xl glass-input text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('auth_confirm_password')} *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>{t('status_loading')}</span>
            ) : (
              <>
                <span>{t('auth_signup_btn')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          <span>{t('auth_have_account')} </span>
          <button
            onClick={() => onNavigate('login')}
            className="text-cyan-400 font-semibold hover:underline"
          >
            {t('nav_login')}
          </button>
        </div>
      </div>
    </div>
  );
};
