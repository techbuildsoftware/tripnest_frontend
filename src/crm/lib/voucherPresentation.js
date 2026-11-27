const voucherDateKey = (value) => {
  const raw = String(value || '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;
  const display = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (display) return `${display[3]}${display[2]}${display[1]}`;
  return raw ? `z-${raw}` : 'z-';
};

const timeKey = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.MAX_SAFE_INTEGER;
};

const manualOrder = (row) => {
  const value = Number(row?.voucherOrder ?? row?.displayOrder);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

// A drag/drop choice belongs to this voucher, not the source booking. Keep it
// ahead of any default sort, while old vouchers without an explicit order keep
// their current date/time behaviour.
export const sortVoucherRows = (rows = []) => [...(Array.isArray(rows) ? rows : [])]
  .map((row, index) => ({ row, index, order: manualOrder(row) }))
  .sort((left, right) => {
    if (left.order !== null && right.order !== null) return left.order - right.order || left.index - right.index;
    if (left.order !== null) return -1;
    if (right.order !== null) return 1;
    return left.index - right.index;
  })
  .map(({ row }) => row);

// Flight order is operational information, not the order records happened to
// be imported. Keep same-day flights in departure-time order unless a
// consultant explicitly rearranged the voucher rows.
export const sortVoucherFlights = (flights = []) => {
  const rows = Array.isArray(flights) ? flights : [];
  if (rows.some((row) => manualOrder(row) !== null)) return sortVoucherRows(rows);
  return [...rows].sort((left, right) => (
      voucherDateKey(left?.date || left?.serviceDate).localeCompare(voucherDateKey(right?.date || right?.serviceDate))
      || timeKey(left?.departure || left?.fromTime) - timeKey(right?.departure || right?.fromTime)
      || timeKey(left?.arrival || left?.arrivalTime) - timeKey(right?.arrival || right?.arrivalTime)
      || String(left?.airlineFlight || left?.airline || left?.flightNo || '').localeCompare(String(right?.airlineFlight || right?.airline || right?.flightNo || ''))
  ));
};

const vehicleName = (value) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (!value || typeof value !== 'object') return '';
  return String(value.vehicleName || value.name || value.label || value.vehicle || '').trim();
};

const selectionLabel = (selections) => selections
  .map((entry) => {
    const name = vehicleName(entry?.vehicle) || vehicleName(entry);
    const quantity = Math.max(1, Number(entry?.quantity || 1));
    return name ? `${name}${quantity > 1 ? ` × ${quantity}` : ''}` : '';
  })
  .filter(Boolean)
  .join(' + ');

// Quotations store a vehicle combination as an array. This must take priority
// over the legacy single `vehicleName`, otherwise a Van + Sedan booking is
// reduced to one generic vehicle on its voucher.
export const voucherVehicleLabel = (service = {}) => (
  selectionLabel(Array.isArray(service.vehicleSelections) ? service.vehicleSelections : [])
  || selectionLabel(Array.isArray(service.transferVehicleSelections) ? service.transferVehicleSelections : [])
  || selectionLabel(Array.isArray(service.transportVehicleSelections) ? service.transportVehicleSelections : [])
  || vehicleName(service.vehicleName)
  || vehicleName(service.vehicle)
  || vehicleName(service.transportVehicleName)
  || vehicleName(service.transferVehicleName)
  || (typeof service.vehicle === 'string' ? service.vehicle : '')
);

const FLEET_FIELDS = [
  'vehicle', 'vehicleId', 'vehicleName', 'vehicleSelectionKey', 'vehicleSelections', 'vehicleTotalCapacity', 'vehicleAutoSelectedForPax',
  'transferVehicle', 'transferVehicleName', 'transferVehicleSelectionKey', 'transferVehicleSelections', 'transferVehicleTotalCapacity', 'transferVehicleAutoSelectedForPax',
  'transportVehicle', 'transportVehicleName', 'transportVehicleSelectionKey', 'transportVehicleSelections', 'transportVehicleTotalCapacity', 'transportVehicleManualSelection',
];

// Saved voucher rows may retain editable notes, but cannot replace the fleet
// selected on the current quotation/booking service.
export const keepSourceVehicleSelection = (source = {}, merged = {}) => {
  const hasSelectedFleet = [source.vehicleSelections, source.transferVehicleSelections, source.transportVehicleSelections]
    .some((selections) => Array.isArray(selections) && selections.length);
  if (!hasSelectedFleet) return merged;
  return FLEET_FIELDS.reduce((next, field) => (
    Object.prototype.hasOwnProperty.call(source, field) ? { ...next, [field]: source[field] } : next
  ), merged);
};
