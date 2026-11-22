import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Mic,
  SplitSquareVertical,
  Milestone,
  CheckCircle,
  ArrowRight,
  Globe2,
  Lock
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();

  return (
    <div className="relative min-h-[calc(100vh-65px)] overflow-hidden flex flex-col justify-between">
      {/* Background Glow Spheres */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-600/20 to-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 text-center z-10">
        {/* Top Tag & Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-6 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('landing_badge')}</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
          <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            {t('landing_hero_title')}
          </span>
        </h1>

        {/* Tagline */}
        <p className="mt-4 text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          {t('tagline')}
        </p>

        {/* Hero Description */}
        <p className="mt-6 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
          {t('landing_hero_desc')}
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onNavigate(user ? 'dashboard' : 'signup')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 shadow-lg shadow-purple-600/30 hover:shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2 group"
          >
            <span>{user ? t('nav_dashboard') : t('landing_cta_primary')}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          {!user && (
            <button
              onClick={() => onNavigate('login')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 transition-all"
            >
              {t('landing_cta_secondary')}
            </button>
          )}
        </div>

        {/* Languages Pill Bar */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-gray-400 flex items-center space-x-1 mr-2">
            <Globe2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Available in:</span>
          </span>
          {[
            { code: 'en', name: 'English' },
            { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
            { code: 'hi', name: 'हिन्दी (Hindi)' },
            { code: 'ta', name: 'தமிழ் (Tamil)' },
            { code: 'te', name: 'తెలుగు (Telugu)' },
          ].map((item) => (
            <button
              key={item.code}
              onClick={() => setLanguage(item.code as any)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                language === item.code
                  ? 'bg-purple-600/30 border-purple-400 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 z-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1: Money Voice */}
          <div className="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/10 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-4">
              <Mic className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('landing_feat_voice_title')}</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{t('landing_feat_voice_desc')}</p>
          </div>

          {/* Feature 2: Money Mirror */}
          <div className="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/10 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-4">
              <SplitSquareVertical className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('landing_feat_mirror_title')}</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{t('landing_feat_mirror_desc')}</p>
          </div>

          {/* Feature 3: Goal Bridge */}
          <div className="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/10 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-4">
              <Milestone className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('landing_feat_bridge_title')}</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{t('landing_feat_bridge_desc')}</p>
          </div>

          {/* Feature 4: 100% Private & Free */}
          <div className="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/10 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('landing_feat_privacy_title')}</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{t('landing_feat_privacy_desc')}</p>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <footer className="w-full border-t border-white/5 py-6 px-4 text-center text-xs text-gray-500 z-10">
        <p>MONEYVERSE 2.0 • {t('tagline')}</p>
      </footer>
    </div>
  );
};
