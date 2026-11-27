// BuildSoftware demo build: there is no backend. Every request is answered by the
// in-browser mock engine (src/lib/demo/server) using the data stored in IndexedDB.
import { getDisplayTimeZone } from './date';
import { handle } from './demo/server';

const masterListCache = new Map();
const masterMutationPath = /^\/(?:agents|b2c|hotels|suppliers|yachts|sales-masters|operations-masters|activity-masters|finance-masters|system-masters|terms-conditions)(?:\/|$)/;
const masterListPath = /^\/(?:agents|b2c|hotels|suppliers|yachts)(?:\?.*)?$|^\/(?:sales-masters|operations-masters|activity-masters|finance-masters|system-masters)\/[^/?]+(?:\?.*)?$/;
const MASTER_LIST_CACHE_TTL_MS = 30_000;

const TOKEN_KEY = 'buildsoftware_token';
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

function invalidateMasterCaches() {
  masterListCache.clear();
  safe(() => sessionStorage.setItem('buildsoftware_master_data_version', String(Date.now())));
}

export function getToken() { return safe(() => localStorage.getItem(TOKEN_KEY), null); }
export function setToken(token) { safe(() => localStorage.setItem(TOKEN_KEY, token)); }
export function clearToken() { safe(() => localStorage.removeItem(TOKEN_KEY)); }

export async function api(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  void getDisplayTimeZone; // timezone header is irrelevant offline
  try {
    const payload = await handle(method, path, { body: options.body, token: getToken() });
    if (options.method && masterMutationPath.test(path)) invalidateMasterCaches();
    return payload;
  } catch (error) {
    if (error?.status === 401 && getToken() && typeof window !== 'undefined' && !window.location.pathname.startsWith('/crm/login')) {
      clearToken(); masterListCache.clear();
      window.location.replace('/crm/login?reason=session-expired');
    }
    throw error instanceof Error ? error : new Error('Request failed.');
  }
}

function cachedMasterGet(path) {
  if (!masterListPath.test(path)) return api(path);
  const cached = masterListCache.get(path);
  if (cached && Date.now() - cached.loadedAt < MASTER_LIST_CACHE_TTL_MS) return Promise.resolve(JSON.parse(JSON.stringify(cached.payload)));
  return api(path).then((payload) => { masterListCache.set(path, { payload: JSON.parse(JSON.stringify(payload)), loadedAt: Date.now() }); return payload; });
}

export const apiClient = {
  get: (path, options = {}) => (Object.keys(options).length ? api(path, { ...options, method: 'GET' }) : cachedMasterGet(path)),
  post: (path, body) => api(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: (path, body) => api(path, { method: 'DELETE', ...(body ? { body: JSON.stringify(body) } : {}) }),
  upload: (path, formData) => handle('POST', path, { body: formData, token: getToken() }),
};
