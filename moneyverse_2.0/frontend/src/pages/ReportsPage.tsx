import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAuthToken } from '../services/api';
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  FileSpreadsheet,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const { t } = useLanguage();
  const { summary } = useAuth();

  const handleDownloadCsv = () => {
    const token = getAuthToken();
    if (!token) return;

    fetch('/api/reports/export-csv', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moneyverse_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch((err) => alert('CSV Download failed: ' + err.message));
  };

  const comparisonData = [
    {
      name: 'Monthly Overview',
      Income: summary?.monthly_income || 0,
      Expenses: summary?.total_expenses || 0,
      Balance: Math.max(0, summary?.available_balance || 0),
    },
  ];

  const categoryBarData = (summary?.category_breakdown || []).map((c) => ({
    category: t(`cat_${c.category}`) !== `cat_${c.category}` ? t(`cat_${c.category}`) : c.category,
    amount: c.amount,
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            <span>{t('reports_title')}</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{t('reports_subtitle')}</p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-md shadow-cyan-600/30 flex items-center space-x-2 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>{t('action_export_csv')}</span>
        </button>
      </div>

      {/* CSV Export Helper Card */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Full Transaction Audit Ledger</p>
            <p className="text-[11px] text-gray-400">{t('reports_download_desc')}</p>
          </div>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="text-xs font-bold text-cyan-400 hover:underline"
        >
          Download .CSV
        </button>
      </div>

      {/* Income vs Expenses Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>{t('reports_inc_vs_exp')}</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252e42" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#2E384D', borderRadius: '10px', fontSize: '11px' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Income" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Expenses" fill="#EF4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Balance" fill="#06B6D4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
            <PieIcon className="w-4 h-4 text-cyan-400" />
            <span>{t('reports_spending_trends')}</span>
          </h3>

          {categoryBarData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#252e42" />
                  <XAxis type="number" stroke="#6b7280" fontSize={10} />
                  <YAxis type="category" dataKey="category" stroke="#6b7280" fontSize={10} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#2E384D', borderRadius: '10px', fontSize: '11px' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Total Spent']}
                  />
                  <Bar dataKey="amount" fill="#8B5CF6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-gray-500">
              No category expenditures to display yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
