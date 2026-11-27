import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';
import useOperationsMaster from '../../hooks/useOperationsMaster';
import useSalesMaster from '../../hooks/useSalesMaster';
import { apiClient } from '../../lib/api';
import { formatDate, todayIsoInTimeZone } from '../../lib/date';
import { activeMealPlanNames, currentMealPlanName } from '../../lib/mealPlans';
import { hotelRateTierDescription, usesGitHotelRate } from '../../lib/hotelRateTier';
import { isHotelWeekendDate, orderedHotelRatesForDate, preferredHotelRateForDate } from '../../lib/hotelRateSelection';
import { hotelAllocationChargeLines, hotelAllocationRateCost } from '../../lib/hotelRoomPricing';
import { selectedVehicleCombination as vehicleCombinationForParty, vehicleCombinationFromSelections, vehicleCombinationOptions, vehicleRateId, vehicleRateName } from '../../lib/vehicleCombination';
import Modal from '../../components/ui/Modal';
import SearchableSelect from '../../components/ui/SearchableSelect';
import DateInput from '../../components/ui/DateInput';

const shiftCalendarDate = (date, amount) => {
  const match = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, year, month, day] = match;
  const value = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(value.getTime())) return '';
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
};

// Dates in quotations are calendar dates, not timestamps. Keep all date
// arithmetic in UTC so a browser in India or Thailand cannot move backward
// (or remain on the same day) after converting a local midnight to ISO.
const nextCalendarDate = (date) => shiftCalendarDate(date, 1);
const previousCalendarDate = (date) => shiftCalendarDate(date, -1);

const nightsBetween = (from, to) => Math.max(1, Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000));

const isRateApplicable = (rate, date, market) => {
  if (!rate || rate.status !== 'Active') return false;
  const marketMatches = !market || !rate.market || normalize(rate.market) === normalize(market);
  if (!marketMatches) return false;
  if (Array.isArray(rate.validityPeriods)) {
    return rate.validityPeriods.some((period) => period.fromDate <= date && period.toDate >= date);
  }
  return Boolean(rate.fromDate && rate.toDate && rate.fromDate <= date && rate.toDate >= date);
};

const baseRateCost = (roomRate, rooms, adults, groupRoomLimit) => {
  if (!roomRate) return 0;
  const usesGitRate = usesGitHotelRate(rooms, groupRoomLimit);
  const single = Number(adults || 0) <= Number(rooms || 1);
  const gitRate = single ? roomRate.gitSingle : roomRate.gitDouble;
  const fitRate = single ? roomRate.fitSingle : roomRate.fitDouble;
  const occupancy = usesGitRate && Number(gitRate || 0) > 0 ? gitRate : fitRate;
  return Number(occupancy || 0);
};

const normalize = (value) => String(value || '').trim().toLocaleLowerCase();
const matchingHotelRoomRate = (rate, roomType, mealPlan) => (rate?.roomRates || []).find((entry) => (
  (!roomType || entry.roomType === roomType)
  && (!mealPlan || normalize(entry.mealPlan) === normalize(mealPlan))
)) || null;
const preferredHotelRoomRate = (rate, roomType, mealPlan) => (
  matchingHotelRoomRate(rate, roomType, mealPlan)
  || (rate?.roomRates || []).find((entry) => !roomType || entry.roomType === roomType)
  || rate?.roomRates?.[0]
  || null
);
const readableValue = (value) => (value && typeof value === 'object' ? value.name || value.label || value.value || '' : value) || '';
const variantPdfImage = (variant = {}) => (Array.isArray(variant.images) ? variant.images.find((image) => image?.url) : null) || variant.image || null;
const transferRouteEndpoints = (transfer = {}) => {
  const origin = String(readableValue(transfer.origin || transfer.from || transfer.fromSector || transfer.pickupPoint || transfer.pickupFrom) || '').trim();
  const destination = String(readableValue(transfer.dropAt || transfer.dropPoint || transfer.dropOff || transfer.to || transfer.toSector) || '').trim();
  if (origin || destination) return { origin, destination };

  const route = String(transfer.route || transfer.name || '').trim();
  const [from = '', to = ''] = route.split(/\s+(?:to|→)\s+/i, 2).map((value) => value.trim());
  return { origin: from, destination: to };
};
// Vehicle capacity is based on adults only. Children/infants may still have
// ticket or SIC charges, but they never cause an additional vehicle to be
// selected automatically.
const transferPartySize = (form = {}, quotation = {}) => Math.max(1, Number(form.adults ?? quotation?.adults ?? 0));
const selectedVehicleCombination = (vehicleCosts, form, quotation, selectionKeyField) => {
  return vehicleCombinationForParty(vehicleCosts, transferPartySize(form, quotation), form?.[selectionKeyField]);
};
const selectedVehicleFleet = (vehicleCosts, form, quotation, selectionKeyField, selectionsField, manualField) => {
  if (form?.[manualField]) {
    return vehicleCombinationFromSelections(vehicleCosts, form?.[selectionsField]);
  }
  return selectedVehicleCombination(vehicleCosts, form, quotation, selectionKeyField);
};
const transferRateValues = (previous, rate, quotation, { combination: suppliedCombination, manual = false } = {}) => {
  const partySize = transferPartySize(previous, quotation);
  const combination = suppliedCombination || selectedVehicleCombination(rate?.vehicleCosts, previous, quotation, 'vehicleSelectionKey');
  const adultTransferCost = Number(rate?.adultCost || 0);
  const childTransferCost = Number(rate?.childCost || 0);
  const passengerCost = rate?.serviceType === 'SIC'
    ? adultTransferCost * Number(previous.adults ?? quotation?.adults ?? 0)
      + childTransferCost * Number(previous.children ?? quotation?.children ?? 0)
    : 0;
  const supplierCost = passengerCost + Number(combination?.totalCost || 0);
  return {
    rateContractId: rate?.id || '',
    supplier: rate?.supplier || '',
    serviceType: rate?.serviceType || '',
    basis: rate?.serviceType === 'SIC' ? 'Sic' : 'Private',
    // vehicle remains populated for backward-compatible validation and old
    // service cards. The selections array is the authoritative mixed fleet.
    vehicle: combination?.key || '',
    vehicleId: combination?.key || '',
    vehicleName: combination?.label || '',
    vehicleSelectionKey: combination?.key || '',
    vehicleSelections: combination?.entries || [],
    vehicleTotalCapacity: combination?.totalCapacity || 0,
    vehicleAutoSelectedForPax: partySize,
    vehicleManualSelection: manual,
    quantity: 1,
    adultTransferCost,
    childTransferCost,
    supplierCost,
    sellingPrice: Math.round(supplierCost * (1 + Number(previous.markup || 0) / 100)),
    currency: rate?.currency || 'THB',
  };
};
const manualTransferRateValues = (previous, rate, quotation, selections) => (
  transferRateValues(previous, rate, quotation, {
    combination: vehicleCombinationFromSelections(rate?.vehicleCosts, selections),
    manual: true,
  })
);
const hotelRoomTypes = (hotel) => [...new Set([
  ...(hotel?.roomTypes || []),
  ...(hotel?.rooms || []).map((room) => typeof room === 'string' ? room : room?.type || room?.name),
].map((value) => String(value || '').trim()).filter(Boolean))];
const hotelRateCurrency = (currency) => String(currency || 'THB').toUpperCase() === 'THB'
  ? '฿'
  : `${String(currency || '').trim()} `;
const roomTypeStartingPrice = (roomRate) => (
  [roomRate?.fitDouble, roomRate?.fitSingle, roomRate?.gitDouble, roomRate?.gitSingle,
    roomRate?.adultExtraBed, roomRate?.childWithBed, roomRate?.childNoBedAbove5, roomRate?.childNoBedBelow5]
    .map((value) => Number(value || 0))
    .find((value) => value > 0) || 0
);
const roomUnits = (allocation = {}) => Number(allocation.sgl || 0) + Number(allocation.dbl || 0);
const hasRoomAllocation = (allocation = {}) => Object.values(allocation).some((value) => Number(value || 0) > 0);
// Room allocation is chosen at quotation level. Hotel services inherit that
// allocation, so an older hotel row can never silently omit a newly selected
// CWB/extra-bed supplement.
const effectiveHotelAllocation = (quotation = {}, serviceAllocation = {}, useServiceAllocation = false) => (
  useServiceAllocation || !hasRoomAllocation(quotation?.roomAllocation)
    ? serviceAllocation
    : quotation.roomAllocation
);
const sameRoomAllocation = (left = {}, right = {}) => ['sgl', 'dbl', 'adultExtraBed', 'cwb', 'cnb', 'inf']
  .every((field) => Number(left?.[field] || 0) === Number(right?.[field] || 0));
const ROOM_ALLOCATION_FIELDS = [
  ['sgl', 'SGL'],
  ['dbl', 'DBL'],
  ['adultExtraBed', 'EXB'],
  ['cwb', 'CWB'],
  ['cnb', 'CNB'],
  ['inf', 'INF'],
];
// The standard adult allocation is double occupancy first, followed by one
// adult extra bed for an odd passenger. Child and infant supplements belong
// to their own fields and must survive an adult-count adjustment.
const allocationForAdultCount = (allocation = {}, adults) => {
  const adultCount = Math.max(0, Number(adults || 0));
  return {
    ...allocation,
    sgl: 0,
    dbl: Math.floor(adultCount / 2),
    adultExtraBed: adultCount % 2,
  };
};
const allocationRateCost = (roomRate, allocation, rooms, adults, groupRoomLimit, childAges = []) => {
  if (!roomRate) return 0;
  if (!hasRoomAllocation(allocation)) return baseRateCost(roomRate, rooms, adults, groupRoomLimit);
  return hotelAllocationRateCost(roomRate, allocation, groupRoomLimit, childAges);
};
const hotelStayDates = (checkIn, checkOut) => {
  if (!checkIn || !checkOut || checkOut <= checkIn) return [];
  const dates = [];
  for (let date = checkIn; date < checkOut && dates.length < 3660;) {
    dates.push(date);
    const followingDate = nextCalendarDate(date);
    // Prevent a malformed date from ever creating a browser-blocking loop.
    if (!followingDate || followingDate <= date) break;
    date = followingDate;
  }
  return dates;
};
const roundHotelMoney = (value) => Math.round(Number(value || 0) * 100) / 100;
// Hotel Rate Master stores date-based supplement/surcharge rows separately
// from room prices.  Resolve them for every stay night so a New Year, gala or
// seasonal surcharge is reflected in the quotation rather than only in the
// master record.
const hotelSupplementsForNight = (rate, date, market, roomCount = 1) => (rate?.supplements || [])
  .filter((item) => Number(item?.charges || 0) > 0)
  .filter((item) => !item.market || !market || normalize(item.market) === normalize(market))
  .filter((item) => (!item.fromDate || item.fromDate <= date) && (!item.toDate || item.toDate >= date))
  .map((item) => ({
    label: String(item.supplementType || 'Hotel surcharge').trim() || 'Hotel surcharge',
    // Hotel-rate supplements are room supplements. For example, a New Year
    // charge of 200 on three rooms is 3 × 200 = 600 for that night.
    unitAmount: roundHotelMoney(item.charges),
    quantity: Math.max(1, Number(roomCount || 1)),
    amount: roundHotelMoney(Number(item.charges || 0) * Math.max(1, Number(roomCount || 1))),
    currency: item.currency || rate?.currency || '',
  }));
// Resolve every calendar night independently. This is intentionally a pure
// function: rendering a hotel modal never writes pricing back into its state.
const hotelNightlyPricing = ({ hotel, rates, checkIn, checkOut, market, roomType, mealPlan, rateContractId, allocation, rooms, adults, childAges, groupRoomLimit, markup }) => {
  const roomMultiplier = hasRoomAllocation(allocation) ? 1 : Math.max(1, Number(rooms || 1));
  const selectedContract = rateContractId
    ? (rates || []).find((rate) => rate.hotelId === hotel?.id && rate.id === rateContractId)
    : null;
  const selectedContractType = normalize(selectedContract?.priceType || '');
  return hotelStayDates(checkIn, checkOut).map((date) => {
    const rateCandidates = orderedHotelRatesForDate(
      (rates || []).filter((rate) => rate.hotelId === hotel?.id && isRateApplicable(rate, date, market)),
      hotel,
      date,
    );
    // An explicitly selected contract must remain the source of truth. Do not
    // silently fall back to another contract (for example RO) when the form
    // says RB, otherwise changing a rate appears to have no effect.
    const weekendDay = isHotelWeekendDate(hotel, date);
    const selectedRate = rateContractId ? rateCandidates.find((item) => item.id === rateContractId) : null;
    const allDaysCompanion = rateCandidates.find((item) => normalize(item?.priceType) === 'all days' && matchingHotelRoomRate(item, roomType, mealPlan));
    const rate = selectedContractType === 'weekends'
      // Selecting a Weekend contract means: use that contract on configured
      // weekend nights and its valid All Days companion on every other night.
      ? (weekendDay ? selectedRate || null : allDaysCompanion || null)
      : rateContractId
      // Selecting All Days intentionally keeps it on every night, including
      // Friday/Saturday/Sunday; it must not be silently replaced by Weekend.
      ? selectedRate || null
      : rateCandidates.find((item) => matchingHotelRoomRate(item, roomType, mealPlan)) || rateCandidates[0] || null;
    const roomRate = matchingHotelRoomRate(rate, roomType, mealPlan);
    const chargeLines = hotelAllocationChargeLines(roomRate, allocation, groupRoomLimit, childAges).filter((line) => line.quantity > 0);
    const surchargeRoomCount = hasRoomAllocation(allocation)
      ? Math.max(1, roomUnits(allocation))
      : Math.max(1, Number(rooms || 1));
    const surchargeLines = hotelSupplementsForNight(rate, date, market, surchargeRoomCount);
    const surchargeCost = roundHotelMoney(surchargeLines.reduce((total, item) => total + Number(item.amount || 0), 0));
    const roomCost = roundHotelMoney(allocationRateCost(roomRate, allocation, rooms, adults, groupRoomLimit, childAges) * roomMultiplier);
    const supplierCost = roundHotelMoney(roomCost + surchargeCost);
    const usesWeekendRate = normalize(rate?.priceType) === 'weekends';
    return {
      date,
      roomType: roomRate?.roomType || roomType || '',
      mealPlan: roomRate?.mealPlan || '',
      supplier: rate?.supplier || '',
      currency: rate?.currency || '',
      rateContractId: rate?.id || '',
      rateBreakdown: roomRate || null,
      chargeLines,
      surchargeLines,
      surchargeCost,
      roomCost,
      supplierCost,
      sellingPrice: roundHotelMoney(supplierCost * (1 + Number(markup || 0) / 100)),
      available: Boolean(rate && roomRate),
      rateLabel: usesWeekendRate ? 'Weekend rate' : selectedContractType === 'weekends' ? 'All Days companion rate' : 'All Days rate',
      weekendDay,
      usesWeekendRate,
    };
  });
};
const dayName = (date) => date ? new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)) : '';
const normaliseWeekday = (value) => {
  const day = String(value || '').trim().toLowerCase();
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdays.find((candidate) => candidate.toLowerCase() === day || candidate.slice(0, 3).toLowerCase() === day.slice(0, 3)) || '';
};
const sightseeingScheduleForDate = (sightseeing, date) => {
  const selectedDay = dayName(date);
  return (sightseeing?.showTimings || [])
    .filter((timing) => {
      const days = (timing?.days || []).map(normaliseWeekday);
      return !days.length || (timing?.days || []).some((day) => String(day).trim().toLowerCase() === 'all') || days.includes(selectedDay);
    });
};
const sightseeingTimingSlots = (sightseeing, date) => [...new Set(sightseeingScheduleForDate(sightseeing, date).map((timing) => timing.time).filter(Boolean))];
const yachtIsBlocked = (yacht, date, quotationId = '') => (yacht?.bookings || []).some((booking) => {
  const status = String(booking?.status || '').toLowerCase();
  if (['cancelled', 'canceled', 'released'].includes(status)) return false;
  // A consultant must be able to revise the quotation that originally
  // reserved this yacht. Only a reservation belonging to another quotation
  // makes the yacht unavailable here.
  if (quotationId && String(booking?.quotationId || '') === String(quotationId)) return false;
  const fromDate = String(booking?.fromDate || booking?.date || booking?.serviceDate || '').slice(0, 10);
  const toDate = String(booking?.toDate || booking?.date || booking?.serviceDate || fromDate).slice(0, 10);
  return fromDate && date >= fromDate && date <= toDate;
});
const yachtPrice = (form, yacht, rate, serviceDate) => {
  if (!yacht || !rate) return 0;
  const selectedDay = dayName(serviceDate);
  const weekend = (yacht.weekendDays || []).includes(selectedDay);
  const base = form.season === 'Peak' ? Number(rate.peakRate || 0) : Number(weekend ? rate.weekendRate : rate.weekdayRate);
  const totalPax = Number(form.adults || 0) + Number(form.children || 0) + Number(form.infants || 0);
  const extraPax = Math.max(0, totalPax - Number(yacht.recommendedPax || yacht.maxCapacity || 0));
  const adultCharge = Math.max(0, Number(form.adults || 0)) * Number(rate.adultPrice || 0);
  const childCharge = Math.max(0, Number(form.children || 0)) * Number(rate.childPrice || 0);
  return base + adultCharge + childCharge + extraPax * Number(rate.extraPax || 0) + Math.max(0, Number(form.extraHours || 0)) * Number(rate.extraHour || 0);
};

const sightseeingTransferPricing = (transfer, form, quotation) => {
  const adults = Number(form.adults ?? quotation?.adults ?? 0);
  const children = Number(form.children ?? quotation?.children ?? 0);
  const isTicketOnly = transfer?.type === 'Ticket Only';
  const combination = isTicketOnly ? null : selectedVehicleFleet(
    transfer?.vehicleCosts,
    form,
    quotation,
    'transferVehicleSelectionKey',
    'transferVehicleSelections',
    'transferVehicleManualSelection',
  );
  const passengerCost = isTicketOnly
    ? 0
    : Number(transfer?.adultPrice || 0) * adults + Number(transfer?.childPrice || 0) * children;
  const vehicleCost = isTicketOnly ? 0 : Number(combination?.totalCost || 0);
  const supplierCost = passengerCost + vehicleCost;
  const multiplier = 1 + Number(form.markup || 0) / 100;
  const sellingPrice = Math.round(supplierCost * multiplier);
  return {
    adults, children, combination, passengerCost, vehicleCost, supplierCost, sellingPrice,
    passengerSellingPrice: Math.round(passengerCost * multiplier),
    vehicleSellingPrice: Math.round(vehicleCost * multiplier),
  };
};

const GUIDE_LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English Language', costField: 'englishCost' },
  { value: 'asian', label: 'Asian Language', costField: 'asianCost' },
  { value: 'other', label: 'Other Language', costField: 'otherCost' },
];
const guideRateKey = (rate, index) => `${rate?.duration || 'rate'}-${index}`;
const activeGuideRates = (guide) => (guide?.timingRates || []).filter((rate) => rate?.status !== 'Inactive');
const guideLanguageForRate = (rate) => GUIDE_LANGUAGE_OPTIONS.find(({ costField }) => Number.isFinite(Number(rate?.[costField])))?.value || 'english';
const resetHotelAvailability = (service = {}) => ({
  ...service,
  availabilityStatus: 'Pending',
  availabilityNotes: '',
  availabilityLastSentAt: '',
  availabilityUpdatedAt: '',
  availabilityUpdatedBy: '',
});

