import { useState } from "react";
import { LuSave, LuLock, LuUsers, LuStore, LuReceipt, LuFileText } from "react-icons/lu";
import { useAdmin, actions, useSession, DEMO_ADMIN } from "../store.js";
import { Card, PageHead, Btn, Field, Input, Textarea, Badge, Avatar, toast } from "../ui.jsx";

export default function Settings() {
  const { settings, password } = useAdmin();
  const session = useSession();
  const [f, setF] = useState(() => ({ siteName: settings.siteName, supportEmail: settings.supportEmail, phone: settings.phone, vat: settings.vat, serviceFee: settings.serviceFee, depositPct: settings.depositPct, cancellation: settings.cancellation }));
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const [pw, setPw] = useState({ cur: "", next: "", again: "" });
  const save = () => { actions.saveSettings({ ...f, vat: +f.vat, serviceFee: +f.serviceFee, depositPct: +f.depositPct }); toast("Settings saved"); };
  const changePw = () => {
    if (pw.cur !== password) return toast("Current password is wrong", "err");
    if (pw.next.length < 8) return toast("Use at least 8 characters", "err");
    if (pw.next !== pw.again) return toast("Passwords don't match", "err");
    actions.setPassword(pw.next); setPw({ cur: "", next: "", again: "" }); toast("Password changed");
  };
  return (
    <div className="space-y-3">
      <PageHead title="Settings" sub="Business details, taxes, policies and access"><Btn v="primary" onClick={save}><LuSave size={14} />Save changes</Btn></PageHead>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Business" action={<LuStore size={15} className="text-slate-400" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Site name"><Input value={f.siteName} onChange={up("siteName")} /></Field>
            <Field label="Support phone"><Input value={f.phone} onChange={up("phone")} /></Field>
            <Field label="Support email" className="sm:col-span-2"><Input type="email" value={f.supportEmail} onChange={up("supportEmail")} /></Field>
          </div>
        </Card>
        <Card title="Taxes & fees" action={<LuReceipt size={15} className="text-slate-400" />}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="VAT (%)"><Input type="number" min="0" step="0.5" value={f.vat} onChange={up("vat")} /></Field>
            <Field label="Service fee (%)"><Input type="number" min="0" step="0.5" value={f.serviceFee} onChange={up("serviceFee")} /></Field>
            <Field label="Deposit (%)" hint="Due at booking"><Input type="number" min="0" max="100" value={f.depositPct} onChange={up("depositPct")} /></Field>
          </div>
        </Card>
        <Card title="Cancellation & refund policy" action={<LuFileText size={15} className="text-slate-400" />}><Textarea rows={4} value={f.cancellation} onChange={up("cancellation")} /></Card>
        <Card title="Change admin password" action={<LuLock size={15} className="text-slate-400" />}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Current"><Input type="password" autoComplete="current-password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} /></Field>
            <Field label="New"><Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <Field label="Repeat"><Input type="password" autoComplete="new-password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} /></Field>
          </div>
          <Btn v="navy" className="mt-3" onClick={changePw}>Update password</Btn>
        </Card>
      </div>
      <Card title="Team & roles" sub="Demo list – real invitations and permissions need a backend" action={<LuUsers size={15} className="text-slate-400" />} pad={false}>
        <ul className="divide-y divide-slate-100">
          {settings.team.map((m) => (
            <li key={m.email} className="flex items-center gap-3 px-4 py-2.5"><Avatar name={m.name} size={30} /><div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-navy">{m.name}{m.email === session?.email && <span className="ml-1.5 text-[10px] font-bold text-teal">(you)</span>}</p><p className="truncate text-[11px] text-slate-400">{m.email}</p></div><Badge tone={m.role === "Super admin" ? "teal" : m.role === "Manager" ? "blue" : "slate"}>{m.role}</Badge></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
