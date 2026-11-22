import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { LanguageCode } from '../types';
import { Globe, User as UserIcon, Menu, X, Sparkles, LogIn } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onToggleSidebar?: () => void;
}

const LANGUAGES: { code: LanguageCode; label: string; nativeName: string }[] = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'kn', label: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeName: 'తెలుగు' },
];

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, onToggleSidebar }) => {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-white/10 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {user && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        <div 
          onClick={() => onNavigate(user ? 'dashboard' : 'landing')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-purple-200 to-cyan-300 bg-clip-text text-transparent">
              MONEYVERSE <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono">2.0</span>
            </span>
            <p className="text-[10px] text-gray-400 font-medium hidden sm:block">
              {t('tagline')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Language Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 text-sm font-medium text-gray-200 transition-colors"
          >
            <Globe className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-xs tracking-wider uppercase text-cyan-400">{language}</span>
            <span className="hidden md:inline text-xs text-gray-300">
              {LANGUAGES.find(l => l.code === language)?.nativeName}
            </span>
          </button>

          {langMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl glass-panel shadow-2xl border border-white/10 py-1.5 z-50">
              {LANGUAGES.map((langItem) => (
                <button
                  key={langItem.code}
                  onClick={() => {
                    setLanguage(langItem.code);
                    setLangMenuOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-purple-600/20 transition-colors ${
                    language === langItem.code ? 'text-cyan-400 font-bold bg-white/5' : 'text-gray-300'
                  }`}
                >
                  <span>{langItem.nativeName}</span>
                  <span className="text-xs text-gray-500 uppercase">{langItem.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User state / Quick Auth CTA */}
        {user ? (
          <button
            onClick={() => onNavigate('profile')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              currentPage === 'profile'
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-xs font-semibold">{user.username}</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate('login')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              {t('nav_login')}
            </button>
            <button
              onClick={() => onNavigate('signup')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/30 transition-all hover:scale-[1.02]"
            >
              {t('nav_signup')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
