import { apiClient } from './api';

const CACHE_TTL_MS = 60_000;
let cachedSummary = null;
let pendingSummary = null;

const invalidationKey = 'buildsoftware_master_data_version';
const currentVersion = () => sessionStorage.getItem(invalidationKey) || '0';

export function invalidateMasterDataCache() {
  sessionStorage.setItem(invalidationKey, String(Date.now()));
  cachedSummary = null;
}

export function getCachedMasterSummary() {
  if (!cachedSummary || cachedSummary.version !== currentVersion() || Date.now() - cachedSummary.loadedAt > CACHE_TTL_MS) return null;
  return cachedSummary.counts;
}

export function loadMasterSummary() {
  const cached = getCachedMasterSummary();
  if (cached) return Promise.resolve(cached);
  if (pendingSummary) return pendingSummary;

  pendingSummary = apiClient.get('/masters/summary')
    .then((response) => {
      const counts = response.data?.counts || {};
      cachedSummary = { counts, loadedAt: Date.now(), version: currentVersion() };
      return counts;
    })
    .finally(() => { pendingSummary = null; });
  return pendingSummary;
}
