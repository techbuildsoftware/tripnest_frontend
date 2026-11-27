import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDown,
  CalendarDays,
  Edit,
  Eye,
  Loader2,
  Plus,
  ReceiptText,
  Trash2,
  X,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import { useApp } from "../../context/AppContext";
import { apiClient } from "../../lib/api";
import Modal from "../../components/ui/Modal";
import DateInput from "../../components/ui/DateInput";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SearchableSelect from "../../components/ui/SearchableSelect";
import StatusBadge from "../../components/ui/StatusBadge";
import useSalesMaster from "../../hooks/useSalesMaster";
import useFinanceMaster from "../../hooks/useFinanceMaster";
import { supplierOptionsFor } from "../../lib/supplierOptions";
import { formatDate } from "../../lib/date";
import { priceNumber } from "../../lib/pricing";
import { activeMealPlanNames, currentMealPlanName, preferredMealPlanName } from "../../lib/mealPlans";
import { hotelGroupLimit } from "../../lib/hotelRateTier";

const priceTypes = ["All Days", "Weekends", "Offer Price"];
const contractPriceTypes = ["All Days", "Weekends"];
const moneyFields = (groupRoomLimit = 0) => {
  const limit = hotelGroupLimit(groupRoomLimit);
  const fitSuffix = limit > 0 ? `≤${limit} RMS` : "Default";
  const gitSuffix = limit > 0 ? `>${limit} RMS` : "Disabled";
  return [
  ["fitSingle", `FIT SGL ${fitSuffix}`],
  ["fitDouble", `FIT DBL ${fitSuffix}`],
  ["gitSingle", `GIT SGL ${gitSuffix}`],
  ["gitDouble", `GIT DBL ${gitSuffix}`],
  ["adultExtraBed", "Adult EB"],
  ["childWithBed", "CWB"],
  ["childNoBedAbove5", "CNB >5"],
  ["childNoBedBelow5", "CNB <5"],
  ["infant", "Infant"],
  ];
};
const newRoomRate = (roomType = "", mealPlan = "", roomCategory = "") => ({
  roomType,
  roomCategory,
  mealPlan,
  fitSingle: "",
  fitDouble: "",
  gitSingle: "",
  gitDouble: "",
  adultExtraBed: "",
  childWithBed: "",
  childNoBedAbove5: "",
  childNoBedBelow5: "",
  infant: "",
});

