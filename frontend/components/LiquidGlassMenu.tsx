import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Clock, Pin, PinOff } from 'lucide-react';

const GLASS_STYLES = {
  backdropFilter: 'blur(24px) saturate(150%)',
  WebkitBackdropFilter: 'blur(24px) saturate(150%)',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow:
    '0 20px 50px -12px rgba(0, 0, 0, 0.5), 0 8px 24px -4px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
} as const;

const SPRING = {
  type: 'spring' as const,
  stiffness: 150,
  damping: 16,
  mass: 0.8,
};

const LAST_USED_KEY = 'aura_last_used_methods';
const PINNED_KEY = 'aura_pinned_methods';
const MAX_LAST_USED = 5;
const MAX_PINNED = 3;

export type MethodId =
  | 'abc'
  | 'protocol'
  | 'anxiety_reality'
  | 'beliefs'
  | 'thought_dispute'
  | 'soften_requirements'
  | 'resilience_training'
  | 'reaction_control';

const METHOD_LABELS: Record<MethodId, string> = {
  abc: 'ABC',
  protocol: 'Протокол мыслей',
  anxiety_reality: 'Тревога vs Реальность',
  beliefs: 'Мои убеждения',
  thought_dispute: 'Спор с мыслью',
  soften_requirements: 'Смягчение требований',
  resilience_training: 'Тренировка стойкости',
  reaction_control: 'Контроль реакции',
};

function getLastUsedMethods(): MethodId[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_USED_KEY) : null;
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MAX_LAST_USED) : [];
  } catch {
    return [];
  }
}

function addLastUsedMethod(id: MethodId) {
  const current = getLastUsedMethods();
  const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_LAST_USED);
  if (typeof localStorage !== 'undefined') localStorage.setItem(LAST_USED_KEY, JSON.stringify(next));
}

function getPinnedMethods(): MethodId[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PINNED_KEY) : null;
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MAX_PINNED) : [];
  } catch {
    return [];
  }
}

function setPinnedMethods(ids: MethodId[]) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(PINNED_KEY, JSON.stringify(ids.slice(0, MAX_PINNED)));
  } catch {}
}

const MENU_ITEMS = [
  { id: 'kpt', label: 'Разбор мыслей', subtitle: 'работаем с текущей ситуацией', highlighted: false },
  { id: 'rept', label: 'Работа с убеждениями', subtitle: 'Глубоко копаем установки', highlighted: false },
  { id: 'dpt', label: 'Сложные эмоции', subtitle: 'учимся выдерживать шторм', highlighted: false },
  { id: 'pro', label: 'Pro', subtitle: '', highlighted: true },
];

interface LiquidGlassMenuProps {
  /** При нажатии на ABC открывается карточка записи на главном экране */
  onABCClick?: () => void;
  /** При нажатии на Протокол мыслей открывается карточка методики */
  onProtocolClick?: () => void;
  /** При нажатии на Тревога vs Реальность открывается карточка методики */
  onAnxietyRealityClick?: () => void;
  /** При нажатии на Работа с убеждениями открывается карточка методики */
  onBeliefsClick?: () => void;
  /** При нажатии на Спор с мыслью открывается карточка методики */
  onThoughtDisputeClick?: () => void;
  /** При нажатии на Смягчение требований открывается карточка методики */
  onSoftenRequirementsClick?: () => void;
  /** При нажатии на Тренировка стойкости открывается карточка методики */
  onResilienceTrainingClick?: () => void;
  /** При нажатии на Контроль реакции (Сложные эмоции) открывается карточка методики */
  onReactionControlClick?: () => void;
}

