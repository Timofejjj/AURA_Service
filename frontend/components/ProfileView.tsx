import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, LogOut, Settings, X } from 'lucide-react';
import { ReaderSettingsSheet } from './ReaderSettingsSheet';

interface ProfileViewProps {
  userId: number;
  userName?: string;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ userId, userName, onLogout }) => {
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showReaderSettings, setShowReaderSettings] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = cardRef.current;
    if (el && (window as unknown as { LiquidGlassCard?: { attach: (n: HTMLElement) => void } }).LiquidGlassCard) {
      (window as unknown as { LiquidGlassCard: { attach: (n: HTMLElement) => void } }).LiquidGlassCard.attach(el);
      return () => (window as unknown as { LiquidGlassCard?: { detach: (n: HTMLElement) => void } }).LiquidGlassCard?.detach(el);
    }
  }, []);

  const handleSupport = () => {
    setShowSupportModal(true);
  };

  const handleLogout = () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      onLogout();
    }
  };

  return (
    <>
      <div className="min-h-screen bg-white pb-32 transition-colors duration-300 reader-surface">
        <div className="max-w-[720px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-24 pt-16">
          {/* Header */}
          <div className="mb-12">
            <div>
              <h1 className="text-5xl lg:text-6xl font-black text-black transition-colors duration-300">
              Профиль
              </h1>
              {userName != null && userName !== '' && (
                <p className="mt-3 text-xl lg:text-2xl text-gray-600 transition-colors duration-300">
                  {userName}
                </p>
              )}
            </div>
          </div>

          {/* Options List — Liquid Glass card (same layout: Support row, divider, Logout row) */}
          <div ref={cardRef} className="lg-card space-y-0 overflow-hidden transition-colors duration-300">
            {/* Reader Settings Option */}
            <button
              onClick={() => setShowReaderSettings(true)}
              className="w-full flex items-center justify-between px-6 lg:px-8 py-6 lg:py-7 border-b border-gray-100 hover:bg-gray-50 transition-all duration-300 hover:pl-8 lg:hover:pl-10"
            >
              <span className="text-xl lg:text-2xl font-medium text-black transition-colors duration-300">
                Настройки чтения
              </span>
              <Settings className="text-gray-400 transition-colors" size={24} />
            </button>

            {/* Support Option */}
            <button
              onClick={handleSupport}
              className="w-full flex items-center justify-between px-6 lg:px-8 py-6 lg:py-7 border-b border-gray-100 hover:bg-gray-50 transition-all duration-300 hover:pl-8 lg:hover:pl-10"
            >
              <span className="text-xl lg:text-2xl font-medium text-black transition-colors duration-300">Поддержка</span>
              <HelpCircle className="text-gray-400 transition-colors" size={24} />
            </button>

            {/* Logout Option */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-6 lg:px-8 py-6 lg:py-7 hover:bg-red-50 transition-all duration-300 hover:pl-8 lg:hover:pl-10"
            >
              <span className="text-xl lg:text-2xl font-medium text-red-600 transition-colors duration-300">Выйти</span>
              <LogOut className="text-red-600 transition-colors" size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Support Modal */}
      {showSupportModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 transition-colors duration-300"
          onClick={() => setShowSupportModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-8 lg:p-10 relative transition-colors duration-300 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowSupportModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-all hover:scale-110"
            >
              <X size={28} />
            </button>

            {/* Content */}
            <h2 className="text-4xl lg:text-5xl font-black text-black mb-8 pr-12 transition-colors duration-300">
              Поддержка
            </h2>
            
            <p className="text-lg lg:text-xl text-black mb-6 leading-relaxed transition-colors duration-300">
              Прямая связь с командой Aura:
            </p>
            
            <p className="text-lg lg:text-xl text-black mb-3 transition-colors duration-300">
              Telegram(CEO):
            </p>
            <a
              href="https://t.me/TimofeyRadkevich"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg lg:text-xl text-blue-600 hover:text-blue-800 underline transition-colors inline-block cursor-pointer font-medium"
            >
              @TimofeyRadkevich
            </a>
          </div>
        </div>
      )}

      <ReaderSettingsSheet userId={userId} isOpen={showReaderSettings} onClose={() => setShowReaderSettings(false)} />

    </>
  );
};
