export const blankNumber = (value) => (value === '' || value === null || value === undefined ? '' : Number(value));
export const priceNumber = (value) => (value === '' || value === null || value === undefined ? 0 : Number(value));
export const isExpiredPrice = (rate) => {
  if (!rate?.toDate) return false;
  const todayIso = todayIsoInTimeZone();
  return rate.toDate < todayIso;
};
import { todayIsoInTimeZone } from './date';
