import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuth } from './AuthContext';
import { useTimeZone } from './TimezoneContext';

const AppContext = createContext(null);
const resources = ['queries', 'quotations', 'bookings', 'hotels', 'agents', 'suppliers', 'operations', 'notifications'];

function resourcesForPath(pathname) {
  // Workspace routes are mounted below `/app`, while the resource map below
  // intentionally uses their app-relative paths.  Without this normalization
  // a hard refresh on `/app/quotations/:id` only loaded notifications, leaving
  // hotel masters empty and preventing saved hotel services from resolving.
  const requestedPath = pathname || '/dashboard';
  const path = requestedPath === '/app'
    ? '/dashboard'
    : requestedPath.startsWith('/app/')
      ? requestedPath.slice('/app'.length)
      : requestedPath;
  if (path.startsWith('/masters/hotels')) return ['hotels', 'suppliers', 'notifications'];
  if (path.startsWith('/masters/agents')) return ['agents', 'notifications'];
  if (path.startsWith('/masters/suppliers')) return ['suppliers', 'notifications'];
  if (path.startsWith('/masters/transfers/') || path.startsWith('/masters/sightseeing/')) return ['suppliers', 'notifications'];
  if (path.startsWith('/masters/restaurants')) return ['hotels', 'suppliers', 'notifications'];
  if (path.startsWith('/masters')) return ['notifications'];
  // The high-volume record lists load through their own paginated endpoints.
  // Do not preload every query, quotation, or booking merely to open a page.
  if (path === '/queries') return ['notifications'];
  if (path.startsWith('/queries')) return ['agents', 'notifications'];
  if (path === '/quotations') return ['notifications'];
  if (path.startsWith('/quotations')) return ['agents', 'hotels', 'suppliers', 'notifications'];
  if (path === '/bookings') return ['notifications'];
  if (path.startsWith('/bookings')) return ['hotels', 'suppliers', 'notifications'];
  // Tour Master and Hotel Reservation read and update real booking records.
  if (path.startsWith('/operations/tour-master-sheet') || path.startsWith('/operations/hotel-reservation')) return ['bookings', 'hotels', 'suppliers', 'notifications'];
  if (path.startsWith('/operations')) return ['operations', 'notifications'];
  // The supplier planner has its own server-side aggregate endpoint. Avoid
  // downloading every booking only to render that one accounts screen.
  if (path === '/accounts/payment-planner') return ['notifications'];
  if (path.startsWith('/accounts')) return ['bookings', 'notifications'];
  // Dashboard has a dedicated aggregate endpoint. Loading every record list
  // here duplicates that request and makes the first dashboard render slow.
  if (path.startsWith('/dashboard')) return ['notifications'];
  return ['notifications'];
}

