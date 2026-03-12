/**
 * Оптимизированная обертка для fetch запросов
 * Использует fetchWithRetry с оптимальными настройками для разных типов запросов
 */

import { fetchWithRetry, FetchOptions } from './fetchWithRetry';

export interface OptimizedFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Выполняет GET запрос с оптимизациями для слабого интернета
 */
export async function optimizedGet(
  url: string,
  options: OptimizedFetchOptions = {}
): Promise<Response> {
  const {
    priority = 'medium',
    timeout = priority === 'high' ? 15000 : priority === 'medium' ? 20000 : 30000,
    retries = priority === 'high' ? 3 : 2,
    cache = true,
    cacheTTL = 60000, // 1 минута по умолчанию
    ...fetchOptions
  } = options;

  return fetchWithRetry(url, {
    method: 'GET',
    ...fetchOptions,
    timeout,
    retries,
    cache,
    cacheTTL
  });
}

/**
 * Выполняет POST/PUT/DELETE запрос с оптимизациями
 */
export async function optimizedMutate(
  url: string,
  options: OptimizedFetchOptions & { method: 'POST' | 'PUT' | 'DELETE' }
): Promise<Response> {
  const {
    timeout = 20000,
    retries = 2,
    cache = false, // Не кэшируем мутации
    ...fetchOptions
  } = options;

  return fetchWithRetry(url, {
    ...fetchOptions,
    timeout,
    retries,
    cache
  });
}