export default function ServiceForm({ type, initialData, quotation, day, segment, onSave, onCancel, hidePricing = false }) {
  const { hotels, suppliers } = useApp();
  const transferMasters = useOperationsMaster('transfers');
  const airportMasters = useOperationsMaster('airports');
  const destinationMasters = useOperationsMaster('destinations');
  const vehicleMasters = useOperationsMaster('vehicles');
  const guideMasters = useOperationsMaster('guides');
  const ferryClassMasters = useOperationsMaster('ferry-classes');
  const mealPlanMasters = useSalesMaster('meal-plans');
  const [sightseeingMasters, setSightseeingMasters] = useState([]);
  const [restaurantMasters, setRestaurantMasters] = useState([]);
  const [hotelRates, setHotelRates] = useState([]);
  const [transferRates, setTransferRates] = useState([]);
  const [restaurantRates, setRestaurantRates] = useState([]);
  const [yachts, setYachts] = useState([]);
  const [masterLoading, setMasterLoading] = useState(true);
  // Service entry is always cost-neutral by default. The quotation-wide
  // setting belongs to the Pricing tab, where it can be intentionally applied
  // to the complete quotation instead of silently changing each new service.
  const initialMarkup = 0;
  const defaultMarkup = 0;
  const [form, setForm] = useState(initialData || getDefaultForm(type, quotation, day, segment, initialMarkup));
  const [applyAllocationFromCurrentDay, setApplyAllocationFromCurrentDay] = useState(
    Boolean(
      type === 'Hotel'
      && initialData?.linkedStay
      && day?.date
      && initialData?.checkIn < day.date
      && initialData?.checkOut > day.date
    )
  );
  const [createdTransferMasters, setCreatedTransferMasters] = useState([]);
  const [createdAirports, setCreatedAirports] = useState([]);
  const [showTransferCreator, setShowTransferCreator] = useState(false);
  const [showAirportCreator, setShowAirportCreator] = useState(false);
  const [creatingTransfer, setCreatingTransfer] = useState(false);
  const [creatingAirport, setCreatingAirport] = useState(false);
  const [transferDraft, setTransferDraft] = useState({});
  const [airportDraft, setAirportDraft] = useState({ name: '', city: '', country: 'Thailand', iataCode: '', icaoCode: '', airportType: 'International', timezone: 'Asia/Bangkok' });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const activeMealPlans = useMemo(() => activeMealPlanNames(mealPlanMasters), [mealPlanMasters]);
  const childAgeSlots = Array.from(
    { length: Math.max(0, Number(quotation?.children || 0)) },
    (_, index) => ({ number: index + 1, age: quotation?.childAges?.[index] })
  );
  const stayStart = segment?.fromDate || quotation?.travelDate || '';
  const stayEnd = segment?.toDate || quotation?.endDate || '';
  // Hotels may check out on the morning after the final itinerary day.
  const latestCheckOut = stayEnd ? nextCalendarDate(stayEnd) : '';
  const stayLabel = segment?.departureDestination && segment?.arrivalDestination
    ? `${segment.departureDestination} → ${segment.arrivalDestination}`
    : day?.destination || 'this itinerary section';
  const fromDestination = segment?.departureDestination || day?.previousDestination || day?.origin || '';
  const stayDestination = segment?.arrivalDestination || day?.destination || '';
  // A service belongs to the route being edited, not to every destination in
  // the quotation. For a Pattaya → Bangkok segment, both Pattaya and Bangkok
  // masters must be available, while masters from other itinerary segments
  // must stay out of this selector.
  const segmentDestinations = useMemo(() => {
    const names = [
      segment?.departureDestination,
      segment?.arrivalDestination,
      day?.previousDestination,
      day?.destination,
    ].map((value) => String(readableValue(value) || '').trim()).filter(Boolean);
    return [...new Map(names.map((value) => [normalize(value), value])).values()];
  }, [day?.destination, day?.previousDestination, segment?.arrivalDestination, segment?.departureDestination]);
  const segmentDestinationKeys = useMemo(
    () => new Set(segmentDestinations.map(normalize)),
    [segmentDestinations],
  );
  const isInCurrentSegment = useCallback((value) => (
    !segmentDestinationKeys.size || segmentDestinationKeys.has(normalize(readableValue(value)))
  ), [segmentDestinationKeys]);
  const destinationSightseeing = useMemo(() => (
    segmentDestinationKeys.size
      ? sightseeingMasters.filter((sightseeing) => isInCurrentSegment(sightseeing.destination))
      : []
  ), [isInCurrentSegment, segmentDestinationKeys, sightseeingMasters]);
  // Keep hotel calculations above every effect that consumes them. More
  // importantly, these values are derived only; they never trigger a form
  // state update while the modal is rendering.
  const hotelMarket = quotation?.market || '';
  const selectedHotel = useMemo(
    () => hotels.find((hotel) => hotel.id === form.hotelId),
    [hotels, form.hotelId],
  );
  const hotelNightlyRates = useMemo(() => (type === 'Hotel' && selectedHotel
    ? hotelNightlyPricing({
      hotel: selectedHotel,
      rates: hotelRates,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      market: hotelMarket,
      roomType: form.roomType,
      mealPlan: form.mealPlan,
      rateContractId: form.rateContractId,
      allocation: effectiveHotelAllocation(quotation, form.roomAllocation, form.roomAllocationOverride),
      rooms: form.rooms,
      adults: form.adults,
      childAges: quotation?.childAges,
      groupRoomLimit: selectedHotel.groupRoomLimit,
      markup: form.markup,
    })
    : []), [
    type, selectedHotel, hotelRates, form.checkIn, form.checkOut, form.roomType, form.mealPlan, form.rateContractId,
    form.roomAllocation, form.roomAllocationOverride, form.rooms, form.adults,
    form.markup, quotation, hotelMarket,
  ]);
  const hotelPricing = useMemo(() => {
    if (type !== 'Hotel' || !selectedHotel) return null;
    const allocation = effectiveHotelAllocation(quotation, form.roomAllocation, form.roomAllocationOverride);
    const complete = hotelNightlyRates.length > 0 && hotelNightlyRates.every((night) => night.available);
    const nights = Math.max(1, Number(form.nights || hotelNightlyRates.length || 1));
    const contractTotalCost = roundHotelMoney(hotelNightlyRates.reduce((total, night) => total + Number(night.supplierCost || 0), 0));
    const contractTotalSelling = roundHotelMoney(hotelNightlyRates.reduce((total, night) => total + Number(night.sellingPrice || 0), 0));
    const supplierCost = form.manualSupplierCost
      ? Number(form.supplierCost || 0)
      : complete ? roundHotelMoney(contractTotalCost / nights) : Number(form.supplierCost || 0);
    const sellingPrice = form.manualSellingPrice
      ? Number(form.sellingPrice || 0)
      : complete && !form.manualSupplierCost
        ? roundHotelMoney(contractTotalSelling / nights)
        : roundHotelMoney(supplierCost * (1 + Number(form.markup || 0) / 100));
    return {
      allocation,
      complete,
      supplierCost,
      sellingPrice,
      totalSupplierCost: form.manualSupplierCost || !complete ? roundHotelMoney(supplierCost * nights) : contractTotalCost,
      totalSellingPrice: form.manualSellingPrice || form.manualSupplierCost || !complete ? roundHotelMoney(sellingPrice * nights) : contractTotalSelling,
    };
  }, [
    type, selectedHotel, quotation, form.roomAllocation, form.roomAllocationOverride,
    form.nights, form.manualSupplierCost, form.manualSellingPrice, form.supplierCost,
    form.sellingPrice, form.markup, hotelNightlyRates,
  ]);

  useEffect(() => {
    if (type !== 'Hotel' || !activeMealPlans.length) return;
    setForm((previous) => {
      const mealPlan = currentMealPlanName(previous.mealPlan, activeMealPlans);
      return mealPlan && mealPlan !== previous.mealPlan ? { ...previous, mealPlan } : previous;
    });
  }, [activeMealPlans, type]);

  const updateCheckIn = (checkIn) => setForm((previous) => {
    let checkOut = previous.checkOut;
    if (!checkOut || checkOut <= checkIn) checkOut = nextCalendarDate(checkIn);
    if (latestCheckOut && checkOut > latestCheckOut) checkOut = latestCheckOut;
    const hotel = hotels.find((item) => item.id === previous.hotelId);
    const validRates = hotelRates.filter((rate) => rate.hotelId === previous.hotelId && isRateApplicable(rate, checkIn, quotation?.market || ''));
    const rate = preferredHotelRateForDate(validRates, hotel, checkIn);
    const roomRate = preferredHotelRoomRate(rate, previous.roomType, previous.mealPlan);
    const allocation = effectiveHotelAllocation(quotation, previous.roomAllocation, previous.roomAllocationOverride);
    const cost = allocationRateCost(roomRate, allocation, previous.rooms, previous.adults, hotel?.groupRoomLimit, quotation?.childAges);
    return resetHotelAvailability({
      ...previous,
      checkIn,
      checkOut,
      nights: checkOut > checkIn ? nightsBetween(checkIn, checkOut) : 1,
      rateContractId: rate?.id || '',
      supplier: rate?.supplier || '',
      roomType: roomRate?.roomType || '',
      mealPlan: roomRate?.mealPlan || '',
      roomAllocation: allocation,
      rateBreakdown: roomRate || null,
      supplierCost: cost,
      sellingPrice: Math.round(cost * (1 + Number(previous.markup || 0) / 100)),
      currency: rate?.currency || previous.currency || 'THB',
      manualSupplierCost: false,
      manualSellingPrice: false,
    });
  });
  const updateCheckOut = (checkOut) => setForm((previous) => ({
  ...resetHotelAvailability(previous),
  checkOut,
    nights: previous.checkIn && checkOut > previous.checkIn ? nightsBetween(previous.checkIn, checkOut) : 1,
  }));

  const updateHotelAllocation = (field, value) => setForm((previous) => {
    const allocation = {
      ...effectiveHotelAllocation(quotation, previous.roomAllocation, previous.roomAllocationOverride),
      [field]: Math.max(0, Number(value || 0)),
    };
    return resetHotelAvailability({
      ...previous,
      roomAllocation: allocation,
      roomAllocationOverride: true,
      rooms: roomUnits(allocation),
      manualSupplierCost: false,
      manualSellingPrice: false,
    });
  });
  const updateHotelAdults = (value) => setForm((previous) => {
    const adults = value === '' ? '' : Math.max(0, Number(value));
    const currentAllocation = effectiveHotelAllocation(
      quotation,
      previous.roomAllocation,
      previous.roomAllocationOverride,
    );
    const allocation = allocationForAdultCount(currentAllocation, adults);
    return resetHotelAvailability({
      ...previous,
      adults,
      roomAllocation: allocation,
      roomAllocationOverride: true,
      rooms: roomUnits(allocation),
      // Passenger changes should return to the selected hotel's live price
      // contract. A manually-entered price remains editable afterwards.
      manualSupplierCost: false,
      manualSellingPrice: false,
    });
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      // Fetch the active catalogue once and then limit the chooser to the
      // current segment's two endpoints. The endpoint accepts one destination
      // only, which previously meant the departure city's masters were lost.
      apiClient.get('/sightseeing-module'),
      apiClient.get('/activity-masters/restaurants'),
      apiClient.get('/hotel-rates'),
      apiClient.get('/transfer-rates'),
      apiClient.get('/restaurant-rates'),
      apiClient.get('/yachts'),
    ]).then(([sightseeing, restaurants, hotelPriceRows, transferPriceRows, restaurantPriceRows, yachtRows]) => {
      if (!active) return;
      setSightseeingMasters(sightseeing.data.filter((item) => item.status === 'Active'));
      setRestaurantMasters(restaurants.data.filter((item) => item.status === 'Active'));
      setHotelRates(hotelPriceRows.data);
      setTransferRates(transferPriceRows.data);
      setRestaurantRates(restaurantPriceRows.data);
      setYachts(yachtRows.data.filter((item) => item.status === 'Active'));
    }).catch(() => {
      if (!active) return;
      setSightseeingMasters([]);
      setRestaurantMasters([]);
      setHotelRates([]);
      setTransferRates([]);
      setRestaurantRates([]);
      setYachts([]);
    }).finally(() => {
      if (active) setMasterLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (type !== 'Sightseeing' || !form.masterId || !sightseeingMasters.length) return;
    if (destinationSightseeing.some((sightseeing) => sightseeing.id === form.masterId)) return;

    const previouslySelected = sightseeingMasters.find((sightseeing) => sightseeing.id === form.masterId);
    setForm((previous) => ({
      ...previous,
      masterId: '',
      variantId: '',
      variantRateKey: '',
      transferOptionId: '',
      transferVehicle: '',
      transferVehicleSupplierId: '',
      transferVehicleSupplier: '',
      transferSupplierCost: 0,
      transferSellingPrice: 0,
      sightseeingTicketSupplierCost: 0,
      sightseeingTransferVehicleCost: 0,
      sightseeingTicketSellingPrice: 0,
      sightseeingTransferVehicleSellingPrice: 0,
      adultSupplierRate: 0,
      childSupplierRate: 0,
      adultSellingRate: 0,
      childSellingRate: 0,
      supplier: '',
      destination: stayDestination,
      name: previous.name === previouslySelected?.name ? '' : previous.name,
    }));
  }, [destinationSightseeing, form.masterId, sightseeingMasters, stayDestination, type]);

  useEffect(() => {
    if (type !== 'Meal' || !form.masterId || !restaurantMasters.length) return;
    if (restaurantMasters.some((restaurant) => restaurant.id === form.masterId && normalize(restaurant.destination) === normalize(stayDestination))) return;

    const previouslySelected = restaurantMasters.find((restaurant) => restaurant.id === form.masterId);
    setForm((previous) => ({
      ...previous,
      masterId: '',
      rateContractId: '',
      restaurant: '',
      supplier: '',
      mealType: '',
      adultRate: 0,
      childRate: 0,
      adultSellingRate: 0,
      childSellingRate: 0,
      withTransport: false,
      transportVehicle: '',
      transportVehicleSelectionKey: '',
      transportVehicleSelections: [],
      transportVehicleManualSelection: false,
      transportCost: 0,
      transportSelling: 0,
      name: previous.name === `${previous.mealType || 'Meal'} at ${previouslySelected?.name || 'Restaurant'}` ? '' : previous.name,
    }));
  }, [form.masterId, restaurantMasters, stayDestination, type]);

  useEffect(() => {
    // Auto-calculate prices
    // Hotel prices are derived by hotelPricing. Do not call setForm for a
    // hotel here: rate data may load asynchronously and state writes from
    // this effect are what make a modal susceptible to render loops.
    if (type === 'Hotel') return;
    if (type === 'Transfer') {
      // Keep the entered rate as a per-vehicle rate, while storing the quantity-adjusted
      // amounts separately for the service card and quotation totals.
      const quantity = Math.max(1, Number(form.quantity || 1));
      const supplierCost = Number(form.supplierCost || 0);
      const selling = Math.round(supplierCost * (1 + Number(form.markup || 0) / 100));
      const totalSupplierCost = supplierCost * quantity;
      const totalSellingPrice = selling * quantity;
      if (
        selling !== Number(form.sellingPrice || 0)
        || totalSupplierCost !== Number(form.totalSupplierCost || 0)
        || totalSellingPrice !== Number(form.totalSellingPrice || 0)
      ) {
        setForm((previous) => ({ ...previous, sellingPrice: selling, totalSupplierCost, totalSellingPrice }));
      }
    }
    if (type === 'Sightseeing') {
      // A service created through an Itinerary Master explicitly combines the
      // variant ticket and the selected SIC/PVT option. Keep the established
      // transfer-only behaviour for services added directly in the quotation
      // builder.
      const transferOnlyPricing = Boolean(form.transferOptionId) && !form.itineraryMasterTicketPlusTransfer;
      const adultCost = transferOnlyPricing ? 0 : (form.adultSupplierRate || 0) * ((form.adults ?? quotation?.adults ?? ''));
      const childCost = transferOnlyPricing ? 0 : (form.childSupplierRate || 0) * (form.children || 0);
      const totalCost = adultCost + childCost + Number(form.transferSupplierCost || 0);
      const adultSell = transferOnlyPricing ? 0 : (form.adultSellingRate || 0) * ((form.adults ?? quotation?.adults ?? ''));
      const childSell = transferOnlyPricing ? 0 : (form.childSellingRate || 0) * (form.children || 0);
      const totalSell = adultSell + childSell + Number(form.transferSellingPrice || 0);
      set('totalSupplierCost', totalCost);
      set('totalSellingPrice', totalSell);
    }
    if (type === 'Meal') {
      const adults = Number(form.adults ?? quotation?.adults ?? 0);
      const children = Number(form.children ?? quotation?.children ?? 0);
      const markupMultiplier = 1 + Number(form.markup || 0) / 100;
      const adultSellingRate = Math.round(Number(form.adultRate || 0) * markupMultiplier);
      const childSellingRate = Math.round(Number(form.childRate || 0) * markupMultiplier);
      const transportCost = form.withTransport ? Number(form.transportCost || 0) : 0;
      const transportSelling = form.withTransport ? Math.round(transportCost * markupMultiplier) : 0;
      const totalSupplierCost = Number(form.adultRate || 0) * adults + Number(form.childRate || 0) * children + transportCost;
      const totalSellingPrice = adultSellingRate * adults + childSellingRate * children + transportSelling;
      if (
        adultSellingRate !== Number(form.adultSellingRate || 0)
        || childSellingRate !== Number(form.childSellingRate || 0)
        || transportSelling !== Number(form.transportSelling || 0)
        || totalSupplierCost !== Number(form.totalSupplierCost || 0)
        || totalSellingPrice !== Number(form.totalSellingPrice || 0)
      ) {
        setForm((previous) => ({ ...previous, adultSellingRate, childSellingRate, transportSelling, totalSupplierCost, totalSellingPrice }));
      }
    }
    if (type === 'Yacht') {
      const yacht = yachts.find((item) => item.id === form.yachtId);
      const rate = yacht?.rates?.find((item) => item.id === form.yachtRateId && item.status === 'Active');
      const supplierCost = yachtPrice(form, yacht, rate, day?.date);
      const sellingPrice = Math.round(supplierCost * (1 + Number(form.markup || 0) / 100));
      const totalPax = Number(form.adults || 0) + Number(form.children || 0) + Number(form.infants || 0);
      if (supplierCost !== Number(form.supplierCost || 0) || sellingPrice !== Number(form.sellingPrice || 0) || totalPax !== Number(form.totalPax || 0)) {
        setForm((previous) => ({ ...previous, supplierCost, sellingPrice, totalPax }));
      }
    }
  }, [
    form.supplierCost, form.markup, form.adultSupplierRate, form.childSupplierRate,
    form.adults, form.children, form.adultSellingRate, form.childSellingRate, form.transferSupplierCost, form.transferSellingPrice,
    form.rooms, form.roomAllocation, form.roomAllocationOverride, form.nights, form.adultRate, form.childRate, form.transportCost,
    form.transportSelling, form.withTransport, form.totalSupplierCost, form.totalSellingPrice, form.itineraryMasterTicketPlusTransfer,
    form.yachtId, form.yachtRateId, form.season, form.extraHours, form.infants, form.quantity, form.rateBreakdown, form.sellingPrice, form.manualSupplierCost, form.manualSellingPrice, form.hotelId, hotels, yachts, day?.date, type, quotation?.adults, quotation?.children, quotation?.roomAllocation
  ]);

  const handleSave = () => {
    if (type === 'Transfer' && !form.masterId) {
      toast.error('Select a transfer master before adding this service.');
      return;
    }
    if (type === 'Transfer' && !form.rateContractId) {
      toast.error('Select an active transfer price contract before adding this service.');
      return;
    }
    if (type === 'Transfer' && selectedTransferRate?.vehicleCosts?.length && !form.vehicle) {
      toast.error('Select a vehicle from the active transfer price contract before adding this service.');
      return;
    }
    if (type === 'Hotel' && form.hotelId && !form.rateContractId) {
      toast.error('Select an active hotel price contract before adding this stay.');
      return;
    }
    if (type === 'Sightseeing' && form.masterId && (!form.variantId || !form.variantRateKey)) {
      toast.error('Select an active sightseeing variant and its price contract before adding this service.');
      return;
    }
    if (type === 'Sightseeing' && selectedSightseeing && hasSightseeingTimingSchedule && !availableSightseeingSchedule.length) {
      toast.error(`${selectedSightseeing.name} is not available on ${dayName(selectedServiceDate)} (${formatDate(selectedServiceDate)}). Choose another itinerary date.`);
      return;
    }
    if (type === 'Meal' && form.masterId && !form.rateContractId) {
      toast.error('Select an active restaurant price contract before adding this meal.');
      return;
    }
    if (type === 'Guide' && (!form.masterId || !form.guideRateKey)) {
      toast.error('Select an active guide and a timing rate before adding this service.');
      return;
    }
    if (type === 'Yacht') {
      const yacht = yachts.find((item) => item.id === form.yachtId);
      const rate = yacht?.rates?.find((item) => item.id === form.yachtRateId && item.status === 'Active');
      const totalPax = Number(form.adults || 0) + Number(form.children || 0) + Number(form.infants || 0);
      if (!yacht || !rate) { toast.error('Select an active yacht and charter duration.'); return; }
      if (yachtIsBlocked(yacht, day?.date, quotation?.id)) { toast.error('This yacht is already unavailable on the itinerary date.'); return; }
      if (!(yacht.weekdayDays || []).includes(dayName(day?.date)) && !(yacht.weekendDays || []).includes(dayName(day?.date))) { toast.error('This yacht does not operate on the itinerary date.'); return; }
      if (totalPax < 1 || totalPax > Number(yacht.maxCapacity || 0)) { toast.error(`Yacht capacity is ${yacht.maxCapacity} passengers, including children and infants.`); return; }
    }
    if (type === 'Hotel' && (!form.checkIn || !form.checkOut || form.checkOut <= form.checkIn)) {
      toast.error('Choose a check-out date after the check-in date.');
      return;
    }
    if (type === 'Hotel' && ((stayStart && form.checkIn < stayStart) || (latestCheckOut && form.checkOut > latestCheckOut))) {
      toast.error(`Hotel check-out can be selected through the day after ${stayLabel}.`);
      return;
    }
    if (type === 'Hotel' && form.hotelId && !form.manualSupplierCost) {
      const missingNight = hotelNightlyRates.find((night) => !night.available);
      if (missingNight) {
        toast.error(`No active ${form.roomType || 'hotel'} rate is available for ${formatDate(missingNight.date)}. Add an All Days or Weekend rate before saving.`);
        return;
      }
    }
    // Store the itinerary day on the service snapshot too.  The booking
    // conversion already reads the day date, but retaining it here means a
    // yacht keeps its selected quotation date through edits and later flows.
    const { linkedStay: _linkedStay, linkedFromDay: _linkedFromDay, ...formToSave } = form;
    const toSave = { ...formToSave, type, serviceDate: day?.date || form.serviceDate || form.date || '' };
    if (type === 'Hotel') {
      toSave.hotelGroupLimit = selectedHotel?.groupRoomLimit ?? '0';
      if (hotelPricing) {
        toSave.roomAllocation = hotelPricing.allocation;
        toSave.supplierCost = hotelPricing.supplierCost;
        toSave.sellingPrice = hotelPricing.sellingPrice;
        toSave.totalSupplierCost = hotelPricing.totalSupplierCost;
        toSave.totalSellingPrice = hotelPricing.totalSellingPrice;
      }
      if (!form.manualSupplierCost && hotelPricing?.complete) {
        toSave.nightlyRateBreakdown = hotelNightlyRates;
      }
      // A hotel displayed on a later itinerary day belongs to an earlier
      // check-in row. Persist a split instruction instead of changing that
      // entire stay when its room allocation changes from this day onward.
      if (
        applyAllocationFromCurrentDay
        && initialData?.linkedStay
        && day?.date > initialData.checkIn
        && day?.date < initialData.checkOut
        && form.roomAllocationOverride
      ) {
        toSave.splitStayFromDate = day.date;
      }
    }
    if (type === 'Sightseeing') {
      // Retain the itinerary route with this service for booking and supplier
      // workflows, without changing the selected master or price rules.
      toSave.fromDestination = fromDestination;
      toSave.toDestination = stayDestination;
    }
    if (type === 'Flight') {
      const price = Number(form.price || 0);
      toSave.supplierCost = price;
      toSave.sellingPrice = price;
      toSave.totalSupplierCost = price;
      toSave.totalSellingPrice = price;
      toSave.details = `${form.airlineFlight || 'Flight'}${form.fromSector || form.toSector ? ` · ${form.fromSector || '—'} → ${form.toSector || '—'}` : ''}${form.departure || form.arrival ? ` · ${form.departure || '—'} – ${form.arrival || '—'}` : ''}`;
    }
    if (!toSave.name) toSave.name = generateName(type, form);
    onSave(toSave);
  };

  const fmt = (n) => `฿${Number(n || 0).toLocaleString()}`;
  const profit = (form.totalSellingPrice || form.sellingPrice || 0) - (form.totalSupplierCost || form.supplierCost || 0);
  const displayedHotelSupplierCost = hotelPricing?.supplierCost ?? Number(form.supplierCost || 0);
  const displayedHotelSellingPrice = hotelPricing?.sellingPrice ?? Number(form.sellingPrice || 0);
  const displayedHotelTotalCost = hotelPricing?.totalSupplierCost ?? Number(form.totalSupplierCost || 0);
  const displayedHotelTotalSelling = hotelPricing?.totalSellingPrice ?? Number(form.totalSellingPrice || 0);
  const travelDate = type === 'Hotel' ? (form.checkIn || day?.date) : day?.date;
  const market = hotelMarket;
  const destinationHotels = hotels.filter((hotel) => normalize(hotel.destination) === normalize(stayDestination));
  // Hotel selection is price-led: show the first room type and its starting
  // rate in the label, then put the least expensive available hotel first.
  // A hotel without a valid contract stays selectable but is placed last.
  const hotelDropdownOptions = destinationHotels.map((hotel) => {
    const validRates = hotelRates.filter((rate) => rate.hotelId === hotel.id && isRateApplicable(rate, form.checkIn || travelDate, market));
    const rate = preferredHotelRateForDate(validRates, hotel, form.checkIn || travelDate);
    const roomRate = preferredHotelRoomRate(rate, '', '');
    const price = roomTypeStartingPrice(roomRate);
    const currency = rate?.currency || form.currency || 'THB';
    return {
      id: hotel.id,
      price,
      hasPrice: Boolean(roomRate && price > 0),
      label: roomRate
        ? `${hotel.name} — ${roomRate.roomType || 'Room'}${roomRate.mealPlan ? ` · ${roomRate.mealPlan}` : ''} — ${hotelRateCurrency(currency)}${price.toLocaleString()}`
        : `${hotel.name} — No valid price`,
    };
  }).sort((left, right) => (
    Number(right.hasPrice) - Number(left.hasPrice)
    || (left.hasPrice ? left.price - right.price : 0)
    || left.label.localeCompare(right.label)
  ));
  const hotelPricingDates = hotelStayDates(
    form.checkIn || travelDate,
    form.checkOut || nextCalendarDate(form.checkIn || travelDate),
  );
  // The contract picker must include a Weekend contract even when check-in is
  // a weekday: the selected Weekend contract is paired with All Days for the
  // weekday nights of the same stay.
  const rawApplicableHotelRates = hotelRates.filter((rate) => (
    rate.hotelId === form.hotelId
    && (hotelPricingDates.length ? hotelPricingDates.some((date) => isRateApplicable(rate, date, market)) : isRateApplicable(rate, form.checkIn || travelDate, market))
  ));
  const applicableHotelRates = [...rawApplicableHotelRates].sort((left, right) => {
    const rank = (rate) => normalize(rate?.priceType) === 'all days' ? 0 : normalize(rate?.priceType) === 'weekends' ? 1 : 2;
    return rank(left) - rank(right) || String(left.id || '').localeCompare(String(right.id || ''));
  });
  const selectedHotelRate = applicableHotelRates.find((rate) => rate.id === form.rateContractId);
  const selectedRateRoomTypes = (selectedHotelRate?.roomRates || []).map((item) => item.roomType).filter(Boolean);
  const contractRoomTypes = (selectedHotelRate ? selectedRateRoomTypes : applicableHotelRates.flatMap((rate) => (rate.roomRates || []).map((item) => item.roomType))).filter(Boolean);
  // Once a price contract is selected, only its room types may be selected;
  // otherwise changing the room could leave the prior room's price attached.
  // The hotel-master labels remain a fallback before a contract is selected.
  const selectedHotelRoomTypes = [...new Set(selectedRateRoomTypes.length
    ? selectedRateRoomTypes
    : [...contractRoomTypes, ...hotelRoomTypes(selectedHotel)])];
  const transferServiceType = String(form.basis || '').toUpperCase() === 'SIC' ? 'SIC' : 'PVT';
  const availableTransferMasters = useMemo(() => {
    const seen = new Set();
    return [...transferMasters, ...createdTransferMasters].filter((transfer) => {
      if (!transfer?.id || seen.has(transfer.id)) return false;
      seen.add(transfer.id);
      if (transfer.status === 'Inactive') return false;
      const route = transferRouteEndpoints(transfer);
      const belongsToCurrentSegment = [
        transfer.destination,
        transfer.fromDestination,
        transfer.toDestination,
        route.origin,
        route.destination,
      ].some(isInCurrentSegment);
      // Keep an already-saved transfer selectable while editing, even if the
      // itinerary route was changed after the service was added.
      return belongsToCurrentSegment || transfer.id === form.masterId;
    });
  }, [createdTransferMasters, form.masterId, isInCurrentSegment, segmentDestinationKeys, transferMasters]);
  const availableAirports = useMemo(() => {
    const seen = new Set();
    return [...airportMasters, ...createdAirports].filter((airport) => {
      if (!airport?.id || seen.has(airport.id)) return false;
      seen.add(airport.id);
      return true;
    });
  }, [airportMasters, createdAirports]);
  const airportOptions = availableAirports.map((airport) => ({
    value: airport.id,
    label: `${airport.iataCode ? `${airport.iataCode} · ` : ''}${airport.name}${airport.city ? ` · ${airport.city}` : ''}`,
  }));
  const chooseAirport = (field, airportId) => {
    const airport = availableAirports.find((item) => item.id === airportId);
    const sector = airport ? `${airport.iataCode ? `${airport.iataCode} · ` : ''}${airport.name}${airport.city ? ` · ${airport.city}` : ''}` : '';
    const isFrom = field === 'from';
    setForm((previous) => ({
      ...previous,
      [isFrom ? 'fromAirportId' : 'toAirportId']: airportId,
      [isFrom ? 'fromSector' : 'toSector']: sector,
      [isFrom ? 'origin' : 'destination']: sector,
    }));
  };
  const applicableTransferRates = transferRates.filter((rate) => rate.transferId === form.masterId && rate.serviceType === transferServiceType && isRateApplicable(rate, travelDate, market));
  const selectedTransferRate = applicableTransferRates.find((rate) => rate.id === form.rateContractId);
  const selectedTransferFleet = selectedVehicleFleet(
    selectedTransferRate?.vehicleCosts,
    form,
    quotation,
    'vehicleSelectionKey',
    'vehicleSelections',
    'vehicleManualSelection',
  );
  const allTransferSupplierOptions = suppliers.filter((supplier) => {
    const types = Array.isArray(supplier.type) ? supplier.type : [supplier.type];
    return supplier.status !== 'Inactive' && types.some((item) => String(item || '').toLowerCase() === 'transfer');
  }).map((supplier) => supplier.name);
  const transferSupplierOptions = selectedTransferRate?.supplier ? [selectedTransferRate.supplier] : [];
  const draftVehicleOptions = vehicleMasters.filter((vehicle) => vehicle.status !== 'Inactive' && vehicle.vehicleType === transferDraft.serviceType);
  const selectedSightseeing = destinationSightseeing.find((item) => item.id === form.masterId);
  const selectedSightseeingSuppliers = [...new Map(
    [...(Array.isArray(selectedSightseeing?.suppliers) ? selectedSightseeing.suppliers : []), selectedSightseeing?.supplier]
      .filter(Boolean)
      .map((linkedSupplier) => {
        const linkedId = linkedSupplier?.id || linkedSupplier?._id || linkedSupplier;
        const supplier = suppliers.find((item) => String(item?.id || item?._id) === String(linkedId))
          || (typeof linkedSupplier === 'object' ? linkedSupplier : null);
        return [String(supplier?.id || supplier?._id || supplier?.name || ''), supplier];
      })
      .filter(([, supplier]) => supplier && supplier.status !== 'Inactive')
  ).values()];
  const selectedServiceDate = day?.date || form.serviceDate || form.date || segment?.fromDate || quotation?.travelDate;
  const availableSightseeingSchedule = sightseeingScheduleForDate(selectedSightseeing, selectedServiceDate);
  const hasSightseeingTimingSchedule = Boolean((selectedSightseeing?.showTimings || []).some((timing) => timing?.time || timing?.openingTime || timing?.closingTime || (timing?.days || []).length));
  const availableSightseeingTimings = sightseeingTimingSlots(selectedSightseeing, selectedServiceDate);
  const selectedVariant = selectedSightseeing?.variants?.find((item) => item.id === form.variantId);
  const dateApplicableVariantRates = (selectedVariant?.rates || []).filter((rate) => isRateApplicable({ ...rate, status: 'Active' }, travelDate, ''));
  const marketApplicableVariantRates = dateApplicableVariantRates.filter((rate) => !market || !rate.market || normalize(rate.market) === normalize(market));
  // A rate dedicated to the quotation market is always preferred. If one has not
  // been created, a current date-valid contract remains selectable instead of
  // hiding the only saved price and leaving the service unquotable.
  const variantRateUsesMarketFallback = Boolean(market && dateApplicableVariantRates.length && !marketApplicableVariantRates.length);
  const applicableVariantRates = marketApplicableVariantRates.length ? marketApplicableVariantRates : dateApplicableVariantRates;
  const selectedVariantRate = applicableVariantRates.find((rate, index) => (rate.id || `${rate.fromDate}-${rate.toDate}-${index}`) === form.variantRateKey);
  const selectedSightseeingTransfer = (selectedSightseeing?.transfers || []).find((item) => item.id === form.transferOptionId);
  const selectedSightseeingTransferFleet = selectedSightseeingTransfer?.type === 'Ticket Only' ? null : selectedVehicleFleet(
    selectedSightseeingTransfer?.vehicleCosts,
    form,
    quotation,
    'transferVehicleSelectionKey',
    'transferVehicleSelections',
    'transferVehicleManualSelection',
  );
  const destinationRestaurants = restaurantMasters.filter((restaurant) => normalize(restaurant.destination) === normalize(stayDestination));
  const selectedRestaurant = destinationRestaurants.find((restaurant) => restaurant.id === form.masterId);
  const dateApplicableRestaurantRates = restaurantRates.filter((rate) => rate.restaurantId === form.masterId && isRateApplicable(rate, travelDate, ''));
  const marketApplicableRestaurantRates = dateApplicableRestaurantRates.filter((rate) => !market || !rate.market || normalize(rate.market) === normalize(market));
  const applicableRestaurantRates = marketApplicableRestaurantRates.length ? marketApplicableRestaurantRates : dateApplicableRestaurantRates;
  const restaurantMealTypes = [...new Set(applicableRestaurantRates.map((rate) => String(rate.mealType || '').trim()).filter(Boolean))];
  const mealApplicableRestaurantRates = applicableRestaurantRates.filter((rate) => !form.mealType || normalize(rate.mealType) === normalize(form.mealType));
  const selectedRestaurantRate = mealApplicableRestaurantRates.find((rate) => rate.id === form.rateContractId);
  const selectedMealTransportFleet = selectedVehicleFleet(
    selectedRestaurantRate?.vehicleCosts,
    form,
    quotation,
    'transportVehicleSelectionKey',
    'transportVehicleSelections',
    'transportVehicleManualSelection',
  );
  const destinationGuides = guideMasters.filter((guide) => (guide.destinations || []).some((destination) => normalize(destination?.name || destination) === normalize(stayDestination)));
  const selectedGuide = destinationGuides.find((guide) => guide.id === form.masterId);
  const selectedGuideRates = activeGuideRates(selectedGuide);
  const selectedGuideRate = selectedGuideRates.find((rate, index) => guideRateKey(rate, index) === form.guideRateKey);
  const selectedGuideLanguage = GUIDE_LANGUAGE_OPTIONS.find((item) => item.value === form.guideLanguage) || GUIDE_LANGUAGE_OPTIONS[0];
  const selectedGuideUnitCost = Number(selectedGuideRate?.[selectedGuideLanguage.costField] || 0);
  const destinationYachts = yachts.filter((yacht) => isInCurrentSegment(yacht.destination));
  // Ferry classes are currently global masters. This keeps those shared
  // classes available, while respecting either endpoint when destination data
  // is present on a future ferry master.
  const destinationFerryClasses = ferryClassMasters.filter((ferryClass) => {
    const ferryDestination = ferryClass.destination || ferryClass.fromDestination || ferryClass.toDestination || ferryClass.location;
    return !ferryDestination || isInCurrentSegment(ferryDestination);
  });
  const selectedYacht = yachts.find((yacht) => yacht.id === form.yachtId);
  const selectedYachtRates = (selectedYacht?.rates || []).filter((rate) => rate.status === 'Active');
  const selectedYachtRate = selectedYachtRates.find((rate) => rate.id === form.yachtRateId);
  const yachtDay = dayName(day?.date);
  const yachtOperatesOnDay = !selectedYacht || (selectedYacht.weekdayDays || []).includes(yachtDay) || (selectedYacht.weekendDays || []).includes(yachtDay);
  const yachtTotalPax = Number(form.adults || 0) + Number(form.children || 0) + Number(form.infants || 0);
  const yachtSuppliers = suppliers.filter((supplier) => {
    const types = Array.isArray(supplier.type) ? supplier.type : [supplier.type];
    return supplier.status !== 'Inactive' && types.some((item) => String(item || '').toLowerCase() === 'yacht');
  });
  const selectedYachtSupplierIds = new Set((selectedYacht?.supplierIds || []).map((id) => String(id)));
  const selectedYachtSuppliers = yachtSuppliers.filter((supplier) => selectedYachtSupplierIds.has(String(supplier.id || supplier._id)));

  useEffect(() => {
    if (type !== 'Sightseeing') return;
    if (!selectedSightseeingTransfer) return;
    // A consultant's explicit fleet split must survive passenger-count edits.
    if (form.transferVehicleManualSelection) return;
    const isTicketOnly = selectedSightseeingTransfer.type === 'Ticket Only';
    const partySize = transferPartySize(form, quotation);
    const suggestedCombination = isTicketOnly ? null : selectedVehicleCombination(selectedSightseeingTransfer.vehicleCosts, form, quotation, 'transferVehicleSelectionKey');
    const expectedBasis = isTicketOnly ? 'Ticket Only' : selectedSightseeingTransfer.type === 'SIC' ? 'Sic' : 'Private';
    if (
      form.transferVehicleSelectionKey === (isTicketOnly ? '' : suggestedCombination?.key || '')
      && Number(form.transferVehicleAutoSelectedForPax || 0) === partySize
      && form.basis === expectedBasis
      && form.transferOptionType === selectedSightseeingTransfer.type
    ) return;
    setForm((previous) => ({
      ...previous,
      basis: expectedBasis,
      transferOptionType: selectedSightseeingTransfer.type,
      transferVehicle: isTicketOnly ? '' : suggestedCombination?.key || '',
      transferVehicleName: isTicketOnly ? '' : suggestedCombination?.label || '',
      transferVehicleSelectionKey: isTicketOnly ? '' : suggestedCombination?.key || '',
      transferVehicleSelections: isTicketOnly ? [] : suggestedCombination?.entries || [],
      transferVehicleTotalCapacity: isTicketOnly ? 0 : suggestedCombination?.totalCapacity || 0,
      transferVehicleAutoSelectedForPax: partySize,
      transferVehicleManualSelection: false,
      transferVehicleSupplierId: isTicketOnly ? '' : previous.transferVehicleSupplierId,
      transferVehicleSupplier: isTicketOnly ? '' : previous.transferVehicleSupplier,
    }));
  }, [form.adults, form.children, form.infants, form.basis, form.transferVehicleSelectionKey, form.transferVehicleAutoSelectedForPax, form.transferVehicleManualSelection, quotation, selectedSightseeingTransfer, type]);

  useEffect(() => {
    if (type !== 'Sightseeing') return;
    const transferPricing = sightseeingTransferPricing(selectedSightseeingTransfer, form, quotation);
    const adults = Number(form.adults ?? quotation?.adults ?? 0);
    const children = Number(form.children ?? quotation?.children ?? 0);
    const itineraryTicketPlusTransfer = Boolean(form.itineraryMasterTicketPlusTransfer);
    const ticketSupplierCost = itineraryTicketPlusTransfer
      ? Number(form.adultSupplierRate || 0) * adults + Number(form.childSupplierRate || 0) * children
      : transferPricing.passengerCost;
    const ticketSellingPrice = itineraryTicketPlusTransfer
      ? Number(form.adultSellingRate || 0) * adults + Number(form.childSellingRate || 0) * children
      : transferPricing.passengerSellingPrice;
    if (
      transferPricing.supplierCost !== Number(form.transferSupplierCost || 0)
      || transferPricing.sellingPrice !== Number(form.transferSellingPrice || 0)
      || ticketSupplierCost !== Number(form.sightseeingTicketSupplierCost || 0)
      || transferPricing.vehicleCost !== Number(form.sightseeingTransferVehicleCost || 0)
      || ticketSellingPrice !== Number(form.sightseeingTicketSellingPrice || 0)
      || transferPricing.vehicleSellingPrice !== Number(form.sightseeingTransferVehicleSellingPrice || 0)
    ) {
      setForm((previous) => ({
        ...previous,
        transferSupplierCost: transferPricing.supplierCost,
        transferSellingPrice: transferPricing.sellingPrice,
        sightseeingTicketSupplierCost: ticketSupplierCost,
        sightseeingTransferVehicleCost: transferPricing.vehicleCost,
        sightseeingTicketSellingPrice: ticketSellingPrice,
        sightseeingTransferVehicleSellingPrice: transferPricing.vehicleSellingPrice,
      }));
    }
  }, [form.adults, form.children, form.markup, form.transferOptionId, form.transferVehicle, form.transferSupplierCost, form.transferSellingPrice, form.sightseeingTicketSupplierCost, form.sightseeingTransferVehicleCost, form.sightseeingTicketSellingPrice, form.sightseeingTransferVehicleSellingPrice, quotation?.adults, quotation?.children, selectedSightseeingTransfer, type]);

  useEffect(() => {
    if (type !== 'Transfer' || !selectedTransferRate || !(selectedTransferRate.vehicleCosts || []).length) return;
    if (form.vehicleManualSelection) return;
    const partySize = transferPartySize(form, quotation);
    // Recalculate when passenger counts change. A consultant may still pick a
    // different valid fleet for the current party in the selector below.
    if (Number(form.vehicleAutoSelectedForPax || 0) === partySize && form.vehicleSelectionKey) return;
    setForm((previous) => ({ ...previous, ...transferRateValues(previous, selectedTransferRate, quotation) }));
  }, [form.adults, form.children, form.infants, form.vehicleSelectionKey, form.vehicleAutoSelectedForPax, form.vehicleManualSelection, quotation, selectedTransferRate, type]);

  useEffect(() => {
    if (type !== 'Guide' || !selectedGuideRate) return;
    const quantity = Math.max(1, Number(form.quantity || 1));
    const sellingPrice = Math.round(selectedGuideUnitCost * (1 + Number(form.markup || 0) / 100));
    const totalSupplierCost = selectedGuideUnitCost * quantity;
    const totalSellingPrice = sellingPrice * quantity;
    if (
      selectedGuideUnitCost !== Number(form.supplierCost || 0)
      || sellingPrice !== Number(form.sellingPrice || 0)
      || totalSupplierCost !== Number(form.totalSupplierCost || 0)
      || totalSellingPrice !== Number(form.totalSellingPrice || 0)
    ) {
      setForm((previous) => ({ ...previous, supplierCost: selectedGuideUnitCost, sellingPrice, totalSupplierCost, totalSellingPrice }));
    }
  }, [form.guideLanguage, form.markup, form.quantity, form.sellingPrice, form.supplierCost, form.totalSellingPrice, form.totalSupplierCost, selectedGuideRate, selectedGuideUnitCost, type]);

  const selectTransferMaster = (id, transfer = availableTransferMasters.find((item) => item.id === id)) => {
    const matchingRates = transferRates.filter((rate) => (
      rate.transferId === id
      && rate.serviceType === transferServiceType
      && isRateApplicable(rate, travelDate, market)
    ));
    const automaticRate = matchingRates.length === 1 ? matchingRates[0] : null;
    const route = transferRouteEndpoints(transfer);
    setForm((previous) => {
      const reset = {
        ...previous,
        masterId: id,
        rateContractId: '',
        vehicle: '',
        vehicleId: '',
        vehicleName: '',
        vehicleSelectionKey: '',
        vehicleSelections: [],
        vehicleTotalCapacity: 0,
        vehicleAutoSelectedForPax: 0,
        vehicleManualSelection: false,
        supplier: '',
        supplierCost: 0,
        sellingPrice: 0,
        totalSupplierCost: 0,
        totalSellingPrice: 0,
        adultTransferCost: 0,
        childTransferCost: 0,
        name: transfer?.name || previous.name,
        masterDescription: transfer?.description || previous.masterDescription || '',
        description: transfer?.description || previous.description || '',
        termsHtml: transfer?.termsHtml || previous.termsHtml || '',
        origin: route.origin || previous.origin,
        destination: route.destination || readableValue(transfer?.destination) || previous.destination,
      };
      return automaticRate ? { ...reset, ...transferRateValues(reset, automaticRate, quotation) } : reset;
    });
  };
  const openTransferCreator = () => {
    const serviceDate = travelDate || todayIsoInTimeZone();
    setTransferDraft({
      name: '', destination: stayDestination || '', duration: '', timing: '', operatingDays: ['All'], description: '', usefulInformation: '',
      supplier: '', fromDate: serviceDate, toDate: serviceDate, serviceType: transferServiceType, currency: 'THB', adultCost: '', childCost: '', vehicleCosts: [],
    });
    setShowTransferCreator(true);
  };
  const setDraft = (key, value) => setTransferDraft((current) => ({ ...current, [key]: value }));
  const setDraftVehicleCost = (vehicle, cost) => setTransferDraft((current) => ({
    ...current,
    vehicleCosts: [...(current.vehicleCosts || []).filter((row) => row.vehicleId !== vehicle.id), { vehicleId: vehicle.id, vehicleName: vehicle.name, capacity: Number(vehicle.transferCapacity || 0), cost }],
  }));
  const draftVehicleCost = (vehicle) => transferDraft.vehicleCosts?.find((row) => row.vehicleId === vehicle.id)?.cost ?? '';
  const createTransferAndRate = async () => {
    const selectedVehicleCosts = draftVehicleOptions
      .filter((vehicle) => draftVehicleCost(vehicle) !== '')
      .map((vehicle) => ({ vehicle: vehicle.id, capacity: Number(vehicle.transferCapacity || 0), cost: Number(draftVehicleCost(vehicle)) }));
    if (!transferDraft.name?.trim() || !transferDraft.destination || !transferDraft.supplier || !transferDraft.fromDate || !transferDraft.toDate || !transferDraft.currency) {
      toast.error('Complete the transfer name, destination, supplier, validity dates, and currency.');
      return;
    }
    if (transferDraft.toDate < transferDraft.fromDate) { toast.error('Transfer price valid-to date cannot be before its valid-from date.'); return; }
    if (selectedVehicleCosts.length === 0) { toast.error(`Enter a price for at least one active ${transferDraft.serviceType} vehicle.`); return; }
    setCreatingTransfer(true);
    try {
      const master = (await apiClient.post('/operations-masters/transfers', {
        name: transferDraft.name.trim(), destination: transferDraft.destination, duration: transferDraft.duration, timing: transferDraft.timing,
        operatingDays: transferDraft.operatingDays, description: transferDraft.description, usefulInformation: transferDraft.usefulInformation, status: 'Active',
      })).data;
      const rate = (await apiClient.post('/transfer-rates', {
        transfer: master.id, supplier: transferDraft.supplier, fromDate: transferDraft.fromDate, toDate: transferDraft.toDate,
        serviceType: transferDraft.serviceType, currency: transferDraft.currency, adultCost: transferDraft.serviceType === 'SIC' ? Number(transferDraft.adultCost || 0) : undefined,
        childCost: transferDraft.serviceType === 'SIC' ? Number(transferDraft.childCost || 0) : undefined, vehicleCosts: selectedVehicleCosts, status: 'Active',
      })).data;
      setCreatedTransferMasters((current) => [...current, master]);
      setTransferRates((current) => [rate, ...current]);
      selectTransferMaster(master.id, master);
      setForm((previous) => ({ ...previous, rateContractId: rate.id, serviceType: rate.serviceType, basis: rate.serviceType === 'SIC' ? 'Sic' : 'Private', supplier: rate.supplier, currency: rate.currency, adultTransferCost: Number(rate.adultCost || 0), childTransferCost: Number(rate.childCost || 0) }));
      setShowTransferCreator(false);
      toast.success('Transfer master and its active price contract were created. Select a vehicle to quote it.');
    } catch (error) {
      toast.error(error.message || 'Could not create the transfer and price contract.');
    } finally { setCreatingTransfer(false); }
  };
  const createAirport = async () => {
    if (!airportDraft.name?.trim() || !airportDraft.city?.trim() || !airportDraft.country?.trim()) {
      toast.error('Complete the airport name, city, and country.');
      return;
    }
    setCreatingAirport(true);
    try {
      const airport = (await apiClient.post('/operations-masters/airports', {
        ...airportDraft,
        name: airportDraft.name.trim(), city: airportDraft.city.trim(), country: airportDraft.country.trim(),
        iataCode: airportDraft.iataCode.trim().toUpperCase(), icaoCode: airportDraft.icaoCode.trim().toUpperCase(), status: 'Active',
      })).data;
      setCreatedAirports((current) => [...current, airport]);
      setShowAirportCreator(false);
      setAirportDraft({ name: '', city: '', country: 'Thailand', iataCode: '', icaoCode: '', airportType: 'International', timezone: 'Asia/Bangkok' });
      toast.success('Airport added to Airport Master.');
    } catch (error) {
      toast.error(error.message || 'Could not create the airport.');
    } finally { setCreatingAirport(false); }
  };

  return (
    <div className="space-y-2.5 [&_.space-y-4>*+*]:!mt-2.5 [&_.space-y-3>*+*]:!mt-2 [&_.gap-4]:!gap-x-3 [&_.gap-4]:!gap-y-2 [&_.form-input]:!h-8 [&_.form-select]:!h-8 [&_.form-input]:!py-0 [&_.form-select]:!py-0 [&_.form-input]:!text-xs [&_.form-select]:!text-xs [&_textarea.form-input]:!h-auto [&_textarea.form-input]:!py-1.5 [&_.form-label]:!mb-0.5 [&_.form-label]:!text-[10px] [&_.p-4]:!p-2.5 [&_button.py-2]:!py-1 [&_button.text-sm]:!text-xs">
      <SectionTitle>Service details</SectionTitle>
      {/* Common fields */}
      {type !== 'Flight' && <div>
        <label className="form-label">Service Name / Description</label>
        <input type="text" value={form.name || ''} onChange={e => set('name', e.target.value)} className="form-input" placeholder={`Enter ${type} name...`} />
      </div>}

      {/* Flight — airport sectors are saved from the live Airport Master. */}
      {type === 'Flight' && (
        <div className="space-y-4">
          <div>
            <label className="form-label">Airline / Flight No.</label>
            <input type="text" value={form.airlineFlight || ''} onChange={(event) => set('airlineFlight', event.target.value)} className="form-input" placeholder="e.g. Thai Airways TG 102" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="form-label">From Sector</label>
              <SearchableSelect value={form.fromAirportId || ''} onChange={(value) => chooseAirport('from', value)} options={airportOptions} placeholder="Select airport" />
            </div>
            <div>
              <label className="form-label">To Sector</label>
              <SearchableSelect value={form.toAirportId || ''} onChange={(value) => chooseAirport('to', value)} options={airportOptions} placeholder="Select airport" />
            </div>
          </div>
          <button type="button" onClick={() => setShowAirportCreator(true)} className="text-xs font-semibold text-primary-600 hover:text-primary-700">+ Create airport</button>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="form-label">Departure</label>
              <input type="time" value={form.departure || ''} onChange={(event) => set('departure', event.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Arrival</label>
              <input type="time" value={form.arrival || ''} onChange={(event) => set('arrival', event.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Price</label>
              <input type="number" min="0" step="0.01" value={form.price ?? ''} onChange={(event) => set('price', event.target.value === '' ? '' : Number(event.target.value))} className="form-input" placeholder="THB 0" />
            </div>
          </div>
        </div>
      )}

      {/* Transfer */}
      {type === 'Transfer' && (
        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="form-label mb-0">Transfer Master</label>
              <button type="button" onClick={openTransferCreator} className="text-xs font-semibold text-primary-600 hover:text-primary-700">+ Create transfer & rate</button>
            </div>
            <SearchableSelect value={form.masterId || ''} onChange={selectTransferMaster} options={availableTransferMasters.map((transfer) => ({ value: transfer.id, label: `${transfer.name}${transfer.destination ? ` · ${readableValue(transfer.destination)}` : ''}` }))} placeholder={segmentDestinations.length ? 'Select transfer for this itinerary segment' : 'Select active transfer master'} />
            {segmentDestinations.length > 0 && <p className="mt-1 text-xs text-slate-500">Showing transfers for this itinerary segment: {segmentDestinations.join(' · ')}.</p>}
            <p className="mt-1 text-xs text-slate-500">Search an existing transfer, or create its master and active price contract without leaving this quotation.</p>
          </div>
          <MasterRateNotice loading={masterLoading} hasMaster={Boolean(form.masterId)} rates={applicableTransferRates} label="transfer price" market={market} date={travelDate} />
          {applicableTransferRates.length > 0 && (
            <div>
              <label className="form-label">Transfer Price Contract</label>
              <SearchableSelect value={form.rateContractId || ''} onChange={(id) => {
                const rate = applicableTransferRates.find(item => item.id === id);
                setForm((previous) => ({ ...previous, ...transferRateValues(previous, rate, quotation) }));
              }} options={applicableTransferRates.map((rate) => ({ value: rate.id, label: `${rate.id} · ${rate.supplier} · ${rate.serviceType} · ${rate.currency}` }))} sortOptions={false} placeholder="Select a valid transfer price" />
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
            <div>
              <label className="form-label">Origin</label>
              <input type="text" value={form.origin || ''} onChange={e => set('origin', e.target.value)} className="form-input" placeholder="e.g. Phuket Airport" />
            </div>
            <div>
              <label className="form-label">Destination</label>
              <input type="text" value={form.destination || ''} onChange={e => set('destination', e.target.value)} className="form-input" placeholder="e.g. Hotel" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
            <div>
              <label className="form-label">Basis</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {['Private', 'Sic'].map(b => (
                  <button type="button" key={b} onClick={() => setForm((prev) => ({ ...prev, basis: b, rateContractId: '', vehicle: '', supplierCost: 0, sellingPrice: 0, totalSupplierCost: 0, totalSellingPrice: 0, adultTransferCost: 0, childTransferCost: 0 }))} className={`flex-1 py-2 text-sm font-medium ${(b === 'Sic' ? transferServiceType === 'SIC' : transferServiceType === 'PVT') ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{b}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Suggested vehicle combination *</label>
              <SearchableSelect value={form.vehicleManualSelection ? '' : form.vehicle || ''} isDisabled={!selectedTransferRate || !(selectedTransferRate.vehicleCosts || []).length} onChange={(id) => {
                setForm((previous) => ({
                  ...previous,
                  ...transferRateValues({ ...previous, vehicleSelectionKey: id }, selectedTransferRate, quotation, { manual: false }),
                }));
              }} options={vehicleCombinationOptions(selectedTransferRate?.vehicleCosts, transferPartySize(form, quotation)).map((combination) => ({ value: combination.key, label: `${combination.label} · ${combination.totalCapacity} Pax${hidePricing ? '' : ` · ${fmt(combination.totalCost)}`}` }))} sortOptions={false} placeholder={selectedTransferRate ? 'Select vehicle combination from price contract' : 'Select a transfer price contract first'} />
              {selectedTransferFleet?.label && <p className="mt-1 text-xs text-slate-500">{form.vehicleManualSelection ? 'Manual fleet:' : `Auto-selected for ${transferPartySize(form, quotation)} adults:`} {selectedTransferFleet.label} · {selectedTransferFleet.totalCapacity} seats.</p>}
              {selectedTransferRate?.serviceType === 'SIC' && !hidePricing && <p className="mt-1 text-xs text-slate-500">Passenger rates: Adult {fmt(selectedTransferRate.adultCost)} · Child {fmt(selectedTransferRate.childCost)}. Vehicle cost is added to the passenger total.</p>}
            </div>
          </div>
          <VehicleFleetEditor
            vehicleCosts={selectedTransferRate?.vehicleCosts}
            selections={selectedTransferFleet?.entries || []}
            disabled={!selectedTransferRate || !(selectedTransferRate.vehicleCosts || []).length}
            fmt={fmt}
            onChange={(selections) => setForm((previous) => ({
              ...previous,
              ...manualTransferRateValues(previous, selectedTransferRate, quotation, selections),
            }))}
          />
          <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
            <div>
              <label className="form-label">Supplier</label>
              <SearchableSelect value={form.supplier || ''} onChange={value => set('supplier', value)} options={transferSupplierOptions} isDisabled={Boolean(selectedTransferRate)} placeholder={selectedTransferRate ? 'Supplier set by selected price contract' : 'Select a transfer price contract first'} />
            </div>
            <div>
              <label className="form-label">Quantity</label>
              <input type="number" value={form.quantity || 1} onChange={e => set('quantity', Number(e.target.value))} className="form-input" min="1" />
            </div>
          </div>
          <PricingFields form={form} set={set} fmt={fmt} profit={profit} defaultMarkup={defaultMarkup} unitPricing quantity={form.quantity} hidePricing={hidePricing} />
        </div>
      )}

      {/* Sightseeing */}
      {type === 'Sightseeing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
            <label>
              <span className="form-label">From Destination</span>
              <input value={fromDestination || 'Not set'} readOnly className="form-input bg-slate-50 text-slate-600" />
            </label>
            <label>
              <span className="form-label">To Destination</span>
              <input value={stayDestination || 'Not set'} readOnly className="form-input bg-slate-50 text-slate-600" />
            </label>
          </div>
          <div>
            <label className="form-label">Sightseeing Master</label>
            <select value={form.masterId || ''} disabled={!segmentDestinations.length || masterLoading} onChange={e => {
              const sightseeing = destinationSightseeing.find(item => item.id === e.target.value);
              const firstSupplier = sightseeing?.suppliers?.[0] || sightseeing?.supplier;
              const timings = sightseeingTimingSlots(sightseeing, selectedServiceDate);
              const masterDescription = sightseeing?.details || sightseeing?.description || '';
              setForm(prev => ({ ...prev, masterId: e.target.value, variantId: '', variantRateKey: '', transferOptionId: '', transferVehicle: '', transferVehicleSupplierId: '', transferVehicleSupplier: '', transferVehicleSelections: [], transferVehicleManualSelection: false, transferSupplierCost: 0, transferSellingPrice: 0, sightseeingTicketSupplierCost: 0, sightseeingTransferVehicleCost: 0, sightseeingTicketSellingPrice: 0, sightseeingTransferVehicleSellingPrice: 0, adultSupplierRate: 0, childSupplierRate: 0, adultSellingRate: 0, childSellingRate: 0, time: timings.length === 1 ? timings[0] : '', fromTime: '', toTime: '', dropUpTime: '', name: sightseeing?.name || prev.name, destination: sightseeing?.destination || prev.destination, supplier: firstSupplier?.name || '', masterDescription, description: masterDescription, termsHtml: sightseeing?.termsHtml || '', image: null, imageUrl: '', variantImage: null }));
            }} className="form-select">
              <option value="">{!segmentDestinations.length ? 'Select itinerary destinations first' : masterLoading ? 'Loading sightseeing...' : `Select active sightseeing in ${segmentDestinations.join(' or ')}`}</option>
              {destinationSightseeing.map(sightseeing => <option key={sightseeing.id} value={sightseeing.id}>{sightseeing.name}</option>)}
            </select>
            {!masterLoading && segmentDestinations.length > 0 && destinationSightseeing.length === 0 && <p className="mt-1 text-xs text-amber-700">No active sightseeing is available in {segmentDestinations.join(' or ')}. Add it in the Sightseeing Master first.</p>}
          </div>
          {form.masterId && (
            <div>
              <label className="form-label">Show Timing</label>
              {availableSightseeingSchedule.length ? (
                <>
                  {availableSightseeingTimings.length ? (
                    <select value={form.time || ''} onChange={e => set('time', e.target.value)} className="form-select">
                      <option value="">No specific show time</option>
                      {availableSightseeingTimings.map((timing) => <option key={timing} value={timing}>{timing}</option>)}
                    </select>
                  ) : null}
                  <div className="mt-1 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                    Available on {dayName(selectedServiceDate)}: {availableSightseeingSchedule.map((timing) => `${timing.time || 'No specific show time'}${timing.openingTime || timing.closingTime ? ` (Open ${timing.openingTime || '—'} – Close ${timing.closingTime || '—'})` : ''}`).join(' · ')}
                  </div>
                </>
              ) : (
                <div className={`rounded-lg border px-3 py-2 text-xs ${hasSightseeingTimingSchedule ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                  {hasSightseeingTimingSchedule
                    ? `${selectedSightseeing?.name || 'This sightseeing'} is not available on ${dayName(selectedServiceDate)} (${formatDate(selectedServiceDate)}).`
                    : `No show timing has been configured for this sightseeing service on ${formatDate(selectedServiceDate)}.`}
                </div>
              )}
            </div>
          )}
          {form.masterId && (
            <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
              <div>
                <label className="form-label">Variant</label>
                <select value={form.variantId || ''} onChange={e => {
                  const variant = selectedSightseeing?.variants?.find((item) => item.id === e.target.value);
                  const dateValidRates = (variant?.rates || []).filter((rate) => isRateApplicable({ ...rate, status: 'Active' }, travelDate, ''));
                  const marketRates = dateValidRates.filter((rate) => !market || !rate.market || normalize(rate.market) === normalize(market));
                  const rate = (marketRates.length ? marketRates : dateValidRates)[0];
                  const rateKey = rate?.id || (rate ? `${rate.fromDate}-${rate.toDate}-0` : '');
                  const masterDescription = variant?.description || selectedSightseeing?.details || selectedSightseeing?.description || '';
                  const selectedImage = variantPdfImage(variant);
                  setForm(prev => ({ ...prev, variantId: e.target.value, variantRateKey: rateKey, transferOptionId: '', transferVehicle: '', transferVehicleSupplierId: '', transferVehicleSupplier: '', transferVehicleSelections: [], transferVehicleManualSelection: false, transferSupplierCost: 0, transferSellingPrice: 0, sightseeingTicketSupplierCost: 0, sightseeingTransferVehicleCost: 0, sightseeingTicketSellingPrice: 0, sightseeingTransferVehicleSellingPrice: 0, adultSupplierRate: Number(rate?.adultCost || 0), childSupplierRate: Number(rate?.childCost || 0), adultSellingRate: Number(rate?.adultSell || 0), childSellingRate: Number(rate?.childSell || 0), fromTime: variant?.defaultFromTime || '', toTime: variant?.defaultToTime || '', dropUpTime: variant?.defaultDropTime || '', currency: rate ? 'THB' : prev.currency, name: variant ? `${selectedSightseeing.name} · ${variant.name}` : selectedSightseeing?.name || prev.name, masterDescription, description: masterDescription, termsHtml: selectedSightseeing?.termsHtml || prev.termsHtml || '', image: selectedImage, imageUrl: selectedImage?.url || '', variantImage: selectedImage }));
                }} className="form-select">
                  <option value="">Select active variant</option>
                  {(selectedSightseeing?.variants || []).filter(item => item.status === 'Active').map(variant => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Variant Rate Contract</label>
                <select value={form.variantRateKey || ''} onChange={e => {
                  const index = applicableVariantRates.findIndex((rate, i) => (rate.id || `${rate.fromDate}-${rate.toDate}-${i}`) === e.target.value);
                  const rate = applicableVariantRates[index];
                  setForm(prev => ({ ...prev, variantRateKey: e.target.value, adultSupplierRate: Number(rate?.adultCost || 0), childSupplierRate: Number(rate?.childCost || 0), adultSellingRate: Number(rate?.adultSell || 0), childSellingRate: Number(rate?.childSell || 0), currency: 'THB' }));
                }} className="form-select" disabled={!form.variantId}>
                  <option value="">Select valid rate</option>
                  {applicableVariantRates.map((rate, index) => <option key={rate.id || index} value={rate.id || `${rate.fromDate}-${rate.toDate}-${index}`}>{rate.market || 'All markets'} · {formatDate(rate.fromDate)} to {formatDate(rate.toDate)}{hidePricing ? '' : ` · Adult ${fmt(rate.adultCost)}`}</option>)}
                </select>
              </div>
            </div>
          )}
          {form.variantId && <MasterRateNotice loading={masterLoading} hasMaster={Boolean(form.variantId)} rates={applicableVariantRates} label="variant rate" market={variantRateUsesMarketFallback ? '' : market} date={travelDate} />}
          {form.variantId && variantRateUsesMarketFallback && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              No rate is configured specifically for {market}. Showing the current saved contract for {applicableVariantRates.map((rate) => rate.market || 'all markets').filter((value, index, values) => values.indexOf(value) === index).join(', ')}; confirm it before quoting.
            </div>
          )}
          {form.variantId && (
            <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
              <div>
                <label className="form-label">Transfer Option for this Variant</label>
                <select value={form.transferOptionId || ''} onChange={e => {
                  const transfer = (selectedSightseeing?.transfers || []).find(item => item.id === e.target.value);
                  setForm(prev => {
                    const isTicketOnly = transfer?.type === 'Ticket Only';
                    const partySize = transferPartySize(prev, quotation);
                    const suggestedCombination = isTicketOnly ? null : selectedVehicleCombination(transfer?.vehicleCosts, { ...prev, transferVehicleSelectionKey: '' }, quotation, 'transferVehicleSelectionKey');
                    const adults = Number(prev.adults ?? quotation?.adults ?? 0);
                    const children = Number(prev.children ?? quotation?.children ?? 0);
                    const passengerCost = isTicketOnly ? 0 : (Number(transfer?.adultPrice || 0) * adults) + (Number(transfer?.childPrice || 0) * children);
                    const cost = passengerCost + Number(suggestedCombination?.totalCost || 0);
                    const nextBasis = transfer?.type === 'SIC' ? 'Sic' : transfer?.type === 'PVT' ? 'Private' : transfer?.type === 'Ticket Only' ? 'Ticket Only' : prev.basis;
                    return {
                      ...prev,
                      basis: nextBasis,
                      transferOptionId: e.target.value,
                      transferOptionType: transfer?.type || '',
                      transferVehicle: isTicketOnly ? '' : suggestedCombination?.key || '',
                      transferVehicleName: isTicketOnly ? '' : suggestedCombination?.label || '',
                      transferVehicleSelectionKey: isTicketOnly ? '' : suggestedCombination?.key || '',
                      transferVehicleSelections: isTicketOnly ? [] : suggestedCombination?.entries || [],
                      transferVehicleTotalCapacity: isTicketOnly ? 0 : suggestedCombination?.totalCapacity || 0,
                      transferVehicleAutoSelectedForPax: partySize,
                      transferVehicleManualSelection: false,
                      transferVehicleSupplierId: isTicketOnly ? '' : (transfer?.vehicleSupplierId || ''),
                      transferVehicleSupplier: isTicketOnly ? '' : (transfer?.vehicleSupplierName || ''),
                      transferSupplierCost: cost,
                      transferSellingPrice: Math.round(cost * (1 + Number(prev.markup || 0) / 100)),
                      sightseeingTicketSupplierCost: passengerCost,
                      sightseeingTransferVehicleCost: isTicketOnly ? 0 : Number(suggestedCombination?.totalCost || 0),
                      sightseeingTicketSellingPrice: Math.round(passengerCost * (1 + Number(prev.markup || 0) / 100)),
                      sightseeingTransferVehicleSellingPrice: isTicketOnly ? 0 : Math.round(Number(suggestedCombination?.totalCost || 0) * (1 + Number(prev.markup || 0) / 100)),
                    };
                  });
                }} className="form-select">
                  <option value="">Ticket only / no transfer</option>
                  {(selectedSightseeing?.transfers || []).filter(item => (!item.variantId || item.variantId === form.variantId) && item.status === 'Active').map(transfer => <option key={transfer.id} value={transfer.id}>{transfer.type} · {transfer.route || 'Route not set'}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Suggested transfer vehicle combination</label>
                <select value={form.transferVehicleManualSelection ? '' : form.transferVehicle || ''} onChange={e => {
                  setForm(prev => {
                    const combination = vehicleCombinationOptions(selectedSightseeingTransfer?.vehicleCosts, transferPartySize(prev, quotation)).find((item) => item.key === e.target.value) || null;
                    const base = selectedSightseeingTransfer?.type === 'Ticket Only' ? 0 : (Number(selectedSightseeingTransfer?.adultPrice || 0) * Number(prev.adults ?? quotation?.adults ?? 0)) + (Number(selectedSightseeingTransfer?.childPrice || 0) * Number(prev.children ?? quotation?.children ?? 0));
                    const vehicleCost = Number(combination?.totalCost || 0);
                    const cost = base + vehicleCost;
                    return { ...prev, transferVehicle: e.target.value, transferVehicleName: combination?.label || '', transferVehicleSelectionKey: e.target.value, transferVehicleSelections: combination?.entries || [], transferVehicleTotalCapacity: combination?.totalCapacity || 0, transferVehicleAutoSelectedForPax: transferPartySize(prev, quotation), transferVehicleManualSelection: false, transferSupplierCost: cost, transferSellingPrice: Math.round(cost * (1 + Number(prev.markup || 0) / 100)), sightseeingTicketSupplierCost: base, sightseeingTransferVehicleCost: vehicleCost, sightseeingTicketSellingPrice: Math.round(base * (1 + Number(prev.markup || 0) / 100)), sightseeingTransferVehicleSellingPrice: Math.round(vehicleCost * (1 + Number(prev.markup || 0) / 100)) };
                  });
                }} className="form-select" disabled={selectedSightseeingTransfer?.type === 'Ticket Only' || !selectedSightseeingTransfer?.vehicleCosts?.length}>
                  <option value="">{selectedSightseeingTransfer?.vehicleCosts?.length ? 'Select vehicle combination from transfer price' : 'No vehicle required'}</option>
                  {vehicleCombinationOptions(selectedSightseeingTransfer?.vehicleCosts, transferPartySize(form, quotation)).map((combination) => <option key={combination.key} value={combination.key}>{combination.label} · {combination.totalCapacity} Pax{hidePricing ? '' : ` · ${fmt(combination.totalCost)}`}</option>)}
                </select>
                {selectedSightseeingTransferFleet?.label && <p className="mt-1 text-xs text-emerald-700">{form.transferVehicleManualSelection ? 'Manual fleet:' : `Auto-selected for ${transferPartySize(form, quotation)} adults:`} {selectedSightseeingTransferFleet.label} · {selectedSightseeingTransferFleet.totalCapacity} seats.</p>}
                {selectedSightseeingTransfer?.type === 'SIC' && !hidePricing && <p className="mt-1 text-xs text-emerald-700">SIC rate suggestion: Adult {fmt(selectedSightseeingTransfer.adultPrice)} × {Number(form.adults ?? quotation?.adults ?? 0)} · Child {fmt(selectedSightseeingTransfer.childPrice)} × {Number(form.children ?? quotation?.children ?? 0)}. The vehicle amount shown above is a separate transfer charge.</p>}
              </div>
              <div className="min-[440px]:col-span-2">
                <VehicleFleetEditor
                  vehicleCosts={selectedSightseeingTransfer?.vehicleCosts}
                  selections={selectedSightseeingTransferFleet?.entries || []}
                  disabled={selectedSightseeingTransfer?.type === 'Ticket Only' || !selectedSightseeingTransfer?.vehicleCosts?.length}
                  fmt={fmt}
                  onChange={(selections) => setForm((previous) => {
                    const combination = vehicleCombinationFromSelections(selectedSightseeingTransfer?.vehicleCosts, selections);
                    const adults = Number(previous.adults ?? quotation?.adults ?? 0);
                    const children = Number(previous.children ?? quotation?.children ?? 0);
                    const passengerCost = (Number(selectedSightseeingTransfer?.adultPrice || 0) * adults) + (Number(selectedSightseeingTransfer?.childPrice || 0) * children);
                    const vehicleCost = Number(combination.totalCost || 0);
                    const cost = passengerCost + vehicleCost;
                    const multiplier = 1 + Number(previous.markup || 0) / 100;
                    return { ...previous, transferVehicle: combination.key, transferVehicleName: combination.label, transferVehicleSelectionKey: combination.key, transferVehicleSelections: combination.entries, transferVehicleTotalCapacity: combination.totalCapacity, transferVehicleAutoSelectedForPax: transferPartySize(previous, quotation), transferVehicleManualSelection: true, transferSupplierCost: cost, transferSellingPrice: Math.round(cost * multiplier), sightseeingTicketSupplierCost: passengerCost, sightseeingTransferVehicleCost: vehicleCost, sightseeingTicketSellingPrice: Math.round(passengerCost * multiplier), sightseeingTransferVehicleSellingPrice: Math.round(vehicleCost * multiplier) };
                  })}
                />
              </div>
              {selectedSightseeingTransfer && ['SIC', 'PVT'].includes(selectedSightseeingTransfer.type) && (
                <div className="min-[440px]:col-span-2">
                  <label className="form-label">Vehicle Supplier</label>
                  <SearchableSelect
                    value={form.transferVehicleSupplierId || ''}
                    onChange={() => {}}
                    options={form.transferVehicleSupplierId ? [{ value: form.transferVehicleSupplierId, label: form.transferVehicleSupplier || form.transferVehicleSupplierId }] : []}
                    placeholder="No vehicle supplier selected in this transfer option"
                    isDisabled
                  />
                  <p className="mt-1 text-xs text-slate-400">Set this optional supplier from Sightseeing Master → Transfer Options. It is carried into the booking for supplier payments.</p>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
            <div>
              <label className="form-label">Basis</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {['Private', 'Sic'].map(b => (
                  <button key={b} onClick={() => set('basis', b)} className={`flex-1 py-2 text-sm font-medium ${form.basis === b ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{b}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Supplier</label>
              <select value={form.supplier || ''} onChange={e => set('supplier', e.target.value)} className="form-select">
                <option value="">Select supplier</option>
                {selectedSightseeingSuppliers.map(s => <option key={s.id || s._id || s.name} value={s.name || s.supplierName}>{s.name || s.supplierName}</option>)}
              </select>
            </div>
          </div>
          <div className={`grid gap-x-3 gap-y-2 ${hidePricing ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
<div>
              <label className="form-label">Adults</label>
              <input type="number" value={form.adults ?? quotation?.adults ?? ''} onChange={e => set('adults', e.target.value === '' ? '' : Number(e.target.value))} className="form-input" min="0" />
            </div>
            {!hidePricing && <>
<div>
              <label className="form-label">Adult Supplier Rate</label>
              <input type="number" value={form.adultSupplierRate || ''} onChange={e => set('adultSupplierRate', Number(e.target.value))} className="form-input" />
            </div>
<div>
              <label className="form-label">Adult Selling Rate</label>
              <input type="number" value={form.adultSellingRate || ''} onChange={e => set('adultSellingRate', Number(e.target.value))} className="form-input" />
            </div>
<div>
              <label className="form-label">Children</label>
              <input type="number" value={form.children || ''} onChange={e => set('children', e.target.value === '' ? '' : Number(e.target.value))} className="form-input" min="0" />
            </div>
<div>
              <label className="form-label">Child Supplier Rate</label>
              <input type="number" value={form.childSupplierRate || ''} onChange={e => set('childSupplierRate', Number(e.target.value))} className="form-input" />
            </div>
<div>
              <label className="form-label">Child Selling Rate</label>
              <input type="number" value={form.childSellingRate || ''} onChange={e => set('childSellingRate', Number(e.target.value))} className="form-input" />
            </div>
            </>}
</div>
          {!hidePricing && <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-3">
            <div>
              <label className="form-label">Markup %</label>
              <input type="number" min="0" step="0.01" value={form.markup ?? defaultMarkup} onChange={(event) => setForm((previous) => {
                const markup = event.target.value === '' ? '' : Number(event.target.value);
                const multiplier = 1 + Number(markup || 0) / 100;
                return { ...previous, markup, adultSellingRate: Math.round(Number(previous.adultSupplierRate || 0) * multiplier), childSellingRate: Math.round(Number(previous.childSupplierRate || 0) * multiplier) };
              })} className="form-input" />
              <p className="mt-1 text-xs text-slate-500">Edit the default quotation markup for this sightseeing service.</p>
            </div>
          </div>}
          <div>
            <div className="mb-1"><SectionTitle color="bg-purple-500">Inclusions</SectionTitle></div>
            <div className="flex flex-wrap gap-1.5">
              {['Lunch', 'National Park Fee', 'Hotel Transfer', 'Private Guide', 'Snorkel Equipment'].map(inc => (
                <label key={inc} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${(form.inclusions || []).includes(inc) ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={(form.inclusions || []).includes(inc)} onChange={e => {
                    const incls = form.inclusions || [];
                    set('inclusions', e.target.checked ? [...incls, inc] : incls.filter(i => i !== inc));
                  }} className="rounded accent-purple-600" />
                  {inc}
                </label>
              ))}
            </div>
          </div>
          {hidePricing ? <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">Sightseeing pricing is included in the combined package total.</div> : <SightseeingCostBreakdown form={form} quotation={quotation} transfer={selectedSightseeingTransfer} fmt={fmt} />}
        </div>
      )}

      {/* Hotel */}
      {type === 'Hotel' && (
        <div className="space-y-4">
          {stayStart && stayEnd && (
            <div className="rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-800">
              <span className="font-semibold">Stay dates for {stayLabel}:</span> {formatDate(stayStart)} to {formatDate(stayEnd)}. Check-out can be selected through {formatDate(latestCheckOut)}.
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
            <div>
              <label className="form-label">Hotel</label>
              <select value={form.hotelId || ''} onChange={e => {
                const hotel = hotels.find(h => h.id === e.target.value);
                const checkIn = form.checkIn || day?.date || '';
                const validRates = hotelRates.filter((rate) => rate.hotelId === e.target.value && isRateApplicable(rate, checkIn, market));
                const rate = preferredHotelRateForDate(validRates, hotel, checkIn);
                const roomRate = preferredHotelRoomRate(rate, '', '');
                const allocation = quotation?.roomAllocation || {};
                  const cost = allocationRateCost(roomRate, allocation, form.rooms, form.adults, hotel?.groupRoomLimit, quotation?.childAges);
                setForm(prev => resetHotelAvailability({ ...prev, hotelId: e.target.value, rateContractId: rate?.id || '', roomType: roomRate?.roomType || '', mealPlan: roomRate?.mealPlan || '', supplierCost: cost, sellingPrice: Math.round(cost * (1 + Number(prev.markup || 0) / 100)), roomAllocation: allocation, rateBreakdown: roomRate || null, roomAllocationOverride: false, manualSupplierCost: false, manualSellingPrice: false, supplier: rate?.supplier || '', currency: rate?.currency || prev.currency || 'THB', name: hotel?.name || '', masterDescription: hotel?.details || hotel?.description || '', description: hotel?.details || hotel?.description || '' }));
              }} className="form-select">
                <option value="">Select Hotel</option>
                {hotelDropdownOptions.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Room Type</label>
              <select value={form.roomType || ''} onChange={e => {
                const roomRate = preferredHotelRoomRate(selectedHotelRate, e.target.value, form.mealPlan);
                const allocation = effectiveHotelAllocation(quotation, form.roomAllocation, form.roomAllocationOverride);
                const cost = allocationRateCost(roomRate, allocation, form.rooms, form.adults, selectedHotel?.groupRoomLimit, quotation?.childAges);
                setForm(prev => resetHotelAvailability({ ...prev, roomType: e.target.value, mealPlan: roomRate?.mealPlan || prev.mealPlan, roomAllocation: allocation, rateBreakdown: roomRate || null, supplierCost: cost, sellingPrice: Math.round(cost * (1 + Number(prev.markup || 0) / 100)), manualSupplierCost: false, manualSellingPrice: false }));
              }} className="form-select">
                <option value="">Select Room Type</option>
                {selectedHotelRoomTypes.map(roomType => <option key={roomType} value={roomType}>{roomType}</option>)}
              </select>
            </div>
          </div>
          <MasterRateNotice loading={masterLoading} hasMaster={Boolean(form.hotelId)} rates={applicableHotelRates} label="hotel price" market={market} date={form.checkIn || travelDate} />
          {applicableHotelRates.length > 0 && (
            <div>
              <label className="form-label">Hotel Price Contract</label>
              <select value={form.rateContractId || ''} onChange={e => {
                const rate = applicableHotelRates.find(item => item.id === e.target.value);
                const firstAllowedRoomRate = preferredHotelRoomRate(rate, '', '');
                setForm(prev => {
                  const roomRate = preferredHotelRoomRate(rate, prev.roomType, prev.mealPlan) || firstAllowedRoomRate;
                  const allocation = effectiveHotelAllocation(quotation, prev.roomAllocation, prev.roomAllocationOverride);
                  const cost = allocationRateCost(roomRate, allocation, prev.rooms, prev.adults, selectedHotel?.groupRoomLimit, quotation?.childAges);
                  return resetHotelAvailability({ ...prev, rateContractId: e.target.value, supplier: rate?.supplier || '', roomType: roomRate?.roomType || '', mealPlan: roomRate?.mealPlan || '', roomAllocation: allocation, rateBreakdown: roomRate || null, supplierCost: cost, sellingPrice: Math.round(cost * (1 + Number(prev.markup || 0) / 100)), manualSupplierCost: false, manualSellingPrice: false, currency: rate?.currency || 'THB' });
                });
              }} className="form-select">
                <option value="">Select a valid hotel price</option>
                {applicableHotelRates.map((rate) => {
                  const roomSummary = (rate.roomRates || []).map((roomRate) => {
                    const price = roomTypeStartingPrice(roomRate);
                    return `${roomRate.roomType || 'Room'}${roomRate.mealPlan ? ` · ${roomRate.mealPlan}` : ''}: ${hotelRateCurrency(rate.currency)}${price.toLocaleString()}`;
                  }).join(' | ');
                  return <option key={rate.id} value={rate.id}>{rate.priceType === 'Weekends' ? 'Weekend preferred' : rate.priceType || 'All Days'} · {rate.id} · {roomSummary || 'No room rate'}</option>;
                })}
              </select>
            </div>
          )}
          {form.hotelId && form.checkIn && form.checkOut && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">{hidePricing ? 'Nightly hotel availability' : 'Nightly hotel pricing'}</p>
                  <p className="text-[10px] text-slate-500">Each night uses its own valid contract and includes every selected room, bed, and child supplement.</p>
                </div>
                {hotelPricing?.complete && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700">{hotelNightlyRates.length} nightly rates applied</span>}
              </div>
              <div className="divide-y divide-slate-200">
                {hotelNightlyRates.map((night) => (
                  <div key={night.date} className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs ${night.weekendDay ? 'bg-amber-50/70' : 'bg-slate-50'}`}>
                    <div className="min-w-[210px]">
                      <div className="font-semibold text-slate-800">{formatDate(night.date)} · {dayName(night.date)}</div>
                      {night.available
                        ? <><div className="mt-0.5 text-[10px] text-slate-500">{night.roomType}{night.mealPlan ? ` · ${night.mealPlan}` : ''}{night.supplier ? ` · ${night.supplier}` : ''}</div>{!hidePricing && <><div className="mt-0.5 text-[10px] text-slate-400">{night.chargeLines.map((line) => `${line.quantity} × ${line.label} (${fmt(line.rate)})`).join(' + ')}</div>{night.surchargeLines?.length > 0 && <div className="mt-0.5 text-[10px] font-semibold text-amber-700">Surcharge: {night.surchargeLines.map((line) => `${line.label} (${Number(line.quantity || 1) > 1 ? `${line.quantity} × ${fmt(line.unitAmount ?? line.amount)} = ` : ''}${fmt(line.amount)})`).join(' + ')}</div>}</>}</>
                        : <div className="mt-0.5 text-[10px] font-medium text-red-600">No matching active room rate for this night</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${night.usesWeekendRate ? 'bg-amber-200 text-amber-900' : 'bg-blue-100 text-blue-700'}`}>{night.rateLabel}</span>
                      {!hidePricing && <span className="min-w-[86px] text-right font-bold text-slate-900">{night.available ? fmt(night.supplierCost) : '—'}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {hotelPricing?.complete && !hidePricing && <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 text-xs"><span className="text-slate-600">Nightly supplier total: <b className="text-slate-900">{fmt(displayedHotelSupplierCost)}</b></span><span className="font-bold text-slate-900">Stay total: {fmt(displayedHotelTotalCost)}</span></div>}
            </div>
          )}
          <SectionTitle color="bg-indigo-500">Stay & guests</SectionTitle>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="form-label">Check-in</label>
              <DateInput value={form.checkIn || ''} min={stayStart || undefined} max={previousCalendarDate(stayEnd) || undefined} onChange={updateCheckIn} ariaLabel="Hotel check-in date in DD-MM-YYYY format" />
            </div>
            <div>
              <label className="form-label">Check-out</label>
              <DateInput value={form.checkOut || ''} min={nextCalendarDate(form.checkIn) || undefined} max={latestCheckOut || undefined} onChange={updateCheckOut} ariaLabel="Hotel check-out date in DD-MM-YYYY format" />
            </div>
            <div>
              <label className="form-label">Nights</label>
              <input type="number" value={form.nights || 1} onChange={e => set('nights', Number(e.target.value))} className="form-input" min="1" readOnly />
            </div>
            <div>
              <label className="form-label">Meal Plan</label>
              <select value={currentMealPlanName(form.mealPlan, activeMealPlans)} onChange={e => {
                const mealPlan = e.target.value;
                const rate = applicableHotelRates.find((item) => matchingHotelRoomRate(item, form.roomType, mealPlan))
                  || applicableHotelRates.find((item) => item.id === form.rateContractId)
                  || null;
                const roomRate = matchingHotelRoomRate(rate, form.roomType, mealPlan);
                const allocation = effectiveHotelAllocation(quotation, form.roomAllocation, form.roomAllocationOverride);
                const cost = allocationRateCost(roomRate, allocation, form.rooms, form.adults, selectedHotel?.groupRoomLimit, quotation?.childAges);
                setForm((previous) => resetHotelAvailability({
                  ...previous,
                  mealPlan,
                  rateContractId: roomRate ? rate?.id || '' : previous.rateContractId,
                  supplier: roomRate ? rate?.supplier || '' : previous.supplier,
                  rateBreakdown: roomRate || null,
                  roomAllocation: allocation,
                  supplierCost: cost,
                  sellingPrice: Math.round(cost * (1 + Number(previous.markup || 0) / 100)),
                  manualSupplierCost: false,
                  manualSellingPrice: false,
                  currency: roomRate ? rate?.currency || previous.currency || 'THB' : previous.currency,
                }));
              }} className="form-select">
                <option value="">Select Meal Plan</option>
                {activeMealPlans.map(mealPlan => <option key={mealPlan} value={mealPlan}>{mealPlan}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="form-label">Rooms</label>
              <input type="number" value={hasRoomAllocation(effectiveHotelAllocation(quotation, form.roomAllocation, form.roomAllocationOverride)) ? roomUnits(effectiveHotelAllocation(quotation, form.roomAllocation, form.roomAllocationOverride)) : (form.rooms || 1)} onChange={e => {
                const rooms = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                setForm((previous) => {
                  const allocation = effectiveHotelAllocation(quotation, previous.roomAllocation, previous.roomAllocationOverride);
                  if (!hasRoomAllocation(allocation)) return { ...previous, rooms };
                  const singleRooms = Math.min(Number(allocation.sgl || 0), rooms);
                  return { ...previous, rooms, roomAllocationOverride: true, roomAllocation: { ...allocation, sgl: singleRooms, dbl: Math.max(0, rooms - singleRooms) } };
                });
              }} className="form-input" min="0" />
            </div>
            <div>
              <label className="form-label">Adults</label>
              <input type="number" min="0" value={form.adults ?? quotation?.adults ?? ''} onChange={e => updateHotelAdults(e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Children</label>
              <input type="number" value={form.children || ''} onChange={e => set('children', e.target.value === '' ? '' : Number(e.target.value))} className="form-input" />
            </div>
            <div>
              <label className="form-label">Supplier</label>
              <select value={form.supplier || ''} onChange={e => set('supplier', e.target.value)} className="form-select">
                <option value="">Direct</option>
                {hotels.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-slate-300 bg-gradient-to-b from-indigo-50/70 to-white p-3 shadow-sm">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="mb-1"><SectionTitle color="bg-indigo-500">Room allocation for this stay</SectionTitle></div>
                    <p className="mt-0.5 text-[10px] text-slate-500">Adults auto-set DBL and EXB. CNB automatically uses the child&apos;s saved age (≤5 or &gt;5). Change SGL, CWB, CNB or INF only when this stay needs a different allocation.</p>
              </div>
              {form.roomAllocationOverride && <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Stay-specific</span>}
            </div>
            {childAgeSlots.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/70 px-2.5 py-2">
                <span className="mr-1 text-[10px] font-bold text-blue-800">Child ages used for CNB pricing</span>
                {childAgeSlots.map(({ number, age }) => {
                  const hasAge = age !== '' && age !== null && age !== undefined && Number.isFinite(Number(age));
                  const rateBand = hasAge ? (Number(age) <= 5 ? 'CNB ≤5' : 'CNB >5') : 'Age needed';
                  return (
                    <span key={`hotel-child-age-${number}`} className="rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      C{number}: {hasAge ? `${age}y` : '—'} · {rateBand}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {ROOM_ALLOCATION_FIELDS.map(([field, label]) => {
                const allocation = effectiveHotelAllocation(quotation, form.roomAllocation, form.roomAllocationOverride);
                return (
                  <label key={field}>
                    <span className="form-label text-[10px] text-center !font-extrabold !text-indigo-700">{label}</span>
                    <input type="number" min="0" value={allocation[field] || ''} onChange={(event) => updateHotelAllocation(field, event.target.value)} className="form-input text-center font-bold" />
                  </label>
                );
              })}
            </div>
          </div>
          {type === 'Hotel' && initialData?.linkedStay && day?.date > initialData.checkIn && day?.date < initialData.checkOut && (
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
              <input type="checkbox" checked={applyAllocationFromCurrentDay} onChange={(event) => setApplyAllocationFromCurrentDay(event.target.checked)} className="mt-0.5 rounded border-blue-300 text-primary-600 focus:ring-primary-500" />
              <span><b>Apply this allocation from {formatDate(day.date)} until check-out.</b><br />The current stay will be split at this day. Earlier nights keep their original room and extra-bed allocation.</span>
            </label>
          )}
          {hidePricing ? <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">Hotel price is included in the combined package total.</div> : <div className="space-y-2.5 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-50 to-white p-3 shadow-sm">
          <SectionTitle color="bg-emerald-500">Pricing</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="form-label">{hotelPricing?.complete ? 'Nightly Supplier Total' : 'Nightly Supplier Rate'} · {hotelRateTierDescription(selectedHotel?.groupRoomLimit)}</label>
              <input type="number" value={displayedHotelSupplierCost || ''} onChange={e => setForm((previous) => ({ ...previous, supplierCost: e.target.value === '' ? 0 : Number(e.target.value), manualSupplierCost: true, manualSellingPrice: false }))} className="form-input" placeholder="฿0" />
            </div>
            <div>
              <label className="form-label">Markup %</label>
              <input type="number" value={form.markup ?? defaultMarkup} onChange={e => setForm((previous) => ({ ...previous, markup: e.target.value === '' ? '' : Number(e.target.value), manualSellingPrice: false }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">Nightly Selling Total</label>
              <input type="number" value={displayedHotelSellingPrice || ''} onChange={e => setForm((previous) => ({ ...previous, sellingPrice: e.target.value === '' ? 0 : Number(e.target.value), manualSellingPrice: true }))} className="form-input" placeholder="Auto-calculated" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total Supplier Cost</div>
              <div className="text-sm font-extrabold text-slate-900">{fmt(displayedHotelTotalCost)}</div>
              <div className="text-[10px] text-slate-400">{hotelPricing?.complete ? `${form.nights || 1} nightly rates (Weekend / All Days by date)` : `${hasRoomAllocation(effectiveHotelAllocation(quotation, form.roomAllocation, form.roomAllocationOverride)) ? `${form.roomAllocationOverride ? 'This hotel allocation' : 'Room allocation'} (including CWB / beds)` : `${form.rooms || 1} room`} × ${form.nights || 1} nights × ${fmt(displayedHotelSupplierCost)}`}</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Total Selling Price</div>
              <div className="text-sm font-extrabold text-blue-700">{fmt(displayedHotelTotalSelling)}</div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Markup ({Number(form.markup ?? defaultMarkup).toFixed(2)}%)</div>
              <div className="text-sm font-extrabold text-emerald-700">{fmt(displayedHotelTotalSelling - displayedHotelTotalCost)}</div>
              <div className="text-[10px] font-semibold text-emerald-600">Profit: {fmt(displayedHotelTotalSelling - displayedHotelTotalCost)}</div>
            </div>
          </div>
          </div>}
        </div>
      )}

      {/* Meal */}
      {type === 'Meal' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
            <div>
              <label className="form-label">Restaurant</label>
              <select value={form.masterId || ''} onChange={e => {
                const restaurant = destinationRestaurants.find((item) => item.id === e.target.value);
                const firstRate = restaurantRates.find((rate) => rate.restaurantId === restaurant?.id && isRateApplicable(rate, travelDate, ''));
                setForm((prev) => ({
                  ...prev,
                  masterId: restaurant?.id || '',
                  rateContractId: '',
                  restaurant: restaurant?.name || '',
                  supplier: '',
                  mealType: firstRate?.mealType || '',
                  adultRate: 0,
                  childRate: 0,
                  adultSellingRate: 0,
                  childSellingRate: 0,
                  withTransport: false,
                  transportVehicle: '',
                  transportVehicleSelectionKey: '',
                  transportVehicleSelections: [],
                  transportVehicleManualSelection: false,
                  transportCost: 0,
                  transportSelling: 0,
                }));
              }} className="form-select">
                <option value="">Select active restaurant</option>
                {destinationRestaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
              </select>
              {!masterLoading && !destinationRestaurants.length && <p className="mt-1 text-xs text-amber-700">No active restaurant is available for {stayDestination || 'this itinerary destination'}.</p>}
            </div>
            <div>
              <label className="form-label">Meal Type</label>
              <select value={form.mealType || ''} disabled={!form.masterId} onChange={e => setForm((previous) => ({
                ...previous,
                mealType: e.target.value,
                rateContractId: '',
                supplier: '',
                adultRate: 0,
                childRate: 0,
                adultSellingRate: 0,
                childSellingRate: 0,
                withTransport: false,
                transportVehicle: '',
                transportVehicleSelectionKey: '',
                transportVehicleSelections: [],
                transportVehicleManualSelection: false,
                transportCost: 0,
                transportSelling: 0,
              }))} className="form-select">
                <option value="">Select meal type</option>
                {restaurantMealTypes.map((mealType) => <option key={mealType} value={mealType}>{mealType}</option>)}
              </select>
            </div>
          </div>
          <MasterRateNotice loading={masterLoading} hasMaster={Boolean(form.masterId)} rates={mealApplicableRestaurantRates} label="restaurant price" market={market} date={travelDate} />
          {mealApplicableRestaurantRates.length > 0 && (
            <div>
              <label className="form-label">Restaurant Price Contract</label>
              <select value={form.rateContractId || ''} onChange={e => {
                const rate = mealApplicableRestaurantRates.find((item) => item.id === e.target.value);
                setForm((previous) => {
                  const markupMultiplier = 1 + Number(previous.markup || 0) / 100;
                  const includesTransport = rate?.tripType && rate.tripType !== 'Without Transfer';
                  const vehicleFleet = includesTransport
                    ? selectedVehicleCombination(rate?.vehicleCosts, { ...previous, transportVehicleSelectionKey: '' }, quotation, 'transportVehicleSelectionKey')
                    : null;
                  const transportCost = Number(vehicleFleet?.totalCost || 0);
                  return {
                    ...previous,
                    rateContractId: rate?.id || '',
                    restaurant: selectedRestaurant?.name || previous.restaurant,
                    mealType: rate?.mealType || previous.mealType,
                    supplier: rate?.supplier || '',
                    adultRate: Number(rate?.adultCost || 0),
                    childRate: Number(rate?.childCost || 0),
                    adultSellingRate: Math.round(Number(rate?.adultCost || 0) * markupMultiplier),
                    childSellingRate: Math.round(Number(rate?.childCost || 0) * markupMultiplier),
                    withTransport: Boolean(includesTransport),
                    transportVehicle: vehicleFleet?.key || '',
                    transportVehicleName: vehicleFleet?.label || '',
                    transportVehicleSelectionKey: vehicleFleet?.key || '',
                    transportVehicleSelections: vehicleFleet?.entries || [],
                    transportVehicleTotalCapacity: vehicleFleet?.totalCapacity || 0,
                    transportVehicleManualSelection: false,
                    transportCost,
                    transportSelling: Math.round(transportCost * markupMultiplier),
                    tripType: rate?.tripType || 'Without Transfer',
                    currency: rate?.currency || 'THB',
                    name: `${rate?.mealType || previous.mealType || 'Meal'} at ${selectedRestaurant?.name || previous.restaurant || 'Restaurant'}`,
                  };
                });
              }} className="form-select" disabled={!form.mealType}>
                <option value="">Select a valid restaurant price</option>
                {mealApplicableRestaurantRates.map((rate) => <option key={rate.id} value={rate.id}>{rate.id} · {rate.supplier} · {rate.mealType} · {rate.tripType} · {rate.currency}</option>)}
              </select>
            </div>
          )}
          <div className={`grid gap-x-3 gap-y-2 ${hidePricing ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
<div>
              <label className="form-label">Adults</label>
              <input type="number" value={form.adults ?? quotation?.adults ?? ''} onChange={e => set('adults', e.target.value === '' ? '' : Number(e.target.value))} className="form-input" />
            </div>
            {!hidePricing && <>
<div>
              <label className="form-label">Adult Supplier Rate</label>
              <input type="number" value={form.adultRate ?? ''} readOnly={Boolean(form.rateContractId)} onChange={e => set('adultRate', e.target.value === '' ? '' : Number(e.target.value))} className="form-input" />
            </div>
<div>
              <label className="form-label">Adult Selling Rate</label>
              <input type="number" value={form.adultSellingRate ?? ''} readOnly className="form-input bg-slate-50" />
            </div>
<div>
              <label className="form-label">Children</label>
              <input type="number" value={form.children || ''} onChange={e => set('children', e.target.value === '' ? '' : Number(e.target.value))} className="form-input" />
            </div>
<div>
              <label className="form-label">Child Supplier Rate</label>
              <input type="number" value={form.childRate ?? ''} readOnly={Boolean(form.rateContractId)} onChange={e => set('childRate', e.target.value === '' ? '' : Number(e.target.value))} className="form-input" />
            </div>
<div>
              <label className="form-label">Child Selling Rate</label>
              <input type="number" value={form.childSellingRate ?? ''} readOnly className="form-input bg-slate-50" />
            </div>
            </>}
</div>
          {!hidePricing && <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-3">
            <div>
              <label className="form-label">Markup %</label>
              <input type="number" min="0" step="0.01" value={form.markup ?? defaultMarkup} onChange={(event) => set('markup', event.target.value === '' ? '' : Number(event.target.value))} className="form-input" />
              <p className="mt-1 text-xs text-slate-500">Edit the default quotation markup for this meal service.</p>
            </div>
          </div>}

          {/* Transport toggle */}
          <div>
            <label className="form-label">Transport</label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {['Without Transport', 'With Transport'].map(t => (
                <button type="button" key={t} disabled={Boolean(selectedRestaurantRate)} onClick={() => set('withTransport', t === 'With Transport')}
                  className={`flex-1 py-2 text-sm font-medium ${form.withTransport === (t === 'With Transport') ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} ${selectedRestaurantRate ? 'cursor-not-allowed opacity-80' : ''}`}>{t}</button>
              ))}
            </div>
            {selectedRestaurantRate && <p className="mt-1 text-xs text-slate-500">Transport is fixed by this price contract: {selectedRestaurantRate.tripType || 'Without Transfer'}.</p>}
          </div>

          {form.withTransport && (
            <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-200">
              <div className="text-sm font-semibold text-slate-700">Transfer Details</div>
              <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
                <div>
                  <label className="form-label">Pickup From</label>
                  <input type="text" value={form.pickupFrom || ''} onChange={e => set('pickupFrom', e.target.value)} className="form-input text-sm py-1.5" />
                </div>
                <div>
                  <label className="form-label">Suggested vehicle combination</label>
                  <select value={form.transportVehicleManualSelection ? '' : form.transportVehicle || ''} onChange={e => {
                    const combination = vehicleCombinationOptions(selectedRestaurantRate?.vehicleCosts, transferPartySize(form, quotation)).find((item) => item.key === e.target.value) || null;
                    const transportCost = Number(combination?.totalCost || 0);
                    setForm((previous) => ({ ...previous, transportVehicle: combination?.key || '', transportVehicleName: combination?.label || '', transportVehicleSelectionKey: combination?.key || '', transportVehicleSelections: combination?.entries || [], transportVehicleTotalCapacity: combination?.totalCapacity || 0, transportVehicleManualSelection: false, transportCost, transportSelling: Math.round(transportCost * (1 + Number(previous.markup || 0) / 100)) }));
                  }} className="form-select text-sm py-1.5" disabled={Boolean(selectedRestaurantRate && !(selectedRestaurantRate.vehicleCosts || []).length)}>
                    <option value="">{selectedRestaurantRate?.vehicleCosts?.length ? 'Select suggested combination' : 'No contracted vehicle available'}</option>
                    {vehicleCombinationOptions(selectedRestaurantRate?.vehicleCosts, transferPartySize(form, quotation)).map((combination) => <option key={combination.key} value={combination.key}>{combination.label} · {combination.totalCapacity} Pax{hidePricing ? '' : ` · ${fmt(combination.totalCost)}`}</option>)}
                  </select>
                  {selectedMealTransportFleet?.label && <p className="mt-1 text-xs text-slate-500">{form.transportVehicleManualSelection ? 'Manual fleet:' : 'Suggested fleet:'} {selectedMealTransportFleet.label} · {selectedMealTransportFleet.totalCapacity} seats.</p>}
                </div>
                {!hidePricing && <div>
                  <label className="form-label">Transport Cost</label>
                  <input type="number" value={form.transportCost ?? ''} readOnly={Boolean(selectedRestaurantRate)} onChange={e => set('transportCost', e.target.value === '' ? '' : Number(e.target.value))} className="form-input text-sm py-1.5" />
                </div>}
                {!hidePricing && <div>
                  <label className="form-label">Transport Selling</label>
                  <input type="number" value={form.transportSelling ?? ''} readOnly className="form-input text-sm py-1.5 bg-slate-50" />
                </div>}
              </div>
              <VehicleFleetEditor
                vehicleCosts={selectedRestaurantRate?.vehicleCosts}
                selections={selectedMealTransportFleet?.entries || []}
                disabled={!selectedRestaurantRate || !(selectedRestaurantRate.vehicleCosts || []).length}
                fmt={fmt}
                onChange={(selections) => setForm((previous) => {
                  const combination = vehicleCombinationFromSelections(selectedRestaurantRate?.vehicleCosts, selections);
                  const transportCost = Number(combination.totalCost || 0);
                  return { ...previous, transportVehicle: combination.key, transportVehicleName: combination.label, transportVehicleSelectionKey: combination.key, transportVehicleSelections: combination.entries, transportVehicleTotalCapacity: combination.totalCapacity, transportVehicleManualSelection: true, transportCost, transportSelling: Math.round(transportCost * (1 + Number(previous.markup || 0) / 100)) };
                })}
              />
            </div>
          )}

          {!hidePricing && <TotalSummary cost={form.totalSupplierCost} sell={form.totalSellingPrice} markupPercent={form.markup ?? defaultMarkup} />}
        </div>
      )}

      {/* Yacht */}
      {type === 'Yacht' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
            <span className="font-semibold">Charter date:</span> {day?.date ? formatDate(day.date) : 'Select an itinerary day first'}. Active yachts from {segmentDestinations.join(' or ') || 'this destination'} are available.
          </div>
          <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
            <div>
              <label className="form-label">Yacht Master</label>
              <select value={form.yachtId || ''} onChange={(event) => {
                const yacht = destinationYachts.find((item) => item.id === event.target.value);
                const rate = (yacht?.rates || []).find((item) => item.status === 'Active');
                const allowedIds = new Set((yacht?.supplierIds || []).map((id) => String(id)));
                const supplier = yachtSuppliers.find((item) => allowedIds.has(String(item.id || item._id)));
                setForm((previous) => ({ ...previous, yachtId: yacht?.id || '', yachtRateId: rate?.id || '', name: yacht?.name || previous.name, duration: rate?.duration || '', startingPier: yacht?.startingPier || yacht?.route?.pickupPier || '', route: yacht?.route?.standardRoute || '', supplier: supplier?.name || '', yachtSupplier: supplier?.name || '', yachtSupplierId: supplier?.id || supplier?._id || '', masterDescription: yacht?.description || previous.masterDescription || '', description: yacht?.description || previous.description || '', termsHtml: yacht?.policies?.terms || previous.termsHtml || '', season: previous.season || 'Standard', extraHours: 0 }));
              }} className="form-select">
                <option value="">Select active yacht</option>
                {destinationYachts.map((yacht) => <option key={yacht.id} value={yacht.id}>{yacht.name} · up to {yacht.maxCapacity} Pax</option>)}
              </select>
              {!destinationYachts.length && <p className="mt-1 text-xs text-amber-700">No active Yacht Master is available for this itinerary destination.</p>}
            </div>
            <div>
              <label className="form-label">Charter Duration</label>
              <select value={form.yachtRateId || ''} disabled={!selectedYacht} onChange={(event) => {
                const rate = selectedYachtRates.find((item) => item.id === event.target.value);
                setForm((previous) => ({ ...previous, yachtRateId: rate?.id || '', duration: rate?.duration || '' }));
              }} className="form-select">
                <option value="">Select active duration</option>
                {selectedYachtRates.map((rate) => <option key={rate.id} value={rate.id}>{rate.duration}</option>)}
              </select>
            </div>
          </div>
          {selectedYacht && (
            <div className={`rounded-lg border px-3 py-2 text-xs ${yachtIsBlocked(selectedYacht, day?.date, quotation?.id) || !yachtOperatesOnDay ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
              {yachtIsBlocked(selectedYacht, day?.date, quotation?.id) ? 'Unavailable: this yacht has an existing active booking on this date.' : !yachtOperatesOnDay ? `Unavailable: ${selectedYacht.name} does not operate on ${yachtDay}.` : `Available on ${yachtDay}. Recommended: ${selectedYacht.recommendedPax || selectedYacht.maxCapacity} Pax · Maximum: ${selectedYacht.maxCapacity} Pax.`}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="form-label">Rate Season</label>
              <select value={form.season || 'Standard'} onChange={(event) => set('season', event.target.value)} className="form-select"><option value="Standard">Standard ({(selectedYacht?.weekendDays || []).includes(yachtDay) ? 'Weekend' : 'Weekday'})</option><option value="Peak">Peak season</option></select>
            </div>
            <div>
              <label className="form-label">Extra Hours</label>
              <input type="number" min="0" value={form.extraHours || ''} onChange={(event) => set('extraHours', Number(event.target.value || 0))} className="form-input" />
            </div>
            <div>
              <label className="form-label">Total Guests</label>
              <input type="number" value={yachtTotalPax} readOnly className="form-input bg-slate-50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div><label className="form-label">Adults</label><input type="number" min="0" value={form.adults ?? quotation?.adults ?? ''} onChange={(event) => set('adults', event.target.value === '' ? '' : Number(event.target.value))} className="form-input" /></div>
            <div><label className="form-label">Children</label><input type="number" min="0" value={form.children ?? quotation?.children ?? ''} onChange={(event) => set('children', event.target.value === '' ? '' : Number(event.target.value))} className="form-input" /></div>
            <div><label className="form-label">Infants</label><input type="number" min="0" value={form.infants ?? quotation?.infants ?? ''} onChange={(event) => set('infants', event.target.value === '' ? '' : Number(event.target.value))} className="form-input" /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
            <div><label className="form-label">Boarding Pier</label><input type="text" value={form.startingPier || ''} onChange={(event) => set('startingPier', event.target.value)} className="form-input" placeholder="Pier / marina" /></div>
            <div><label className="form-label">Route</label><input type="text" value={form.route || ''} onChange={(event) => set('route', event.target.value)} className="form-input" placeholder="Charter route" /></div>
          </div>
          <div>
            <label className="form-label">Yacht Supplier / Operator</label>
            <select value={form.yachtSupplierId || selectedYachtSuppliers.find((supplier) => supplier.name === (form.yachtSupplier || form.supplier))?.id || ''} disabled={!selectedYacht || !selectedYachtSuppliers.length} onChange={(event) => {
              const supplier = selectedYachtSuppliers.find((item) => String(item.id || item._id) === event.target.value);
              setForm((previous) => ({ ...previous, supplier: supplier?.name || '', yachtSupplier: supplier?.name || '', yachtSupplierId: supplier?.id || '' }));
            }} className="form-select disabled:bg-slate-50">
              <option value="">{selectedYacht ? 'Select linked supplier' : 'Select yacht first'}</option>
              {selectedYachtSuppliers.map((supplier) => <option key={supplier.id || supplier._id} value={supplier.id || supplier._id}>{supplier.name}</option>)}
            </select>
            {selectedYacht && !selectedYachtSuppliers.length && <p className="mt-1 text-xs text-amber-700">No supplier is linked to this Yacht Master. Add authorised suppliers in Yacht Master first.</p>}
          </div>
          {selectedYachtRate && !hidePricing && <div className="text-xs text-slate-500">Saved yacht rate: {form.season === 'Peak' ? fmt(selectedYachtRate.peakRate) : fmt((selectedYacht?.weekendDays || []).includes(yachtDay) ? selectedYachtRate.weekendRate : selectedYachtRate.weekdayRate)} base · {fmt(selectedYachtRate.adultPrice)} × {Number(form.adults || 0)} adult{Number(form.adults || 0) === 1 ? '' : 's'} · {fmt(selectedYachtRate.childPrice)} × {Number(form.children || 0)} child{Number(form.children || 0) === 1 ? '' : 'ren'} · {fmt(selectedYachtRate.extraPax)} / extra guest · {fmt(selectedYachtRate.extraHour)} / extra hour.</div>}
          <PricingFields form={form} set={set} fmt={fmt} profit={profit} defaultMarkup={defaultMarkup} hidePricing={hidePricing} />
        </div>
      )}

      {/* Ferry/Guide/Other */}
      {['Ferry', 'Guide', 'Other'].includes(type) && (
        <div className="space-y-4">
          {type === 'Guide' && (
            <>
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                Only active guides assigned to {stayDestination || 'this itinerary destination'} are available. Prices are taken from the saved timing-wise Guide Master rate.
              </div>
              <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
                <div>
                  <label className="form-label">Guide Master</label>
                  <select value={form.masterId || ''} onChange={e => {
                    const guide = destinationGuides.find((item) => item.id === e.target.value);
                    const rates = activeGuideRates(guide);
                    const rate = rates[0];
                    const guideLanguage = guideLanguageForRate(rate);
                    const language = GUIDE_LANGUAGE_OPTIONS.find((item) => item.value === guideLanguage) || GUIDE_LANGUAGE_OPTIONS[0];
                    const supplierCost = Number(rate?.[language.costField] || 0);
                    setForm((prev) => ({
                      ...prev,
                      masterId: guide?.id || '',
                      guideRateKey: rate ? guideRateKey(rate, 0) : '',
                      guideLanguage,
                      guideDuration: rate?.duration || '',
                      supplier: guide?.name || '',
                      currency: rate?.currency || 'THB',
                      quantity: Math.max(1, Number(prev.quantity || 1)),
                      supplierCost,
                      sellingPrice: Math.round(supplierCost * (1 + Number(prev.markup || 0) / 100)),
                      totalSupplierCost: supplierCost * Math.max(1, Number(prev.quantity || 1)),
                      totalSellingPrice: Math.round(supplierCost * (1 + Number(prev.markup || 0) / 100)) * Math.max(1, Number(prev.quantity || 1)),
                      name: `${guide?.name || 'Guide'} · ${rate?.duration || 'Guide service'}`,
                    }));
                  }} className="form-select">
                    <option value="">Select active guide</option>
                    {destinationGuides.map((guide) => <option key={guide.id} value={guide.id}>{guide.name} · {guide.language || 'Languages to be confirmed'}</option>)}
                  </select>
                  {!destinationGuides.length && <p className="mt-1 text-xs text-amber-700">No active guide is available for {stayDestination || 'this itinerary destination'}.</p>}
                </div>
                <div>
                  <label className="form-label">Timing / Duration</label>
                  <select value={form.guideRateKey || ''} disabled={!selectedGuide} onChange={e => {
                    const index = selectedGuideRates.findIndex((rate, rateIndex) => guideRateKey(rate, rateIndex) === e.target.value);
                    const rate = selectedGuideRates[index];
                    const guideLanguage = guideLanguageForRate(rate);
                    const language = GUIDE_LANGUAGE_OPTIONS.find((item) => item.value === guideLanguage) || GUIDE_LANGUAGE_OPTIONS[0];
                    const supplierCost = Number(rate?.[language.costField] || 0);
                    setForm((prev) => ({
                      ...prev,
                      guideRateKey: e.target.value,
                      guideDuration: rate?.duration || '',
                      guideLanguage,
                      currency: rate?.currency || 'THB',
                      supplierCost,
                      sellingPrice: Math.round(supplierCost * (1 + Number(prev.markup || 0) / 100)),
                      name: `${selectedGuide?.name || prev.name || 'Guide'} · ${rate?.duration || 'Guide service'}`,
                    }));
                  }} className="form-select">
                    <option value="">Select saved timing</option>
                    {selectedGuideRates.map((rate, index) => <option key={guideRateKey(rate, index)} value={guideRateKey(rate, index)}>{rate.duration} · {rate.currency || 'THB'}</option>)}
                  </select>
                </div>
              </div>
              {selectedGuide && !selectedGuideRates.length && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">This guide has no active timing-wise cost. Add one in Guide Master before quoting.</div>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="form-label">Guide Language</label>
                  <select value={form.guideLanguage || 'english'} disabled={!selectedGuideRate} onChange={e => set('guideLanguage', e.target.value)} className="form-select">
                    {GUIDE_LANGUAGE_OPTIONS.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Guide Quantity</label>
                  <input type="number" min="1" value={form.quantity ?? 1} onChange={e => set('quantity', Math.max(1, Number(e.target.value || 1)))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <input value={form.currency || 'THB'} readOnly className="form-input bg-slate-50" />
                </div>
              </div>
            </>
          )}
          {type === 'Ferry' && (
            <div>
              <label className="form-label">Ferry Class Master</label>
              <select value={form.masterId || ''} onChange={e => {
                const ferryClass = ferryClassMasters.find(item => item.id === e.target.value);
                setForm(prev => ({ ...prev, masterId: e.target.value, name: ferryClass?.name || prev.name, masterDescription: ferryClass?.description || prev.masterDescription || '', description: ferryClass?.description || prev.description || '', termsHtml: ferryClass?.termsHtml || prev.termsHtml || '' }));
              }} className="form-select">
                <option value="">Select ferry class</option>
                {destinationFerryClasses.map(ferryClass => <option key={ferryClass.id} value={ferryClass.id}>{ferryClass.name}</option>)}
              </select>
            </div>
          )}
          {type !== 'Other' && type !== 'Guide' && type !== 'Flight' && (
            <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
              {type === 'Ferry' && <>
                <div>
                  <label className="form-label">Origin</label>
                  <input type="text" value={form.origin || ''} onChange={e => set('origin', e.target.value)} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Destination</label>
                  <input type="text" value={form.destination || ''} onChange={e => set('destination', e.target.value)} className="form-input" />
                </div>
              </>}
              <div>
                <label className="form-label">Adults</label>
                <input type="number" value={form.adults ?? quotation?.adults ?? ''} onChange={e => set('adults', e.target.value === '' ? '' : Number(e.target.value))} className="form-input" />
              </div>
              <div>
                <label className="form-label">Children</label>
                <input type="number" value={form.children || ''} onChange={e => set('children', e.target.value === '' ? '' : Number(e.target.value))} className="form-input" />
              </div>
            </div>
          )}
          {type !== 'Guide' && type !== 'Flight' && <div>
            <label className="form-label">Supplier</label>
            <select value={form.supplier || ''} onChange={e => set('supplier', e.target.value)} className="form-select">
              <option value="">Select supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>}
          {type === 'Other' && (
            <div>
              <label className="form-label">Description</label>
              <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} className="form-input" rows={2} />
            </div>
          )}
          {type !== 'Flight' && <PricingFields form={form} set={set} fmt={fmt} profit={profit} defaultMarkup={defaultMarkup} unitPricing={type === 'Guide'} quantity={form.quantity} costLocked={type === 'Guide' && Boolean(selectedGuideRate)} unitLabel={type === 'Guide' ? 'Guide' : 'Vehicle'} hidePricing={hidePricing} />}
        </div>
      )}

      <Modal
        isOpen={showTransferCreator}
        onClose={() => !creatingTransfer && setShowTransferCreator(false)}
        title="Create Transfer Master & Price Contract"
        size="xl"
        footer={<><button type="button" className="btn-secondary" disabled={creatingTransfer} onClick={() => setShowTransferCreator(false)}>Cancel</button><button type="button" className="btn-primary" disabled={creatingTransfer} onClick={createTransferAndRate}>{creatingTransfer ? 'Creating…' : 'Create transfer & rate'}</button></>}
      >
        <div className="space-y-5">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Transfer Master</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label><span className="form-label">Transfer name *</span><input className="form-input" value={transferDraft.name || ''} onChange={(event) => setDraft('name', event.target.value)} placeholder="e.g. Bangkok Airport to Pattaya Hotel" /></label>
              <label><span className="form-label">Destination *</span><SearchableSelect value={transferDraft.destination || ''} onChange={(value) => setDraft('destination', value)} options={destinationMasters.map((destination) => destination.name)} placeholder="Select destination" /></label>
              <label><span className="form-label">Tour duration</span><input className="form-input" value={transferDraft.duration || ''} onChange={(event) => setDraft('duration', event.target.value)} placeholder="e.g. 2 hours" /></label>
              <label><span className="form-label">Timing</span><input className="form-input" value={transferDraft.timing || ''} onChange={(event) => setDraft('timing', event.target.value)} placeholder="e.g. 08:00–20:00" /></label>
              <label className="md:col-span-2"><span className="form-label">Operating days</span><SearchableSelect isMulti value={transferDraft.operatingDays || []} onChange={(value) => setDraft('operatingDays', value)} options={['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']} placeholder="Select operating days" /></label>
              <label className="md:col-span-2"><span className="form-label">Description</span><textarea className="form-input min-h-20" value={transferDraft.description || ''} onChange={(event) => setDraft('description', event.target.value)} /></label>
              <label className="md:col-span-2"><span className="form-label">Useful information</span><textarea className="form-input min-h-20" value={transferDraft.usefulInformation || ''} onChange={(event) => setDraft('usefulInformation', event.target.value)} /></label>
            </div>
          </section>
          <section className="border-t border-slate-200 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Active price contract</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label><span className="form-label">Supplier *</span><SearchableSelect value={transferDraft.supplier || ''} onChange={(value) => setDraft('supplier', value)} options={allTransferSupplierOptions} placeholder="Select transfer supplier" /></label>
              <label><span className="form-label">Valid from *</span><DateInput value={transferDraft.fromDate || ''} max={transferDraft.toDate || undefined} onChange={(value) => setDraft('fromDate', value)} ariaLabel="Transfer rate valid-from date in DD-MM-YYYY format" /></label>
              <label><span className="form-label">Valid to *</span><DateInput value={transferDraft.toDate || ''} min={transferDraft.fromDate || undefined} onChange={(value) => setDraft('toDate', value)} ariaLabel="Transfer rate valid-to date in DD-MM-YYYY format" /></label>
              <label><span className="form-label">Service type *</span><SearchableSelect value={transferDraft.serviceType || ''} onChange={(value) => setTransferDraft((current) => ({ ...current, serviceType: value, vehicleCosts: [] }))} options={['SIC', 'PVT']} /></label>
              <label><span className="form-label">Currency *</span><input className="form-input" value={transferDraft.currency || ''} onChange={(event) => setDraft('currency', event.target.value.toUpperCase())} maxLength={10} /></label>
              {transferDraft.serviceType === 'SIC' && <><label><span className="form-label">Adult cost</span><input type="number" min="0" step="0.01" className="form-input" value={transferDraft.adultCost ?? ''} onChange={(event) => setDraft('adultCost', event.target.value)} /></label><label><span className="form-label">Child cost</span><input type="number" min="0" step="0.01" className="form-input" value={transferDraft.childCost ?? ''} onChange={(event) => setDraft('childCost', event.target.value)} /></label></>}
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <div className="bg-slate-900 px-4 py-3 text-white"><p className="text-sm font-semibold">{transferDraft.serviceType || 'Transfer'} vehicle pricing</p><p className="mt-0.5 text-xs text-slate-300">Only active {transferDraft.serviceType || 'matching'} vehicles from Vehicle Master are available. Enter a rate for each vehicle you offer.</p></div>
              {draftVehicleOptions.length === 0 ? <p className="p-4 text-sm text-amber-700">No active {transferDraft.serviceType || 'matching'} vehicle is available. Create one in Vehicle Master first.</p> : <table className="w-full text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-2 text-left">Vehicle</th><th className="px-4 py-2 text-left">Transfer capacity</th><th className="px-4 py-2 text-left">Cost ({transferDraft.currency || 'Currency'})</th></tr></thead><tbody className="divide-y divide-slate-200">{draftVehicleOptions.map((vehicle) => <tr key={vehicle.id}><td className="px-4 py-2 font-medium text-slate-700">{vehicle.name}</td><td className="px-4 py-2 text-slate-600">{vehicle.transferCapacity} Pax</td><td className="px-4 py-2"><input type="number" min="0" step="0.01" className="form-input max-w-xs" value={draftVehicleCost(vehicle)} onChange={(event) => setDraftVehicleCost(vehicle, event.target.value)} placeholder="Enter cost" /></td></tr>)}</tbody></table>}
            </div>
          </section>
        </div>
      </Modal>

      <Modal
        isOpen={showAirportCreator}
        onClose={() => !creatingAirport && setShowAirportCreator(false)}
        title="Create Airport"
        size="md"
        footer={<><button type="button" className="btn-secondary" disabled={creatingAirport} onClick={() => setShowAirportCreator(false)}>Cancel</button><button type="button" className="btn-primary" disabled={creatingAirport} onClick={createAirport}>{creatingAirport ? 'Creating…' : 'Create Airport'}</button></>}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2"><span className="form-label">Airport Name</span><input className="form-input" value={airportDraft.name} onChange={(event) => setAirportDraft((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Suvarnabhumi Airport" /></label>
          <label><span className="form-label">City</span><input className="form-input" value={airportDraft.city} onChange={(event) => setAirportDraft((current) => ({ ...current, city: event.target.value }))} placeholder="e.g. Bangkok" /></label>
          <label><span className="form-label">Country</span><input className="form-input" value={airportDraft.country} onChange={(event) => setAirportDraft((current) => ({ ...current, country: event.target.value }))} /></label>
          <label><span className="form-label">IATA Code</span><input className="form-input" maxLength={3} value={airportDraft.iataCode} onChange={(event) => setAirportDraft((current) => ({ ...current, iataCode: event.target.value.toUpperCase() }))} placeholder="BKK" /></label>
          <label><span className="form-label">ICAO Code</span><input className="form-input" maxLength={4} value={airportDraft.icaoCode} onChange={(event) => setAirportDraft((current) => ({ ...current, icaoCode: event.target.value.toUpperCase() }))} placeholder="VTBS" /></label>
        </div>
      </Modal>

      {/* Footer */}
      <div className="sticky -bottom-3 z-10 -mx-4 -mb-3 mt-3 flex justify-end gap-2 border-t border-slate-300 bg-slate-50 px-4 py-2.5">
        <button onClick={onCancel} className="btn-secondary !h-8 !px-4 !text-xs">Cancel</button>
        <button onClick={handleSave} className="btn-primary !h-8 !px-4 !text-xs">{initialData ? 'Save Service' : 'Add Service'}</button>
      </div>
    </div>
  );
}

function MasterRateNotice({ loading, hasMaster, rates, label, market, date }) {
  if (loading || !hasMaster) return null;
  if (rates.length > 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        {rates.length} active {label}{rates.length === 1 ? '' : 's'} found for {date ? formatDate(date) : 'the selected date'}{market ? ` in ${market}` : ''}. Select one to use its saved supplier and price.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      No active {label} is available for {date ? formatDate(date) : 'the selected date'}{market ? ` in ${market}` : ''}. Add a price contract in the relevant master before quoting this service.
    </div>
  );
}

function PricingFields({ form, set, fmt, profit, defaultMarkup, unitPricing = false, quantity = 1, costLocked = false, unitLabel = 'Vehicle', hidePricing = false }) {
  if (hidePricing) return <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">This service is included in the combined package total.</div>;
  const normalizedQuantity = Math.max(1, Number(quantity || 1));
  const totalSupplierCost = Number(form.totalSupplierCost ?? (Number(form.supplierCost || 0) * normalizedQuantity));
  const totalSellingPrice = Number(form.totalSellingPrice ?? (Number(form.sellingPrice || 0) * normalizedQuantity));
  const markupAmount = totalSellingPrice - totalSupplierCost;
  return (
    <div className="space-y-2.5 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-50 to-white p-3 shadow-sm">
      <SectionTitle color="bg-emerald-500">Pricing</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="form-label">Supplier Cost{unitPricing ? ` / ${unitLabel}` : ''}</label>
          <input type="number" value={form.supplierCost ?? ''} readOnly={costLocked} onChange={e => set('supplierCost', e.target.value === '' ? 0 : Number(e.target.value))} className={`form-input ${costLocked ? 'bg-slate-50' : ''}`} placeholder="฿0" />
        </div>
        <div>
          <label className="form-label">Set Margin / Markup %</label>
          <input type="number" value={form.markup ?? defaultMarkup} onChange={e => set('markup', e.target.value === '' ? '' : Number(e.target.value))} className="form-input" />
        </div>
        <div>
          <label className="form-label">Selling Price{unitPricing ? ` / ${unitLabel}` : ''}</label>
          <input type="number" value={form.sellingPrice ?? ''} readOnly={costLocked} onChange={e => set('sellingPrice', e.target.value === '' ? 0 : Number(e.target.value))} className={`form-input ${costLocked ? 'bg-slate-50' : ''}`} placeholder="Auto" />
        </div>
      </div>
      <div className={`grid gap-2 ${unitPricing ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
        {unitPricing && <>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total Supplier Cost</div><div className="text-sm font-extrabold text-slate-900">{fmt(totalSupplierCost)}</div><div className="text-[10px] text-slate-400">{normalizedQuantity} × {unitLabel.toLowerCase()} rate</div></div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5"><div className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Total Selling Price</div><div className="text-sm font-extrabold text-blue-700">{fmt(totalSellingPrice)}</div></div>
        </>}
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5"><div className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Markup ({Number(form.markup ?? defaultMarkup).toFixed(2)}%)</div><div className={`text-sm font-extrabold ${markupAmount >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{fmt(markupAmount)}</div></div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5"><div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">{unitPricing ? 'Total Profit' : 'Profit'}</div><div className={`text-sm font-extrabold ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(profit)}</div></div>
      </div>
    </div>
  );
}

function SectionTitle({ children, color = 'bg-blue-500' }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
      <span className={`h-3 w-1 rounded-full ${color}`} />
      {children}
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function TotalSummary({ cost, sell, markupPercent = 0 }) {
  const fmt = (n) => `฿${Number(n || 0).toLocaleString()}`;
  const profit = (sell || 0) - (cost || 0);
  const tile = 'rounded-lg border px-3 py-1.5';
  return (
    <div className="rounded-xl border border-slate-300 bg-gradient-to-b from-slate-50 to-white p-3 shadow-sm space-y-2">
      <SectionTitle color="bg-emerald-500">Summary</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className={`${tile} border-slate-200 bg-white`}><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total Cost</div><div className="text-sm font-extrabold text-slate-900">{fmt(cost)}</div></div>
        <div className={`${tile} border-blue-200 bg-blue-50`}><div className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Total Selling</div><div className="text-sm font-extrabold text-blue-700">{fmt(sell)}</div></div>
        <div className={`${tile} border-indigo-200 bg-indigo-50`}><div className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Markup ({Number(markupPercent || 0).toFixed(2)}%)</div><div className={`text-sm font-extrabold ${profit >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{fmt(profit)}</div></div>
        <div className={`${tile} border-emerald-200 bg-emerald-50`}><div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Profit</div><div className={`text-sm font-extrabold ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(profit)}</div></div>
      </div>
    </div>
  );
}

function VehicleFleetEditor({ vehicleCosts = [], selections = [], disabled = false, fmt, onChange }) {
  const quantities = new Map(
    (selections || []).map((entry) => [String(vehicleRateId(entry?.vehicle) || vehicleRateId(entry)), Number(entry?.quantity || 0)]),
  );
  const offeredVehicles = (vehicleCosts || []).filter((vehicle) => vehicleRateId(vehicle));
  if (!offeredVehicles.length) return null;
  const updateQuantity = (vehicle, rawValue) => {
    const changedId = String(vehicleRateId(vehicle));
    const changedQuantity = Math.max(0, Number(rawValue || 0));
    const nextSelections = offeredVehicles.map((offeredVehicle) => {
      const id = String(vehicleRateId(offeredVehicle));
      const quantity = id === changedId ? changedQuantity : Math.max(0, Number(quantities.get(id) || 0));
      return quantity ? { vehicle: offeredVehicle, quantity } : null;
    }).filter(Boolean);
    onChange(nextSelections);
  };
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${disabled ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-blue-200 bg-blue-50/40'}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-800">Manual vehicle bifurcation</div>
          <p className="mt-0.5 text-[11px] text-slate-500">The suggested fleet above is only a default. Set any contracted vehicle quantity you need; pricing updates immediately.</p>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">Manual override</span>
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_58px_76px_58px] gap-2 border-b border-slate-100 bg-slate-50 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
          <span>Vehicle</span><span>Seats</span><span>Rate</span><span className="text-right">Qty</span>
        </div>
        {offeredVehicles.map((vehicle) => {
          const id = String(vehicleRateId(vehicle));
          return (
            <div key={id} className="grid grid-cols-[minmax(0,1fr)_58px_76px_58px] items-center gap-2 border-b border-slate-100 px-2 py-1.5 last:border-b-0">
              <span className="truncate text-xs font-medium text-slate-700" title={vehicleRateName(vehicle)}>{vehicleRateName(vehicle)}</span>
              <span className="text-xs text-slate-500">{Number(vehicle.capacity || 0)} Pax</span>
              <span className="text-xs font-medium text-slate-600">{fmt(vehicle.cost)}</span>
              <input
                aria-label={`${vehicleRateName(vehicle)} quantity`}
                type="number"
                min="0"
                step="1"
                disabled={disabled}
                value={quantities.get(id) || ''}
                onChange={(event) => updateQuantity(vehicle, event.target.value)}
                className="form-input !h-7 !py-0 text-right"
                placeholder="0"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SightseeingCostBreakdown({ form, quotation, transfer, fmt }) {
  const adultCount = Number(form.adults ?? quotation?.adults ?? 0);
  const childCount = Number(form.children ?? quotation?.children ?? 0);
  const adultCost = adultCount * Number(form.adultSupplierRate || 0);
  const adultSelling = adultCount * Number(form.adultSellingRate || 0);
  const childCost = childCount * Number(form.childSupplierRate || 0);
  const childSelling = childCount * Number(form.childSellingRate || 0);
  const transferPricing = sightseeingTransferPricing(transfer, form, quotation);
  const totalCost = Number(form.totalSupplierCost || 0);
  const totalSelling = Number(form.totalSellingPrice || 0);
  // Only services created from an itinerary master combine ticket and
  // transfer pricing. Direct quotation-builder services keep their existing
  // transfer-only calculation once a transfer option is selected.
  const transferOnlyPricing = Boolean(transfer) && !form.itineraryMasterTicketPlusTransfer;
  const transferAdultCost = adultCount * Number(transfer?.adultPrice || 0);
  const transferChildCost = childCount * Number(transfer?.childPrice || 0);
  const rows = [
    ...(!transferOnlyPricing && adultCount > 0 ? [{
      label: 'Adult sightseeing tickets',
      detail: `${adultCount} × ${fmt(form.adultSupplierRate)} supplier rate`,
      cost: adultCost,
      selling: adultSelling,
    }] : []),
    ...(!transferOnlyPricing && childCount > 0 ? [{
      label: 'Child sightseeing tickets',
      detail: `${childCount} × ${fmt(form.childSupplierRate)} supplier rate`,
      cost: childCost,
      selling: childSelling,
    }] : []),
    ...(transfer ? [{
      label: `${transfer.type} transfer${transfer.route ? ` · ${transfer.route}` : ''}`,
      detail: [
        transfer.type === 'Ticket Only' ? 'No transfer charge' : `Adult: ${adultCount} × ${fmt(transfer.adultPrice)} = ${fmt(transferAdultCost)}`,
        transfer.type === 'Ticket Only' || childCount === 0 ? null : `Child: ${childCount} × ${fmt(transfer.childPrice)} = ${fmt(transferChildCost)}`,
        transferPricing.combination ? `${transferPricing.combination.label} (${transferPricing.combination.totalCapacity} Pax): ${fmt(transferPricing.vehicleCost)}` : null,
      ].filter(Boolean).join(' · '),
      cost: transferPricing.supplierCost,
      selling: transferPricing.sellingPrice,
    }] : []),
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-300 bg-gradient-to-r from-purple-50 to-white px-3 py-2">
        <div>
          <div className="text-xs font-extrabold text-slate-800">Sightseeing Cost Breakdown</div>
          <div className="text-[10px] text-slate-500">{form.itineraryMasterTicketPlusTransfer ? 'Variant tickets plus the selected transfer are included.' : 'Selected transfer charge only. Adult and child transfer amounts are shown separately.'}</div>
        </div>
        <div className="rounded-full border border-purple-200 bg-white px-2 py-0.5 text-[10px] font-bold text-purple-700">THB</div>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.length > 0 ? rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_78px_78px] sm:grid-cols-[minmax(0,1fr)_100px_100px] gap-2 sm:gap-3 px-3 py-2 text-xs">
            <div className="min-w-0">
              <div className="font-medium text-slate-700">{row.label}</div>
              <div className="mt-0.5 text-xs text-slate-500">{row.detail}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Cost</div>
              <div className="font-medium text-slate-700">{fmt(row.cost)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Selling</div>
              <div className="font-medium text-primary-600">{fmt(row.selling)}</div>
            </div>
          </div>
        )) : (
          <div className="px-4 py-3 text-center text-xs text-slate-500">Select a rate, passengers, or transfer to calculate the cost.</div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-slate-300 bg-slate-50 p-2.5 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total Supplier Cost</div><div className="text-sm font-extrabold text-slate-900">{fmt(totalCost)}</div></div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5"><div className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Total Selling Price</div><div className="text-sm font-extrabold text-blue-700">{fmt(totalSelling)}</div></div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5"><div className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Markup ({Number(form.markup || 0).toFixed(2)}%)</div><div className={`text-sm font-extrabold ${totalSelling - totalCost >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{fmt(totalSelling - totalCost)}</div></div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5"><div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Profit</div><div className={`text-sm font-extrabold ${totalSelling - totalCost >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(totalSelling - totalCost)}</div></div>
      </div>
    </div>
  );
}

function getDefaultForm(type, quotation, day, segment, defaultMarkup = 0) {
  const base = { adults: quotation?.adults || '', children: quotation?.children || '', infants: quotation?.infants || '', markup: defaultMarkup };
  if (type === 'Transfer') return { ...base, basis: 'Private', quantity: 1 };
  if (type === 'Flight') return { ...base, departure: '', arrival: '', price: '' };
  if (type === 'Sightseeing') return { ...base, basis: 'Ticket Only', transferOptionType: 'Ticket Only', inclusions: [], fromTime: '', toTime: '', dropUpTime: '' };
  if (type === 'Hotel') {
    // A hotel service belongs to the already-planned itinerary leg.  Start
    // with that full stay rather than a single itinerary day; the consultant
    // can still adjust it within the leg afterwards.
    const checkIn = segment?.fromDate || day?.date || quotation?.travelDate || '';
    const checkOut = segment?.toDate && segment.toDate > checkIn ? segment.toDate : nextCalendarDate(checkIn);
    return { ...base, checkIn, checkOut, nights: checkOut > checkIn ? nightsBetween(checkIn, checkOut) : 1, rooms: quotation?.rooms || '', roomAllocation: quotation?.roomAllocation || {}, mealPlan: '' };
  }
  if (type === 'Yacht') return { ...base, season: 'Standard', extraHours: 0, duration: '' };
  if (type === 'Meal') return { ...base, mealType: 'Dinner', withTransport: false };
  if (type === 'Guide') return { ...base, guideLanguage: 'english', guideRateKey: '', guideDuration: '', quantity: 1 };
  return { ...base };
}

function generateName(type, form) {
  if (type === 'Transfer') return `${form.origin || 'A'} → ${form.destination || 'B'}`;
  if (type === 'Flight') return form.airlineFlight || `${form.fromSector || form.origin || 'Flight'} → ${form.toSector || form.destination || 'Flight'}`;
  if (type === 'Sightseeing') return form.name || 'Activity';
  if (type === 'Hotel') return form.name || 'Hotel';
  if (type === 'Yacht') return form.name || 'Yacht Charter';
  if (type === 'Guide') return `${form.name || 'Guide'}${form.guideDuration ? ` · ${form.guideDuration}` : ''}`;
  if (type === 'Meal') return `${form.mealType || 'Meal'} at ${form.restaurant || 'Restaurant'}`;
  return type;
}
