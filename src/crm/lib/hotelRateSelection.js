const normalise = (value) => String(value || '').trim().toLowerCase();

export const hotelWeekdayForDate = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
};

export const isHotelWeekendDate = (hotel = {}, date = '') => {
  const weekday = hotelWeekdayForDate(date);
  return (hotel.weekends || []).some((day) => normalise(day) === normalise(weekday));
};

const priceType = (rate = {}) => normalise(rate.priceType || 'All Days');

// Weekend contracts only apply on the specific weekend days configured on the
// Hotel Master. "All Days" is the normal fallback. Offer prices remain
// available for an explicit selection, but never displace either base rate.
export const orderedHotelRatesForDate = (rates = [], hotel = {}, date = '') => {
  const weekend = isHotelWeekendDate(hotel, date);
  const applicable = rates.filter((rate) => priceType(rate) !== 'weekends' || weekend);
  const rank = (rate) => {
    const type = priceType(rate);
    if (weekend && type === 'weekends') return 0;
    if (type === 'all days') return 1;
    return 2;
  };
  return [...applicable].sort((left, right) => rank(left) - rank(right));
};

export const preferredHotelRateForDate = (rates = [], hotel = {}, date = '') =>
  orderedHotelRatesForDate(rates, hotel, date).find((rate) => {
    const type = priceType(rate);
    return type === 'all days' || (isHotelWeekendDate(hotel, date) && type === 'weekends');
  }) || orderedHotelRatesForDate(rates, hotel, date)[0] || null;

