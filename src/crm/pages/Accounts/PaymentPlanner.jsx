import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Calendar, CalendarClock, CalendarDays, Clock, DollarSign, ExternalLink, Info, RefreshCw, ChevronDown, ChevronUp, Wallet, Siren, Layers } from 'lucide-react';
import MiniBars from '../../components/ui/MiniBars';
import { apiClient } from '../../lib/api';
import { formatDate } from '../../lib/date';
import { useTimeZone } from '../../context/TimezoneContext';

const fmt = (value) => `฿${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const priorityStyle = { OVERDUE: 'bg-red-100 text-red-700', 'DUE TODAY': 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700', MEDIUM: 'bg-yellow-100 text-yellow-700', SCHEDULED: 'bg-slate-100 text-slate-600' };
const emptyPlanner = { payments: [], schedule: [], totals: { dueToday: 0, next3Days: 0, next7Days: 0, overdue: 0, totalOutstanding: 0 }, cash: { clientReceived: 0, supplierPaid: 0, cashPosition: 0, availableToPay: 0 } };

export default function PaymentPlanner() {
  const navigate = useNavigate();
  const { timeZone } = useTimeZone();
  const [planner, setPlanner] = useState(emptyPlanner);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState({});

  const toggleExpanded = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  const loadPlanner = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await apiClient.get('/accounts/supplier-payment-planner');
      setPlanner({ ...emptyPlanner, ...(response.data || {}) });
    } catch (loadError) {
      setError(loadError.message || 'Could not load the supplier payment planner.');
    } finally { setLoading(false); }
  }, [timeZone]);

  useEffect(() => { loadPlanner(); }, [loadPlanner]);

  const { payments, schedule, totals, cash } = planner;
  const availableCash = Number(cash.availableToPay || 0);
  const shortfall = Math.max(0, Number(totals.dueToday || 0) - availableCash);
  const surplus = Math.max(0, availableCash - Number(totals.dueToday || 0));

  const kpis = [
    ['Due today', totals.dueToday, CalendarClock, 'from-red-400 to-rose-600', 'text-rose-500'],
    ['Next 3 days', totals.next3Days, Clock, 'from-orange-400 to-amber-500', 'text-orange-500'],
    ['Next 7 days', totals.next7Days, CalendarDays, 'from-yellow-400 to-amber-500', 'text-amber-500'],
    ['Overdue', totals.overdue, Siren, 'from-red-500 to-red-700', 'text-red-600'],
    ['Total outstanding', totals.totalOutstanding, Layers, 'from-blue-500 to-indigo-600', 'text-blue-500'],
  ];
  const openBooking = (row) => navigate(`/bookings/${row.bookingId}?tab=Payments`);
  const dueClass = (row) => (row.priority === 'OVERDUE' || row.priority === 'DUE TODAY') ? 'text-red-600' : 'text-slate-600';

  return <div className="space-y-3 p-3 sm:p-4 lg:p-5">
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <button type="button" onClick={() => navigate(-1)} title="Back" aria-label="Back" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /></button>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><Wallet className="h-5 w-5" /></span>
        <div className="min-w-0"><h1 className="page-title">Supplier Payment Planner</h1><p className="mt-0.5 line-clamp-2 text-xs text-slate-500 sm:text-sm">Live supplier balances and planned instalments, calculated directly from booking payments.</p></div>
      </div>
      <button type="button" onClick={loadPlanner} disabled={loading} title="Refresh live data" className="btn-secondary inline-flex h-9 shrink-0 items-center justify-center gap-2 px-2.5 text-xs sm:px-3"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh live data</span></button>
    </div>

    <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-[11px] leading-relaxed text-blue-800 sm:text-xs"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" /><span><b>How this works:</b> open a booking, go to <b>Payments</b>, and use <b>Plan payment</b> to set a supplier instalment amount and due date. This screen then shows every planned instalment plus any unpaid amount that has not been scheduled yet.</span></div>
    {error && <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={loadPlanner} className="font-bold underline">Try again</button></div>}

    <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-2.5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {kpis.map(([label, amount, Icon, grad, bar]) => (
        <div key={label} className="group relative flex min-w-[170px] shrink-0 snap-start items-center overflow-hidden rounded-xl border border-slate-300 bg-white p-2.5 shadow-sm transition-all hover:shadow-md sm:min-w-0 sm:p-3">
          <div className="relative z-10 flex min-w-0 items-center gap-2.5">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${grad} text-white shadow-md transition-transform duration-300 group-hover:scale-105`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0 leading-tight"><div className="truncate text-[15px] font-extrabold text-slate-800 sm:text-base">{fmt(amount)}</div><div className="truncate text-[9.5px] font-bold uppercase tracking-wide text-slate-500">{label}</div></div>
          </div>
          <MiniBars value={amount} className={bar} show="hidden xl:flex" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-start">
      <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-800"><span className="grid h-6 w-6 place-items-center rounded-md bg-blue-100 text-blue-600"><DollarSign className="h-3.5 w-3.5" /></span>Service payment queue <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-600">{payments.length}</span></h2>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">Every open supplier cost is shown. Partial schedules leave the remaining balance visible.</p>
          </div>
          {loading && <span className="shrink-0 text-xs font-semibold text-blue-600">Loading…</span>}
        </div>

        <div className="space-y-2 p-2.5 md:hidden">
          {payments.map((row) => {
            const rowId = `${row.bookingId}-${row.key}-${row.scheduleId || 'unplanned'}`;
            return (
              <div key={rowId} className="rounded-xl border border-slate-300 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="break-words text-xs font-bold text-slate-900">{row.supplier}</div><div className="mt-0.5 break-words text-[10px] text-slate-500">{row.type} - {row.name}{row.scheduled ? ' · Planned instalment' : ' · Unscheduled balance'}</div></div>
                  <span className={`badge shrink-0 ${priorityStyle[row.priority] || priorityStyle.SCHEDULED}`}>{row.priority || 'SCHEDULED'}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
                  <div><div className="text-[9px] uppercase tracking-wide text-slate-400">Booking</div><div className="font-mono font-bold text-blue-600">{row.bookingId}</div><div className="truncate text-[10px] text-slate-500">{row.guestName}</div></div>
                  <div><div className="text-[9px] uppercase tracking-wide text-slate-400">Due date</div><div className={`font-semibold ${dueClass(row)}`}>{formatDate(row.dueDate, 'Not scheduled')}</div></div>
                  <div><div className="text-[9px] uppercase tracking-wide text-slate-400">Planned / Paid</div><div className="font-semibold text-slate-800">{row.scheduled ? fmt(row.plannedAmount) : `${fmt(row.supplierPaid)} / ${fmt(row.totalCost)}`}</div></div>
                  <div><div className="text-[9px] uppercase tracking-wide text-slate-400">Balance</div><div className="font-extrabold text-orange-600">{fmt(row.supplierRemaining)}</div></div>
                </div>
                <button onClick={() => openBooking(row)} className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100">Open booking <ExternalLink className="h-3 w-3" /></button>
              </div>
            );
          })}
          {!loading && !payments.length && <div className="p-8 text-center text-sm text-slate-400">No supplier service payments are outstanding.</div>}
        </div>

        <div className="hidden max-h-[calc(100dvh-330px)] min-h-[260px] overflow-auto md:block [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-100">
          <table className="w-full min-w-[820px]">
            <thead className="lg:sticky lg:top-0 lg:z-10">
              <tr>
                {['Priority', 'Supplier / service', 'Booking / guest', 'Planned / due', 'Balance', 'Due date', 'Action'].map((header) => (
                  <th key={header} className="table-header whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((row) => {
                const rowId = `${row.bookingId}-${row.key}-${row.scheduleId || 'unplanned'}`;
                return (
                  <tr key={rowId} className="table-row transition-colors hover:bg-blue-50/40">
                    <td className="table-cell align-top !py-2"><span className={`badge ${priorityStyle[row.priority] || priorityStyle.SCHEDULED}`}>{row.priority || 'SCHEDULED'}</span></td>
                    <td className="table-cell !whitespace-normal align-top !py-2">
                      <div className="group flex w-max max-w-full cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-slate-900" onClick={() => toggleExpanded(rowId)}>
                        <span className="break-words">{row.supplier}</span>
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors hover:bg-slate-200">{expandedRows[rowId] ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}</span>
                      </div>
                      {expandedRows[rowId] && <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">{row.type} - {row.name}{row.scheduled ? ' · Planned instalment' : ' · Unscheduled balance'}</div>}
                    </td>
                    <td className="table-cell align-top !py-2"><div className="font-mono text-[11px] font-bold text-blue-600">{row.bookingId}</div><div className="mt-0.5 text-[11px] text-slate-500">{row.guestName}</div></td>
                    <td className="table-cell align-top !py-2 text-[12px] font-medium">{row.scheduled ? fmt(row.plannedAmount) : `${fmt(row.supplierPaid)} / ${fmt(row.totalCost)}`}</td>
                    <td className="table-cell align-top !py-2 text-[12px] font-bold text-orange-600">{fmt(row.supplierRemaining)}</td>
                    <td className={`table-cell align-top !py-2 text-[11px] font-semibold ${dueClass(row)}`}>{formatDate(row.dueDate, 'Not scheduled')}</td>
                    <td className="table-cell align-top !py-2"><button onClick={() => openBooking(row)} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1.5 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800">Open <ExternalLink className="h-3 w-3" /></button></td>
                  </tr>
                );
              })}
              {!loading && !payments.length && <tr><td colSpan="7" className="p-10 text-center text-sm text-slate-400">No supplier service payments are outstanding.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <section className="rounded-xl border border-slate-300 bg-white p-3.5 shadow-sm">
          <div className="mb-1 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800"><span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-100 text-emerald-600"><DollarSign className="h-3.5 w-3.5" /></span>Live cash position</h3><button type="button" onClick={() => navigate('/app/accounts?tab=Cash%20Ledger')} className="whitespace-nowrap text-[11px] font-bold text-blue-600 hover:underline">View cash ledger</button></div>
          <p className="mb-2.5 text-[11px] text-slate-500">Calculated from confirmed client receipts less confirmed supplier payments.</p>
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-3 py-2.5"><div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Available to pay today</div><div className="mt-0.5 text-xl font-extrabold text-emerald-700">{fmt(availableCash)}</div></div>
          <div className="mt-2.5 space-y-1.5 text-[13px]">
            <div className="flex justify-between"><span className="text-slate-500">Client receipts</span><b className="text-emerald-600">{fmt(cash.clientReceived)}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">Supplier payments</span><b className="text-red-600">{fmt(cash.supplierPaid)}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">Required today</span><b className="text-red-600">{fmt(totals.dueToday)}</b></div>
            <div className={`flex justify-between border-t border-slate-200 pt-1.5 font-bold ${shortfall ? 'text-red-600' : 'text-emerald-600'}`}><span>{shortfall ? 'Shortfall' : 'Surplus'}</span><span>{fmt(shortfall || surplus)}</span></div>
          </div>
          {shortfall > 0 && <div className="mt-2.5 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />Funds are short by {fmt(shortfall)} for today’s due supplier payments. Open a service payment above to record the payment once funds are available.</div>}
        </section>

        <section className="rounded-xl border border-slate-300 bg-white p-3.5 shadow-sm">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-extrabold text-slate-800"><span className="grid h-6 w-6 place-items-center rounded-md bg-violet-100 text-violet-600"><Calendar className="h-3.5 w-3.5" /></span>Payment calendar</h3>
          <p className="mb-2.5 text-[11px] text-slate-500">Live outstanding amount grouped by planned or service due date.</p>
          <div className="max-h-[320px] overflow-auto rounded-lg border border-slate-200 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-100">
            <table className="w-full">
              <thead className="sticky top-0 z-10"><tr><th className="table-header whitespace-nowrap">Due date</th><th className="table-header whitespace-nowrap text-center">Payments</th><th className="table-header whitespace-nowrap text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {schedule.map((day) => <tr key={day.date} className="table-row hover:bg-violet-50/40"><td className="table-cell !py-1.5 text-[12px] font-semibold text-slate-800">{formatDate(day.date, 'Not scheduled')}</td><td className="table-cell !py-1.5 text-center"><span className="inline-flex min-w-[22px] justify-center rounded-full bg-violet-50 px-1.5 text-[11px] font-bold text-violet-700">{day.count}</span></td><td className="table-cell !py-1.5 text-right text-[12px] font-extrabold text-slate-800">{fmt(day.amount)}</td></tr>)}
                {!loading && !schedule.length && <tr><td colSpan="3" className="py-4 text-center text-xs text-slate-400">No outstanding supplier payments.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </aside>
    </div>
  </div>;
}
