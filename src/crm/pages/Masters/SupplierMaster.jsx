import React, { useMemo, useState } from "react"; 
import {
  ArrowLeft,
  Edit,
  Eye,
  ExternalLink,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  Unlink,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SearchableSelect from "../../components/ui/SearchableSelect";
import StatusBadge from "../../components/ui/StatusBadge";
import useFinanceMaster from "../../hooks/useFinanceMaster";
import useOperationsMaster from "../../hooks/useOperationsMaster";
import { supplierTypes } from "../../lib/supplierOptions";
import { apiClient } from "../../lib/api";

const types = [
  "Hotel",
  "Transfer",
  "Activity",
  "Vehicle",
  "Yacht",
  "Guide",
  "Restaurant",
  "Visa",
  "Insurance",
  "Other",
];
const bankFields = [
  ["accountName", "Account Name"],
  ["accountNumber", "Account Number"],
  ["bankName", "Bank Name"],
  ["branch", "Branch"],
  ["ifscCode", "IFSC Code"],
  ["swiftCode", "SWIFT Code"],
];
const empty = {
  name: "",
  type: ["Hotel"],
  contactPerson: "",
  email: "",
  ccEmails: "",
  phone: "",
  country: "Thailand",
  destination: "",
  currency: "THB",
  paymentTerms: "",
  creditLimit: 0,
  status: "Active",
  notes: "",
  supplierOwn: false,
  bankDetails: Object.fromEntries(bankFields.map(([key]) => [key, ""])),
};

function SupplierCard({
  supplier,
  openMenuId,
  setOpenMenuId,
  onView,
  onEdit,
  onDelete,
}) {
  const typeList = supplierTypes(supplier);
  return (
    <div
      onClick={() => onView(supplier)}
      className={`cursor-pointer rounded-xl border border-slate-300 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${openMenuId === supplier.id ? "relative z-20" : "overflow-visible"}`}
    >
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-orange-100 bg-orange-50 text-xs font-bold text-orange-600">
              {supplier.image?.url ? <img src={supplier.image.url} alt="" className="h-full w-full object-cover" /> : (supplier.name?.charAt(0).toUpperCase() || "S")}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-900">
                {supplier.name}
              </p>
              <p className="mt-0.5 flex truncate text-[11px] text-slate-500">
                <MapPin className="mr-1 h-3 w-3 shrink-0" />
                {supplier.destination || supplier.country || "Location not set"}
              </p>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpenMenuId(openMenuId === supplier.id ? null : supplier.id);
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {openMenuId === supplier.id && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onView(supplier);
                    setOpenMenuId(null);
                  }}
                  className="menu-action"
                >
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(supplier);
                    setOpenMenuId(null);
                  }}
                  className="menu-action"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(supplier);
                    setOpenMenuId(null);
                  }}
                  className="menu-action text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <p className="flex items-center gap-2 truncate text-slate-600">
            <Mail className="h-3 w-3 text-slate-400" />
            {supplier.email || "No email"}
          </p>
          <p className="flex items-center gap-2 truncate text-slate-600">
            <Phone className="h-3 w-3 text-slate-400" />
            {supplier.phone || "No phone"}
          </p>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
          <StatusBadge status={supplier.status} size="xs" />
          {typeList.map((type) => (
            <span
              key={type}
              className="badge badge-gray !px-1.5 !py-0.5 !text-[10px]"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SupplierMaster() {
  const navigate = useNavigate();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useApp();
  const currencies = useFinanceMaster("currencies");
  const destinations = useOperationsMaster("destinations");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("supplier-view") || "cards",
  );
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [supplierDetails, setSupplierDetails] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [unlinkingUsage, setUnlinkingUsage] = useState("");
  const [attachments, setAttachments] = useState({ image: null });
  const filtered = useMemo(
    () =>
      suppliers.filter((supplier) =>
        `${supplier.name} ${supplierTypes(supplier).join(" ")} ${supplier.destination} ${supplier.contactPerson}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [suppliers, search],
  );
  const sameNameSupplier = useMemo(() => {
    const name = form.name.trim().toLocaleLowerCase();
    if (!name) return null;
    return suppliers.find((supplier) => supplier.id !== editing?.id && String(supplier.name || "").trim().toLocaleLowerCase() === name) || null;
  }, [suppliers, form.name, editing?.id]);
  const nameSuggestions = useMemo(() => {
    const query = form.name.trim().toLocaleLowerCase();
    if (!query) return [];
    return suppliers
      .filter((supplier) => supplier.id !== editing?.id)
      .filter((supplier) => String(supplier.name || "").toLocaleLowerCase().includes(query))
      .sort((left, right) => {
        const leftName = String(left.name || "").toLocaleLowerCase();
        const rightName = String(right.name || "").toLocaleLowerCase();
        const leftRank = leftName.startsWith(query) ? 0 : 1;
        const rightRank = rightName.startsWith(query) ? 0 : 1;
        return leftRank - rightRank || leftName.localeCompare(rightName);
      })
      .slice(0, 8);
  }, [suppliers, form.name, editing?.id]);
  const open = (supplier = null) => {
    setShowNameSuggestions(false);
    setEditing(supplier || {});
    setForm(
      supplier
        ? {
            ...empty,
            ...supplier,
            type: supplierTypes(supplier),
            ccEmails: Array.isArray(supplier.ccEmails)
              ? supplier.ccEmails.join(", ")
              : supplier.ccEmails || "",
            bankDetails: {
              ...empty.bankDetails,
              ...(supplier.bankDetails || {}),
            },
          }
        : empty,
    );
    setAttachments({ image: null });
  };
  const set = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const setBank = (field, value) =>
    setForm((current) => ({
      ...current,
      bankDetails: {
        ...empty.bankDetails,
        ...current.bankDetails,
        [field]: value,
      },
    }));
  const save = async () => {
    if (!form.name.trim() || !form.type?.length)
      return toast.error("Supplier name and at least one type are required.");
    if (sameNameSupplier)
      return toast.error(`Supplier "${sameNameSupplier.name}" already exists. Open the existing supplier instead.`);
    setSaving(true);
    try {
      const files = new FormData();
      if (attachments.image) files.append('supplierImage', attachments.image);
      const image = attachments.image
        ? (await apiClient.upload('/uploads?folder=suppliers', files)).data.find((file) => file.field === 'supplierImage')
        : form.image;
      if (attachments.image && !image) throw new Error('The supplier image upload did not return a file.');
      const uploaded = image ? { image } : {};
      const ccEmails = String(form.ccEmails || "")
        .split(/[;,\n]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
      const invalidCc = ccEmails.find((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      if (invalidCc) throw new Error(`\"${invalidCc}\" is not a valid additional contact email.`);
      const payload = { ...form, ccEmails: [...new Set(ccEmails)], ...uploaded };

      if (editing?.id) await updateSupplier(editing.id, payload);
      else await addSupplier(payload);
      toast.success(editing?.id ? "Supplier updated." : "Supplier added.");
      setEditing(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    try {
      await deleteSupplier(deleting.id);
      setDeleting(null);
      toast.success("Supplier deleted.");
    } catch (error) {
      toast.error(error.message);
    }
  };
  const showDetails = async (supplier) => {
    setSupplierDetails({ supplier, usages: [] });
    setUsageLoading(true);
    try {
      const response = await apiClient.get(
        `/suppliers/${encodeURIComponent(supplier.id)}/usages`,
      );
      setSupplierDetails(response.data);
    } catch (error) {
      toast.error(error.message);
      setSupplierDetails(null);
    } finally {
      setUsageLoading(false);
    }
  };
  const removeUsage = async (entry) => {
    if (!supplierDetails?.supplier || !entry.action?.type) return;
    setUnlinkingUsage(`${entry.kind}:${entry.id}`);
    try {
      await apiClient.delete(
        `/suppliers/${encodeURIComponent(supplierDetails.supplier.id)}/usages/${entry.action.type}/${encodeURIComponent(entry.id)}`,
      );
      const response = await apiClient.get(
        `/suppliers/${encodeURIComponent(supplierDetails.supplier.id)}/usages`,
      );
      setSupplierDetails(response.data);
      toast.success("Supplier link removed.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUnlinkingUsage("");
    }
  };
  const changeView = (value) => {
    setViewMode(value);
    localStorage.setItem("supplier-view", value);
  };
  const input = (field, label, props = {}) => (
    <label>
      <span className="form-label mb-0.5 text-[10px]">{label}</span>
      <input
        value={form[field] || ""}
        onChange={(event) =>
          set(
            field,
            props.number ? Number(event.target.value) : event.target.value,
          )
        }
        className="form-input h-7 px-2 py-1 text-xs"
        {...props}
      />
    </label>
  );
  return (
    <div className="mx-auto max-w-[1800px] space-y-5 p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/masters")}
            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900">
              Supplier Master
            </h1>
            <p className="text-[10px] text-slate-500">
              {suppliers.length} suppliers · hotel, transfer and activity
              services
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search supplier, type or destination..."
              className="h-8 w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs"
            />
          </div>
          <div className="flex h-8 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => changeView("cards")}
              className={`rounded-md px-2 ${viewMode === "cards" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => changeView("rows")}
              className={`rounded-md px-2 ${viewMode === "rows" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => open()}
            className="btn-primary h-8 px-3 text-xs"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Supplier
          </button>
        </div>
      </div>
      {filtered.length ? (
        <>
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onView={showDetails}
                  onEdit={open}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          )}
          {viewMode === "rows" && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-slate-900 text-xs uppercase text-white">
                    <tr>
                      {[
                        "Supplier",
                        "Type",
                        "Contact",
                        "Destination",
                        "Status",
                        "Actions",
                      ].map((header) => (
                        <th
                          key={header}
                          className={`px-4 py-3 ${header === "Actions" ? "text-right" : "text-left"}`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filtered.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {supplier.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {supplierTypes(supplier).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {supplier.contactPerson ||
                            supplier.email ||
                            supplier.phone ||
                            "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {supplier.destination || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={supplier.status} size="xs" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => showDetails(supplier)}
                              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => open(supplier)}
                              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(supplier)}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card py-16 text-center">
          <Truck className="mx-auto mb-3 h-9 w-9 text-slate-300" />
          <p className="text-sm text-slate-500">No suppliers found.</p>
        </div>
      )}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit Supplier" : "Add Supplier"}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="btn-secondary py-1 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary py-1 text-sm"
            >
              {saving ? "Saving…" : "Save Supplier"}
            </button>
          </>
        }
      >
        <div className="-mx-6 -my-4 space-y-3 bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-300 bg-white p-3 sm:grid-cols-2 md:grid-cols-4">
            <label className="relative">
              <span className="form-label mb-0.5 text-[10px]">Supplier name *</span>
              <input
                value={form.name || ""}
                onChange={(event) => set("name", event.target.value)}
                onFocus={() => setShowNameSuggestions(true)}
                onBlur={() => setShowNameSuggestions(false)}
                className="form-input h-7 px-2 py-1 text-xs"
                placeholder="Type to search existing suppliers"
                autoComplete="off"
              />
              {showNameSuggestions && nameSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Existing suppliers
                  </div>
                  {nameSuggestions.map((supplier) => (
                    <button
                      key={supplier.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => open(supplier)}
                      className="flex w-full flex-col px-2.5 py-2 text-left text-xs hover:bg-blue-50"
                    >
                      <span className="font-semibold text-slate-800">{supplier.name}</span>
                      <span className="mt-0.5 text-[10px] text-slate-500">
                        {[supplierTypes(supplier).join(", "), supplier.destination].filter(Boolean).join(" · ") || "Supplier master"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </label>
            <label>
              <span className="form-label mb-0.5 text-[10px]">
                Supplier types *
              </span>
              <SearchableSelect
                compact
                isMulti
                value={form.type}
                onChange={(value) => set("type", value)}
                options={types}
              />
            </label>
            {input("contactPerson", "Contact person")}
            {input("phone", "Phone")}
            {input("email", "Email", { type: "email" })}
            {input("ccEmails", "Additional contact emails (CC)", {
              placeholder: "accounts@example.com, manager@example.com",
            })}
            <label>
              <span className="form-label mb-0.5 text-[10px]">Country</span>
              <SearchableSelect
                compact
                value={form.country || "Thailand"}
                onChange={(value) => set("country", value)}
                options={["Thailand"]}
              />
            </label>
            <label>
              <span className="form-label mb-0.5 text-[10px]">Destination</span>
              <SearchableSelect
                compact
                value={form.destination}
                onChange={(value) => set("destination", value)}
                options={destinations}
              />
            </label>
            <label>
              <span className="form-label mb-0.5 text-[10px]">Currency</span>
              <SearchableSelect
                compact
                value={form.currency}
                onChange={(value) => set("currency", value)}
                options={currencies.map((item) => item.name)}
              />
            </label>
            {input("paymentTerms", "Payment terms")}
            {input("creditLimit", "Credit limit", {
              type: "number",
              min: 0,
              number: true,
            })}
            <label>
              <span className="form-label mb-0.5 text-[10px]">Status</span>
              <SearchableSelect
                compact
                value={form.status}
                onChange={(value) => set("status", value)}
                options={["Active", "Inactive"]}
              />
            </label>
            <label className="mt-[18px] flex h-7 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
              <input
                type="checkbox"
                checked={Boolean(form.supplierOwn)}
                onChange={(event) => set("supplierOwn", event.target.checked)}
              />
              <span className="text-[11px] font-medium text-slate-700">
                Supplier Own
              </span>
            </label>
            <div className="flex flex-col gap-1">
              <span className="form-label mb-0 text-[10px]">Supplier Image</span>
              {(() => {
                const existingUrl = typeof form.image === 'string' ? form.image : form.image?.url;
                return existingUrl && !attachments.image && (
                  <div className="flex items-center gap-2 mb-0.5">
                    <img src={existingUrl} alt="Current supplier" className="h-6 w-6 rounded border border-slate-200 object-cover" />
                    <a href={existingUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline truncate">View current image</a>
                  </div>
                )
              })()}
              <input
                className={`form-input p-0.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold cursor-pointer transition-colors ${attachments.image || form.image ? 'file:bg-green-100 file:text-green-700 hover:file:bg-green-200 bg-green-50/50 border-green-200' : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}`}
                type="file"
                accept="image/*"
                onChange={e => setAttachments(v => ({ ...v, image: e.target.files?.[0] || null }))}
              />
            </div>
            <label className="sm:col-span-2 md:col-span-4">
              <span className="form-label mb-0.5 text-[10px]">Notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => set("notes", event.target.value)}
                className="form-input min-h-[30px] py-1 text-xs"
                rows="1"
              />
            </label>
          </div>
           {sameNameSupplier && (
             <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
               <span><strong>{sameNameSupplier.name}</strong> already exists. Use the existing supplier instead of creating a duplicate.</span>
               <button type="button" onClick={() => open(sameNameSupplier)} className="shrink-0 font-semibold text-amber-800 underline">Open existing</button>
             </div>
           )}
          {form.supplierOwn && (
            <div className="rounded-xl border border-slate-300 bg-white p-3">
              <h3 className="mb-2 border-b border-slate-100 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-700">
                Supplier bank details
              </h3>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {bankFields.map(([key, label]) => (
                  <label key={key}>
                    <span className="form-label mb-0.5 text-[10px]">
                      {label}
                    </span>
                    <input
                      value={form.bankDetails?.[key] || ""}
                      onChange={(event) => setBank(key, event.target.value)}
                      className="form-input h-7 px-2 py-1 text-xs"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
      <Modal
        isOpen={!!supplierDetails}
        onClose={() => setSupplierDetails(null)}
        title="Supplier details and usage"
        size="lg"
        footer={
          <button
            type="button"
            onClick={() => setSupplierDetails(null)}
            className="btn-secondary py-1 text-sm"
          >
            Close
          </button>
        }
      >
        {supplierDetails && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Supplier
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {supplierDetails.supplier.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {supplierTypes(supplierDetails.supplier).join(", ") ||
                    "No type set"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Contact
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {supplierDetails.supplier.contactPerson || "Not provided"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {supplierDetails.supplier.email ||
                    supplierDetails.supplier.phone ||
                    "No contact details"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Location and currency
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {supplierDetails.supplier.destination ||
                    supplierDetails.supplier.country ||
                    "Not provided"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {supplierDetails.supplier.currency || "THB"}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Bank account details
              </p>
              <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                {bankFields.map(([key, label]) => (
                  <div key={key}>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 break-words text-slate-700">
                      {supplierDetails.supplier.bankDetails?.[key] ||
                        "Not provided"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Where this supplier is used
                  </p>
                  <p className="text-xs text-slate-500">
                    Remove direct master links here. Rate contracts must be
                    reassigned from their price screen.
                  </p>
                </div>
                {usageLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
              </div>
              {usageLoading ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  Loading usage…
                </div>
              ) : (
                <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {supplierDetails.usages?.map((entry) => (
                    <div
                      key={`${entry.kind}-${entry.id}`}
                      className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {entry.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.kind.replaceAll("-", " ")} · {entry.details}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {entry.action?.href && (
                          <button
                            type="button"
                            onClick={() => {
                              setSupplierDetails(null);
                              navigate(entry.action.href);
                            }}
                            className="btn-secondary flex items-center gap-1 py-1 text-xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />{" "}
                            {entry.action.label}
                          </button>
                        )}
                        {entry.action?.type && (
                          <button
                            type="button"
                            disabled={
                              unlinkingUsage === `${entry.kind}:${entry.id}`
                            }
                            onClick={() => removeUsage(entry)}
                            className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            <Unlink className="h-3.5 w-3.5" />{" "}
                            {unlinkingUsage === `${entry.kind}:${entry.id}`
                              ? "Removing…"
                              : entry.action.label}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {!supplierDetails.usages?.length && (
                    <div className="rounded-lg border border-dashed border-slate-200 py-7 text-center text-sm text-slate-400">
                      This supplier is not linked to any master or saved rate.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete supplier"
        message={`Delete ${deleting?.name || "this supplier"}? Existing master and rate links must be removed first.`}
        confirmLabel="Delete supplier"
      />
    </div>
  );
}
