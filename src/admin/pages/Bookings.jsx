import { useMemo, useState } from "react";
import { LuPlus, LuDownload, LuTrash2, LuMessageCircle, LuMail, LuCreditCard } from "react-icons/lu";
import { useAdmin, actions, thb, dFull, dShort, paidOf, newId, METHODS } from "../store.js";
import { Card, PageHead, Btn, Badge, DataTable, SearchBox, Chips, Modal, Field, Input, Select, Textarea, Progress, Avatar, ask, toast, exportCsv } from "../ui.jsx";

const ST = ["Pending", "Confirmed", "Completed", "Cancelled"];

function BookingForm({ initial, onClose }) {
  const { customers, packages, services } = useAdmin();
  const isNew = !initial;
  const [f, setF] = useState(initial || { ref: "", customerId: customers[0]?.id, item: packages[0]?.title, pax: 2, amount: packages[0]?.price || 0, travel: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), status: "Pending", notes: "" });
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const items = [...packages.map((p) => ({ n: p.title, p: p.price })), ...services.map((s) => ({ n: s.title, p: s.from }))];
  const save = () => {
    const c = customers.find((x) => x.id === f.customerId);
    if (!c || !f.item || !(+f.amount > 0)) return toast("Fill customer, trip and amount", "err");
    actions.saveBooking({ ...f, ref: f.ref || `TN-${2001 + Math.floor(Math.random() * 90000)}`, customer: c.name, email: c.email, pax: +f.pax, amount: +f.amount, travel: new Date(f.travel).toISOString(), created: f.created || new Date().toISOString() });
    toast(isNew ? "Booking created" : "Booking saved"); onClose();
  };
  return (
    <Modal wide title={isNew ? "New booking" : `Edit ${f.ref}`} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn v="primary" onClick={save}>Save booking</Btn></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Customer"><Select value={f.customerId} onChange={up("customerId")}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Status"><Select value={f.status} onChange={up("status")}>{ST.map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Trip / service" className="sm:col-span-2">
          <Select value={f.item} onChange={(e) => { const it = items.find((x) => x.n === e.target.value); setF({ ...f, item: e.target.value, amount: it ? it.p * (+f.pax || 1) : f.amount }); }}>{items.map((i) => <option key={i.n}>{i.n}</option>)}</Select>
        </Field>
        <Field label="Guests"><Input type="number" min="1" value={f.pax} onChange={up("pax")} /></Field>
        <Field label="Total amount (฿)"><Input type="number" min="0" value={f.amount} onChange={up("amount")} /></Field>
        <Field label="Travel date"><Input type="date" value={String(f.travel).slice(0, 10)} onChange={up("travel")} /></Field>
        <Field label="Internal notes" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={up("notes")} placeholder="Pickup time, special requests…" /></Field>
      </div>
    </Modal>
  );
}

