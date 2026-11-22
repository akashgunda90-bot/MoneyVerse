import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { MirrorSimulationResponse } from '../types';
import {
  SplitSquareVertical,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Wallet,
  IndianRupee,
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const MoneyMirrorPage: React.FC = () => {
  const { t } = useLanguage();
  const { summary } = useAuth();

  const [itemName, setItemName] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [category, setCategory] = useState('Shopping');
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState<MirrorSimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<MirrorSimulationResponse>('/ai/simulate-purchase', {
        method: 'POST',
        body: JSON.stringify({
          item_name: itemName.trim(),
          purchase_amount: parseFloat(purchaseAmount),
          category,
        }),
      });
      setSimulation(data);
    } catch (err: any) {
      setError(err.message || t('msg_error'));
    } finally {
      setLoading(false);
    }
  };

  const getVerdictBadge = (verdict: string) => {
    if (verdict.includes('SAFE')) {
      return {
        bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        icon: CheckCircle2,
        text: t('mirror_safe'),
      };
    } else if (verdict.includes('WAIT')) {
      return {
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        icon: Clock,
        text: t('mirror_wait'),
      };
    } else {
      return {
        bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        icon: XCircle,
        text: t('mirror_avoid'),
      };
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center space-x-2">
          <SplitSquareVertical className="w-6 h-6 text-cyan-400" />
          <span>{t('mirror_title')}</span>
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">{t('mirror_subtitle')}</p>
      </div>

      {/* Simulator Input Form */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-xl">
        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Item Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('mirror_input_item')} *
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder={t('mirror_input_placeholder')}
                required
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium"
              />
            </div>

            {/* Purchase Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t('mirror_input_amount')} *
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  min="1"
                  step="any"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl glass-input text-xs font-medium"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="w-full sm:w-auto flex items-center space-x-2">
              <label className="text-xs text-gray-400">{t('mirror_input_category')}:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-1.5 rounded-lg glass-input text-xs font-medium bg-[#0f172a]"
              >
                {['Shopping', 'Entertainment', 'Travel', 'Food', 'Health', 'Education', 'Other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>{t('status_ai_thinking')}</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('action_simulate')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error message if any */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Simulation Result Presentation */}
      {simulation && (
        <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 space-y-6 animate-fadeIn">
          {/* Header Verdict & Risk Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                {t('mirror_ai_verdict')}
              </span>
              <div className="flex items-center space-x-2 mt-1">
                {(() => {
                  const badge = getVerdictBadge(simulation.ai_verdict);
                  const Icon = badge.icon;
                  return (
                    <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black border ${badge.bg}`}>
                      <Icon className="w-4 h-4" />
                      <span>{badge.text}</span>
                    </span>
                  );
                })()}
                <span className="text-xs text-gray-300 font-semibold">
                  for <strong className="text-white">"{simulation.item_name}"</strong> (₹{simulation.purchase_amount.toLocaleString('en-IN')})
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-400">{t('mirror_risk_level')}:</span>
              <span className={`font-bold px-2.5 py-0.5 rounded-full ${
                simulation.risk_level === 'Low'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : simulation.risk_level === 'Moderate'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}>
                {simulation.risk_level} Risk
              </span>
            </div>
          </div>

          {/* Mathematical Projection Telemetry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[11px] text-gray-400">{t('mirror_current_balance')}</span>
              <p className="text-lg font-black text-white mt-1">
                ₹{simulation.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[11px] text-gray-400">{t('mirror_projected_balance')}</span>
              <p className={`text-lg font-black mt-1 ${simulation.projected_balance >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                ₹{simulation.projected_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[11px] text-gray-400">{t('mirror_current_spent')}</span>
              <p className="text-lg font-black text-white mt-1">
                {simulation.current_spent_percentage.toFixed(1)}%
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[11px] text-gray-400">{t('mirror_projected_spent')}</span>
              <p className={`text-lg font-black mt-1 ${simulation.projected_spent_percentage > 75 ? 'text-rose-400' : 'text-amber-400'}`}>
                {simulation.projected_spent_percentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Impact on Savings Goals */}
          <div className="p-4 rounded-xl bg-indigo-900/20 border border-indigo-500/30 text-xs">
            <span className="font-bold text-indigo-300 flex items-center space-x-1.5 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>{t('mirror_goal_impact')}</span>
            </span>
            <p className="text-gray-300">{simulation.impact_on_goals}</p>
          </div>

          {/* AI Comprehensive Reasoning */}
          <div>
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{t('mirror_ai_explanation')}</span>
            </h3>
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-200 leading-relaxed whitespace-pre-line">
              {simulation.ai_explanation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
