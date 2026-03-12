import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

export interface ReactionControlEntryData {
  date: string;
  trigger: string;
  emotions: string;
  intensity: number | '';
  impulse: string;
  behavior: string;
  dbtSkill: string;
  result: string;
  timestamp: string;
}

interface ReactionControlEntryCardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ReactionControlEntryData) => void;
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
const numberClass =
  'w-20 px-3 py-2.5 rounded-xl text-[15px] text-gray-800 placeholder-gray-500 bg-white/40 border border-white/50 focus:border-[#E95D2C]/80 focus:ring-2 focus:ring-[#E95D2C]/25 outline-none transition-colors';
const labelClass = 'block text-[15px] font-bold text-gray-800 mb-1.5';
const bulletClass = 'flex-shrink-0 w-[var(--bullet-size)] h-[var(--bullet-size)] rounded-full bg-gray-500 mt-2';

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function ReactionControlEntryCard({ isOpen, onClose, onSave }: ReactionControlEntryCardProps) {
  const [date, setDate] = useState(todayISO);
  const [trigger, setTrigger] = useState('');
  const [emotions, setEmotions] = useState('');
  const [intensity, setIntensity] = useState<number | ''>('');
  const [impulse, setImpulse] = useState('');
  const [behavior, setBehavior] = useState('');
  const [dbtSkill, setDbtSkill] = useState('');
  const [result, setResult] = useState('');
  const firstInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(todayISO());
      setTrigger('');
      setEmotions('');
      setIntensity('');
      setImpulse('');
      setBehavior('');
      setDbtSkill('');
      setResult('');
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
      date: date.trim(),
      trigger: trigger.trim(),
      emotions: emotions.trim(),
      intensity,
      impulse: impulse.trim(),
      behavior: behavior.trim(),
      dbtSkill: dbtSkill.trim(),
      result: result.trim(),
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

  const emotionsBlock = () => (
    <div className="flex gap-3">
      <span className={bulletClass} style={{ marginTop: '0.6rem' }} aria-hidden />
      <div className="flex-1 min-w-0">
        <label className={labelClass}>Эмоции</label>
        <textarea
          value={emotions}
          onChange={(e) => setEmotions(e.target.value)}
          placeholder="Какие эмоции возникли?"
          rows={2}
          className={textareaClass}
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-gray-600">Интенсивность (0–10)</span>
          <input
            type="number"
            min={0}
            max={10}
            value={intensity === '' ? '' : intensity}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') setIntensity('');
              else {
                const n = parseInt(v, 10);
                if (!Number.isNaN(n)) setIntensity(Math.max(0, Math.min(10, n)));
              }
            }}
            placeholder="0–10"
            className={numberClass}
          />
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="reaction-control-entry-overlay"
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
            aria-labelledby="reaction-control-card-title"
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
              aria-label="Сохранить запись Контроль реакции"
            >
              <Check size={22} strokeWidth={2.5} />
            </button>

            <div className="px-5 pt-14 pb-6 space-y-4">
              <div className="flex gap-3">
                <span className={bulletClass} style={{ marginTop: '0.6rem' }} aria-hidden />
                <div className="flex-1 min-w-0">
                  <label className={labelClass}>Дата</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              {fieldBlock('Триггер', trigger, setTrigger, 'Что произошло?', true, firstInputRef)}
              {emotionsBlock()}
              {fieldBlock('Импульс', impulse, setImpulse, 'Что мне хотелось сделать?', true)}
              {fieldBlock('Поведение', behavior, setBehavior, 'Что я реально сделал?', true)}
              {fieldBlock('Навык ДПТ', dbtSkill, setDbtSkill, 'Какой навык я использовал?', true)}
              {fieldBlock('Результат', result, setResult, 'Что произошло после?', true)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
