import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

export interface ResilienceTrainingEntryData {
  situation: string;
  thought: string;
  facts: string;
  rationalThought: string;
  timestamp: string;
}

interface ResilienceTrainingEntryCardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ResilienceTrainingEntryData) => void;
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

const inputClass =
  'w-full min-h-[var(--input-min-height)] px-3 py-2.5 rounded-xl text-[15px] text-gray-800 placeholder-gray-500 bg-white/40 border border-white/50 focus:border-[#E95D2C]/80 focus:ring-2 focus:ring-[#E95D2C]/25 outline-none transition-colors';
const textareaClass =
  'w-full min-h-[80px] px-3 py-2.5 rounded-xl text-[15px] text-gray-800 placeholder-gray-500 bg-white/40 border border-white/50 focus:border-[#E95D2C]/80 focus:ring-2 focus:ring-[#E95D2C]/25 outline-none resize-y transition-colors';
const labelClass = 'block text-[15px] font-bold text-gray-800 mb-1.5';
const bulletClass = 'flex-shrink-0 w-[var(--bullet-size)] h-[var(--bullet-size)] rounded-full bg-gray-500 mt-2';

export function ResilienceTrainingEntryCard({ isOpen, onClose, onSave }: ResilienceTrainingEntryCardProps) {
  const [situation, setSituation] = useState('');
  const [thought, setThought] = useState('');
  const [facts, setFacts] = useState('');
  const [rationalThought, setRationalThought] = useState('');
  const firstInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSituation('');
      setThought('');
      setFacts('');
      setRationalThought('');
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
      situation: situation.trim(),
      thought: thought.trim(),
      facts: facts.trim(),
      rationalThought: rationalThought.trim(),
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  const fieldBlock = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    multiline: boolean,
    ref?: React.RefObject<HTMLTextAreaElement | null>
  ) => (
    <div className="flex gap-3">
      <span className={bulletClass} style={{ marginTop: '0.6rem' }} aria-hidden />
      <div className="flex-1 min-w-0">
        <label className={labelClass}>{label}</label>
        {multiline ? (
          <textarea
            ref={ref ?? undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className={textareaClass}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={inputClass}
          />
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="resilience-training-entry-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-start justify-center pt-6 px-4 overflow-y-auto"
          style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(7rem, 140px)' }}
          role="presentation"
        >
          <div
            className="absolute inset-0 bg-black/25"
            style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            aria-hidden
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resilience-training-card-title"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative w-full max-w-[var(--entry-max-width,480px)] rounded-[var(--card-radius)] overflow-hidden"
            style={{ ...CARD_STYLE, ...GLASS_STYLES }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute left-2 top-2 z-10 w-9 h-9 rounded-full flex items-center justify-center text-gray-700 bg-white/30 hover:bg-white/50 border border-white/40 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E95D2C]"
              style={{ left: 8, top: 8 }}
              aria-label="Закрыть"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="absolute right-2 top-2 z-10 w-[var(--save-button-size)] h-[var(--save-button-size)] min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-gray-800 bg-white/40 border border-white/30 hover:bg-[#E95D2C]/20 hover:border-[#E95D2C]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E95D2C] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
              style={{ right: 8, top: 8 }}
              aria-label="Сохранить запись Тренировка стойкости"
            >
              <Check size={22} strokeWidth={2.5} />
            </button>

            <div className="px-5 pt-14 pb-6 space-y-4">
              {fieldBlock('Ситуация', situation, setSituation, 'Что вызывает дискомфорт?', true, firstInputRef)}
              {fieldBlock('Мысль', thought, setThought, 'Почему я считаю, что не выдержу?', true)}
              {fieldBlock('Факты', facts, setFacts, 'Выдерживал ли я подобное раньше?', true)}
              {fieldBlock('Рациональная мысль', rationalThought, setRationalThought, 'Это неприятно, но переносимо', true)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
