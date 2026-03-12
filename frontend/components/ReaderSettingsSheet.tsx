import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

import { API_BASE_URL } from '../config/api';
import { refreshAccessToken, isTokenExpiredOrExpiring } from '../services/api';

export type ReaderTheme = 'light' | 'sepia' | 'dark';
export type ReaderAlign = 'left' | 'justify';
export type ReaderFontFamily = 'Georgia' | 'SF' | 'Iowan' | 'Avenir';

export type ReaderSettings = {
  user_id: number;
  theme: ReaderTheme;
  font_family: ReaderFontFamily;
  font_size: number; // px
  font_weight: number; // 100..900
  ligatures: boolean;
  line_height: number; // 1.0..1.8
  text_align: ReaderAlign;
  brightness: number; // 0.5..1.2
  transitions: boolean;
  updated_at?: string;
};

const GLASS = {
  backdropFilter: 'blur(24px) saturate(150%)',
  WebkitBackdropFilter: 'blur(24px) saturate(150%)',
  background: 'rgba(255,255,255,0.10)',
  border: '1px solid rgba(255,255,255,0.18)',
  boxShadow: '0 22px 70px -30px rgba(0,0,0,0.55)',
} as const;

const SAFE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), ['target'], ['rel']],
  },
};

const THEME_MAP: Record<ReaderTheme, { bg: string; fg: string; muted: string; border: string }> = {
  light: { bg: '#F9FAFB', fg: '#111827', muted: '#6B7280', border: '#E5E7EB' },
  sepia: { bg: '#FBF0D9', fg: '#433422', muted: '#8D7B68', border: '#EEDAC3' },
  dark: { bg: '#121212', fg: '#F9FAFB', muted: '#9CA3AF', border: '#2A2A2A' },
};
const FONT_FAMILY_MAP: Record<ReaderFontFamily, string> = {
  Georgia: 'Georgia, serif',
  SF: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  Iowan: '"Iowan Old Style", "Palatino Linotype", Palatino, serif',
  Avenir: 'Avenir, "Avenir Next", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
};

const SAMPLE_MD = `Унылая пора! Очей очарованье!
Приятна мне твоя прощальная краса —
Люблю я пышное природы увяданье,
В багрец и в золото одетые леса.`;

export function applyReaderSettingsToRoot(s: ReaderSettings) {
  const root = document.documentElement;
  root.style.setProperty('--reader-font-family', FONT_FAMILY_MAP[s.font_family]);
  root.style.setProperty('--reader-font-size', `${s.font_size}px`);
  root.style.setProperty('--reader-font-weight', `${s.font_weight}`);
  root.style.setProperty('--reader-line-height', String(s.line_height));
  root.style.setProperty('--reader-text-align', s.text_align);
  root.style.setProperty('--reader-brightness', String(s.brightness));
  root.style.setProperty('--reader-ligatures', s.ligatures ? 'normal' : 'none');
  root.style.setProperty('--transition-duration', s.transitions ? '220ms' : '0ms');
  const theme = THEME_MAP[s.theme];
  root.style.setProperty('--reader-theme-bg', theme.bg);
  root.style.setProperty('--reader-theme-fg', theme.fg);
  root.style.setProperty('--reader-theme-muted', theme.muted);
  root.style.setProperty('--reader-theme-border', theme.border);

  try {
    document.body.classList.add('reader-surface');
    document.body.setAttribute('data-reader-theme', s.theme);
  } catch {}
}

export const getDefaultReaderSettings = (userId: number): ReaderSettings => ({
  user_id: userId,
  theme: 'light',
  font_family: 'SF',
  font_size: 16,
  font_weight: 400,
  ligatures: true,
  line_height: 1.45,
  text_align: 'left',
  brightness: 1.0,
  transitions: true,
});

