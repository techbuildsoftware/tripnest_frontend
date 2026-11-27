import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Download, MoreVertical,
  Eye, Edit, Copy, ArrowRight, X,
  Layers, Sparkles, Activity, FileText, CheckCircle2, XCircle,
  Building, User, Users, Mail, Phone, MapPin, Calendar, Settings, Grid, Plane, Flame, Link, ChevronRight, ArrowUpDown, SlidersHorizontal
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import usePaginatedRecords from '../../hooks/usePaginatedRecords';
import StatusBadge from '../../components/ui/StatusBadge';
import TablePagination from '../../components/ui/TablePagination';
import RemoteSortHeader from '../../components/ui/RemoteSortHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDate, formatDateTime, isTodayDate } from '../../lib/date';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api';

const PRIORITIES = ['All', 'Urgent', 'High', 'Medium', 'Normal'];
const STATUSES = ['All', 'New', 'Working', 'Quoted', 'Confirmed', 'Lost'];

const isRecordNew = (date) => isTodayDate(date);

export default function Queries() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { deleteQuery, addQuery } = useApp();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => STATUSES.includes(searchParams.get('status')) ? searchParams.get('status') : 'All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('queryDate');
  const [sortDir, setSortDir] = useState('desc');
  const [deleteId, setDeleteId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [viewQuery, setViewQuery] = useState(null);
  const { records: queries, pagination, summary, loading, setPage, reload } = usePaginatedRecords('/queries', {
    search, filters: { status: statusFilter, priority: priorityFilter }, sortBy, sortDir,
  });
  const statusCount = (status) => status === 'All' ? summary.total : (summary.statusCounts?.[status] || 0);

  const statCards = [
    { label: 'Total', count: statusCount('All'), icon: Layers, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20', textColor: 'text-blue-500' },
    { label: 'New', count: statusCount('New'), icon: Sparkles, gradient: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20', textColor: 'text-purple-500' },
    { label: 'Working', count: statusCount('Working'), icon: Activity, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-orange-500/20', textColor: 'text-orange-500' },
    { label: 'Quoted', count: statusCount('Quoted'), icon: FileText, gradient: 'from-sky-400 to-blue-500', shadow: 'shadow-sky-500/20', textColor: 'text-sky-500' },
    { label: 'Confirmed', count: statusCount('Confirmed'), icon: CheckCircle2, gradient: 'from-emerald-400 to-green-600', shadow: 'shadow-emerald-500/20', textColor: 'text-emerald-500' },
    { label: 'Lost', count: statusCount('Lost'), icon: XCircle, gradient: 'from-slate-400 to-slate-600', shadow: 'shadow-slate-500/20', textColor: 'text-slate-500' },
  ];

  const [exporting, setExporting] = useState(false);
  const exportQueries = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // Export every record matching the current search / filters, not just the visible page.
      const all = [];
      const limit = 100;
      for (let page = 1; page <= 200; page += 1) {
        const params = new URLSearchParams({ page: String(page), limit: String(limit), summary: 'false' });
        if (search.trim()) params.set('search', search.trim());
        if (sortBy) params.set('sortBy', sortBy);
        if (sortDir) params.set('sortDir', sortDir);
        if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter);
        if (priorityFilter && priorityFilter !== 'All') params.set('priority', priorityFilter);
        const response = await apiClient.get(`/queries?${params.toString()}`);
        const rows = response.data || [];
        all.push(...rows);
        const totalPages = response.pagination?.totalPages || 1;
        if (page >= totalPages || !rows.length) break;
      }
      if (!all.length) { toast.error('No queries to export.'); return; }
      const head = ['Query ID', 'Query Date', 'Travel Date', 'Agent', 'Client', 'Destination', 'Adults', 'Children', 'Priority', 'Status', 'Follow-up'];
      const body = all.map((q) => [q.id, formatDate(q.queryDate), formatDate(q.travelDate), q.agentName || '', q.contactPerson || '', q.destination || '', Number(q.adults || 0), Number(q.children || 0), q.priority || '', q.status || '', formatDate(q.followUpDate)]);
      const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Calibri,Arial;font-size:11pt}th{background:#173567;color:#ffffff;font-weight:bold;border:1px solid #0f2547;padding:6px 10px;text-align:left}td{border:1px solid #cbd5e1;padding:5px 10px;mso-number-format:"\\@"}td.n{mso-number-format:"0";text-align:right}tr:nth-child(even) td{background:#f1f5f9}</style></head><body><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((v) => `<td${typeof v === 'number' ? ' class="n"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
      const url = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = `queries-${new Date().toISOString().slice(0, 10)}.xls`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} queries.`);
    } catch (error) {
      toast.error(error.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const handleDuplicate = async (q) => {
    const dup = { ...q, id: undefined, queryDate: todayIsoInTimeZone(), status: 'New', quotations: [] };
    try { await addQuery(dup); reload(); toast.success('Query duplicated!'); }
    catch (error) { toast.error(error.message); }
  };

  const priorityColors = { Urgent: 'text-red-600', High: 'text-orange-500', Medium: 'text-yellow-500', Normal: 'text-slate-400' };
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><Search className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h1 className="page-title leading-tight">Queries</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage all travel inquiries and leads</p>
            </div>
          </div>
          <button type="button" title="Filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(o => !o)} className={`sm:hidden relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border shadow-sm ${filtersOpen ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-600'}`}>
            <SlidersHorizontal className="h-4 w-4" />
            {(statusFilter !== 'All' || priorityFilter !== 'All') && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-600" />}
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-1 max-w-3xl items-center gap-2 xl:ml-auto">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Query ID, agent, destination..."
              className="form-input text-xs h-8 pl-8 w-full"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${filtersOpen ? 'block' : 'hidden'} sm:block form-select text-xs h-8 py-1 w-full sm:w-28 flex-shrink-0`}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={`${filtersOpen ? 'block' : 'hidden'} sm:block form-select text-xs h-8 py-1 w-full sm:w-28 flex-shrink-0`}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button type="button" onClick={exportQueries} disabled={exporting} className="btn-secondary h-8 px-3 text-xs w-full sm:w-auto justify-center disabled:opacity-60"><Download className="w-3.5 h-3.5 mr-1" /> {exporting ? 'Exporting…' : 'Export'}</button>
            <button onClick={() => navigate('/app/queries/new')} className="btn-primary h-8 px-3 text-xs w-full sm:w-auto justify-center">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Query
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map(({ label, count, icon: Icon, gradient, shadow, textColor }) => (
          <div
            key={label}
            onClick={() => setStatusFilter(label === 'Total' ? 'All' : label)}
            className={`bg-white rounded-xl border p-3 flex items-center justify-between cursor-pointer transition-all hover:shadow-md relative overflow-hidden group ${(label === 'Total' ? statusFilter === 'All' : statusFilter === label) ? 'border-blue-400 shadow-[0_0_0_1px_rgba(96,165,250,1)]' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md bg-gradient-to-br ${gradient} ${shadow} transform group-hover:scale-105 transition-transform duration-300 flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-800 leading-none">{count}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-1">{label}</div>
              </div>
            </div>
            {/* Sparkline Decorative SVG */}
            <div className={`absolute right-0 bottom-0 opacity-100 transition-opacity pointer-events-none ${textColor}`}>
              <svg width="80" height="40" viewBox="0 0 80 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id={`grad-${label.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 40C20 40 20 15 40 15C60 15 60 30 80 30V40H0Z" fill={`url(#grad-${label.replace(/\s+/g, '-')})`} />
                <path d="M0 40C20 40 20 15 40 15C60 15 60 30 80 30" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
              </svg>
            </div>
          </div>
        ))}
      </div>



      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <RemoteSortHeader column="id" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Query ID</RemoteSortHeader>
                <RemoteSortHeader column="queryDate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Query Date</RemoteSortHeader>
                <RemoteSortHeader column="travelDate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Travel Date</RemoteSortHeader>
                <RemoteSortHeader column="agentName" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Agent</RemoteSortHeader>
                <RemoteSortHeader column="contactPerson" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Client</RemoteSortHeader>
                <RemoteSortHeader column="destination" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Destination</RemoteSortHeader>
                <RemoteSortHeader column="adults" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Pax</RemoteSortHeader>
                <RemoteSortHeader column="priority" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Priority</RemoteSortHeader>
                <RemoteSortHeader column="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Status</RemoteSortHeader>
                <RemoteSortHeader column="followUpDate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Follow-up</RemoteSortHeader>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white [&>tr>td]:border-b [&>tr>td]:border-slate-200">
              {queries.map(q => (
                <tr key={q.id} className="table-row group cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setViewQuery(q)}>
                  <td className="table-cell whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/queries/${q.id}`); }} className="text-primary-600 font-medium hover:text-primary-700 font-mono text-xs">
                        {q.id}
                      </button>
                      {isRecordNew(q.createdAt || q.queryDate) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200/80 tracking-wide">
                          New
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell text-xs text-slate-600 whitespace-nowrap">{formatDate(q.queryDate)}</td>
                  <td className="table-cell text-xs text-slate-600 whitespace-nowrap">{formatDate(q.travelDate)}</td>
                  <td className="table-cell font-medium text-slate-900 text-sm whitespace-nowrap">{q.agentName || '—'}</td>
                  <td className="table-cell text-sm text-slate-700 whitespace-nowrap">{q.contactPerson || '—'}</td>
                  <td className="table-cell text-sm whitespace-nowrap">{q.destination}</td>
                  <td className="table-cell text-xs whitespace-nowrap">{q.adults}A {q.children}C</td>
                  <td className="table-cell whitespace-nowrap">
                    <span className={`text-xs font-semibold ${priorityColors[q.priority] || 'text-slate-500'}`}>
                      {q.priority}
                    </span>
                  </td>
                  <td className="table-cell whitespace-nowrap"><StatusBadge status={q.status} /></td>
                  <td className="table-cell text-xs text-slate-600 whitespace-nowrap">{formatDate(q.followUpDate)}</td>
                  <td className="table-cell">
                    <div className="relative flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setViewQuery(q); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors" title="View">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/queries/${q.id}`); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors" title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenuId === q.id) {
                              setOpenMenuId(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const menuHeight = 220; // Estimated height
                              if (spaceBelow < menuHeight) {
                                setMenuPos({ bottom: window.innerHeight - rect.top, right: window.innerWidth - rect.right });
                              } else {
                                setMenuPos({ top: rect.bottom, right: window.innerWidth - rect.right });
                              }
                              setOpenMenuId(q.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {openMenuId === q.id && createPortal(
                          <div 
                            className="fixed mt-1 w-48 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1 z-[100] fade-in"
                            style={menuPos}
                          >
                            <button onClick={(e) => { e.stopPropagation(); setViewQuery(q); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                              <Eye className="w-4 h-4" /> View Details
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/queries/${q.id}`); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                              <Edit className="w-4 h-4" /> Edit Query
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDuplicate(q); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                              <Copy className="w-4 h-4" /> Duplicate
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/quotations/new?query=${encodeURIComponent(q.id)}`); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50">
                              <ArrowRight className="w-4 h-4" /> Convert to Quotation
                            </button>
                            <div className="border-t border-slate-100 mt-1 pt-1">
                              <button onClick={(e) => { e.stopPropagation(); setDeleteId(q.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                <X className="w-4 h-4" /> Close Query
                              </button>
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && queries.length === 0 && (
                <tr><td colSpan="11" className="py-12 text-center"><div className="text-slate-400 text-sm">No queries found</div><button onClick={() => navigate('/app/queries/new')} className="btn-primary mt-4 mx-auto"><Plus className="w-4 h-4" /> Create First Query</button></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination pagination={pagination} loading={loading} onPageChange={setPage} label="queries" />
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => { try { await deleteQuery(deleteId); reload(); toast.success('Query closed'); } catch (error) { toast.error(error.message); } }}
        title="Close Query"
        message="Are you sure you want to close this query? This action cannot be undone."
        confirmLabel="Close Query"
      />

      {viewQuery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-slate-900/45 backdrop-blur-[4px] fade-in" onClick={() => setViewQuery(null)}>
          <div 
            className="w-full max-w-6xl bg-white rounded-[18px] sm:rounded-[24px] shadow-2xl relative overflow-hidden flex flex-col slide-up"
            style={{ maxHeight: 'calc(100dvh - 1rem)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header / Banner Area */}
            <div className="relative pt-4 sm:pt-5 px-4 sm:px-6 pb-1 sm:pb-2 flex justify-between items-start">
              {/* Banner background */}
              <div 
                className="absolute top-0 right-0 w-1/2 sm:w-2/3 h-28 sm:h-40 opacity-100 pointer-events-none"
                style={{
                  backgroundImage: 'url("https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80")',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 40%)',
                  maskImage: 'linear-gradient(to right, transparent, black 40%)'
                }}
              ></div>
              <div className="hidden lg:block absolute top-10 right-100 pointer-events-none rotate-[-5deg]">
                <div className="font-['Brush_Script_MT',cursive,serif] italic text-[24px] text-[#1e3a8a] drop-shadow-sm">"Explore Dream Discover"</div>
              </div>

              {/* Close Button */}
              <button onClick={() => setViewQuery(null)} className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-slate-500 hover:text-slate-900 hover:bg-white shadow-sm transition-all border border-slate-200">
                <X className="w-4 h-4" />
              </button>

              <div className="relative z-10 flex gap-2.5 sm:gap-3 pr-10">
                <div className="w-10 h-10 rounded-xl bg-[#14a09a] flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="pt-0.5">
                  <h2 className="text-base sm:text-[18px] font-extrabold text-slate-900 tracking-tight leading-none">Query Details</h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium mt-1 leading-snug">Complete information about this travel inquiry</p>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="px-3 sm:px-6 pb-4 sm:pb-6 overflow-y-auto custom-scrollbar flex-1 relative z-10 space-y-3 sm:space-y-4 mt-1 sm:mt-2">
              
              {/* Query ID & Badges */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-white/95 backdrop-blur-sm rounded-2xl p-2 sm:p-1.5 sm:inline-flex w-full sm:w-auto border border-slate-200/60 shadow-sm relative z-10">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-500">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Query ID</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-black text-slate-900 font-mono tracking-tight leading-none">{viewQuery.id}</span>
                      <button className="text-slate-400 hover:text-blue-600 transition-colors" title="Copy ID">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" /> Created on {formatDateTime(viewQuery.createdAt || viewQuery.queryDate)}
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1"></div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-2 w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-100 sm:border-0">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${viewQuery.priority === 'Urgent' || viewQuery.priority === 'High' ? 'bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                    <Flame className="w-3 h-3" /> {viewQuery.priority || 'High'} priority
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]">
                    <CheckCircle2 className="w-3 h-3" /> {viewQuery.status}
                  </span>
                </div>
              </div>

              {/* Three Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                {/* Column 1: Traveller & Contact */}
                <div className="bg-[#f8fafc] border border-slate-200/60 rounded-[14px] p-3 sm:p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2.5 mb-2.5 sm:mb-4">
                    <div className="w-8 h-8 rounded-xl bg-[#14a09a] flex items-center justify-center text-white shadow-sm z-10 relative">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex-1 z-10 relative">
                      <h3 className="text-[12px] font-extrabold text-slate-800 leading-tight">Traveller & Contact</h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Client and traveller information</p>
                    </div>
                    <div className="absolute top-3 right-3 text-blue-100"><Users className="w-10 h-10" /></div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-3 relative z-10">
                    <div className="flex items-start justify-between text-[11px] gap-2 border-b border-slate-100 pb-1 sm:pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><Building className="w-3.5 h-3.5" /> <span>Agent / Client</span></div>
                      <div className="font-bold text-slate-900 text-right break-words max-w-[60%] sm:max-w-[160px]" title={viewQuery.agentName || viewQuery.clientType}>{viewQuery.agentName || viewQuery.clientType || '—'}</div>
                    </div>
                    <div className="flex items-start justify-between text-[11px] gap-2 border-b border-slate-100 pb-1 sm:pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><User className="w-3.5 h-3.5" /> <span>Contact Person</span></div>
                      <div className="font-bold text-slate-900 text-right break-words max-w-[60%] sm:max-w-[160px]" title={viewQuery.contactPerson}>{viewQuery.contactPerson || '—'}</div>
                    </div>
                    <div className="flex items-start justify-between text-[11px] gap-2 border-b border-slate-100 pb-1 sm:pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><Users className="w-3.5 h-3.5" /> <span>Guest</span></div>
                      <div className="font-bold text-slate-900 text-right break-words max-w-[60%] sm:max-w-[160px]" title={viewQuery.guestName}>{viewQuery.guestName || '—'}</div>
                    </div>
                    <div className="flex items-start justify-between text-[11px] gap-2 border-b border-slate-100 pb-1 sm:pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5 whitespace-nowrap"><Mail className="w-3.5 h-3.5" /> <span>Email</span></div>
                      <div className="font-bold text-[#0e8a85] text-right break-words hover:underline cursor-pointer flex-1" title={viewQuery.contactEmail}>{viewQuery.contactEmail || '—'}</div>
                    </div>
                    <div className="flex items-start justify-between text-[11px] gap-2">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><Phone className="w-3.5 h-3.5" /> <span>Phone</span></div>
                      <div className="font-bold text-slate-900 text-right flex items-center gap-1.5 max-w-[60%] sm:max-w-[160px] flex-wrap justify-end">
                        {(viewQuery.mobileNumber || viewQuery.landlineNumber) ? [viewQuery.mobileNumber, viewQuery.landlineNumber].filter(Boolean).join(' · ') : '—'}
                        {viewQuery.mobileNumber && <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0"><Phone className="w-2.5 h-2.5" /></span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Travel Plan */}
                <div className="bg-[#f0fdf4] border border-green-100/60 rounded-[14px] p-3 sm:p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2.5 mb-2.5 sm:mb-4">
                    <div className="w-8 h-8 rounded-xl bg-[#22c55e] flex items-center justify-center text-white shadow-sm z-10 relative">
                      <Plane className="w-4 h-4" />
                    </div>
                    <div className="flex-1 z-10 relative">
                      <h3 className="text-[12px] font-extrabold text-slate-800 leading-tight">Travel Plan</h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Trip information and preferences</p>
                    </div>
                    <div className="absolute top-3 right-3 text-green-200/60"><MapPin className="w-10 h-10" /></div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-3 relative z-10">
                    <div className="flex items-start justify-between text-[11px] gap-2 border-b border-green-100/50 pb-1 sm:pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><MapPin className="w-3.5 h-3.5" /> <span>Destination</span></div>
                      <div className="font-bold text-slate-900 text-right break-words max-w-[60%] sm:max-w-[160px]" title={viewQuery.destination}>{viewQuery.destination || 'Phuket + Koh Samui'}</div>
                    </div>
                    <div className="flex items-start justify-between text-[11px] gap-2 border-b border-green-100/50 pb-1 sm:pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><Calendar className="w-3.5 h-3.5" /> <span>Travel Date</span></div>
                      <div className="font-bold text-slate-900 text-right">{formatDate(viewQuery.travelDate) || '—'}</div>
                    </div>
                    <div className="flex items-start justify-between text-[11px] gap-2 border-b border-green-100/50 pb-1 sm:pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><Calendar className="w-3.5 h-3.5" /> <span>End Date</span></div>
                      <div className="font-bold text-slate-900 text-right">{formatDate(viewQuery.endDate) || '—'}</div>
                    </div>
                    <div className="flex items-start justify-between text-[11px] gap-2 border-b border-green-100/50 pb-1 sm:pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><Settings className="w-3.5 h-3.5" /> <span>Service Type</span></div>
                      <div className="font-bold text-slate-900 text-right break-words max-w-[60%] sm:max-w-[160px]">{viewQuery.serviceType || '—'}</div>
                    </div>
                    <div className="flex items-start justify-between text-[11px] gap-2">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><Users className="w-3.5 h-3.5" /> <span>Pax Details</span></div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[60%] sm:max-w-[160px]">
                        <span className="font-bold text-slate-900 text-right">{Number(viewQuery.adults||0)}A · {Number(viewQuery.children||0)}C · {Number(viewQuery.infants||0)}I</span>
                        <span className="bg-[#dbeafe] text-[#0a5856] text-[9px] font-bold px-1.5 py-0.5 rounded-full">{Number(viewQuery.adults||0)+Number(viewQuery.children||0)} Pax</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Operations */}
                <div className="bg-[#fffbeb] border border-amber-100/60 rounded-[14px] p-3 sm:p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2.5 mb-2.5 sm:mb-4">
                    <div className="w-8 h-8 rounded-xl bg-[#f59e0b] flex items-center justify-center text-white shadow-sm z-10 relative">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div className="flex-1 z-10 relative">
                      <h3 className="text-[12px] font-extrabold text-slate-800 leading-tight">Operations</h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Internal handling information</p>
                    </div>
                    <div className="absolute top-3 right-3 text-amber-200/60"><Grid className="w-10 h-10" /></div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-3 relative z-10">
                    <div className="flex items-start justify-between text-[11px] gap-2 border-b border-amber-100/50 pb-1 sm:pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><Link className="w-3.5 h-3.5" /> <span>Lead Source</span></div>
                      <div className="font-bold text-slate-900 text-right break-words max-w-[60%] sm:max-w-[160px]">{viewQuery.leadSource || '—'}</div>
                    </div>
                    <div className="flex items-start justify-between text-[11px] gap-2 border-b border-amber-100/50 pb-1 sm:pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><User className="w-3.5 h-3.5" /> <span>Sales Person</span></div>
                      <div className="font-bold text-slate-900 text-right break-words max-w-[60%] sm:max-w-[160px]">{viewQuery.salesPerson || '—'}</div>
                    </div>
                    <div className="flex items-start justify-between text-[11px] gap-2 border-b border-amber-100/50 pb-1 sm:pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> <span>Operation Person</span></div>
                      <div className="font-bold text-slate-900 text-right break-words max-w-[60%] sm:max-w-[160px]">{viewQuery.operationPerson || '—'}</div>
                    </div>
                    <div className="flex items-start justify-between text-[11px] gap-2 border-b border-amber-100/50 pb-1 sm:pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><Calendar className="w-3.5 h-3.5" /> <span>Follow-up Date</span></div>
                      <div className="font-bold text-slate-900 text-right">{formatDate(viewQuery.followUpDate) || '—'}</div>
                    </div>
                    <div className="flex items-start justify-between text-[11px] gap-2">
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5"><Building className="w-3.5 h-3.5" /> <span>Company</span></div>
                      <div className="font-bold text-slate-900 text-right break-words max-w-[60%] sm:max-w-[160px]">{viewQuery.company || 'TripNest Pvt Ltd'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Destination Schedule */}
              <div className="bg-[#f8fafc] border border-slate-200/80 rounded-[14px] p-3 sm:p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5 sm:mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#7c3aed] flex items-center justify-center text-white shadow-sm shadow-purple-500/20 flex-shrink-0">
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-extrabold text-slate-900">Destination Schedule</h3>
                      <p className="text-[10px] text-slate-500 font-medium">Trip itinerary with dates</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center flex-nowrap overflow-x-auto custom-scrollbar pb-1 gap-2 px-1">
                  {viewQuery.travelSegments?.length ? viewQuery.travelSegments.map((segment, index) => (
                    <React.Fragment key={index}>
                      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)] p-2 flex items-center gap-3 min-w-[230px] sm:min-w-[260px]">
                        <img 
                          src={`https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=120&h=120`} 
                          alt="Dest" 
                          className="w-10 h-10 rounded-lg object-cover shadow-sm" 
                        />
                        <div className="flex-1 min-w-0">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-[#14a09a] text-white text-[9px] font-bold mb-1 shadow-sm shadow-blue-500/20">Leg {index + 1}</span>
                          <div className="text-[12px] font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                            {segment.departureDestination || '—'} <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" /> {segment.arrivalDestination || '—'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(segment.fromDate)} to {formatDate(segment.toDate)}
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0 cursor-pointer hover:bg-[#eff6ff] hover:text-[#0e8a85] border border-slate-100 transition-colors">
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                      {index < viewQuery.travelSegments.length - 1 && (
                        <div className="text-[#14a09a] flex-shrink-0 px-0.5 opacity-70">
                          <Plane className="w-5 h-5 rotate-45" />
                        </div>
                      )}
                    </React.Fragment>
                  )) : (
                    <div className="text-[11px] text-slate-500 italic py-1">No destination schedule available.</div>
                  )}
                </div>
              </div>

              {/* Query Title & Info */}
              {(viewQuery.queryTitle || viewQuery.otherInformation || viewQuery.ccMails?.length) && (
                <div className="flex gap-2.5 sm:gap-3 p-0 sm:p-1">
                  <div className="w-8 h-8 rounded-full bg-[#e9d5ff] flex items-center justify-center text-[#9333ea] shadow-sm flex-shrink-0 mt-1">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="sm:w-48 sm:flex-shrink-0">
                      <h3 className="text-[13px] font-extrabold text-slate-900">Query Title</h3>
                      <p className="text-[10px] text-slate-500 font-medium">Subject or summary of this inquiry</p>
                    </div>
                    <div className="bg-[#eff6ff] flex-1 rounded-xl p-3 min-h-[40px] flex items-center">
                      <div className="text-[12px] font-bold text-slate-800">{viewQuery.queryTitle || viewQuery.otherInformation || '—'}</div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-3 sm:px-6 py-2.5 sm:py-4 border-t border-slate-200 flex items-center justify-end bg-white relative z-10 rounded-b-[24px]">
              <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                <button onClick={() => setViewQuery(null)} className="flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-[10px] border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                  Close
                </button>
                <button 
                  onClick={() => {
                    const query = viewQuery;
                    setViewQuery(null);
                    navigate(`/queries/${query.id}`);
                  }}
                  className="flex-1 sm:flex-none justify-center px-4 sm:px-5 py-2 rounded-[10px] bg-[#0e8a85] text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Query
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close menus on outside click */}
      {openMenuId && <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />}
    </div>
  );
}
