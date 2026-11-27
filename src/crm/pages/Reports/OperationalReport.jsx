import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, PieChart, Pie, Cell
} from 'recharts';
import {
  ArrowLeft, Download, Eye, Filter, Printer, RefreshCw, Search,
  TrendingUp, PieChart as PieIcon, BarChart3, Layers,
  Building2, DollarSign, Users, Clock, CheckCircle2, AlertCircle, ArrowUpRight,
  BookOpen, SlidersHorizontal } from 'lucide-react';
import { TravelDateRange, dateLabel, money, useBusinessReport } from './businessReportData';
import { downloadExcelTable } from '../../lib/exportTable';
import SupplierReportModal from './SupplierReportModal';

const REPORTS = {
  supplier: { title: 'Supplier Report', description: 'Live supplier commitments, payments and outstanding balances.' },
  booking: { title: 'Booking Report', description: 'Live booking status, revenue, cost and passenger analysis.' },
  collection: { title: 'Collection Report', description: 'Client invoice collections and outstanding balances.' },
  payment: { title: 'Payment Report', description: 'Every recorded client and supplier payment from booked services.' },
  expense: { title: 'Expense Report', description: 'Operational expenses recorded as settled supplier payments.' },
};

const amount = (value) => Number(value || 0);
const date = (value) => String(value || '').slice(0, 10);
const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const statusTone = (value) => String(value || '').toLowerCase().includes('paid') || String(value || '').toLowerCase() === 'confirmed'
  ? 'bg-emerald-100 text-emerald-700' : String(value || '').toLowerCase().includes('cancel')
    ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';

const fmtShort = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n;
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

