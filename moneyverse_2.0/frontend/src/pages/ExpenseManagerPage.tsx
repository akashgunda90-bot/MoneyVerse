import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Expense, Income } from '../types';
import {
  ReceiptIndianRupee,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  TrendingDown,
  TrendingUp,
  Calendar,
  CreditCard,
  DollarSign
} from 'lucide-react';

const CATEGORIES = [
  'Food',
  'Travel',
  'Rent',
  'Utilities',
  'Entertainment',
  'Health',
  'Shopping',
  'Education',
  'Other'
];

export const ExpenseManagerPage: React.FC = () => {
  const { t } = useLanguage();
  const { refreshSummary } = useAuth();

  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Expense modal
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Food');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expPaymentMethod, setExpPaymentMethod] = useState('UPI');
  const [expNotes, setExpNotes] = useState('');

  // Income modal
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [incAmount, setIncAmount] = useState('');
  const [incSource, setIncSource] = useState('Salary');
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0]);
  const [incNotes, setIncNotes] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const expData = await apiRequest<Expense[]>('/expenses');
      setExpenses(expData);
      const incData = await apiRequest<Income[]>('/incomes');
      setIncomes(incData);
    } catch {
      // Soft fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = selectedCategory === 'All' || e.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.payment_method.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const openAddExpense = () => {
    setEditingExpense(null);
    setExpAmount('');
    setExpCategory('Food');
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpPaymentMethod('UPI');
    setExpNotes('');
    setExpenseModalOpen(true);
  };

  const openEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpAmount(exp.amount.toString());
    setExpCategory(exp.category);
    setExpDate(exp.date);
    setExpPaymentMethod(exp.payment_method);
    setExpNotes(exp.notes || '');
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || parseFloat(expAmount) <= 0) return;

    const payload = {
      amount: parseFloat(expAmount),
      category: expCategory,
      date: expDate,
      payment_method: expPaymentMethod,
      notes: expNotes.trim(),
    };

    try {
      if (editingExpense) {
        await apiRequest(`/expenses/${editingExpense.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/expenses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setExpenseModalOpen(false);
      await fetchRecords();
      await refreshSummary();
    } catch {
      // handle error
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await apiRequest(`/expenses/${id}`, { method: 'DELETE' });
      await fetchRecords();
      await refreshSummary();
    } catch {
      // ignore
    }
  };

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incAmount || parseFloat(incAmount) <= 0 || !incSource.trim()) return;

    try {
      await apiRequest('/incomes', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(incAmount),
          source: incSource.trim(),
          date: incDate,
          notes: incNotes.trim(),
        }),
      });
      setIncomeModalOpen(false);
      await fetchRecords();
      await refreshSummary();
    } catch {
      // ignore
    }
  };

  const handleDeleteIncome = async (id: number) => {
    if (!window.confirm('Delete this income record?')) return;
    try {
      await apiRequest(`/incomes/${id}`, { method: 'DELETE' });
      await fetchRecords();
      await refreshSummary();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-2">
            <ReceiptIndianRupee className="w-6 h-6 text-cyan-400" />
            <span>{t('expenses_title')}</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{t('expenses_subtitle')}</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIncomeModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 flex items-center space-x-1.5 transition-all"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{t('expenses_add_income')}</span>
          </button>
          <button
            onClick={openAddExpense}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/30 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('expenses_add_expense')}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'expenses'
              ? 'bg-purple-600/30 text-cyan-300 border border-purple-500/40'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'income'
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Income Logs ({incomes.length})
        </button>
      </div>

      {activeTab === 'expenses' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-3.5 rounded-2xl border border-white/10">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('action_search')}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl glass-input text-xs font-medium"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl glass-input text-xs font-medium bg-[#0f172a]"
              >
                <option value="All">{t('expenses_all_categories')}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`cat_${c}`)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">{t('expenses_table_date')}</th>
                    <th className="py-3 px-4">{t('expenses_table_category')}</th>
                    <th className="py-3 px-4">{t('expenses_table_method')}</th>
                    <th className="py-3 px-4">{t('expenses_table_amount')}</th>
                    <th className="py-3 px-4">{t('expenses_table_notes')}</th>
                    <th className="py-3 px-4 text-right">{t('expenses_table_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-200">
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-400">{exp.date}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white">
                            {t(`cat_${exp.category}`) !== `cat_${exp.category}` ? t(`cat_${exp.category}`) : exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-gray-300 font-mono">
                            {exp.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-rose-400">
                          -₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-gray-400 max-w-xs truncate">
                          {exp.notes || '—'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => openEditExpense(exp)}
                            className="p-1 rounded text-gray-400 hover:text-white"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 rounded text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 text-xs">
                        {t('dash_no_transactions')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Income logs table */
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">{t('expenses_table_date')}</th>
                  <th className="py-3 px-4">{t('expenses_income_source')}</th>
                  <th className="py-3 px-4">{t('expenses_table_amount')}</th>
                  <th className="py-3 px-4">{t('expenses_table_notes')}</th>
                  <th className="py-3 px-4 text-right">{t('expenses_table_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {incomes.length > 0 ? (
                  incomes.map((inc) => (
                    <tr key={inc.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-400">{inc.date}</td>
                      <td className="py-3 px-4 font-semibold text-white">{inc.source}</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        +₹{inc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-gray-400">{inc.notes || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteIncome(inc.id)}
                          className="p-1 rounded text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 text-xs">
                      No income records logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-white/15 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">
              {editingExpense ? t('action_edit') : t('expenses_add_expense')}
            </h2>
            <form onSubmit={handleSaveExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t('expenses_table_amount')} *
                </label>
                <input
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="e.g. 500"
                  min="0.01"
                  step="any"
                  required
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t('expenses_table_category')}
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium bg-[#0f172a]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{t(`cat_${c}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t('expenses_table_method')}
                  </label>
                  <select
                    value={expPaymentMethod}
                    onChange={(e) => setExpPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium bg-[#0f172a]"
                  >
                    {['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t('expenses_table_date')}
                </label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium bg-[#0f172a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t('expenses_table_notes')}
                </label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="e.g. Dinner with colleagues"
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
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

      {/* Income Modal */}
      {incomeModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-white/15 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">{t('expenses_add_income')}</h2>
            <form onSubmit={handleSaveIncome} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t('expenses_table_amount')} *
                </label>
                <input
                  type="number"
                  value={incAmount}
                  onChange={(e) => setIncAmount(e.target.value)}
                  placeholder="e.g. 25000"
                  min="1"
                  required
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t('expenses_income_source')} *
                </label>
                <input
                  type="text"
                  value={incSource}
                  onChange={(e) => setIncSource(e.target.value)}
                  placeholder={t('expenses_income_source_placeholder')}
                  required
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t('expenses_table_date')}
                </label>
                <input
                  type="date"
                  value={incDate}
                  onChange={(e) => setIncDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium bg-[#0f172a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t('expenses_table_notes')}
                </label>
                <input
                  type="text"
                  value={incNotes}
                  onChange={(e) => setIncNotes(e.target.value)}
                  placeholder="e.g. Monthly salary from company"
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIncomeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10"
                >
                  {t('action_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30"
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
