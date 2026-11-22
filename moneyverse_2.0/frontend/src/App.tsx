import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { DashboardPage } from './pages/DashboardPage';
import { MoneyMirrorPage } from './pages/MoneyMirrorPage';
import { MoneyVoicePage } from './pages/MoneyVoicePage';
import { GoalBridgePage } from './pages/GoalBridgePage';
import { ExpenseManagerPage } from './pages/ExpenseManagerPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';

const getInitialPage = (): string => {
  const path = window.location.pathname.replace(/^\/+/, '').split('/')[0];
  const validPages = ['landing', 'login', 'signup', 'dashboard', 'mirror', 'voice', 'goals', 'expenses', 'reports', 'profile'];
  if (path && validPages.includes(path)) {
    return path;
  }
  return 'landing';
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>(getInitialPage);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync URL with browser history on popstate (back/forward buttons)
  React.useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getInitialPage());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // If loading session check, display sleek loading splash
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 animate-spin flex items-center justify-center shadow-xl shadow-purple-600/30">
          <div className="w-8 h-8 rounded-xl bg-[#070B14]" />
        </div>
        <p className="text-xs font-semibold text-purple-300 tracking-wider uppercase font-mono">
          Loading MONEYVERSE 2.0...
        </p>
      </div>
    );
  }

  // Navigate handler with route guarding and browser history sync
  const navigate = (page: string) => {
    // If trying to access protected pages without auth, redirect to login
    const protectedPages = ['dashboard', 'mirror', 'voice', 'goals', 'expenses', 'reports', 'profile'];
    let targetPage = page;
    if (!user && protectedPages.includes(page)) {
      targetPage = 'login';
    } else if (user && (page === 'landing' || page === 'login' || page === 'signup')) {
      targetPage = 'dashboard';
    }

    const url = targetPage === 'landing' ? '/' : `/${targetPage}`;
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url);
    }
    setCurrentPage(targetPage);
  };

  // Determine active view
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onNavigate={navigate} />;
      case 'login':
        return <LoginPage onNavigate={navigate} />;
      case 'signup':
        return <SignUpPage onNavigate={navigate} />;
      case 'dashboard':
        return <DashboardPage onNavigate={navigate} />;
      case 'mirror':
        return <MoneyMirrorPage />;
      case 'voice':
        return <MoneyVoicePage />;
      case 'goals':
        return <GoalBridgePage />;
      case 'expenses':
        return <ExpenseManagerPage />;
      case 'reports':
        return <ReportsPage />;
      case 'profile':
        return <ProfileSettingsPage onNavigate={navigate} />;
      default:
        return user ? <DashboardPage onNavigate={navigate} /> : <LandingPage onNavigate={navigate} />;
    }
  };

  const isProtectedLayout = !!user && currentPage !== 'landing' && currentPage !== 'login' && currentPage !== 'signup';

  return (
    <div className="min-h-screen bg-[#070B14] text-gray-100 flex flex-col selection:bg-purple-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={navigate}
        onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex">
        {isProtectedLayout && (
          <Sidebar
            currentPage={currentPage}
            onNavigate={navigate}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
        )}

        <main className={`flex-1 transition-all ${isProtectedLayout ? 'w-full lg:max-w-[calc(100vw-16rem)]' : 'w-full'}`}>
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