export function LiquidGlassMenu({ onABCClick, onProtocolClick, onAnxietyRealityClick, onBeliefsClick, onThoughtDisputeClick, onSoftenRequirementsClick, onResilienceTrainingClick, onReactionControlClick }: LiquidGlassMenuProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastUsedIds, setLastUsedIds] = useState<MethodId[]>(() => getLastUsedMethods());
  const [pinnedIds, setPinnedIds] = useState<MethodId[]>(() => getPinnedMethods());

  useEffect(() => {
    if (!isOpen) return;
    setLastUsedIds(getLastUsedMethods());
    setPinnedIds(getPinnedMethods());
  }, [isOpen]);

  const runWithRecord = (id: MethodId, fn: () => void) => {
    addLastUsedMethod(id);
    setLastUsedIds(getLastUsedMethods());
    fn?.();
    setIsOpen(false);
  };

  const togglePinned = (id: MethodId) => {
    setPinnedIds((prev) => {
      const isPinned = prev.includes(id);
      if (isPinned) {
        const next = prev.filter((x) => x !== id);
        setPinnedMethods(next);
        return next;
      }
      if (prev.length >= MAX_PINNED) {
        try {
          window.alert(`Можно закрепить максимум ${MAX_PINNED} методики.`);
        } catch {}
        return prev;
      }
      const next = [id, ...prev].slice(0, MAX_PINNED);
      setPinnedMethods(next);
      return next;
    });
  };

  const recentForUI = useMemo(() => {
    // show pinned first (stable), then up to 5 recent excluding pinned
    const pinned = pinnedIds;
    const recent = lastUsedIds.filter((x) => !pinned.includes(x)).slice(0, MAX_LAST_USED);
    return { pinned, recent };
  }, [lastUsedIds, pinnedIds]);

  const handleABCClick = () => runWithRecord('abc', onABCClick);
  const handleProtocolClick = () => runWithRecord('protocol', onProtocolClick);
  const handleAnxietyRealityClick = () => runWithRecord('anxiety_reality', onAnxietyRealityClick);
  const handleBeliefsClick = () => runWithRecord('beliefs', onBeliefsClick);
  const handleThoughtDisputeClick = () => runWithRecord('thought_dispute', onThoughtDisputeClick);
  const handleSoftenRequirementsClick = () => runWithRecord('soften_requirements', onSoftenRequirementsClick);
  const handleResilienceTrainingClick = () => runWithRecord('resilience_training', onResilienceTrainingClick);
  const handleReactionControlClick = () => runWithRecord('reaction_control', onReactionControlClick);

  const methodHandlers: Record<MethodId, () => void> = {
    abc: handleABCClick,
    protocol: handleProtocolClick,
    anxiety_reality: handleAnxietyRealityClick,
    beliefs: handleBeliefsClick,
    thought_dispute: handleThoughtDisputeClick,
    soften_requirements: handleSoftenRequirementsClick,
    resilience_training: handleResilienceTrainingClick,
    reaction_control: handleReactionControlClick,
  };

  return (
    <>
      {/* Кнопка с чёрным плюсом — прямо в шапке, всегда видна */}
      <button
        type="button"
        data-lg="auto"
        onClick={() => setIsOpen((prev) => !prev)}
        className="lg w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E95D2C] focus-visible:ring-offset-2 hover:opacity-90 transition-opacity"
        style={{
          ...GLASS_STYLES,
        }}
        aria-label={isOpen ? 'Закрыть' : 'Открыть меню'}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0a0a0a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Backdrop — only when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-black/25"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            aria-hidden
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Panel when open — сдвинут вправо */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed right-4 top-3 z-[101] w-[280px] max-w-[calc(100vw-24px)]"
            style={{ pointerEvents: 'auto' }}
            aria-hidden
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                width: '100%',
                height: 400,
                borderRadius: '24px',
                overflow: 'hidden',
                direction: 'ltr',
                ...GLASS_STYLES,
              }}
              role="dialog"
              aria-modal
              aria-label="Меню"
            >
            {/* Кнопка закрытия (X) — строго правый верхний угол */}
            <button
              type="button"
              data-lg="auto"
              onClick={() => setIsOpen(false)}
              className="lg z-10 w-9 h-9 rounded-full flex items-center justify-center text-gray-800 dark:text-white hover:bg-white/10 transition-colors"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                left: 'auto',
                marginLeft: 0,
                marginRight: 0,
                transform: 'none',
                insetInlineStart: 'auto',
                insetInlineEnd: 8,
              } as React.CSSProperties}
              aria-label="Закрыть"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 block">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

          {/* Menu items */}
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.2 }}
            className="px-4 pb-5 pt-12 pr-12 overflow-y-auto h-full"
          >
                {/* Недавно использовали + закрепление */}
                {(recentForUI.pinned.length > 0 || recentForUI.recent.length > 0) && (
                  <div className="mb-4 pb-3 border-b-2 border-[#E95D2C]/70">
                    <p className="flex items-center gap-1.5 text-base font-bold text-[#E95D2C] mb-2 px-2">
                      <Clock size={16} />
                      Недавно использовали
                    </p>
                    <ul className="space-y-1">
                      {recentForUI.pinned.map((id) => (
                        <li key={`pinned_${id}`}>
                          <div className="w-full flex items-center justify-between gap-2 rounded-lg py-2.5 px-2 min-h-[44px] touch-manipulation text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium">
                            <button type="button" onClick={() => methodHandlers[id]?.()} className="flex-1 text-left">
                              {METHOD_LABELS[id]}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinned(id);
                              }}
                              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                              aria-label="Открепить"
                              title="Открепить"
                            >
                              <PinOff size={18} className="text-[#E95D2C]" />
                            </button>
                          </div>
                        </li>
                      ))}

                      {recentForUI.recent.map((id) => (
                        <li key={id}>
                          <div className="w-full flex items-center justify-between gap-2 rounded-lg py-2.5 px-2 min-h-[44px] touch-manipulation text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium">
                            <button type="button" onClick={() => methodHandlers[id]?.()} className="flex-1 text-left">
                              {METHOD_LABELS[id]}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinned(id);
                              }}
                              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                              aria-label="Закрепить"
                              title={pinnedIds.length >= MAX_PINNED ? `Можно закрепить только ${MAX_PINNED}` : 'Закрепить'}
                            >
                              <Pin size={18} className={pinnedIds.length >= MAX_PINNED ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 px-2 text-[11px] text-gray-500 dark:text-gray-400">
                      Закреплено: {recentForUI.pinned.length}/{MAX_PINNED}. Недавно: {Math.min(MAX_LAST_USED, recentForUI.pinned.length + recentForUI.recent.length)}/{MAX_LAST_USED}.
                    </div>
                  </div>
                )}

                <ul className="space-y-0">
                  {MENU_ITEMS.map((item, index) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{
                        ...SPRING,
                        delay: 0.2 + index * 0.05,
                      }}
                      className="border-b border-white/10 last:border-0"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((prev) => (prev === item.id ? null : item.id))
                        }
                        className={`w-full flex items-center justify-between gap-2 py-3 px-2 rounded-lg text-left transition-colors ${
                          item.highlighted
                            ? 'text-[#E95D2C] dark:text-[#E95D2C] font-semibold hover:bg-[#E95D2C]/30'
                            : 'text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium block">{item.label}</span>
                          {item.subtitle ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal block mt-0.5">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </div>
                        <motion.span
                          className="flex-shrink-0"
                          animate={{ rotate: expandedId === item.id ? 180 : 0 }}
                          transition={SPRING}
                        >
                          <ChevronDown size={18} className="text-gray-500 dark:text-gray-400" />
                        </motion.span>
                      </button>
                      <AnimatePresence>
                        {expandedId === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={SPRING}
                            className="overflow-hidden"
                          >
                            {item.id === 'kpt' ? (
                              <div className="pb-2 pl-2 pr-2 space-y-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleABCClick(); }}
                                  className="w-full flex items-center gap-2 text-left rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] py-2 touch-manipulation"
                                >
                                  <span className="text-base font-semibold text-gray-800 dark:text-gray-200">ABC</span>
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E95D2C]/50 dark:bg-[#E95D2C]/20 text-[#E95D2C] dark:text-[#E95D2C] flex items-center justify-center shadow-sm" title="Подсказка">
                                    <HelpCircle size={14} strokeWidth={2.5} />
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleProtocolClick(); }}
                                  className="w-full flex items-center gap-2 text-left rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] py-2 touch-manipulation"
                                >
                                  <span className="text-base font-semibold text-gray-800 dark:text-gray-200">Протокол мыслей</span>
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E95D2C]/50 dark:bg-[#E95D2C]/20 text-[#E95D2C] dark:text-[#E95D2C] flex items-center justify-center shadow-sm" title="Подсказка">
                                    <HelpCircle size={14} strokeWidth={2.5} />
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleAnxietyRealityClick(); }}
                                  className="w-full flex items-center gap-2 text-left rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] py-2 touch-manipulation"
                                >
                                  <span className="text-base font-semibold text-gray-800 dark:text-gray-200">Тревога vs Реальность</span>
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E95D2C]/50 dark:bg-[#E95D2C]/20 text-[#E95D2C] dark:text-[#E95D2C] flex items-center justify-center shadow-sm" title="Подсказка">
                                    <HelpCircle size={14} strokeWidth={2.5} />
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleBeliefsClick(); }}
                                  className="w-full flex items-center gap-2 text-left rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] py-2 touch-manipulation"
                                >
                                  <span className="text-base font-semibold text-gray-800 dark:text-gray-200">Мои убеждения</span>
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E95D2C]/50 dark:bg-[#E95D2C]/20 text-[#E95D2C] dark:text-[#E95D2C] flex items-center justify-center shadow-sm" title="Подсказка">
                                    <HelpCircle size={14} strokeWidth={2.5} />
                                  </span>
                                </button>
                              </div>
                            ) : item.id === 'rept' ? (
                              <div className="pb-2 pl-2 pr-2 space-y-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleThoughtDisputeClick(); }}
                                  className="w-full flex items-center gap-2 text-left rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] py-2 touch-manipulation"
                                >
                                  <span className="text-base font-semibold text-gray-800 dark:text-gray-200">Спор с мыслью</span>
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E95D2C]/50 dark:bg-[#E95D2C]/20 text-[#E95D2C] dark:text-[#E95D2C] flex items-center justify-center shadow-sm" title="Подсказка">
                                    <HelpCircle size={14} strokeWidth={2.5} />
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleSoftenRequirementsClick(); }}
                                  className="w-full flex items-center gap-2 text-left rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] py-2 touch-manipulation"
                                >
                                  <span className="text-base font-semibold text-gray-800 dark:text-gray-200">Смягчение требований</span>
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E95D2C]/50 dark:bg-[#E95D2C]/20 text-[#E95D2C] dark:text-[#E95D2C] flex items-center justify-center shadow-sm" title="Подсказка">
                                    <HelpCircle size={14} strokeWidth={2.5} />
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleResilienceTrainingClick(); }}
                                  className="w-full flex items-center gap-2 text-left rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] py-2 touch-manipulation"
                                >
                                  <span className="text-base font-semibold text-gray-800 dark:text-gray-200">Тренировка стойкости</span>
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E95D2C]/50 dark:bg-[#E95D2C]/20 text-[#E95D2C] dark:text-[#E95D2C] flex items-center justify-center shadow-sm" title="Подсказка">
                                    <HelpCircle size={14} strokeWidth={2.5} />
                                  </span>
                                </button>
                              </div>
                            ) : item.id === 'dpt' ? (
                              <div className="pb-2 pl-2 pr-2 space-y-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleReactionControlClick(); }}
                                  className="w-full flex items-center gap-2 text-left rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] py-2 touch-manipulation"
                                >
                                  <span className="text-base font-semibold text-gray-800 dark:text-gray-200">Контроль реакции</span>
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E95D2C]/50 dark:bg-[#E95D2C]/20 text-[#E95D2C] dark:text-[#E95D2C] flex items-center justify-center shadow-sm" title="Подсказка">
                                    <HelpCircle size={14} strokeWidth={2.5} />
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <p className="pb-3 pl-2 pr-2 text-sm text-gray-600 dark:text-gray-400">
                                Раздел в разработке.
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  ))}
                </ul>
          </motion.nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
