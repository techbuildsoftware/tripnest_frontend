import { useState } from "react";
import { LuPlus, LuPencil, LuTrash2, LuPercent, LuGlobe, LuRefreshCw } from "react-icons/lu";
import { useAdmin, actions, thb } from "../store.js";
import { Card, PageHead, Btn, Badge, DataTable, Chips, Modal, Field, Input, Select, Toggle, IconBtn, ask, toast } from "../ui.jsx";

function PackageForm({ p, onClose }) {
  const [f, setF] = useState(p);
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const off = +f.was > +f.price ? Math.round((1 - f.price / f.was) * 100) : 0;
  const save = () => { if (!f.title.trim() || !(+f.price > 0)) return toast("Title and price are required", "err"); actions.savePackage({ ...f, price: +f.price, was: +f.was || +f.price }); toast("Package updated · live on site after reload"); onClose(); };
  return (
    <Modal title="Edit package" onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn v="primary" onClick={save}>Save changes</Btn></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2"><Input value={f.title} onChange={up("title")} /></Field>
        <Field label="Selling price (฿ / person)"><Input type="number" min="0" value={f.price} onChange={up("price")} /></Field>
        <Field label="Original price (฿)" hint="Shown struck-through"><Input type="number" min="0" value={f.was} onChange={up("was")} /></Field>
        <Field label="Discount"><div className="rounded-lg bg-teal/10 px-3 py-2 text-[13px] font-extrabold text-teal">{off}% off</div></Field>
        <Field label="Status"><Select value={f.status} onChange={up("status")}><option value="active">Active – visible on site</option><option value="inactive">Inactive – hidden</option></Select></Field>
      </div>
    </Modal>
  );
}

function Packages() {
  const { packages } = useAdmin();
  const [edit, setEdit] = useState(null);
  const [pct, setPct] = useState("");
  const adjust = async () => { const n = +pct; if (!n) return; if (await ask(`Change ALL package prices by ${n > 0 ? "+" : ""}${n}%?`, "Apply")) { actions.bulkPriceAdjust(n); setPct(""); toast("Prices updated"); } };
  const cols = [
    { key: "title", label: "Package", render: (p) => <span className="block max-w-[300px] truncate font-bold text-navy">{p.title}</span> },
    { key: "dest", label: "Destination", render: (p) => <span className="capitalize text-slate-500">{p.dest}</span> },
    { key: "was", label: "Original", align: "right", render: (p) => <span className="text-slate-400 line-through">{thb(p.was)}</span> },
    { key: "price", label: "Price", align: "right", render: (p) => <span className="font-extrabold text-teal">{thb(p.price)}</span> },
    { key: "off", label: "Off", align: "right", render: (p) => <Badge tone="amber">{p.off}%</Badge> },
    { key: "sold", label: "Sold", align: "right" },
    { key: "status", label: "Visible", render: (p) => <Toggle on={p.status === "active"} onChange={(v) => actions.savePackage({ ...p, status: v ? "active" : "inactive" })} label="Visible" /> },
    { key: "act", label: "", align: "right", render: (p) => <IconBtn onClick={() => setEdit(p)} aria-label="Edit"><LuPencil size={14} /></IconBtn> },
  ];
  return (
    <Card pad={false}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <p className="text-xs font-semibold text-slate-500">{packages.length} packages · click the pencil to edit</p>
        <div className="flex items-center gap-1.5"><LuPercent size={14} className="text-slate-400" /><Input type="number" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="±% all prices" className="!w-32 !py-1.5 !text-xs" aria-label="Bulk adjust percent" /><Btn v="navy" sm onClick={adjust}>Apply</Btn></div>
      </div>
      <DataTable columns={cols} rows={packages} size={10} />
      {edit && <PackageForm p={edit} onClose={() => setEdit(null)} />}
    </Card>
  );
}

function Services() {
  const { services } = useAdmin();
  const cols = [
    { key: "title", label: "Service", render: (s) => <span className="font-bold text-navy">{s.title}</span> },
    { key: "cat", label: "Category", render: (s) => <Badge tone="slate">{s.cat}</Badge> },
    { key: "from", label: "From price (฿)", align: "right", render: (s) => <Input key={s.from} type="number" min="0" defaultValue={s.from} onBlur={(e) => { const v = +e.target.value; if (v > 0 && v !== s.from) { actions.saveService({ ...s, from: v }); toast("Price saved"); } }} className="!ml-auto !w-28 !py-1 text-right !text-xs" aria-label={`${s.title} price`} /> },
    { key: "status", label: "Visible", render: (s) => <Toggle on={s.status === "active"} onChange={(v) => actions.saveService({ ...s, status: v ? "active" : "inactive" })} label="Visible" /> },
  ];
  return <Card pad={false}><p className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500">Edit a price and click outside the box to save.</p><DataTable columns={cols} rows={services} size={12} /></Card>;
}

