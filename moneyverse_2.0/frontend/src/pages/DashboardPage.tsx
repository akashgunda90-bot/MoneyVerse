import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Calendar,
  Layers,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const COLORS = ['#8B5CF6', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user, summary, refreshSummary } = useAuth();

  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    refreshSummary();
  }, []);

  const handleGenerateInsights = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await apiRequest<{ success: boolean; insights: string; error?: string }>('/ai/insights', {
        method: 'POST',
      });
      if (res.success) {
        setAiInsights(res.insights);
      } else {
        setAiError(res.error || t('status_ai_offline'));
      }
    } catch (err: any) {
      setAiError(err.message || t('status_ai_offline'));
    } finally {
      setAiLoading(false);
    }
  };

  const income = summary?.monthly_income ?? 0;
  const expenses = summary?.total_expenses ?? 0;
  const balance = summary?.available_balance ?? 0;
  const spentPct = summary?.income_spent_percentage ?? 0;
  const highestCat = summary?.highest_expense_category;
  const categoryData = (summary?.category_breakdown || []).map((c) => ({
    name: t(`cat_${c.category}`) !== `cat_${c.category}` ? t(`cat_${c.category}`) : c.category,
    amount: c.amount,
    percentage: c.percentage,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">{t('dash_title')}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{t('dash_subtitle')}</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => refreshSummary()}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('expenses')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/30 flex items-center space-x-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('expenses_add_expense')}</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">{t('dash_stat_income')}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ₹{income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1 font-medium">
            <ArrowUpRight className="w-3 h-3" />
            <span>Primary monthly cashflow</span>
          </p>
        </div>

        {/* Expenses Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">{t('dash_stat_expenses')}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ₹{expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {highestCat ? (
              <span>Top: <strong className="text-purple-300">{highestCat}</strong></span>
            ) : (
              <span>No expenses yet</span>
            )}
          </p>
        </div>

        {/* Available Balance */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">{t('dash_stat_balance')}</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 ${balance >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
            ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {balance >= 0 ? 'Net surplus available' : 'Warning: Deficit state'}
          </p>
        </div>

        {/* Income Spent % */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">{t('dash_stat_savings_rate')}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${spentPct > 70 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
              <PieIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{spentPct.toFixed(1)}%</p>
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${spentPct > 80 ? 'bg-rose-500' : spentPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, spentPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* AI Financial Advisor Card (Real Ollama backend) */}
      <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 via-black/40 to-transparent relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-600/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{t('dash_ai_advisor_title')}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  qwen2.5:3b
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('dash_ai_advisor_subtitle')}</p>
            </div>
          </div>

          <button
            onClick={handleGenerateInsights}
            disabled={aiLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 shadow-md shadow-purple-600/30 transition-all flex items-center space-x-2 disabled:opacity-50 flex-shrink-0"
          >
            {aiLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{t('status_ai_thinking')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('action_generate_insights')}</span>
              </>
            )}
          </button>
        </div>

        {/* AI Result or Placeholder */}
        <div className="mt-4">
          {aiError ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold">{t('status_ai_offline')}</p>
                <p className="text-[11px] text-gray-300 mt-1">{aiError}</p>
                <p className="text-[10px] text-gray-400 mt-2">
                  Tip: Ensure the local Ollama service is running using <code className="bg-black/50 px-1 py-0.5 rounded">ollama serve</code> with <code className="bg-black/50 px-1 py-0.5 rounded">qwen2.5:3b</code> installed.
                </p>
              </div>
            </div>
          ) : aiInsights ? (
            <div className="p-4 rounded-xl bg-white/5 border border-purple-500/20 text-xs leading-relaxed text-gray-200 whitespace-pre-line font-normal">
              {aiInsights}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-gray-400">
              <p>{t('dash_ai_placeholder')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Visual Charts: Recharts Category Breakdown & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
            <PieIcon className="w-4 h-4 text-purple-400" />
            <span>{t('dash_category_distribution')}</span>
          </h3>

          {categoryData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#2E384D', borderRadius: '10px', fontSize: '11px' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {categoryData.slice(0, 5).map((c, i) => (
                  <div key={c.name} className="flex items-center space-x-1.5 text-[10px] text-gray-300">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span>{c.name} ({c.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-gray-500">
              {t('dash_no_transactions')}
            </div>
          )}
        </div>

        {/* Recent Transactions List */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>{t('dash_recent_transactions')}</span>
              </h3>
              <button
                onClick={() => onNavigate('expenses')}
                className="text-xs text-cyan-400 hover:underline font-semibold"
              >
                {t('action_view_all')}
              </button>
            </div>

            {summary && summary.recent_transactions.length > 0 ? (
              <div className="space-y-2.5">
                {summary.recent_transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-bold">
                        {txn.category.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{txn.category}</p>
                        <p className="text-[10px] text-gray-400">{txn.date} • {txn.payment_method}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-rose-400">
                      -₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-gray-500">
                {t('dash_no_transactions')}
              </div>
            )}
          </div>

          {/* Quick link to Money Mirror */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-gray-400">Planning a new purchase?</span>
            <button
              onClick={() => onNavigate('mirror')}
              className="text-purple-400 font-bold hover:underline"
            >
              Open Money Mirror →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
