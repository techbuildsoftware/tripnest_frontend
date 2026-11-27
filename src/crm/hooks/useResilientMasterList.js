import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

const RECOVERY_DELAYS_MS = [1_000, 3_000, 8_000, 20_000];

// Keep already-loaded selector data visible during a brief API/database outage.
// The old hooks cleared the list after one failed request, leaving a user who
// had kept the CRM open for hours with empty master selectors until a reload.
export default function useResilientMasterList(path) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    let retryTimer;
    let retries = 0;

    const load = async () => {
      try {
        const response = await apiClient.get(path);
        if (!active) return;
        retries = 0;
        setItems((response.data || []).filter((item) => item.status === 'Active'));
      } catch {
        if (!active) return;
        const delay = RECOVERY_DELAYS_MS[Math.min(retries, RECOVERY_DELAYS_MS.length - 1)];
        retries += 1;
        retryTimer = setTimeout(load, delay);
      }
    };

    const recoverNow = () => {
      if (retryTimer) clearTimeout(retryTimer);
      load();
    };

    load();
    window.addEventListener('online', recoverNow);
    window.addEventListener('focus', recoverNow);
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('online', recoverNow);
      window.removeEventListener('focus', recoverNow);
    };
  }, [path]);

  return items;
}
