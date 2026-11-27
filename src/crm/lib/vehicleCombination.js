export const vehicleRateId = (vehicle = {}) => vehicle.vehicleId || vehicle.vehicle || vehicle.id || '';
export const vehicleRateName = (vehicle = {}) => vehicle.vehicleName || vehicle.vehicle || vehicle.name || '';

const combinationKey = (entries = []) => entries
  .map((entry) => `${vehicleRateId(entry.vehicle)}x${entry.quantity}`)
  .sort()
  .join('|');

const combinationLabel = (entries = []) => entries
  .slice()
  .sort((left, right) => Number(right.vehicle?.capacity || 0) - Number(left.vehicle?.capacity || 0))
  .map(({ vehicle, quantity }) => `${vehicleRateName(vehicle)}${quantity > 1 ? ` × ${quantity}` : ''}`)
  .join(' + ');

// Automatic selection is only a starting point.  Consultants must be able to
// dispatch a deliberately different fleet (for example one van plus three
// sedans) and that choice must be priced from the same contracted vehicle
// rates.  Keep this helper alongside the automatic combination generator so
// quotation, booking and voucher data use one canonical fleet shape.
export const vehicleCombinationFromSelections = (vehicleCosts = [], selections = []) => {
  const available = new Map(
    (vehicleCosts || [])
      .filter((vehicle) => vehicleRateId(vehicle))
      .map((vehicle) => [String(vehicleRateId(vehicle)), vehicle]),
  );
  const quantities = new Map();
  (selections || []).forEach((selection) => {
    const id = String(vehicleRateId(selection?.vehicle) || vehicleRateId(selection) || '');
    const quantity = Math.max(0, Number(selection?.quantity || 0));
    if (!id || !available.has(id) || !quantity) return;
    quantities.set(id, (quantities.get(id) || 0) + quantity);
  });
  const entries = [...quantities.entries()]
    .map(([id, quantity]) => ({ vehicle: available.get(id), quantity }))
    .sort((left, right) => Number(right.vehicle?.capacity || 0) - Number(left.vehicle?.capacity || 0) || vehicleRateName(left.vehicle).localeCompare(vehicleRateName(right.vehicle)));
  return {
    key: combinationKey(entries),
    entries,
    totalCapacity: entries.reduce((total, entry) => total + Number(entry.vehicle?.capacity || 0) * Number(entry.quantity || 0), 0),
    totalCost: entries.reduce((total, entry) => total + Number(entry.vehicle?.cost || 0) * Number(entry.quantity || 0), 0),
    label: combinationLabel(entries),
  };
};

// The operational rule is deliberately vehicle-first: use the fewest cars
// possible, then minimise unused seats, then choose the lower total cost.
// This yields one van for five passengers, van + sedan for nine or ten, and
// van + SUV for eleven or twelve with the standard 2/4/8 capacities.
export const vehicleCombinationOptions = (vehicleCosts = [], partySize = 1) => {
  const vehicles = [...vehicleCosts]
    .filter((vehicle) => vehicleRateId(vehicle) && Number(vehicle.capacity || 0) > 0)
    .sort((left, right) => Number(left.capacity || 0) - Number(right.capacity || 0) || Number(left.cost || 0) - Number(right.cost || 0));
  if (!vehicles.length) return [];

  const requiredPax = Math.max(1, Number(partySize || 1));
  const maxCapacity = Math.max(...vehicles.map((vehicle) => Number(vehicle.capacity || 0)));
  const minCapacity = Math.min(...vehicles.map((vehicle) => Number(vehicle.capacity || 0)));
  const minVehicles = Math.max(1, Math.ceil(requiredPax / maxCapacity));
  const maxVehicles = Math.max(minVehicles, Math.ceil(requiredPax / minCapacity));

  for (let count = minVehicles; count <= maxVehicles; count += 1) {
    const combinations = [];
    const add = (startIndex, remaining, selected) => {
      if (!remaining) {
        const totalCapacity = selected.reduce((total, vehicle) => total + Number(vehicle.capacity || 0), 0);
        if (totalCapacity < requiredPax) return;
        const entries = vehicles
          .map((vehicle) => ({ vehicle, quantity: selected.filter((item) => vehicleRateId(item) === vehicleRateId(vehicle)).length }))
          .filter((entry) => entry.quantity);
        const totalCost = entries.reduce((total, entry) => total + Number(entry.vehicle.cost || 0) * entry.quantity, 0);
        combinations.push({ key: combinationKey(entries), entries, totalCapacity, totalCost, label: combinationLabel(entries) });
        return;
      }
      for (let index = startIndex; index < vehicles.length; index += 1) add(index, remaining - 1, [...selected, vehicles[index]]);
    };
    add(0, count, []);
    if (combinations.length) {
      return combinations.sort((left, right) => (
        (left.totalCapacity - requiredPax) - (right.totalCapacity - requiredPax)
        || left.totalCost - right.totalCost
        || left.label.localeCompare(right.label)
      ));
    }
  }
  return [];
};

export const selectedVehicleCombination = (vehicleCosts, partySize, selectedKey = '') => {
  const options = vehicleCombinationOptions(vehicleCosts, partySize);
  return options.find((option) => option.key === selectedKey) || options[0] || null;
};
