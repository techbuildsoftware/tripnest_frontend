import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CircleDollarSign, Search, SlidersHorizontal, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import MiniBars from '../../components/ui/MiniBars';
import { accountLedger } from '../../lib/bookingPayments';
import { formatDate, todayIsoInTimeZone } from '../../lib/date';

const fmt = (value) => `฿${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const TABS = ['Receivables', 'Supplier Payables', 'Cash Ledger', 'Profit Report', 'Payment Planner'];
const isOverdue = (date, amount) => amount > 0 && date && String(date).slice(0, 10) < todayIsoInTimeZone();
const Empty = ({ message }) => <div className="p-10 text-center text-sm text-slate-400">{message}</div>;
const OpenBooking = ({ id, navigate, label = 'Open' }) => <button onClick={() => navigate(`/bookings/${id}?tab=Payments`)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">{label}<ArrowRight className="h-3 w-3" /></button>;
const earliestDate = (dates) => dates.filter(Boolean).map((date) => String(date).slice(0, 10)).sort()[0] || '';

function groupBookingRows(rows, kind) {
  const fields = kind === 'client'
    ? { total: 'totalSelling', paid: 'clientPaid', outstanding: 'clientRemaining', due: 'paymentDeadline' }
    : { total: 'totalCost', paid: 'supplierPaid', outstanding: 'supplierRemaining', due: 'dueDate' };
  return Object.values(rows.reduce((groups, row) => {
    const group = groups[row.bookingId] || {
      bookingId: row.bookingId, guestName: row.guestName, agentName: row.agentName,
      total: 0, paid: 0, outstanding: 0, services: [], dueDate: '', suppliers: [],
      selling: 0, quotedCost: 0, settledCost: 0, marginProfit: 0, supplierProfit: 0, totalGrossProfit: 0,
    };
    if (kind === 'client') {
      group.total = Number(row.clientInvoiceTotal || 0);
      group.paid = Number(row.clientInvoicePaid || 0);
      group.outstanding = Number(row.clientInvoiceRemaining || 0);
    } else {
      group.total += Number(row[fields.total] || 0);
      group.paid += Number(row[fields.paid] || 0);
      group.outstanding += Number(row[fields.outstanding] || 0);
    }
    group.services.push({ name: row.name, type: row.type, outstanding: Number(row[fields.outstanding] || 0) });
    group.selling += Number(row.totalSelling || 0);
    group.quotedCost += Number(row.totalCost || 0);
    group.settledCost += Number(row.effectiveSupplierCost || 0);
    group.marginProfit += Number(row.plannedProfit || 0);
    group.supplierProfit += Number(row.supplierSavings || 0);
    group.totalGrossProfit += Number(row.grossProfit || 0);
    if (row.supplier) group.suppliers.push(row.supplier);
    group.dueDate = earliestDate([group.dueDate, row[fields.due]]);
    groups[row.bookingId] = group;
    return groups;
  }, {})).map((group) => ({ ...group, suppliers: [...new Set(group.suppliers)], serviceCount: group.services.length }));
}

export default function Accounts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookings } = useApp();
  const [activeTab, setActiveTab] = useState('Receivables');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { rows, payments, totals } = useMemo(() => accountLedger(bookings), [bookings]);
  useEffect(() => {
    const requestedTab = new URLSearchParams(location.search).get('tab');
    if (TABS.includes(requestedTab) && requestedTab !== 'Payment Planner') setActiveTab(requestedTab);
  }, [location.search]);
  const query = search.trim().toLowerCase();
  const match = (row) => !query || [row.bookingId, row.guestName, row.agentName, row.supplier, row.name, row.type].some((value) => String(value || '').toLowerCase().includes(query));
  const receivables = rows.filter((row) => row.clientInvoiceRemaining > 0 && match(row));
  const payables = rows.filter((row) => row.supplierRemaining > 0 && match(row));
  const receivableBookings = groupBookingRows(receivables, 'client');
  const payableBookings = groupBookingRows(payables, 'supplier');
  const filteredRows = rows.filter(match);
  const overdueReceivables = receivableBookings.filter((row) => isOverdue(row.dueDate, row.outstanding));
  const overduePayables = payableBookings.filter((row) => isOverdue(row.dueDate, row.outstanding));
  const receivedPayments = payments.filter((payment) => ['Client Payment', 'Receivable'].includes(payment.type) && payment.status === 'Paid');
  const supplierPayments = payments.filter((payment) => payment.type === 'Supplier Payment' && payment.status === 'Paid');
  const cashIn = receivedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const cashOut = supplierPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const status = (date, outstanding) => isOverdue(date, outstanding) ? 'Overdue' : outstanding <= 0 ? 'Settled' : 'Open';
  const applyStatus = (row) => statusFilter === 'All' || status(row.dueDate, row.outstanding) === statusFilter;
  const cards = [
    { label: 'Client outstanding', value: fmt(totals.clientOutstanding), sub: `${overdueReceivables.length} overdue booking(s)`, icon: CircleDollarSign, color: 'from-blue-500 to-indigo-600', bar: 'text-blue-500' },
    { label: 'Supplier outstanding', value: fmt(totals.supplierOutstanding), sub: `${overduePayables.length} overdue booking(s)`, icon: TrendingDown, color: 'from-orange-400 to-red-500', bar: 'text-orange-500' },
    { label: 'Margin profit', value: fmt(totals.markupProfit), sub: `${totals.sellingTotal ? ((totals.markupProfit / totals.sellingTotal) * 100).toFixed(1) : 0}% quotation margin`, icon: TrendingUp, color: 'from-blue-500 to-indigo-600', bar: 'text-indigo-500' },
    { label: 'Supplier profit', value: fmt(totals.supplierSavings), sub: 'Saving after final supplier settlement', icon: TrendingUp, color: 'from-teal-400 to-emerald-600', bar: 'text-emerald-500' },
    { label: 'Total gross profit', value: fmt(totals.grossProfit), sub: `${totals.sellingTotal ? ((totals.grossProfit / totals.sellingTotal) * 100).toFixed(1) : 0}% final margin`, icon: TrendingUp, color: 'from-green-500 to-emerald-700', bar: 'text-green-600' },
    { label: 'Net collected cash', value: fmt(totals.realisedCash), sub: `In ${fmt(cashIn)} - Out ${fmt(cashOut)}`, icon: Wallet, color: 'from-purple-500 to-violet-700', bar: 'text-purple-500' },
  ];

  return <div className="space-y-3 sm:space-y-4 p-3 sm:p-6">
    <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm"><CircleDollarSign className="h-5 w-5" /></span><div className="min-w-0"><h1 className="page-title">Accounts & Profitability</h1><p className="mt-0.5 text-xs sm:text-sm text-slate-500 line-clamp-2">Live client receivables and supplier payables, allocated service by service.</p></div></div>
        <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} title="Filters" className={`xl:hidden relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${filtersOpen ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}><SlidersHorizontal className="h-4 w-4" />{(search || statusFilter !== 'All') && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />}</button>
      </div>
      <div className={`${filtersOpen ? 'flex' : 'hidden'} xl:flex w-full gap-2 xl:w-auto`}><div className="relative min-w-0 flex-1 xl:w-72"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="form-input h-8 w-full pl-8 text-xs" placeholder="Booking, guest, supplier or service" /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="form-select h-8 w-28 py-1 text-xs"><option>All</option><option>Open</option><option>Overdue</option><option>Settled</option></select></div>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 xl:grid-cols-6 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">{cards.map(({ label, value, sub, icon: Icon, color, bar }) => <div key={label} className="group relative flex min-w-0 items-center overflow-hidden rounded-xl border border-slate-300 bg-white p-2.5 sm:p-3 shadow-sm transition-all hover:shadow-md"><div className="relative z-10 flex min-w-0 items-center gap-2.5"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${color} text-white shadow-md transition-transform duration-300 group-hover:scale-105`}><Icon className="h-4 w-4" /></span><div className="min-w-0 leading-tight"><div className="truncate text-[15px] sm:text-base font-extrabold text-slate-800">{value}</div><div className="truncate text-[9.5px] font-bold uppercase tracking-wide text-slate-500">{label}</div><div className="truncate text-[10px] text-slate-400" title={sub}>{sub}</div></div></div><MiniBars value={value} className={bar} show="hidden 2xl:flex" /></div>)}</div>
    <section className="card overflow-hidden">
      <div className="flex overflow-x-auto border-b border-slate-200">{TABS.map((tab) => <button key={tab} onClick={() => { if (tab === 'Payment Planner') navigate('/app/accounts/payment-planner'); else { setActiveTab(tab); if (location.search) navigate('/app/accounts', { replace: true }); } }} className={activeTab === tab ? 'tab-active' : 'tab-inactive'}>{tab}</button>)}</div>
      {activeTab === 'Receivables' && <Receivables rows={receivableBookings.filter(applyStatus)} navigate={navigate} status={status} />}
      {activeTab === 'Supplier Payables' && <Payables rows={payableBookings.filter(applyStatus)} navigate={navigate} status={status} />}
      {activeTab === 'Cash Ledger' && <CashLedger payments={payments} query={query} />}
      {activeTab === 'Profit Report' && <ProfitReport rows={filteredRows} />}
    </section>
  </div>;
}