const hotelRoomTypes = (hotel) => [
  ...new Set(
    [
      ...(hotel?.roomTypes || []),
      ...(hotel?.rooms || []).map((room) =>
        typeof room === "string" ? room : room?.type || room?.name,
      ),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ),
];

const blank = (hotel, mealPlans = [], priceType = "All Days", market = "Thailand") => {
  const roomTypes = hotelRoomTypes(hotel);
  const mealPlan = preferredMealPlanName(mealPlans);
  return {
    priceType,
    bookingStartDate: "",
    bookingEndDate: "",
    rateCode: "",
    validityPeriods: [{ fromDate: "", toDate: "" }],
    soldOutDates: [],
    market,
    currency: "THB",
    status: "Active",
    roomRates: roomTypes.map((roomType) => newRoomRate(roomType, mealPlan)),
    supplements: [],
  };
};

const dateLabel = (periods = []) =>
  periods
    .map((period) => `${formatDate(period.fromDate)} to ${formatDate(period.toDate)}`)
    .join(", ");
const number = (value) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const todayIso = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const isExpiredRate = (rate) => {
  const periods = rate.validityPeriods || [];
  return periods.length > 0 && periods.every((period) => period.toDate && period.toDate < todayIso());
};

export default function HotelRates() {
  const navigate = useNavigate();
  const { hotelId } = useParams();
  const { hotels, suppliers } = useApp();
  const markets = useSalesMaster("markets");
  const mealMaster = useSalesMaster("meal-plans");
  const currencies = useFinanceMaster("currencies");
  const hotel = hotels.find((item) => item.id === hotelId);
  const rateMoneyFields = useMemo(() => moneyFields(hotel?.groupRoomLimit), [hotel?.groupRoomLimit]);

  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank(null));
  const [soldOutDraft, setSoldOutDraft] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    supplier: "",
    priceType: "",
    market: "",
    currency: "",
    roomType: "",
    mealPlan: "",
    expiry: "",
  });

  const roomTypes = useMemo(() => hotelRoomTypes(hotel), [hotel]);
  const mealPlans = useMemo(
    () => activeMealPlanNames(mealMaster),
    [mealMaster],
  );
  const currencyOptions = useMemo(
    () =>
      currencies
        .filter((item) => item.status === "Active")
        .map((item) => item.name),
    [currencies],
  );
  const supplierOptions = useMemo(
    () =>
      supplierOptionsFor(suppliers, "Hotel"),
    [suppliers],
  );
  const hotelOwnSupplier = useMemo(() => {
    if (!hotel?.supplierOwn) return null;
    return suppliers.find((supplier) => supplier.status !== "Inactive" && (
      (hotel.supplierId && String(supplier.id) === String(hotel.supplierId))
      || String(supplier.name || "").trim().toLocaleLowerCase() === String(hotel.name || "").trim().toLocaleLowerCase()
    )) || null;
  }, [hotel, suppliers]);
  const rateSupplierOptions = hotel?.supplierOwn
    ? (hotelOwnSupplier ? [hotelOwnSupplier.name] : [])
    : supplierOptions;
  const defaultMarket = useMemo(
    () => markets.find((market) => String(market).trim().toLowerCase() === "thailand") || "Thailand",
    [markets],
  );
  const visibleRoomTypes = roomTypes;
  const visibleMealPlans = mealPlans;


  const expiredRateCount = useMemo(() => rates.filter(isExpiredRate).length, [rates]);
  const displayedRates = useMemo(
    () => filters.expiry === "expired" ? rates.filter(isExpiredRate) : rates,
    [rates, filters.expiry],
  );

  const loadRates = async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        hotel: hotelId,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => key !== "expiry" && value),
        ),
      });
      setRates((await apiClient.get(`/hotel-rates?${query.toString()}`)).data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, [
    hotelId,
    filters.status,
    filters.supplier,
    filters.priceType,
    filters.market,
    filters.currency,
    filters.roomType,
    filters.mealPlan,
  ]);

  const open = (rate = null, type = "rate") => {
    setEditing(rate || {});
    setForm(
      rate
        ? {
            ...blank(hotel, mealPlans),
            ...rate,
            validityPeriods: rate.validityPeriods?.length
              ? rate.validityPeriods
              : [{ fromDate: "", toDate: "" }],
            soldOutDates: rate.soldOutDates || [],
            roomRates: (rate.roomRates || []).map((roomRate) => ({
              ...roomRate,
              mealPlan: currentMealPlanName(roomRate.mealPlan, mealPlans),
            })),
            supplements: rate.supplements || [],
          }
        : {
            ...blank(hotel, mealPlans, type === "offer" ? "Offer Price" : "All Days", defaultMarket),
            supplier: hotelOwnSupplier?.name || "",
          },
    );
    setSoldOutDraft("");
  };

  const close = () => setEditing(null);
  const set = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const setPeriod = (index, field, value) => setForm((current) => ({
    ...current,
    validityPeriods: current.validityPeriods.map((period, itemIndex) => {
      if (itemIndex !== index) return period;
      const next = { ...period, [field]: value };
      if (field === 'fromDate' && next.toDate && value > next.toDate) next.toDate = '';
      return next;
    }),
  }));
  const setRoomRate = (index, field, value) =>
    {
      if (field === "roomType" && value && form.roomRates.some((rate, itemIndex) => itemIndex !== index && String(rate.roomType || "").trim().toLocaleLowerCase() === String(value).trim().toLocaleLowerCase())) {
        toast.error(`Room type "${value}" is already added to this rate.`);
        return;
      }
      set(
        "roomRates",
        form.roomRates.map((rate, itemIndex) =>
          itemIndex === index ? { ...rate, [field]: value } : rate,
        ),
      );
    };
  const setSupplement = (index, field, value) => setForm((current) => ({
    ...current,
    supplements: current.supplements.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [field]: value };
      if (field === 'fromDate' && next.toDate && value > next.toDate) next.toDate = '';
      return next;
    }),
  }));
  const addRoomRate = () => {
    const selectedRoomTypes = new Set(
      (form.roomRates || []).map((rate) => rate.roomType).filter(Boolean),
    );
    const roomType =
      visibleRoomTypes.find((item) => !selectedRoomTypes.has(item)) ||
      "";
    if (!roomType) return toast.error("All available room types are already added to this rate.");
    const mealPlan = preferredMealPlanName(visibleMealPlans);
    set("roomRates", [...form.roomRates, newRoomRate(roomType, mealPlan)]);
  };
  const copyPriceColumnToRowsBelow = (sourceIndex, field) => setForm((current) => {
    const source = current.roomRates[sourceIndex];
    if (!source) return current;
    return {
      ...current,
      roomRates: current.roomRates.map((rate, index) => index > sourceIndex ? { ...rate, [field]: source[field] } : rate),
    };
  });
  const addSupplement = () => setForm((current) => ({
    ...current,
    supplements: [
      ...(current.supplements || []),
      {
        market: current.market,
        supplementType: "",
        fromDate: "",
        toDate: "",
        currency: current.currency,
        charges: "",
      },
    ],
  }));

  const addSoldOutDate = () => {
    if (!soldOutDraft) return;
    if (!form.soldOutDates.includes(soldOutDraft))
      set("soldOutDates", [...form.soldOutDates, soldOutDraft]);
    setSoldOutDraft("");
  };

  const save = async () => {
    // For a supplier-own hotel the supplier control is locked and the API
    // resolves its linked Hotel Master supplier. Do not reject the form just
    // because the disabled control has no client-side value yet.
    if ((!form.supplier && !hotel?.supplierOwn) || !form.market || !form.currency)
      return toast.error("Supplier, market and currency are required.");
    if (form.priceType === "Offer Price" && (!form.bookingStartDate || !form.bookingEndDate))
      return toast.error("Offer prices require booking start and end dates.");
    if (form.priceType === "Offer Price" && form.bookingEndDate < form.bookingStartDate)
      return toast.error("Offer booking end date cannot be before its start date.");
    if (
      !form.validityPeriods.every((period) => period.fromDate && period.toDate)
    )
      return toast.error("Complete every price validity period.");
    if (form.validityPeriods.some((period) => period.toDate < period.fromDate))
      return toast.error("A price validity end date cannot be before its start date.");
    if (form.supplements.some((item) => item.fromDate && item.toDate && item.toDate < item.fromDate))
      return toast.error("A supplement end date cannot be before its start date.");
    if (
      form.roomRates.length === 0 ||
      form.roomRates.some((rate) => !rate.roomType)
    )
      return toast.error("Add a room rate and select its room type.");
    if (!roomTypes.length)
      return toast.error("Add this hotel's room types in Hotel Master before creating a rate.");
    if (form.roomRates.some((rate) => !roomTypes.includes(rate.roomType)))
      return toast.error("Each rate room type must be configured on this hotel.");
    if (form.roomRates.some((rate) => !currentMealPlanName(rate.mealPlan, mealPlans)))
      return toast.error("Select a meal plan from the active Meal Plan Master.");
    const duplicateRoom = form.roomRates.map((rate) => String(rate.roomType).trim().toLocaleLowerCase()).find((roomType, index, values) => values.indexOf(roomType) !== index);
    if (duplicateRoom) return toast.error(`Room type "${form.roomRates.find((rate) => String(rate.roomType).trim().toLocaleLowerCase() === duplicateRoom)?.roomType}" is already added to this rate.`);
    setSaving(true);
    try {
      const payload = {
        ...form,
        hotel: hotelId,
        roomRates: form.roomRates.map((rate) => ({
          ...rate,
          mealPlan: currentMealPlanName(rate.mealPlan, mealPlans),
          ...Object.fromEntries(rateMoneyFields.map(([field]) => [field, priceNumber(rate[field])])),
        })),
        supplements: form.supplements.map((item) => ({ ...item, charges: priceNumber(item.charges) })),
      };
      if (editing?.id)
        await apiClient.put(
          `/hotel-rates/${encodeURIComponent(editing.id)}`,
          payload,
        );
      else await apiClient.post("/hotel-rates", payload);
      toast.success(
        editing?.id ? "Hotel rate updated." : "Hotel rate created.",
      );
      close();
      await loadRates();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await apiClient.delete(`/hotel-rates/${encodeURIComponent(deleting.id)}`);
      setRates((current) => current.filter((rate) => rate.id !== deleting.id));
      setDeleting(null);
      toast.success("Hotel rate deleted.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-[1800px] mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/masters/hotels")}
            className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            title="Back to hotels"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-base font-bold text-slate-900 leading-none">Hotel Rates</h1>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="text-sm font-medium text-slate-600 truncate max-w-[480px]">
                {hotel?.name || "Selected hotel"}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
              Manage room rates, seasonal contracts and supplements.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => open(null, "offer")} className="btn-secondary text-xs h-8 px-3 flex-shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Offer Price
          </button>
          <button type="button" onClick={() => open()} className="btn-primary text-xs h-8 px-3 flex-shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add New Rate
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Rate contracts
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {loading
                ? "Loading saved rates…"
                : `${displayedRates.length} ${displayedRates.length === 1 ? "rate" : "rates"} shown`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFilters((current) => ({ ...current, expiry: current.expiry === "expired" ? "" : "expired" }))}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${filters.expiry === "expired" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
            >
              {expiredRateCount} expired {expiredRateCount === 1 ? "rate" : "rates"}
            </button>
            {Object.values(filters).some(Boolean) && (
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    status: "",
                    supplier: "",
                    priceType: "",
                    market: "",
                    currency: "",
                    roomType: "",
                    mealPlan: "",
                    expiry: "",
                  })
                }
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                showFilters || Object.values(filters).some(Boolean)
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {Object.values(filters).some(Boolean) && (
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              )}
            </button>
          </div>
        </div>
        {showFilters && (
        <div className="p-4 bg-slate-50/60 border-b border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7 gap-3">
            <SearchableSelect
              value={filters.supplier}
              onChange={(value) =>
                setFilters((current) => ({ ...current, supplier: value }))
              }
              options={supplierOptions}
              placeholder="All hotel suppliers"
            />
            <SearchableSelect
              value={filters.priceType}
              onChange={(value) =>
                setFilters((current) => ({ ...current, priceType: value }))
              }
              options={priceTypes}
              placeholder="All price types"
            />
            <SearchableSelect
              value={filters.market}
              onChange={(value) =>
                setFilters((current) => ({ ...current, market: value }))
              }
              options={markets}
              placeholder="All markets"
            />
            <SearchableSelect
              value={filters.currency}
              onChange={(value) =>
                setFilters((current) => ({ ...current, currency: value }))
              }
              options={currencyOptions}
              placeholder="All currencies"
            />
            <SearchableSelect
              value={filters.roomType}
              onChange={(value) =>
                setFilters((current) => ({ ...current, roomType: value }))
              }
              options={roomTypes}
              placeholder="All room types"
            />
            <SearchableSelect
              value={filters.mealPlan}
              onChange={(value) =>
                setFilters((current) => ({ ...current, mealPlan: value }))
              }
              options={mealPlans}
              placeholder="All meal plans"
            />
            <SearchableSelect
              value={filters.status}
              onChange={(value) =>
                setFilters((current) => ({ ...current, status: value }))
              }
              options={["Active", "Inactive"]}
              placeholder="All statuses"
            />
          </div>
        </div>
        )}

        {loading ? (
          <div className="min-h-[290px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : displayedRates.length === 0 ? (
          <div className="min-h-[290px] px-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
              <ReceiptText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">
              No hotel rates found
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              {Object.values(filters).some(Boolean)
                ? "No saved rates match the selected filters."
                : "Add the first contract to set room, meal plan and supplement prices."}
            </p>
            <button
              type="button"
              onClick={() => open()}
              className="btn-primary mt-5"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add first rate
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-white text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Valid dates</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Price Details</th>
                  <th className="px-4 py-3 text-left">Room Rates</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedRates.map((rate) => (
                  <tr key={rate.id} className={`${isExpiredRate(rate) ? "bg-red-50/70 hover:bg-red-50" : "hover:bg-slate-50"}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      <div className="font-medium text-slate-800">
                        {dateLabel(rate.validityPeriods)}
                      </div>
                      {rate.priceType === "Offer Price" && rate.bookingStartDate && (
                        <div className="text-xs text-violet-700 mt-1">
                          Booking: {formatDate(rate.bookingStartDate)} to {formatDate(rate.bookingEndDate)}
                        </div>
                      )}
                      {rate.soldOutDates?.length > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          {rate.soldOutDates.length} sold-out date
                          {rate.soldOutDates.length === 1 ? "" : "s"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {rate.supplier || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {rate.priceType}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {rate.market} · {rate.currency}
                        {rate.rateCode ? ` · ${rate.rateCode}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(rate.roomRates || []).length ? (
                        <div className="space-y-1">
                          {(rate.roomRates || []).map((roomRate, index) => (
                            <div key={`${roomRate.roomType || 'room'}-${roomRate.mealPlan || 'meal'}-${index}`} className="text-xs">
                              <div className="font-semibold text-slate-700">
                                {roomRate.roomType || 'Room'}
                                <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{roomRate.mealPlan || 'No meal plan'}</span>
                              </div>
                              <div className="mt-0.5 text-[10px] text-slate-500">
                                FIT SGL ฿{number(roomRate.fitSingle)} · FIT DBL ฿{number(roomRate.fitDouble)}
                              </div>
                            </div>
                          ))}
                          <div className="text-[10px] text-slate-400">
                            {rate.supplements?.length || 0} supplement{rate.supplements?.length === 1 ? '' : 's'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No room rate</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={rate.status} size="xs" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewing(rate)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                          title="View rate"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => open(rate)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit rate"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(rate)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete rate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!editing}
        onClose={close}
        title={editing?.id ? "Edit Hotel Rate" : form.priceType === "Offer Price" ? "Add New Offer Price" : "Add New Hotel Rate"}
        size="full"
        footer={
          <>
            <button type="button" onClick={close} className="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary text-xs h-8 px-3 flex-shrink-0"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing?.id ? "Update Rate" : "Save Rate"}
            </button>
          </>
        }
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            {form.priceType === "Offer Price" ? (
              <div className="rounded-xl border border-violet-200 px-3 py-2 bg-violet-50">
                <div className="text-xs text-violet-500 capitalize tracking-wide">Price type</div>
                <div className="font-medium text-sm text-violet-800 truncate mt-1">Offer Price</div>
              </div>
            ) : (
              <label className="block">
                <span className="form-label">Price type</span>
                <SearchableSelect
                  value={form.priceType}
                  onChange={(value) => set("priceType", value)}
                  options={contractPriceTypes}
                />
              </label>
            )}
            <label className="block">
              <span className="form-label">Supplier *</span>
              <SearchableSelect
                value={form.supplier || ""}
                onChange={(value) => set("supplier", value)}
                options={rateSupplierOptions}
                placeholder={hotel?.supplierOwn ? "Hotel's own supplier" : "Select hotel supplier"}
                isDisabled={Boolean(hotel?.supplierOwn)}
              />
              {hotel?.supplierOwn && <p className="mt-1 text-[10px] text-slate-500">This hotel owns its supplier account, so its rate contracts are locked to {hotelOwnSupplier?.name || 'the linked hotel supplier (applied automatically on save)'}.</p>}
            </label>
            <label className="block">
              <span className="form-label">Market *</span>
              <SearchableSelect
                value={form.market}
                onChange={(value) => set("market", value)}
                options={markets}
                placeholder="Select market"
              />
            </label>
            <label className="block">
              <span className="form-label">Currency *</span>
              <SearchableSelect
                value={form.currency}
                onChange={(value) => set("currency", value)}
                options={currencyOptions}
                placeholder="Select currency"
              />
            </label>
            <label className="block">
              <span className="form-label">Status</span>
              <SearchableSelect
                value={form.status}
                onChange={(value) => set("status", value)}
                options={["Active", "Inactive"]}
              />
            </label>
            <div className="rounded-xl border border-slate-200 px-3 py-2 bg-slate-50">
              <div className="text-xs text-slate-400 capitalize tracking-wide">
                Hotel
              </div>
              <div className="font-medium text-sm text-slate-700 truncate mt-1">
                {hotel?.name || hotelId}
              </div>
            </div>
          </section>

          {form.priceType === "Offer Price" && (
            <section className="border border-violet-200 bg-violet-50/40 rounded-xl p-4">
              <div className="mb-3">
                <h3 className="font-semibold text-slate-800 capitalize">Offer booking window</h3>
                <p className="text-xs text-slate-500 capitalize">Set when the offer can be booked. Stay dates are configured below.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label>
                  <span className="form-label">Booking start date *</span>
                  <DateInput
                    value={form.bookingStartDate || ""}
                    max={form.bookingEndDate || undefined}
                    onChange={(value) => {
                      setForm((current) => ({ ...current, bookingStartDate: value, bookingEndDate: current.bookingEndDate && current.bookingEndDate < value ? "" : current.bookingEndDate }));
                    }}
                    className="form-input"
                  />
                </label>
                <label>
                  <span className="form-label">Booking end date *</span>
                  <DateInput
                    value={form.bookingEndDate || ""}
                    min={form.bookingStartDate || undefined}
                    onChange={(value) => set("bookingEndDate", value)}
                    className="form-input"
                  />
                </label>
                <label>
                  <span className="form-label">Rate code</span>
                  <input
                    value={form.rateCode || ""}
                    onChange={(event) => set("rateCode", event.target.value)}
                    className="form-input"
                    placeholder="e.g. SUMMER26"
                    maxLength={80}
                  />
                </label>
              </div>
            </section>
          )}

          <section className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-800 capitalize">Price validity</h3>
                <p className="text-xs text-slate-500 capitalize">
                  Use multiple date ranges for seasonal or split contracts.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  set("validityPeriods", [
                    ...form.validityPeriods,
                    { fromDate: "", toDate: "" },
                  ])
                }
                className="btn-secondary text-xs py-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5" /> Add date range
              </button>
            </div>
            <div className="flex flex-col xl:flex-row xl:items-start gap-6">
              {/* Validity Periods */}
              <div className="flex-1 space-y-3 min-w-[45%]">
                {form.validityPeriods.map((period, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end"
                  >
                    <label>
                      <span className="form-label">From date *</span>
                      <DateInput
                        value={period.fromDate}
                        max={period.toDate || undefined}
                        onChange={(value) =>
                          setPeriod(index, "fromDate", value)
                        }
                        className="form-input"
                      />
                    </label>
                    <label>
                      <span className="form-label">To date *</span>
                      <DateInput
                        value={period.toDate}
                        min={period.fromDate || undefined}
                        onChange={(value) =>
                          setPeriod(index, "toDate", value)
                        }
                        className="form-input"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={form.validityPeriods.length === 1}
                      onClick={() =>
                        set(
                          "validityPeriods",
                          form.validityPeriods.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        )
                      }
                      className="p-2 mb-0.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30"
                      title="Remove date range"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Divider for large screens */}
              <div className="hidden xl:block w-px bg-slate-200 self-stretch"></div>

              {/* Sold Out Dates */}
              <div className="flex-1">
                <div className="flex flex-wrap items-end gap-3">
                  <label>
                    <span className="form-label">Sold-out date</span>
                    <DateInput
                      value={soldOutDraft}
                      onChange={setSoldOutDraft}
                      className="form-input"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={addSoldOutDate}
                    className="btn-secondary mb-0.5 text-xs py-2"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                {form.soldOutDates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.soldOutDates.map((date) => (
                      <span
                        key={date}
                        className="badge badge-red flex items-center gap-1"
                      >
                        {date}
                        <button
                          type="button"
                          onClick={() =>
                            set(
                              "soldOutDates",
                              form.soldOutDates.filter((item) => item !== date),
                            )
                          }
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-800 capitalize">
                  Room price grid
                </h3>
                <p className="text-xs text-slate-500 capitalize">
                  FIT applies through this hotel&apos;s Group Limit; GIT applies above it. Extra bed, child and infant prices are in{" "}
                  {form.currency || "the selected currency"}.
                </p>
              </div>
              <button
                type="button"
                onClick={addRoomRate}
                className="btn-secondary text-xs py-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add room rate
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1420px] w-full text-xs">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-2 text-left">Room type</th>
                    <th className="p-2 text-left">Meal Plan</th>
                    {rateMoneyFields.map(([, label]) => (
                      <th
                        key={label}
                        className="p-2 text-left whitespace-nowrap"
                      >
                        {label}
                      </th>
                    ))}
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {form.roomRates.map((rate, index) => (
                    <tr key={index}>
                      <td className="p-2 min-w-40">
                        <SearchableSelect
                          value={rate.roomType}
                          onChange={(value) =>
                            setRoomRate(index, "roomType", value)
                          }
                          options={visibleRoomTypes}
                          placeholder="Room type"
                        />
                      </td>
                      <td className="p-2 min-w-36">
                        <SearchableSelect
                          value={rate.mealPlan}
                          onChange={(value) =>
                            setRoomRate(index, "mealPlan", value)
                          }
                          options={visibleMealPlans}
                          placeholder="Meal plan"
                        />
                      </td>
                      {rateMoneyFields.map(([field]) => (
                        <td key={field} className="p-2 min-w-24">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={rate[field] ?? ""}
                              onChange={(event) =>
                                setRoomRate(
                                  index,
                                  field,
                                  event.target.value,
                                )
                              }
                              className="form-input text-right min-w-0"
                            />
                            <button
                              type="button"
                              onClick={() => copyPriceColumnToRowsBelow(index, field)}
                              disabled={index === form.roomRates.length - 1 || rate[field] === "" || rate[field] === undefined}
                              className="shrink-0 p-1.5 text-blue-600 hover:bg-blue-50 rounded-md disabled:text-slate-300 disabled:hover:bg-transparent"
                              title={`Copy ${field} price to rows below`}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      ))}
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() =>
                            set(
                              "roomRates",
                              form.roomRates.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remove room rate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-800 capitalize">
                  Supplement charges
                </h3>
                <p className="text-xs text-slate-500 capitalize">
                  Optional charges applied to this rate contract.
                </p>
              </div>
            </div>
            {form.supplements.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-2 text-left">Market</th>
                      <th className="p-2 text-left">Supplement Type</th>
                      <th className="p-2 text-left">From</th>
                      <th className="p-2 text-left">To</th>
                      <th className="p-2 text-left">Currency</th>
                      <th className="p-2 text-left">Charge</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {form.supplements.map((item, index) => (
                      <tr key={index}>
                        <td className="p-2">
                          <SearchableSelect
                            value={item.market}
                            onChange={(value) =>
                              setSupplement(index, "market", value)
                            }
                            options={markets}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={item.supplementType}
                            onChange={(event) =>
                              setSupplement(
                                index,
                                "supplementType",
                                event.target.value,
                              )
                            }
                            className="form-input"
                            placeholder="e.g. Gala dinner"
                          />
                        </td>
                        <td className="p-2">
                          <DateInput
                            value={item.fromDate}
                            max={item.toDate || undefined}
                            onChange={(value) =>
                              setSupplement(
                                index,
                                "fromDate",
                                value,
                              )
                            }
                            className="form-input"
                          />
                        </td>
                        <td className="p-2">
                          <DateInput
                            value={item.toDate}
                            min={item.fromDate || undefined}
                            onChange={(value) =>
                              setSupplement(index, "toDate", value)
                            }
                            className="form-input"
                          />
                        </td>
                        <td className="p-2">
                          <SearchableSelect
                            value={item.currency}
                            onChange={(value) =>
                              setSupplement(index, "currency", value)
                            }
                            options={currencyOptions}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.charges ?? ""}
                            onChange={(event) =>
                              setSupplement(
                                index,
                                "charges",
                                event.target.value,
                              )
                            }
                            className="form-input text-right"
                          />
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              set(
                                "supplements",
                                form.supplements.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              )
                            }
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
              <button type="button" onClick={addSupplement} className="btn-secondary text-xs py-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Supplement
              </button>
            </div>
          </section>
        </div>
      </Modal>

      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title="View Hotel Rate"
        size="lg"
        footer={<button type="button" onClick={() => setViewing(null)} className="btn-secondary">Close</button>}
      >
        {viewing && <div className="space-y-5 text-sm">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[['Supplier', viewing.supplier], ['Price type', viewing.priceType], ['Market', viewing.market], ['Currency', viewing.currency], ['Status', viewing.status], ['Rate code', viewing.rateCode || '—']].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-800">{value || '—'}</p></div>)}
          </div>
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Validity</p><div className="flex flex-wrap gap-2">{(viewing.validityPeriods || []).map((period, index) => <span key={`${period.fromDate}-${index}`} className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-800">{formatDate(period.fromDate)} to {formatDate(period.toDate)}</span>)}</div></div>
          <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full text-xs"><thead className="bg-slate-900 text-white"><tr><th className="p-2 text-left">Room type</th><th className="p-2 text-left">Meal plan</th>{rateMoneyFields.map(([, label]) => <th key={label} className="p-2 text-right">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{(viewing.roomRates || []).map((room, index) => <tr key={`${room.roomType}-${index}`}><td className="p-2 font-medium">{room.roomType}</td><td className="p-2">{room.mealPlan || '—'}</td>{rateMoneyFields.map(([field]) => <td key={field} className="p-2 text-right">{number(room[field])}</td>)}</tr>)}</tbody></table></div>
          {viewing.supplements?.length > 0 && <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Supplements</p><div className="space-y-1">{viewing.supplements.map((item, index) => <div key={`${item.supplementType}-${index}`} className="flex justify-between rounded-md border border-slate-200 px-3 py-2 text-xs"><span>{item.supplementType || 'Supplement'} {item.fromDate && `(${formatDate(item.fromDate)} to ${formatDate(item.toDate)})`}</span><strong>{viewing.currency} {number(item.charges)}</strong></div>)}</div></div>}
        </div>}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete hotel rate"
        message={`Delete the ${deleting?.priceType || ""} rate and all of its room prices? This cannot be undone.`}
        confirmLabel="Delete rate"
      />
    </div>
  );
}
