import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setDisplayTimeZone } from '../lib/date';

export const DEFAULT_TIME_ZONE = 'Asia/Bangkok';
export const TIME_ZONE_OPTIONS = [
  { value: 'Asia/Bangkok', label: 'Thailand', detail: 'GMT+7' },
  { value: 'Asia/Kolkata', label: 'India', detail: 'GMT+5:30' },
];

const STORAGE_KEY = 'buildsoftware_display_timezone';
const TimezoneContext = createContext(null);

const supportedTimeZone = (value) => (
  TIME_ZONE_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_TIME_ZONE
);

function initialTimeZone() {
  if (typeof window === 'undefined') return DEFAULT_TIME_ZONE;
  return supportedTimeZone(window.localStorage.getItem(STORAGE_KEY));
}

export function TimezoneProvider({ children }) {
  const [timeZone, setTimeZoneState] = useState(initialTimeZone);

  useEffect(() => {
    setDisplayTimeZone(timeZone);
    window.localStorage.setItem(STORAGE_KEY, timeZone);
  }, [timeZone]);

  const setTimeZone = useCallback((nextTimeZone) => {
    setTimeZoneState(supportedTimeZone(nextTimeZone));
  }, []);

  const value = useMemo(() => ({ timeZone, setTimeZone, options: TIME_ZONE_OPTIONS }), [timeZone, setTimeZone]);
  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

export function useTimeZone() {
  const context = useContext(TimezoneContext);
  if (!context) throw new Error('useTimeZone must be used inside TimezoneProvider.');
  return context;
}
