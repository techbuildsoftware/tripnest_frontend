import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../lib/api';
import { useApp } from '../context/AppContext';
import { useTimeZone } from '../context/TimezoneContext';

const DEFAULT_PAGE = { page: 1, limit: 100, total: 0, totalPages: 1 };

// Keeps large record collections on the server. Search is deliberately
// debounced so typing does not create a request for every character.
export default function usePaginatedRecords(path, { search = '', filters = {}, sortBy, sortDir, enabled = true, includeSummary = true, pageLoading = true, limit = 100 } = {}) {
  const { setPageLoading } = useApp();
  const { timeZone } = useTimeZone();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ ...DEFAULT_PAGE, limit });
  const [summary, setSummary] = useState({ total: 0, statusCounts: {} });
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [loading, setLoading] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const requestId = useRef(0);
  const loadingKey = useRef(`paginated-records-${Math.random().toString(36).slice(2)}`);
  const previousCriteria = useRef(null);
  const filterKey = JSON.stringify(filters);
  const criteriaKey = `${path}|${debouncedSearch}|${filterKey}|${sortBy || ''}|${sortDir || ''}|${limit}|${timeZone}`;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Show the existing page loader before the first paint of a list, avoiding
  // a flash of an empty table while its initial server request begins.
  useLayoutEffect(() => {
    if (!pageLoading || !enabled) return undefined;
    setPageLoading(loadingKey.current, true);
    return () => setPageLoading(loadingKey.current, false);
  }, [enabled, pageLoading, setPageLoading]);

  useEffect(() => {
    if (!enabled) return undefined;
    // Resetting the page happens before the request, avoiding an unnecessary
    // fetch of an old page whenever a search or filter changes.
    if (previousCriteria.current !== criteriaKey && page !== 1) {
      previousCriteria.current = criteriaKey;
      if (pageLoading) setPageLoading(loadingKey.current, true);
      setPage(1);
      return undefined;
    }
    previousCriteria.current = criteriaKey;
    const currentRequest = ++requestId.current;
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (!includeSummary) params.set('summary', 'false');
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortDir) params.set('sortDir', sortDir);
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'All') params.set(key, String(value));
    });
    setLoading(true);
    if (pageLoading) setPageLoading(loadingKey.current, true);
    apiClient.get(`${path}?${params.toString()}`)
      .then((response) => {
        if (currentRequest !== requestId.current) return;
        setRecords(response.data || []);
        setPagination(response.pagination || { ...DEFAULT_PAGE, page, limit, total: (response.data || []).length });
        setSummary(response.summary || { total: (response.data || []).length, statusCounts: {} });
      })
      .catch(() => {
        if (currentRequest !== requestId.current) return;
        setRecords([]);
        setPagination({ ...DEFAULT_PAGE, page, limit });
        setSummary({ total: 0, statusCounts: {} });
      })
      .finally(() => {
        if (currentRequest !== requestId.current) return;
        setLoading(false);
        if (pageLoading) setPageLoading(loadingKey.current, false);
      });
    return () => {
      requestId.current += 1;
      if (pageLoading) setPageLoading(loadingKey.current, false);
    };
  }, [path, page, limit, debouncedSearch, filterKey, sortBy, sortDir, criteriaKey, timeZone, enabled, includeSummary, pageLoading, reloadVersion, setPageLoading]);

  const reload = useCallback(() => setReloadVersion((version) => version + 1), []);
  const result = useMemo(() => ({ records, pagination, summary, loading, page, setPage, reload }), [records, pagination, summary, loading, page, reload]);
  return result;
}
