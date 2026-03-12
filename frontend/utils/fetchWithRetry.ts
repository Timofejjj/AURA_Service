/**
 * Утилита для выполнения fetch запросов с ретраями, таймаутами и кэшированием
 * Оптимизирована для работы при слабом интернете
 */

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number; // Time to live в миллисекундах
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

// Простое in-memory кэширование
const cache = new Map<string, CacheEntry>();

// Очистка устаревших записей кэша каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Создает ключ кэша из URL и опций
 */
function createCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  return `${method}:${url}:${body}`;
}

/**
 * Задержка перед повторной попыткой
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Выполняет fetch с таймаутом
 */
function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
    )
  ]);
}

/**
 * Выполняет fetch запрос с ретраями, таймаутом и кэшированием
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = 30000, // 30 секунд по умолчанию
    retries = 3,
    retryDelay = 1000, // 1 секунда между попытками
    cache: useCache = false,
    cacheTTL = 5 * 60 * 1000, // 5 минут по умолчанию
    ...fetchOptions
  } = options;

  // Проверяем кэш для GET запросов
  if (useCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
    const cacheKey = createCacheKey(url, fetchOptions);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      // Возвращаем кэшированный ответ как Response объект
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        statusText: 'OK (cached)',
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions, timeout);

      // Кэшируем успешные GET запросы
      if (useCache && response.ok && (!fetchOptions.method || fetchOptions.method === 'GET')) {
        try {
          const data = await response.clone().json();
          const cacheKey = createCacheKey(url, fetchOptions);
          cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            ttl: cacheTTL
          });
        } catch (e) {
          // Если не JSON, не кэшируем
        }
      }

      return response;
    } catch (error: any) {
      lastError = error;

      // Не повторяем для последней попытки
      if (attempt < retries) {
        // Экспоненциальная задержка: 1s, 2s, 4s...
        const delayTime = retryDelay * Math.pow(2, attempt);
        console.warn(`[fetchWithRetry] Attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`, error.message);
        await delay(delayTime);
      }
    }
  }

  throw lastError || new Error('Request failed after all retries');
}

/**
 * Очищает кэш
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Очищает кэш для конкретного URL
 */
export function clearCacheForUrl(url: string, options?: RequestInit): void {
  const cacheKey = createCacheKey(url, options);
  cache.delete(cacheKey);
}

