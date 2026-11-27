import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, ReceiptText, Package, Image as ImageIcon,
  Zap, ChevronRight, Eye, Download, MoreHorizontal,
  Settings, Search, Clock, ArrowRight, Star
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { formatDate } from '../../lib/date';

const statusStyle = {
  Generated: { bg: '#dcfce7', text: '#15803d' },
  Sent: { bg: '#dbeafe', text: '#154aa0' },
  Draft: { bg: '#f1f5f9', text: '#64748b' },
};

const typeStyle = {
  Quotation: { bg: '#eff6ff', text: '#2b7de9' },
  Voucher: { bg: '#fef3c7', text: '#d97706' },
  Package: { bg: '#f0fdf4', text: '#16a34a' },
};

/* ─── Tool cards data ─────────────────────────────────────────────────────── */
const tools = [
  {
    id: 'quotation-pdf',
    title: 'Create Quotation PDF',
    desc: 'Generate professional PDF quotations with multiple options, templates and branding.',
    btnLabel: 'Create Quotation',
    btnColor: 'linear-gradient(135deg, #2b7de9 0%, #1d62c9 100%)',
    btnShadow: '0 4px 14px rgba(43,125,233,0.35)',
    cardBg: '#eff6ff',
    cardBorder: '#bfdbfe',
    iconBg: '#2b7de9',
    icon: FileText,
    path: '/quotations/new',
    settingsPath: '/documents/pdf-template-settings',
  },
  {
    id: 'voucher',
    title: 'Create Voucher',
    desc: 'Create combined vouchers with flight, hotel, transfer and sightseeing and day-wise itinerary.',
    btnLabel: 'Create Voucher',
    btnColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    btnShadow: '0 4px 14px rgba(245,158,11,0.35)',
    cardBg: '#fffbeb',
    cardBorder: '#fde68a',
    iconBg: '#f59e0b',
    icon: ReceiptText,
    path: '/bookings',
    settingsPath: '/documents/voucher-template-settings',
  },
  {
    id: 'packages',
    title: 'Ready-Made Packages',
    desc: 'Use pre-designed packages or create your own with pricing, itinerary and marketing content.',
    btnLabel: 'Browse Packages',
    btnColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    btnShadow: '0 4px 14px rgba(16,185,129,0.35)',
    cardBg: '#f0fdf4',
    cardBorder: '#bbf7d0',
    iconBg: '#10b981',
    icon: Package,
    path: '/documents/packages',
    settingsPath: null,
  },
  {
    id: 'flyer',
    title: 'Package Flyer Maker',
    desc: 'Create attractive flyers for agents and social media with ready templates.',
    btnLabel: 'Create Flyer',
    btnColor: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    btnShadow: '0 4px 14px rgba(139,92,246,0.35)',
    cardBg: '#faf5ff',
    cardBorder: '#ddd6fe',
    iconBg: '#8b5cf6',
    icon: ImageIcon,
    path: '/documents/flyer',
    settingsPath: null,
  },
];

