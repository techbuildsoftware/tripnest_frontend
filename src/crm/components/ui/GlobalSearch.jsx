import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, FileText, BookOpen, MessageSquare, Building2, Truck, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function GlobalSearch({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { queries, quotations, bookings, agents, hotels, suppliers } = useApp();

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const found = [];
    const match = (val, q) => String(val || '').toLowerCase().includes(q);

    agents.forEach(a => {
      if (match(a.name, q) || match(a.id, q)) {
        found.push({ type: 'Agent', icon: Users, color: 'text-orange-500 bg-orange-50', label: a.name, sub: a.id, path: `/masters/agents` });
      }
    });

    queries.forEach(qr => {
      if (match(qr.id, q) || match(qr.agentName, q) || match(qr.contactPerson, q) || match(qr.destination, q)) {
        found.push({ type: 'Query', icon: MessageSquare, color: 'text-blue-500 bg-blue-50', label: qr.id, sub: `${qr.agentName} • ${qr.destination}`, path: `/queries/${qr.id}` });
      }
    });

    quotations.forEach(qt => {
      if (match(qt.id, q) || match(qt.agentName, q) || match(qt.guestName, q)) {
        found.push({ type: 'Quotation', icon: FileText, color: 'text-purple-500 bg-purple-50', label: qt.id, sub: `${qt.agentName} • ${qt.guestName}`, path: `/quotations/${qt.id}` });
      }
    });

    bookings.forEach(b => {
      if (match(b.id, q) || match(b.agentName, q) || match(b.guestName, q)) {
        found.push({ type: 'Booking', icon: BookOpen, color: 'text-green-500 bg-green-50', label: b.id, sub: `${b.guestName} • ${b.destination}`, path: `/bookings/${b.id}` });
      }
    });

    hotels.forEach(h => {
      if (match(h.name, q) || match(h.destination, q)) {
        found.push({ type: 'Hotel', icon: Building2, color: 'text-red-500 bg-red-50', label: h.name, sub: `${h.destination} • ${h.category}`, path: `/masters/hotels` });
      }
    });

    suppliers.forEach(s => {
      if (match(s.name, q) || match(s.type, q)) {
        found.push({ type: 'Supplier', icon: Truck, color: 'text-yellow-600 bg-yellow-50', label: s.name, sub: `${s.type} • ${s.destination}`, path: `/masters/suppliers` });
      }
    });

    setResults(found.slice(0, 10));
  }, [query, agents, queries, quotations, bookings, hotels, suppliers]);

  const handleSelect = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-modal overflow-hidden fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search bookings, guests, agents, quotations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-base text-slate-900 placeholder-slate-400 outline-none bg-transparent"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {!query && (
            <div className="py-12 text-center">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Start typing to search across all records</p>
              <p className="text-slate-400 text-xs mt-1">Agents, Queries, Quotations, Bookings, Hotels...</p>
            </div>
          )}

          {query && results.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-slate-500 text-sm">No results found for "<span className="font-medium">{query}</span>"</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(result.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${result.color}`}>
                    <result.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{result.label}</div>
                    <div className="text-xs text-slate-500">{result.type} • {result.sub}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">↵</kbd> Select</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
