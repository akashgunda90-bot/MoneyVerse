import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, FinancialSummary } from '../types';
import { apiRequest, getAuthToken, setAuthToken, clearAuthToken } from '../services/api';
import { useLanguage } from './LanguageContext';

interface AuthContextType {
  user: User | null;
  summary: FinancialSummary | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSummary: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { setLanguage } = useLanguage();

  const refreshUser = async () => {
    try {
      const userData = await apiRequest<User>('/auth/me');
      setUser(userData);
      if (userData.preferred_language) {
        setLanguage(userData.preferred_language);
      }
    } catch {
      clearAuthToken();
      setUser(null);
      setSummary(null);
    }
  };

  const refreshSummary = async () => {
    if (!getAuthToken()) return;
    try {
      const summaryData = await apiRequest<FinancialSummary>('/financial/summary');
      setSummary(summaryData);
    } catch {
      // Handled silently
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        await refreshUser();
        await refreshSummary();
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = (token: string, userData: User) => {
    setAuthToken(token);
    setUser(userData);
    if (userData.preferred_language) {
      setLanguage(userData.preferred_language);
    }
    refreshSummary();
  };

  const logout = async () => {
    try {
      if (getAuthToken()) {
        await apiRequest('/auth/logout', { method: 'POST' });
      }
    } catch {
      // Ignore
    } finally {
      clearAuthToken();
      setUser(null);
      setSummary(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        summary,
        loading,
        login,
        logout,
        refreshUser,
        refreshSummary,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