/* ─── Quick Links ─────────────────────────────────────────────────────────── */
const quickLinks = [
  { label: 'Quotation Templates', sub: 'Manage PDF templates', icon: FileText, path: '/documents/pdf-template-settings' },
  { label: 'Voucher Templates', sub: 'Manage voucher formats', icon: ReceiptText, path: '/documents/voucher-template-settings' },
  { label: 'Ready-Made Packages', sub: 'Edit or create packages', icon: Package, path: '/documents/packages' },
  { label: 'Image & Content Library', sub: 'Manage photos & content', icon: ImageIcon, path: '/documents/media-library' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Documents() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get('/quotations?limit=10&summary=false&sortBy=updatedAt&sortDir=desc'),
      apiClient.get('/bookings?limit=10&summary=false&sortBy=updatedAt&sortDir=desc'),
    ]).then(([quotationResponse, bookingResponse]) => {
      if (!active) return;
      const quotations = (quotationResponse.data || []).map((quotation) => ({
        id: quotation.id, type: 'Quotation', title: quotation.destination || 'Travel quotation', clientAgent: quotation.guestName || quotation.agentName || '—',
        createdOn: quotation.updatedAt || quotation.createdAt, status: quotation.status || 'Draft', path: `/quotations/${quotation.id}`,
      }));
      const vouchers = (bookingResponse.data || []).filter((booking) => booking.voucher?.generatedAt).map((booking) => ({
        id: booking.id, type: 'Voucher', title: booking.destination || 'Travel voucher', clientAgent: booking.guestName || booking.agentName || '—',
        createdOn: booking.voucher.generatedAt || booking.updatedAt || booking.createdAt, status: 'Generated', path: `/bookings/${booking.id}/voucher`,
      }));
      setRecentDocuments([...quotations, ...vouchers].sort((a, b) => new Date(b.createdOn || 0) - new Date(a.createdOn || 0)).slice(0, 10));
    }).catch(() => { if (active) setRecentDocuments([]); })
      .finally(() => { if (active) setLoadingDocuments(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => recentDocuments.filter(d =>
    !search || d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.id.toLowerCase().includes(search.toLowerCase()) ||
    d.clientAgent.toLowerCase().includes(search.toLowerCase())
  ), [recentDocuments, search]);

  return (
    <div className="p-3 sm:p-5 lg:p-7" style={{ minHeight: '100%', background: '#f8fafc' }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-[22px]" style={{ fontSize: undefined, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
          Sales Toolkit
        </h1>
        <p className="text-xs sm:text-[13px]" style={{ color: '#64748b', margin: '4px 0 0' }}>
          Create professional quotations, vouchers and marketing materials for your Thailand travel packages.
        </p>
      </div>

      {/* ── Tool Cards Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-7">
        {tools.map(tool => {
          const Icon = tool.icon;
          return (
            <ToolCard key={tool.id} tool={tool} Icon={Icon} onNavigate={navigate} />
          );
        })}
      </div>

      {/* ── Quick Links ─────────────────────────────────────────────────── */}
      <div className="mb-5 sm:mb-7">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Zap size={16} color="#f59e0b" fill="#f59e0b" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Quick Links</span>
        </div>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {quickLinks.map(link => {
            const Icon = link.icon;
            return (
              <QuickLinkCard key={link.label} link={link} Icon={Icon} onNavigate={navigate} />
            );
          })}
        </div>
      </div>

      {/* ── Recent Documents ─────────────────────────────────────────────── */}
      <div style={{
        background: 'white', border: '1.5px solid #e2e8f0',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      }}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-5 sm:py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="#64748b" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Recent Documents</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search documents..."
                style={{
                  paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                  border: '1.5px solid #e2e8f0', borderRadius: 9,
                  fontSize: 13, outline: 'none', background: '#f8fafc', color: '#0f172a', width: '100%',
                }}
                className="sm:!w-[200px]"
              />
            </div>
            <button
              style={{ fontSize: 13, fontWeight: 600, color: '#2b7de9', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px' }}
            >
              View All
            </button>
          </div>
        </div>
        <div className="md:hidden divide-y divide-slate-100">
          {loadingDocuments && <div className="px-4 py-8 text-center text-[13px] text-slate-400">Loading recent documents…</div>}
          {!loadingDocuments && !filtered.length && <div className="px-4 py-8 text-center text-[13px] text-slate-400">No quotation or generated voucher documents found.</div>}
          {filtered.map((doc) => {
            const ts = typeStyle[doc.type] || { bg: '#f1f5f9', text: '#64748b' };
            const ss = statusStyle[doc.status] || { bg: '#f1f5f9', text: '#64748b' };
            return (
              <button key={`m-${doc.type}-${doc.id}`} type="button" onClick={() => navigate(doc.path)} className="w-full text-left px-3 py-2.5 active:bg-slate-50 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: ts.bg, color: ts.text }}>{doc.type}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: ss.bg, color: ss.text }}>{doc.status}</span>
                  </div>
                  <div className="truncate text-[13px] font-semibold text-slate-900">{doc.title}</div>
                  <div className="truncate text-[11px] text-slate-500">{doc.clientAgent} · {formatDate(doc.createdOn)}</div>
                  <div className="truncate font-mono text-[10px] text-slate-400">{doc.id}</div>
                </div>
                <ChevronRight size={14} color="#94a3b8" className="mt-1 shrink-0" />
              </button>
            );
          })}
        </div>
        <div className="hidden md:block overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Type', 'Title', 'Client / Agent', 'Created On', 'Status', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc, i) => {
              const ts = typeStyle[doc.type] || { bg: '#f1f5f9', text: '#64748b' };
              const ss = statusStyle[doc.status] || { bg: '#f1f5f9', text: '#64748b' };
              return (
                <tr key={`${doc.type}-${doc.id}`} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer' }} onClick={() => navigate(doc.path)}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ts.bg, color: ts.text }}>{doc.type}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{doc.title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, fontFamily: 'monospace' }}>{doc.id}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{doc.clientAgent}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{formatDate(doc.createdOn)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ss.bg, color: ss.text }}>{doc.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[{ Icon: Eye, title: 'View' }, { Icon: Download, title: 'Download' }, { Icon: MoreHorizontal, title: 'More' }].map(({ Icon: Ic, title }) => (
                        <button key={title} title={title} onClick={(event) => { event.stopPropagation(); navigate(doc.path); }} style={{ padding: 6, borderRadius: 7, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Ic size={14} color="#64748b" />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}{!loadingDocuments && !filtered.length && <tr><td colSpan="6" style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>No quotation or generated voucher documents found.</td></tr>}{loadingDocuments && <tr><td colSpan="6" style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>Loading recent documents…</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Tool Card ─────────────────────────────────────────────────────────── */
function ToolCard({ tool, Icon, onNavigate }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white',
        border: `1.5px solid ${hovered ? tool.iconBg + '60' : tool.cardBorder}`,
        borderRadius: 16,
        padding: '14px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.12)' : '0 1px 8px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Illustration area */}
      <div className="hidden min-[520px]:flex h-[110px] xl:h-[120px] items-center justify-center mb-3" style={{ borderRadius: 10, background: tool.cardBg, border: `1px solid ${tool.cardBorder}`, overflow: 'hidden' }}>
        <ToolPreview id={tool.id} iconBg={tool.iconBg} />
      </div>

      {/* Icon badge */}
      <div className="flex items-center gap-2.5 mb-2 min-[520px]:block">
      <div className="min-[520px]:mb-2.5" style={{ width: 36, height: 36, borderRadius: '50%', background: tool.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${tool.iconBg}55`, flexShrink: 0 }}>
        <Icon size={18} color="white" />
      </div>

      <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }} className="min-[520px]:mb-1.5">{tool.title}</div>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 12, flex: 1 }}>{tool.desc}</div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onNavigate(tool.path)}
          style={{
            flex: 1,
            background: tool.btnColor,
            boxShadow: tool.btnShadow,
            color: 'white',
            border: 'none',
            borderRadius: 9,
            padding: '9px 14px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {tool.btnLabel} <ArrowRight size={14} />
        </button>
        {tool.settingsPath && (
          <button
            onClick={() => onNavigate(tool.settingsPath)}
            title="Template Settings"
            style={{
              width: 36, height: 36, borderRadius: 9,
              border: `1.5px solid ${tool.cardBorder}`,
              background: hovered ? tool.cardBg : 'white',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
          >
            <Settings size={14} color="#64748b" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Quick Link Card ──────────────────────────────────────────────────── */
function QuickLinkCard({ link, Icon, onNavigate }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onNavigate(link.path)}
      style={{
        background: 'white',
        border: `1.5px solid ${hovered ? '#2b7de9' : '#e2e8f0'}`,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: hovered ? '0 4px 16px rgba(43,125,233,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.15s',
        width: '100%',
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color="#2b7de9" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.label}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{link.sub}</div>
      </div>
      <ChevronRight size={14} color="#94a3b8" />
    </button>
  );
}

/* ─── Tool Preview Illustrations ─────────────────────────────────────────── */
function ToolPreview({ id, iconBg }) {
  if (id === 'quotation-pdf') {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: 68, height: 90, background: 'white', border: '1px solid #bfdbfe', borderRadius: 6, transform: 'rotate(-5deg) translate(-8px, 4px)', boxShadow: '0 2px 8px rgba(43,125,233,0.1)' }}>
          <div style={{ margin: '6px 5px 3px', height: 6, background: '#dbeafe', borderRadius: 2 }} />
          {[1,2,3,4].map(i => <div key={i} style={{ margin: '2px 5px', height: 3, background: '#e0f2fe', borderRadius: 1, width: i % 3 === 0 ? '60%' : '90%' }} />)}
        </div>
        <div style={{ position: 'relative', width: 70, height: 92, background: 'white', border: '1.5px solid #2b7de9', borderRadius: 7, boxShadow: '0 4px 16px rgba(43,125,233,0.2)' }}>
          <div style={{ height: 18, background: 'linear-gradient(135deg, #2b7de9, #154aa0)', margin: 5, borderRadius: 4 }} />
          <div style={{ margin: '4px 5px 2px', height: 5, background: '#bfdbfe', borderRadius: 2 }} />
          <div style={{ margin: '2px 5px', height: 3, background: '#dbeafe', borderRadius: 1, width: '75%' }} />
          <div style={{ margin: '4px 5px 2px', height: 4, background: '#60a5fa', borderRadius: 2, width: '55%' }} />
          {[1,2,3].map(i => <div key={i} style={{ margin: '2px 5px', height: 3, background: '#e0f2fe', borderRadius: 1, width: i === 2 ? '60%' : '90%' }} />)}
          <div style={{ position: 'absolute', bottom: 5, right: 5, fontSize: 7, fontWeight: 700, color: '#2b7de9', background: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>PDF</div>
        </div>
      </div>
    );
  }
  if (id === 'voucher') {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 110, height: 68, background: 'white', border: '1.5px solid #f59e0b', borderRadius: 8, boxShadow: '0 4px 16px rgba(245,158,11,0.2)', overflow: 'hidden' }}>
          <div style={{ height: 22, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 }}>
            <div style={{ width: 12, height: 12, background: 'rgba(255,255,255,0.3)', borderRadius: '50%' }} />
            <div style={{ fontSize: 6, fontWeight: 800, color: 'white', letterSpacing: 1 }}>CONFIRMATION VOUCHER</div>
          </div>
          <div style={{ padding: '5px 8px' }}>
            <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
              {['Hotel','Transfer','Activity'].map(t => (
                <div key={t} style={{ fontSize: 5, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '1px 3px', borderRadius: 2 }}>{t}</div>
              ))}
            </div>
            <div style={{ height: 3, background: '#fde68a', borderRadius: 1, marginBottom: 2 }} />
            <div style={{ height: 3, background: '#fef3c7', borderRadius: 1, width: '70%' }} />
          </div>
        </div>
      </div>
    );
  }
  if (id === 'packages') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', height: '100%' }}>
        {[{ label: 'Bangkok\nPattaya', color: '#10b981' }, { label: 'Phuket\nKrabi', color: '#0891b2' }].map((pkg, i) => (
          <div key={i} style={{ width: 58, height: 75, borderRadius: 8, background: `linear-gradient(160deg, ${pkg.color}dd 0%, ${pkg.color} 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${pkg.color}44`, border: '2px solid white' }}>
            <Star size={12} color="gold" fill="gold" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 7, fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.3, whiteSpace: 'pre-line' }}>{pkg.label}</div>
            <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>PACKAGE</div>
          </div>
        ))}
      </div>
    );
  }
  if (id === 'flyer') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, width: '100%', height: '100%' }}>
        {[
          { bg: 'linear-gradient(160deg, #8b5cf6 0%, #6d28d9 100%)', label: 'THAILAND\nFAMILY PACKAGE' },
          { bg: 'linear-gradient(160deg, #ec4899 0%, #db2777 100%)', label: 'HONEYMOON\nSIMULATOR' },
        ].map((f, i) => (
          <div key={i} style={{ width: 55, height: 75, borderRadius: 8, background: f.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: 6, boxShadow: '0 4px 12px rgba(139,92,246,0.3)', border: '2px solid white' }}>
            <div style={{ fontSize: 6, fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.3, whiteSpace: 'pre-line' }}>{f.label}</div>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