function CouponForm({ c, onClose }) {
  const isNew = !c;
  const [f, setF] = useState(c || { code: "", label: "", type: "percent", value: 10, limit: 100, uses: 0, expires: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), active: true });
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = () => { const code = f.code.trim().toUpperCase(); if (!code || !(+f.value > 0)) return toast("Code and value required", "err"); actions.saveCoupon({ ...f, code, value: +f.value, limit: +f.limit }); toast("Coupon saved"); onClose(); };
  return (
    <Modal title={isNew ? "New coupon" : `Edit ${f.code}`} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn v="primary" onClick={save}>Save coupon</Btn></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Code"><Input value={f.code} onChange={up("code")} disabled={!isNew} placeholder="SUMMER20" className="uppercase" /></Field>
        <Field label="Description"><Input value={f.label} onChange={up("label")} placeholder="Summer sale" /></Field>
        <Field label="Discount type"><Select value={f.type} onChange={up("type")}><option value="percent">Percent (%)</option><option value="flat">Flat amount (฿)</option></Select></Field>
        <Field label="Value"><Input type="number" min="0" value={f.value} onChange={up("value")} /></Field>
        <Field label="Usage limit"><Input type="number" min="0" value={f.limit} onChange={up("limit")} /></Field>
        <Field label="Expires"><Input type="date" value={f.expires} onChange={up("expires")} /></Field>
      </div>
    </Modal>
  );
}

function Coupons() {
  const { coupons } = useAdmin();
  const [edit, setEdit] = useState(null);
  const del = async (c) => { if (await ask(`Delete coupon ${c.code}?`)) { actions.deleteCoupon(c.code); toast("Coupon deleted"); } };
  const cols = [
    { key: "code", label: "Code", render: (c) => <span className="rounded border border-dashed border-teal/50 bg-teal/5 px-2 py-0.5 font-extrabold tracking-wider text-teal">{c.code}</span> },
    { key: "label", label: "Description", render: (c) => <span className="text-slate-500">{c.label}</span> },
    { key: "value", label: "Discount", render: (c) => <span className="font-extrabold">{c.type === "percent" ? `${c.value}%` : thb(c.value)}</span> },
    { key: "uses", label: "Used", render: (c) => <span className="font-semibold">{c.uses}<span className="text-slate-400"> / {c.limit}</span></span> },
    { key: "expires", label: "Expires", render: (c) => <span className={new Date(c.expires) < new Date() ? "font-bold text-rose-600" : ""}>{c.expires}</span> },
    { key: "active", label: "Active", render: (c) => <Toggle on={c.active} onChange={(v) => actions.saveCoupon({ ...c, active: v })} label="Active" /> },
    { key: "act", label: "", align: "right", render: (c) => <span className="flex justify-end"><IconBtn onClick={() => setEdit(c)} aria-label="Edit"><LuPencil size={14} /></IconBtn><IconBtn onClick={() => del(c)} aria-label="Delete" className="hover:!text-rose-600"><LuTrash2 size={14} /></IconBtn></span> },
  ];
  return (
    <Card pad={false}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5"><p className="text-xs font-semibold text-slate-500">{coupons.filter((c) => c.active).length} active codes</p><Btn v="primary" sm onClick={() => setEdit("new")}><LuPlus size={13} />New coupon</Btn></div>
      <DataTable columns={cols} rows={coupons} size={10} />
      {edit && <CouponForm c={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </Card>
  );
}

export default function Pricing() {
  const [tab, setTab] = useState("Packages");
  const reset = async () => { if (await ask("Reset ALL demo data (bookings, payments, prices, posts…) to defaults?", "Reset")) { actions.resetDemo(); toast("Demo data reset"); } };
  return (
    <div className="space-y-3">
      <PageHead title="Pricing & offers" sub="Edit prices, visibility and discount codes">
        <span className="flex items-center gap-1.5 rounded-lg bg-teal/10 px-2.5 py-1.5 text-[11px] font-bold text-teal"><LuGlobe size={13} />Price changes go live on the website after a page reload</span>
        <Btn sm onClick={reset}><LuRefreshCw size={12} />Reset demo data</Btn>
      </PageHead>
      <Chips options={["Packages", "Services", "Coupons"]} value={tab} onChange={setTab} />
      {tab === "Packages" ? <Packages /> : tab === "Services" ? <Services /> : <Coupons />}
    </div>
  );
}
