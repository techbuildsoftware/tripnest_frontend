import { destinationImages, photo, stockImages } from './assets';
import { addDays, nowIso, todayBangkok } from './util';

const stamp = () => ({ createdAt: nowIso(), updatedAt: nowIso() });
const withIds = (prefix, rows) => rows.map((row, index) => ({ id: `${prefix}-${String(index + 1).padStart(3, '0')}`, status: 'Active', ...stamp(), ...row }));
const names = (prefix, list, extra = () => ({})) => withIds(prefix, list.map((name, i) => ({ name, ...extra(name, i) })));

export function buildMasters() {
  const T = todayBangkok();
  const yearStart = `${T.slice(0, 4)}-01-01`;
  const yearEnd = `${Number(T.slice(0, 4)) + 1}-12-31`;

  // ── Sales masters ─────────────────────────────────────────────────────────
  const sales = {
    markets: names('MKT', ['Indian', 'Thailand', 'Middle East', 'Singapore', 'Europe']),
    'lead-sources': names('LDS', ['Agent', 'Website', 'WhatsApp', 'Referral', 'Walk-in', 'Social Media']),
    'query-types': names('QTY', ['Holiday Package', 'Honeymoon', 'Family Holiday', 'Corporate Incentive', 'Group Tour'], () => ({ feedbackTypes: [] })),
    'hotel-categories': names('HCT', ['3 Star', '4 Star', '5 Star', 'Boutique', 'Villa']),
    'room-types': names('RMT', ['Deluxe Room', 'Superior Room', 'Pool Access Room', 'Pool Villa', 'Family Room', 'Premier Suite'], (n, i) => ({ size: `${28 + i * 6} sqm` })),
    'room-categories': names('RMC', ['Standard', 'Deluxe', 'Suite']),
    'meal-plans': names('MLP', ['RB', 'RO', 'HB', 'FB', 'AI'], (n) => ({ description: { RB: 'Room with breakfast', RO: 'Room only', HB: 'Half board (breakfast + dinner)', FB: 'Full board', AI: 'All inclusive' }[n] })),
    amenities: names('AMN', ['Swimming Pool', 'Spa', 'Gym', 'Beach Access', 'Free WiFi', 'Restaurant', 'Bar', 'Kids Club', 'Airport Shuttle']),
    'markup-categories': withIds('MKC', [{ name: 'Standard', markupPercent: 10 }, { name: 'Premium Partner', markupPercent: 8 }, { name: 'VIP Partner', markupPercent: 6 }, { name: 'Direct Client', markupPercent: 15 }]),
  };

  // ── Operations masters ────────────────────────────────────────────────────
  const destNames = ['Bangkok', 'Pattaya', 'Phuket', 'Krabi', 'Chiang Mai', 'Koh Samui', 'Phi Phi Islands'];
  const destinations = names('DST', destNames, (n) => ({ company: 'TripNest Co LTD', country: 'Thailand', destinationImage: destinationImages[n] ? photo(destinationImages[n], `${n}.jpg`) : null }));
  const locationMap = {
    Bangkok: ['Sukhumvit', 'Silom', 'Riverside', 'Siam Square'],
    Pattaya: ['Jomtien Beach', 'Walking Street', 'Central Pattaya'],
    Phuket: ['Patong Beach', 'Kata Beach', 'Karon Beach', 'Phuket Old Town'],
    Krabi: ['Ao Nang', 'Railay Beach'],
    'Chiang Mai': ['Old City', 'Nimman'],
    'Koh Samui': ['Chaweng Beach', 'Lamai Beach'],
    'Phi Phi Islands': ['Tonsai Bay'],
  };
  const locations = withIds('LOC', Object.entries(locationMap).flatMap(([destination, list]) => list.map((name) => ({ name, destination }))));
  const airports = withIds('APT', [
    { name: 'Suvarnabhumi Airport', iataCode: 'BKK', icaoCode: 'VTBS', city: 'Bangkok', country: 'Thailand', airportType: 'International', timezone: 'Asia/Bangkok' },
    { name: 'Don Mueang International Airport', iataCode: 'DMK', icaoCode: 'VTBD', city: 'Bangkok', country: 'Thailand', airportType: 'International', timezone: 'Asia/Bangkok' },
    { name: 'Phuket International Airport', iataCode: 'HKT', icaoCode: 'VTSP', city: 'Phuket', country: 'Thailand', airportType: 'International', timezone: 'Asia/Bangkok' },
    { name: 'Krabi International Airport', iataCode: 'KBV', icaoCode: 'VTSG', city: 'Krabi', country: 'Thailand', airportType: 'International', timezone: 'Asia/Bangkok' },
    { name: 'Samui Airport', iataCode: 'USM', icaoCode: 'VTSM', city: 'Koh Samui', country: 'Thailand', airportType: 'Domestic', timezone: 'Asia/Bangkok' },
    { name: 'Chiang Mai International Airport', iataCode: 'CNX', icaoCode: 'VTCC', city: 'Chiang Mai', country: 'Thailand', airportType: 'International', timezone: 'Asia/Bangkok' },
  ]);
  const transferDefs = [
    ['Bangkok Airport To Bangkok Hotel', 'Bangkok', '1 Hour'], ['Bangkok Hotel To Bangkok Airport', 'Bangkok', '1 Hour'],
    ['Bangkok Airport To Pattaya Hotel', 'Pattaya', '2 Hours'], ['Pattaya Hotel To Bangkok Airport', 'Pattaya', '2 Hours'],
    ['Pattaya Hotel To Bangkok Hotel', 'Pattaya', '2.5 Hours'], ['Bangkok Hotel To Pattaya Hotel', 'Bangkok', '2.5 Hours'],
    ['Phuket Airport To Phuket Hotel', 'Phuket', '1 Hour'], ['Phuket Hotel To Phuket Airport', 'Phuket', '1 Hour'],
    ['Krabi Airport To Krabi Hotel', 'Krabi', '45 Minutes'], ['Krabi Hotel To Krabi Airport', 'Krabi', '45 Minutes'],
    ['Phuket Hotel To Krabi Hotel', 'Phuket', '3 Hours'], ['Samui Airport To Samui Hotel', 'Koh Samui', '30 Minutes'],
    ['Samui Hotel To Samui Airport', 'Koh Samui', '30 Minutes'], ['Chiang Mai Airport To Chiang Mai Hotel', 'Chiang Mai', '30 Minutes'],
    ['Chiang Mai Hotel To Chiang Mai Airport', 'Chiang Mai', '30 Minutes'],
  ];
  const transfers = withIds('TRF', transferDefs.map(([name, destination, duration]) => ({
    name, destination, duration, timing: 'Any time', operatingDays: ['All'], transferType: 'SIC',
    description: `<p>Comfortable air-conditioned transfer: ${name}.</p>`, termsHtml: '<ul><li>Waiting time at airport: 60 minutes.</li><li>Extra luggage may need a larger vehicle.</li></ul>',
    usefulInformation: 'Driver details are shared 24 hours before the service.', transferImage: photo(stockImages.tourTransfers, 'transfer.jpg'),
  })));
  const vehicles = withIds('VEH', [
    { name: 'Sedan', brand: 'Toyota Camry', vehicleType: 'PVT', transferCapacity: 2, sightseeingCapacity: 2 },
    { name: 'SUV', brand: 'Toyota Fortuner', vehicleType: 'PVT', transferCapacity: 4, sightseeingCapacity: 4 },
    { name: 'Toyota Commuter', brand: 'Toyota', vehicleType: 'PVT', transferCapacity: 9, sightseeingCapacity: 9 },
    { name: 'Mini Bus', brand: 'Toyota Coaster', vehicleType: 'PVT', transferCapacity: 18, sightseeingCapacity: 18 },
    { name: 'Coach', brand: 'Volvo', vehicleType: 'PVT', transferCapacity: 35, sightseeingCapacity: 35 },
    { name: 'Shared Coach', brand: 'Mercedes', vehicleType: 'SIC', transferCapacity: 40, sightseeingCapacity: 40 },
  ].map((v) => ({ ...v, vehicleImage: photo(stockImages.tourTransfers, 'vehicle.jpg') })));
  const drivers = withIds('DRV', [
    { name: 'Somchai Jaidee', code: 'DRV01', mobile: '+66 81 234 5678', alternateNo: '+66 82 111 2222', idPassportNo: 'TH1234567', vehicle: 'Toyota Commuter', vehicleCapacity: 9, address: 'Bangkok' },
    { name: 'Niran Siriporn', code: 'DRV02', mobile: '+66 86 765 4321', alternateNo: '', idPassportNo: 'TH7654321', vehicle: 'SUV', vehicleCapacity: 4, address: 'Phuket' },
    { name: 'Wanchai Krabthong', code: 'DRV03', mobile: '+66 89 321 4567', alternateNo: '', idPassportNo: 'TH2345678', vehicle: 'Sedan', vehicleCapacity: 2, address: 'Krabi' },
    { name: 'Preecha Boonmee', code: 'DRV04', mobile: '+66 84 555 0101', alternateNo: '', idPassportNo: 'TH3456789', vehicle: 'Mini Bus', vehicleCapacity: 18, address: 'Pattaya' },
  ]);
  const guides = withIds('GDE', [
    { name: 'Anong Srisuk', code: 'GDE01', mobile: '+66 81 900 1001', language: 'English, Hindi', destinations: ['Bangkok', 'Pattaya'], vehicle: 'Toyota Commuter', vehicleCapacity: 9, timingRates: [{ id: 'gr-1', duration: 'Half Day (4 Hours)', rate: 1800, currency: 'THB' }, { id: 'gr-2', duration: 'Full Day (8 Hours)', rate: 3000, currency: 'THB' }] },
    { name: 'Krit Wongsa', code: 'GDE02', mobile: '+66 81 900 1002', language: 'English, Gujarati', destinations: ['Phuket', 'Krabi'], vehicle: 'SUV', vehicleCapacity: 4, timingRates: [{ id: 'gr-3', duration: 'Full Day (8 Hours)', rate: 3200, currency: 'THB' }] },
    { name: 'Malee Chaiyo', code: 'GDE03', mobile: '+66 81 900 1003', language: 'English, Mandarin', destinations: ['Chiang Mai'], vehicle: 'Sedan', vehicleCapacity: 2, timingRates: [{ id: 'gr-4', duration: 'Full Day (8 Hours)', rate: 2800, currency: 'THB' }] },
  ]);
  const ferry = withIds('FRY', [
    { name: 'Economy Class', description: '<p>Open-deck seating with air-conditioned cabin access.</p>', termsHtml: '' },
    { name: 'First Class', description: '<p>Reserved air-conditioned seating with complimentary refreshments.</p>', termsHtml: '' },
    { name: 'VIP Lounge', description: '<p>Premium lounge seating with priority boarding.</p>', termsHtml: '' },
  ]);
  const operations = { destinations, locations, airports, transfers, vehicles, drivers, guides, 'ferry-classes': ferry };

  // ── Activity masters ──────────────────────────────────────────────────────
  const restaurants = withIds('RST', [
    { name: 'Baiyoke Sky Buffet', destination: 'Bangkok', location: 'Siam Square', restaurantType: 'Buffet', mealPreference: 'Lunch', timing: '11:30 - 14:30', category: 'Deluxe', address: 'Baiyoke Tower II, Ratchathewi, Bangkok', contactPerson: 'Pim', contactPhone: '+66 2 656 3000', contactEmail: 'reserve@baiyoke.example', details: 'Revolving rooftop buffet with city views.' },
    { name: 'Chao Phraya Dinner Cruise', destination: 'Bangkok', location: 'Riverside', restaurantType: 'Cruise Dinner', mealPreference: 'Dinner', timing: '19:00 - 21:00', category: 'Deluxe', address: 'River City Pier, Bangkok', contactPerson: 'Nok', contactPhone: '+66 2 000 1234', contactEmail: 'cruise@riverdining.example', details: 'Buffet dinner cruise with live music.' },
    { name: 'Seafood Paradise Jomtien', destination: 'Pattaya', location: 'Jomtien Beach', restaurantType: 'Seafood', mealPreference: 'Dinner', timing: '17:00 - 22:00', category: 'Standard', address: 'Jomtien Beach Road, Pattaya', contactPerson: 'Somsri', contactPhone: '+66 38 000 111', contactEmail: 'hello@seafoodparadise.example', details: 'Fresh seafood on the beach.' },
    { name: 'Kan Eang Sunset Dining', destination: 'Phuket', location: 'Phuket Old Town', restaurantType: 'Thai', mealPreference: 'Dinner', timing: '16:30 - 22:00', category: 'Luxury', address: 'Chalong Bay, Phuket', contactPerson: 'Arun', contactPhone: '+66 76 000 222', contactEmail: 'dine@kaneang.example', details: 'Waterfront Thai restaurant at sunset.' },
    { name: 'Khantoke Dinner Chiang Mai', destination: 'Chiang Mai', location: 'Old City', restaurantType: 'Thai', mealPreference: 'Dinner', timing: '18:30 - 21:30', category: 'Standard', address: 'Old City, Chiang Mai', contactPerson: 'Mali', contactPhone: '+66 53 000 333', contactEmail: 'khantoke@lanna.example', details: 'Traditional northern Thai set dinner with dance show.' },
    { name: 'Tandoori Nights Krabi', destination: 'Krabi', location: 'Ao Nang', restaurantType: 'Indian', mealPreference: 'Dinner', timing: '18:00 - 23:00', category: 'Standard', address: 'Ao Nang Beach Road, Krabi', contactPerson: 'Raj', contactPhone: '+66 75 000 444', contactEmail: 'bookings@tandoorinights.example', details: 'Indian vegetarian and non-vegetarian menu.' },
  ].map((r) => ({ ...r, image: photo(stockImages.tourPartner, 'restaurant.jpg'), nearHotels: [] })));
  const activity = {
    sightseeing: [],
    restaurants,
    'restaurant-types': names('RTY', ['Thai', 'Seafood', 'International', 'Indian', 'Buffet', 'Cruise Dinner']),
    visa: withIds('VSA', [
      { name: 'Thailand Tourist Visa (60 days)', currency: 'THB', adultCost: 1500, childCost: 1500, infantCost: 0 },
      { name: 'Thailand Visa On Arrival', currency: 'THB', adultCost: 2000, childCost: 2000, infantCost: 0 },
    ]),
    'sightseeing-categories': names('SSC', ['Show', 'Island Tour', 'City Tour', 'Culture & Temples', 'Adventure', 'Marine Life', 'Dinner Cruise']),
  };

  // ── Finance masters ───────────────────────────────────────────────────────
  const finance = {
    currencies: withIds('CUR', [
      { name: 'THB', value: 1, isBase: true, rates: [{ currency: 'INR', value: 2.4 }, { currency: 'USD', value: 0.028 }] },
      { name: 'INR', value: 1, isBase: false, rates: [{ currency: 'THB', value: 0.42 }] },
      { name: 'USD', value: 1, isBase: false, rates: [{ currency: 'THB', value: 35.5 }] },
      { name: 'AED', value: 1, isBase: false, rates: [{ currency: 'THB', value: 9.7 }] },
      { name: 'SGD', value: 1, isBase: false, rates: [{ currency: 'THB', value: 26.4 }] },
      { name: 'EUR', value: 1, isBase: false, rates: [{ currency: 'THB', value: 38.8 }] },
    ]),
    banks: withIds('BNK', [
      { name: 'Kasikorn Bank', accountDetails: 'A/C Name: TripNest Co LTD\nA/C No: 123-4-56789-0\nSWIFT: KASITHBK', currency: 'THB', country: 'Thailand', state: 'Bangkok', city: 'Bangkok', zip: '10110', address: 'Sukhumvit Road, Bangkok' },
      { name: 'HDFC Bank', accountDetails: 'A/C Name: TripNest Pvt Ltd\nA/C No: 5020001234567\nIFSC: HDFC0000123', currency: 'INR', country: 'India', state: 'Maharashtra', city: 'Mumbai', zip: '400001', address: 'Fort, Mumbai' },
    ]),
    'expense-types': names('EXP', ['Marketing', 'Office Rent', 'Software Subscriptions', 'Travel & Conveyance', 'Bank Charges'], () => ({ remarks: '' })),
  };

  // ── System masters ────────────────────────────────────────────────────────
  const system = {
    itinerary: withIds('ITN', [
      { name: 'Bangkok Arrival & City Tour', destination: 'Bangkok', previousDestination: '', arrivalDeparture: 'Arrival', transfer: 'Bangkok Airport To Bangkok Hotel', transferServiceType: 'SIC', sightseeing: '', sightseeingVariantId: '', sightseeingVariantName: '', transferOptionId: '', transferOptionType: 'SIC', sightseeingSelections: [], description: 'Arrive at Suvarnabhumi, meet & greet and transfer to your hotel.' },
      { name: 'Pattaya Coral Island Day', destination: 'Pattaya', previousDestination: '', arrivalDeparture: 'NA', transfer: '', transferServiceType: '', sightseeing: 'Coral Island Tour', sightseeingVariantId: '', sightseeingVariantName: '', transferOptionId: '', transferOptionType: '', sightseeingSelections: [], description: 'Speedboat to Coral Island with lunch.' },
      { name: 'Phuket Departure', destination: 'Phuket', previousDestination: '', arrivalDeparture: 'Departure', transfer: 'Phuket Hotel To Phuket Airport', transferServiceType: 'SIC', sightseeing: '', sightseeingVariantId: '', sightseeingVariantName: '', transferOptionId: '', transferOptionType: 'SIC', sightseeingSelections: [], description: 'Hotel check-out and airport transfer.' },
    ]),
    'arrival-departure': names('ARD', ['Arrival', 'Departure', 'Arrival & Departure', 'NA']),
    documents: withIds('DOC', [{ name: 'Company Profiles', files: [] }, { name: 'Rate Sheets 2026', files: [] }, { name: 'Visa Guidelines', files: [] }]),
    'guest-documents': names('GDC', ['Passport Copy', 'Visa Copy', 'Flight Tickets', 'ID Proof', 'Passport Size Photograph']),
    'feedback-types': names('FBT', ['Service Quality', 'Hotel Experience', 'Transfers', 'Sightseeing', 'Overall Experience']),
  };

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const supplier = (row) => ({ country: 'Thailand', status: 'Active', creditLimit: 200000, outstanding: 0, paymentTerms: '15 Days', currency: 'THB', bankDetails: { accountName: row.name, accountNumber: '000-1-23456-7', bankName: 'Kasikorn Bank', branch: 'Bangkok', swiftCode: 'KASITHBK' }, contacts: [{ name: row.contactPerson, email: row.email, phone: row.phone, primary: true }], ...row });
  const suppliers = withIds('SUP', [
    supplier({ name: 'Siam Transfers Co.', type: ['Transfer'], contactPerson: 'Somchai Jaidee', email: 'ops@siamtransfers.example', phone: '+66 81 234 5678', destination: 'Bangkok', city: 'Bangkok' }),
    supplier({ name: 'Phuket Tours Co.', type: ['Sightseeing', 'Transfer'], contactPerson: 'Niran Siriporn', email: 'niran@phukettours.example', phone: '+66 76 456 789', destination: 'Phuket', city: 'Phuket' }),
    supplier({ name: 'Krabi Travel Services', type: ['Transfer', 'Sightseeing'], contactPerson: 'Wanchai Krabthong', email: 'wanchai@krabitravel.example', phone: '+66 75 321 456', destination: 'Krabi', city: 'Krabi' }),
    supplier({ name: 'Andaman Yachts Charter', type: ['Yacht'], contactPerson: 'Captain Pong', email: 'charter@andamanyachts.example', phone: '+66 76 888 999', destination: 'Phuket', city: 'Phuket' }),
    supplier({ name: 'Alcazar Cabaret Show Co.', type: ['Sightseeing'], contactPerson: 'Lek', email: 'tickets@alcazar.example', phone: '+66 38 410 224', destination: 'Pattaya', city: 'Pattaya' }),
    supplier({ name: 'Chiang Mai Trails', type: ['Sightseeing', 'Transfer'], contactPerson: 'Ploy', email: 'hello@cmtrails.example', phone: '+66 53 111 222', destination: 'Chiang Mai', city: 'Chiang Mai' }),
    supplier({ name: 'Bangkok Dining Group', type: ['Restaurant'], contactPerson: 'Pim', email: 'sales@bkkdining.example', phone: '+66 2 656 3000', destination: 'Bangkok', city: 'Bangkok' }),
    supplier({ name: 'Samui Island Tours', type: ['Sightseeing', 'Transfer'], contactPerson: 'Tum', email: 'info@samuiislandtours.example', phone: '+66 77 333 444', destination: 'Koh Samui', city: 'Koh Samui' }),
    supplier({ name: 'Thai Smiles Trip Co Ltd', type: ['Transfer'], contactPerson: 'Jira', email: 'jira@thaismiles.example', phone: '+66 38 777 888', destination: 'Pattaya', city: 'Pattaya' }),
    supplier({ name: 'Pattaya Marine Park', type: ['Sightseeing'], contactPerson: 'Nan', email: 'book@pattayamarine.example', phone: '+66 38 222 111', destination: 'Pattaya', city: 'Pattaya' }),
    supplier({ name: 'Riverside Grand Hospitality', type: ['Hotel'], contactPerson: 'Reservations', email: 'reservations@riversidegrand.example', phone: '+66 2 111 0000', destination: 'Bangkok', city: 'Bangkok' }),
    supplier({ name: 'Beverly Hotels Group', type: ['Hotel'], contactPerson: 'Reservations', email: 'reservations@beverlypattaya.example', phone: '+66 38 123 456', destination: 'Pattaya', city: 'Pattaya' }),
    supplier({ name: 'Andamatra Resorts', type: ['Hotel'], contactPerson: 'Reservations', email: 'reservations@andamatra.example', phone: '+66 76 345 678', destination: 'Phuket', city: 'Phuket' }),
    supplier({ name: 'Krabi Coral Beach Resort', type: ['Hotel'], contactPerson: 'Reservations', email: 'reservations@krabicoral.example', phone: '+66 75 111 000', destination: 'Krabi', city: 'Krabi' }),
    supplier({ name: 'Samui Palm Retreat', type: ['Hotel'], contactPerson: 'Reservations', email: 'reservations@samuipalm.example', phone: '+66 77 222 000', destination: 'Koh Samui', city: 'Koh Samui' }),
    supplier({ name: 'Lanna Heritage Hotel', type: ['Hotel'], contactPerson: 'Reservations', email: 'reservations@lannaheritage.example', phone: '+66 53 333 000', destination: 'Chiang Mai', city: 'Chiang Mai' }),
  ]);
  const sup = (name) => suppliers.find((s) => s.name === name);

  // ── Hotels ────────────────────────────────────────────────────────────────
  const hotelDefs = [
    ['Riverside Grand Bangkok', 'Bangkok', 'Riverside', '5 Star', 'Riverside Grand Hospitality', stockImages.bangkok, 'Chao Phraya riverfront hotel with rooftop pool.', 4800],
    ['Ecotel Bangkok', 'Bangkok', 'Sukhumvit', '4 Star', 'Riverside Grand Hospitality', stockImages.tourHotel, 'Modern city hotel close to BTS Skytrain.', 2760],
    ['The Beverly Hotel Pattaya', 'Pattaya', 'Central Pattaya', '4 Star', 'Beverly Hotels Group', stockImages.tourHotel, 'Comfortable hotel minutes from the beach.', 2400],
    ['Pattaya Bay Resort', 'Pattaya', 'Jomtien Beach', '5 Star', 'Beverly Hotels Group', stockImages.phiphi, 'Beachfront resort with lagoon pools.', 4200],
    ['Andamatra Resort & Villa Phuket', 'Phuket', 'Patong Beach', '5 Star', 'Andamatra Resorts', stockImages.phuket, 'Luxury resort with Andaman Sea views and private pool villas.', 5500],
    ['Patong Sands Hotel', 'Phuket', 'Patong Beach', '4 Star', 'Andamatra Resorts', stockImages.phuket, 'Lively beachside hotel on Patong.', 2900],
    ['Krabi Coral Beach Resort', 'Krabi', 'Ao Nang', '4 Star', 'Krabi Coral Beach Resort', stockImages.krabi, 'Resort a short walk from Ao Nang beach.', 3100],
    ['Samui Palm Retreat', 'Koh Samui', 'Chaweng Beach', '5 Star', 'Samui Palm Retreat', stockImages.kohsamui, 'Palm-fringed retreat on Chaweng.', 5200],
    ['Lanna Heritage Hotel', 'Chiang Mai', 'Old City', '4 Star', 'Lanna Heritage Hotel', stockImages.chiangmai, 'Boutique hotel in the heart of the Old City.', 2500],
  ];
  const hotels = withIds('HTL', hotelDefs.map(([name, destination, location, category, supplierName, image, details, base], index) => ({
    name, country: 'Thailand', state: destination, city: destination, destination, location, category,
    contactPerson: 'Front Office', phone: `+66 2 000 ${1000 + index}`, mobile: `+66 81 000 ${2000 + index}`, email: `reservations@${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`,
    childAgeAbove: 5, infantAgeBelow: 2, groupRoomLimit: 8, totalRooms: 120 + index * 15,
    roomTypes: category === '5 Star' ? ['Deluxe Room', 'Pool Access Room', 'Premier Suite'] : ['Superior Room', 'Deluxe Room', 'Family Room'],
    mealPlans: ['RB', 'HB'], weekends: ['Friday', 'Saturday'], amenities: ['Swimming Pool', 'Free WiFi', 'Restaurant', 'Spa'],
    address: `${10 + index} ${location}, ${destination}, Thailand`, importantNotes: 'Check-in 14:00 · Check-out 12:00.', details,
    supplierOwn: false, supplier: sup(supplierName).id, supplierId: sup(supplierName).id, supplierName,
    supplierBankDetails: { accountName: name, accountNumber: '000-0-00000-0', bankName: 'Kasikorn Bank', branch: destination, ifscCode: '', swiftCode: 'KASITHBK' },
    contacts: [{ name: 'Reservations Desk', designation: 'Reservations', email: `reservations@${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`, phone: `+66 2 000 ${1000 + index}` }],
    hotelImage: photo(image, `${name}.jpg`), hotelContract: null, baseRate: base,
  })));

  // Contract rates for every hotel. Two markets so quotations for both resolve.
  const hotelRates = [];
  hotels.forEach((hotel) => {
    ['Indian', 'Thailand'].forEach((market) => {
      const roomRates = hotel.roomTypes.flatMap((roomType, ri) => hotel.mealPlans.map((mealPlan, mi) => {
        const base = hotel.baseRate + ri * 900 + mi * 700 + (market === 'Thailand' ? -200 : 0);
        return { roomType, roomCategory: 'Standard', mealPlan, fitSingle: base - 300, fitDouble: base, gitSingle: base - 500, gitDouble: base - 250, adultExtraBed: 900, childWithBed: 700, childNoBedAbove5: 500, childNoBedBelow5: 300, infant: 0 };
      }));
      hotelRates.push({
        id: `HRT-${String(hotelRates.length + 1).padStart(3, '0')}`, hotel: hotel.id, hotelId: hotel.id, hotelName: hotel.name, priceType: 'All Days',
        bookingStartDate: '', bookingEndDate: '', rateCode: `${hotel.name.slice(0, 3).toUpperCase()}-${market.slice(0, 3).toUpperCase()}-26`, supplier: hotel.supplierName, supplierName: hotel.supplierName, supplierId: hotel.supplierId,
        validityPeriods: [{ fromDate: yearStart, toDate: yearEnd }], soldOutDates: [], market, currency: 'THB', status: 'Active', roomRates,
        supplements: [{ id: 'sup-gala', name: 'Gala Dinner (Dec 31)', fromDate: `${T.slice(0, 4)}-12-31`, toDate: `${T.slice(0, 4)}-12-31`, charges: 2500, chargeType: 'Per Person', mandatory: true }],
        ...stamp(),
      });
    });
  });

  // ── Sightseeing module ───────────────────────────────────────────────────
  const ssDefs = [
    ['Coral Island Tour by Speedboat', 'Pattaya', 'Island Tour', '🏝️', '8 Hours', ['Pattaya Marine Park'], 900, 1150, 600, 800],
    ['Alcazar Cabaret Show', 'Pattaya', 'Show', '🎭', '1.5 Hours', ['Alcazar Cabaret Show Co.'], 600, 800, 450, 600],
    ['Nong Nooch Tropical Garden', 'Pattaya', 'Culture & Temples', '🌿', '4 Hours', ['Pattaya Marine Park'], 700, 900, 500, 650],
    ['Bangkok City & Temples Tour', 'Bangkok', 'City Tour', '🛕', '6 Hours', ['Siam Transfers Co.'], 850, 1100, 650, 850],
    ['Safari World & Marine Park', 'Bangkok', 'Marine Life', '🦒', '8 Hours', ['Siam Transfers Co.'], 1100, 1400, 900, 1150],
    ['Phi Phi & Maya Bay by Speedboat', 'Phuket', 'Island Tour', '🛥️', '9 Hours', ['Phuket Tours Co.'], 1500, 1900, 1200, 1500],
    ['James Bond Island by Longtail', 'Phuket', 'Island Tour', '⛵', '8 Hours', ['Phuket Tours Co.'], 1300, 1650, 1050, 1350],
    ['Phuket Big Buddha & Old Town', 'Phuket', 'Culture & Temples', '🗿', '4 Hours', ['Phuket Tours Co.'], 600, 780, 450, 600],
    ['4 Islands Tour by Longtail', 'Krabi', 'Island Tour', '🏖️', '7 Hours', ['Krabi Travel Services'], 950, 1200, 750, 950],
    ['Elephant Sanctuary Experience', 'Chiang Mai', 'Adventure', '🐘', '6 Hours', ['Chiang Mai Trails'], 1400, 1750, 1100, 1400],
    ['Angthong Marine Park Tour', 'Koh Samui', 'Marine Life', '🐠', '8 Hours', ['Samui Island Tours'], 1500, 1900, 1200, 1550],
    ['Chao Phraya Dinner Cruise', 'Bangkok', 'Dinner Cruise', '🚢', '2 Hours', ['Siam Transfers Co.'], 1100, 1400, 800, 1050],
  ];
  const sightseeingModule = withIds('SSM', ssDefs.map(([name, destination, category, emoji, duration, supplierNames, aCost, aSell, cCost, cSell], index) => {
    const linked = supplierNames.map((s) => sup(s).id);
    const vid = `var-${index + 1}`;
    return {
      name, destination, category, emoji, duration, status: 'Active', details: `${name} — an unforgettable ${category.toLowerCase()} experience in ${destination}.`,
      locationText: `${destination}, Thailand`, usefulInformation: 'Carry a hat, sunscreen and light clothing. Guests must be ready at the lobby 10 minutes early.',
      activityType: 'Standard Activity', operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      showTimings: [{ time: '08:00', openingTime: '', closingTime: '', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
      items: ['Entrance tickets', 'Lunch', 'Professional guide'],
      supplier: linked[0], suppliers: linked, supplierContractRef: `CT-${index + 1}`, supplierNotes: '',
      image: photo([stockImages.phiphi, stockImages.tourPartner, stockImages.bangkok, stockImages.krabi][index % 4], `${name}.jpg`), images: [], documents: [],
      variants: [{
        id: vid, name: 'Standard Ticket', code: `STD${index + 1}`, category: 'Standard', order: 1, status: 'Active', description: 'Standard admission', defaultFromTime: '08:00', defaultToTime: '16:00', defaultDropTime: '17:00', images: [],
        rates: [
          { id: `${vid}-r1`, fromDate: yearStart, toDate: yearEnd, market: 'Indian', rateType: 'B2B', adultCost: aCost, adultSell: aSell, childCost: cCost, childSell: cSell },
          { id: `${vid}-r2`, fromDate: yearStart, toDate: yearEnd, market: 'Thailand', rateType: 'B2B', adultCost: aCost - 100, adultSell: aSell - 100, childCost: cCost - 50, childSell: cSell - 50 },
        ],
      }],
      transfers: [
        { id: `tx-${index + 1}-1`, variantId: vid, type: 'Ticket Only', vehicleSupplierId: '', vehicleSupplierName: '', vehicleId: '', vehicleName: '', vehicleCapacity: 0, vehicleCosts: [], route: '', ticketRateId: '', adultPrice: 0, childPrice: 0, details: 'Own transport', status: 'Active' },
        { id: `tx-${index + 1}-2`, variantId: vid, type: 'SIC', vehicleSupplierId: linked[0], vehicleSupplierName: supplierNames[0], vehicleId: vehicles.find((v) => v.name === 'Shared Coach').id, vehicleName: 'Shared Coach', vehicleCapacity: 40, vehicleCosts: [], route: `Hotel - ${name} - Hotel`, ticketRateId: '', adultPrice: 250, childPrice: 150, details: 'Shared coach pick-up from hotel', status: 'Active' },
        { id: `tx-${index + 1}-3`, variantId: vid, type: 'PVT', vehicleSupplierId: linked[0], vehicleSupplierName: supplierNames[0], vehicleId: '', vehicleName: '', vehicleCapacity: 0, route: `Hotel - ${name} - Hotel`, ticketRateId: '', adultPrice: 0, childPrice: 0, details: 'Private vehicle', status: 'Active',
          vehicleCosts: vehicles.filter((v) => v.vehicleType === 'PVT').map((v) => ({ vehicleId: v.id, vehicleName: v.name, capacity: v.sightseeingCapacity, cost: 1200 + v.sightseeingCapacity * 80 })) },
      ],
      addons: [{ id: `ad-${index + 1}`, name: 'Photo Package', type: 'Add-on', adultPrice: 300, childPrice: 300, status: 'Active' }],
      supplements: [], policies: [{ id: `po-${index + 1}`, text: 'Free cancellation up to 48 hours before the activity.' }],
      ...stamp(),
    };
  }));

  // ── Transfer / restaurant / yacht rates ──────────────────────────────────
  const transferSuppliers = { Bangkok: 'Siam Transfers Co.', Pattaya: 'Thai Smiles Trip Co Ltd', Phuket: 'Phuket Tours Co.', Krabi: 'Krabi Travel Services', 'Koh Samui': 'Samui Island Tours', 'Chiang Mai': 'Chiang Mai Trails' };
  const transferRates = [];
  transfers.forEach((transfer, index) => {
    const supplierName = transferSuppliers[transfer.destination] || 'Siam Transfers Co.';
    const s = sup(supplierName);
    const base = 700 + (index % 5) * 250;
    ['Indian', 'Thailand'].forEach((market) => {
      transferRates.push({
        id: `TRR-${String(transferRates.length + 1).padStart(3, '0')}`, transfer: transfer.id, transferId: transfer.id, transferName: transfer.name, supplier: s.id, supplierName,
        market, fromDate: yearStart, toDate: yearEnd, serviceType: 'SIC', currency: 'THB', status: 'Active', adultCost: Math.round(base / 3), childCost: Math.round(base / 5), remarks: '',
        vehicleCosts: [], ...stamp(),
      });
      transferRates.push({
        id: `TRR-${String(transferRates.length + 1).padStart(3, '0')}`, transfer: transfer.id, transferId: transfer.id, transferName: transfer.name, supplier: s.id, supplierName,
        market, fromDate: yearStart, toDate: yearEnd, serviceType: 'PVT', currency: 'THB', status: 'Active', adultCost: 0, childCost: 0, remarks: '',
        vehicleCosts: vehicles.filter((v) => v.vehicleType === 'PVT').map((v, vi) => ({ vehicleId: v.id, vehicle: v.name, vehicleName: v.name, capacity: v.transferCapacity, cost: base + vi * 450 })), ...stamp(),
      });
    });
  });
  const restaurantRates = [];
  restaurants.forEach((restaurant) => {
    const s = sup('Bangkok Dining Group');
    ['Indian', 'Thailand'].forEach((market) => {
      restaurantRates.push({
        id: `RSR-${String(restaurantRates.length + 1).padStart(3, '0')}`, restaurant: restaurant.id, restaurantId: restaurant.id, restaurantName: restaurant.name, supplier: s.id, supplierName: s.name,
        market, fromDate: yearStart, toDate: yearEnd, mealType: restaurant.mealPreference, tripType: 'Without Transfer', currency: 'THB', status: 'Active', adultCost: 650, childCost: 400, infantCost: 0, vehicleCosts: [], remarks: '', ...stamp(),
      });
    });
  });
  const yachts = withIds('YCH', [
    { name: 'Andaman Dream', type: 'Luxury Motor Yacht', destination: 'Phuket', category: 'Private Charter', startingPier: 'Royal Phuket Marina', maxCapacity: 20, recommendedPax: 12, supplierIds: [sup('Andaman Yachts Charter').id], brand: 'Sunseeker', year: 2021, length: 24, width: 6, cruisingSpeed: '18 knots', engineType: 'Twin diesel', cabins: 3, bathrooms: 3, description: 'Elegant motor yacht for private island hopping.' },
    { name: 'Blue Lagoon Catamaran', type: 'Catamaran', destination: 'Phuket', category: 'Private Charter', startingPier: 'Chalong Pier', maxCapacity: 30, recommendedPax: 20, supplierIds: [sup('Andaman Yachts Charter').id], brand: 'Lagoon', year: 2020, length: 16, width: 8, cruisingSpeed: '9 knots', engineType: 'Twin diesel', cabins: 4, bathrooms: 4, description: 'Spacious catamaran with trampoline and sundeck.' },
    { name: 'Pattaya Sunset Cruiser', type: 'Luxury Motor Yacht', destination: 'Pattaya', category: 'Sunset Cruise', startingPier: 'Bali Hai Pier', maxCapacity: 25, recommendedPax: 15, supplierIds: [sup('Pattaya Marine Park').id], brand: 'Azimut', year: 2019, length: 20, width: 5, cruisingSpeed: '16 knots', engineType: 'Twin diesel', cabins: 2, bathrooms: 2, description: 'Sunset cruises with onboard dinner.' },
  ].map((y, i) => ({
    weekdayDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], weekendDays: ['Saturday', 'Sunday'], crewIncluded: 'Captain + 2 Crew', crewLanguage: 'Thai / English', maxOvernightPax: 6,
    durationOptions: ['3 Hours', '4 Hours', '6 Hours'], amenities: { onboardBBQ: true, jacuzzi: i === 0, waterSlide: false, snorkelingEquipment: true, fishingEquipment: false, kayakSUP: true, towelsProvided: true, lifeJackets: true, airConditioning: true, soundSystem: true, flybridge: true, insurance: true },
    rates: [
      { id: `yr-${i}-1`, duration: '3 Hours', weekdayRate: 18000 + i * 2000, weekendRate: 21000 + i * 2000, peakRate: 25000 + i * 2000, adultPrice: 600, childPrice: 400, extraHour: 4500, extraPax: 800, status: 'Active' },
      { id: `yr-${i}-2`, duration: '6 Hours', weekdayRate: 30000 + i * 3000, weekendRate: 34000 + i * 3000, peakRate: 40000 + i * 3000, adultPrice: 800, childPrice: 500, extraHour: 4500, extraPax: 800, status: 'Active' },
    ],
    images: [photo(stockImages.phuket, 'yacht.jpg')], documents: [], inclusions: ['Captain and crew', 'Fuel', 'Soft drinks & water', 'Snorkelling gear'], exclusions: ['Alcoholic drinks', 'National park fees'],
    route: { pickupPier: y.startingPier, stops: ['Khai Island', 'Racha Yai'] }, policies: { cancellation: 'Free cancellation up to 7 days before departure.' }, ...y,
  })));

  const termsConditions = withIds('TNC', [
    { name: 'Standard Package Terms', html: '<ul><li>50% advance at booking; balance 15 days before arrival.</li><li>Cancellation: 30+ days free; 15–29 days 50%; under 15 days non-refundable.</li><li>Check-in 14:00, check-out 12:00.</li><li>Rates are subject to availability at the time of booking.</li></ul>', isDefault: true },
    { name: 'Peak Season Terms', html: '<ul><li>100% advance payment required for peak season dates.</li><li>No refund on cancellations within 45 days of arrival.</li></ul>', isDefault: false },
  ].map((t) => ({ ...t, content: t.html, termsHtml: t.html, description: t.html, type: 'Quotation' })));

  const queryTitleMasters = withIds('QTM', [
    { name: 'Thailand Family Holiday', importantNotes: 'Child-friendly hotels and shorter transfers preferred.' },
    { name: 'Thailand Honeymoon', importantNotes: 'Private pool villas, candle-light dinner, romantic activities.' },
    { name: 'Thailand Group Tour', importantNotes: 'Group rates, coach transfers, vegetarian meals.' },
  ]);

  return {
    sales, operations, activity, finance, system,
    suppliers, hotels, hotelRates, sightseeingModule, transferRates, restaurantRates, yachts, termsConditions, queryTitleMasters,
    sup,
  };
}

export { addDays };
