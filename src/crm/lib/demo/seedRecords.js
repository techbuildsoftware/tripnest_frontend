import { addDays, daysBetween, nowIso, roundMoney, todayBangkok } from './util';

// ---------------------------------------------------------------------------
// Service builders — they produce the same record shapes the itinerary builder
// saves, derived from the seeded masters and rate contracts.
// ---------------------------------------------------------------------------
let serial = 0;
const sid = (prefix) => `${prefix}-seed-${++serial}`;
const weekdayName = (iso) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${iso}T00:00:00Z`).getUTCDay()];

export function makeHotelService(m, { hotel: hotelName, checkIn, nights, rooms = 1, adults = 2, children = 0, market = 'Indian', roomType, mealPlan = 'RB', markup = 12 }) {
  const hotel = m.hotels.find((h) => h.name === hotelName);
  const rate = m.hotelRates.find((r) => r.hotelId === hotel.id && r.market === market) || m.hotelRates.find((r) => r.hotelId === hotel.id);
  const roomRate = rate.roomRates.find((r) => r.roomType === (roomType || hotel.roomTypes[0]) && r.mealPlan === mealPlan) || rate.roomRates[0];
  const perNight = roomRate.fitDouble * rooms;
  const nightly = Array.from({ length: nights }, (_, i) => ({
    date: addDays(checkIn, i), supplierCost: perNight, sellingPrice: roundMoney(perNight * (1 + markup / 100)), surchargeCost: 0, surchargeLines: [], rateContractId: rate.id,
  }));
  const totalSupplierCost = perNight * nights;
  const totalSellingPrice = nightly.reduce((s, n) => s + n.sellingPrice, 0);
  return {
    id: sid('hotel'), type: 'Hotel', hotelId: hotel.id, hotelGroupLimit: hotel.groupRoomLimit, rateContractId: rate.id, name: hotel.name, destination: hotel.destination, itineraryDestination: hotel.destination,
    supplier: hotel.supplierName, supplierName: hotel.supplierName, supplierId: hotel.supplier || '', roomType: roomRate.roomType, mealPlan: roomRate.mealPlan, rooms, adults, children,
    checkIn, checkOut: addDays(checkIn, nights), nights, supplierCost: perNight, sellingPrice: roundMoney(perNight * (1 + markup / 100)), totalSupplierCost, totalSellingPrice, markup,
    currency: 'THB', serviceDate: checkIn, hotelImage: hotel.hotelImage, image: hotel.hotelImage, nightlyRateBreakdown: nightly, availabilityStatus: 'Pending', availabilityNotes: '',
  };
}

export function makeTransferService(m, { name, date, time = '10:00', adults = 2, children = 0, type = 'SIC', vehicle = 'SUV', markup = 12 }) {
  const transfer = m.operations.transfers.find((t) => t.name === name);
  const rate = m.transferRates.find((r) => r.transferId === transfer.id && r.serviceType === type && r.market === 'Indian');
  const pax = adults + children;
  let cost; let vehicleName = '';
  if (type === 'SIC') cost = rate.adultCost * adults + rate.childCost * children;
  else { const v = rate.vehicleCosts.find((x) => x.vehicleName === vehicle) || rate.vehicleCosts[1]; cost = v.cost; vehicleName = v.vehicleName; }
  const [origin, destinationLabel] = name.split(' To ');
  return {
    id: sid('transfer'), type: 'Transfer', masterId: transfer.id, rateContractId: rate.id, name, origin, destination: destinationLabel, itineraryDestination: transfer.destination,
    supplier: rate.supplierName, supplierName: rate.supplierName, supplierId: rate.supplier, basis: type === 'SIC' ? 'Sic' : 'Private', serviceType: type, vehicle: vehicleName, vehicleId: vehicleName, vehicleName,
    vehicleAutoSelectedForPax: pax, adults, children, infants: 0, quantity: 1, supplierCost: cost, sellingPrice: roundMoney(cost * (1 + markup / 100)), totalSupplierCost: cost, totalSellingPrice: roundMoney(cost * (1 + markup / 100)),
    adultTransferCost: rate.adultCost, childTransferCost: rate.childCost, markup, currency: 'THB', serviceDate: date, time, fromTime: time, pickupFrom: origin, dropAt: destinationLabel,
  };
}

export function makeSightseeingService(m, { name, date, adults = 2, children = 0, transfer = 'SIC', markup = 12, time }) {
  const ss = m.sightseeingModule.find((s) => s.name === name);
  const variant = ss.variants[0];
  const rate = variant.rates.find((r) => r.market === 'Indian');
  const tx = ss.transfers.find((t) => t.type === transfer) || ss.transfers[0];
  const ticketCost = rate.adultCost * adults + rate.childCost * children;
  const transferCost = tx.type === 'SIC' ? (tx.adultPrice * adults + tx.childPrice * children) : tx.type === 'PVT' ? (tx.vehicleCosts[1]?.cost || 0) : 0;
  const cost = ticketCost + transferCost;
  const supplier = m.suppliers.find((s) => s.id === ss.supplier);
  const sell = roundMoney(cost * (1 + markup / 100));
  return {
    id: sid('sight'), type: 'Sightseeing', masterId: ss.id, variantId: variant.id, variantRateKey: rate.id, name: `${ss.name} · ${variant.name}`, destination: ss.destination, itineraryDestination: ss.destination,
    supplier: supplier?.name || '', supplierName: supplier?.name || '', supplierId: supplier?.id || '', basis: transfer === 'PVT' ? 'Private' : transfer === 'SIC' ? 'Sic' : 'Ticket Only', inclusions: ss.items,
    transferOptionType: transfer === 'Ticket Only' ? 'Ticket Only' : transfer, transferOptionId: tx.id, adults, children, infants: 0,
    adultSupplierRate: rate.adultCost, childSupplierRate: rate.childCost, adultSellingRate: roundMoney(rate.adultCost * (1 + markup / 100)), childSellingRate: roundMoney(rate.childCost * (1 + markup / 100)),
    sightseeingTicketSupplierCost: ticketCost, sightseeingTransferVehicleCost: transferCost,
    totalSupplierCost: cost, totalSellingPrice: sell, markup, currency: 'THB', time: time || variant.defaultFromTime, fromTime: time || variant.defaultFromTime, toTime: variant.defaultToTime, dropUpTime: variant.defaultDropTime,
    image: ss.image, imageUrl: ss.image?.url, serviceDate: date, duration: ss.duration,
  };
}

export function makeMealService(m, { name, date, adults = 2, children = 0, markup = 12 }) {
  const restaurant = m.restaurants.find((r) => r.name === name);
  const rate = m.restaurantRates.find((r) => r.restaurantId === restaurant.id && r.market === 'Indian');
  const cost = rate.adultCost * adults + rate.childCost * children;
  return {
    id: sid('meal'), type: 'Meal', masterId: restaurant.id, rateContractId: rate.id, name: restaurant.name, destination: restaurant.destination, itineraryDestination: restaurant.destination,
    supplier: rate.supplierName, supplierName: rate.supplierName, supplierId: rate.supplier, mealType: rate.mealType, adults, children, adultRate: rate.adultCost, childRate: rate.childCost, transportCost: 0,
    adultSellingRate: roundMoney(rate.adultCost * (1 + markup / 100)), childSellingRate: roundMoney(rate.childCost * (1 + markup / 100)), totalSupplierCost: cost, totalSellingPrice: roundMoney(cost * (1 + markup / 100)),
    markup, currency: 'THB', serviceDate: date, time: restaurant.timing.split(' - ')[0], image: restaurant.image,
  };
}

const sumBy = (days, type, key) => days.flatMap((d) => d.services).filter((s) => s.type === type).reduce((t, s) => t + Number(s[key] || 0), 0);
export function computePricing(days, adults, markupPct = 12) {
  const p = {
    hotelCost: sumBy(days, 'Hotel', 'totalSupplierCost'), hotelSelling: sumBy(days, 'Hotel', 'totalSellingPrice'),
    transferCost: sumBy(days, 'Transfer', 'totalSupplierCost'), transferSelling: sumBy(days, 'Transfer', 'totalSellingPrice'),
    sightseeingCost: sumBy(days, 'Sightseeing', 'totalSupplierCost'), sightseeingSelling: sumBy(days, 'Sightseeing', 'totalSellingPrice'),
    yachtCost: sumBy(days, 'Yacht', 'supplierCost'), yachtSelling: sumBy(days, 'Yacht', 'sellingPrice'),
    mealCost: sumBy(days, 'Meal', 'totalSupplierCost'), mealSelling: sumBy(days, 'Meal', 'totalSellingPrice'),
    guideCost: sumBy(days, 'Guide', 'totalSupplierCost'), guideSelling: sumBy(days, 'Guide', 'totalSellingPrice'),
    otherCost: 0, otherSelling: 0,
  };
  p.totalCost = p.hotelCost + p.transferCost + p.sightseeingCost + p.yachtCost + p.mealCost + p.guideCost;
  p.totalSelling = p.hotelSelling + p.transferSelling + p.sightseeingSelling + p.yachtSelling + p.mealSelling + p.guideSelling;
  p.markup = p.totalSelling - p.totalCost;
  p.margin = p.totalSelling > 0 ? Number(((p.markup / p.totalSelling) * 100).toFixed(2)) : 0;
  p.sellingPP = Math.round(p.totalSelling / Math.max(1, adults));
  p.globalMarkupType = 'percentage'; p.globalMarkupValue = markupPct; p.globalMarkupAmount = 0; p.globalMarkupCost = 0;
  return p;
}

// ---------------------------------------------------------------------------
// Trip plans used to generate realistic quotations / bookings
// ---------------------------------------------------------------------------
const PLANS = {
  pattayaBangkok: {
    title: 'Pattaya & Bangkok Escape', destination: 'Pattaya, Bangkok', duration: 6,
    legs: [['Bangkok', 'Pattaya', 0, 3], ['Pattaya', 'Bangkok', 3, 5]],
    build: (m, ctx) => [
      [0, 'Pattaya', 'Arrival & Pattaya', [makeTransferService(m, { name: 'Bangkok Airport To Pattaya Hotel', date: ctx.d(0), time: '11:00', ...ctx.pax, type: 'PVT', vehicle: ctx.pvt }), makeHotelService(m, { hotel: 'The Beverly Hotel Pattaya', checkIn: ctx.d(0), nights: 3, ...ctx.stay })]],
      [1, 'Pattaya', 'Coral Island Day', [makeSightseeingService(m, { name: 'Coral Island Tour by Speedboat', date: ctx.d(1), ...ctx.pax })]],
      [2, 'Pattaya', 'Cabaret Evening', [makeSightseeingService(m, { name: 'Alcazar Cabaret Show', date: ctx.d(2), ...ctx.pax, time: '19:00' }), makeMealService(m, { name: 'Seafood Paradise Jomtien', date: ctx.d(2), ...ctx.pax })]],
      [3, 'Bangkok', 'Pattaya to Bangkok', [makeTransferService(m, { name: 'Pattaya Hotel To Bangkok Hotel', date: ctx.d(3), time: '11:00', ...ctx.pax, type: 'PVT', vehicle: ctx.pvt }), makeHotelService(m, { hotel: 'Ecotel Bangkok', checkIn: ctx.d(3), nights: 2, ...ctx.stay })]],
      [4, 'Bangkok', 'Bangkok City & Temples', [makeSightseeingService(m, { name: 'Bangkok City & Temples Tour', date: ctx.d(4), ...ctx.pax }), makeSightseeingService(m, { name: 'Chao Phraya Dinner Cruise', date: ctx.d(4), ...ctx.pax, time: '19:00' })]],
      [5, 'Bangkok', 'Departure', [makeTransferService(m, { name: 'Bangkok Hotel To Bangkok Airport', date: ctx.d(5), time: '12:00', ...ctx.pax, type: 'SIC' })]],
    ],
  },
  phuketKrabi: {
    title: 'Phuket & Krabi Honeymoon', destination: 'Phuket, Krabi', duration: 7,
    legs: [['Phuket', 'Phuket', 0, 3], ['Phuket', 'Krabi', 3, 6]],
    build: (m, ctx) => [
      [0, 'Phuket', 'Arrival in Phuket', [makeTransferService(m, { name: 'Phuket Airport To Phuket Hotel', date: ctx.d(0), time: '13:00', ...ctx.pax, type: 'PVT', vehicle: ctx.pvt }), makeHotelService(m, { hotel: 'Andamatra Resort & Villa Phuket', checkIn: ctx.d(0), nights: 3, ...ctx.stay })]],
      [1, 'Phuket', 'Phi Phi & Maya Bay', [makeSightseeingService(m, { name: 'Phi Phi & Maya Bay by Speedboat', date: ctx.d(1), ...ctx.pax })]],
      [2, 'Phuket', 'Old Town & Sunset Dinner', [makeSightseeingService(m, { name: 'Phuket Big Buddha & Old Town', date: ctx.d(2), ...ctx.pax }), makeMealService(m, { name: 'Kan Eang Sunset Dining', date: ctx.d(2), ...ctx.pax })]],
      [3, 'Krabi', 'Phuket to Krabi', [makeTransferService(m, { name: 'Phuket Hotel To Krabi Hotel', date: ctx.d(3), time: '11:00', ...ctx.pax, type: 'PVT', vehicle: ctx.pvt }), makeHotelService(m, { hotel: 'Krabi Coral Beach Resort', checkIn: ctx.d(3), nights: 4, ...ctx.stay })]],
      [4, 'Krabi', '4 Islands Tour', [makeSightseeingService(m, { name: '4 Islands Tour by Longtail', date: ctx.d(4), ...ctx.pax })]],
      [5, 'Krabi', 'Leisure Day', [makeMealService(m, { name: 'Tandoori Nights Krabi', date: ctx.d(5), ...ctx.pax })]],
      [6, 'Krabi', 'Departure', [makeTransferService(m, { name: 'Krabi Hotel To Krabi Airport', date: ctx.d(6), time: '12:00', ...ctx.pax, type: 'SIC' })]],
    ],
  },
  bangkok: {
    title: 'Bangkok City Break', destination: 'Bangkok', duration: 5,
    legs: [['Bangkok', 'Bangkok', 0, 4]],
    build: (m, ctx) => [
      [0, 'Bangkok', 'Arrival in Bangkok', [makeTransferService(m, { name: 'Bangkok Airport To Bangkok Hotel', date: ctx.d(0), time: '14:00', ...ctx.pax, type: 'PVT', vehicle: ctx.pvt }), makeHotelService(m, { hotel: 'Riverside Grand Bangkok', checkIn: ctx.d(0), nights: 4, ...ctx.stay })]],
      [1, 'Bangkok', 'Temples & Culture', [makeSightseeingService(m, { name: 'Bangkok City & Temples Tour', date: ctx.d(1), ...ctx.pax })]],
      [2, 'Bangkok', 'Safari World', [makeSightseeingService(m, { name: 'Safari World & Marine Park', date: ctx.d(2), ...ctx.pax })]],
      [3, 'Bangkok', 'River Dinner Cruise', [makeSightseeingService(m, { name: 'Chao Phraya Dinner Cruise', date: ctx.d(3), ...ctx.pax, time: '19:00' }), makeMealService(m, { name: 'Baiyoke Sky Buffet', date: ctx.d(3), ...ctx.pax })]],
      [4, 'Bangkok', 'Departure', [makeTransferService(m, { name: 'Bangkok Hotel To Bangkok Airport', date: ctx.d(4), time: '13:00', ...ctx.pax, type: 'SIC' })]],
    ],
  },
  chiangMai: {
    title: 'Chiang Mai Culture & Elephants', destination: 'Chiang Mai', duration: 5,
    legs: [['Chiang Mai', 'Chiang Mai', 0, 4]],
    build: (m, ctx) => [
      [0, 'Chiang Mai', 'Arrival in Chiang Mai', [makeTransferService(m, { name: 'Chiang Mai Airport To Chiang Mai Hotel', date: ctx.d(0), time: '12:00', ...ctx.pax, type: 'SIC' }), makeHotelService(m, { hotel: 'Lanna Heritage Hotel', checkIn: ctx.d(0), nights: 4, ...ctx.stay })]],
      [1, 'Chiang Mai', 'Elephant Sanctuary', [makeSightseeingService(m, { name: 'Elephant Sanctuary Experience', date: ctx.d(1), ...ctx.pax })]],
      [2, 'Chiang Mai', 'Old City at leisure', [makeMealService(m, { name: 'Khantoke Dinner Chiang Mai', date: ctx.d(2), ...ctx.pax })]],
      [3, 'Chiang Mai', 'Free day', []],
      [4, 'Chiang Mai', 'Departure', [makeTransferService(m, { name: 'Chiang Mai Hotel To Chiang Mai Airport', date: ctx.d(4), time: '12:30', ...ctx.pax, type: 'SIC' })]],
    ],
  },
  samui: {
    title: 'Koh Samui Island Retreat', destination: 'Koh Samui', duration: 6,
    legs: [['Koh Samui', 'Koh Samui', 0, 5]],
    build: (m, ctx) => [
      [0, 'Koh Samui', 'Arrival on Samui', [makeTransferService(m, { name: 'Samui Airport To Samui Hotel', date: ctx.d(0), time: '13:00', ...ctx.pax, type: 'PVT', vehicle: ctx.pvt }), makeHotelService(m, { hotel: 'Samui Palm Retreat', checkIn: ctx.d(0), nights: 5, ...ctx.stay })]],
      [1, 'Koh Samui', 'Beach day', []],
      [2, 'Koh Samui', 'Angthong Marine Park', [makeSightseeingService(m, { name: 'Angthong Marine Park Tour', date: ctx.d(2), ...ctx.pax })]],
      [3, 'Koh Samui', 'Spa & leisure', []],
      [4, 'Koh Samui', 'Free day', []],
      [5, 'Koh Samui', 'Departure', [makeTransferService(m, { name: 'Samui Hotel To Samui Airport', date: ctx.d(5), time: '13:00', ...ctx.pax, type: 'SIC' })]],
    ],
  },
  phuketFamily: {
    title: 'Phuket Family Beach Holiday', destination: 'Phuket', duration: 6,
    legs: [['Phuket', 'Phuket', 0, 5]],
    build: (m, ctx) => [
      [0, 'Phuket', 'Arrival in Phuket', [makeTransferService(m, { name: 'Phuket Airport To Phuket Hotel', date: ctx.d(0), time: '12:00', ...ctx.pax, type: 'PVT', vehicle: ctx.pvt }), makeHotelService(m, { hotel: 'Patong Sands Hotel', checkIn: ctx.d(0), nights: 5, ...ctx.stay })]],
      [1, 'Phuket', 'James Bond Island', [makeSightseeingService(m, { name: 'James Bond Island by Longtail', date: ctx.d(1), ...ctx.pax })]],
      [2, 'Phuket', 'Beach at leisure', []],
      [3, 'Phuket', 'Phi Phi Islands', [makeSightseeingService(m, { name: 'Phi Phi & Maya Bay by Speedboat', date: ctx.d(3), ...ctx.pax })]],
      [4, 'Phuket', 'Sunset dinner', [makeMealService(m, { name: 'Kan Eang Sunset Dining', date: ctx.d(4), ...ctx.pax })]],
      [5, 'Phuket', 'Departure', [makeTransferService(m, { name: 'Phuket Hotel To Phuket Airport', date: ctx.d(5), time: '13:00', ...ctx.pax, type: 'SIC' })]],
    ],
  },
};

const INCLUSIONS = ['Accommodation as per itinerary with daily breakfast', 'All transfers as mentioned (SIC / Private)', 'Sightseeing tours with entrance tickets as per itinerary', 'Meet & greet at the airport', 'All applicable hotel taxes'];
const EXCLUSIONS = ['International airfare', 'Visa fees', 'Travel insurance', 'Lunch and dinner unless mentioned', 'Personal expenses, tips and porterage'];

function buildDays(m, plan, startDate, ctx) {
  const entries = plan.build(m, { ...ctx, d: (n) => addDays(startDate, n) });
  return entries.map(([offset, destination, title, services], i) => ({
    id: `day-${i + 1}`, day: i + 1, dayNumber: i + 1, date: addDays(startDate, offset), destination, title,
    description: title, services,
    segmentIndex: Math.max(0, plan.legs.findIndex(([, , from, to]) => offset >= from && offset <= to)),
  }));
}

// ---------------------------------------------------------------------------
// Main record seed
// ---------------------------------------------------------------------------
export function buildRecords(m) {
  const T = todayBangkok();
  const stamp = (offsetDays = 0) => { const d = new Date(`${addDays(T, offsetDays)}T09:30:00Z`); return d.toISOString(); };
  const markupCats = m.sales['markup-categories'];

  // Agents ------------------------------------------------------------------
  const agentDefs = [
    ['Patel Holidays', 'Rajesh Patel', 'rajesh@patelholidays.example', '+91 98765 43210', 'Indian', 'INR', 'India', 'Maharashtra', 'Mumbai', 500000, 10, 'Premium Partner'],
    ['ABC Holidays', 'Amit Kumar', 'amit@abcholidays.example', '+91 87654 32109', 'Indian', 'INR', 'India', 'Delhi', 'New Delhi', 300000, 12, 'Standard'],
    ['Amazing Asia Tours', 'Neha Shah', 'neha@amazingasia.example', '+91 99887 76655', 'Indian', 'INR', 'India', 'Gujarat', 'Ahmedabad', 400000, 10, 'Premium Partner'],
    ['Gulf Voyages', 'Omar Rahman', 'omar@gulfvoyages.example', '+971 50 123 4567', 'Middle East', 'AED', 'United Arab Emirates', 'Dubai', 'Dubai', 250000, 8, 'VIP Partner'],
    ['Lion City Travels', 'Daniel Tan', 'daniel@lioncity.example', '+65 9123 4567', 'Singapore', 'SGD', 'Singapore', 'Singapore', 'Singapore', 200000, 12, 'Standard'],
  ];
  const agents = agentDefs.map(([name, contactPerson, email, phone, market, currency, country, state, city, creditLimit, markup, cat], i) => ({
    id: `AGT-${String(i + 1).padStart(3, '0')}`, name, contactPerson, email, phone, market, currency, country, state, city, zip: '', address: `${city}, ${country}`,
    creditLimit, paymentTerms: '30% Advance, Balance 7 Days', markup, markupCategory: markupCats.find((c) => c.name === cat)?.id || markupCats[0].id, markupCategoryName: cat,
    status: 'Active', notes: i === 0 ? 'Premium partner — handles high-value FIT and honeymoon bookings.' : '', joinDate: addDays(T, -700 + i * 40),
    contacts: [{ name: contactPerson, designation: 'Director', email, phone, primary: true }],
    portalEnabled: true, loginCode: `AGENT-AGT-2026-${String(i + 1).padStart(3, '0')}`, portalPassword: 'Agent@123', companyLogo: null, declaration: null,
    totalSales: 0, outstanding: 0, totalBookings: 0, profitGenerated: 0, createdAt: stamp(-700 + i * 40), updatedAt: stamp(-30),
  }));

  const b2c = [
    ['Ananya Mehta', 'ananya.mehta@example.com', '+91 98200 11122', 'Mumbai', 'Maharashtra'],
    ['Rohan Iyer', 'rohan.iyer@example.com', '+91 98450 33344', 'Bengaluru', 'Karnataka'],
    ['Sara Thompson', 'sara.thompson@example.com', '+44 7700 900123', 'London', 'England'],
  ].map(([name, email, phone, city, state], i) => ({
    id: `B2C-${String(i + 1).padStart(3, '0')}`, name, email, phone, salesPerson: 'BuildSoftware', status: 'Active', gstVatNumber: '', dateOfBirth: '', anniversaryDate: '',
    country: i === 2 ? 'United Kingdom' : 'India', state, city, zip: '', address: `${city}`, companyLogo: null, familyMembers: [], createdAt: stamp(-200 + i * 20), updatedAt: stamp(-20),
  }));

  // Users -------------------------------------------------------------------
  const users = [
    { id: 'USR-001', name: 'Admin User', email: 'admin@buildsoftware.in', role: 'Administrator', status: 'Active', createdAt: stamp(-900) },
    { id: 'USR-002', name: 'Priya Sales', email: 'sales@buildsoftware.in', role: 'Sales', status: 'Active', createdAt: stamp(-600) },
    { id: 'USR-003', name: 'Arjun Operations', email: 'operations@buildsoftware.in', role: 'Operations', status: 'Active', createdAt: stamp(-500) },
    { id: 'USR-004', name: 'Meera Accounts', email: 'accounts@buildsoftware.in', role: 'Accounts', status: 'Active', createdAt: stamp(-400) },
  ];

  // Trip specs ---------------------------------------------------------------
  // [plan, agentIdx|b2cIdx, startOffset, adults, children, status, rooms, queryStatus, guest, markup]
  const specs = [
    ['pattayaBangkok', 0, -75, 4, 0, 'Confirmed', 2, 'Confirmed', 'Gupta Family', 12],
    ['phuketKrabi', 1, -52, 2, 0, 'Confirmed', 1, 'Confirmed', 'Mr. & Mrs. Sharma', 12],
    ['bangkok', 2, -34, 3, 1, 'Confirmed', 2, 'Confirmed', 'Shah Family', 10],
    ['chiangMai', 3, -16, 2, 0, 'Confirmed', 1, 'Confirmed', 'Mr. Al Farsi', 8],
    ['samui', 0, -4, 2, 0, 'Confirmed', 1, 'Confirmed', 'Mr. & Mrs. Desai', 12],
    ['phuketFamily', 1, 6, 4, 2, 'Confirmed', 2, 'Confirmed', 'Verma Family', 12],
    ['pattayaBangkok', 2, 18, 6, 0, 'Accepted', 3, 'Confirmed', 'Reddy Group', 10],
    ['phuketKrabi', 4, 32, 2, 0, 'Accepted', 1, 'Confirmed', 'Mr. & Mrs. Tan', 12],
    ['bangkok', 3, 45, 4, 0, 'Sent', 2, 'Quoted', 'Mr. Hassan & Family', 8],
    ['samui', 'b2c0', 52, 2, 0, 'Sent', 1, 'Quoted', 'Ananya Mehta', 15],
    ['chiangMai', 1, 60, 2, 2, 'Follow-up', 1, 'Quoted', 'Kapoor Family', 12],
    ['phuketFamily', 0, 70, 3, 1, 'Revised', 2, 'Quoted', 'Joshi Family', 12],
    ['pattayaBangkok', 'b2c1', 85, 2, 0, 'Draft', 1, 'Working', 'Rohan Iyer', 15],
    ['phuketKrabi', 2, 100, 2, 0, 'Draft', 1, 'Working', 'Mr. & Mrs. Nair', 10],
  ];

  const queries = []; const quotations = []; const bookings = [];
  const clientOf = (ref) => (typeof ref === 'string' ? { type: 'B2C', rec: b2c[Number(ref.slice(3))] } : { type: 'Agent', rec: agents[ref] });

  specs.forEach(([planKey, ref, startOffset, adults, children, status, rooms, queryStatus, guestName, markup], i) => {
    const plan = PLANS[planKey];
    const start = addDays(T, startOffset);
    const end = addDays(start, plan.duration - 1);
    const client = clientOf(ref);
    const market = client.type === 'Agent' ? client.rec.market : 'Indian';
    const marketKey = ['Indian', 'Thailand'].includes(market) ? market : 'Indian';
    const pvt = adults + children > 4 ? 'Toyota Commuter' : 'SUV';
    const ctx = { pax: { adults, children }, pvt, stay: { rooms, adults, children, market: marketKey, markup } };
    const n = String(i + 1).padStart(4, '0');
    const queryId = `QRY-2026-${String(i + 1).padStart(3, '0')}`;
    const quoteId = `QT-2026-${n}`;
    const roomAllocation = { sgl: 0, dbl: rooms, adultExtraBed: adults > rooms * 2 ? adults - rooms * 2 : 0, cwb: children, cnb: 0, inf: 0 };
    const guests = [{ id: 'guest-1', name: guestName, phone: client.rec.phone }];
    const contactPerson = client.type === 'Agent' ? client.rec.contactPerson : client.rec.name;
    const qDate = addDays(start, -Math.max(20, 12 + i));

    const query = {
      id: queryId, queryDate: qDate, travelDate: start, endDate: end, clientType: client.type, agentId: client.rec.id, agentName: client.rec.name,
      contactPerson, contactEmail: client.rec.email, landlineNumber: '', mobileCountryCode: '', mobileNumber: client.rec.phone, guestName, guests,
      queryTitle: plan.title, queryTitleMasterId: '', ccMails: [], market, destination: plan.destination,
      travelSegments: plan.legs.map(([dep, arr, from, to]) => ({ departureDestination: dep, arrivalDestination: arr, fromDate: addDays(start, from), toDate: addDays(start, to) })),
      adults, children, infants: 0, childAges: Array.from({ length: children }, () => 8), childHeights: [], infantAges: [], rooms, roomAllocation,
      leadSource: client.type === 'Agent' ? 'Agent' : 'Website', serviceType: 'Complete Package', operationPerson: 'Arjun Operations', salesPerson: 'Priya Sales', company: 'BuildSoftware',
      priority: ['Normal', 'Medium', 'High', 'Urgent'][i % 4], status: queryStatus, followUpDate: addDays(T, (i % 5) - 1), importantNotes: `Client prefers ${i % 2 ? 'vegetarian' : 'Indian'} meals.`, otherInformation: '',
      quotations: [], createdAt: stamp(startOffset - 25), updatedAt: stamp(Math.min(-1, startOffset - 3)),
    };

    const days = buildDays(m, plan, start, ctx);
    const pricing = computePricing(days, adults, markup);
    const termsDoc = m.termsConditions[0];
    const quotation = {
      id: quoteId, quotationNo: quoteId, version: 1, queryId, clientType: client.type, agentId: client.rec.id, agentName: client.rec.name,
      b2cId: client.type === 'B2C' ? client.rec.id : '', b2cName: client.type === 'B2C' ? client.rec.name : '', recipientEmail: client.rec.email,
      guestName, guests, travelDate: start, endDate: end, duration: `${plan.duration - 1} Nights / ${plan.duration} Days`, adults, children, infants: 0,
      childAges: Array.from({ length: children }, () => 8), childHeights: [], infantAges: [], rooms, roomAllocation, market, currency: 'THB', salesPerson: 'Priya Sales',
      quotationDate: qDate, validUntil: addDays(qDate, 14), status, destination: plan.destination, packageType: plan.title, queryServiceType: 'Complete Package',
      travelSegments: query.travelSegments, versions: [], days, pricing, inclusions: INCLUSIONS, exclusions: EXCLUSIONS, terms: [],
      termsTemplateId: termsDoc.id, termsTemplateName: termsDoc.name, termsHtml: termsDoc.html, emailLogs: [], hasUnrevisedChanges: false,
      createdAt: stamp(startOffset - 22), updatedAt: stamp(Math.min(-1, startOffset - 2)),
    };
    if (status === 'Revised') {
      const v1days = JSON.parse(JSON.stringify(days));
      const snapshot = JSON.parse(JSON.stringify({ ...quotation, pricing }));
      ['id', 'queryId', 'bookingId', 'versions', 'emailLogs', 'createdAt', 'updatedAt', 'status'].forEach((k) => delete snapshot[k]);
      snapshot.days = v1days;
      quotation.versions = [{ version: 1, createdAt: stamp(startOffset - 20), sellingPrice: pricing.totalSelling, notes: 'Version 1', snapshot }];
      quotation.version = 2;
    }
    quotations.push(quotation);
    query.quotations = [quoteId];
    queries.push(query);

    if (['Accepted', 'Confirmed'].includes(status)) {
      const booking = quotationToBooking(quotation, { id: `BK-2026-${String(80 + i).padStart(3, '0')}`, bookingDate: addDays(qDate, 5), stamp, startOffset, agents, b2c, users });
      quotation.bookingId = booking.id; quotation.acceptedVersion = quotation.version; quotation.acceptedAt = booking.bookingDate;
      bookings.push(booking);
    }
  });

  // A few extra enquiries that are still fresh
  const freshTemplates = [
    ['Thailand Group Tour', 3, 'Gulf Voyages', 'Bangkok, Pattaya', 12, 0, 'New', 'Urgent'],
    ['Thailand Honeymoon', 0, 'Patel Holidays', 'Phuket, Krabi', 2, 0, 'New', 'High'],
    ['Thailand Family Holiday', 4, 'Lion City Travels', 'Phuket', 4, 2, 'New', 'Medium'],
    ['Thailand Honeymoon', 1, 'ABC Holidays', 'Koh Samui', 2, 0, 'Lost', 'Normal'],
  ];
  freshTemplates.forEach(([title, ai, , destination, adults, children, status, priority], k) => {
    const agent = agents[ai]; const start = addDays(T, 40 + k * 9);
    queries.push({
      id: `QRY-2026-${String(queries.length + 1).padStart(3, '0')}`, queryDate: addDays(T, -k), travelDate: start, endDate: addDays(start, 5), clientType: 'Agent', agentId: agent.id, agentName: agent.name,
      contactPerson: agent.contactPerson, contactEmail: agent.email, landlineNumber: '', mobileCountryCode: '', mobileNumber: agent.phone, guestName: 'To be confirmed', guests: [{ id: 'guest-1', name: 'To be confirmed', phone: agent.phone }],
      queryTitle: title, queryTitleMasterId: '', ccMails: [], market: agent.market, destination,
      travelSegments: [{ departureDestination: 'Bangkok', arrivalDestination: destination.split(', ')[0], fromDate: start, toDate: addDays(start, 5) }],
      adults, children, infants: 0, childAges: Array.from({ length: children }, () => 7), childHeights: [], infantAges: [], rooms: Math.ceil(adults / 2), roomAllocation: { sgl: 0, dbl: Math.ceil(adults / 2), adultExtraBed: 0, cwb: 0, cnb: 0, inf: 0 },
      leadSource: 'Agent', serviceType: 'Complete Package', operationPerson: 'Arjun Operations', salesPerson: 'Priya Sales', company: 'BuildSoftware', priority, status, followUpDate: addDays(T, k + 1),
      importantNotes: 'Share 2–3 hotel options per destination.', otherInformation: '', quotations: [], createdAt: stamp(-k), updatedAt: stamp(-k),
    });
  });

  // Agent totals (used on agent cards)
  agents.forEach((agent) => {
    const own = bookings.filter((b) => b.agentId === agent.id);
    agent.totalBookings = own.length;
    agent.totalSales = own.reduce((s, b) => s + b.totalSelling, 0);
    agent.profitGenerated = own.reduce((s, b) => s + b.profit, 0);
    agent.outstanding = own.reduce((s, b) => s + (b.balanceDue || 0), 0);
  });

  // Notifications -------------------------------------------------------------
  const notifications = [
    { id: 'NTF-001', title: 'Payment due soon', message: `Balance for ${bookings[5]?.id || 'a booking'} is due this week.`, type: 'warning', read: false, time: '10 min ago' },
    { id: 'NTF-002', title: 'New enquiry received', message: 'Gulf Voyages submitted a group tour query for Bangkok & Pattaya.', type: 'info', read: false, time: '1 hour ago' },
    { id: 'NTF-003', title: 'Quotation accepted', message: `Quotation ${quotations[6]?.id} was accepted by Amazing Asia Tours.`, type: 'success', read: false, time: '3 hours ago' },
    { id: 'NTF-004', title: 'Supplier confirmation pending', message: 'Hotel confirmation is pending for an upcoming arrival.', type: 'danger', read: false, time: 'Yesterday' },
    { id: 'NTF-005', title: 'Arrival reminder', message: 'Verma Family arrives in 6 days — confirm transfers.', type: 'info', read: true, time: '2 days ago' },
  ];

  // Operations (daily service sheet) -----------------------------------------
  const operations = [];
  bookings.forEach((booking) => {
    (booking.services || []).filter((s) => ['Transfer', 'Sightseeing'].includes(s.type)).forEach((s, idx) => {
      const diff = daysBetween(T, s.serviceDate);
      if (diff < -3 || diff > 14) return;
      const status = diff < 0 ? 'Completed' : diff === 0 ? 'On the Way' : diff < 3 ? 'Confirmed' : diff < 7 ? 'Assigned' : 'Pending';
      const driver = m.operations.drivers[(operations.length) % m.operations.drivers.length];
      operations.push({
        id: `OPS-${String(operations.length + 1).padStart(3, '0')}`, date: s.serviceDate, time: s.time || '09:00', bookingId: booking.id, guest: booking.guestName, agentName: booking.agentName,
        service: s.type === 'Transfer' ? (/airport to/i.test(s.name) ? 'Airport Pickup' : /to .*airport/i.test(s.name) ? 'Airport Drop' : 'Transfer') : 'Sightseeing',
        from: s.origin || s.pickupFrom || 'Hotel Lobby', to: s.dropAt || s.destination || s.name, vehicle: driver.vehicle, driver: driver.name, driverPhone: driver.mobile,
        supplier: s.supplierName || s.supplier, supplierPhone: '+66 2 000 0000', flightNo: '', flightTime: '', pax: Number(s.adults || 0) + Number(s.children || 0), status,
        specialInstructions: 'Please display guest name board.', pickupLocation: s.origin || 'Hotel Lobby', dropLocation: s.dropAt || s.name, notes: s.name,
        timeline: [{ time: '08:00', event: 'Driver assigned', status: 'done' }, { time: s.time || '09:00', event: 'Pickup', status: diff <= 0 ? 'done' : 'pending' }, { time: '12:00', event: 'Service complete', status: diff < 0 ? 'done' : 'pending' }],
        createdAt: stamp(-5), updatedAt: stamp(-1),
      });
    });
  });

  return { agents, b2c, users, queries, quotations, bookings, notifications, operations, stamp };
}

// Convert a quotation snapshot into a booking record. Used for the seed and by
// the mock "convert to booking" endpoint.
export function quotationToBooking(quotation, { id, bookingDate, stamp, startOffset = 0, agents = [], b2c = [], users = [] } = {}) {
  const days = quotation.days || [];
  const all = days.flatMap((d) => (d.services || []).map((s) => ({ ...s })));
  const hotels = all.filter((s) => s.type === 'Hotel').map((h) => ({ ...h, status: 'Confirmed', payStatus: 'Pending', confirmationNo: `CNF-${Math.floor(Math.random() * 90000 + 10000)}` }));
  const services = all.filter((s) => s.type !== 'Hotel').map((s) => ({ ...s, status: 'Confirmed', payStatus: 'Pending' }));
  const totalCost = quotation.pricing?.totalCost || 0;
  const totalSelling = quotation.pricing?.totalSelling || 0;
  const profit = totalSelling - totalCost;
  const T = todayBangkok();
  const arrival = quotation.travelDate; const departure = quotation.endDate;
  const bk = {
    id, quotationId: quotation.id, quotationVersion: quotation.version, queryId: quotation.queryId, status: 'Confirmed', bookingDate: bookingDate || T,
    clientType: quotation.clientType, agentId: quotation.agentId, agentName: quotation.agentName, guestName: quotation.guestName, guests: quotation.guests, guestPhone: quotation.guests?.[0]?.phone || '', guestEmail: quotation.recipientEmail,
    contactPerson: quotation.guestName, contactEmail: quotation.recipientEmail, destination: quotation.destination, destinations: String(quotation.destination || '').split(',').map((x) => x.trim()).filter(Boolean),
    arrivalDate: arrival, departureDate: departure, travelEndDate: departure, travelDate: arrival, endDate: departure, adults: quotation.adults, children: quotation.children, infants: quotation.infants, rooms: quotation.rooms, roomAllocation: quotation.roomAllocation,
    currency: 'THB', market: quotation.market, salesPerson: quotation.salesPerson, operationPerson: 'Arjun Operations', company: 'BuildSoftware', title: quotation.packageType,
    hotels, services, itinerary: days, flights: [], payments: [], creditNotes: [], debitNotes: [], supplierOverrides: {}, invoiceSettings: { taxTreatment: 'GST Exclude', vatPercent: 0, discount: 0, bankCharges: 0, dueDate: addDays(arrival, -7) },
    totalCost, totalSelling, profit, margin: totalSelling ? Number(((profit / totalSelling) * 100).toFixed(2)) : 0, paidAmount: 0, balanceDue: totalSelling, paymentStatus: 'Pending',
    paymentDeadline: addDays(arrival, -7), quotationAcceptedAt: bookingDate || T,
    activityLog: [{ date: stamp ? stamp(startOffset - 15) : nowIso(), action: `Booking created from quotation ${quotation.id}`, user: 'Admin' }],
    vouchers: {}, createdAt: stamp ? stamp(startOffset - 15) : nowIso(), updatedAt: stamp ? stamp(startOffset - 5) : nowIso(),
  };
  // Payment history depends on how close the trip is.
  const daysToArrival = daysBetween(T, arrival);
  const clientPct = daysToArrival < 0 ? 1 : daysToArrival < 14 ? 0.8 : daysToArrival < 40 ? 0.5 : 0.3;
  const paidAmount = Math.round(totalSelling * clientPct);
  const mkPayment = (n, type, amount, date, extra = {}) => ({ id: `PAY-${id}-${n}`, ref: `${type === 'Supplier Payment' ? 'SP' : 'RCPT'}-${id.slice(-3)}-${n}`, type, amount, currency: 'THB', date, status: 'Paid', method: 'Bank Transfer', notes: '', allocations: [], ...extra });
  if (paidAmount > 0) bk.payments.push(mkPayment(1, 'Client Payment', Math.round(paidAmount * 0.5), addDays(bk.bookingDate, 1)));
  if (paidAmount * 0.5 > 1) bk.payments.push(mkPayment(2, 'Client Payment', paidAmount - Math.round(paidAmount * 0.5), addDays(bk.bookingDate, 20 > Math.abs(startOffset) ? 3 : 20)));
  bk.paidAmount = paidAmount; bk.balanceDue = Math.max(0, totalSelling - paidAmount);
  bk.paymentStatus = paidAmount >= totalSelling ? 'Paid' : paidAmount > 0 ? 'Advance Paid' : 'Pending';
  // Pay suppliers for services already delivered
  if (daysToArrival < 0) {
    const lineAllocs = [];
    hotels.forEach((h, i) => lineAllocs.push({ lineId: `hotel:${h.id || i}`, amount: h.totalSupplierCost, supplier: h.supplierName }));
    lineAllocs.forEach((a, i) => bk.payments.push(mkPayment(10 + i, 'Supplier Payment', a.amount, addDays(arrival, -3), { supplier: a.supplier, allocations: [{ lineId: a.lineId, amount: a.amount }] })));
    hotels.forEach((h) => { h.payStatus = 'Paid'; h.paid = h.totalSupplierCost; });
  }
  bk.payments.push(mkPayment(99, 'Client Payment', 0, addDays(T, 5), { status: 'Pending', amount: bk.balanceDue || 0, notes: 'Balance as per invoice' }));
  if (!bk.balanceDue) bk.payments.pop();
  return bk;
}
