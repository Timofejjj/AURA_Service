import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { fetchAllThoughts, saveThought, deleteThought, invalidateAllThoughtsCache } from '../services/api';
import { Thought } from '../types';
import { parseLocalDate, getLocalTimestamp } from '../utils/dateUtils';

interface DayDetailViewProps {
  userId: number;
  dateKey: string; // "2026-02-12"
  initialThoughts?: Thought[] | null; // переданные с архива — без повторной загрузки
  onBack: () => void;
  onThoughtClick?: (thought: Thought) => void;
}

function formatMonthNominative(month: number): string {
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];
  return months[month];
}

function formatDayOfWeekShort(date: Date): string {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[date.getDay()];
}

/** Убирает маркер __TITLE__: из content */
function cleanContent(raw: string): string {
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

export const DayDetailView: React.FC<DayDetailViewProps> = ({ userId, dateKey, initialThoughts, onBack, onThoughtClick }) => {
  const [thoughts, setThoughts] = useState<Thought[]>(initialThoughts ?? []);
  const [isLoading, setIsLoading] = useState(!initialThoughts);
  const [newEntryText, setNewEntryText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const editTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const listRef = useRef<HTMLDivElement>(null);

  const date = new Date(dateKey + 'T00:00:00');
  const dayOfWeek = formatDayOfWeekShort(date);
  const monthName = formatMonthNominative(date.getMonth());
  const day = date.getDate();

  const loadThoughts = useCallback(async () => {
    try {
      const all = await fetchAllThoughts(userId, true);
      const filtered = all.filter((t) => {
        if (!t.created_at) return false;
        const d = parseLocalDate(t.created_at);
        if (!d) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key === dateKey;
      });
      const sorted = filtered.sort((a, b) => {
        const ta = getLocalTimestamp(a.created_at);
        const tb = getLocalTimestamp(b.created_at);
        return ta - tb;
      });
      setThoughts(sorted);
    } catch (e) {
      console.error('[DayDetailView] Failed to load:', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, dateKey]);

  useEffect(() => {
    if (initialThoughts != null) return;
    loadThoughts();
  }, [initialThoughts, loadThoughts]);

  // Добавить новую запись (с датой текущего просматриваемого дня)
  const handleAddEntry = async () => {
    if (!newEntryText.trim()) return;
    setIsSaving(true);
    try {
      console.log(`[DayDetailView] Adding entry for date: ${dateKey}, content: ${newEntryText.trim().substring(0, 50)}...`);
      const result = await saveThought({ content: newEntryText.trim(), date: dateKey });
      console.log('[DayDetailView] Entry saved successfully:', result);
      invalidateAllThoughtsCache();
      setNewEntryText('');
      await loadThoughts();
      console.log('[DayDetailView] Thoughts reloaded');
    } catch (e) {
      console.error('[DayDetailView] Failed to add entry:', e);
      alert(`Ошибка сохранения: ${e}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Удалить запись
  const handleDeleteThought = async (thoughtId: number) => {
    try {
      await deleteThought(thoughtId);
      invalidateAllThoughtsCache();
      setThoughts((prev) => prev.filter((t) => {
        const id = t.thought_id || t.ThoughtID || t.id;
        return id !== thoughtId;
      }));
    } catch (e) {
      console.error('[DayDetailView] Failed to delete:', e);
    }
  };

  // Редактирование существующей записи — только локальный стейт + отложенная отправка на сервер, БЕЗ перезагрузки списка
  const pendingEditsRef = useRef<Record<number, string>>({});

  const handleEditThought = useCallback((thoughtId: number, newText: string) => {
    if (editTimeoutsRef.current[thoughtId]) clearTimeout(editTimeoutsRef.current[thoughtId]);
    pendingEditsRef.current[thoughtId] = newText;

    setThoughts((prev) =>
      prev.map((t) => {
        const id = t.thought_id || t.ThoughtID || t.id;
        if (id === thoughtId) return { ...t, content: newText };
        return t;
      })
    );

    editTimeoutsRef.current[thoughtId] = setTimeout(async () => {
      const latestText = pendingEditsRef.current[thoughtId] ?? newText;
      delete pendingEditsRef.current[thoughtId];
      try {
        if (!latestText.trim()) {
          await deleteThought(thoughtId);
          invalidateAllThoughtsCache();
          setThoughts((prev) => prev.filter((t) => {
            const id = t.thought_id || t.ThoughtID || t.id;
            return id !== thoughtId;
          }));
        } else {
          await saveThought({ thought_id: thoughtId, content: latestText });
          invalidateAllThoughtsCache();
          // НЕ вызываем loadThoughts() — локальный стейт уже актуален, перезагрузка сбрасывает фокус и прыгает страница
        }
      } catch (e) {
        console.error('[DayDetailView] Save failed:', e);
      } finally {
        delete editTimeoutsRef.current[thoughtId];
      }
    }, 1500);
  }, []);

  // Flush pending edits при уходе со страницы (размонтирование)
  useEffect(() => {
    return () => {
      // Сохраняем все отложенные правки
      Object.entries(pendingEditsRef.current).forEach(([idStr, text]) => {
        const thoughtId = Number(idStr);
        if (!Number.isFinite(thoughtId)) return;
        if (editTimeoutsRef.current[thoughtId]) {
          clearTimeout(editTimeoutsRef.current[thoughtId]);
          delete editTimeoutsRef.current[thoughtId];
        }
        if (text.trim()) {
          void saveThought({ thought_id: thoughtId, content: text });
        } else {
          void deleteThought(thoughtId);
        }
        invalidateAllThoughtsCache();
      });
      pendingEditsRef.current = {};
      Object.values(editTimeoutsRef.current).forEach(clearTimeout);
      editTimeoutsRef.current = {};
    };
  }, []);

  // Подстройка высоты textarea под длинный текст, чтобы запись показывалась полностью
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.querySelectorAll<HTMLTextAreaElement>('textarea.day-detail-entry').forEach((el) => {
      el.style.height = 'auto';
      el.style.height = Math.max(24, el.scrollHeight) + 'px';
    });
  }, [thoughts]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center reader-surface">
        <div className="w-8 h-8 border-3 border-gray-200 dark:border-gray-700 border-t-black dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32 transition-colors duration-300 overflow-x-hidden reader-surface">
      <div className="max-w-2xl mx-auto px-6 pt-6 min-w-0 reader-prose">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors">
            <ArrowLeft size={24} className="text-gray-700 dark:text-dark-text-primary" />
          </button>
        </div>

        {/* Контент дня: клики по мыслям не должны всплывать (чтобы не срабатывал случайный возврат). */}
        <div className="mb-6" onClick={(e) => e.stopPropagation()}>
          <h1 className="text-3xl font-black text-gray-900 dark:text-dark-text-primary">
            {dayOfWeek}, {monthName} {day}
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            #{thoughts.length}
          </p>
        </div>

        {/* Список записей — буллеты как в Jurnalistic */}
        <div className="space-y-4 mb-6" ref={listRef} onClick={(e) => e.stopPropagation()}>
          {thoughts.map((thought) => {
            const id = thought.thought_id || thought.ThoughtID || thought.id || 0;
            const displayText = cleanContent(thought.content || '');
            return (
              <div
                key={id}
                role={onThoughtClick ? 'button' : undefined}
                className={`flex items-start gap-3 group ${onThoughtClick ? 'cursor-pointer rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary/50 active:opacity-90' : ''}`}
                onClick={onThoughtClick ? () => onThoughtClick(thought) : undefined}
              >
                {/* Буллет */}
                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
                
                {/* Текст — клик по тексту только редактирует (stopPropagation), клик по буллету/отступам открывает мысль */}
                <div className="flex-1 min-w-0 overflow-visible">
                  <div onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={displayText}
                      onChange={(e) => handleEditThought(id, e.target.value)}
                      className="day-detail-entry reader-prose w-full min-w-0 bg-transparent text-base leading-relaxed text-gray-800 dark:text-dark-text-secondary resize-none outline-none border-none overflow-visible break-words transition-colors py-0"
                      style={{ wordBreak: 'break-word' }}
                      rows={Math.max(1, displayText.split('\n').length)}
                    />
                  </div>
                </div>

                {/* Удалить — на мобильном скрыта и не перехватывает тапы (pointer-events-none), видна только при наведении на десктопе */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteThought(id); }}
                  className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary flex-shrink-0"
                >
                  <Trash2 size={16} className="text-gray-400 dark:text-gray-500" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Добавить новую запись — сохраняется по Enter или при потере фокуса */}
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <textarea
              value={newEntryText}
              onChange={(e) => setNewEntryText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddEntry();
                }
              }}
              onBlur={() => {
                if (newEntryText.trim()) handleAddEntry();
              }}
              placeholder="New bullet..."
              disabled={isSaving}
              className="reader-prose w-full min-w-0 bg-transparent text-base leading-relaxed text-gray-900 dark:text-dark-text-primary placeholder-gray-300 dark:placeholder-gray-600 resize-none outline-none border-none overflow-visible break-words transition-colors"
              style={{ wordBreak: 'break-word' }}
              rows={1}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
