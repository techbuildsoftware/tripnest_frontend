import React, { useState } from 'react';
import {
  Search, Filter, Download, Eye, X,
  Clock, UserCheck, Truck, CheckCircle2, MapPin, CheckSquare, Layers,
  User, Users, Map, Phone, Building, AlertTriangle, Navigation, Activity, Hash, Car
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import StatusBadge from '../../components/ui/StatusBadge';
import Drawer from '../../components/ui/Drawer';
import toast from 'react-hot-toast';
import { downloadExcelTable } from '../../lib/exportTable';

const statusOptions = ['All', 'Pending', 'Assigned', 'On the Way', 'Confirmed', 'Picked Up', 'Completed'];
const statusColorMap = {
  'Pending': 'bg-yellow-100 text-yellow-700',
  'Assigned': 'bg-blue-100 text-blue-700',
  'On the Way': 'bg-purple-100 text-purple-700',
  'Confirmed': 'bg-green-100 text-green-700',
  'Completed': 'bg-slate-100 text-slate-600',
  'Picked Up': 'bg-orange-100 text-orange-700',
};



export default function Operations() {
  const { operations, updateOperation } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOp, setSelectedOp] = useState(null);
  const [dateFilter, setDateFilter] = useState('2026-09-24');

  const filtered = operations.filter(op => {
    const s = search.toLowerCase();
    const matchSearch = !s || op.guest?.toLowerCase().includes(s) || op.bookingId?.toLowerCase().includes(s) || op.service?.toLowerCase().includes(s) || op.driver?.toLowerCase().includes(s);
    const matchStatus = statusFilter === 'All' || op.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportOperations = () => {
    if (!filtered.length) return toast.error('No operations to export.');
    downloadExcelTable({
      filename: `operations-${new Date().toISOString().slice(0, 10)}`,
      head: ['Operation ID', 'Booking ID', 'Guest', 'Service', 'Time', 'From', 'To', 'Pax', 'Vehicle', 'Driver', 'Status'],
      rows: filtered.map(op => [op.id, op.bookingId, op.guest, op.service, op.time, op.from, op.to, op.pax, op.vehicle, op.driver, op.status]),
    });
    toast.success(`Exported ${filtered.length} operations.`);
  };

  const getStatusBg = (status) => statusColorMap[status] || 'bg-slate-100 text-slate-600';

  const handleStatusUpdate = async (opId, newStatus) => {
    try {
      await updateOperation(opId, { status: newStatus });
      if (selectedOp?.id === opId) setSelectedOp(prev => ({ ...prev, status: newStatus }));
    } catch (error) { toast.error(error.message); }
  };

  const statCards = [
    { label: 'Total', status: 'All', count: operations.length, icon: Layers, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { label: 'Pending', status: 'Pending', count: operations.filter(o => o.status === 'Pending').length, icon: Clock, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-orange-500/20' },
    { label: 'Assigned', status: 'Assigned', count: operations.filter(o => o.status === 'Assigned').length, icon: UserCheck, gradient: 'from-sky-400 to-blue-500', shadow: 'shadow-sky-500/20' },
    { label: 'On the Way', status: 'On the Way', count: operations.filter(o => o.status === 'On the Way').length, icon: Truck, gradient: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20' },
    { label: 'Confirmed', status: 'Confirmed', count: operations.filter(o => o.status === 'Confirmed').length, icon: CheckCircle2, gradient: 'from-emerald-400 to-green-600', shadow: 'shadow-green-500/20' },
    { label: 'Picked Up', status: 'Picked Up', count: operations.filter(o => o.status === 'Picked Up').length, icon: MapPin, gradient: 'from-orange-400 to-red-500', shadow: 'shadow-orange-500/20' },
    { label: 'Completed', status: 'Completed', count: operations.filter(o => o.status === 'Completed').length, icon: CheckSquare, gradient: 'from-slate-400 to-slate-600', shadow: 'shadow-slate-500/20' },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Operations Control Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time tracking of all today's services and transfers</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-1 max-w-2xl items-center gap-2 xl:ml-auto">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guest, booking, driver..." className="form-input text-xs h-8 pl-8 w-full" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select text-xs h-8 py-1 w-full sm:w-32 flex-shrink-0">
            {statusOptions.map(s => <option key={s}>{s}</option>)}
          </select>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button type="button" onClick={exportOperations} className="btn-secondary h-8 px-3 text-xs w-full sm:w-auto justify-center"><Download className="w-3.5 h-3.5 mr-1" /> Export</button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {statCards.map(({ label, status, count, icon: Icon, gradient, shadow }) => (
          <div
            key={label}
            onClick={() => setStatusFilter(status === 'All' ? 'All' : status)}
            className={`bg-white rounded-xl border p-3 flex items-center justify-between cursor-pointer transition-all hover:shadow-md relative overflow-hidden group ${(status === 'All' ? statusFilter === 'All' : statusFilter === status) ? 'border-blue-400 shadow-[0_0_0_1px_rgba(96,165,250,1)]' : 'border-slate-200 hover:border-slate-300'}`}
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
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Time', 'Booking', 'Guest / Group', 'Service', 'Pickup Location', 'Drop Location', 'Vehicle / Driver', 'Status', 'Actions'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(op => (
                <tr key={op.id} className="table-row cursor-pointer" onClick={() => setSelectedOp(op)}>
                  <td className="table-cell font-mono text-xs font-semibold">{op.time}</td>
                  <td className="table-cell">
                    <div className="text-primary-600 font-medium text-xs">{op.bookingId}</div>
                  </td>
                  <td className="table-cell">
                    <div className="font-medium text-slate-900 text-sm">{op.guest}</div>
                    <div className="text-xs text-slate-400">{op.pax} pax</div>
                  </td>
                  <td className="table-cell text-sm">{op.service}</td>
                  <td className="table-cell text-xs text-slate-600 max-w-[120px]">
                    <div className="truncate">{op.from}</div>
                  </td>
                  <td className="table-cell text-xs text-slate-600 max-w-[120px]">
                    <div className="truncate">{op.to}</div>
                  </td>
                  <td className="table-cell text-xs">
                    <div className="font-medium">{op.vehicle}</div>
                    <div className="text-slate-400">{op.driver}</div>
                  </td>
                  <td className="table-cell" onClick={e => e.stopPropagation()}>
                    <select
                      value={op.status}
                      onChange={e => handleStatusUpdate(op.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${getStatusBg(op.status)}`}
                    >
                      {statusOptions.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="table-cell" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedOp(op)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">No operations for selected filters</div>
          )}
        </div>
      </div>

      {/* Operations Detail Drawer */}
      <Drawer isOpen={!!selectedOp} onClose={() => setSelectedOp(null)} title={`Operation Details — ${selectedOp?.id}`} width="w-[760px]">
        {selectedOp && (
          <div className="grid grid-cols-2 gap-6 pb-4">
            {/* Left Column */}
            <div className="space-y-5">
              {/* Status update */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 block">Update Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {statusOptions.slice(1).map(s => {
                    const isActive = selectedOp.status === s;
                    return (
                      <button key={s} onClick={() => handleStatusUpdate(selectedOp.id, s)}
                        className={`w-full justify-center px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm flex items-center gap-1.5
                          ${isActive ? 'bg-blue-600 text-white shadow-blue-500/30 ring-1 ring-blue-600 scale-[1.02]' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-blue-300'}`}>
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                        <span className="truncate">{s}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={Clock} label="Time" value={selectedOp.time} />
                <InfoCard icon={Hash} label="Booking" value={selectedOp.bookingId} valueClass="text-blue-600" />
                <InfoCard icon={User} label="Guest" value={selectedOp.guest} />
                <InfoCard icon={Users} label="Pax" value={`${selectedOp.pax} people`} />
                <InfoCard icon={Activity} label="Service" value={selectedOp.service} />
                <InfoCard icon={Car} label="Vehicle" value={selectedOp.vehicle} />
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-xl border border-blue-100/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-4 relative z-10">
                  <Map className="w-3.5 h-3.5" /> Route Details
                </div>
                
                <div className="relative pl-6 z-10">
                  {/* Timeline connector */}
                  <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-400 to-indigo-400 rounded-full"></div>
                  
                  <div className="relative mb-5">
                    <div className="absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-blue-500 shadow-[0_0_0_2px_rgba(219,234,254,1)]"></div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Pickup</div>
                    <div className="text-sm font-extrabold text-slate-800 mt-0.5">{selectedOp.from}</div>
                    <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" /> <span className="truncate">{selectedOp.pickupLocation}</span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_0_2px_rgba(224,231,255,1)]"></div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Drop-off</div>
                    <div className="text-sm font-extrabold text-slate-800 mt-0.5">{selectedOp.to}</div>
                    <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-1">
                      <Navigation className="w-3 h-3 text-slate-400 flex-shrink-0" /> <span className="truncate">{selectedOp.dropLocation}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4 pl-1">
                  <Truck className="w-3.5 h-3.5" /> Driver & Supplier
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 pl-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-0.5"><UserCheck className="w-3.5 h-3.5" /> Driver</div>
                    <div className="text-sm font-extrabold text-slate-800">{selectedOp.driver}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-0.5"><Phone className="w-3.5 h-3.5" /> Driver Phone</div>
                    <div className="text-sm font-extrabold text-slate-800">{selectedOp.driverPhone}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-0.5"><Building className="w-3.5 h-3.5" /> Supplier</div>
                    <div className="text-sm font-extrabold text-slate-800">{selectedOp.supplier}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-0.5"><Phone className="w-3.5 h-3.5" /> Supplier Phone</div>
                    <div className="text-sm font-extrabold text-slate-800">{selectedOp.supplierPhone}</div>
                  </div>
                </div>
              </div>

              {selectedOp.specialInstructions && (
                <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50/30 rounded-xl border border-amber-200/60 shadow-sm flex items-start gap-3">
                  <div className="mt-0.5 bg-amber-100 p-1.5 rounded-lg text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1">Special Instructions</div>
                    <div className="text-[13px] font-semibold text-amber-900 leading-snug">{selectedOp.specialInstructions}</div>
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              {selectedOp.timeline?.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-5">
                    <Clock className="w-3.5 h-3.5" /> Timeline
                  </div>
                  <div className="space-y-0 relative pl-2">
                    {/* Continuous line */}
                    <div className="absolute left-[13px] top-2 bottom-2 w-px bg-slate-200 z-0"></div>
                    
                    {selectedOp.timeline.map((t, i) => (
                      <div key={i} className="flex gap-4 relative z-10 pb-4 last:pb-0">
                        <div className="pt-0.5">
                          {t.status === 'done' ? (
                            <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_0_3px_#f8fafc]">
                              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            </div>
                          ) : t.status === 'active' ? (
                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_0_3px_#f8fafc,0_0_12px_rgba(14,160,154,0.6)] animate-pulse">
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-slate-200 border-2 border-white shadow-[0_0_0_1px_#e2e8f0]"></div>
                          )}
                        </div>
                        <div>
                          <div className={`text-[13px] font-extrabold ${t.status === 'done' ? 'text-slate-800' : t.status === 'active' ? 'text-blue-700' : 'text-slate-400'}`}>
                            {t.event}
                          </div>
                          <div className="text-[11px] font-medium text-slate-400 mt-0.5">{t.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, valueClass }) {
  return (
    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3 transition-colors hover:border-blue-300">
      <div className="mt-0.5 bg-slate-50 p-1.5 rounded-lg text-slate-500 shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{label}</div>
        <div className={`text-[13px] font-extrabold mt-0.5 truncate ${valueClass || 'text-slate-800'}`}>{value || '—'}</div>
      </div>
    </div>
  );
}
