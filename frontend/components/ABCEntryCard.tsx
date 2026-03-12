import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

export interface ABCEntryData {
  happened: string;
  reacted: string;
  thought: string;
  timestamp: string;
}

interface ABCEntryCardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ABCEntryData) => void;
}

const GLASS_STYLES: React.CSSProperties = {
  backdropFilter: 'blur(24px) saturate(150%)',
  WebkitBackdropFilter: 'blur(24px) saturate(150%)',
  background: 'rgba(255, 255, 255, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.35)',
  boxShadow:
    '0 10px 40px -10px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
};

const CARD_STYLE = {
  '--card-radius': '24px',
  '--bullet-size': '8px',
  '--input-min-height': '44px',
  '--save-button-size': '44px',
  '--entry-max-width': '480px',
} as React.CSSProperties;

export function ABCEntryCard({ isOpen, onClose, onSave }: ABCEntryCardProps) {
  const [happened, setHappened] = useState('');
  const [reacted, setReacted] = useState('');
  const [thought, setThought] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHappened('');
      setReacted('');
      setThought('');
      setTimeout(() => firstInputRef.current?.focus(), 180);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleSave = () => {
    onSave({
      happened: happened.trim(),
      reacted: reacted.trim(),
      thought: thought.trim(),
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <motion.div
        key="abc-entry-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-start justify-center pt-6 px-4 pb-20 overflow-y-auto"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
        role="presentation"
      >
        {/* Backdrop — размытие как у меню */}
        <div
          className="absolute inset-0 bg-black/25"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          aria-hidden
          onClick={onClose}
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="abc-card-title"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full max-w-[var(--entry-max-width,480px)] rounded-[var(--card-radius)] overflow-hidden dark:bg-white/10"
          style={{ ...CARD_STYLE, ...GLASS_STYLES }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close (X) — как в меню: круг, прижат к левому верхнему углу */}
          <button
            type="button"
            onClick={onClose}
            className="absolute left-2 top-2 z-10 w-9 h-9 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-200 bg-white/30 dark:bg-white/15 hover:bg-white/50 dark:hover:bg-white/25 border border-white/40 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E95D2C]"
            style={{ left: 8, top: 8 }}
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={2.5} />
          </button>

          {/* Save (галочка) — в стиле стекла, справа вверху */}
          <button
            type="button"
            onClick={handleSave}
            className="absolute right-2 top-2 z-10 w-[var(--save-button-size)] h-[var(--save-button-size)] min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-gray-800 dark:text-white bg-white/4 dark:bg-white/1 border border-white/30 hover:bg-[#E95D2C]/20 dark:hover:bg-[#E95D2C]/20 hover:border-[#E95D2C]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E95D2C] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            style={{ right: 8, top: 8 }}
            aria-label="Сохранить запись ABC"
          >
            <Check size={22} strokeWidth={2.5} />
          </button>

          <div className="px-5 pt-14 pb-5 space-y-5">
            {/* 1. Что произошло? */}
            <div className="flex gap-3">
              <span
                className="flex-shrink-0 w-[var(--bullet-size)] h-[var(--bullet-size)] rounded-full bg-gray-500 dark:bg-gray-400 mt-2"
                style={{ marginTop: '0.6rem' }}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <label id="abc-happened-label" className="block text-[15px] font-bold text-gray-800 dark:text-gray-100 mb-1.5">
                  Что произошло?
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  value={happened}
                  onChange={(e) => setHappened(e.target.value)}
                  placeholder="Кратко опишите ситуацию…"
                  className="w-full min-h-[var(--input-min-height)] px-3 py-2.5 rounded-xl text-[15px] text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 bg-white/40 dark:bg-white/10 border border-white/50 dark:border-white/20 focus:border-[#E95D2C]/80 focus:ring-2 focus:ring-[#E95D2C]/25 outline-none transition-colors"
                  aria-label="Что произошло? Краткое описание ситуации"
                />
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Одно-два предложения.</p>
              </div>
            </div>

            {/* 2. Как вы отреагировали? */}
            <div className="flex gap-3">
              <span
                className="flex-shrink-0 w-[var(--bullet-size)] h-[var(--bullet-size)] rounded-full bg-gray-500 dark:bg-gray-400 mt-2"
                style={{ marginTop: '0.6rem' }}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <label id="abc-reacted-label" className="block text-[15px] font-bold text-gray-800 dark:text-gray-100 mb-1.5">
                  Как вы отреагировали?
                </label>
                <textarea
                  value={reacted}
                  onChange={(e) => setReacted(e.target.value)}
                  placeholder="Опишите свои действия и чувства…"
                  rows={3}
                  className="w-full min-h-[80px] px-3 py-2.5 rounded-xl text-[15px] text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 bg-white/40 dark:bg-white/10 border border-white/50 dark:border-white/20 focus:border-[#E95D2C]/80 focus:ring-2 focus:ring-[#E95D2C]/25 outline-none resize-y transition-colors"
                  aria-label="Как вы отреагировали? Поведение и эмоции"
                />
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Одно-два предложения.</p>
              </div>
            </div>

            {/* 3. О чём вы подумали? */}
            <div className="flex gap-3">
              <span
                className="flex-shrink-0 w-[var(--bullet-size)] h-[var(--bullet-size)] rounded-full bg-gray-500 dark:bg-gray-400 mt-2"
                style={{ marginTop: '0.6rem' }}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <label id="abc-thought-label" className="block text-[15px] font-bold text-gray-800 dark:text-gray-100 mb-1.5">
                  О чём вы подумали?
                </label>
                <textarea
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  placeholder="Опишите мысли, которые пришли…"
                  rows={3}
                  className="w-full min-h-[80px] px-3 py-2.5 rounded-xl text-[15px] text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 bg-white/40 dark:bg-white/10 border border-white/50 dark:border-white/20 focus:border-[#E95D2C]/80 focus:ring-2 focus:ring-[#E95D2C]/25 outline-none resize-y transition-colors"
                  aria-label="О чём вы подумали? Ваши мысли"
                />
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Одно-два предложения.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
