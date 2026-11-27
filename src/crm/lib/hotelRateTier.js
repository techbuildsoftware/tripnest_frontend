export const hotelGroupLimit = (value) => {
  const limit = Number(value);
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
};

// A hotel with no group limit always uses FIT pricing. Otherwise GIT applies
// only after the selected number of SGL + DBL rooms exceeds the hotel limit.
export const usesGitHotelRate = (roomCount, groupRoomLimit) => {
  const limit = hotelGroupLimit(groupRoomLimit);
  return limit > 0 && Number(roomCount || 0) > limit;
};

export const hotelRateTierDescription = (groupRoomLimit) => {
  const limit = hotelGroupLimit(groupRoomLimit);
  return limit > 0
    ? `FIT: up to ${limit} rooms · GIT: more than ${limit} rooms`
    : 'FIT: default (no group limit)';
};

