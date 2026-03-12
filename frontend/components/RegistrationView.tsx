import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { registerUser, loginUser, fetchUserProfile, checkOnboardingStatus } from '../services/api';
import { Check } from 'lucide-react';

interface RegistrationViewProps {
  onNavigateToLogin: () => void;
  onRegistrationSuccess: (userId: number, hasCompletedOnboarding: boolean) => void;
  onGoogleLogin?: () => void;
}

const GLASS_ACCENT = 'rgba(255, 106, 42, 0.35)';
const GLASS_ACCENT_BORDER = 'rgba(255, 106, 42, 0.5)';

export const RegistrationView = ({ onNavigateToLogin, onRegistrationSuccess, onGoogleLogin }: RegistrationViewProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'username' | 'password' | 'repeat' | null>(null);

  const handleSubmit = async () => {
    if (!username || !password || !repeatPassword) {
      alert('Пожалуйста, заполните все поля');
      return;
    }
    if (password !== repeatPassword) {
      alert('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      await registerUser({ username, password, email: `${username}@aura.local` });
      try {
        await loginUser({ username, password });
        const user = await fetchUserProfile();
        const hasCompletedOnboarding = await checkOnboardingStatus(user.id);
        onRegistrationSuccess(user.id, hasCompletedOnboarding);
      } catch (loginError) {
        console.error('Auto-login failed:', loginError);
        onNavigateToLogin();
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при регистрации';
      alert(`Ошибка при регистрации: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: 'username' | 'password' | 'repeat') => ({
    background: 'rgba(255, 255, 255, 0.06)',
    border: `1px solid ${focusedField === field ? GLASS_ACCENT_BORDER : 'rgba(255, 255, 255, 0.12)'}`,
    boxShadow: focusedField === field ? `0 0 20px ${GLASS_ACCENT}` : '0 0 0 1px rgba(255,255,255,0.04) inset',
  });

  return (
    <div
      data-view="register-liquid-glass"
      className="login-view-liquid-glass fixed inset-0 flex flex-col items-center justify-center px-4 py-8 font-sans overflow-auto"
      style={{
        background: 'linear-gradient(165deg, #1f1f1f 0%, #2e2e2e 50%, #262626 100%)',
        boxSizing: 'border-box',
        zIndex: 1000,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(255, 106, 42, 0.12) 0%, transparent 55%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.03) 0%, transparent 25%), radial-gradient(circle at 80% 70%, rgba(255,106,42,0.04) 0%, transparent 25%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ filter: 'drop-shadow(0 0 40px rgba(255, 106, 42, 0.08))' }}
      >
        <div
          className="relative rounded-[30px] p-8 sm:p-10 overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: `
              0 0 0 1px rgba(255, 255, 255, 0.06) inset,
              0 0 24px rgba(255, 106, 42, 0.12),
              0 20px 50px rgba(0, 0, 0, 0.35)
            `,
          }}
        >
          <div
            className="absolute inset-0 rounded-[30px] pointer-events-none"
            aria-hidden
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.03) 100%)',
            }}
          />

          <div className="relative flex flex-col items-center">
            <h1
              className="text-[48px] sm:text-[56px] font-black tracking-tighter leading-none select-none mb-2"
              style={{
                background: 'linear-gradient(135deg, #8a7dff 0%, #5fa7ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 0 20px rgba(138, 125, 255, 0.4))',
                opacity: 0.95,
              }}
            >
              Aura
            </h1>
            <h2 className="text-xl sm:text-2xl font-bold text-white/90 mb-8" style={{ marginTop: 24 }}>
              Регистрация
            </h2>

            {onGoogleLogin && (
              <>
                <button
                  type="button"
                  onClick={onGoogleLogin}
                  className="w-full rounded-[20px] py-4 flex items-center justify-center gap-3 mb-6 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Зарегистрироваться через Google
                </button>
                <div className="flex items-center gap-4 w-full mb-6">
                  <div className="flex-1 h-px bg-white/15" />
                  <span className="text-white/45 text-sm font-medium">или</span>
                  <div className="flex-1 h-px bg-white/15" />
                </div>
              </>
            )}

            <div className="w-full space-y-4">
              <input
                type="text"
                placeholder="Логин"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                className="w-full rounded-[20px] px-5 py-4 text-white placeholder-white/40 text-base font-medium transition-all duration-200 outline-none"
                style={inputStyle('username')}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="w-full rounded-[20px] px-5 py-4 text-white placeholder-white/40 text-base font-medium transition-all duration-200 outline-none"
                style={inputStyle('password')}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Повторите пароль"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                onFocus={() => setFocusedField('repeat')}
                onBlur={() => setFocusedField(null)}
                className="w-full rounded-[20px] px-5 py-4 text-white placeholder-white/40 text-base font-medium transition-all duration-200 outline-none"
                style={inputStyle('repeat')}
              />
            </div>

            <label className="flex items-center gap-3 w-full mt-4 mb-6 cursor-pointer select-none group">
              <div
                className="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0"
                style={{
                  background: showPassword ? 'rgba(255, 106, 42, 0.9)' : 'rgba(255, 255, 255, 0.06)',
                  borderColor: showPassword ? '#ff6a2a' : 'rgba(255, 255, 255, 0.2)',
                }}
              >
                {showPassword && <Check size={14} className="text-white" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <span className="text-white/70 text-sm font-medium group-hover:text-white/90 transition-colors">
                Показать пароль
              </span>
            </label>

            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-full py-4 sm:py-5 text-base sm:text-lg font-bold text-white disabled:opacity-70 relative overflow-hidden hover:shadow-[0_12px_40px_rgba(255,106,42,0.5)] transition-shadow duration-200"
              style={{
                background: 'linear-gradient(135deg, #ff6a2a 0%, #ff8a3c 100%)',
                boxShadow: '0 8px 30px rgba(255, 106, 42, 0.45), 0 0 0 1px rgba(255,255,255,0.15) inset',
              }}
              whileHover={!loading ? { scale: 1.02 } : undefined}
              whileTap={!loading ? { scale: 0.98 } : undefined}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className="relative z-10">
                {loading ? 'Создаем аккаунт...' : 'Зарегистрироваться'}
              </span>
              <div
                className="absolute inset-0 pointer-events-none rounded-full"
                aria-hidden
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
                }}
              />
            </motion.button>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-sm sm:text-base font-medium text-white/85 hover:text-white transition-colors duration-200 hover:underline underline-offset-2 decoration-white/60"
              >
                Уже с нами?{' '}
                <span
                  className="font-bold"
                  style={{ color: '#ff8a3c', textShadow: '0 0 20px rgba(255, 106, 42, 0.4)' }}
                >
                  Вход
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
