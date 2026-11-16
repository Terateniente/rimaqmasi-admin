import axios from 'axios';

let apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/+$/, '');
if (!import.meta.env.VITE_API_URL && typeof window !== 'undefined' && window.location?.hostname) {
  const host = window.location.hostname;
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    apiBaseUrl = `${window.location.protocol}//${host}:3000/api/v1`;
  }
}

export const API_BASE_URL = apiBaseUrl;
export const BACKEND_BASE = apiBaseUrl.replace(/\/api\/v1\/?$/, '');

export const TOKEN_STORAGE_KEY = 'token';
export const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
export const USER_STORAGE_KEY = 'user';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getStoredRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSessionTokens({ token, refresh_token } = {}) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    if (refresh_token) localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refresh_token);
  } catch {
    // Ignorar errores de almacenamiento restringido
  }
}

export function clearSessionStorage() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // Ignorar errores de almacenamiento restringido
  }
}

export function getClientDeviceMeta() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/i.test(ua)
      ? 'Opera'
      : /Chrome\//i.test(ua)
        ? 'Chrome'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : 'Navegador';
  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /Mac OS X|Macintosh/i.test(ua)
      ? 'macOS'
      : /Linux/i.test(ua)
        ? 'Linux'
        : 'Web';
  return {
    plataforma: 'web',
    nombre_dispositivo: `${browser} en ${os} · Panel Admin`,
  };
}

const PUBLIC_MEDIA_FOLDERS = new Set([
  'flags',
  'images',
  'user',
  'achievement',
  'audio',
  'document',
  'icons',
  'misc',
  'courses',
  'units',
  'sessions',
  'lessons',
  'branding',
  'uploads',
]);

export function resolveMediaUrl(value) {
  if (!value || value === 'null' || value === 'undefined') return null;

  let rawValue = String(value).trim().replace(/\\/g, '/');
  if (!rawValue) return null;
  if (/^(data:|blob:)/i.test(rawValue)) return rawValue;

  if (/^https?:\/\//i.test(rawValue)) {
    try {
      const parsed = new URL(rawValue);
      const isLocalBackend =
        ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname) ||
        parsed.port === '3000';
      if (!isLocalBackend) return rawValue;
      rawValue = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return rawValue;
    }
  }

  const suffixIndex = rawValue.search(/[?#]/);
  const suffix = suffixIndex >= 0 ? rawValue.slice(suffixIndex) : '';
  const cleanPath = (suffixIndex >= 0 ? rawValue.slice(0, suffixIndex) : rawValue).replace(/^\/+/, '');
  if (!cleanPath) return null;
  if (cleanPath.startsWith('public/')) return `${BACKEND_BASE}/${cleanPath}${suffix}`;

  const firstFolder = cleanPath.split('/')[0].toLowerCase();
  if (PUBLIC_MEDIA_FOLDERS.has(firstFolder) || (!cleanPath.startsWith('api/') && !cleanPath.startsWith('docs/'))) {
    return `${BACKEND_BASE}/public/${cleanPath}${suffix}`;
  }

  return `${BACKEND_BASE}/${cleanPath}${suffix}`;
}

export function getApiErrorMessage(error, fallback = 'Ocurrió un error al comunicarse con el servidor.') {
  if (!error) return fallback;
  const responseData = error.response?.data;
  if (typeof responseData?.message === 'string' && responseData.message.trim()) {
    return responseData.message.trim();
  }
  if (typeof responseData?.error === 'string' && responseData.error.trim()) {
    return responseData.error.trim();
  }
  if (error.code === 'ECONNABORTED') {
    return 'Tiempo de espera agotado al conectar con el servidor.';
  }
  if (!error.response && error.request) {
    return 'No se pudo conectar con el servidor API. Verifica tu conexión de red.';
  }
  return error.message || fallback;
}

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor para agregar el token JWT y manejar FormData
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Client-Platform'] = 'web';

    // Si los datos son FormData, permitimos que el navegador establezca el Content-Type con el boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

function isTransientError(error) {
  if (!error || axios.isCancel(error) || error.code === 'ERR_CANCELED') return false;
  const status = error.response?.status;
  return !status || status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

function isPublicAuthEndpoint(url = '') {
  return /\/auth\/(login|refresh|logout|register|verify-otp|resend-otp|password\/)/i.test(String(url));
}

let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error('No hay refresh_token disponible');
  }

  refreshPromise = axios
    .post(
      `${apiBaseUrl}/auth/refresh`,
      {
        refresh_token: refreshToken,
        ...getClientDeviceMeta(),
      },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Client-Platform': 'web',
        },
      }
    )
    .then((response) => {
      const payload = response.data?.data || response.data || {};
      const newToken = payload.token;
      const newRefreshToken = payload.refresh_token;
      if (!newToken) {
        throw new Error('Respuesta de renovación inválida');
      }
      setSessionTokens({ token: newToken, refresh_token: newRefreshToken });
      return newToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// Interceptor para manejar errores globalmente (renovación automática en 401 y reintentos GET transitorios)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const method = (config?.method || 'get').toLowerCase();
    if (config && method === 'get' && !config.__retried && isTransientError(error)) {
      config.__retried = true;
      await new Promise((resolve) => setTimeout(resolve, 250));
      return api(config);
    }

    if (
      config &&
      error?.response?.status === 401 &&
      !config.__authRetried &&
      !isPublicAuthEndpoint(config.url)
    ) {
      const sentAuth = String(config.headers?.Authorization || '');
      const currentToken = getStoredToken();

      // Si otra petición ya renovó el token mientras esta estaba en vuelo, reintentar con el nuevo
      if (currentToken && sentAuth && sentAuth !== `Bearer ${currentToken}`) {
        config.__authRetried = true;
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${currentToken}`;
        return api(config);
      }

      if (getStoredRefreshToken()) {
        try {
          const newToken = await refreshAccessToken();
          config.__authRetried = true;
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${newToken}`;
          return api(config);
        } catch {
          clearSessionStorage();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('rq:session-expired'));
          }
        }
      } else {
        clearSessionStorage();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('rq:session-expired'));
        }
      }
    }

    if (error) {
      error.userMessage = getApiErrorMessage(error);
    }
    return Promise.reject(error);
  }
);

export default api;
