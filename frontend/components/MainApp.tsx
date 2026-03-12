import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ReportDetails } from './ReportDetails';
import { ReportsView } from './ReportsView';
import { DailyJournalView } from './DailyJournalView';
import { JournalArchiveView } from './JournalArchiveView';
import { DayDetailView } from './DayDetailView';
import { RegistrationView } from './RegistrationView';
import { OnboardingView } from './OnboardingView';
import { LoadingScreen } from './LoadingScreen';
import { NavBar } from './NavBar';
import { ProfileView } from './ProfileView';
import { applyReaderSettingsToRoot, getDefaultReaderSettings, type ReaderSettings } from './ReaderSettingsSheet';
import { AuraPlusView } from './AuraPlusView';
import { LoginView } from './LoginView';
import { GoogleCallback } from './GoogleCallback';
import { ThoughtView } from './ThoughtView';
import { fetchUserProfile, loginUser, refreshAccessToken, isTokenExpiredOrExpiring } from '../services/api';
import { UserProfile, WeeklyReportMetadata, Thought } from '../types';

type AppView = 'loading' | 'register' | 'login' | 'onboarding' | 'app' | 'google_callback';

export const MainApp: React.FC = () => {
  // --- View State Management ---
  const [currentView, setCurrentView] = useState<AppView>('loading');
  const [showSplash, setShowSplash] = useState(true);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // User
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'reports' | 'allFolders' | 'profile'>('home');
  const [selectedReport, setSelectedReport] = useState<WeeklyReportMetadata | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [initialDayThoughts, setInitialDayThoughts] = useState<Thought[] | null>(null);
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  const [showAuraPlus, setShowAuraPlus] = useState(false);

  // Ensure reader surface class and saved theme are applied globally
  useEffect(() => {
    try {
      document.body.classList.add('reader-surface');
    } catch {}
  }, []);

  // Apply saved reader theme when user is loaded so Dark/Sepia show correctly before opening settings
  useEffect(() => {
    if (currentView !== 'app' || !user?.id) return;
    try {
      const raw = localStorage.getItem(`reader_settings_${user.id}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
        if (parsed.theme != null) {
          const full = { ...getDefaultReaderSettings(user.id), ...parsed, user_id: user.id };
          applyReaderSettingsToRoot(full);
        }
      }
    } catch {}
  }, [currentView, user?.id]);

  // --- Initial Splash and Token Check ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') && urlParams.has('state')) {
      setShowSplash(false);
      setCurrentView('google_callback');
      return;
    }

    const initSession = async () => {
      const token = localStorage.getItem('authToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!token && !refreshToken) {
        setShowSplash(false);
        setCurrentView('register');
        return;
      }

      let validToken = token;
      if (!token || isTokenExpiredOrExpiring(token)) {
        if (refreshToken) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            validToken = localStorage.getItem('authToken');
          } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            setShowSplash(false);
            setCurrentView('login');
            return;
          }
        } else {
          localStorage.removeItem('authToken');
          setShowSplash(false);
          setCurrentView('login');
          return;
        }
      }

      if (!validToken) {
        setShowSplash(false);
        setCurrentView('login');
        return;
      }

      setShowSplash(false);
      setCurrentView('app');
    };

    initSession();
  }, []);

  // Load user profile when entering app
  useEffect(() => {
    if (currentView !== 'app') return;
    if (user) { setUserLoading(false); return; }

    const loadUser = async () => {
      try {
        const profile = await fetchUserProfile();
        setUser(profile);
      } catch (error: any) {
        console.error('Failed to load user profile', error);
        if (error?.message?.includes('Unauthorized') || error?.message?.includes('401')) {
          setCurrentView('login');
          return;
        }
      } finally {
        setUserLoading(false);
      }
    };

    loadUser();
  }, [currentView, user]);

  // --- Auth Handlers ---
  const handleNavigateToLogin = () => setCurrentView('login');

  const handleLoginSubmit = async () => {
    if (!loginUsername || !loginPassword) {
      alert('Пожалуйста, введите логин и пароль');
      return;
    }
    setIsLoggingIn(true);
    try {
      await loginUser({ username: loginUsername, password: loginPassword });
      const profile = await fetchUserProfile();
      setUser(profile);
      setCurrentView('app');
      setLoginUsername('');
      setLoginPassword('');
    } catch (error) {
      console.error('Login failed', error);
      alert('Ошибка входа. Проверьте данные.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOnboardingFinish = () => setCurrentView('app');

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        await fetch(`${apiBaseUrl}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (_) { /* ignore */ }
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    setUser(null);
    setActiveTab('home');
    setSelectedReport(null);
    setSelectedThought(null);
    setCurrentView('login');
  };

  // --- Navigation ---
  const handleTabChange = (tab: 'home' | 'reports' | 'allFolders' | 'profile') => {
    // Если открыт конкретный день архива — не закрываем его повторным нажатием на "Записи".
    // Возврат к списку дней только через кнопку "Назад" внутри DayDetailView.
    if (selectedDay && tab === 'allFolders') {
      return;
    }
    if (tab === activeTab) {
      // Повторное нажатие на ту же вкладку — не закрываем экран дня/отчёта (чтобы не выкидывало при случайном тапе по навбару)
      window.scrollTo(0, 0);
      return;
    }
    setActiveTab(tab);
    setSelectedReport(null);
    setSelectedDay(null);
    setInitialDayThoughts(null);
    setShowAuraPlus(false);
    window.scrollTo(0, 0);
  };

  const handleBackFromReport = () => setSelectedReport(null);
  const handleAuraPlusClick = () => { setShowAuraPlus(true); window.scrollTo(0, 0); };
  const handleBackFromAuraPlus = () => setShowAuraPlus(false);

  const handleDayClick = (dateKey: string, thoughtsForDay?: Thought[]) => {
    setSelectedDay(dateKey);
    setInitialDayThoughts(thoughtsForDay ?? null);
    window.scrollTo(0, 0);
  };

  const handleBackFromDay = () => {
    setSelectedDay(null);
    setInitialDayThoughts(null);
  };

  const handleThoughtClick = (thought: Thought) => {
    setSelectedThought(thought);
    window.scrollTo(0, 0);
  };

  const handleBackFromThought = () => setSelectedThought(null);

  const handleRegistrationSuccess = async (_userId: number, _hasCompletedOnboarding: boolean) => {
    setCurrentView('login');
  };

  // --- Google OAuth ---
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isGoogleOAuthEnabled = googleClientId && googleClientId !== 'your-google-client-id.apps.googleusercontent.com';

  const handleGoogleLogin = isGoogleOAuthEnabled ? () => {
    const redirectUri = `${window.location.origin}/app.html`;
    const scope = 'openid email profile';
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(googleClientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${state}` +
      `&access_type=offline` +
      `&prompt=consent`;
    window.location.href = authUrl;
  } : undefined;

  // ===================== RENDERING =====================

  if (showSplash) return <LoadingScreen />;

  // Google OAuth callback
  if (currentView === 'google_callback') {
    return (
      <GoogleCallback
        onSuccess={async (_token: string, _userId: number) => {
          window.history.replaceState({}, document.title, window.location.pathname);
          try {
            const profile = await fetchUserProfile();
            setUser(profile);
            setCurrentView('app');
          } catch {
            setCurrentView('app');
          }
        }}
        onError={(_error: string) => {
          window.history.replaceState({}, document.title, window.location.pathname);
          setCurrentView('login');
        }}
      />
    );
  }

  if (currentView === 'register') {
    return (
      <RegistrationView
        onNavigateToLogin={handleNavigateToLogin}
        onRegistrationSuccess={handleRegistrationSuccess}
        onGoogleLogin={isGoogleOAuthEnabled ? handleGoogleLogin : undefined}
      />
    );
  }

  if (currentView === 'login') {
    return (
      <LoginView
        loginUsername={loginUsername}
        setLoginUsername={setLoginUsername}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        isLoggingIn={isLoggingIn}
        onLoginSubmit={handleLoginSubmit}
        onNavigateToRegister={() => setCurrentView('register')}
        onGoogleLogin={isGoogleOAuthEnabled ? handleGoogleLogin : undefined}
      />
    );
  }

  if (currentView === 'onboarding') {
    if (!user) return <LoadingScreen />;
    return <OnboardingView userId={user.id} onFinish={handleOnboardingFinish} />;
  }

  if (userLoading && currentView === 'app') return <LoadingScreen />;

  // --- In-app views ---

  const navBarProps = { activeTab, onTabChange: handleTabChange, onLogout: handleLogout };
  const renderNavBar = (extra?: { disableTabSwitch?: boolean }) =>
    createPortal(<NavBar {...navBarProps} {...extra} />, document.body);

  // Открытая мысль (с главного экрана или из экрана дня) — тапы по навбару не переключают
  if (selectedThought && user) {
    return (
      <>
        <div className="app-content-scroll">
          <ThoughtView
            thought={selectedThought}
            userId={user.id}
            onBack={handleBackFromThought}
          />
        </div>
        {renderNavBar({ disableTabSwitch: true })}
      </>
    );
  }

  // Day detail view (from archive click) — тапы по навбару не переключают экран
  if (selectedDay && user) {
    return (
      <>
        <div className="app-content-scroll">
          <DayDetailView userId={user.id} dateKey={selectedDay} initialThoughts={initialDayThoughts} onBack={handleBackFromDay} onThoughtClick={handleThoughtClick} />
        </div>
        {renderNavBar({ disableTabSwitch: true })}
      </>
    );
  }

  // Report details — тапы по навбару не переключают экран
  if (selectedReport) {
    return (
      <>
        <div className="app-content-scroll">
          <ReportDetails report={selectedReport} onBack={handleBackFromReport} />
        </div>
        {renderNavBar({ disableTabSwitch: true })}
      </>
    );
  }

  // Aura Plus
  if (showAuraPlus && activeTab === 'profile') {
    return (
      <>
        <div className="app-content-scroll">
          <AuraPlusView onBack={handleBackFromAuraPlus} />
        </div>
        {renderNavBar()}
      </>
    );
  }

  // Profile
  if (activeTab === 'profile' && user) {
    return (
      <>
        <div className="app-content-scroll">
          <ProfileView userId={user.id} userName={user.firstName} onLogout={handleLogout} />
        </div>
        {renderNavBar()}
      </>
    );
  }

  // Reports
  if (activeTab === 'reports' && user) {
    return (
      <>
        <div className="app-content-scroll">
          <ReportsView userId={user.id} />
        </div>
        {renderNavBar()}
      </>
    );
  }

  // Archive (replaces "allFolders")
  if (activeTab === 'allFolders' && user) {
    return (
      <>
        <div className="app-content-scroll">
          <JournalArchiveView userId={user.id} onDayClick={handleDayClick} />
        </div>
        {renderNavBar()}
      </>
    );
  }

  // ===== HOME — Daily Journal =====
  return (
    <>
      <div className="app-content-scroll">
        {user && <DailyJournalView userId={user.id} onThoughtClick={handleThoughtClick} />}
      </div>
      {renderNavBar()}
    </>
  );
};
