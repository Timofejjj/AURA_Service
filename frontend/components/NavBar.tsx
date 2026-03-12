import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, BookOpen, User } from 'lucide-react';

/** По референсу: точка в центре, две стрелки (10 и 2 ч), дуговая стрелка справа сверху — история во времени */
function ClockHistoryIcon({ size = 22, strokeWidth = 2, className = '' }: { size?: number; strokeWidth?: number; className?: string }) {
  const s = size;
  const c = s / 2;
  const R = 7.2;
  const k = 3.2;
  const dotR = 1;
  const cos60 = 0.5;
  const sin60 = 0.866;
  const startX = c - R * 0.866;
  const startY = c + R * 0.5;
  const endX = c + R * 0.866;
  const endY = c + R * 0.5;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {/* Дуговая стрелка: нижний левый → вверх по часовой → нижний правый с наконечником */}
      <path d={`M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${R} ${R} 0 1 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`} />
      <path d={`M ${(endX - 1.2).toFixed(2)} ${(endY - 1.2).toFixed(2)} L ${(endX + 1.5).toFixed(2)} ${endY.toFixed(2)} L ${(endX - 1.2).toFixed(2)} ${(endY + 1.2).toFixed(2)}`} fill="none" strokeWidth={strokeWidth} />
      {/* Центр: заливка точка */}
      <circle cx={c} cy={c} r={dotR} fill="currentColor" stroke="none" />
      {/* Две стрелки: 10 ч и 2 ч */}
      <line x1={c} y1={c} x2={c - k * cos60} y2={c - k * sin60} strokeWidth={strokeWidth} />
      <line x1={c} y1={c} x2={c + k * cos60} y2={c - k * sin60} strokeWidth={strokeWidth} />
    </svg>
  );
}

const TABS = [
  { id: 'home' as const, icon: Home, title: 'Дневник' },
  { id: 'allFolders' as const, icon: ClockHistoryIcon, title: 'Записи' },
  { id: 'reports' as const, icon: BookOpen, title: 'Отчёты' },
  { id: 'profile' as const, icon: User, title: 'Профиль' },
];

const ICON_FLOAT_SPRING = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 22,
  mass: 0.9,
};

type TabId = 'home' | 'reports' | 'allFolders' | 'profile';

interface NavBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onLogout?: () => void;
  disableTabSwitch?: boolean;
}

const TAB_IDS: TabId[] = ['home', 'allFolders', 'reports', 'profile'];

export const NavBar: React.FC<NavBarProps> = ({
  activeTab,
  onTabChange,
  disableTabSwitch,
}) => {
  // keep component stable; animations are handled in CSS/motion on the button
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    prevTabRef.current = activeTab;
  }, [activeTab]);

  const handleTab = (tab: TabId) => (e: React.MouseEvent) => {
    if (disableTabSwitch) return;
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      (active.tagName === 'TEXTAREA' ||
        active.tagName === 'INPUT' ||
        active.isContentEditable)
    ) {
      active.blur();
      return;
    }
    const bottomZoneStart = 0.78;
    if (e.clientY < window.innerHeight * bottomZoneStart) return;
    onTabChange(tab);
  };

  return (
    <nav
      className="nav-pill-liquid fixed z-50"
      style={{
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)',
        width: 'min(calc(100% - 2.5rem), 28rem)',
        maxWidth: '28rem',
        bottom: 'max(6rem, calc(3rem + env(safe-area-inset-bottom, 0px)))',
      }}
      role="navigation"
      aria-label="Нижняя навигация"
    >
      <div className="nav-pill-liquid__noise" aria-hidden />
      <div className="nav-pill-liquid__inner">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className="relative flex justify-center items-center flex-shrink-0 rounded-full overflow-visible"
              style={{ width: 'var(--nav-btn-size)', height: 'var(--nav-btn-size)' }}
            >
              <motion.button
                type="button"
                onClick={handleTab(tab.id)}
                title={tab.title}
                className={`nav-btn-liquid ${isActive ? 'nav-btn-liquid--active' : ''}`}
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-btn-liquid__icon">
                  <motion.span
                    animate={isActive ? { scale: 1.02, y: -1 } : { scale: 1, y: 0 }}
                    transition={ICON_FLOAT_SPRING}
                    className="flex items-center justify-center"
                  >
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  </motion.span>
                </span>
                <span className="nav-btn-liquid__dot" aria-hidden />
              </motion.button>
            </div>
          );
        })}
      </div>
    </nav>
  );
};