function Receivables({ rows, navigate, status }) { return <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50"><tr>{['Booking', 'Client / Agent', 'Included services', 'Invoice', 'Received', 'Outstanding', 'Margin profit', 'Supplier profit', 'Total gross profit', 'Margin', 'Due date', 'Status', 'Action'].map((x) => <th className="table-header" key={x}>{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr className="table-row" key={row.bookingId}><td className="table-cell font-mono text-xs text-blue-600">{row.bookingId}</td><td className="table-cell"><div className="font-medium">{row.guestName}</div><div className="text-xs text-slate-400">{row.agentName}</div></td><td className="table-cell"><div className="font-semibold">{row.serviceCount} hotel/service item{row.serviceCount === 1 ? '' : 's'}</div><div className="max-w-[230px] truncate text-xs text-slate-400" title={row.services.map((item) => item.name).join(', ')}>{row.services.map((item) => item.name).join(' • ')}</div></td><td className="table-cell">{fmt(row.total)}</td><td className="table-cell text-emerald-600">{fmt(row.paid)}</td><td className="table-cell font-bold text-orange-600">{fmt(row.outstanding)}</td><td className="table-cell font-bold text-blue-700">{fmt(row.marginProfit)}</td><td className="table-cell font-bold text-teal-700">{fmt(row.supplierProfit)}</td><td className={`table-cell font-bold ${row.totalGrossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(row.totalGrossProfit)}</td><td className="table-cell font-semibold">{row.selling ? ((row.totalGrossProfit / row.selling) * 100).toFixed(1) : 0}%</td><td className="table-cell text-xs">{formatDate(row.dueDate)}</td><td className="table-cell"><span className={`badge ${isOverdue(row.dueDate, row.outstanding) ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{status(row.dueDate, row.outstanding)}</span></td><td className="table-cell"><OpenBooking id={row.bookingId} navigate={navigate} label="Open booking" /></td></tr>)}{!rows.length && <tr><td colSpan="13"><Empty message="No client receivables found." /></td></tr>}</tbody></table></div>; }
function Payables({ rows, navigate, status }) { return <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50"><tr>{['Booking / guest', 'Suppliers', 'Included services', 'Committed', 'Paid', 'Outstanding', 'Next due', 'Status', 'Action'].map((x) => <th className="table-header" key={x}>{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr className="table-row" key={row.bookingId}><td className="table-cell"><div className="font-mono text-xs text-blue-600">{row.bookingId}</div><div className="text-xs text-slate-500">{row.guestName}</div></td><td className="table-cell"><div className="max-w-[170px] truncate font-medium" title={row.suppliers.join(', ')}>{row.suppliers.join(', ') || 'Unassigned'}</div><div className="text-xs text-slate-400">{row.suppliers.length} supplier{row.suppliers.length === 1 ? '' : 's'}</div></td><td className="table-cell"><div className="font-semibold">{row.serviceCount} hotel/service item{row.serviceCount === 1 ? '' : 's'}</div><div className="max-w-[230px] truncate text-xs text-slate-400" title={row.services.map((item) => item.name).join(', ')}>{row.services.map((item) => item.name).join(' • ')}</div></td><td className="table-cell">{fmt(row.total)}</td><td className="table-cell text-emerald-600">{fmt(row.paid)}</td><td className="table-cell font-bold text-orange-600">{fmt(row.outstanding)}</td><td className="table-cell text-xs">{formatDate(row.dueDate)}</td><td className="table-cell"><span className={`badge ${isOverdue(row.dueDate, row.outstanding) ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{status(row.dueDate, row.outstanding)}</span></td><td className="table-cell"><OpenBooking id={row.bookingId} navigate={navigate} label="Open booking" /></td></tr>)}{!rows.length && <tr><td colSpan="9"><Empty message="No supplier payables found." /></td></tr>}</tbody></table></div>; }
function CashLedger({ payments, query }) { const rows = payments.filter((payment) => payment.status === 'Paid' && (!query || [payment.bookingId, payment.supplier, payment.related].join(' ').toLowerCase().includes(query))).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))); return <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50"><tr>{['Date', 'Booking', 'Direction', 'Related party', 'Service', 'Method', 'Reference', 'Amount'].map((x) => <th className="table-header" key={x}>{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((payment) => { const isIn = ['Client Payment', 'Receivable'].includes(payment.type); return <tr key={`${payment.bookingId}-${payment.id}`} className="table-row"><td className="table-cell text-xs">{formatDate(payment.date)}</td><td className="table-cell font-mono text-xs text-blue-600">{payment.bookingId}</td><td className={`table-cell font-bold ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>{isIn ? 'Client received' : 'Supplier paid'}</td><td className="table-cell">{payment.supplier || '—'}</td><td className="table-cell text-xs">{payment.related || '—'}</td><td className="table-cell text-xs">{payment.method || '—'}</td><td className="table-cell font-mono text-xs">{payment.ref || payment.reference || '—'}</td><td className={`table-cell font-bold ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>{isIn ? '+' : '-'}{fmt(payment.amount)}</td></tr>; })}{!rows.length && <tr><td colSpan="8"><Empty message="No settled payments have been recorded." /></td></tr>}</tbody></table></div>; }
function ProfitReport({ rows }) {
  const bookings = groupBookingRows(rows, 'client');
  const total = (key) => bookings.reduce((sum, booking) => sum + Number(booking[key] || 0), 0);
  const selling = total('selling'); const totalGrossProfit = total('totalGrossProfit');
  return <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50"><tr>{['Booking', 'Guest / Agent', 'Included services', 'Selling', 'Quoted cost', 'Margin profit', 'Settled cost', 'Supplier profit', 'Total gross profit', 'Margin'].map((x) => <th className="table-header" key={x}>{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{bookings.map((booking) => <tr key={booking.bookingId} className="table-row"><td className="table-cell font-mono text-xs text-blue-600">{booking.bookingId}</td><td className="table-cell"><div className="font-medium">{booking.guestName}</div><div className="text-xs text-slate-400">{booking.agentName}</div></td><td className="table-cell"><div className="font-semibold">{booking.serviceCount} hotel/service item{booking.serviceCount === 1 ? '' : 's'}</div><div className="max-w-[260px] truncate text-xs text-slate-400" title={booking.services.map((item) => item.name).join(', ')}>{booking.services.map((item) => item.name).join(' • ')}</div></td><td className="table-cell">{fmt(booking.selling)}</td><td className="table-cell">{fmt(booking.quotedCost)}</td><td className={`table-cell font-bold ${booking.marginProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(booking.marginProfit)}</td><td className="table-cell">{fmt(booking.settledCost)}</td><td className="table-cell font-bold text-teal-600">{fmt(booking.supplierProfit)}</td><td className={`table-cell font-bold ${booking.totalGrossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(booking.totalGrossProfit)}</td><td className="table-cell font-semibold">{booking.selling ? ((booking.totalGrossProfit / booking.selling) * 100).toFixed(1) : 0}%</td></tr>)}{!bookings.length && <tr><td colSpan="10"><Empty message="No booking profitability data found." /></td></tr>}</tbody>{bookings.length > 0 && <tfoot className="border-t-2 border-slate-300 bg-slate-50"><tr><td colSpan="3" className="table-cell font-extrabold text-slate-800">Total</td><td className="table-cell font-extrabold">{fmt(selling)}</td><td className="table-cell font-extrabold">{fmt(total('quotedCost'))}</td><td className="table-cell font-extrabold text-blue-700">{fmt(total('marginProfit'))}</td><td className="table-cell font-extrabold">{fmt(total('settledCost'))}</td><td className="table-cell font-extrabold text-teal-700">{fmt(total('supplierProfit'))}</td><td className="table-cell font-extrabold text-emerald-700">{fmt(totalGrossProfit)}</td><td className="table-cell font-extrabold">{selling ? ((totalGrossProfit / selling) * 100).toFixed(1) : 0}%</td></tr></tfoot>}</table></div>;
}
