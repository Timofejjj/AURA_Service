// Real API service
// This file contains all real API endpoints

import { UserProfile, JournalFolder, Thought, WeeklyReportMetadata, WeeklyReportData, SaveThoughtResponse, UploadVoiceResponse, UploadImageResponse, FolderDetailsResponse, RegistrationPayload, AuthResponse, LoginPayload, LoginResponse, OnboardingResponse, SaveThoughtPayload } from '../types';

// API Configuration - импортируем из config/api.ts
import { API_BASE_URL, ML_API_BASE_URL } from '../config/api';
import { fetchWithRetry } from '../utils/fetchWithRetry';

// --- Helper: Robust JWT Parser ---
function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error parsing JWT:", e);
        return null;
    }
}

// --- Token Refresh Logic ---
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Listeners waiting for token refresh to complete
let onRefreshCallbacks: Array<(success: boolean) => void> = [];

function getTokenExpiry(token: string): number | null {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return null;
  return payload.exp * 1000; // convert to ms
}

/**
 * Checks if the access token is expired or about to expire (within 60 seconds).
 */
function isTokenExpiredOrExpiring(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return Date.now() >= expiry - 60_000; // treat as expired 60s before actual expiry
}

/**
 * Calls POST /auth/refresh to get a new access + refresh token pair.
 * Returns true if refresh succeeded.
 */
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, piggyback on the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    console.warn('[refreshAccessToken] No refresh token found');
    return false;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      console.log('[refreshAccessToken] Attempting token refresh...');
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.warn(`[refreshAccessToken] Refresh failed with status ${response.status}`);
        return false;
      }

      const data = await response.json();
      const newAccessToken = data.access_token || data.AccessToken;
      const newRefreshToken = data.refresh_token || data.RefreshToken;

      if (newAccessToken) {
        localStorage.setItem('authToken', newAccessToken);
        console.log('[refreshAccessToken] Access token refreshed successfully');
      }
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }

      return !!newAccessToken;
    } catch (error) {
      console.error('[refreshAccessToken] Error during refresh:', error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
      // Notify all waiting callbacks
      onRefreshCallbacks.forEach(cb => cb(true));
      onRefreshCallbacks = [];
    }
  })();

  return refreshPromise;
}

// --- Helper for Auth Headers ---
const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('authToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Hard logout: clear all tokens and reload the page.
 * Only called when refresh token is also invalid/absent.
 */
const forceLogout = () => {
  console.warn('[API] forceLogout - clearing all tokens');
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('username');
  localStorage.removeItem('user_id');
  // Reload once to show login screen
  if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
    window.location.reload();
  }
};

/**
 * Handles 401 error: tries to refresh the token first.
 * If refresh fails, does a hard logout.
 */
let isHandling401 = false;
const handle401Error = async (): Promise<boolean> => {
  if (isHandling401) {
    // Wait for the ongoing handling to finish
    return new Promise(resolve => {
      onRefreshCallbacks.push(resolve);
    });
  }
  isHandling401 = true;

  try {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      console.log('[handle401Error] Token refreshed successfully, retrying...');
      isHandling401 = false;
      return true;
    }
    // Refresh failed — force logout
    forceLogout();
    isHandling401 = false;
    return false;
  } catch {
    forceLogout();
    isHandling401 = false;
    return false;
  }
};

/**
 * Wrapper around fetch that automatically handles 401 by refreshing the token
 * and retrying the request once.
 */
async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Check if token is about to expire, proactively refresh
  const token = localStorage.getItem('authToken');
  if (token && isTokenExpiredOrExpiring(token)) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      forceLogout();
      throw new Error('Unauthorized - token refresh failed');
    }
  }

  // First attempt with current (or freshly refreshed) token
  const headers = getAuthHeaders();
  const mergedHeaders = { ...headers, ...(options.headers || {}) };
  let response = await fetch(url, { ...options, headers: mergedHeaders });

  // If 401, attempt refresh and retry once
  if (response.status === 401) {
    const refreshed = await handle401Error();
    if (refreshed) {
      const retryHeaders = getAuthHeaders();
      const mergedRetryHeaders = { ...retryHeaders, ...(options.headers || {}) };
      response = await fetch(url, { ...options, headers: mergedRetryHeaders });
      if (response.status === 401) {
        forceLogout();
        throw new Error('Unauthorized - token still invalid after refresh');
      }
    } else {
      throw new Error('Unauthorized - token expired');
    }
  }

  return response;
}

