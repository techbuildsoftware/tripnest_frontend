import { usesGitHotelRate } from './hotelRateTier';

const count = (value) => Math.max(0, Number(value || 0));

// CNB has two supplier rates. The allocation stores the total count, while
// the quotation stores each child's age. Allocate younger children first so a
// child at or below five is never accidentally charged the CNB-above-five rate.
export const childNoBedRateCounts = (allocation = {}, childAges = []) => {
  const total = count((allocation || {}).cnb);
  const belowOrEqualFive = (Array.isArray(childAges) ? childAges : [])
    .map((age) => Number(age))
    .filter((age) => Number.isFinite(age) && age >= 0 && age <= 5)
    .length;
  const belowFive = Math.min(total, belowOrEqualFive);
  return { belowFive, aboveFive: Math.max(0, total - belowFive) };
};

export const hotelAllocationChargeLines = (rate = {}, allocation = {}, groupRoomLimit = 0, childAges = []) => {
  // A night can have no matching contract while rates are loading or when a
  // date is outside every validity period. Keep the editor renderable in that
  // state; the caller marks the night unavailable and shows no price.
  const safeRate = rate || {};
  const safeAllocation = allocation || {};
  const rooms = count(safeAllocation.sgl) + count(safeAllocation.dbl);
  const usesGitRate = usesGitHotelRate(rooms, groupRoomLimit);
  const childNoBed = childNoBedRateCounts(safeAllocation, childAges);
  // A hotel can define a group-room threshold but omit GIT figures on a
  // particular contract. Treat that as an unavailable tier, not as a free
  // room: price the room at its configured FIT amount and make the fallback
  // visible in the nightly breakdown.
  const roomLine = (key, label, gitKey, fitKey, quantity, travellersPerUnit) => {
    const gitAvailable = count(safeRate[gitKey]) > 0;
    const useGitForLine = usesGitRate && gitAvailable;
    return {
      key,
      label: `${useGitForLine ? 'GIT' : 'FIT'} ${label}${usesGitRate && !useGitForLine ? ' (GIT unavailable)' : ''}`,
      rateKey: useGitForLine ? gitKey : fitKey,
      quantity,
      travellersPerUnit,
    };
  };
  return [
    roomLine('sgl', 'SGL', 'gitSingle', 'fitSingle', count(safeAllocation.sgl), 1),
    roomLine('dbl', 'DBL', 'gitDouble', 'fitDouble', count(safeAllocation.dbl), 2),
    { key: 'adultExtraBed', label: 'Adult extra bed', rateKey: 'adultExtraBed', quantity: count(safeAllocation.adultExtraBed), travellersPerUnit: 1 },
    { key: 'cwb', label: 'CWB', rateKey: 'childWithBed', quantity: count(safeAllocation.cwb), travellersPerUnit: 1 },
    { key: 'cnbBelow5', label: 'CNB ≤5', rateKey: 'childNoBedBelow5', quantity: childNoBed.belowFive, travellersPerUnit: 1 },
    { key: 'cnbAbove5', label: 'CNB >5', rateKey: 'childNoBedAbove5', quantity: childNoBed.aboveFive, travellersPerUnit: 1 },
    { key: 'inf', label: 'Infant', rateKey: 'infant', quantity: count(safeAllocation.inf), travellersPerUnit: 1 },
  ].map((line) => ({ ...line, rate: count(safeRate[line.rateKey]) }));
};

export const hotelAllocationRateCost = (rate = {}, allocation = {}, groupRoomLimit = 0, childAges = []) => (
  hotelAllocationChargeLines(rate, allocation, groupRoomLimit, childAges)
    .reduce((total, line) => total + line.quantity * line.rate, 0)
);
