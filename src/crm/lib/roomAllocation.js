const ROOM_ALLOCATION_FIELDS = [
  ['sgl', 'SGL'],
  ['dbl', 'DBL'],
  ['adultExtraBed', 'Extra Bed'],
  ['cwb', 'CWB'],
  ['cnb', 'CNB'],
  ['inf', 'Infant'],
];

export const hasRoomAllocation = (allocation) => (
  allocation && typeof allocation === 'object' && !Array.isArray(allocation)
  && ROOM_ALLOCATION_FIELDS.some(([field]) => Number(allocation[field] || 0) > 0)
);

export const roomAllocationText = (allocation, rooms = 0) => {
  if (typeof allocation === 'string' && allocation.trim()) return allocation.trim();

  const parts = hasRoomAllocation(allocation)
    ? ROOM_ALLOCATION_FIELDS
      .filter(([field]) => Number(allocation[field] || 0) > 0)
      .map(([field, label]) => `${Number(allocation[field])} ${label}`)
    : [];

  if (parts.length) return parts.join(' + ');
  const roomCount = Number(rooms || 0);
  return roomCount > 0 ? `${roomCount} Room${roomCount === 1 ? '' : 's'}` : 'Room allocation on request';
};

// Hotel rows on older vouchers can lack their own allocation. In that case the
// booking-level allocation is the same allocation used when the hotel was quoted.
export const hotelRoomAllocationText = (hotel = {}, booking = {}) => {
  const hotelAllocation = hotel.roomAllocation || hotel.roomAllocationText || hotel.allocation;
  const allocation = hasRoomAllocation(hotelAllocation) || (typeof hotelAllocation === 'string' && hotelAllocation.trim())
    ? hotelAllocation
    : booking.roomAllocation;
  return roomAllocationText(allocation, hotel.rooms || hotel.roomCount || booking.rooms);
};
