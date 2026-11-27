import { useMemo, useState } from "react";
import { LuPlus, LuDownload, LuCheck, LuUndo2, LuX, LuTrash2, LuWallet, LuClock, LuCircleCheck, LuBan } from "react-icons/lu";
import { useAdmin, actions, thb, dShort, newId, METHODS } from "../store.js";
import { Card, PageHead, Btn, Badge, DataTable, SearchBox, Chips, Modal, Field, Input, Select, Toggle, Stat, IconBtn, ask, toast, exportCsv } from "../ui.jsx";

const ST = ["Paid", "Pending", "Failed", "Refunded"];

function PayForm({ onClose }) {
  const { bookings } = useAdmin();
  const [f, setF] = useState({ booking: bookings[0]?.ref, method: "Visa", amount: "", status: "Paid", note: "" });
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = () => {
    const b = bookings.find((x) => x.ref === f.booking);
    if (!b || !(+f.amount > 0)) return toast("Choose a booking and amount", "err");
    actions.savePayment({ id: newId("PAY"), booking: b.ref, customer: b.customer, method: f.method, amount: +f.amount, status: f.status, date: new Date().toISOString(), note: f.note });
    toast("Payment recorded"); onClose();
  };
  return (
    <Modal title="Record payment" sub="Manual entry – bank transfer, cash, or a gateway payment" onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn v="primary" onClick={save}>Save payment</Btn></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Booking" className="sm:col-span-2"><Select value={f.booking} onChange={up("booking")}>{bookings.map((b) => <option key={b.ref} value={b.ref}>{b.ref} · {b.customer} · {thb(b.amount)}</option>)}</Select></Field>
        <Field label="Method"><Select value={f.method} onChange={up("method")}>{METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Status"><Select value={f.status} onChange={up("status")}>{ST.map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Amount (฿)"><Input type="number" min="0" value={f.amount} onChange={up("amount")} /></Field>
        <Field label="Reference / note"><Input value={f.note} onChange={up("note")} placeholder="Txn id, slip no…" /></Field>
      </div>
    </Modal>
  );
}

export default function Payments() {
  const { payments, settings } = useAdmin();
  const [q, setQ] = useState(""); const [st, setSt] = useState("All"); const [mt, setMt] = useState("All");
  const [form, setForm] = useState(false);
  const sum = (s) => payments.filter((p) => p.status === s).reduce((a, p) => a + p.amount, 0);
  const counts = useMemo(() => { const c = { All: payments.length }; ST.forEach((s) => (c[s] = payments.filter((p) => p.status === s).length)); return c; }, [payments]);
  const rows = useMemo(() => payments.filter((p) => (st === "All" || p.status === st) && (mt === "All" || p.method === mt) && (!q || `${p.id} ${p.booking} ${p.customer}`.toLowerCase().includes(q.toLowerCase()))), [payments, q, st, mt]);

  const refund = async (p) => { if (await ask(`Refund ${thb(p.amount)} to ${p.customer}?`, "Refund")) { actions.setPaymentStatus(p.id, "Refunded"); toast("Marked as refunded"); } };
  const del = async (p) => { if (await ask(`Delete payment ${p.id}?`)) { actions.deletePayment(p.id); toast("Payment deleted"); } };
  const setPM = (m, patch) => actions.saveSettings({ payMethods: { ...settings.payMethods, [m]: { ...settings.payMethods[m], ...patch } } });

  const cols = [
    { key: "id", label: "Payment", render: (p) => <span className="font-extrabold text-navy">{p.id}</span> },
    { key: "booking", label: "Booking", render: (p) => <span className="font-semibold text-teal">{p.booking}</span> },
    { key: "customer", label: "Customer", render: (p) => <span className="font-semibold">{p.customer}</span> },
    { key: "method", label: "Method", render: (p) => <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">{p.method}</span> },
    { key: "date", label: "Date", render: (p) => dShort(p.date) },
    { key: "amount", label: "Amount", align: "right", render: (p) => <span className="font-extrabold">{thb(p.amount)}</span> },
    { key: "status", label: "Status", render: (p) => <Badge>{p.status}</Badge> },
    { key: "act", label: "", align: "right", render: (p) => (
      <span className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
        {(p.status === "Pending" || p.status === "Failed") && <IconBtn title="Mark as paid" onClick={() => { actions.setPaymentStatus(p.id, "Paid"); toast("Marked as paid"); }}><LuCheck size={15} /></IconBtn>}
        {p.status === "Pending" && <IconBtn title="Mark as failed" onClick={() => actions.setPaymentStatus(p.id, "Failed")}><LuX size={15} /></IconBtn>}
        {p.status === "Paid" && <IconBtn title="Refund" onClick={() => refund(p)}><LuUndo2 size={15} /></IconBtn>}
        <IconBtn title="Delete" onClick={() => del(p)} className="hover:!text-rose-600"><LuTrash2 size={14} /></IconBtn>
      </span>) },
  ];
  return (
    <div className="space-y-3">
      <PageHead title="Payments" sub="Collect, track, refund and configure how customers pay">
        <Btn onClick={() => exportCsv("payments", rows)}><LuDownload size={13} />Export</Btn>
        <Btn v="primary" onClick={() => setForm(true)}><LuPlus size={14} />Record payment</Btn>
      </PageHead>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={LuCircleCheck} label="Collected" value={thb(sum("Paid"))} sub={`${counts.Paid} payments`} />
        <Stat icon={LuClock} label="Pending" value={thb(sum("Pending"))} tone="sun" sub={`${counts.Pending} awaiting`} />
        <Stat icon={LuUndo2} label="Refunded" value={thb(sum("Refunded"))} tone="violet" sub={`${counts.Refunded} refunds`} />
        <Stat icon={LuBan} label="Failed" value={thb(sum("Failed"))} tone="rose" sub={`${counts.Failed} failed`} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_300px]">
        <Card pad={false}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
            <Chips options={["All", ...ST]} value={st} onChange={setSt} counts={counts} />
            <div className="flex w-full gap-2 sm:w-auto">
              <Select value={mt} onChange={(e) => setMt(e.target.value)} className="!w-36 !py-1.5 !text-xs" aria-label="Method"><option>All</option>{METHODS.map((m) => <option key={m}>{m}</option>)}</Select>
              <SearchBox value={q} onChange={setQ} placeholder="Search id, booking…" className="flex-1 sm:w-48" />
            </div>
          </div>
          <DataTable columns={cols} rows={rows} size={12} empty="No payments match" />
        </Card>
        <Card title="Payment methods" sub="Shown to customers at checkout" action={<LuWallet size={15} className="text-slate-400" />} pad={false} className="h-fit">
          <ul className="divide-y divide-slate-100">
            {METHODS.map((m) => { const c = settings.payMethods[m]; return (
              <li key={m} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-navy">{m}</p><p className="text-[10.5px] text-slate-400">{c.enabled ? "Active" : "Disabled"}</p></div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-400">Fee<Input type="number" step="0.1" min="0" value={c.fee} onChange={(e) => setPM(m, { fee: +e.target.value })} className="!w-14 !px-1.5 !py-1 text-center !text-xs" aria-label={`${m} fee %`} />%</label>
                <Toggle on={c.enabled} onChange={(v) => setPM(m, { enabled: v })} label={`${m} enabled`} />
              </li>); })}
          </ul>
          <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] leading-relaxed text-slate-400">Gateway fees are recorded for your reporting. Connecting a live gateway (Stripe, Omise, 2C2P…) needs a backend.</p>
        </Card>
      </div>
      {form && <PayForm onClose={() => setForm(false)} />}
    </div>
  );
}
