import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Check, Trash2, Pin } from 'lucide-react';
import { LiquidGlassMenu } from './LiquidGlassMenu';
import { ABCEntryCard, type ABCEntryData } from './ABCEntryCard';
import { ProtocolEntryCard, type ProtocolEntryData } from './ProtocolEntryCard';
import { AnxietyRealityEntryCard, type AnxietyRealityEntryData } from './AnxietyRealityEntryCard';
import { BeliefsEntryCard, type BeliefsEntryData } from './BeliefsEntryCard';
import { ThoughtDisputeEntryCard, type ThoughtDisputeEntryData } from './ThoughtDisputeEntryCard';
import { SoftenRequirementsEntryCard, type SoftenRequirementsEntryData } from './SoftenRequirementsEntryCard';
import { ResilienceTrainingEntryCard, type ResilienceTrainingEntryData } from './ResilienceTrainingEntryCard';
import { ReactionControlEntryCard, type ReactionControlEntryData } from './ReactionControlEntryCard';
import { fetchAllThoughts, saveThought, deleteThought, invalidateAllThoughtsCache } from '../services/api';
import { Thought } from '../types';
import { parseLocalDate } from '../utils/dateUtils';

interface DailyJournalViewProps {
  userId: number;
  onThoughtClick?: (thought: Thought) => void;
}

/** Возвращает начало текущего календарного дня (00:00) в локальной зоне пользователя. */
function getDisplayDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/** Проверяет, что мысль по своей дате создания попадает в тот же календарный день (в локальной зоне), что и now. Так во вторник в 01:00 не показываются мысли понедельника 21:00. */
function isThoughtOnSameCalendarDay(thought: Thought, now: Date): boolean {
  const ts = getThoughtTimestamp(thought);
  if (ts <= 0) return false;
  const thoughtDate = new Date(ts);
  return (
    thoughtDate.getFullYear() === now.getFullYear() &&
    thoughtDate.getMonth() === now.getMonth() &&
    thoughtDate.getDate() === now.getDate()
  );
}

/** Format month nominative for the header style */
function formatMonthNominative(date: Date): string {
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];
  return months[date.getMonth()];
}

function formatDayOfWeek(date: Date): string {
  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  return days[date.getDay()];
}

/** Извлекает время ЧЧ:ММ из ISO-строки (2025-02-15T08:52:00Z или с offset). Показываем как есть, без перевода в зону — устраняет сдвиг на 3ч, когда сервер хранит местное время, но отдаёт с Z. */
function getThoughtDisplayTime(thought: Thought): string {
  const raw = thought.created_at ?? (thought as { CreatedAt?: string }).CreatedAt;
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.trim().replace(' ', 'T');
  const match = s.match(/T(\d{1,2}):(\d{2})/);
  if (!match) return '';
  const h = match[1].padStart(2, '0');
  const m = match[2];
  return `${h}:${m}`;
}

function parseThoughtDate(value: string): Date | null {
  return parseLocalDate(value);
}

/** Время записи в виде timestamp для сортировки и фильтрации (тот же парсинг, что и для отображения). */
function getThoughtTimestamp(thought: Thought): number {
  const raw = thought.created_at ?? (thought as { CreatedAt?: string }).CreatedAt;
  if (!raw || typeof raw !== 'string') return 0;
  const date = parseThoughtDate(raw);
  return date ? date.getTime() : 0;
}

/** Превращает сырой content (с __TITLE__: или _TITLE_:...) в читаемый текст без маркеров */
function formatThoughtContentForDisplay(raw: string): string {
  if (!raw || !raw.trim()) return '';
  const titleMatch = raw.match(/^_+TITLE_+:\s*/i);
  if (titleMatch) {
    const rest = raw.slice(titleMatch[0].length);
    const lines = rest.split('\n');
    const firstLine = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();
    return body ? `${firstLine}\n${body}` : firstLine;
  }
  return raw;
}

const PIN_STORAGE_KEY = 'aura_journal_pinned';
const ORDER_STORAGE_KEY = 'aura_journal_order';

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getThoughtId(t: Thought): number {
  return t.thought_id ?? (t as { ThoughtID?: number }).ThoughtID ?? (t as { id?: number }).id ?? 0;
}

