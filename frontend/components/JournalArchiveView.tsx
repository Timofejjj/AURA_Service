import React, { useState, useEffect, useCallback } from 'react';
import { fetchAllThoughts } from '../services/api';
import { Thought } from '../types';
import { parseLocalDate, getLocalTimestamp } from '../utils/dateUtils';

interface JournalArchiveViewProps {
  userId: number;
  onDayClick?: (dateKey: string, thoughts: Thought[]) => void;
}

function formatMonthNominative(month: number): string {
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];
  return months[month];
}

function formatDayOfWeek(date: Date): string {
  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  return days[date.getDay()];
}

/** Убирает маркер __TITLE__: из content для читаемого отображения */
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

interface DayGroup {
  dateKey: string; // "2026-02-13"
  date: Date;
  thoughts: Thought[];
}

export const JournalArchiveView: React.FC<JournalArchiveViewProps> = ({ userId, onDayClick }) => {
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadArchive = useCallback(async () => {
    try {
      const all = await fetchAllThoughts(userId);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();

      // Архив: все мысли до начала текущего календарного дня (00:00 local)
      const archived = all.filter((t) => {
        const ts = getLocalTimestamp(t.created_at);
        return ts > 0 && ts < todayStart;
      });

      // Group by date (local time)
      const groupMap = new Map<string, Thought[]>();
      for (const t of archived) {
        const d = parseLocalDate(t.created_at!);
        if (!d) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(t);
      }

      // Sort groups by date descending (newest first)
      const groups: DayGroup[] = Array.from(groupMap.entries())
        .map(([dateKey, thoughts]) => ({
          dateKey,
          date: new Date(dateKey + 'T00:00:00'),
          thoughts: thoughts.sort((a, b) => {
            const ta = getLocalTimestamp(a.created_at);
            const tb = getLocalTimestamp(b.created_at);
            return ta - tb; // oldest first within day
          }),
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      setDayGroups(groups);
    } catch (error) {
      console.error('[JournalArchive] Failed to load:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadArchive();
  }, [loadArchive]);

  // --- Автоматическое обновление в полночь ---
  useEffect(() => {
    const checkAndReloadAtMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      const timeoutId = setTimeout(() => {
        // В полночь: перезагружаем архив (вчерашние мысли теперь архивные)
        console.log('[JournalArchive] New day started, reloading archive...');
        loadArchive();
        
        // Запланировать следующую проверку через 24 часа
        checkAndReloadAtMidnight();
      }, msUntilMidnight);
      
      return timeoutId;
    };
    
    const timeoutId = checkAndReloadAtMidnight();
    return () => clearTimeout(timeoutId);
  }, [loadArchive]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center transition-colors duration-300 reader-surface">
        <div className="w-8 h-8 border-3 border-gray-200 dark:border-gray-700 border-t-black dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (dayGroups.length === 0) {
    return (
      <div className="min-h-screen bg-white pb-32 transition-colors duration-300 reader-surface">
        <div className="max-w-2xl mx-auto px-6 pt-10 reader-prose">
          <h1 className="text-3xl font-black text-gray-900 dark:text-dark-text-primary mb-4 transition-colors">
            Записи
          </h1>
          <p className="text-gray-400 dark:text-gray-500 text-base">
            Здесь появятся ваши записи предыдущих дней
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32 transition-colors duration-300 reader-surface">
      <div className="max-w-2xl mx-auto px-6 pt-10 reader-prose">
        {dayGroups.map((group) => (
          <div
            key={group.dateKey}
            className="mb-10 cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => onDayClick?.(group.dateKey, group.thoughts)}
          >
            {/* Date header */}
            <p className="text-lg font-semibold italic text-gray-900 dark:text-dark-text-primary transition-colors">
              {formatMonthNominative(group.date.getMonth())}, {group.date.getDate()}
            </p>
            <h2 className="text-3xl font-black text-gray-900 dark:text-dark-text-primary mb-4 transition-colors leading-tight">
              {formatDayOfWeek(group.date)}
            </h2>

            {/* Превью записей дня */}
            <div className="space-y-2">
              {group.thoughts.slice(0, 3).map((thought) => {
                const id = thought.thought_id || thought.ThoughtID || thought.id || 0;
                const displayText = formatThoughtContentForDisplay(thought.content || '');
                const preview = displayText.length > 100 ? displayText.substring(0, 100) + '...' : displayText;
                return (
                  <div key={id} className="flex items-start gap-2">
                    <div className="mt-2 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-dark-text-muted transition-colors">
                      {preview}
                    </p>
                  </div>
                );
              })}
              {group.thoughts.length > 3 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 pl-3">
                  +{group.thoughts.length - 3} ещё...
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
