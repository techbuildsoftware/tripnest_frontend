const text = (value) => String(value || '').trim();
const normalize = (value) => text(value).toLowerCase();
const sameId = (left, right) => left !== undefined && left !== null && right !== undefined && right !== null && String(left) === String(right);
export const richTextLines = (value) => String(value || '')
  .replace(/<li[^>]*>/gi, '• ')
  .replace(/<\/(p|div|li|h2|h3|blockquote)>/gi, '\n')
  .replace(/<br\s*\/?>(?:\n)?/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ')
  .split(/\n+/).map((line) => line.trim()).filter(Boolean);

export function imageUrl(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return imageUrl(value[0]);
  return value.url || value.imageUrl || value.path || null;
}

function sourceImage(item) {
  return imageUrl(item?.image)
    || imageUrl(item?.imageUrl)
    || imageUrl(item?.images)
    || imageUrl(item?.activityImages)
    || imageUrl(item?.yachtImages)
    || imageUrl(item?.hotelImage)
    || imageUrl(item?.supplierImage)
    || null;
}

const SERVICE_IMAGE_FALLBACKS = {
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=70',
  transfer: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=70',
  sightseeing: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&q=70',
  activity: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&q=70',
  yacht: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=400&q=70',
  ferry: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&q=70',
  meal: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=70',
  restaurant: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=70',
  flight: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=70',
  guide: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&q=70',
  other: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&q=70',
};

function fallbackServiceImage(service) {
  return SERVICE_IMAGE_FALLBACKS[normalize(service?.type)] || SERVICE_IMAGE_FALLBACKS.other;
}

function clientLogo(item) {
  return imageUrl(item?.companyLogo)
    || imageUrl(item?.logo)
    || sourceImage(item)
    || null;
}

function matchingItem(items, service, idKeys = []) {
  const id = idKeys.map((key) => service?.[key]).find(Boolean) || service?.masterId;
  if (id) {
    const byId = items.find((item) => sameId(item?.id, id) || sameId(item?._id, id));
    if (byId) return byId;
  }
  const name = normalize(service?.name || service?.hotel || service?.masterName);
  if (!name) return null;
  const exact = items.find((item) => normalize(item?.name) === name);
  if (exact) return exact;
  // A quotation can carry a supplier suffix while the hotel master retains
  // the concise hotel name. Match only when that name is unambiguous.
  const fuzzyMatches = items.filter((item) => {
    const itemName = normalize(item?.name);
    return itemName && (name.includes(itemName) || itemName.includes(name));
  }).sort((left, right) => normalize(right?.name).length - normalize(left?.name).length);
  return fuzzyMatches.length === 1 ? fuzzyMatches[0] : null;
}

function selectedVehicle(service, masters = {}) {
  const selectedId = service?.vehicleId || service?.vehicle || service?.transferVehicleId;
  const vehicleName = normalize(service?.vehicleName || service?.vehicleLabel || service?.selectedVehicleName || service?.transferVehicleName);
  return (masters.vehicles || []).find((item) => sameId(item?.id, selectedId) || sameId(item?._id, selectedId))
    || (vehicleName ? (masters.vehicles || []).find((item) => normalize(item?.name || item?.vehicleName) === vehicleName) : null)
    || null;
}

function serviceMaster(service, masters) {
  const type = normalize(service?.type);
  if (type === 'hotel') return matchingItem(masters.hotels, service, ['hotelId']);
  if (type === 'sightseeing') return matchingItem(masters.sightseeing, service, ['sightseeingId']);
  if (type === 'yacht') return matchingItem(masters.yachts, service, ['yachtId']);
  if (type === 'transfer') return matchingItem(masters.transfers, service, ['transferId']);
  if (type === 'ferry') return matchingItem(masters.ferryClasses, service, ['ferryClassId']);
  if (type === 'meal' || type === 'restaurant') return matchingItem(masters.restaurants, service, ['restaurantId']);
  return null;
}

function masterDescription(service, masters = {}) {
  const master = serviceMaster(service, masters);
  const variant = (master?.variants || []).find((item) => sameId(item?.id, service?.variantId) || sameId(item?._id, service?.variantId));
  // A variant is the most specific customer-facing description. Fall back to
  // the saved master description, then to the quotation snapshot so old
  // quotations remain complete even if a master is later removed.
  return text(
    variant?.description
      || variant?.details
      || master?.details
      || master?.description
      || service?.masterDescription
      || service?.description
      || service?.details,
  );
}

export const serviceDescriptionLines = (service) => richTextLines(
  service?.masterDescription || service?.description || service?.details,
);

const serviceType = (service) => normalize(service?.type);

// A saved template controls the client-facing document only.  This keeps the
// consultant's working quotation complete while ensuring the preview, direct
// download, browser print, and email attachment all receive the same content.
// Existing templates have no visibility keys, so they intentionally preserve
// the previous behaviour.
export function applyClientPdfVisibility(quotation = {}, config = {}) {
  const showItinerary = config.showClientItinerary !== false;
  const showHotels = config.showClientHotels !== false;
  const showSightseeing = config.showClientSightseeing !== false;
  const showMasterDescriptions = config.showClientMasterDescriptions !== false;

  const includeService = (service) => {
    const type = serviceType(service);
    if (type === 'hotel') return showHotels;
    return (type !== 'sightseeing' && type !== 'activity') || showSightseeing;
  };

  const visibleService = (service) => ({
    ...service,
    // Components use this explicit flag instead of deleting customer-written
    // notes that may share the same `description` field as master content.
    hideMasterDescription: !showMasterDescriptions,
  });

  const filterDay = (day) => {
    const services = (day?.services || []).filter(includeService).map(visibleService);
    return {
      ...day,
      services,
      hotel: showHotels ? day?.hotel : null,
    };
  };

  const filterCollection = (items = [], category) => items
    .filter((item) => category === 'hotel'
      ? showHotels
      : category === 'sightseeing'
        ? showSightseeing
        : includeService({ type: item?.category || item?.type }))
    .map(visibleService);

  const itinerary = showItinerary ? (quotation.itinerary || []).map(filterDay) : [];
  const days = showItinerary ? (quotation.days || []).map(filterDay) : [];

  return {
    ...quotation,
    itinerary,
    days,
    hotels: filterCollection(quotation.hotels, 'hotel'),
    sightseeing: filterCollection(quotation.sightseeing, 'sightseeing'),
    highlights: filterCollection(quotation.highlights),
  };
}

function serviceImage(service, masters) {
  const master = serviceMaster(service, masters);
  // A transfer may have a generic Transfer Master image. Once a vehicle is
  // selected, the client PDF must instead show that Sedan/SUV/Van image.
  const vehicle = normalize(service?.type) === 'transfer' ? selectedVehicle(service, masters) : null;
  const variant = master?.variants?.find((item) => sameId(item?.id, service?.variantId) || sameId(item?._id, service?.variantId));
  const supplierId = service?.supplierId || master?.supplierId || master?.supplier;
  const supplierName = normalize(service?.supplier || master?.supplierName);
  const supplier = masters.suppliers.find((item) => item?.id === supplierId || item?._id === supplierId)
    || masters.suppliers.find((item) => normalize(item?.name) === supplierName);
  // The selected sightseeing variant is the customer-facing product. Its
  // image must win over any general sightseeing or old service image in every
  // quotation template.
  if (normalize(service?.type) === 'sightseeing') return sourceImage(variant) || sourceImage(service?.variantImage) || sourceImage(service?.selectedVariantImage) || sourceImage(service) || sourceImage(master) || sourceImage(supplier) || fallbackServiceImage(service);
  return sourceImage(vehicle) || sourceImage(service) || sourceImage(variant) || sourceImage(master) || sourceImage(supplier) || fallbackServiceImage(service);
}

function vehicleDisplayName(service, masters) {
  const selectedId = service?.vehicleId || service?.vehicle || service?.transferVehicleId;
  const vehicle = selectedVehicle(service, masters);
  // Vehicle master names are the customer-facing types/model labels (SUV,
  // Sedan, Van, etc.). Do not expose the internal SIC/PVT service basis.
  return text(
    service?.vehicleName || service?.vehicleLabel || service?.selectedVehicleName
      || service?.transferVehicleName || vehicle?.name || vehicle?.vehicleName
      || (selectedId && !String(selectedId).match(/^[a-f0-9]{16,}$/i) ? selectedId : ''),
  );
}

function serviceBasisLabel(service = {}) {
  const value = normalize(service.transferOptionType || service.serviceType || service.basis);
  if (!value) return '';
  if (value === 'sic') return 'SIC';
  if (value === 'pvt' || value === 'private') return 'Private';
  if (value === 'ticket only' || value === 'ticket-only' || value === 'ticket') return 'Ticket Only';
  return text(service.transferOptionType || service.serviceType || service.basis);
}

function customerMoney(amount, currency = 'THB') {
  const symbol = currency === 'THB' ? '฿' : `${currency} `;
  return `${symbol}${Number(amount).toLocaleString()}`;
}

function clientRateSummary(service = {}, currency = 'THB') {
  if (normalize(service.type) !== 'sightseeing') return '';
  const rates = [];
  const adult = Number(service.adultSellingRate ?? service.adultSell ?? service.adultSellingPrice ?? 0);
  const child = Number(service.childSellingRate ?? service.childSell ?? service.childSellingPrice ?? 0);
  if (adult > 0) rates.push(`Adult: ${customerMoney(adult, currency)}`);
  if (child > 0) rates.push(`Child: ${customerMoney(child, currency)}`);
  return rates.join(' · ');
}

export function roomAllocationText(allocation = {}, rooms = 0) {
  const labels = [
    ['sgl', 'SGL'], ['dbl', 'DBL'], ['adultExtraBed', 'Extra Bed'],
    ['cwb', 'CWB'], ['cnb', 'CNB'], ['inf', 'Infant'],
  ];
  const parts = labels
    .filter(([field]) => Number(allocation?.[field] || 0) > 0)
    .map(([field, label]) => `${Number(allocation[field])} ${label}`);
  return parts.join(' + ') || (Number(rooms || 0) > 0 ? `${Number(rooms)} Room${Number(rooms) === 1 ? '' : 's'}` : 'Room allocation on request');
}

function sightseeingTiming(service, masters = {}) {
  if (text(service?.time)) return text(service.time);
  const master = serviceMaster(service, masters);
  if (text(master?.timing)) return text(master.timing);
  const showTimes = (master?.showTimings || []).map((item) => text(typeof item === 'string' ? item : item?.time)).filter(Boolean);
  return [...new Set(showTimes)].join(' / ');
}

function pdfServiceDetail(service, masters = {}) {
  if (service?.type === 'Flight') {
    const sector = service.fromSector || service.toSector || service.origin || service.destination
      ? `${service.fromSector || service.origin || '—'} → ${service.toSector || service.destination || '—'}`
      : '';
    const times = service.departure || service.arrival ? `${service.departure || '—'} – ${service.arrival || '—'}` : '';
    return [service.airlineFlight || service.airline || service.flightNo, sector, times].filter(Boolean).join(' · ');
  }
  if (service?.type === 'Sightseeing') {
    const timing = sightseeingTiming(service, masters);
    const basis = serviceBasisLabel(service);
    const vehicle = basis === 'Ticket Only' ? '' : vehicleDisplayName(service, masters);
    return [timing ? `Show timing: ${timing}` : '', basis, vehicle ? `Vehicle: ${vehicle}` : '', service.variantName || ''].filter(Boolean).join(' · ');
  }
  if (service?.type === 'Transfer') {
    const route = service.route || [service.origin || service.pickupFrom, service.destination || service.dropTo].filter(Boolean).join(' → ');
    const basis = serviceBasisLabel(service);
    const vehicle = vehicleDisplayName(service, masters);
    return [route, basis, vehicle ? `Vehicle: ${vehicle}` : ''].filter(Boolean).join(' · ');
  }
  if (service?.type === 'Hotel') {
    return [
      service.roomType || service.roomCat || '',
      service.mealPlan || service.meal || '',
      `Room allocation: ${roomAllocationText(service.roomAllocation, service.rooms)}`,
    ].filter(Boolean).join(' · ');
  }
  return service?.details || service?.route || service?.variantName || '';
}

function numericValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function durationFromDates(startDate, endDate) {
  if (!startDate || !endDate) return '';
  const start = new Date(`${String(startDate).slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(`${String(endDate).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start) return '';
  const nights = Math.round((end - start) / (24 * 60 * 60 * 1000));
  return `${nights} ${nights === 1 ? 'Night' : 'Nights'} / ${nights + 1} ${nights + 1 === 1 ? 'Day' : 'Days'}`;
}

/**
 * The quotation pricing object is the single source of truth.  Service rows
 * are intentionally only a fallback because their fields vary by service
 * type (hotel totals, transfer quantities, SIC rates, and so on).
 */
export function quotationTotals(quotation = {}) {
  const services = (quotation.itinerary || quotation.days || []).flatMap((day) => day.services || []);
  const calculatedCost = services.reduce((total, service) => total + (numericValue(
    service.totalSupplierCost, service.supplierCost, service.cost, service.netRate,
  ) ?? 0), 0);
  const calculatedSelling = services.reduce((total, service) => total + (numericValue(
    service.totalSellingPrice, service.sellingPrice, service.selling, service.cost, service.netRate,
  ) ?? 0), 0);
  const pricing = Array.isArray(quotation.pricing) ? quotation.pricingSummary || {} : quotation.pricing || {};
  const totalCost = numericValue(pricing.totalCost, quotation.totalCost, calculatedCost) ?? 0;
  const totalSelling = numericValue(
    pricing.totalSelling, quotation.totalSelling, quotation.totalPrice, calculatedSelling,
  ) ?? 0;
  return { totalCost, totalSelling, grossProfit: totalSelling - totalCost };
}

// All client PDFs use the same per-person calculation as the quotation
// pricing screen: the package selling price divided by the adult count.  A
// stored sellingPP is only used as a fallback for older quotations that do
// not have an adult count.
export function quotationPricePerPerson(quotation = {}) {
  const { totalSelling } = quotationTotals(quotation);
  const adults = Number(quotation.adults || 0);
  if (adults > 0) return Math.round(totalSelling / adults);
  const pricing = Array.isArray(quotation.pricing) ? quotation.pricingSummary || {} : quotation.pricing || {};
  return Math.round(numericValue(pricing.sellingPP, quotation.sellingPP, totalSelling) ?? 0);
}

// The quotation total can include hotels, transfers and other package items,
// whereas only ticket/meal services store an explicit child selling rate. Use
// those saved customer rates to preserve their adult/child ratio, then spread
// the full customer-facing package total using that ratio. Supplier costs are
// deliberately never read here because this helper is used in client PDFs.
export function quotationPassengerPrices(quotation = {}) {
  const adults = Math.max(0, Number(quotation.adults || 0));
  const children = Math.max(0, Number(quotation.children || 0));
  const { totalSelling } = quotationTotals(quotation);
  const fallback = quotationPricePerPerson(quotation);

  if (!adults || !children || !totalSelling) {
    return { adult: fallback, child: fallback, hasDifferentChildPrice: false };
  }

  let adultRateTotal = 0;
  let childRateTotal = 0;
  let matchedRateCount = 0;
  const services = (quotation.itinerary || quotation.days || []).flatMap((day) => day.services || []);

  services.forEach((service) => {
    const type = normalize(service?.type);
    // These are the package services with saved per-adult and per-child
    // customer rates. Hotel child charges are occupancy-based, so including
    // them here would falsely turn a room allocation into a per-child rate.
    if (!['sightseeing', 'meal', 'restaurant'].includes(type)) return;

    const adultRate = numericValue(service.adultSellingRate, service.adultSell, service.adultSellingPrice);
    const childRate = numericValue(service.childSellingRate, service.childSell, service.childSellingPrice);
    if (adultRate === null || childRate === null) return;

    adultRateTotal += adultRate;
    childRateTotal += childRate;
    matchedRateCount += 1;
  });

  if (!matchedRateCount || adultRateTotal <= 0 || adultRateTotal === childRateTotal) {
    return { adult: fallback, child: fallback, hasDifferentChildPrice: false };
  }

  const weightedGuests = adults + (children * (childRateTotal / adultRateTotal));
  if (!Number.isFinite(weightedGuests) || weightedGuests <= 0) {
    return { adult: fallback, child: fallback, hasDifferentChildPrice: false };
  }

  // Derive the child amount from the remainder so displayed adult/child
  // amounts always add back to the exact package total after rounding.
  const adult = Math.round(totalSelling / weightedGuests);
  const child = Math.round((totalSelling - (adult * adults)) / children);
  if (child < 0) return { adult: fallback, child: fallback, hasDifferentChildPrice: false };

  return { adult, child, hasDifferentChildPrice: true };
}

export function quotationForPdf(quotation, masters = {}) {
  const lookup = {
    hotels: masters.hotels || [],
    sightseeing: masters.sightseeing || [],
    yachts: masters.yachts || [],
    transfers: masters.transfers || [],
    ferryClasses: masters.ferryClasses || [],
    vehicles: masters.vehicles || [],
    restaurants: masters.restaurants || [],
    suppliers: masters.suppliers || [],
    agents: masters.agents || [],
    b2c: masters.b2c || [],
  };
  const clientRecords = quotation?.clientType === 'B2C' ? lookup.b2c
    : quotation?.clientType === 'Agent' ? lookup.agents
      : [...lookup.agents, ...lookup.b2c];
  const client = clientRecords.find((item) => item?.id === quotation?.agentId || item?._id === quotation?.agentId)
    || clientRecords.find((item) => normalize(item?.name) === normalize(quotation?.agentName));
  const days = Array.isArray(quotation?.days) ? quotation.days : [];
  const services = days.flatMap((entry) => (entry.services || []).map((service) => ({
    ...service,
    serviceDate: entry.date,
    destination: entry.destination || service.destination || '',
    roomAllocation: service.roomAllocation || quotation?.roomAllocation || {},
    time: normalize(service?.type) === 'sightseeing' ? sightseeingTiming(service, lookup) : service.time,
    image: serviceImage(service, lookup),
    masterDescription: masterDescription(service, lookup),
    basisLabel: serviceBasisLabel(service),
    clientRateSummary: clientRateSummary(service, quotation?.currency),
  })));
  const hotels = services.filter((service) => service.type === 'Hotel').map((service) => {
    const master = serviceMaster(service, lookup);
    return {
      city: master?.city || master?.destination || service.itineraryDestination || service.destination || '',
      name: service.name || service.hotel || 'Hotel',
      category: service.category || '',
      roomType: service.roomType || service.roomCat || '',
      nights: service.nights || '',
      mealPlan: service.mealPlan || service.meal || '',
      rooms: service.rooms || quotation?.rooms || 0,
      roomAllocation: roomAllocationText(service.roomAllocation || quotation?.roomAllocation || {}, service.rooms || quotation?.rooms || 0),
      checkIn: service.checkIn || service.serviceDate,
      checkOut: service.checkOut || '',
      image: service.image || sourceImage(master) || null,
    };
  });
  const itinerary = days.map((entry, index) => {
    const dayServices = (entry.services || []).map((service) => {
      const enrichedService = {
        ...service,
        roomAllocation: service.roomAllocation || quotation?.roomAllocation || {},
        time: normalize(service?.type) === 'sightseeing' ? sightseeingTiming(service, lookup) : service.time,
        masterDescription: masterDescription(service, lookup),
        basisLabel: serviceBasisLabel(service),
        clientRateSummary: clientRateSummary(service, quotation?.currency),
      };
      return {
        ...enrichedService,
        image: serviceImage(enrichedService, lookup),
        vehicleName: vehicleDisplayName(enrichedService, lookup),
        label: enrichedService.name || enrichedService.variantName || enrichedService.type,
        detail: pdfServiceDetail(enrichedService, lookup),
      };
    });
    // A day can retain an older general/master thumbnail.  When that day has a
    // selected sightseeing variant, its image is the customer-facing image and
    // must take precedence across every quotation template.
    const selectedSightseeingImage = dayServices.find((service) => (
      normalize(service?.type) === 'sightseeing' && service.image
    ))?.image || null;
    return {
      day: entry.day || index + 1,
      date: entry.date || '',
      title: entry.title || entry.destination || `Day ${index + 1}`,
      description: entry.description || entry.notes || dayServices.map((service) => service.label).join(' • '),
      hotel: dayServices.find((service) => service.type === 'Hotel')?.label || null,
      meal: dayServices.find((service) => service.type === 'Meal' || service.type === 'Restaurant')?.label || null,
      transport: dayServices.find((service) => service.type === 'Transfer')?.label || null,
      inclusions: entry.inclusions || [],
      notes: entry.notes || null,
      services: dayServices,
      image: selectedSightseeingImage || sourceImage(entry) || dayServices.find((service) => service.image)?.image || null,
    };
  });
  const totals = quotationTotals(quotation);
  const brandName = client?.name || quotation?.agentName || 'TripNest';
  const brandLogo = clientLogo(client);
  const highlights = services
    .filter((service) => service?.name || service?.label || service?.variantName)
    .map((service) => ({
      category: service.type || 'Service',
      title: service.name || service.label || service.variantName,
      description: pdfServiceDetail(service, lookup),
      image: service.image || null,
    }));
  return {
    quotationNo: quotation?.quotationNo || quotation?.quotationNumber || quotation?.id || '', quotationDate: quotation?.quotationDate || quotation?.createdAt || '', status: quotation?.status || 'Draft',
    agent: { name: quotation?.agentName || 'Direct', email: quotation?.agentEmail || '', phone: quotation?.agentPhone || '' },
    guest: { name: quotation?.guestName || quotation?.guests?.[0]?.name || '', email: quotation?.guests?.[0]?.email || '', phone: quotation?.guests?.[0]?.phone || '' },
    travelStartDate: quotation?.travelDate || '', travelEndDate: quotation?.endDate || '', duration: quotation?.duration || durationFromDates(quotation?.travelDate, quotation?.endDate), adults: quotation?.adults || 0, children: quotation?.children || 0, rooms: quotation?.rooms || 0,
    totalPax: `${quotation?.adults || 0} Adults + ${quotation?.children || 0} Children`, destination: quotation?.destination || '', packageType: quotation?.queryType || 'Travel Package', hotels, itinerary,
    sightseeing: services.filter((service) => service.type === 'Sightseeing').map((service) => ({ name: service.name, type: service.basis || '', destination: service.destination, description: pdfServiceDetail(service, lookup), time: sightseeingTiming(service, lookup), image: service.image || null })),
    transfers: services.filter((service) => service.type === 'Transfer').map((service) => ({ from: service.pickupFrom || service.origin || '', to: service.dropTo || service.destination || '', type: service.transferType || service.basis || '', vehicle: vehicleDisplayName(service, lookup), pax: Number(service.adults || 0) + Number(service.children || 0), description: pdfServiceDetail(service, lookup), image: service.image || null })),
    flights: services.filter((service) => service.type === 'Flight').map((service) => ({ airlineFlight: service.airlineFlight || service.airline || service.flightNo || '', fromSector: service.fromSector || service.origin || '', toSector: service.toSector || service.destination || '', departure: service.departure || '', arrival: service.arrival || '', price: Number(service.price || service.totalSellingPrice || 0) })),
    inclusions: quotation?.inclusions || [], exclusions: quotation?.exclusions || [],
    pricing: [{ category: 'Package total', netRate: totals.totalSelling, total: totals.totalSelling, currency: quotation?.currency || 'THB' }],
    pricingSummary: totals, totalCost: totals.totalCost, totalSelling: totals.totalSelling, grossProfit: totals.grossProfit,
    totalPrice: totals.totalSelling, currency: quotation?.currency || 'THB', optionalAddons: quotation?.optionalAddons || [], paymentTerms: quotation?.paymentTerms || [], cancellationPolicy: quotation?.cancellationPolicy || [],
    // Keep the original rich HTML alongside the legacy text-array fallback so
    // every PDF can retain the author’s ordered lists, bullets and emphasis.
    termsHtml: quotation?.termsHtml || '',
    importantNotes: [...richTextLines(quotation?.termsHtml), ...(quotation?.notes ? [quotation.notes] : [])],
    // The PDF is branded for the quotation recipient. Agent logos are taken
    // from their master record; B2C records naturally render name-only until
    // a logo is supplied in master data.
    companyDetails: {
      name: brandName,
      address: client?.address || '',
      phone: client?.phone || client?.landline || '',
      email: client?.email || '',
      website: client?.website || '',
      tagline: quotation?.clientType === 'B2C' ? 'Travel Quotation' : (client?.businessType || client?.companyType || 'Travel Quotation'),
    },
    logo: brandLogo,
    highlights,
  };
}
