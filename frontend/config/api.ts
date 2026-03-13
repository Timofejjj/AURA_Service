// API Configuration
// Auto-detect based on current hostname
const isPublicAccess = typeof window !== 'undefined' && 
  (window.location.hostname === '100.64.148.91' || 
   window.location.hostname.includes('.ts.net'));

const isTailscaleFunnel = typeof window !== 'undefined' && 
  window.location.hostname.includes('.ts.net') &&
  window.location.protocol === 'https:';

// Для Tailscale Funnel (публичный HTTPS доступ) используем относительные пути через Vite прокси
// Для Tailscale IP (внутренний доступ) используем IP адрес через HTTP
// Локальный доступ использует localhost
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (isTailscaleFunnel 
    ? ''  // Используем относительные пути - прокси Vite перенаправит на localhost:8080
    : isPublicAccess 
      ? 'http://100.64.148.91:8080'  // Внутренний Tailscale IP (HTTP)
      : 'http://localhost:8080');  // Локальный доступ

// Debug logging
if (typeof window !== 'undefined') {
  console.log('[API Config] hostname:', window.location.hostname);
  console.log('[API Config] protocol:', window.location.protocol);
  console.log('[API Config] isTailscaleFunnel:', isTailscaleFunnel);
  console.log('[API Config] API_BASE_URL:', API_BASE_URL);
}