/**
 * Same as authedFetch but goes through fetchWithRetry for retries/timeout/cache.
 */
async function authedFetchWithRetry(url: string, options: any = {}): Promise<Response> {
  // Proactive refresh if token is expiring
  const token = localStorage.getItem('authToken');
  if (token && isTokenExpiredOrExpiring(token)) {
    await refreshAccessToken();
  }

  const headers = getAuthHeaders();
  const mergedHeaders = { ...headers, ...(options.headers || {}) };
  let response = await fetchWithRetry(url, { ...options, headers: mergedHeaders });

  // If 401, attempt refresh and retry once
  if (response.status === 401) {
    const refreshed = await handle401Error();
    if (refreshed) {
      const retryHeaders = getAuthHeaders();
      const mergedRetryHeaders = { ...retryHeaders, ...(options.headers || {}) };
      response = await fetchWithRetry(url, { ...options, headers: mergedRetryHeaders });
    }
  }

  return response;
}

// --- Background proactive token refresh ---
// Refresh the access token 2 minutes before it expires, checking every 60 seconds.
setInterval(async () => {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  const expiry = getTokenExpiry(token);
  if (!expiry) return;
  const timeLeft = expiry - Date.now();
  // If less than 2 minutes left, refresh proactively
  if (timeLeft > 0 && timeLeft < 2 * 60 * 1000) {
    console.log(`[proactiveRefresh] Token expires in ${Math.round(timeLeft / 1000)}s, refreshing...`);
    await refreshAccessToken();
  }
}, 60_000);

// Export for use in MainApp
export { refreshAccessToken, isTokenExpiredOrExpiring };

// Helper to get user_id from token (decode JWT)
const getUserIdFromToken = (): number | null => {
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  
  const payload = parseJwt(token);
  if (!payload) return null;

  // Backend uses 'uid' in JWT token (from token_makers.go)
  const id = payload.uid || payload.sub || payload.user_id || payload.userId || payload.id || payload.UserID;
  return id ? Number(id) : null;
};

// Helper: user-friendly message for network errors
const getNetworkErrorMessage = (): string =>
  'Не удалось подключиться к серверу. Убедитесь, что Backend запущен (http://localhost:8080).';

// 0. Registration (Auth)
export const registerUser = async (payload: RegistrationPayload): Promise<AuthResponse> => {
  try {
    const url = `${API_BASE_URL}/auth/register`;
    console.log('[registerUser] Using API URL:', API_BASE_URL);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: payload.username || payload.email?.split('@')[0] || '',
        email: payload.email || `${payload.username}@aura.local`,
        password: payload.password
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Ошибка регистрации' }));
      const errorMessage = errorData.error || errorData.message || 'Ошибка регистрации';
      throw new Error(errorMessage);
    }
    return { status: "success", message: "User created" };
  } catch (error) {
    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('fetch'))) {
      throw new Error(getNetworkErrorMessage());
    }
    console.error("API Error registerUser:", error);
    throw error;
  }
};

