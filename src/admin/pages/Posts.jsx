import { useMemo, useState } from "react";
import { LuPlus, LuPencil, LuTrash2, LuEye, LuCalendar } from "react-icons/lu";
import { useAdmin, actions, newId, dFull } from "../store.js";
import { Card, PageHead, Btn, Badge, Chips, SearchBox, Modal, Field, Input, Select, Textarea, IconBtn, ask, toast } from "../ui.jsx";

function PostForm({ p, onClose }) {
  const isNew = !p;
  const [f, setF] = useState(p || { id: newId("P"), title: "", type: "Blog", status: "Draft", author: "Aarav Admin", date: new Date().toISOString().slice(0, 10), body: "", views: 0 });
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = (status) => { if (!f.title.trim()) return toast("Add a title", "err"); actions.savePost({ ...f, status: status || f.status }); toast(status === "Published" ? "Post published" : "Post saved"); onClose(); };
  return (
    <Modal wide title={isNew ? "New post" : "Edit post"} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn onClick={() => save("Draft")}>Save draft</Btn><Btn v="primary" onClick={() => save("Published")}>Publish</Btn></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Title" className="sm:col-span-3"><Input value={f.title} onChange={up("title")} placeholder="e.g. 5 hidden beaches near Krabi" /></Field>
        <Field label="Type"><Select value={f.type} onChange={up("type")}><option>Blog</option><option>Offer</option><option>Announcement</option></Select></Field>
        <Field label="Date"><Input type="date" value={f.date} onChange={up("date")} /></Field>
        <Field label="Status"><Select value={f.status} onChange={up("status")}><option>Draft</option><option>Published</option></Select></Field>
        <Field label="Content" className="sm:col-span-3"><Textarea rows={8} value={f.body} onChange={up("body")} placeholder="Write the post…" /></Field>
      </div>
    </Modal>
  );
}

export default function Posts() {
  const { posts } = useAdmin();
  const [q, setQ] = useState(""); const [st, setSt] = useState("All"); const [edit, setEdit] = useState(null);
  const counts = { All: posts.length, Published: posts.filter((p) => p.status === "Published").length, Draft: posts.filter((p) => p.status === "Draft").length };
  const rows = useMemo(() => posts.filter((p) => (st === "All" || p.status === st) && (!q || p.title.toLowerCase().includes(q.toLowerCase()))), [posts, st, q]);
  const del = async (p) => { if (await ask(`Delete "${p.title}"?`)) { actions.deletePost(p.id); toast("Post deleted"); } };
  return (
    <div>
      <PageHead title="Posts" sub="Blog articles, offers and announcements"><Btn v="primary" onClick={() => setEdit("new")}><LuPlus size={14} />New post</Btn></PageHead>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><Chips options={["All", "Published", "Draft"]} value={st} onChange={setSt} counts={counts} /><SearchBox value={q} onChange={setQ} placeholder="Search posts…" className="w-full sm:w-60" /></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => (
          <Card key={p.id} className="group flex flex-col transition hover:border-teal/40 hover:shadow-md">
            <div className="flex items-center justify-between"><Badge>{p.type}</Badge><Badge>{p.status}</Badge></div>
            <h3 className="mt-2.5 line-clamp-2 min-h-[2.5rem] text-sm font-extrabold leading-snug text-navy">{p.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.body}</p>
            <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-3"><span className="flex items-center gap-1"><LuCalendar size={12} />{dFull(p.date)}</span><span className="flex items-center gap-1"><LuEye size={12} />{p.views.toLocaleString("en-US")}</span></span>
              <span className="flex"><IconBtn onClick={() => setEdit(p)} aria-label="Edit"><LuPencil size={14} /></IconBtn><IconBtn onClick={() => del(p)} aria-label="Delete" className="hover:!text-rose-600"><LuTrash2 size={14} /></IconBtn></span>
            </div>
          </Card>
        ))}
      </div>
      {!rows.length && <Card><p className="py-8 text-center text-xs font-semibold text-slate-400">No posts found</p></Card>}
      <p className="mt-3 text-[11px] text-slate-400">Posts are saved in the admin only for now – a public blog / news page can be connected once a backend is added.</p>
      {edit && <PostForm p={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
