/**
 * Утилиты для работы с датами мыслей.
 *
 * Бэкенд хранит LOCAL time пользователя, но может отдавать строку
 * с суффиксом «Z» или «+03:00». Если передать такую строку напрямую
 * в `new Date(...)`, JS интерпретирует её как UTC и пересчитает
 * в локальную зону — из-за чего дата сдвигается на размер offset.
 *
 * Поэтому перед созданием `Date` мы ВСЕГДА обрезаем индикатор
 * часового пояса, чтобы дата трактовалась как «local time».
 */

/**
 * Парсит ISO-строку даты, отбрасывая часовой пояс (Z / ±HH:MM).
 * Результат — объект Date в локальной зоне браузера, соответствующий
 * тому «настенному времени», которое хранит сервер.
 *
 * Возвращает `null`, если строка пустая или невалидная.
 */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value || !value.trim()) return null;
  let s = value.trim().replace(' ', 'T');
  // Убираем суффикс Z и/или смещение ±HH:MM (±HHMM тоже)
  s = s.replace(/[Zz]$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
  const date = new Date(s);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Возвращает timestamp (ms) для сортировки/сравнения.
 * Аналог `Date.getTime()`, но с правильным парсингом local-time.
 */
export function getLocalTimestamp(value: string | null | undefined): number {
  const d = parseLocalDate(value);
  return d ? d.getTime() : 0;
}
