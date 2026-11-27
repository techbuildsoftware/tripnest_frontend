import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

export default function useLocations(country, state) {
  const [countries, setCountries] = useState([]); const [states, setStates] = useState([]); const [cities, setCities] = useState([]);
  useEffect(() => { apiClient.get('/locations/countries').then((r) => setCountries(r.data)).catch(() => setCountries([])); }, []);
  useEffect(() => { setStates([]); setCities([]); if (country) apiClient.get(`/locations/states/${encodeURIComponent(country)}`).then((r) => setStates(r.data)).catch(() => setStates([])); }, [country]);
  useEffect(() => { setCities([]); if (country && state) apiClient.get(`/locations/cities?country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`).then((r) => setCities(r.data)).catch(() => setCities([])); }, [country, state]);
  return { countries, states, cities };
}
