import { useMemo, useState } from "react";
import { LuMail, LuMessageCircle, LuPhone, LuTrash2, LuDownload } from "react-icons/lu";
import { useAdmin, actions, dFull, dShort } from "../store.js";
import { Card, PageHead, Btn, Badge, DataTable, Chips, SearchBox, Modal, Avatar, Textarea, ask, toast, exportCsv } from "../ui.jsx";

const ST = ["New", "Contacted", "Won", "Lost"];

function Detail({ l, onClose }) {
  const [notes, setNotes] = useState(l.notes || "");
  const wa = `https://wa.me/${(l.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${l.name}, thanks for contacting TripNest!`)}`;
  const del = async () => { if (await ask("Delete this lead?")) { actions.deleteLead(l.id); onClose(); toast("Lead deleted"); } };
  return (
    <Modal side title={l.name} sub={`${l.source} · ${dFull(l.date)}`} onClose={onClose} footer={<><Btn v="danger" onClick={del}><LuTrash2 size={13} />Delete</Btn><Btn v="primary" onClick={() => { actions.saveLead({ ...l, notes }); toast("Saved"); onClose(); }}>Save notes</Btn></>}>
      <div className="space-y-4">
        <div className="flex items-center gap-3"><Avatar name={l.name} size={42} /><div className="min-w-0 text-xs"><p className="truncate font-semibold text-navy">{l.email || "—"}</p><p className="text-slate-500">{l.phone || "—"}</p></div></div>
        <div className="flex gap-2">
          {l.email && <a href={`mailto:${l.email}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-2 text-xs font-bold text-navy hover:bg-teal hover:text-white"><LuMail size={14} />Email</a>}
          {l.phone && <a href={wa} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-2 text-xs font-bold text-navy hover:bg-teal hover:text-white"><LuMessageCircle size={14} />WhatsApp</a>}
          {l.phone && <a href={`tel:${l.phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-2 text-xs font-bold text-navy hover:bg-teal hover:text-white"><LuPhone size={14} />Call</a>}
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-700">{l.message || "No message"}</div>
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Stage</p>
          <div className="flex flex-wrap gap-1.5">{ST.map((s) => <button key={s} onClick={() => actions.saveLead({ ...l, status: s })} className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 transition ${l.status === s ? "bg-navy text-white ring-navy" : "bg-white text-slate-600 ring-slate-200 hover:text-teal hover:ring-teal"}`}>{s}</button>)}</div>
        </div>
        <div><p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Internal notes</p><Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call back tomorrow, quoted ฿45,000…" /></div>
      </div>
    </Modal>
  );
}

export default function Leads() {
  const { leads } = useAdmin();
  const [q, setQ] = useState(""); const [st, setSt] = useState("All"); const [sel, setSel] = useState(null);
  const counts = useMemo(() => { const c = { All: leads.length }; ST.forEach((s) => (c[s] = leads.filter((l) => l.status === s).length)); return c; }, [leads]);
  const rows = useMemo(() => leads.filter((l) => (st === "All" || l.status === st) && (!q || `${l.name} ${l.email} ${l.message}`.toLowerCase().includes(q.toLowerCase()))), [leads, st, q]);
  const live = sel && leads.find((l) => l.id === sel);
  const conv = leads.length ? Math.round((counts.Won / leads.length) * 100) : 0;
  const cols = [
    { key: "name", label: "Lead", render: (l) => <span className="flex items-center gap-2"><Avatar name={l.name} size={24} /><span><span className="block font-bold text-navy">{l.name}</span><span className="block text-[11px] text-slate-400">{l.email}</span></span></span> },
    { key: "source", label: "Source", render: (l) => <Badge tone="slate">{l.source}</Badge> },
    { key: "message", label: "Message", render: (l) => <span className="block max-w-[280px] truncate text-slate-500">{l.message}</span> },
    { key: "date", label: "Received", render: (l) => dShort(l.date) },
    { key: "status", label: "Stage", render: (l) => <Badge>{l.status}</Badge> },
  ];
  return (
    <div>
      <PageHead title="Leads & enquiries" sub={`${counts.New} new · ${conv}% conversion · website forms land here`}><Btn onClick={() => exportCsv("leads", rows.map(({ notes, ...r }) => r))}><LuDownload size={13} />Export</Btn></PageHead>
      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5"><Chips options={["All", ...ST]} value={st} onChange={setSt} counts={counts} /><SearchBox value={q} onChange={setQ} placeholder="Search leads…" className="w-full sm:w-60" /></div>
        <DataTable columns={cols} rows={rows} onRow={(l) => setSel(l.id)} size={12} empty="No leads yet" />
      </Card>
      {live && <Detail key={live.id + live.status} l={live} onClose={() => setSel(null)} />}
    </div>
  );
}