function Detail({ b, onClose, onEdit }) {
  const { payments } = useAdmin();
  const pays = payments.filter((p) => p.booking === b.ref);
  const paid = paidOf(b.ref, payments);
  const [amt, setAmt] = useState(Math.max(0, b.amount - paid));
  const [method, setMethod] = useState("Visa");
  const record = () => { if (!(+amt > 0)) return; actions.savePayment({ id: newId("PAY"), booking: b.ref, customer: b.customer, method, amount: +amt, status: "Paid", date: new Date().toISOString(), note: "" }); toast("Payment recorded"); };
  const del = async () => { if (await ask(`Delete booking ${b.ref} and its payments?`)) { actions.deleteBooking(b.ref); toast("Booking deleted"); onClose(); } };
  return (
    <Modal side title={b.ref} sub={`Created ${dFull(b.created)}`} onClose={onClose}
      footer={<><Btn v="danger" onClick={del}><LuTrash2 size={13} />Delete</Btn><Btn onClick={onEdit}>Edit details</Btn></>}>
      <div className="space-y-4">
        <div className="flex items-center gap-3"><Avatar name={b.customer} size={40} /><div className="min-w-0"><p className="font-extrabold text-navy">{b.customer}</p><p className="truncate text-xs text-slate-500">{b.email}</p></div>
          <div className="ml-auto flex gap-1"><a href={`mailto:${b.email}`} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-navy hover:bg-teal hover:text-white" aria-label="Email"><LuMail size={15} /></a><a href={`https://wa.me/?text=${encodeURIComponent(`Hi ${b.customer}, regarding your booking ${b.ref}`)}`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-navy hover:bg-teal hover:text-white" aria-label="WhatsApp"><LuMessageCircle size={15} /></a></div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl bg-slate-50 p-3 text-xs">
          {[["Trip", b.item], ["Guests", b.pax], ["Travel date", dFull(b.travel)], ["Total", thb(b.amount)], ["Paid", thb(paid)], ["Balance", thb(Math.max(0, b.amount - paid))]].map(([k, v]) => <div key={k}><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</dt><dd className="font-bold text-navy">{v}</dd></div>)}
        </dl>
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</p>
          <div className="flex flex-wrap gap-1.5">{ST.map((s) => <button key={s} onClick={() => { actions.setBookingStatus(b.ref, s); toast(`Marked ${s}`); }} className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 transition ${b.status === s ? "bg-navy text-white ring-navy" : "bg-white text-slate-600 ring-slate-200 hover:text-teal hover:ring-teal"}`}>{s}</button>)}</div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Payments</p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {pays.length ? pays.map((p) => <li key={p.id} className="flex items-center justify-between px-3 py-2 text-xs"><span><b className="text-navy">{p.id}</b> · {p.method}<span className="block text-[10.5px] text-slate-400">{dShort(p.date)}</span></span><span className="flex items-center gap-2 font-extrabold">{thb(p.amount)}<Badge>{p.status}</Badge></span></li>) : <li className="px-3 py-3 text-xs text-slate-400">No payments yet</li>}
          </ul>
          <div className="mt-2 flex gap-2"><Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} className="!w-28" aria-label="Amount" /><Select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Method">{METHODS.map((m) => <option key={m}>{m}</option>)}</Select><Btn v="primary" onClick={record}><LuCreditCard size={13} />Add</Btn></div>
        </div>
        {b.notes && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{b.notes}</p>}
      </div>
    </Modal>
  );
}

export default function Bookings() {
  const { bookings, payments } = useAdmin();
  const [q, setQ] = useState(""); const [st, setSt] = useState("All");
  const [sel, setSel] = useState(null); const [form, setForm] = useState(null);
  const counts = useMemo(() => { const c = { All: bookings.length }; ST.forEach((s) => (c[s] = bookings.filter((b) => b.status === s).length)); return c; }, [bookings]);
  const rows = useMemo(() => bookings.filter((b) => (st === "All" || b.status === st) && (!q || `${b.ref} ${b.customer} ${b.item}`.toLowerCase().includes(q.toLowerCase()))), [bookings, q, st]);
  const live = sel && bookings.find((b) => b.ref === sel);

  const cols = [
    { key: "ref", label: "Ref", render: (b) => <span className="font-extrabold text-navy">{b.ref}</span> },
    { key: "customer", label: "Customer", render: (b) => <span className="flex items-center gap-2"><Avatar name={b.customer} size={22} /><span className="truncate font-semibold">{b.customer}</span></span> },
    { key: "item", label: "Trip", render: (b) => <span className="block max-w-[200px] truncate text-slate-500">{b.item}</span> },
    { key: "travel", label: "Travel", render: (b) => dShort(b.travel) },
    { key: "pax", label: "Pax", align: "right" },
    { key: "amount", label: "Amount", align: "right", render: (b) => <span className="font-extrabold">{thb(b.amount)}</span> },
    { key: "paid", label: "Paid", render: (b) => <Progress value={paidOf(b.ref, payments)} max={b.amount} /> },
    { key: "status", label: "Status", render: (b) => <Badge>{b.status}</Badge> },
  ];
  return (
    <div>
      <PageHead title="Bookings" sub={`${bookings.length} total · manage status, payments and guest details`}>
        <Btn onClick={() => exportCsv("bookings", rows.map(({ notes, ...r }) => r))}><LuDownload size={13} />Export</Btn>
        <Btn v="primary" onClick={() => setForm("new")}><LuPlus size={14} />New booking</Btn>
      </PageHead>
      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
          <Chips options={["All", ...ST]} value={st} onChange={setSt} counts={counts} />
          <SearchBox value={q} onChange={setQ} placeholder="Search ref, customer, trip…" className="w-full sm:w-64" />
        </div>
        <DataTable columns={cols} rows={rows} onRow={(b) => setSel(b.ref)} size={12} empty="No bookings match" />
      </Card>
      {live && !form && <Detail b={live} onClose={() => setSel(null)} onEdit={() => setForm(live)} />}
      {form && <BookingForm initial={form === "new" ? null : form} onClose={() => setForm(null)} />}
    </div>
  );
}