// 0.1 Login (Auth)
export const loginUser = async (payload: LoginPayload): Promise<LoginResponse> => {
  try {
    let email = payload.email;
    if (!email && payload.username) {
      email = payload.username.includes('@') ? payload.username : `${payload.username}@aura.local`;
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: payload.password
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Ошибка входа' }));
      throw new Error(errorData.error || errorData.message || 'Неверный логин или пароль');
    }
    
    const data = await response.json();
    console.log("Login Response form Server:", data);

    // Check ALL possible names for the token
    const token = data.token || data.access_token || data.AccessToken;

    if (token) {
      localStorage.setItem('authToken', token);
      if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token);
      }
      if (data.username) {
        localStorage.setItem('username', data.username);
      }
      if (data.user_id) {
        localStorage.setItem('user_id', String(data.user_id));
      }
    } else {
      console.error("Token keys missing. Got:", Object.keys(data));
      throw new Error("Server returned success but no token found");
    }

    return {
      access_token: token,
      token_type: "bearer",
      username: data.username,
      user_id: data.user_id || data.UserID
    };
  } catch (error) {
    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('fetch'))) {
      throw new Error(getNetworkErrorMessage());
    }
    console.error("API Error loginUser:", error);
    throw error;
  }
};

// 0.1 Check if user has completed onboarding
export const checkOnboardingStatus = async (userId: number): Promise<boolean> => {
  try {
    const response = await authedFetch(`${API_BASE_URL}/api/ai-settings`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return !!(data.words_for_prompt && data.words_for_prompt.trim().length > 0);
  } catch (error) {
    console.error("API Error checkOnboardingStatus:", error);
    return false;
  }
};

// 0.2 Submit Onboarding Tags
export const submitOnboardingTags = async (userId: number, words: string[]): Promise<OnboardingResponse> => {
  try {
    const wordsText = words.join(', ');
    
    const response = await authedFetch(`${API_BASE_URL}/api/ai-settings`, {
      method: 'PUT',
      body: JSON.stringify({
        user_id: userId,
        words_for_prompt: wordsText
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[submitOnboardingTags] Failed to save: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to save settings: ${response.status}`);
    }
    
    await response.json();
    
    return {
      status: "success",
      message: "Settings saved successfully",
      user_id: userId
    };
  } catch (error) {
    console.error("API Error submitOnboardingTags:", error);
    throw error;
  }
};

// 1. Fetch User Profile
export const fetchUserProfile = async (): Promise<UserProfile> => {
  let token = localStorage.getItem('authToken');
  
  // If no token or it's expired, try to refresh
  if (!token) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw new Error('No auth token found');
    }
    token = localStorage.getItem('authToken');
  } else if (isTokenExpiredOrExpiring(token)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      token = localStorage.getItem('authToken');
    } else {
      throw new Error('Token expired and refresh failed');
    }
  }

  if (!token) throw new Error('No auth token found');

  const payload = parseJwt(token);
  if (!payload) {
    throw new Error('Invalid token format');
  }

  const userId = payload.uid || payload.sub || payload.user_id || payload.userId || payload.id || payload.UserID;

  if (!userId) {
    throw new Error(`No user ID found in token. Available keys: ${Object.keys(payload).join(', ')}`);
  }
  const storedName = localStorage.getItem('username');
  return {
    id: Number(userId),
    firstName: storedName || payload.username || payload.name || payload.firstName || 'User',
    lastName: payload.lastName || '',
  };
};

// 2. Fetch Energy Level
export const fetchEnergyLevel = async (userId: number): Promise<number | null> => {
  try {
    const response = await fetchWithRetry(`${ML_API_BASE_URL}/api/mind-score?user_id=${userId}`, {
      timeout: 10000, // 10 секунд для ML запросов
      retries: 2,
      cache: true,
      cacheTTL: 60000 // Кэшируем на 1 минуту
    });
    
    if (!response.ok) {
      console.warn(`Mind score API returned ${response.status}`);
      return null; // No data available
    }
    
    const data = await response.json();
    
    // Если energy_level есть в ответе и это число, используем его
    if (typeof data.energy_level === 'number') {
      // Округляем до целого числа (как отображается в UI)
      return Math.round(data.energy_level);
    }
    
    // Если energy_level отсутствует (null) - нет данных
    return null;
    
  } catch (error) {
    console.warn("Could not fetch energy level:", error);
    return null; // No data available on error
  }
};

// Helper function to generate consistent hex color
const generateColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 65;
  const lightness = 55;
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 1/6) { r = c; g = x; b = 0; }
  else if (h < 2/6) { r = x; g = c; b = 0; }
  else if (h < 3/6) { r = 0; g = c; b = x; }
  else if (h < 4/6) { r = 0; g = x; b = c; }
  else if (h < 5/6) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// 3. Fetch Journal Folders
export const fetchJournalFolders = async (userId: number): Promise<JournalFolder[]> => {
  try {
    const response = await authedFetchWithRetry(`${API_BASE_URL}/api/thoughts?user_id=${userId}&limit=1000`, {
      method: 'GET',
      timeout: 15000,
      retries: 2,
      cache: true,
      cacheTTL: 30000
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[fetchJournalFolders] Response not OK: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to fetch thoughts: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log(`[fetchJournalFolders] Raw response from backend:`, responseData);
    
    // Handle null or undefined responses
    if (!responseData) {
      console.warn(`[fetchJournalFolders] Response is null or undefined, returning empty array`);
      return [];
    }
    
    // Handle both array and object responses
    const thoughts: Thought[] = Array.isArray(responseData) ? responseData : (responseData?.thoughts || []);
    
    if (!Array.isArray(thoughts)) {
      console.error(`[fetchJournalFolders] Invalid response format. Expected array, got:`, typeof thoughts, thoughts);
      return [];
    }
    
    console.log(`[fetchJournalFolders] Received ${thoughts.length} thoughts from backend`);
    const thoughtsWithType = thoughts.filter(t => t.type_thought);
    console.log(`[fetchJournalFolders] Thoughts with type_thought: ${thoughtsWithType.length}`);
    if (thoughtsWithType.length > 0) {
      console.log(`[fetchJournalFolders] Sample thoughts with type:`, thoughtsWithType.slice(0, 3).map(t => ({
        id: t.thought_id || t.ThoughtID || t.id,
        type_thought: t.type_thought,
        content: t.content?.substring(0, 50)
      })));
    }
    
    // ОПТИМИЗАЦИЯ: Используем цикл for вместо forEach для лучшей производительности
    const folderMap = new Map<string, { count: number; color: string }>();
    
    for (let i = 0; i < thoughts.length; i++) {
      const thought = thoughts[i];
      const type = thought.type_thought || (thought as any).TypeThought || (thought as any).typeThought;
      if (!type) continue; // Пропускаем мысли без type_thought
      
      const current = folderMap.get(type);
      if (current) {
        folderMap.set(type, { count: current.count + 1, color: current.color });
      } else {
        folderMap.set(type, { count: 1, color: generateColorFromString(type) });
      }
    }
    
    const folders: JournalFolder[] = Array.from(folderMap.entries())
      .map(([id, data]) => ({
        id,
        title: id,
        count: data.count,
        color_hex: data.color
      }))
      .sort((a, b) => b.count - a.count);
      // Removed .slice(0, 5) to show ALL folders, not just top 5
    
    return folders;
  } catch (error) {
    console.error("API Error fetchJournalFolders:", error);
    throw error;
  }
};

// 3.5 Fetch All Folders (ОПТИМИЗИРОВАНО)
export const fetchAllFolders = async (userId: number): Promise<JournalFolder[]> => {
  try {
    const response = await authedFetchWithRetry(`${API_BASE_URL}/api/thoughts?user_id=${userId}&limit=1000`, {
      method: 'GET',
      timeout: 15000,
      retries: 2,
      cache: true,
      cacheTTL: 30000
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[fetchAllFolders] Response not OK: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to fetch thoughts: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    // Handle both array and object responses
    const thoughts: Thought[] = Array.isArray(responseData) ? responseData : (responseData.thoughts || []);
    
    if (!Array.isArray(thoughts)) {
      console.error(`[fetchAllFolders] Invalid response format. Expected array, got:`, typeof thoughts, thoughts);
      return [];
    }
    
    console.log(`[fetchAllFolders] Received ${thoughts.length} thoughts`);
    
    // Check how many thoughts have type_thought
    const thoughtsWithType = thoughts.filter(t => t.type_thought);
    console.log(`[fetchAllFolders] Thoughts with type_thought: ${thoughtsWithType.length} out of ${thoughts.length} total`);
    
    // ВАЖНО: НЕ запускаем анализ автоматически для всех мыслей!
    // Анализ запускается ТОЛЬКО при создании новой мысли через saveThought()
    // Это предотвращает массовые запросы к Gemini API
    
    // ОПТИМИЗАЦИЯ: Используем цикл for вместо forEach для лучшей производительности
    const folderMap = new Map<string, { count: number; color: string }>();
    
    for (let i = 0; i < thoughts.length; i++) {
      const thought = thoughts[i];
      const type = thought.type_thought || (thought as any).TypeThought || (thought as any).typeThought;
      if (!type) continue; // Пропускаем мысли без type_thought
      
      const current = folderMap.get(type);
      if (current) {
        folderMap.set(type, { count: current.count + 1, color: current.color });
      } else {
        folderMap.set(type, { count: 1, color: generateColorFromString(type) });
      }
    }
    
    const folders: JournalFolder[] = Array.from(folderMap.entries())
      .map(([id, data]) => ({
        id,
        title: id,
        count: data.count,
        color_hex: data.color
      }))
      .sort((a, b) => b.count - a.count);
    
    return folders;
  } catch (error) {
    console.error("API Error fetchAllFolders:", error);
    throw error;
  }
};

// 4. Fetch Thoughts by Folder (ОПТИМИЗИРОВАНО)
export const fetchThoughts = async (userId: number, folderId: string): Promise<Thought[]> => {
  try {
    const response = await authedFetchWithRetry(`${API_BASE_URL}/api/thoughts?user_id=${userId}&limit=1000`, {
      method: 'GET',
      timeout: 15000,
      retries: 2,
      cache: true,
      cacheTTL: 20000
    });
    
    if (!response.ok) throw new Error('Failed to fetch thoughts');
    const thoughts: Thought[] = await response.json();
    
    return thoughts.filter(t => t.type_thought === folderId);
  } catch (error) {
    console.error("API Error fetchThoughts:", error);
    throw error;
  }
};

// 4.1 Fetch All Thoughts (for daily journal & archive) — кэш 45 сек
let allThoughtsCache: { userId: number; data: Thought[]; ts: number } | null = null;
const ALL_THOUGHTS_CACHE_TTL_MS = 45_000;

export const fetchAllThoughts = async (userId: number, skipCache = false): Promise<Thought[]> => {
  if (!skipCache && allThoughtsCache && allThoughtsCache.userId === userId && (Date.now() - allThoughtsCache.ts) < ALL_THOUGHTS_CACHE_TTL_MS) {
    return allThoughtsCache.data;
  }

  try {
    const response = await authedFetchWithRetry(`${API_BASE_URL}/api/thoughts?user_id=${userId}&limit=1000`, {
      method: 'GET',
      timeout: 15000,
      retries: 2,
      cache: false,
    });

    if (!response.ok) throw new Error('Failed to fetch thoughts');
    const responseData = await response.json();

    const thoughts: Thought[] = Array.isArray(responseData) ? responseData : (responseData?.thoughts || []);
    allThoughtsCache = { userId, data: thoughts, ts: Date.now() };
    return thoughts;
  } catch (error) {
    console.error("API Error fetchAllThoughts:", error);
    throw error;
  }
};

export const invalidateAllThoughtsCache = (): void => {
  allThoughtsCache = null;
};

// 4.6 Fetch Thought by ID
export const fetchThoughtById = async (thoughtId: number): Promise<Thought | null> => {
  try {
    const response = await authedFetchWithRetry(`${API_BASE_URL}/api/thoughts/${thoughtId}`, {
      method: 'GET',
      timeout: 10000,
      retries: 2,
      cache: true,
      cacheTTL: 30000
    });
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) throw new Error('Failed to fetch thought');
    const thought: Thought = await response.json();
    return thought;
  } catch (error) {
    console.error("API Error fetchThoughtById:", error);
    return null;
  }
};

/** Fetch thought by ID without cache. Use for polling after save so message matches when thought appears in folder. */
export const fetchThoughtByIdNoCache = async (thoughtId: number): Promise<Thought | null> => {
  try {
    const response = await authedFetchWithRetry(`${API_BASE_URL}/api/thoughts/${thoughtId}`, {
      method: 'GET',
      timeout: 10000,
      retries: 1,
      cache: false
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch thought');
    const thought: Thought = await response.json();
    return thought;
  } catch (error) {
    console.error("API Error fetchThoughtByIdNoCache:", error);
    return null;
  }
};

// 4.7 Delete Thought
export const deleteThought = async (thoughtId: number): Promise<void> => {
  try {
    const response = await authedFetch(`${API_BASE_URL}/api/thoughts/${thoughtId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete thought' }));
      throw new Error(errorData.error || 'Failed to delete thought');
    }
  } catch (error) {
    console.error("API Error deleteThought:", error);
    throw error;
  }
};

// 4.5 Fetch Folder Details (ОПТИМИЗИРОВАНО)
export const fetchFolderDetails = async (userId: number, folderId: string): Promise<FolderDetailsResponse> => {
  try {
    const response = await authedFetchWithRetry(`${API_BASE_URL}/api/thoughts?user_id=${userId}&limit=1000`, {
      method: 'GET',
      timeout: 15000,
      retries: 2,
      cache: true,
      cacheTTL: 20000
    });
    
    if (!response.ok) throw new Error('Failed to fetch thoughts');
    const thoughts: Thought[] = await response.json();
    
    const folderThoughts = thoughts.filter(t => t.type_thought === folderId);
    
    const timelineMap = new Map<number, Map<number, any[]>>();
    
    // ОПТИМИЗАЦИЯ: Используем цикл for для лучшей производительности
    for (let i = 0; i < folderThoughts.length; i++) {
      const thought = folderThoughts[i];
      if (!thought.created_at) continue;
      const date = new Date(thought.created_at);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      if (!timelineMap.has(year)) {
        timelineMap.set(year, new Map());
      }
      const yearMap = timelineMap.get(year)!;
      
      if (!yearMap.has(month)) {
        yearMap.set(month, []);
      }
      // Extract title from content if it has the marker, otherwise use first 50 chars
      let thoughtTitle = 'Untitled';
      let previewText = thought.content?.substring(0, 100) || '';
      
      if (thought.content) {
        if (thought.content.startsWith('__TITLE__:')) {
          const lines = thought.content.split('\n');
          const firstLine = lines[0];
          thoughtTitle = firstLine.replace('__TITLE__:', '') || 'Untitled';
          previewText = lines.slice(1).join('\n').substring(0, 100) || '';
        } else {
          // No title marker - use first 50 chars as title for display
          thoughtTitle = thought.content.substring(0, 50) || 'Untitled';
          previewText = thought.content.substring(0, 100) || '';
        }
      }
      
      yearMap.get(month)!.push({
        thought_id: thought.thought_id || thought.ThoughtID || 0,
        title: thoughtTitle,
        preview_text: previewText,
        date_str: date.toLocaleDateString('ru-RU'),
        sentiment_label: thought.sentiment_label || 'neutral',
        sentiment_color: thought.sentiment_label === 'positive' ? '#2ED573' : 
                         thought.sentiment_label === 'negative' ? '#FF4757' : '#A4B0BE'
      });
    }
    
    const timeline = Array.from(timelineMap.entries()).map(([year, months]) => ({
      year,
      months: Array.from(months.entries()).map(([month, thoughts]) => ({
        month_name: new Date(year, month - 1).toLocaleString('ru-RU', { month: 'long' }),
        month_number: month,
        has_photos: false,
        photos: [],
        thoughts
      }))
    }));
    
    return {
      status: "success",
      folder_info: {
        id: folderId,
        title: folderId,
        color_hex: generateColorFromString(folderId)
      },
      timeline
    };
  } catch (error) {
    console.error("API Error fetchFolderDetails:", error);
    throw error;
  }
};

// 5. Check for Weekly Report (ОПТИМИЗИРОВАНО)
export const fetchWeeklyReport = async (userId: number): Promise<WeeklyReportMetadata | null> => {
  try {
    const response = await authedFetchWithRetry(`${API_BASE_URL}/api/reports?user_id=${userId}&limit=10`, {
      method: 'GET',
      timeout: 10000,
      retries: 2,
      cache: false,
      cacheTTL: 0
    });
    
    if (!response.ok) throw new Error('Failed to fetch reports');
    const reports = await response.json();
    
    if (Array.isArray(reports) && reports.length > 0) {
      // Ищем последний готовый отчет, созданный в последние 24 часа
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentCompletedReport = reports.find((report: any) => {
        // Проверяем статус
        if (report.status !== 'completed') return false;
        
        // Проверяем дату завершения (created_at)
        const createdAt = report.created_at || report.log_datetime;
        if (!createdAt) return false;
        
        const reportDate = new Date(createdAt);
        return reportDate >= oneDayAgo;
      });
      
      if (!recentCompletedReport) return null;
      
      const createdAt = recentCompletedReport.created_at || recentCompletedReport.log_datetime;
      const reportId = recentCompletedReport.report_id || recentCompletedReport.id;
      
      if (!reportId) {
        console.warn('Report ID not found in report data:', recentCompletedReport);
        return null;
      }
      
      return {
        report_id: reportId,
        created_at: createdAt,
        title: `Отчет за ${new Date(createdAt).toLocaleDateString('ru-RU')}`
      };
    }
    
    return null;
  } catch (error) {
    console.error("API Error fetchWeeklyReport:", error);
    return null;
  }
};

// 6. Fetch Full Weekly Report Details (ОПТИМИЗИРОВАНО)
export const fetchWeeklyReportDetails = async (reportId: number): Promise<WeeklyReportData | null> => {
  try {
    const response = await authedFetchWithRetry(`${API_BASE_URL}/api/reports/${reportId}`, {
      method: 'GET',
      timeout: 10000,
      retries: 2,
      cache: true,
      cacheTTL: 60000
    });
    
    if (!response.ok) throw new Error('Failed to fetch report details');
    const report = await response.json();
    const logDatetime = report.log_datetime || report.created_at || new Date().toISOString();
    
    return {
      report_id: report.report_id,
      title: `Отчет за ${new Date(logDatetime).toLocaleDateString('ru-RU')}`,
      period_string: new Date(logDatetime).toLocaleDateString('ru-RU'),
      content: report.report || 'Нет содержимого'
    };
  } catch (error) {
    console.error("API Error fetchWeeklyReportDetails:", error);
    return null;
  }
};

// 6.5 Delete Report
export const deleteReport = async (reportId: number): Promise<void> => {
  try {
    const response = await authedFetch(`${API_BASE_URL}/api/reports/${reportId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to delete report';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // Если не удалось распарсить JSON, используем текст ответа
        const errorText = await response.text().catch(() => '');
        if (errorText) {
          errorMessage = errorText;
        }
      }
      console.error(`[deleteReport] Failed with status ${response.status}:`, errorMessage);
      throw new Error(errorMessage);
    }
    
    // Проверяем, что ответ успешный (может быть пустым или с JSON)
    try {
      await response.json();
    } catch (e) {
      // Если ответ пустой, это нормально для DELETE запроса
    }
  } catch (error) {
    console.error("API Error deleteReport:", error);
    throw error;
  }
};

// 7. Save Thought
export const saveThought = async (payload: SaveThoughtPayload): Promise<SaveThoughtResponse> => {
  try {
    const isUpdate = !!payload.thought_id;
    const url = `${API_BASE_URL}/api/thoughts`;
    const method = isUpdate ? 'PUT' : 'POST';
    
    const requestBody: any = {
      content: payload.content || null,
    };
    
    // If updating a thought that was created from voice, preserve voice_text
    // by setting it to content if content is provided
    if (isUpdate && payload.content) {
      // When updating a voice thought, we want to save content to voice_text
      // if voice_text was originally set. But since we don't know if it was voice,
      // we'll let the backend handle it - it should preserve voice_text if content is provided
      // Actually, we should send voice_text as well if we're updating a voice thought
      // For now, just send content and let backend handle it
    }
    
    // Always include image_id, even if null (to clear existing image)
    if (payload.image_id !== undefined) {
      requestBody.image_id = payload.image_id;
    } else {
      requestBody.image_id = null;
    }
    
    // Include voice_id if provided
    if (payload.voice_id !== undefined) {
      requestBody.voice_id = payload.voice_id;
    } else {
      requestBody.voice_id = null;
    }
    
    // For updates, include thought_id and preserve type_thought
    if (isUpdate && payload.thought_id) {
      requestBody.thought_id = payload.thought_id;
      // Preserve type_thought when updating to prevent it from being lost
      if (payload.type_thought) {
        requestBody.type_thought = payload.type_thought;
      }
    } else {
      // For new thoughts: if type_thought is provided (creating from folder), set it
      // Otherwise ML analysis will set it
      if (payload.type_thought) {
        requestBody.type_thought = payload.type_thought;
      }
      // При создании из экрана дня (DayDetailView) передаём дату — запись привяжется к этому дню
      if (payload.date) {
        // Формат: "2006-01-02T15:04:05Z07:00" - ISO 8601, который Go парсит автоматически
        requestBody.created_at = `${payload.date}T12:00:00Z`;
      }
    }
    
    console.log(`[saveThought] Saving thought with method=${method}, isUpdate=${isUpdate}`, requestBody);
    
    const response = await authedFetch(url, {
      method,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[saveThought] Failed to save: ${response.status} ${response.statusText}`, errorText);
      console.error(`[saveThought] Request body was:`, requestBody);
      throw new Error(`Failed to save thought: ${response.status}`);
    }
    const data = await response.json();
    
    const thoughtId = isUpdate ? payload.thought_id : (data.thought_id || data.ThoughtID);
    
    // ВАЖНО: ML анализ НЕ запускается при обновлении существующей мысли
    // ML анализ запускается только при создании новой мысли через CreateRecordView
    // Это предотвращает ненужные запросы к API при редактировании
    
    return {
      status: "success",
      message: "Thought saved successfully",
      thought_id: thoughtId || 0
    };
  } catch (error) {
    console.error("API Error saveThought:", error);
    throw error;
  }
};

// 8. Upload Voice Thought
export const uploadVoiceThought = async (userId: number, audioBlob: Blob): Promise<UploadVoiceResponse> => {
  try {
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Audio blob is empty');
    }

    const blobType = (audioBlob.type || '').toLowerCase();
    let fileName = 'voice.webm';
    if (blobType.includes('mp4') || blobType.includes('m4a') || blobType.includes('aac')) {
      fileName = 'voice.m4a';
    } else if (blobType.includes('ogg')) {
      fileName = 'voice.ogg';
    } else if (blobType.includes('wav')) {
      fileName = 'voice.wav';
    }

    const formData = new FormData();
    formData.append('user_id', userId.toString());
    formData.append('file', audioBlob, fileName);
    
    const response = await fetch(`${ML_API_BASE_URL}/api/upload-voice`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to upload voice' }));
      throw new Error(error.detail || 'Failed to upload voice');
    }
    
    const data = await response.json();
    return {
      status: "success",
      thought_id: data.thought_id,
      transcribed_text: data.text || ''
    };
  } catch (error) {
    console.error("API Error uploadVoiceThought:", error);
    throw error;
  }
};

// Helper function to compress and resize image
const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// 9. Upload Image (optimized with compression)
export const uploadImage = async (file: File): Promise<UploadImageResponse> => {
  try {
    // Compress image before creating object URL
    const compressedFile = await compressImage(file);
    const imageUrl = URL.createObjectURL(compressedFile);
    
    console.log(`[uploadImage] Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    
    return {
      status: "success",
      image_url: imageUrl,
      image_id: `img_${Date.now()}`
    };
  } catch (error) {
    console.error("API Error uploadImage:", error);
    throw error;
  }
};