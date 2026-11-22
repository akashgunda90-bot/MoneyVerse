import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Goal } from '../types';
import {
  Milestone,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Calendar,
  IndianRupee,
  TrendingUp,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const GoalBridgePage: React.FC = () => {
  const { t } = useLanguage();
  const { refreshSummary } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('Savings');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Goal[]>('/goals');
      setGoals(data);
    } catch {
      // Soft fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const openAddModal = () => {
    setEditingGoal(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setMonthlyContribution('2000');
    setTargetDate('');
    setCategory('Savings');
    setNotes('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.target_amount.toString());
    setCurrentAmount(goal.current_amount.toString());
    setMonthlyContribution(goal.monthly_contribution.toString());
    setTargetDate(goal.target_date || '');
    setCategory(goal.category);
    setNotes(goal.notes || '');
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount || parseFloat(targetAmount) <= 0) {
      setError('Please provide a valid goal name and target amount');
      return;
    }

    const payload = {
      name: name.trim(),
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount) || 0.0,
      monthly_contribution: parseFloat(monthlyContribution) || 0.0,
      target_date: targetDate,
      category,
      notes: notes.trim(),
    };

    try {
      if (editingGoal) {
        await apiRequest(`/goals/${editingGoal.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/goals', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      await fetchGoals();
      await refreshSummary();
    } catch (err: any) {
      setError(err.message || t('msg_error'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await apiRequest(`/goals/${id}`, { method: 'DELETE' });
      await fetchGoals();
      await refreshSummary();
    } catch {
      // Error
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-2">
            <Milestone className="w-6 h-6 text-purple-400" />
            <span>{t('goals_title')}</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{t('goals_subtitle')}</p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/30 flex items-center space-x-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('goals_add_btn')}</span>
        </button>
      </div>

      {/* Goals Grid */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                goal.is_completed
                  ? 'border-emerald-500/40 bg-emerald-950/20'
                  : 'border-white/10 hover:border-purple-500/30'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-gray-400 uppercase">
                      {goal.category}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5">{goal.name}</h3>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(goal)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title={t('action_edit')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                      title={t('action_delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Percent */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">{t('goals_progress')}</span>
                    <span className="font-bold text-cyan-400">{goal.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goal.is_completed
                          ? 'bg-emerald-400 shadow-md shadow-emerald-400/50'
                          : 'bg-gradient-to-r from-purple-500 to-cyan-400'
                      }`}
                      style={{ width: `${Math.min(100, goal.progress_percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Amounts Breakdown */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5">
                    <span className="text-[10px] text-gray-400">{t('goals_current')}</span>
                    <p className="font-bold text-white mt-0.5">
                      ₹{goal.current_amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5">
                    <span className="text-[10px] text-gray-400">{t('goals_target')}</span>
                    <p className="font-bold text-white mt-0.5">
                      ₹{goal.target_amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Remaining & Monthly Contribution */}
                <div className="mt-3 space-y-1.5 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>{t('goals_remaining')}:</span>
                    <span className="font-semibold text-rose-300">
                      ₹{goal.remaining_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('goals_monthly')}:</span>
                    <span className="font-semibold text-gray-300">
                      ₹{goal.monthly_contribution.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Completion status */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                {goal.is_completed ? (
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('goals_completed')}</span>
                  </span>
                ) : (
                  <span className="text-gray-400 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>
                      {goal.estimated_months_remaining !== null
                        ? `~${goal.estimated_months_remaining} ${t('goals_months')}`
                        : 'Contribution not set'}
                    </span>
                  </span>
                )}
                {goal.target_date && (
                  <span className="text-[10px] text-gray-500 font-mono">By {goal.target_date}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center">
          <Milestone className="w-12 h-12 text-purple-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-white">{t('goals_no_goals')}</h3>
          <button
            onClick={openAddModal}
            className="mt-4 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-500 transition-colors inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t('goals_add_btn')}</span>
          </button>
        </div>
      )}

      {/* Goal Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-white/15 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">
              {editingGoal ? t('action_edit') : t('goals_add_btn')}
            </h2>

            {error && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t('goals_name')} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Emergency Fund, Laptop, Vacation"
                  required
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t('goals_target')} *
                  </label>
                  <input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="50000"
                    min="1"
                    required
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t('goals_current')}
                  </label>
                  <input
                    type="number"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t('goals_monthly')}
                  </label>
                  <input
                    type="number"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    placeholder="2000"
                    min="0"
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t('goals_target_date')}
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium bg-[#0f172a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium bg-[#0f172a]"
                >
                  {['Savings', 'Emergency Fund', 'Gadgets', 'Travel', 'Real Estate', 'Education', 'Vehicle'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10"
                >
                  {t('action_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/30"
                >
                  {t('action_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
