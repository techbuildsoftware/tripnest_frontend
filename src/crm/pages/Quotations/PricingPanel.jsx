import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Hotel,
  Car,
  Compass,
  Anchor,
  Utensils,
  User,
  Package,
  Percent,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';

const fmt = (n) => `฿${Number(n || 0).toLocaleString()}`;

const CATEGORY_ICONS = {
  Hotels: { icon: Hotel, bg: 'bg-blue-50 text-blue-600' },
  Transfers: { icon: Car, bg: 'bg-emerald-50 text-emerald-600' },
  Sightseeing: { icon: Compass, bg: 'bg-purple-50 text-purple-600' },
  Yachts: { icon: Anchor, bg: 'bg-sky-50 text-sky-600' },
  Meals: { icon: Utensils, bg: 'bg-orange-50 text-orange-600' },
  Guides: { icon: User, bg: 'bg-amber-50 text-amber-600' },
  Other: { icon: Package, bg: 'bg-slate-100 text-slate-600' },
  'Quotation markup': { icon: Percent, bg: 'bg-indigo-50 text-indigo-600' },
};

export default function PricingPanel({ pricing, quotation, viewMode }) {
  if (viewMode === 'client') return null;

  const totalCost = Number(pricing.totalCost || 0);
  const totalSelling = Number(pricing.totalSelling || 0);
  const profit = totalSelling - totalCost;
  const margin = totalSelling > 0 ? ((profit / totalSelling) * 100).toFixed(2) : 0;
  const marginNum = Number(margin);

  const adults = Number(quotation?.adults || 1) || 1;
  const sellingPP = pricing.sellingPP || (totalSelling / adults);

  const rows = [
    { label: 'Hotels', cost: pricing.hotelCost, sell: pricing.hotelSelling },
    { label: 'Transfers', cost: pricing.transferCost, sell: pricing.transferSelling },
    { label: 'Sightseeing', cost: pricing.sightseeingCost, sell: pricing.sightseeingSelling },
    { label: 'Yachts', cost: pricing.yachtCost, sell: pricing.yachtSelling },
    { label: 'Meals', cost: pricing.mealCost, sell: pricing.mealSelling },
    { label: 'Guides', cost: pricing.guideCost, sell: pricing.guideSelling },
    { label: 'Other', cost: pricing.otherCost, sell: pricing.otherSelling },
    ...(pricing.globalMarkupAmount ? [{ label: 'Quotation markup', cost: 0, sell: pricing.globalMarkupAmount }] : []),
  ].filter((r) => Number(r.sell || 0) > 0 || Number(r.cost || 0) > 0);

  const healthConfig =
    marginNum >= 15
      ? {
          status: 'Good Margin',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          barColor: 'bg-emerald-500',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600',
          desc: 'Optimal profit margin achieved',
        }
      : marginNum >= 10
      ? {
          status: 'Acceptable',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          barColor: 'bg-amber-500',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          desc: 'Within standard target range',
        }
      : {
          status: 'Low Margin',
          badge: 'bg-rose-100 text-rose-800 border-rose-200',
          barColor: 'bg-rose-500',
          icon: AlertTriangle,
          iconColor: 'text-rose-600',
          desc: 'Margin is below recommended target',
        };

  const HealthIcon = healthConfig.icon;

  return (
    <div className="w-80 flex-shrink-0 overflow-y-auto hidden lg:block p-3">
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden sticky top-0 space-y-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white leading-tight">Quotation Summary</div>
              <div className="text-[10px] text-blue-200/70 font-medium">Financial breakdown</div>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/25">
            THB (฿)
          </span>
        </div>

        {/* Hero Highlights Card */}
        <div className="p-3">
          <div className="bg-gradient-to-br from-blue-50/80 via-slate-50/60 to-indigo-50/40 p-3.5 rounded-xl border border-blue-100/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Total Selling Price
              </span>
              {profit > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-200/70 px-1.5 py-0.5 rounded-md">
                  <ArrowUpRight className="w-3 h-3" />
                  +{margin}%
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {fmt(totalSelling)}
            </div>
            <div className="flex items-center justify-between text-xs pt-2 mt-2 border-t border-blue-200/40">
              <span className="text-slate-500 font-medium">Total Cost:</span>
              <span className="font-semibold text-slate-700">{fmt(totalCost)}</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Services Breakdown
            </span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full">
              {rows.length} {rows.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
            {rows.map((row) => {
              const categoryConfig = CATEGORY_ICONS[row.label] || { icon: Package, bg: 'bg-slate-100 text-slate-600' };
              const Icon = categoryConfig.icon;
              const rowProfit = Number(row.sell || 0) - Number(row.cost || 0);

              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${categoryConfig.bg}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{row.label}</div>
                      <div className="text-[10px] text-slate-400">Cost: {fmt(row.cost)}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-900">{fmt(row.sell)}</div>
                    <div className="text-[10px] font-semibold text-emerald-600">
                      +{fmt(rowProfit)}
                    </div>
                  </div>
                </div>
              );
            })}

            {rows.length === 0 && (
              <div className="py-4 text-center border border-dashed border-slate-200 rounded-lg">
                <p className="text-slate-400 text-xs font-medium">No services added yet</p>
              </div>
            )}
          </div>
        </div>

        {/* 2x2 Key Metrics Grid */}
        <div className="p-3 pt-0">
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {/* Gross Profit */}
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Gross Profit</span>
                <TrendingUp className="w-3 h-3" />
              </div>
              <div className="text-sm font-black text-emerald-900">{fmt(profit)}</div>
            </div>

            {/* Profit Margin */}
            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Margin</span>
                <Percent className="w-3 h-3" />
              </div>
              <div className="text-sm font-black text-blue-900">{margin}%</div>
            </div>

            {/* Per Person */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Per Person</span>
                <Users className="w-3 h-3" />
              </div>
              <div className="text-xs font-bold text-slate-800">{fmt(sellingPP)}</div>
            </div>

            {/* Total Cost */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Cost</span>
                <Wallet className="w-3 h-3" />
              </div>
              <div className="text-xs font-bold text-slate-800">{fmt(totalCost)}</div>
            </div>
          </div>
        </div>

        {/* Profit Health Meter Card */}
        <div className="p-3 pt-0">
          <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <HealthIcon className={`w-3.5 h-3.5 ${healthConfig.iconColor}`} />
                <span className="text-xs font-bold text-slate-800">Profit Health</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${healthConfig.badge}`}>
                {healthConfig.status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${healthConfig.barColor}`}
                style={{ width: `${Math.min(100, Math.max(5, marginNum * 4))}%` }}
              />
            </div>

            <div className="text-[10px] text-slate-500 font-medium">
              {healthConfig.desc}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
