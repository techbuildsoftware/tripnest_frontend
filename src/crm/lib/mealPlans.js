const clean = (value) => String(value || '').trim();
const key = (value) => clean(value).toLowerCase();

export const activeMealPlanNames = (masters = []) => [...new Map(
  masters
    .map((master) => clean(master?.name || master?.label || master))
    .filter(Boolean)
    .map((name) => [key(name), name]),
).values()];

/** Maps retired hotel-board labels only when their new master replacement exists. */
export const currentMealPlanName = (value, masters = []) => {
  const options = activeMealPlanNames(masters);
  const existing = options.find((option) => key(option) === key(value));
  if (existing) return existing;
  const legacy = key(value).replace(/\s+/g, ' ');
  const replacement = /^(cp\s*\(\s*breakfast\s*\)|breakfast|breakfast only|bb)$/.test(legacy)
    ? 'rb'
    : /^(ep\s*\(\s*no\s*breakfast\s*\)|ep|no breakfast|room only)$/.test(legacy)
      ? 'ro'
      : '';
  if (!replacement) return '';
  return options.find((option) => key(option) === replacement || new RegExp(`^${replacement}(?:\\b|\\s|\\()`).test(key(option))) || '';
};

export const preferredMealPlanName = (masters = []) => {
  const options = activeMealPlanNames(masters);
  return options.find((option) => key(option) === 'rb')
    || options.find((option) => key(option) === 'ro')
    || options[0]
    || '';
};
