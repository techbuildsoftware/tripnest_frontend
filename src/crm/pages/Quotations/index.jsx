import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Download, MoreVertical, Eye, Edit, Copy, X, BookOpen,
  Layers, FileEdit, Send, Clock, Edit3, CheckSquare, CheckCircle2, XCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import usePaginatedRecords from '../../hooks/usePaginatedRecords';
import MiniBars from '../../components/ui/MiniBars';
import StatusBadge from '../../components/ui/StatusBadge';
import TablePagination from '../../components/ui/TablePagination';
import RemoteSortHeader from '../../components/ui/RemoteSortHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDate, isTodayDate } from '../../lib/date';
import { apiClient } from '../../lib/api';
import { downloadExcelTable } from '../../lib/exportTable';

const STATUSES = ['All', 'Draft', 'Sent', 'Follow-up', 'Revised', 'Accepted', 'Confirmed', 'Cancelled'];

const isRecordNew = (date) => isTodayDate(date);

export default function Quotations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { deleteQuotation, addQuotation, convertQuotationToBooking } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => STATUSES.includes(searchParams.get('status')) ? searchParams.get('status') : 'All');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [deleteId, setDeleteId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const { records: quotations, pagination, summary, loading, setPage, reload } = usePaginatedRecords('/quotations', {
    search, filters: { status: statusFilter }, sortBy, sortDir,
  });
  const statusCount = (status) => status === 'All' ? summary.total : (summary.statusCounts?.[status] || 0);
  const [exporting, setExporting] = useState(false);
  const exportQuotations = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // Export every quotation matching the current search / status, not just the visible page.
      const all = [];
      for (let page = 1; page <= 200; page += 1) {
        const params = new URLSearchParams({ page: String(page), limit: '100', summary: 'false' });
        if (search.trim()) params.set('search', search.trim());
        if (sortBy) params.set('sortBy', sortBy);
        if (sortDir) params.set('sortDir', sortDir);
        if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter);
        const response = await apiClient.get(`/quotations?${params.toString()}`);
        const rows = response.data || [];
        all.push(...rows);
        if (page >= (response.pagination?.totalPages || 1) || !rows.length) break;
      }
      if (!all.length) { toast.error('No quotations to export.'); return; }
      downloadExcelTable({
        filename: `quotations-${new Date().toISOString().slice(0, 10)}`,
        head: ['Quotation ID', 'Version', 'Agent', 'Guest', 'Travel Date', 'Adults', 'Children', 'Selling Price', 'Margin %', 'Status', 'Valid Until'],
        rows: all.map((q) => [q.id, q.version ? `V${String(q.version).replace(/^v/i, '')}` : '', q.agentName || '', q.guestName || '', formatDate(q.travelDate), Number(q.adults || 0), Number(q.children || 0), Number(q.pricing?.totalSelling || 0), Number(q.pricing?.margin || 0), q.status || '', formatDate(q.validUntil)]),
      });
      toast.success(`Exported ${all.length} quotations.`);
    } catch (error) {
      toast.error(error.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortDir('asc'); }
  };

  const statCards = [
    { label: 'Total', count: statusCount('All'), icon: Layers, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20', textColor: 'text-blue-500' },
    { label: 'Draft', count: statusCount('Draft'), icon: FileEdit, gradient: 'from-slate-400 to-slate-500', shadow: 'shadow-slate-500/20', textColor: 'text-slate-500' },
    { label: 'Sent', count: statusCount('Sent'), icon: Send, gradient: 'from-sky-400 to-blue-500', shadow: 'shadow-sky-500/20', textColor: 'text-sky-500' },
    { label: 'Follow-up', count: statusCount('Follow-up'), icon: Clock, gradient: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20', textColor: 'text-purple-500' },
    { label: 'Revised', count: statusCount('Revised'), icon: Edit3, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-orange-500/20', textColor: 'text-orange-500' },
    { label: 'Accepted', count: statusCount('Accepted'), icon: CheckSquare, gradient: 'from-teal-400 to-emerald-500', shadow: 'shadow-emerald-500/20', textColor: 'text-emerald-500' },
    { label: 'Confirmed', count: statusCount('Confirmed'), icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-green-500/20', textColor: 'text-green-500' },
    { label: 'Cancelled', count: statusCount('Cancelled'), icon: XCircle, gradient: 'from-red-400 to-red-600', shadow: 'shadow-red-500/20', textColor: 'text-red-500' },
  ];

  const fmt = (n) => `฿${Number(n || 0).toLocaleString()}`;

  const handleConvert = async (id) => {
    const quotation = quotations.find((item) => item.id === id);
    if (quotation?.bookingId) { toast.error(`This quotation is already booked as ${quotation.bookingId}.`); return; }
    try {
      const booking = await convertQuotationToBooking(id);
      if (booking) { reload(); toast.success(`Booking ${booking.id} created!`); navigate(`/bookings/${booking.id}`); }
    } catch (error) { toast.error(error.message); }
  };

  const handleDuplicate = async (q) => {
    const dup = { ...q, id: undefined, status: 'Draft', version: 1, versions: [], createdAt: new Date().toISOString() };
    try { await addQuotation(dup); reload(); toast.success('Quotation duplicated!'); }
    catch (error) { toast.error(error.message); }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><BookOpen className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h1 className="page-title leading-tight">Quotations</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Build and manage travel quotations</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-1 max-w-2xl items-center gap-2 xl:ml-auto">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quotations..." className="form-input text-xs h-8 pl-8 w-full" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select text-xs h-8 py-1 w-full sm:w-32 flex-shrink-0">
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button type="button" onClick={exportQuotations} disabled={exporting} className="btn-secondary h-8 px-3 text-xs w-full sm:w-auto justify-center disabled:opacity-60"><Download className="w-3.5 h-3.5 mr-1" /> {exporting ? 'Exporting…' : 'Export'}</button>
            <button onClick={() => navigate('/app/quotations/new')} className="btn-primary h-8 px-3 text-xs w-full sm:w-auto justify-center">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Quotation
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
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
            <MiniBars value={count} className={textColor || 'text-blue-500'} show="hidden 2xl:flex" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <RemoteSortHeader column="id" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Quotation ID</RemoteSortHeader>
                <RemoteSortHeader column="version" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Version</RemoteSortHeader>
                <RemoteSortHeader column="agentName" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Agent</RemoteSortHeader>
                <RemoteSortHeader column="guestName" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Guest</RemoteSortHeader>
                <RemoteSortHeader column="travelDate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Travel Date</RemoteSortHeader>
                <RemoteSortHeader column="adults" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Pax</RemoteSortHeader>
                <RemoteSortHeader column="pricing.totalSelling" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Selling Price</RemoteSortHeader>
                <RemoteSortHeader column="pricing.margin" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Margin</RemoteSortHeader>
                <RemoteSortHeader column="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Status</RemoteSortHeader>
                <RemoteSortHeader column="validUntil" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Valid Until</RemoteSortHeader>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.map(q => (
                <tr 
                  key={q.id} 
                  className="table-row cursor-pointer hover:bg-slate-50/80 transition-colors"
                  onClick={() => navigate(`/quotations/${q.id}`)}
                >
                  <td className="table-cell whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/quotations/${q.id}`); }} 
                        className="text-primary-600 font-medium hover:text-primary-700 font-mono text-xs"
                      >
                        {q.id}
                      </button>
                      {isRecordNew(q.quotationDate || q.createdAt || q.date) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200/80 tracking-wide">
                          New
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell text-xs text-slate-500">V{q.version}</td>
                  <td className="table-cell">
                    <div className="font-medium text-slate-900 text-sm">{q.agentName}</div>
                  </td>
                  <td className="table-cell text-sm">{q.guestName}</td>
                  <td className="table-cell text-xs text-slate-600">{formatDate(q.travelDate)}</td>
                  <td className="table-cell text-xs">{q.adults}A {q.children}C</td>
                  <td className="table-cell font-semibold text-slate-900">{fmt(q.pricing?.totalSelling)}</td>
                  <td className="table-cell">
                    <span className={`text-xs font-semibold ${q.pricing?.margin >= 15 ? 'text-green-600' : q.pricing?.margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {q.pricing?.margin?.toFixed(1)}%
                    </span>
                  </td>
                  <td className="table-cell"><StatusBadge status={q.status} /></td>
                  <td className="table-cell text-xs text-slate-600">{formatDate(q.validUntil)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/quotations/${q.id}`); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Open">
                        <Eye className="w-3.5 h-3.5" />
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
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {openMenuId === q.id && createPortal(
                          <div 
                            className="fixed mt-1 w-52 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1 z-[100] fade-in"
                            style={menuPos}
                          >
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/quotations/${q.id}`); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                              <Edit className="w-4 h-4" /> Open Builder
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDuplicate(q); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                              <Copy className="w-4 h-4" /> Duplicate
                            </button>
                            {(q.status === 'Accepted' || q.status === 'Confirmed') && (
                              <button onClick={(e) => { e.stopPropagation(); handleConvert(q.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50">
                                <BookOpen className="w-4 h-4" /> Convert to Booking
                              </button>
                            )}
                            <div className="border-t mt-1 pt-1">
                              <button onClick={(e) => { e.stopPropagation(); setDeleteId(q.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                <X className="w-4 h-4" /> Delete
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
              {!loading && quotations.length === 0 && (
                <tr><td colSpan="11" className="py-12 text-center"><p className="text-slate-400 text-sm">No quotations found</p><button onClick={() => navigate('/app/quotations/new')} className="btn-primary mt-4 mx-auto"><Plus className="w-4 h-4" /> Create Quotation</button></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination pagination={pagination} loading={loading} onPageChange={setPage} label="quotations" />
      </div>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={async () => { try { await deleteQuotation(deleteId); reload(); toast.success('Quotation deleted'); } catch (error) { toast.error(error.message); } }}
        title="Delete Quotation" message="Are you sure you want to delete this quotation?" />
      {openMenuId && <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />}
    </div>
  );
}