/** Начальное состояние из localStorage, чтобы при переходе на вкладку Профиль тема не сбрасывалась */
function getInitialReaderSettings(userId: number): ReaderSettings {
  const defaults = getDefaultReaderSettings(userId);
  try {
    const raw = localStorage.getItem(`reader_settings_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
      return { ...defaults, ...parsed, user_id: userId };
    }
  } catch {}
  return defaults;
}

function useDebouncedCallback<T extends any[]>(fn: (...args: T) => void, delayMs: number) {
  const timer = useRef<number | null>(null);
  return (...args: T) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => fn(...args), delayMs);
  };
}

export function ReaderSettingsSheet({
  userId,
  isOpen,
  onClose,
}: {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<ReaderSettings>(() => getInitialReaderSettings(userId));
  const [status, setStatus] = useState<string | null>(null);

  const storageKey = `reader_settings_${userId}`;

  // load on open
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      setStatus(null);

      // local fallback first (instant UI)
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          setSettings((prev) => ({ ...prev, ...parsed, user_id: userId }));
        }
      } catch {}

      try {
        let token = localStorage.getItem('authToken');
        if (token && isTokenExpiredOrExpiring(token)) {
          await refreshAccessToken();
          token = localStorage.getItem('authToken');
        }

        const resp = await fetch(`${API_BASE_URL}/api/users/${userId}/reader-settings`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!resp.ok) throw new Error(String(resp.status));
        const data = (await resp.json()) as ReaderSettings;
        if (cancelled) return;
        setSettings((prev) => ({ ...prev, ...data, user_id: userId }));
      } catch {
        // stay in local mode
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, userId, storageKey]);

  // apply immediately (entire app uses CSS vars via .reader-prose/.reader-surface)
  useEffect(() => {
    applyReaderSettingsToRoot(settings);
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {}
  }, [settings, storageKey]);

  const saveToServer = async (next: ReaderSettings) => {
    try {
      let token = localStorage.getItem('authToken');
      if (token && isTokenExpiredOrExpiring(token)) {
        await refreshAccessToken();
        token = localStorage.getItem('authToken');
      }

      const resp = await fetch(`${API_BASE_URL}/api/users/${userId}/reader-settings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!resp.ok) throw new Error(String(resp.status));
      setStatus('Saved');
      window.setTimeout(() => setStatus(null), 1200);
    } catch {
      // offline fallback
      setStatus('Changes saved locally — will sync when online.');
      window.setTimeout(() => setStatus(null), 2500);
    }
  };

  const debouncedSave = useDebouncedCallback(saveToServer, 500);

  const update = (patch: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch, user_id: userId };
      debouncedSave(next);
      return next;
    });
  };

  const isLightTheme = settings.theme === 'light';
  const isSepiaTheme = settings.theme === 'sepia';
  const isDarkTheme = settings.theme === 'dark';
  const themeButton = (id: ReaderTheme, label: string) => {
    const selected = settings.theme === id;
    const activeClass = selected
      ? isLightTheme
        ? 'border-[#E5E7EB] bg-white text-[#E95D2C] shadow-[0_2px_12px_rgba(0,0,0,0.04)]'
        : isSepiaTheme
          ? 'border-[#EEDAC3] bg-[#FFFDF8] text-[#E28C71] shadow-[0_2px_8px_rgba(120,90,40,0.06)]'
          : isDarkTheme
            ? 'border-[#2A2A2A] bg-[#333333] text-[#E28C71]'
            : 'border-[#E95D2C] bg-[#E95D2C]/10 text-[#E95D2C]'
      : isLightTheme
        ? 'border-[#E5E7EB] bg-transparent text-[#111827]'
        : isSepiaTheme
          ? 'border-[#EEDAC3] bg-transparent text-[#433422]'
          : isDarkTheme
            ? 'border-[#2A2A2A] bg-[#252525] text-[#9CA3AF]'
            : 'border-black/10 bg-white/40 text-black';
    return (
      <button type="button" onClick={() => update({ theme: id })} className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-all min-h-[44px] ${activeClass}`} aria-label={`Theme ${label}`}>
        {label}
      </button>
    );
  };

  const fontChip = (id: ReaderFontFamily) => {
    const selected = settings.font_family === id;
    const activeClass = selected
      ? isLightTheme
        ? 'border-[#E5E7EB] bg-white text-[#E95D2C] shadow-[0_2px_12px_rgba(0,0,0,0.04)] scale-[1.01]'
        : isSepiaTheme
          ? 'border-[#EEDAC3] bg-[#FFFDF8] text-[#E28C71] shadow-[0_2px_8px_rgba(120,90,40,0.06)] scale-[1.01]'
          : isDarkTheme
            ? 'border-[#2A2A2A] bg-[#333333] text-[#E28C71] scale-[1.01]'
            : 'border-[#E95D2C] bg-[#E95D2C]/10 text-[#E95D2C] scale-[1.01]'
      : isLightTheme
        ? 'border-[#E5E7EB] bg-transparent text-[#111827]'
        : isSepiaTheme
          ? 'border-[#EEDAC3] bg-transparent text-[#433422]'
          : isDarkTheme
            ? 'border-[#2A2A2A] bg-[#252525] text-[#9CA3AF]'
            : 'border-black/10 bg-white/40 text-black';
    return (
      <button key={id} type="button" onClick={() => update({ font_family: id })} className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-transform min-h-[44px] ${activeClass}`} style={{ fontFamily: id === 'SF' ? undefined : id }} aria-label={`Font family ${id}`}>
        {id}
      </button>
    );
  };

  const previewStyle = useMemo(() => {
    const theme = THEME_MAP[settings.theme];
    return {
      background: theme.bg,
      color: theme.fg,
      fontFamily: FONT_FAMILY_MAP[settings.font_family],
      fontSize: `${settings.font_size}px`,
      fontWeight: settings.font_weight,
      lineHeight: settings.line_height,
      textAlign: settings.text_align,
      fontVariantLigatures: settings.ligatures ? 'normal' : 'none',
    } as React.CSSProperties;
  }, [settings.theme, settings.font_family, settings.font_size, settings.font_weight, settings.line_height, settings.text_align, settings.ligatures]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="reader-settings-sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200]"
          style={{ pointerEvents: 'auto' }}
          aria-hidden={false}
        >
          <div
            className="absolute inset-0 bg-black/35"
            style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 170, damping: 18, mass: 0.9 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 800) onClose();
            }}
            className="fixed left-0 right-0 bottom-0 z-[201] mx-auto max-w-[720px] px-4 pb-4 flex flex-col max-h-[100dvh]"
            role="dialog"
            aria-modal
            aria-label="Reader settings"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="reader-settings-sheet-panel rounded-[28px] overflow-hidden flex flex-col max-h-[90vh] min-h-0"
              style={
                settings.theme === 'light'
                  ? { background: '#FFFFFF', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #E5E7EB' }
                  : settings.theme === 'sepia'
                    ? { background: '#FFFDF8', boxShadow: '0 4px 16px rgba(120,90,40,0.08)', border: '1px solid #EEDAC3' }
                    : settings.theme === 'dark'
                      ? { background: '#1E1E1E', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '1px solid #2A2A2A' }
                      : GLASS
              }
            >
              {/* Шапка всегда видна */}
              <div
                className={`flex-shrink-0 px-4 py-3 flex items-center justify-between border-b ${
                  settings.theme === 'light'
                    ? 'border-[#E5E7EB] bg-[#F9FAFB]'
                    : settings.theme === 'sepia'
                      ? 'border-[#EEDAC3] bg-[#FBF0D9]'
                      : settings.theme === 'dark'
                        ? 'border-[#2A2A2A] bg-[#252525]'
                        : 'border-white/10 bg-black/15'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-11 w-11 rounded-full flex items-center justify-center hover:bg-[#E95D2C]/20 transition-colors text-[#E95D2C]"
                    aria-label="Назад"
                    title="Назад"
                  >
                    <ArrowLeft size={24} strokeWidth={2.5} />
                  </button>
                  <div
                    className={`font-black text-lg ${
                      isLightTheme ? 'text-[#111827]' : settings.theme === 'sepia' ? 'text-[#433422]' : settings.theme === 'dark' ? 'text-[#F9FAFB]' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    Reader Settings
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
                      isLightTheme ? 'hover:bg-[#F3F4F6] text-[#111827]' : settings.theme === 'sepia' ? 'hover:bg-[#EEDAC3]/40 text-[#433422]' : settings.theme === 'dark' ? 'hover:bg-[#333333] text-[#F9FAFB]' : 'hover:bg-white/10 text-gray-900 dark:text-gray-100'
                    }`}
                    aria-label="Закрыть"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {status && <div className="flex-shrink-0 px-4 py-2 text-xs text-gray-700">{status}</div>}

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 pb-8 grid gap-4">
                <div className="rounded-2xl border border-white/10 overflow-hidden">
                    <div
                      className="rounded-2xl overflow-y-auto overflow-x-hidden min-h-[180px] max-h-[320px]"
                      style={previewStyle}
                    >
                      <div className="p-4" style={previewStyle}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw, [rehypeSanitize, SAFE_SCHEMA]]}
                          components={{
                            a: (props) => <a {...props} target="_blank" rel="noreferrer noopener" />,
                          }}
                        >
                          {SAMPLE_MD}
                        </ReactMarkdown>
                      </div>
                    </div>
                </div>

                <div className="grid gap-3">
                  <div
                    className={`reader-settings-segment rounded-2xl p-4 border ${
                      settings.theme === 'light'
                        ? 'border-[#E5E7EB] bg-[#F3F4F6]'
                        : settings.theme === 'sepia'
                          ? 'border-[#EEDAC3] bg-[#FBF0D9]'
                          : settings.theme === 'dark'
                            ? 'border-[#2A2A2A] bg-[#252525]'
                            : 'border-white/10 bg-white/10'
                    }`}
                  >
                    <div
                      className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                        settings.theme === 'light' ? 'text-[#6B7280]' : settings.theme === 'sepia' ? 'text-[#8D7B68]' : settings.theme === 'dark' ? 'text-[#9CA3AF]' : 'text-gray-700'
                      }`}
                    >
                      Theme
                    </div>
                    <div className="flex gap-2">
                      {themeButton('light', 'Light')}
                      {themeButton('sepia', 'Sepia')}
                      {themeButton('dark', 'Dark')}
                    </div>
                  </div>

                  <div
                    className={`reader-settings-segment rounded-2xl p-4 border ${
                      settings.theme === 'light'
                        ? 'border-[#E5E7EB] bg-[#F3F4F6]'
                        : settings.theme === 'sepia'
                          ? 'border-[#EEDAC3] bg-[#FBF0D9]'
                          : settings.theme === 'dark'
                            ? 'border-[#2A2A2A] bg-[#252525]'
                            : 'border-white/10 bg-white/10'
                    }`}
                  >
                    <div
                      className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                        settings.theme === 'light' ? 'text-[#6B7280]' : settings.theme === 'sepia' ? 'text-[#8D7B68]' : settings.theme === 'dark' ? 'text-[#9CA3AF]' : 'text-gray-700'
                      }`}
                    >
                      Typography
                    </div>
                    <div className="flex flex-wrap gap-2">{(['Georgia', 'SF', 'Iowan', 'Avenir'] as ReaderFontFamily[]).map(fontChip)}</div>

                    <div className="mt-4 grid gap-3">
                      <div>
                        <label className={`text-xs font-semibold ${isLightTheme ? 'text-[#6B7280]' : isSepiaTheme ? 'text-[#8D7B68]' : isDarkTheme ? 'text-[#9CA3AF]' : 'text-gray-700'}`} aria-label="Font size">
                          Font size: {settings.font_size}px
                        </label>
                        <input
                          type="range"
                          min={12}
                          max={28}
                          value={settings.font_size}
                          onChange={(e) => update({ font_size: Number(e.target.value) })}
                          className="w-full"
                          aria-valuemin={12}
                          aria-valuemax={28}
                          aria-valuenow={settings.font_size}
                        />
                        <div className="mt-2 flex gap-2">
                          {(['Small', 'Default', 'Large'] as const).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() =>
                                update({
                                  font_size: p === 'Small' ? 14 : p === 'Default' ? 16 : 20,
                                })
                              }
                              className={`px-3 py-2 rounded-xl border text-sm font-semibold min-h-[44px] ${
                                isLightTheme ? 'border-[#E5E7EB] bg-transparent text-[#111827]' : isSepiaTheme ? 'border-[#EEDAC3] bg-transparent text-[#433422]' : isDarkTheme ? 'border-[#2A2A2A] bg-[#252525] text-[#9CA3AF]' : 'border-black/10 bg-white/40 text-black'
                              }`}
                              aria-label={`Text preset ${p}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className={`text-xs font-semibold ${isLightTheme ? 'text-[#6B7280]' : isSepiaTheme ? 'text-[#8D7B68]' : isDarkTheme ? 'text-[#9CA3AF]' : 'text-gray-700'}`} aria-label="Font weight">
                          Font weight: {settings.font_weight}
                        </label>
                        <input
                          type="range"
                          min={100}
                          max={900}
                          step={10}
                          value={settings.font_weight}
                          onChange={(e) => update({ font_weight: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className={`text-xs font-semibold ${isLightTheme ? 'text-[#6B7280]' : isSepiaTheme ? 'text-[#8D7B68]' : isDarkTheme ? 'text-[#9CA3AF]' : 'text-gray-700'}`}>Ligatures</div>
                        <button
                          type="button"
                          onClick={() => update({ ligatures: !settings.ligatures })}
                          className={`px-3 py-2 rounded-xl border text-sm font-semibold min-h-[44px] ${
                            settings.ligatures
                              ? isLightTheme
                                ? 'border-[#E5E7EB] bg-white text-[#E95D2C] shadow-[0_2px_12px_rgba(0,0,0,0.04)]'
                                : isSepiaTheme
                                  ? 'border-[#EEDAC3] bg-[#FFFDF8] text-[#E28C71] shadow-[0_2px_8px_rgba(120,90,40,0.06)]'
                                  : isDarkTheme
                                    ? 'border-[#2A2A2A] bg-[#333333] text-[#E28C71]'
                                    : 'border-[#E95D2C] bg-[#E95D2C]/10 text-[#E95D2C]'
                              : isLightTheme
                                ? 'border-[#E5E7EB] bg-transparent text-[#111827]'
                                : isSepiaTheme
                                  ? 'border-[#EEDAC3] bg-transparent text-[#433422]'
                                  : isDarkTheme
                                    ? 'border-[#2A2A2A] bg-[#252525] text-[#9CA3AF]'
                                    : 'border-black/10 bg-white/40 text-black'
                          }`}
                          aria-label="Toggle ligatures"
                        >
                          {settings.ligatures ? 'On' : 'Off'}
                        </button>
                      </div>

                      <div>
                        <label className={`text-xs font-semibold ${isLightTheme ? 'text-[#6B7280]' : isSepiaTheme ? 'text-[#8D7B68]' : isDarkTheme ? 'text-[#9CA3AF]' : 'text-gray-700'}`} aria-label="Line height">
                          Line height: {settings.line_height.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min={1.0}
                          max={1.8}
                          step={0.01}
                          value={settings.line_height}
                          onChange={(e) => update({ line_height: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