function Select({ label, value, onChange, options, className = '' }) {
  return (
    <label className={`flex flex-col gap-0.5 w-full ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full form-select h-8 text-[11.5px] rounded-[0.45rem] border border-slate-200 bg-white px-2 focus:border-blue-500 focus:outline-none whitespace-nowrap">
        <option>All</option>
        {options.map((item) => <option key={item}>{item}</option>)}
      </select>
    </label>
  );
}

function Badge({ children }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone(children)}`}>{children || 'Pending'}</span>;
}

const getKpiMeta = (label) => {
  const lbl = String(label || '').toLowerCase();
  if (lbl.includes('outstanding') || lbl.includes('pending')) {
    return {
      icon: AlertCircle,
      cardBorder: 'border-rose-100/80',
      iconBg: 'bg-rose-50 text-rose-500 border border-rose-100',
      sub: 'Pending balance due'
    };
  }
  if (lbl.includes('paid') || lbl.includes('received') || lbl.includes('receipts') || lbl.includes('profit')) {
    return {
      icon: CheckCircle2,
      cardBorder: 'border-emerald-100/80',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      sub: 'Settled & realized'
    };
  }
  if (lbl.includes('revenue') || lbl.includes('committed') || lbl.includes('invoiced') || lbl.includes('expense') || lbl.includes('cost')) {
    return {
      icon: DollarSign,
      cardBorder: 'border-blue-100/80',
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
      sub: 'Total financial volume'
    };
  }
  if (lbl.includes('suppliers')) {
    return {
      icon: Building2,
      cardBorder: 'border-amber-100/80',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      sub: 'Active registered suppliers'
    };
  }
  if (lbl.includes('bookings')) {
    return {
      icon: BookOpen,
      cardBorder: 'border-rose-100/80',
      iconBg: 'bg-rose-50 text-rose-500 border border-rose-100',
      sub: 'Matching live bookings'
    };
  }
  if (lbl.includes('pax')) {
    return {
      icon: Users,
      cardBorder: 'border-emerald-100/80',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      sub: 'Matching passengers'
    };
  }
  return {
    icon: Users,
    cardBorder: 'border-purple-100/80',
    iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
    sub: 'Active records in scope'
  };
};

function supplierRows(lines) {
  const map = new Map();
  lines.forEach((line) => {
    const name = line.supplier || 'Unassigned';
    const item = map.get(name) || { supplier: name, bookings: new Set(), committed: 0, paid: 0, outstanding: 0, status: 'Pending' };
    item.bookings.add(line.bookingId); item.committed += amount(line.totalCost); item.paid += amount(line.supplierPaid); item.outstanding += amount(line.supplierRemaining);
    item.status = item.outstanding <= 0 ? 'Paid' : item.paid > 0 ? 'Partially Paid' : 'Pending'; map.set(name, item);
  });
  return [...map.values()].map((item) => ({ ...item, bookings: item.bookings.size })).sort((a, b) => b.outstanding - a.outstanding || a.supplier.localeCompare(b.supplier));
}

function reportData(type, rows, ledger) {
  if (type === 'supplier') {
    const data = supplierRows(ledger?.rows || []);
    return {
      rows: data,
      columns: [['Supplier', 'supplier'], ['Bookings', 'bookings'], ['Committed', 'committed', 'money'], ['Paid', 'paid', 'money'], ['Outstanding', 'outstanding', 'money'], ['Status', 'status', 'status']],
      cards: [['Suppliers', data.length], ['Committed', money(data.reduce((sum, item) => sum + item.committed, 0))], ['Paid', money(data.reduce((sum, item) => sum + item.paid, 0))], ['Outstanding', money(data.reduce((sum, item) => sum + item.outstanding, 0))]]
    };
  }
  if (type === 'booking') {
    const data = (rows || []).map((row) => ({
      ...row,
      travelDate: row.travelDate || row.date || '',
      booking: row.booking || row.bookingId || row.id || '—',
      client: row.client || row.clientName || row.guestName || '—',
      destination: row.destination || row.dest || '—',
      agent: row.agent || row.agentName || '—',
      pax: row.pax || 0,
      revenue: row.revenue || 0,
      cost: row.cost || 0,
      profit: row.profit ?? (Number(row.revenue || 0) - Number(row.cost || 0)),
      status: row.status || 'Confirmed',
    }));
    return {
      rows: data,
      columns: [['Travel date', 'travelDate', 'date'], ['Booking', 'booking'], ['Agent', 'agent'], ['Client', 'client'], ['Destination', 'destination'], ['Pax', 'pax'], ['Revenue', 'revenue', 'money'], ['Cost', 'cost', 'money'], ['Status', 'status', 'status']],
      cards: [['Bookings', data.length], ['Pax', data.reduce((sum, row) => sum + amount(row.pax), 0)], ['Revenue', money(data.reduce((sum, row) => sum + amount(row.revenue), 0))], ['Profit', money(data.reduce((sum, row) => sum + amount(row.profit), 0))]]
    };
  }
  if (type === 'collection') {
    const data = ledger?.invoices || [];
    return {
      rows: data,
      columns: [['Travel date', 'travelDate', 'date'], ['Booking', 'bookingId'], ['Guest', 'guestName'], ['Agent', 'agentName'], ['Invoice', 'total', 'money'], ['Received', 'paid', 'money'], ['Outstanding', 'remaining', 'money'], ['Status', 'status', 'invoiceStatus']],
      cards: [['Invoices', data.length], ['Invoiced', money(data.reduce((sum, row) => sum + amount(row.total), 0))], ['Received', money(data.reduce((sum, row) => sum + amount(row.paid), 0))], ['Outstanding', money(data.reduce((sum, row) => sum + amount(row.remaining), 0))]]
    };
  }
  if (type === 'payment') {
    const data = [...(ledger?.payments || [])].sort((a, b) => date(b.date).localeCompare(date(a.date)));
    return {
      rows: data,
      columns: [['Travel date', 'travelDate', 'date'], ['Payment date', 'date', 'date'], ['Booking', 'bookingId'], ['Guest', 'guestName'], ['Type', 'type'], ['Method', 'method'], ['Amount', 'amount', 'money'], ['Status', 'status', 'status']],
      cards: [['Payments', data.length], ['Client receipts', money(data.filter((item) => ['Client Payment', 'Receivable'].includes(item.type) && item.status === 'Paid').reduce((sum, item) => sum + amount(item.amount), 0))], ['Supplier paid', money(data.filter((item) => item.type === 'Supplier Payment' && item.status === 'Paid').reduce((sum, item) => sum + amount(item.amount), 0))], ['Pending', data.filter((item) => item.status !== 'Paid').length]]
    };
  }
  const data = (ledger?.payments || []).filter((item) => item.type === 'Supplier Payment' && item.status === 'Paid').sort((a, b) => date(b.date).localeCompare(date(a.date)));
  return {
    rows: data,
    columns: [['Travel date', 'travelDate', 'date'], ['Expense date', 'date', 'date'], ['Booking', 'bookingId'], ['Supplier', 'supplier'], ['Method', 'method'], ['Reference', 'reference'], ['Amount', 'amount', 'money'], ['Status', 'status', 'status']],
    cards: [['Recorded expenses', data.length], ['Total expense', money(data.reduce((sum, item) => sum + amount(item.amount), 0))], ['Suppliers paid', new Set(data.map((item) => item.supplier || 'Unassigned')).size], ['Average expense', money(data.length ? data.reduce((sum, item) => sum + amount(item.amount), 0) / data.length : 0)]]
  };
}

function renderValue(row, key, kind) {
  if (!row) return '—';
  if (kind === 'money') return money(row[key]);
  if (kind === 'date') return dateLabel(row[key] || row.travelDate || row.date);
  if (kind === 'status') return <Badge>{row[key]}</Badge>;
  if (kind === 'invoiceStatus') return <Badge>{amount(row.remaining) <= 0 ? 'Paid' : amount(row.paid) > 0 ? 'Partially Paid' : 'Pending'}</Badge>;
  return row[key] ?? '—';
}

export default function OperationalReport({ type }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const config = REPORTS[type];
  const reportInitialFilters = useMemo(() => ({
    ...(searchParams.get('supplier') ? { supplier: searchParams.get('supplier') } : {}),
    ...(searchParams.get('serviceType') ? { serviceType: searchParams.get('serviceType') } : {}),
    ...(searchParams.get('serviceName') ? { serviceName: searchParams.get('serviceName') } : {}),
  }), [searchParams]);
  const { filters, updateFilter, generate, reset, loading, error, rows, options, ledger, summary } = useBusinessReport(reportInitialFilters);
  const [search, setSearch] = useState('');
  const [localStatus, setLocalStatus] = useState('All');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const model = useMemo(() => reportData(type, rows, ledger), [type, rows, ledger]);
  const visibleRows = useMemo(() => (model?.rows || []).filter((row) => {
    const status = type === 'collection' ? (amount(row.remaining) <= 0 ? 'Paid' : amount(row.paid) > 0 ? 'Partially Paid' : 'Pending') : row.status;
    const text = Object.values(row).filter((value) => ['string', 'number'].includes(typeof value)).join(' ').toLowerCase();
    return (localStatus === 'All' || status === localStatus) && text.includes(search.trim().toLowerCase());
  }), [model?.rows, localStatus, search, type]);

  const exportRows = () => {
    downloadExcelTable({
      filename: config.title.toLowerCase().replaceAll(' ', '-'),
      head: model.columns.map(([label]) => label),
      rows: visibleRows.map((row) => model.columns.map(([, key]) => { const v = row[key]; return typeof v === 'number' ? v : (v ?? ''); })),
    });
  };

  const resetTableAndReport = () => { setSearch(''); setLocalStatus('All'); reset(); };
  const statuses = [...new Set((model?.rows || []).map((row) => type === 'collection' ? (amount(row.remaining) <= 0 ? 'Paid' : amount(row.paid) > 0 ? 'Partially Paid' : 'Pending') : row.status).filter(Boolean))];

  // Visual Analytics computations
  const timelineChartData = useMemo(() => {
    if (type === 'booking') {
      return (summary?.trends || []).map((t) => ({ label: t.date, val1: t.sales || 0, val2: t.profit || 0, count: t.bookings || 0 }));
    }
    const grouped = {};
    (model?.rows || []).forEach((r) => {
      const dt = r.travelDate || r.date || 'Active';
      const key = String(dt).slice(0, 10);
      grouped[key] = grouped[key] || { label: key, val1: 0, count: 0 };
      grouped[key].val1 += amount(r.total || r.amount || r.committed || r.revenue || 0);
      grouped[key].count += 1;
    });
    return Object.values(grouped).sort((a, b) => a.label.localeCompare(b.label)).slice(-8);
  }, [type, summary?.trends, model?.rows]);

  const statusDistribution = useMemo(() => {
    const counts = {};
    (model?.rows || []).forEach((r) => {
      const st = type === 'collection' ? (amount(r.remaining) <= 0 ? 'Paid' : amount(r.paid) > 0 ? 'Partially Paid' : 'Pending') : (r.status || 'Active');
      counts[st] = (counts[st] || 0) + 1;
    });
    const total = model?.rows?.length || 1;
    return Object.entries(counts).map(([name, count], index) => ({
      name,
      count,
      value: Math.round((count / total) * 100),
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, [model?.rows, type]);

  const topEntitiesBarData = useMemo(() => {
    if (type === 'supplier') {
      return (model?.rows || []).slice(0, 6).map((r) => ({ name: r.supplier || 'Unassigned', amount: r.committed || 0, secondary: r.outstanding || 0 }));
    }
    if (type === 'booking') {
      return (summary?.destinations || []).slice(0, 6).map((d) => ({ name: d?.name || 'Destination', amount: d?.revenue || 0, secondary: d?.bookings || 0 }));
    }
    if (type === 'collection') {
      const ags = {};
      (model?.rows || []).forEach((r) => {
        const ag = r.agentName || 'Direct';
        ags[ag] = (ags[ag] || 0) + amount(r.remaining || 0);
      });
      return Object.entries(ags).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6);
    }
    if (type === 'payment' || type === 'expense') {
      const methods = {};
      (model?.rows || []).forEach((r) => {
        const m = r.method || 'Transfer';
        methods[m] = (methods[m] || 0) + amount(r.amount || 0);
      });
      return Object.entries(methods).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6);
    }
    return [];
  }, [type, model?.rows, summary?.destinations]);

  const settlementAnalytics = useMemo(() => {
    if (type === 'supplier') {
      const top = (model?.rows || []).slice(0, 6).map((r) => {
        const sName = String(r?.supplier || 'Unassigned');
        return {
          name: sName.length > 12 ? sName.slice(0, 11) + '…' : sName,
          fullName: sName,
          metric1: amount(r?.paid),
          metric2: amount(r?.outstanding),
        };
      });
      return {
        title: 'Supplier Settlement Status',
        subtitle: 'Settled vs Pending',
        m1Label: 'Paid',
        m2Label: 'Outstanding',
        m1Color: '#10B981',
        m2Color: '#F59E0B',
        data: top,
      };
    }
    if (type === 'booking') {
      const top = (summary?.destinations || []).slice(0, 6).map((d) => {
        const dName = String(d?.name || 'Destination');
        return {
          name: dName.length > 12 ? dName.slice(0, 11) + '…' : dName,
          fullName: dName,
          metric1: amount(d?.revenue),
          metric2: amount(d?.cost),
        };
      });
      return {
        title: 'Destination Financial Yield',
        subtitle: 'Revenue vs Cost',
        m1Label: 'Revenue',
        m2Label: 'Cost',
        m1Color: '#2563EB',
        m2Color: '#8B5CF6',
        data: top,
      };
    }
    if (type === 'collection') {
      const agMap = {};
      (model?.rows || []).forEach((r) => {
        const ag = r.agentName || 'Direct';
        agMap[ag] = agMap[ag] || { name: ag, metric1: 0, metric2: 0 };
        agMap[ag].metric1 += amount(r.paid);
        agMap[ag].metric2 += amount(r.remaining);
      });
      const top = Object.values(agMap)
        .sort((a, b) => (b.metric1 + b.metric2) - (a.metric1 + a.metric2))
        .slice(0, 6)
        .map((item) => {
          const aName = String(item.name || 'Direct');
          return {
            name: aName.length > 12 ? aName.slice(0, 11) + '…' : aName,
            fullName: aName,
            metric1: item.metric1,
            metric2: item.metric2,
          };
        });
      return {
        title: 'Agent Collection Health',
        subtitle: 'Received vs Remaining',
        m1Label: 'Received',
        m2Label: 'Remaining',
        m1Color: '#10B981',
        m2Color: '#EF4444',
        data: top,
      };
    }
    if (type === 'payment') {
      const methodMap = {};
      (model?.rows || []).forEach((r) => {
        const m = r.method || 'Transfer';
        methodMap[m] = methodMap[m] || { name: m, metric1: 0, metric2: 0 };
        if (r.status === 'Paid') {
          methodMap[m].metric1 += amount(r.amount);
        } else {
          methodMap[m].metric2 += amount(r.amount);
        }
      });
      const top = Object.values(methodMap).slice(0, 6).map((item) => {
        const mName = String(item.name || 'Transfer');
        return {
          name: mName.length > 12 ? mName.slice(0, 11) + '…' : mName,
          fullName: mName,
          metric1: item.metric1,
          metric2: item.metric2,
        };
      });
      return {
        title: 'Payment Method Breakdown',
        subtitle: 'Completed vs Pending',
        m1Label: 'Paid',
        m2Label: 'Pending',
        m1Color: '#10B981',
        m2Color: '#F59E0B',
        data: top,
      };
    }
    // expense
    const supMap = {};
    (model?.rows || []).forEach((r) => {
      const s = r.supplier || 'Unassigned';
      supMap[s] = supMap[s] || { name: s, metric1: 0 };
      supMap[s].metric1 += amount(r.amount);
    });
    const avg = model?.rows?.length ? ((model.rows.reduce((sum, r) => sum + amount(r.amount), 0)) / model.rows.length) : 0;
    const top = Object.values(supMap)
      .sort((a, b) => b.metric1 - a.metric1)
      .slice(0, 6)
      .map((item) => {
        const sName = String(item.name || 'Unassigned');
        return {
          name: sName.length > 12 ? sName.slice(0, 11) + '…' : sName,
          fullName: sName,
          metric1: item.metric1,
          metric2: Math.round(avg),
        };
      });
    return {
      title: 'Supplier Expenses vs Average',
      subtitle: 'Recorded vs Avg Baseline',
      m1Label: 'Expense',
      m2Label: 'Average',
      m1Color: '#EF4444',
      m2Color: '#94A3B8',
      data: top,
    };
  }, [type, model?.rows, summary?.destinations]);

  return (
    <div className="min-h-screen space-y-3 sm:space-y-4 bg-[#F8FAFC] p-3 sm:p-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app/reports')} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-[17px] font-bold text-slate-900 leading-tight">{config.title}</h1>
            <p className="text-[11px] text-slate-500 leading-tight">{config.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary inline-flex h-8 items-center gap-1.5 px-3 text-xs shadow-sm">
            <Printer size={13} /> Print
          </button>
          <button onClick={exportRows} disabled={!visibleRows.length} className="btn-secondary inline-flex h-8 items-center gap-1.5 px-3 text-xs disabled:opacity-50 shadow-sm">
            <Download size={13} /> Export Excel
          </button>
        </div>
      </header>

      <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className={`lg:hidden flex w-full items-center justify-center gap-1.5 h-9 rounded-xl border text-xs font-bold shadow-sm ${filtersOpen ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`}><SlidersHorizontal size={14} /> {filtersOpen ? 'Hide filters' : 'Filters'}</button>
      {/* Filter panel in Single Row */}
      <section className={`card p-2.5 bg-white border border-slate-200/90 shadow-sm rounded-xl overflow-hidden ${filtersOpen ? 'block' : 'hidden'} lg:block`}>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:items-end lg:overflow-x-auto lg:flex-nowrap pb-1 pt-0.5 hide-scrollbar w-full">
          <div className="flex flex-col gap-0.5 flex-[1.4] lg:min-w-[215px] col-span-2 lg:col-span-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Travel Date Range</span>
            <TravelDateRange from={filters.from} to={filters.to} onChange={updateFilter} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <Select label="Agent" value={filters.agent} onChange={(value) => updateFilter('agent', value)} options={options.agents || []} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[100px]">
            <Select label="Destination" value={filters.destination} onChange={(value) => updateFilter('destination', value)} options={options.destinations || []} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[90px]">
            <Select label="Branch" value={filters.branch} onChange={(value) => updateFilter('branch', value)} options={options.branches || []} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            {['supplier', 'expense'].includes(type) ? (
              <Select label="Supplier" value={filters.supplier} onChange={(value) => updateFilter('supplier', value)} options={options.suppliers || []} />
            ) : (
              <Select label="Status" value={filters.status} onChange={(value) => updateFilter('status', value)} options={options.statuses || []} />
            )}
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[95px]">
            <Select label="Service" value={filters.serviceType} onChange={(value) => updateFilter('serviceType', value)} options={options.serviceTypes || []} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[100px]">
            <Select label="Table Status" value={localStatus} onChange={setLocalStatus} options={statuses} />
          </div>
          <div className="flex-1 min-w-0 lg:min-w-[105px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Search</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full form-input h-8 text-[11.5px] rounded-[0.45rem] px-2 border-slate-200" placeholder="Filter rows…" />
          </div>
          <div className="flex items-end gap-1.5 flex-shrink-0 lg:ml-1 col-span-2 lg:col-span-1 [&>button]:flex-1 [&>button]:justify-center lg:[&>button]:flex-none">
            <button onClick={generate} disabled={loading} className="btn-primary inline-flex h-8 items-center gap-1.5 px-3.5 text-[11.5px] font-semibold rounded-lg disabled:opacity-60 whitespace-nowrap shadow-sm">
              <Search size={12} /> {loading ? 'Loading…' : 'Generate'}
            </button>
            <button onClick={resetTableAndReport} className="btn-secondary inline-flex h-8 items-center gap-1.5 px-3 text-[11.5px] font-medium rounded-lg whitespace-nowrap shadow-sm">
              <RefreshCw size={12} /> Reset
            </button>
          </div>
        </div>
      </section>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* KPI cards - Matching Sales Report Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
        {model.cards.map(([label, value]) => {
          const meta = getKpiMeta(label);
          const Icon = meta.icon;
          return (
            <div key={label} className={`card p-2.5 sm:p-3.5 bg-white border ${meta.cardBorder} shadow-sm rounded-xl flex items-center gap-3 transition-shadow hover:shadow-md`}>
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${meta.iconBg} flex-shrink-0`}>
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</div>
                <div className="text-lg font-black text-slate-900 leading-tight truncate">{value}</div>
                <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{meta.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Intelligence Charts (Enhanced 4-Chart Executive Layout) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Activity Timeline Area Chart */}
        <div className="card p-4 bg-white border border-slate-200/90 shadow-sm rounded-xl lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={15} className="text-blue-600" />
              <h2 className="text-[13px] font-bold text-slate-800">{config.title} Activity Trend</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Timeline Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="opTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 9.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <RechartsTooltip formatter={(v) => `THB ${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Area type="monotone" dataKey="val1" name="Volume" stroke="#3B82F6" strokeWidth={2.5} fill="url(#opTrend)" dot={{ r: 3, fill: '#3B82F6' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Status Breakdown Donut Chart */}
        <div className="card p-4 bg-white border border-slate-200/90 shadow-sm rounded-xl lg:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <PieIcon size={15} className="text-emerald-600" />
              <h2 className="text-[13px] font-bold text-slate-800">Status Distribution</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Composition</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={44} outerRadius={66} dataKey="value" paddingAngle={2} strokeWidth={0}>
                    {statusDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-bold text-slate-400">TOTAL</span>
                <span className="text-[13px] font-black text-slate-900 leading-tight">{model.rows.length}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-1">
              {statusDistribution.slice(0, 4).map(d => (
                <div key={d.name} className="flex items-center justify-between text-[11px] bg-slate-50/70 px-2 py-1 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-600 truncate font-medium">{d.name}</span>
                  </div>
                  <span className="text-slate-900 font-bold ml-1">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Entity Ranking Volume Bar Chart */}
        <div className="card p-4 bg-white border border-slate-200/90 shadow-sm rounded-xl lg:col-span-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BarChart3 size={15} className="text-purple-600" />
              <h2 className="text-[13px] font-bold text-slate-800">Key Entity Volume</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Rankings</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topEntitiesBarData} layout="vertical" margin={{ top: 0, right: 15, left: 10, bottom: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                width={120}
                tick={({ x, y, payload }) => (
                  <text x={x} y={y} dy={3.5} textAnchor="end" fill="#64748b" fontSize={9.5} className="select-none font-medium">
                    {payload.value}
                  </text>
                )}
              />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} formatter={(val) => `THB ${Number(val).toLocaleString()}`} contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="amount" name="Amount" fill="#8B5CF6" radius={[0, 4, 4, 0]}>
                {topEntitiesBarData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#7C3AED' : i === 1 ? '#8B5CF6' : '#A78BFA'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4 (NEW): Settlement & Comparative Financial Breakdown */}
        <div className="card p-4 bg-white border border-slate-200/90 shadow-sm rounded-xl lg:col-span-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Layers size={15} className="text-emerald-600" />
              <h2 className="text-[13px] font-bold text-slate-800">{settlementAnalytics.title}</h2>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: settlementAnalytics.m1Color }} />
                <span className="text-slate-600">{settlementAnalytics.m1Label}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: settlementAnalytics.m2Color }} />
                <span className="text-slate-600">{settlementAnalytics.m2Label}</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={settlementAnalytics.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={3} barSize={11}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 9.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <RechartsTooltip formatter={(val, name) => [`THB ${Number(val).toLocaleString()}`, name === 'metric1' ? settlementAnalytics.m1Label : settlementAnalytics.m2Label]} contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="metric1" name={settlementAnalytics.m1Label} fill={settlementAnalytics.m1Color} radius={[4, 4, 0, 0]} />
              <Bar dataKey="metric2" name={settlementAnalytics.m2Label} fill={settlementAnalytics.m2Color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Details Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">{config.title} details</h2>
          <span className="text-xs text-slate-500">{visibleRows.length} record{visibleRows.length === 1 ? '' : 's'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-[#F1F5F9] sticky top-0 z-20 shadow-sm">
              <tr>
                {model.columns.map(([label]) => (
                  <th key={label} className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200">
                    {label}
                  </th>
                ))}
                {type === 'supplier' && <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-[#F1F5F9] border-b border-slate-200">View</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={model.columns.length + (type === 'supplier' ? 1 : 0)} className="px-4 py-10 text-center text-sm text-slate-400">
                    Loading live report data…
                  </td>
                </tr>
              ) : visibleRows.map((row, index) => (
                <tr key={`${row.bookingId || row.booking || row.supplier || 'record'}-${index}`} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  {model.columns.map(([, key, kind]) => (
                    <td key={key} className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                      {renderValue(row, key, kind)}
                    </td>
                  ))}
                  {type === 'supplier' && (
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedSupplier(row.supplier)} className="btn-secondary inline-flex h-8 items-center gap-1.5 px-2.5 text-xs text-blue-700 hover:border-blue-300 hover:bg-blue-50">
                        <Eye size={13} /> View
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && !visibleRows.length && (
                <tr>
                  <td colSpan={model.columns.length + (type === 'supplier' ? 1 : 0)} className="px-4 py-10 text-center text-sm text-slate-400">
                    No live records match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {type === 'supplier' && selectedSupplier && (
        <SupplierReportModal supplier={selectedSupplier} ledger={ledger} onClose={() => setSelectedSupplier('')} />
      )}
    </div>
  );
}