export const DailyJournalView: React.FC<DailyJournalViewProps> = ({ userId, onThoughtClick }) => {
  // All thoughts within the 12h window
  const [recentThoughts, setRecentThoughts] = useState<Thought[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Current text being typed (for the new entry input)
  const [currentText, setCurrentText] = useState('');
  // thought_id of the entry currently being auto-saved (null = new)
  const [activeThoughtId, setActiveThoughtId] = useState<number | null>(null);

  // Save status indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // ABC entry card (from menu "Разбор мыслей" → ABC)
  const [showABCCard, setShowABCCard] = useState(false);
  // Протокол мыслей (from menu "Разбор мыслей" → Протокол мыслей)
  const [showProtocolCard, setShowProtocolCard] = useState(false);
  // Тревога vs Реальность (from menu "Разбор мыслей" → Тревога vs Реальность)
  const [showAnxietyRealityCard, setShowAnxietyRealityCard] = useState(false);
  // Мои убеждения (from menu "Разбор мыслей" → Мои убеждения)
  const [showBeliefsCard, setShowBeliefsCard] = useState(false);
  // Спор с мыслью (from menu "Работа с убеждениями" → Спор с мыслью)
  const [showThoughtDisputeCard, setShowThoughtDisputeCard] = useState(false);
  // Смягчение требований (from menu "Работа с убеждениями" → Смягчение требований)
  const [showSoftenRequirementsCard, setShowSoftenRequirementsCard] = useState(false);
  const [showResilienceTrainingCard, setShowResilienceTrainingCard] = useState(false);
  const [showReactionControlCard, setShowReactionControlCard] = useState(false);

  // Закреплённые и порядок блоков (localStorage)
  const [pinnedIds, setPinnedIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(PIN_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [orderOverride, setOrderOverride] = useState<Record<string, number[]>>(() => {
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinnedIds));
    } catch (_) {}
  }, [pinnedIds]);
  useEffect(() => {
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orderOverride));
    } catch (_) {}
  }, [orderOverride]);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTextRef = useRef<string>('');
  const lastTypingRef = useRef<number>(0);
  const activeThoughtIdRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef<string | null>(null);

  // Статусы сохранения для редактируемых записей
  const [editSaveStatuses, setEditSaveStatuses] = useState<Record<number, 'idle' | 'saving' | 'saved'>>({});

  // Keep ref in sync
  useEffect(() => {
    activeThoughtIdRef.current = activeThoughtId;
  }, [activeThoughtId]);

  // --- Load recent thoughts ---
  const loadRecentThoughts = useCallback(async () => {
    try {
      const all = await fetchAllThoughts(userId);
      const now = new Date();

      // Только мысли, у которых календарная дата (в локальной зоне) = сегодня. Во вторник 01:00 не показываем понедельник 21:00.
      const recent = all
        .filter((t) => isThoughtOnSameCalendarDay(t, now))
        .sort((a, b) => getThoughtTimestamp(a) - getThoughtTimestamp(b)); // oldest first
      setRecentThoughts(recent);
    } catch (e) {
      console.error('[DailyJournal] Failed to load thoughts:', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadRecentThoughts();
  }, [loadRecentThoughts]);

  // --- Автоматическое обновление в полночь (смена дня на текущий после 00:00) ---
  const dayBoundaryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const scheduleReload = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const ms = nextMidnight.getTime() - now.getTime();
      dayBoundaryTimeoutRef.current = setTimeout(() => {
        console.log('[DailyJournal] Midnight — new day, reloading thoughts...');
        setCurrentText('');
        currentTextRef.current = '';
        setActiveThoughtId(null);
        activeThoughtIdRef.current = null;
        invalidateAllThoughtsCache();
        loadRecentThoughts();
        scheduleReload();
      }, ms);
    };

    scheduleReload();
    return () => {
      if (dayBoundaryTimeoutRef.current) clearTimeout(dayBoundaryTimeoutRef.current);
    };
  }, [loadRecentThoughts]);

  // --- Auto-resize textarea (поле новой записи) ---
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [currentText]);

  const thoughtsListRef = useRef<HTMLDivElement>(null);
  // --- Авто-подстройка высоты textarea у записей в списке (чтобы большой текст не прятался) ---
  useEffect(() => {
    const list = thoughtsListRef.current;
    if (!list) return;
    const run = () => {
      list.querySelectorAll<HTMLTextAreaElement>('textarea.thought-textarea').forEach((el) => {
        el.style.height = 'auto';
        el.style.height = Math.max(60, el.scrollHeight) + 'px';
      });
    };
    run();
    const id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [recentThoughts]);

  // Focus textarea on mount
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isLoading]);

  // --- Auto-save logic ---
  const doSave = useCallback(async (text: string) => {
    const normalized = text.trim();
    const thoughtIdToUse = activeThoughtIdRef.current;

    // Пустой текст для уже созданной записи трактуем как удаление записи
    if (!normalized && thoughtIdToUse) {
      if (isSavingRef.current) {
        pendingSaveRef.current = text;
        return;
      }

      isSavingRef.current = true;
      setSaveStatus('saving');

      try {
        await deleteThought(thoughtIdToUse);
        invalidateAllThoughtsCache();
        setRecentThoughts((prev) =>
          prev.filter((t) => {
            const id = t.thought_id || t.ThoughtID || t.id;
            return id !== thoughtIdToUse;
          })
        );
        setActiveThoughtId(null);
        activeThoughtIdRef.current = null;
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
      } catch (error) {
        console.error('[DailyJournal] Auto-delete failed:', error);
        setSaveStatus('idle');
      } finally {
        isSavingRef.current = false;
        if (pendingSaveRef.current !== null) {
          const pending = pendingSaveRef.current;
          pendingSaveRef.current = null;
          doSave(pending);
        }
      }
      return;
    }

    if (!normalized) return;
    if (isSavingRef.current) {
      pendingSaveRef.current = text;
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');

    try {
      if (thoughtIdToUse) {
        await saveThought({ thought_id: thoughtIdToUse, content: text });
      } else {
        const result = await saveThought({ content: text });
        if (result.thought_id) {
          setActiveThoughtId(result.thought_id);
          activeThoughtIdRef.current = result.thought_id;
        }
      }

      setSaveStatus('saved');
      invalidateAllThoughtsCache();
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch (error) {
      console.error('[DailyJournal] Auto-save failed:', error);
      setSaveStatus('idle');
    } finally {
      isSavingRef.current = false;
      if (pendingSaveRef.current !== null) {
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        doSave(pending);
      }
    }
  }, []);

  /** Сохранение уже существующей записи (редактирование за день) */
  const saveExistingThought = useCallback(async (thoughtId: number, text: string) => {
    setEditSaveStatuses((prev) => ({ ...prev, [thoughtId]: 'saving' }));
    
    try {
      // Если текст пустой — удаляем запись
      if (!text.trim()) {
        await deleteThought(thoughtId);
        invalidateAllThoughtsCache();
        // Удаляем из локального стейта
        setRecentThoughts((prev) => {
          const filtered = prev.filter((t) => {
            const id = t.thought_id || t.ThoughtID || t.id;
            return id !== thoughtId;
          });
          return filtered;
        });
        setEditSaveStatuses((prev) => {
          const copy = { ...prev };
          delete copy[thoughtId];
          return copy;
        });
        console.log(`[DailyJournal] Deleted thought ${thoughtId}`);
        return;
      }

      // Иначе — обновляем запись (сохраняем как есть, без изменения формата)
      await saveThought({ thought_id: thoughtId, content: text });
      invalidateAllThoughtsCache();
      setEditSaveStatuses((prev) => ({ ...prev, [thoughtId]: 'saved' }));
      setTimeout(() => {
        setEditSaveStatuses((prev) => {
          if (prev[thoughtId] === 'saved') {
            const copy = { ...prev };
            copy[thoughtId] = 'idle';
            return copy;
          }
          return prev;
        });
      }, 2000);
      // НЕ перезагружаем список — локальный стейт уже актуален, перезагрузка сбрасывает фокус на мобильном
      console.log(`[DailyJournal] Saved edited thought ${thoughtId}`);
    } catch (e) {
      console.error('[DailyJournal] Failed to save edited thought:', e);
      setEditSaveStatuses((prev) => ({ ...prev, [thoughtId]: 'idle' }));
    }
  }, [loadRecentThoughts]);

  const editTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const pendingEditedThoughtsRef = useRef<Record<number, string>>({});

  const flushPendingEditedThoughts = useCallback(() => {
    const pendingEntries = Object.entries(pendingEditedThoughtsRef.current);
    if (!pendingEntries.length) return;

    pendingEntries.forEach(([idStr, text]) => {
      const thoughtId = Number(idStr);
      if (!Number.isFinite(thoughtId)) return;

      const timeoutId = editTimeoutsRef.current[thoughtId];
      if (timeoutId) {
        clearTimeout(timeoutId);
        delete editTimeoutsRef.current[thoughtId];
      }

      delete pendingEditedThoughtsRef.current[thoughtId];
      void saveExistingThought(thoughtId, text);
    });
  }, [saveExistingThought]);

  const handleExistingThoughtChange = useCallback(
    (thoughtId: number, newText: string) => {
      if (editTimeoutsRef.current[thoughtId]) clearTimeout(editTimeoutsRef.current[thoughtId]);
      pendingEditedThoughtsRef.current[thoughtId] = newText;
      
      // Сразу обновляем локально для быстрого отклика UI
      setRecentThoughts((prev) =>
        prev.map((t) => {
          const id = t.thought_id || t.ThoughtID || t.id;
          if (id === thoughtId) return { ...t, content: newText };
          return t;
        })
      );
      
      // Через 1.5 секунды — сохраняем на сервер
      editTimeoutsRef.current[thoughtId] = setTimeout(() => {
        const latestText = pendingEditedThoughtsRef.current[thoughtId] ?? newText;
        delete pendingEditedThoughtsRef.current[thoughtId];
        void saveExistingThought(thoughtId, latestText);
        delete editTimeoutsRef.current[thoughtId];
      }, 1500);
    },
    [saveExistingThought]
  );

  const startSaveIntervalIfNeeded = useCallback(() => {
    if (saveIntervalRef.current) return;
    saveIntervalRef.current = setInterval(() => {
      if (Date.now() - lastTypingRef.current > 1500) {
        if (saveIntervalRef.current) {
          clearInterval(saveIntervalRef.current);
          saveIntervalRef.current = null;
        }
        return;
      }
      const toSave = currentTextRef.current;
      doSave(toSave);
    }, 200);
  }, [doSave]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    currentTextRef.current = text;
    setCurrentText(text);
    lastTypingRef.current = Date.now();
    startSaveIntervalIfNeeded();
  }, [startSaveIntervalIfNeeded]);

  // --- "Finish entry" on Enter+Enter (double newline) ---
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If user presses Enter and the last two chars are already newlines → commit entry and start fresh
    if (e.key === 'Enter' && currentText.endsWith('\n\n')) {
      e.preventDefault();
      // Save current, then reset for new entry
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      const textToSave = currentText.trimEnd();
      if (textToSave) {
        (async () => {
          await doSave(textToSave);
          // Move to recent thoughts list and reset input
          await loadRecentThoughts();
          currentTextRef.current = '';
          setCurrentText('');
          setActiveThoughtId(null);
          activeThoughtIdRef.current = null;
          setTimeout(() => textareaRef.current?.focus(), 50);
        })();
      }
    }
  }, [currentText, doSave, loadRecentThoughts]);

  // При уходе со страницы — сохраняем; при возврате — обновляем список с сервера
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingEditedThoughts();
        const text = currentTextRef.current;
        if (text.trim() || activeThoughtIdRef.current) doSave(text);
      } else if (document.visibilityState === 'visible') {
        invalidateAllThoughtsCache();
        loadRecentThoughts();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [doSave, flushPendingEditedThoughts, loadRecentThoughts]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      flushPendingEditedThoughts();
      // Финальное сохранение при размонтировании (переход на другую вкладку приложения)
      const text = currentTextRef.current;
      if (text.trim() || activeThoughtIdRef.current) doSave(text);
      Object.values(editTimeoutsRef.current).forEach(clearTimeout);
      editTimeoutsRef.current = {};
      pendingEditedThoughtsRef.current = {};
    };
  }, [doSave, flushPendingEditedThoughts]);

  const handleABCSave = useCallback(
    async (data: ABCEntryData) => {
      const lines = [
        'Что произошло: ' + (data.happened || '—'),
        'Как отреагировали: ' + (data.reacted || '—'),
        'О чём подумали: ' + (data.thought || '—'),
      ];
      const content = `_TITLE_: ABC\n${lines.join('\n')}`;
      try {
        await saveThought({ content });
        invalidateAllThoughtsCache();
        await loadRecentThoughts();
      } catch (e) {
        console.error('[ABC] Save failed:', e);
      }
    },
    [loadRecentThoughts]
  );

  const handleProtocolSave = useCallback(
    async (data: ProtocolEntryData) => {
      const lines = [
        'Ситуация: ' + (data.situation || '—'),
        'Автоматическая мысль: ' + (data.automaticThought || '—'),
        'Эмоция: ' + (data.emotion || '—'),
        'Доказательства "за": ' + (data.evidenceFor || '—'),
        'Доказательства "против": ' + (data.evidenceAgainst || '—'),
        'Альтернативная мысль: ' + (data.alternativeThought || '—'),
      ];
      const content = `_TITLE_: Протокол мыслей\n${lines.join('\n')}`;
      try {
        await saveThought({ content });
        invalidateAllThoughtsCache();
        await loadRecentThoughts();
      } catch (e) {
        console.error('[Protocol] Save failed:', e);
      }
    },
    [loadRecentThoughts]
  );

  const handleAnxietyRealitySave = useCallback(
    async (data: AnxietyRealityEntryData) => {
      const lines = [
        'Ситуация: ' + (data.situation || '—'),
        'Что должно произойти?: ' + (data.whatShouldHappen || '—'),
        'Мой прогноз / Чего я боюсь?: ' + (data.myPrediction || '—'),
        'Уровень тревоги (0–10): ' + (data.anxietyLevel === '' ? '—' : String(data.anxietyLevel)),
        'Реальный результат: ' + (data.realResult || '—'),
        'Насколько прогноз оказался точным (0–100%): ' + (data.predictionAccuracy === '' ? '—' : `${data.predictionAccuracy}%`),
      ];
      const content = `_TITLE_: Тревога vs Реальность\n${lines.join('\n')}`;
      try {
        await saveThought({ content });
        invalidateAllThoughtsCache();
        await loadRecentThoughts();
      } catch (e) {
        console.error('[AnxietyReality] Save failed:', e);
      }
    },
    [loadRecentThoughts]
  );

  const handleBeliefsSave = useCallback(
    async (data: BeliefsEntryData) => {
      const lines = [
        'Повторяющаяся мысль: ' + (data.repeatingThought || '—'),
        'Что это говорит обо мне?: ' + (data.whatItSaysAboutMe || '—'),
        'Доказательства за: ' + (data.evidenceFor || '—'),
        'Доказательства против: ' + (data.evidenceAgainst || '—'),
        'Новое убеждение: ' + (data.newBelief || '—'),
      ];
      const content = `_TITLE_: Мои убеждения\n${lines.join('\n')}`;
      try {
        await saveThought({ content });
        invalidateAllThoughtsCache();
        await loadRecentThoughts();
      } catch (e) {
        console.error('[Beliefs] Save failed:', e);
      }
    },
    [loadRecentThoughts]
  );

  const handleThoughtDisputeSave = useCallback(
    async (data: ThoughtDisputeEntryData) => {
      const lines = [
        'Иррациональная мысль: ' + (data.irrationalThought || '—'),
        'Логический вопрос: ' + (data.logicalQuestion || '—'),
        'Эмпирический вопрос: ' + (data.empiricalQuestion || '—'),
        'Прагматический вопрос: ' + (data.pragmaticQuestion || '—'),
        'Рациональная альтернатива: ' + (data.rationalAlternative || '—'),
      ];
      const content = `_TITLE_: Спор с мыслью\n${lines.join('\n')}`;
      try {
        await saveThought({ content });
        invalidateAllThoughtsCache();
        await loadRecentThoughts();
      } catch (e) {
        console.error('[ThoughtDispute] Save failed:', e);
      }
    },
    [loadRecentThoughts]
  );

  const handleSoftenRequirementsSave = useCallback(
    async (data: SoftenRequirementsEntryData) => {
      const lines = [
        'Жесткое требование: ' + (data.rigidRequirement || '—'),
        'Почему я считаю, что это обязательно?: ' + (data.whyMandatory || '—'),
        'Рациональное предпочтение: ' + (data.rationalPreference || '—'),
        'Новая мысль: ' + (data.newThought || '—'),
      ];
      const content = `_TITLE_: Смягчение требований\n${lines.join('\n')}`;
      try {
        await saveThought({ content });
        invalidateAllThoughtsCache();
        await loadRecentThoughts();
      } catch (e) {
        console.error('[SoftenRequirements] Save failed:', e);
      }
    },
    [loadRecentThoughts]
  );

  const handleResilienceTrainingSave = useCallback(
    async (data: ResilienceTrainingEntryData) => {
      const lines = [
        'Ситуация: ' + (data.situation || '—'),
        'Мысль: ' + (data.thought || '—'),
        'Факты: ' + (data.facts || '—'),
        'Рациональная мысль: ' + (data.rationalThought || '—'),
      ];
      const content = `_TITLE_: Тренировка стойкости\n${lines.join('\n')}`;
      try {
        await saveThought({ content });
        invalidateAllThoughtsCache();
        await loadRecentThoughts();
      } catch (e) {
        console.error('[ResilienceTraining] Save failed:', e);
      }
    },
    [loadRecentThoughts]
  );

  const handleReactionControlSave = useCallback(
    async (data: ReactionControlEntryData) => {
      const lines = [
        'Дата: ' + (data.date || '—'),
        'Триггер: ' + (data.trigger || '—'),
        'Эмоции: ' + (data.emotions || '—') + (data.intensity !== '' ? ' (интенсивность ' + data.intensity + '/10)' : ''),
        'Импульс: ' + (data.impulse || '—'),
        'Поведение: ' + (data.behavior || '—'),
        'Навык ДПТ: ' + (data.dbtSkill || '—'),
        'Результат: ' + (data.result || '—'),
      ];
      const content = `_TITLE_: Контроль реакции\n${lines.join('\n')}`;
      try {
        await saveThought({ content });
        invalidateAllThoughtsCache();
        await loadRecentThoughts();
      } catch (e) {
        console.error('[ReactionControl] Save failed:', e);
      }
    },
    [loadRecentThoughts]
  );

  const now = new Date();
  const displayDay = getDisplayDay(now);
  const dateKey = getDateKey(displayDay);

  const sortedThoughts = useMemo(() => {
    const filtered = recentThoughts.filter((t) => {
      const id = getThoughtId(t);
      if (id === activeThoughtId) return false;
      const text = formatThoughtContentForDisplay(t.content || '');
      return text.trim().length > 0;
    });
    const order = orderOverride[dateKey] || [];
    const thoughtMap = new Map(filtered.map((t) => [getThoughtId(t), t]));
    const thoughtIds = new Set(thoughtMap.keys());
    let orderFiltered = order.filter((id) => thoughtIds.has(id));
    const byTime = [...filtered].sort((a, b) => getThoughtTimestamp(a) - getThoughtTimestamp(b));
    for (const t of byTime) {
      const id = getThoughtId(t);
      if (!orderFiltered.includes(id)) orderFiltered.push(id);
    }
    const pinnedSet = new Set(pinnedIds);
    const pinned = orderFiltered.filter((id) => pinnedSet.has(id));
    const rest = orderFiltered.filter((id) => !pinnedSet.has(id));
    return [...pinned, ...rest].map((id) => thoughtMap.get(id)!).filter(Boolean) as Thought[];
  }, [recentThoughts, activeThoughtId, pinnedIds, orderOverride, dateKey]);

  const handleDeleteBlock = useCallback(
    async (id: number) => {
      try {
        await deleteThought(id);
        invalidateAllThoughtsCache();
        setRecentThoughts((prev) => prev.filter((t) => getThoughtId(t) !== id));
        setPinnedIds((prev) => prev.filter((x) => x !== id));
        setOrderOverride((prev) => {
          const next = { ...prev };
          if (next[dateKey]) next[dateKey] = next[dateKey].filter((x) => x !== id);
          return next;
        });
      } catch (e) {
        console.error('[DailyJournal] Delete block failed:', e);
      }
    },
    [dateKey]
  );

  const handlePin = useCallback((id: number) => {
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const moveBlock = useCallback(
    (id: number, direction: 1 | -1) => {
      const list = sortedThoughts.map((t) => getThoughtId(t));
      const i = list.indexOf(id);
      if (i < 0 || (direction < 0 && i === 0) || (direction > 0 && i === list.length - 1)) return;
      const j = i + direction;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      setOrderOverride((prev) => ({ ...prev, [dateKey]: next }));
    },
    [dateKey, sortedThoughts]
  );

  const moveBlockToIndex = useCallback(
    (id: number, targetIndex: number) => {
      const list = sortedThoughts.map((t) => getThoughtId(t));
      const currentIndex = list.indexOf(id);
      if (currentIndex < 0 || currentIndex === targetIndex) return;
      const next = [...list];
      next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, id);
      setOrderOverride((prev) => ({ ...prev, [dateKey]: next }));
    },
    [dateKey, sortedThoughts]
  );

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDragTargetRef = useRef<number>(0);
  const didLongPressRef = useRef(false);

  const handleBlockPointerDown = useCallback(
    (id: number, index: number) => (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      didLongPressRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        lastDragTargetRef.current = index;
        didLongPressRef.current = true;
        setDraggingId(id);
      }, 400);
    },
    []
  );

  const handleBlockPointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setDraggingId(null);
  }, []);

  const handleBlockPointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setDraggingId(null);
  }, []);

  useEffect(() => {
    if (draggingId === null) return;
    const listEl = thoughtsListRef.current;
    const handlePointerMove = (e: PointerEvent) => {
      if (!listEl) return;
      const clientY = e.clientY;
      const children = listEl.children;
      const count = sortedThoughts.length;
      let targetIndex = 0;
      for (let i = 0; i < count; i++) {
        const cellIndex = i * 2 + 1;
        if (cellIndex >= children.length) break;
        const rect = (children[cellIndex] as HTMLElement).getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
          targetIndex = i;
          break;
        }
        if (clientY < rect.top) {
          targetIndex = i;
          break;
        }
        targetIndex = i + 1;
      }
      if (targetIndex > count - 1) targetIndex = count - 1;
      if (targetIndex !== lastDragTargetRef.current) {
        lastDragTargetRef.current = targetIndex;
        moveBlockToIndex(draggingId, targetIndex);
      }
    };
    const handlePointerUp = () => {
      setDraggingId(null);
    };
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [draggingId, moveBlockToIndex, sortedThoughts.length]);

  // --- Render ---

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center transition-colors duration-300 reader-surface">
        <div className="w-8 h-8 border-3 border-gray-200 dark:border-white/30 border-t-black dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 transition-colors duration-300 journal-dots bg-white reader-surface">
      <div className="max-w-2xl mx-auto px-6 pt-10">
        {/* Date header: дата + Liquid Glass меню (Framer Motion) — типографика из настроек чтения */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="reader-prose">
            <p className="text-lg font-semibold italic text-gray-900 dark:glass-text-secondary transition-colors">
              {formatMonthNominative(displayDay)}, {displayDay.getDate()}
            </p>
            <h1 className="text-4xl font-black text-gray-900 dark:glass-text-primary transition-colors leading-tight">
              {formatDayOfWeek(displayDay)}
            </h1>
          </div>
          <LiquidGlassMenu onABCClick={() => setShowABCCard(true)} onProtocolClick={() => setShowProtocolCard(true)} onAnxietyRealityClick={() => setShowAnxietyRealityCard(true)} onBeliefsClick={() => setShowBeliefsCard(true)} onThoughtDisputeClick={() => setShowThoughtDisputeCard(true)} onSoftenRequirementsClick={() => setShowSoftenRequirementsCard(true)} onResilienceTrainingClick={() => setShowResilienceTrainingCard(true)} onReactionControlClick={() => setShowReactionControlCard(true)} />
        </header>

        {/* Карточка ABC — появляется по нажатию ABC в меню */}
        <ABCEntryCard
          isOpen={showABCCard}
          onClose={() => setShowABCCard(false)}
          onSave={handleABCSave}
        />

        {/* Карточка Протокол мыслей — по нажатию в меню */}
        <ProtocolEntryCard
          isOpen={showProtocolCard}
          onClose={() => setShowProtocolCard(false)}
          onSave={handleProtocolSave}
        />

        {/* Карточка Тревога vs Реальность — по нажатию в меню */}
        <AnxietyRealityEntryCard
          isOpen={showAnxietyRealityCard}
          onClose={() => setShowAnxietyRealityCard(false)}
          onSave={handleAnxietyRealitySave}
        />

        <BeliefsEntryCard
          isOpen={showBeliefsCard}
          onClose={() => setShowBeliefsCard(false)}
          onSave={handleBeliefsSave}
        />

        <ThoughtDisputeEntryCard
          isOpen={showThoughtDisputeCard}
          onClose={() => setShowThoughtDisputeCard(false)}
          onSave={handleThoughtDisputeSave}
        />

        <SoftenRequirementsEntryCard
          isOpen={showSoftenRequirementsCard}
          onClose={() => setShowSoftenRequirementsCard(false)}
          onSave={handleSoftenRequirementsSave}
        />

        <ResilienceTrainingEntryCard
          isOpen={showResilienceTrainingCard}
          onClose={() => setShowResilienceTrainingCard(false)}
          onSave={handleResilienceTrainingSave}
        />

        <ReactionControlEntryCard
          isOpen={showReactionControlCard}
          onClose={() => setShowReactionControlCard(false)}
          onSave={handleReactionControlSave}
        />

        {/* Блок записей — сетка: фиксированная колонка буллета, ровное выравнивание контента */}
        <div className="grid grid-cols-[1.25rem_1fr] gap-x-3 gap-y-4 items-start max-w-full" ref={thoughtsListRef}>
        {sortedThoughts.map((thought, index) => {
            const id = getThoughtId(thought);
            const displayText = formatThoughtContentForDisplay(thought.content || '');
            const time = getThoughtDisplayTime(thought);
            const editStatus = editSaveStatuses[id] || 'idle';
            const isPinned = pinnedIds.includes(id);
            const isDragging = draggingId === id;
            return (
              <React.Fragment key={id}>
                <span className="pt-[0.35rem] text-gray-500 dark:text-gray-400 text-base leading-none select-none" aria-hidden>•</span>
                <div
                  className={`group relative flex flex-col gap-0.5 rounded-lg -mx-2 px-2 py-1 border transition-all touch-none dark:glass-thought-block dark:mx-0 dark:px-3 dark:py-2 ${isDragging ? 'border-[#E95D2C] dark:border-[#E95D2C] shadow-lg opacity-95 scale-[0.99]' : 'border-transparent hover:border-gray-200 dark:hover:border-white/10'}`}
                  onPointerDown={handleBlockPointerDown(id, index)}
                  onPointerUp={handleBlockPointerUp}
                  onPointerLeave={handleBlockPointerCancel}
                  onClick={onThoughtClick ? (e) => {
                    if (didLongPressRef.current) {
                      didLongPressRef.current = false;
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    onThoughtClick(thought);
                  } : undefined}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-gray-400 dark:glass-text-muted flex-shrink-0">
                      {time || ''}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handlePin(id); }}
                        className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-[#E95D2C] dark:hover:text-[#E95D2C]"
                        title={isPinned ? 'Открепить' : 'Закрепить сверху'}
                        aria-label={isPinned ? 'Открепить' : 'Закрепить'}
                      >
                        <Pin size={14} className={isPinned ? 'fill-current' : ''} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteBlock(id); }}
                        className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
                        title="Удалить блок"
                        aria-label="Удалить"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div
                    role={onThoughtClick ? 'button' : undefined}
                    className={onThoughtClick ? 'cursor-pointer' : ''}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        value={displayText}
                        onChange={(e) => handleExistingThoughtChange(id, e.target.value)}
                        className="thought-textarea reader-prose w-full min-w-0 bg-transparent text-base leading-relaxed text-gray-800 dark:glass-text-secondary resize-none outline-none border-none overflow-visible transition-colors min-h-[60px] py-0 px-0 text-left"
                        style={{ fontFamily: 'inherit' }}
                        rows={Math.max(2, displayText.split('\n').length)}
                      />
                      {editStatus !== 'idle' && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">
                          {editStatus === 'saving' && (
                            <>
                              <div className="w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                              <span>...</span>
                            </>
                          )}
                          {editStatus === 'saved' && (
                            <>
                              <Check size={12} />
                              <span>✓</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

        {/* Поле новой записи — буллет и контент в тех же колонках сетки */}
        <span className="pt-[0.35rem] text-gray-500 dark:text-gray-400 text-base leading-none select-none" aria-hidden>•</span>
        <div className="relative flex flex-col min-w-0">
          <textarea
            ref={textareaRef}
            value={currentText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Пишите здесь..."
            className="reader-prose w-full min-w-0 bg-transparent text-base leading-relaxed text-gray-900 dark:glass-text-primary placeholder-gray-300 dark:placeholder-white/40 resize-none outline-none border-none overflow-y-auto transition-colors min-h-[120px] py-0 px-0 text-left"
            rows={1}
          />
          {saveStatus !== 'idle' && (
            <div className="absolute -top-6 right-0 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 transition-opacity">
              {saveStatus === 'saving' && (
                <>
                  <div className="w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>Сохранение...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check size={12} />
                  <span>Сохранено</span>
                </>
              )}
            </div>
          )}
        </div>
        </div>

      </div>
    </div>
  );
};
