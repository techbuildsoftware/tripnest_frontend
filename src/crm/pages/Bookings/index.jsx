import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, MoreVertical, Eye, Trash2, X, SlidersHorizontal,
  Layers, Calendar, Plane, CheckSquare, Clock, FileText, MapPin, Users, ArrowRight, User
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import usePaginatedRecords from '../../hooks/usePaginatedRecords';
import MiniBars from '../../components/ui/MiniBars';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import TablePagination from '../../components/ui/TablePagination';
import RemoteSortHeader from '../../components/ui/RemoteSortHeader';
import { ReportDateInput } from '../Reports/ReportDateRange.jsx';
import { formatDate, isTodayDate } from '../../lib/date';

const fmt = (n) => `฿${Number(n || 0).toLocaleString()}`;

const isRecordNew = (date) => isTodayDate(date);

export default function Bookings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { deleteBooking, convertQuotationToBooking } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => ['All', 'Confirmed', 'Upcoming', 'Traveling', 'Completed', 'Cancelled', 'Today'].includes(searchParams.get('status')) ? searchParams.get('status') : 'All');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');
  const arrivalDateFilter = searchParams.get('arrivalDate') || '';
  const departureDateFilter = searchParams.get('departureDate') || '';
  const travelStateFilter = searchParams.get('travelState') || '';
  const hasActiveFilters = Boolean(
    search ||
    statusFilter !== 'All' ||
    arrivalDateFilter ||
    departureDateFilter ||
    travelStateFilter
  );
  const [deleteId, setDeleteId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [creatingId, setCreatingId] = useState(null);
  const { records: bookings, pagination, summary, loading, setPage, reload } = usePaginatedRecords('/bookings', {
    search,
    filters: { status: statusFilter, arrivalDate: arrivalDateFilter, departureDate: departureDateFilter, travelState: travelStateFilter },
    // Keep this server-side so pagination, filtering, and refreshes always
    // show the most recently changed booking first.
    sortBy,
    sortDir,
  });
  const {
    records: availableQuotations,
    pagination: availableQuotationPagination,
    loading: availableQuotationsLoading,
    setPage: setAvailableQuotationPage,
    reload: reloadAvailableQuotations,
  } = usePaginatedRecords('/quotations', { filters: { availableForBooking: 'true' }, enabled: showCreate, includeSummary: false, pageLoading: false });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const statusCount = (status) => status === 'All' ? summary.total : (summary.statusCounts?.[status] || 0);
  const updateBookingFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };
  const clearBookingFilters = () => {
    setSearch('');
    setStatusFilter('All');
    const next = new URLSearchParams(searchParams);
    ['arrivalDate', 'departureDate', 'travelState', 'status'].forEach((key) => next.delete(key));
    setSearchParams(next);
  };
  const handleSort = (column) => {
    if (sortBy === column) setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortDir('asc'); }
  };

  const createFromQuotation = async (quotation) => {
    setCreatingId(quotation.id);
    try {
      const booking = await convertQuotationToBooking(quotation.id);
      reload(); reloadAvailableQuotations();
      toast.success(`Booking ${booking.id} created.`);
      setShowCreate(false);
      navigate(`/bookings/${booking.id}`);
    } catch (error) { toast.error(error.message); } finally { setCreatingId(null); }
  };
  const statuses = ['All', 'Confirmed', 'Upcoming', 'Traveling', 'Completed', 'Cancelled', 'Today'];
  const statCards = [
    { label: 'Total', count: statusCount('All'), icon: Layers, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { label: 'Upcoming', count: statusCount('Upcoming'), icon: Calendar, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-orange-500/20' },
    { label: 'Traveling', count: statusCount('Traveling'), icon: Plane, gradient: 'from-sky-400 to-blue-500', shadow: 'shadow-sky-500/20' },
    { label: 'Completed', count: statusCount('Completed'), icon: CheckSquare, gradient: 'from-teal-400 to-emerald-500', shadow: 'shadow-emerald-500/20' },
    // Keep cancelled bookings available from the status filter, but do not
    // promote cancellation as a dashboard card in the active booking view.
    { label: 'Today', count: statusCount('Today'), icon: Clock, gradient: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20', hint: 'Arrivals scheduled for today' },
  ];

  return (
    <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 lg:flex-none flex items-center gap-3 order-1">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><CheckSquare className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h1 className="page-title leading-tight">Bookings</h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">Manage confirmed travel bookings</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 order-2 lg:order-4 ml-auto">
        <button
          type="button"
          onClick={() => setFiltersOpen(o => !o)}
          aria-expanded={filtersOpen}
          className={`relative h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${filtersOpen ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-700'}`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
          {hasActiveFilters && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white" />}
        </button>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary h-8 px-3 text-xs shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 sm:mr-1" /> <span className="hidden min-[400px]:inline">New Booking</span><span className="min-[400px]:hidden ml-1">New</span>
        </button>
        </div>
      {/* Filters */}
      <div className={`card p-2 order-3 basis-full lg:basis-0 lg:flex-1 lg:min-w-0 ${filtersOpen ? 'block' : 'hidden'}`}>
        <div className="grid grid-cols-2 lg:grid-cols-[minmax(140px,1.3fr)_repeat(4,minmax(0,1fr))_auto] gap-1.5 sm:gap-2 items-center">
          <div className="col-span-2 lg:col-span-1 flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search bookings..."
              className="form-input text-xs h-8 pl-8 pr-7 w-full"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button type="button" onClick={clearBookingFilters} disabled={!hasActiveFilters} title="Clear all filters" className="lg:hidden btn-secondary h-8 w-8 p-0 shrink-0 justify-center disabled:opacity-40"><X className="w-3.5 h-3.5" /></button>
          </div>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select text-xs h-8 py-1 w-full min-w-0">
            {statuses.map(s => <option key={s}>{s}</option>)}
          </select>

          <select value={travelStateFilter} onChange={(event) => updateBookingFilter('travelState', event.target.value)} className="form-select text-xs h-8 py-1 w-full min-w-0">
            <option value="">Any travel state</option>
            <option value="ongoing">Currently travelling</option>
          </select>

          <div className="form-input flex items-center h-8 px-2 text-[11px] w-full min-w-0 gap-1 bg-white [&_input]:text-[11px] [&_input]:min-w-0 [&_input]:w-full focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100" title="Arrival date from">
            <span className="text-[11px] font-medium text-slate-400 select-none shrink-0">Arr</span>
            <ReportDateInput value={arrivalDateFilter} onChange={(value) => updateBookingFilter('arrivalDate', value)} label="Arrival date from in DD-MM-YYYY format" placeholder="DD-MM-YYYY" />
          </div>

          <div className="form-input flex items-center h-8 px-2 text-[11px] w-full min-w-0 gap-1 bg-white [&_input]:text-[11px] [&_input]:min-w-0 [&_input]:w-full focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100" title="Departure date to">
            <span className="text-[11px] font-medium text-slate-400 select-none shrink-0">Dep</span>
            <ReportDateInput value={departureDateFilter} onChange={(value) => updateBookingFilter('departureDate', value)} label="Departure date to in DD-MM-YYYY format" placeholder="DD-MM-YYYY" />
          </div>

          <button
            type="button"
            onClick={clearBookingFilters}
            disabled={!hasActiveFilters}
            className="btn-secondary h-8 px-2.5 text-xs shrink-0 disabled:opacity-40 hidden lg:inline-flex justify-center"
            title="Clear all filters"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Clear
          </button>
        </div>
      </div>
      </div>

      {/* Stats */}
      <div className="-mx-3 px-3 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 overflow-x-auto sm:overflow-visible snap-x pb-1 sm:pb-0">
        {statCards.map(({ label, count, icon: Icon, gradient, shadow, hint }) => (
          <div
            key={label}
            onClick={() => setStatusFilter(label === 'Total' ? 'All' : label)}
            title={hint || label}
            className={`snap-start shrink-0 w-[128px] sm:w-auto bg-white rounded-xl border p-2.5 sm:p-3 flex items-center cursor-pointer transition-all hover:shadow-md relative overflow-hidden group ${(label === 'Total' ? statusFilter === 'All' : statusFilter === label) ? 'border-blue-400 shadow-[0_0_0_1px_rgba(96,165,250,1)]' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="flex items-center gap-2.5 relative z-10 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md bg-gradient-to-br ${gradient} ${shadow} transform group-hover:scale-105 transition-transform duration-300 flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-slate-800 leading-none">{count}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-1 truncate">{label}</div>
              </div>
            </div>
            <MiniBars value={count} className={{ Total: 'text-blue-500', Upcoming: 'text-orange-500', Traveling: 'text-sky-500', Completed: 'text-emerald-500', Today: 'text-purple-500' }[label] || 'text-blue-500'} show="hidden lg:flex" />
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {bookings.map(b => (
          <div key={b.id} onClick={() => navigate(`/bookings/${b.id}`)} className="relative cursor-pointer overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm active:bg-slate-50">
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-blue-700">{b.id}</span>
                  {isRecordNew(b.bookingDate || b.createdAt || b.date) && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200/80">New</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1" onClick={e => e.stopPropagation()}>
                  <StatusBadge status={b.status} />
                  <button onClick={() => setDeleteId(b.id)} className="grid h-7 w-7 place-items-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="mt-2 break-words text-[14px] font-extrabold leading-snug text-slate-900">{b.guestName}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                {b.destination && <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600"><MapPin className="h-3 w-3 shrink-0 text-rose-500" /><span className="break-words">{b.destination}</span></span>}
                {b.agentName && <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600"><User className="h-3 w-3 shrink-0 text-emerald-500" /><span className="break-words">{b.agentName}</span></span>}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px]">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span className="font-bold text-slate-800">{formatDate(b.arrivalDate)}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="font-bold text-slate-800">{formatDate(b.departureDate)}</span>
                <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 font-bold text-slate-600 ring-1 ring-slate-200"><Users className="h-3 w-3 text-purple-500" />{b.adults}A {b.children}C</span>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <div className="min-w-0 rounded-lg border border-blue-100 bg-blue-50/70 px-2 py-1.5"><div className="text-[9px] font-bold uppercase tracking-wide text-blue-600">Sales</div><div className="truncate text-[12.5px] font-extrabold text-slate-900">{fmt(b.totalSelling)}</div></div>
                <div className="min-w-0 rounded-lg border border-emerald-100 bg-emerald-50/70 px-2 py-1.5"><div className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">Profit</div><div className="truncate text-[12.5px] font-extrabold text-emerald-700">{fmt(b.profit)}</div><div className="text-[9px] font-semibold text-emerald-600/80">{b.margin?.toFixed(1)}%</div></div>
                <div className={`min-w-0 rounded-lg border px-2 py-1.5 ${b.paymentStatus === 'Paid' ? 'border-green-100 bg-green-50/70' : b.paymentStatus === 'Overdue' ? 'border-red-100 bg-red-50/70' : 'border-amber-100 bg-amber-50/70'}`}><div className={`text-[9px] font-bold uppercase tracking-wide ${b.paymentStatus === 'Paid' ? 'text-green-600' : b.paymentStatus === 'Overdue' ? 'text-red-600' : 'text-amber-600'}`}>Payment</div><div className={`truncate text-[12.5px] font-extrabold ${b.paymentStatus === 'Paid' ? 'text-green-700' : b.paymentStatus === 'Overdue' ? 'text-red-700' : 'text-amber-700'}`}>{b.paymentStatus}</div></div>
              </div>

              {b.quotationId && <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400"><FileText className="h-3 w-3" />Quotation <span className="font-mono font-semibold text-slate-600">{b.quotationId}</span>{b.quotationVersion ? <span className="rounded bg-slate-100 px-1 font-bold text-slate-500">V{b.quotationVersion}</span> : null}</div>}
            </div>
          </div>
        ))}
        {!loading && bookings.length === 0 && <div className="card py-10 text-center text-slate-400 text-sm">No bookings found</div>}
        <div className="card overflow-hidden"><TablePagination pagination={pagination} loading={loading} onPageChange={setPage} label="bookings" /></div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <RemoteSortHeader column="id" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Booking ID</RemoteSortHeader>
                <RemoteSortHeader column="quotationId" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Quotation</RemoteSortHeader>
                <RemoteSortHeader column="guestName" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Guest</RemoteSortHeader>
                <RemoteSortHeader column="agentName" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Agent</RemoteSortHeader>
                <RemoteSortHeader column="arrivalDate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Arrival</RemoteSortHeader>
                <RemoteSortHeader column="departureDate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Departure</RemoteSortHeader>
                <RemoteSortHeader column="adults" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Pax</RemoteSortHeader>
                <RemoteSortHeader column="totalSelling" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Sales</RemoteSortHeader>
                <RemoteSortHeader column="profit" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Profit</RemoteSortHeader>
                <RemoteSortHeader column="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Status</RemoteSortHeader>
                <RemoteSortHeader column="paymentStatus" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Payment</RemoteSortHeader>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map(b => (
                <tr key={b.id} className="table-row cursor-pointer" onClick={() => navigate(`/bookings/${b.id}`)}>
                  <td className="table-cell whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => navigate(`/bookings/${b.id}`)} className="text-primary-600 font-medium hover:text-primary-700 font-mono text-xs">
                        {b.id}
                      </button>
                      {isRecordNew(b.bookingDate || b.createdAt || b.date) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200/80 tracking-wide">
                          New
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell" onClick={e => e.stopPropagation()}>
                    {b.quotationId ? (
                      <button type="button" onClick={() => navigate(`/quotations/${encodeURIComponent(b.quotationId)}`)} className="text-primary-600 font-medium font-mono text-xs hover:text-primary-800 hover:underline" title={`Open quotation ${b.quotationId}`}>
                        {b.quotationId}
                      </button>
                    ) : <span className="text-slate-400 font-mono text-xs">—</span>}
                    {b.quotationVersion && <div className="text-[10px] text-slate-400">Revision V{b.quotationVersion}</div>}
                  </td>
                  <td className="table-cell">
                    <div className="font-medium text-slate-900 text-sm">{b.guestName}</div>
                    <div className="text-xs text-slate-400">{b.destination}</div>
                  </td>
                  <td className="table-cell text-sm text-slate-600">{b.agentName}</td>
                  <td className="table-cell text-xs text-slate-600">{formatDate(b.arrivalDate)}</td>
                  <td className="table-cell text-xs text-slate-600">{formatDate(b.departureDate)}</td>
                  <td className="table-cell text-xs">{b.adults}A {b.children}C</td>
                  <td className="table-cell font-semibold text-slate-900">{fmt(b.totalSelling)}</td>
                  <td className="table-cell">
                    <span className="text-green-600 font-semibold text-sm">{fmt(b.profit)}</span>
                    <div className="text-xs text-slate-400">{b.margin?.toFixed(1)}%</div>
                  </td>
                  <td className="table-cell" onClick={e => e.stopPropagation()}><StatusBadge status={b.status} /></td>
                  <td className="table-cell">
                    <span className={`text-xs font-medium ${b.paymentStatus === 'Paid' ? 'text-green-600' : b.paymentStatus === 'Overdue' ? 'text-red-600' : 'text-yellow-600'}`}>
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="table-cell" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/bookings/${b.id}`)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            if (openMenuId === b.id) {
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
                              setOpenMenuId(b.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {openMenuId === b.id && createPortal(
                          <div 
                            className="fixed mt-1 w-40 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1 z-[100] fade-in"
                            style={menuPos}
                          >
                            <button onClick={() => { navigate(`/bookings/${b.id}`); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                              <Eye className="w-4 h-4" /> View
                            </button>
                            <button onClick={() => { setDeleteId(b.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>,
                          document.body
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && bookings.length === 0 && (
                <tr><td colSpan="12" className="py-12 text-center text-slate-400 text-sm">No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination pagination={pagination} loading={loading} onPageChange={setPage} label="bookings" />
      </div>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={async () => { try { await deleteBooking(deleteId); reload(); toast.success('Booking deleted'); } catch (error) { toast.error(error.message); } }}
        title="Delete Booking" message="Are you sure you want to delete this booking?" />
      {openMenuId && <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />}
      {showCreate && (
        <div className="modal-overlay z-50 !p-2 sm:!p-4" onClick={() => setShowCreate(false)}>
          <div className="modal-content flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-0 sm:w-full" onClick={e => e.stopPropagation()}>
            <div className="relative shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/60 px-3 py-3 sm:px-4">
              <div className="flex items-center gap-3 pr-8">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25"><FileText className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold leading-tight text-slate-800">Create booking from quotation</h3>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">Only a saved quotation can create a booking. Existing booking links are excluded.</p>
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} aria-label="Close" className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50/50 p-2.5 sm:p-3">
              {availableQuotationsLoading ? <div className="py-10 text-center text-xs text-slate-400">Loading available quotations…</div> : availableQuotations.length ? availableQuotations.map(quotation => (
                <div key={quotation.id} className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition-colors hover:border-blue-300 min-[460px]:flex-row min-[460px]:items-center sm:p-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] font-extrabold text-white">{String(quotation.guestName || 'G').replace(/^(mr|mrs|ms|miss)\.?\s+/i, '').trim().slice(0, 2).toUpperCase() || 'G'}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="truncate text-[13px] font-bold text-slate-800">{quotation.guestName || 'Unnamed guest'}</span>
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700">{quotation.id}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-medium"><Plane className="h-3 w-3 text-slate-400" />{quotation.destination || 'Destination not set'}</span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-medium"><Calendar className="h-3 w-3 text-slate-400" />{quotation.travelDate ? formatDate(quotation.travelDate) : 'Date not set'}</span>
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">{quotation.status || 'Draft'}</span>
                      </div>
                    </div>
                  </div>
                  <button disabled={creatingId === quotation.id} onClick={() => createFromQuotation(quotation)} className="btn-primary h-8 shrink-0 justify-center whitespace-nowrap px-3 text-xs disabled:opacity-50"><CheckSquare className="mr-1 h-3.5 w-3.5" />{creatingId === quotation.id ? 'Creating…' : 'Create booking'}</button>
                </div>
              )) : <div className="py-10 text-center text-xs text-slate-400">No quotations are available to convert. Create or save a quotation first.</div>}
            </div>
            {availableQuotations.length > 0 && <div className="shrink-0 border-t border-slate-200 bg-white"><TablePagination pagination={availableQuotationPagination} loading={availableQuotationsLoading} onPageChange={setAvailableQuotationPage} label="available quotations" /></div>}
            <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-2 text-right sm:p-3"><button onClick={() => setShowCreate(false)} className="btn-secondary h-8 w-full justify-center px-4 text-xs sm:w-auto"><X className="mr-1 h-3.5 w-3.5" />Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
