import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api';
import YachtList from './yacht/YachtList';
import YachtEditor from './yacht/YachtEditor';

export default function YachtMaster() {
  const [yachts, setYachts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setYachts((await apiClient.get('/yachts')).data || []); }
    catch (error) { toast.error(error.message || 'Could not load yachts.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (yacht) => {
    if (!window.confirm(`Delete ${yacht.name}? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/yachts/${encodeURIComponent(yacht.id)}`);
      setYachts((items) => items.filter((item) => item.id !== yacht.id));
      toast.success('Yacht deleted.');
    } catch (error) { toast.error(error.message || 'Could not delete yacht.'); }
  };

  if (selected !== null) return <YachtEditor yacht={selected} onBack={() => setSelected(null)} onSaved={(record) => { setYachts((items) => { const exists = items.some((item) => item.id === record.id); return exists ? items.map((item) => item.id === record.id ? record : item) : [record, ...items]; }); setSelected(record); }} />;
  return <YachtList yachts={yachts} loading={loading} onSelect={setSelected} onAdd={() => setSelected({})} onDelete={remove} />;
}