export function AppProvider({ children }) {
  const { timeZone } = useTimeZone();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [data, setData] = useState(Object.fromEntries(resources.map((key) => [key, []])));
  const [dataLoading, setDataLoading] = useState(false);
  const [pageLoadCount, setPageLoadCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const loadedResources = useRef(new Set());
  const inFlightResources = useRef(new Set());
  const pendingLoads = useRef(0);
  const pageLoadKeys = useRef(new Set());

  const setResource = useCallback((resource, update) => setData((previous) => {
    const currentItems = Array.isArray(previous[resource]) ? previous[resource].filter(Boolean) : [];
    const nextItems = typeof update === 'function' ? update(currentItems) : update;
    return { ...previous, [resource]: Array.isArray(nextItems) ? nextItems.filter(Boolean) : [] };
  }), []);

  const setPageLoading = useCallback((key, active) => {
    if (!key) return;
    if (active) pageLoadKeys.current.add(key);
    else pageLoadKeys.current.delete(key);
    setPageLoadCount(pageLoadKeys.current.size);
  }, []);

  const fetchRecord = useCallback(async (resource, id) => {
    if (!id) return null;
    const record = (await apiClient.get(`/${resource}/${encodeURIComponent(id)}`)).data;
    if (!record) throw new Error(`The ${resource} record was not returned by the server.`);
    setResource(resource, (items) => [record, ...items.filter((item) => item.id !== record.id)]);
    return record;
  }, [setResource]);

  // Domain records are always read from the API.  `loadedResources` only
  // prevents duplicate initial requests while a user stays on one screen;
  // callers can force a fresh server read when they enter a data screen or
  // explicitly refresh it.
  const loadData = useCallback(async (requestedResources = resources, { force = false } = {}) => {
    if (!isAuthenticated) {
      loadedResources.current.clear();
      inFlightResources.current.clear();
      pageLoadKeys.current.clear();
      setPageLoadCount(0);
      setData(Object.fromEntries(resources.map((key) => [key, []])));
      setDataLoading(false);
      return;
    }
    const missing = [...new Set(requestedResources)].filter((resource) => (
      !inFlightResources.current.has(resource)
      && (force || !loadedResources.current.has(resource))
    ));
    if (!missing.length) return;
    missing.forEach((resource) => inFlightResources.current.add(resource));
    pendingLoads.current += 1;
    setDataLoading(true);
    try {
      const responses = await Promise.all(missing.map((resource) => apiClient.get(`/${resource}`)));
      setData((current) => ({
        ...current,
        ...Object.fromEntries(missing.map((resource, index) => [
          resource,
          Array.isArray(responses[index].data) ? responses[index].data.filter(Boolean) : [],
        ])),
      }));
      missing.forEach((resource) => loadedResources.current.add(resource));
    } finally {
      missing.forEach((resource) => inFlightResources.current.delete(resource));
      pendingLoads.current -= 1;
      if (pendingLoads.current === 0) setDataLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      loadedResources.current.clear();
      inFlightResources.current.clear();
      pageLoadKeys.current.clear();
      setPageLoadCount(0);
      setData(Object.fromEntries(resources.map((key) => [key, []])));
      return;
    }
    // A page visit must reflect the live API, including changes made in a
    // different quotation, booking, or browser tab.
    loadData(resourcesForPath(location.pathname), { force: true }).catch((error) => console.error('Could not load page data:', error));
  }, [isAuthenticated, location.pathname, timeZone, loadData]);

  const openGlobalSearch = () => {
    setSearchOpen(true);
    loadData(resources, { force: true }).catch((error) => console.error('Could not load search data:', error));
  };

  const refreshData = useCallback((requestedResources = resources) => (
    loadData(requestedResources, { force: true })
  ), [loadData]);

  const create = (resource) => async (payload) => {
    const record = (await apiClient.post(`/${resource}`, payload)).data;
    if (!record) throw new Error(`The ${resource} record was saved but was not returned by the server.`);
    setResource(resource, (items) => [record, ...items]);
    return record;
  };
  const update = (resource) => async (id, payload) => {
    const record = (await apiClient.put(`/${resource}/${encodeURIComponent(id)}`, payload)).data;
    if (!record) throw new Error(`The ${resource} record was saved but was not returned by the server.`);
    setResource(resource, (items) => items.map((item) => item.id === id ? record : item));
    return record;
  };
  const remove = (resource) => async (id) => {
    await apiClient.delete(`/${resource}/${encodeURIComponent(id)}`);
    setResource(resource, (items) => items.filter((item) => item.id !== id));
  };

  const addQuery = create('queries'); const updateQuery = update('queries'); const deleteQuery = remove('queries');
  const addQuotation = create('quotations'); const updateQuotation = update('quotations'); const deleteQuotation = remove('quotations');
  const addBooking = create('bookings'); const updateBooking = update('bookings'); const deleteBooking = remove('bookings');
  const addHotel = create('hotels'); const updateHotel = update('hotels'); const deleteHotel = remove('hotels');
  const addAgent = create('agents'); const updateAgent = update('agents'); const deleteAgent = remove('agents');
  const addSupplier = create('suppliers'); const updateSupplier = update('suppliers'); const deleteSupplier = remove('suppliers');
  const updateOperation = update('operations');

  const markNotificationRead = async (id) => {
    const current = data.notifications.find((item) => item.id === id);
    if (current && !current.read) await update('notifications')(id, { ...current, read: true });
  };
  const markAllNotificationsRead = async () => Promise.all(data.notifications.filter((item) => !item.read).map((item) => update('notifications')(item.id, { ...item, read: true })));

  const convertQuotationToBooking = async (quotationId) => {
    const result = await apiClient.post(`/bookings/from-quotation/${encodeURIComponent(quotationId)}`);
    const booking = result.data?.booking;
    const quotation = result.data?.quotation;
    if (!booking) throw new Error('Booking conversion did not return a booking.');
    setResource('bookings', (items) => [booking, ...items.filter((item) => item.id !== booking.id)]);
    if (quotation) setResource('quotations', (items) => items.map((item) => item.id === quotation.id ? quotation : item));
    return booking;
  };

  const acceptQuotationRevision = async (quotationId) => {
    const result = await apiClient.post(`/quotations/${encodeURIComponent(quotationId)}/accept-revision`);
    const quotation = result.data?.quotation;
    const booking = result.data?.booking;
    if (!quotation) throw new Error('The accepted quotation was not returned.');
    setResource('quotations', (items) => items.map((item) => item.id === quotation.id ? quotation : item));
    if (booking) setResource('bookings', (items) => [booking, ...items.filter((item) => item.id !== booking.id)]);
    return { quotation, booking };
  };

  const restoreQuotationRevision = async (quotationId, version) => {
    const result = await apiClient.post(`/quotations/${encodeURIComponent(quotationId)}/restore-revision/${encodeURIComponent(version)}`);
    const quotation = result.data?.quotation;
    const booking = result.data?.booking;
    if (!quotation) throw new Error('The restored quotation was not returned.');
    setResource('quotations', (items) => items.map((item) => item.id === quotation.id ? quotation : item));
    if (booking) setResource('bookings', (items) => [booking, ...items.filter((item) => item.id !== booking.id)]);
    return { quotation, booking };
  };

  return <AppContext.Provider value={{
    queries: data.queries, quotations: data.quotations, bookings: data.bookings, hotels: data.hotels, agents: data.agents, suppliers: data.suppliers, operations: data.operations, notifications: data.notifications,
    dataLoading: dataLoading || pageLoadCount > 0, setPageLoading, refreshData, fetchRecord, openGlobalSearch, addQuery, updateQuery, deleteQuery, addQuotation, updateQuotation, deleteQuotation,
    addBooking, updateBooking, deleteBooking, addHotel, updateHotel, deleteHotel, addAgent, updateAgent, deleteAgent,
    addSupplier, updateSupplier, deleteSupplier, updateOperation, markNotificationRead, markAllNotificationsRead,
    sidebarCollapsed, setSidebarCollapsed, searchOpen, setSearchOpen, convertQuotationToBooking, acceptQuotationRevision, restoreQuotationRevision,
  }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export default AppContext;
