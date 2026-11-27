import { useMemo, useState } from "react";
import { LuPlus, LuDownload, LuMail, LuPhone, LuTrash2 } from "react-icons/lu";
import { useAdmin, actions, thb, dFull, dShort, newId } from "../store.js";
import { Card, PageHead, Btn, Badge, DataTable, Chips, SearchBox, Modal, Field, Input, Select, Avatar, ask, toast, exportCsv } from "../ui.jsx";

function Form({ onClose }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", city: "", type: "Traveller" });
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = () => { if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email)) return toast("Name and valid email required", "err"); actions.saveCustomer({ ...f, id: newId("C"), joined: new Date().toISOString(), notes: "" }); toast("Customer added"); onClose(); };
  return (
    <Modal title="Add customer" onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn v="primary" onClick={save}>Add customer</Btn></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name"><Input value={f.name} onChange={up("name")} /></Field><Field label="Type"><Select value={f.type} onChange={up("type")}><option>Traveller</option><option>Business</option></Select></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={up("email")} /></Field><Field label="Phone"><Input value={f.phone} onChange={up("phone")} /></Field>
        <Field label="City" className="sm:col-span-2"><Input value={f.city} onChange={up("city")} /></Field>
      </div>
    </Modal>
  );
}

function Detail({ c, bookings, onClose }) {
  const del = async () => { if (await ask(`Delete ${c.name}? Their bookings stay in the system.`)) { actions.deleteCustomer(c.id); toast("Customer deleted"); onClose(); } };
  return (
    <Modal side title={c.name} sub={`${c.id} · joined ${dFull(c.joined)}`} onClose={onClose} footer={<Btn v="danger" onClick={del}><LuTrash2 size={13} />Delete</Btn>}>
      <div className="space-y-4">
        <div className="flex items-center gap-3"><Avatar name={c.name} size={44} /><div className="text-xs"><Badge>{c.type}</Badge><p className="mt-1 text-slate-500">{c.city}</p></div></div>
        <div className="flex gap-2"><a href={`mailto:${c.email}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-2 text-xs font-bold text-navy hover:bg-teal hover:text-white"><LuMail size={14} />{c.email.length > 22 ? "Email" : c.email}</a>{c.phone && <a href={`tel:${c.phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-2 text-xs font-bold text-navy hover:bg-teal hover:text-white"><LuPhone size={14} />{c.phone}</a>}</div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-extrabold text-navy">{bookings.length}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bookings</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-extrabold text-teal">{thb(bookings.filter((b) => b.status !== "Cancelled").reduce((a, b) => a + b.amount, 0))}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lifetime value</p></div>
        </div>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {bookings.length ? bookings.map((b) => <li key={b.ref} className="flex items-center justify-between gap-2 px-3 py-2 text-xs"><span className="min-w-0"><b className="text-navy">{b.ref}</b><span className="block truncate text-slate-400">{b.item}</span></span><span className="flex shrink-0 items-center gap-2 font-extrabold">{thb(b.amount)}<Badge>{b.status}</Badge></span></li>) : <li className="px-3 py-3 text-xs text-slate-400">No bookings yet</li>}
        </ul>
      </div>
    </Modal>
  );
}

export default function Customers() {
  const { customers, bookings } = useAdmin();
  const [q, setQ] = useState(""); const [t, setT] = useState("All"); const [sel, setSel] = useState(null); const [add, setAdd] = useState(false);
  const data = useMemo(() => customers.map((c) => { const bs = bookings.filter((b) => b.customerId === c.id); const live = bs.filter((b) => b.status !== "Cancelled"); return { ...c, n: bs.length, spend: live.reduce((a, b) => a + b.amount, 0), last: bs[0]?.created, tier: live.reduce((a, b) => a + b.amount, 0) > 150000 ? "Gold" : live.reduce((a, b) => a + b.amount, 0) > 60000 ? "Silver" : "Standard" }; }), [customers, bookings]);
  const rows = useMemo(() => data.filter((c) => (t === "All" || c.type === t) && (!q || `${c.name} ${c.email} ${c.city}`.toLowerCase().includes(q.toLowerCase()))), [data, q, t]);
  const live = sel && data.find((c) => c.id === sel);
  const cols = [
    { key: "name", label: "Customer", render: (c) => <span className="flex items-center gap-2"><Avatar name={c.name} size={26} /><span><span className="block font-bold text-navy">{c.name}</span><span className="block text-[11px] text-slate-400">{c.email}</span></span></span> },
    { key: "type", label: "Type", render: (c) => <Badge>{c.type}</Badge> },
    { key: "city", label: "City", render: (c) => <span className="text-slate-500">{c.city}</span> },
    { key: "n", label: "Bookings", align: "right" },
    { key: "spend", label: "Lifetime value", align: "right", render: (c) => <span className="font-extrabold">{thb(c.spend)}</span> },
    { key: "tier", label: "Tier", render: (c) => <Badge tone={c.tier === "Gold" ? "amber" : c.tier === "Silver" ? "blue" : "slate"}>{c.tier}</Badge> },
    { key: "last", label: "Last booking", render: (c) => (c.last ? dShort(c.last) : "—") },
  ];
  return (
    <div>
      <PageHead title="Customers" sub={`${customers.length} customers · ${customers.filter((c) => c.type === "Business").length} business accounts`}>
        <Btn onClick={() => exportCsv("customers", rows.map(({ notes, ...r }) => r))}><LuDownload size={13} />Export</Btn><Btn v="primary" onClick={() => setAdd(true)}><LuPlus size={14} />Add customer</Btn>
      </PageHead>
      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5"><Chips options={["All", "Traveller", "Business"]} value={t} onChange={setT} /><SearchBox value={q} onChange={setQ} placeholder="Search name, email, city…" className="w-full sm:w-64" /></div>
        <DataTable columns={cols} rows={rows} onRow={(c) => setSel(c.id)} size={12} />
      </Card>
      {live && <Detail c={live} bookings={bookings.filter((b) => b.customerId === live.id)} onClose={() => setSel(null)} />}
      {add && <Form onClose={() => setAdd(false)} />}
    </div>
  );
}
