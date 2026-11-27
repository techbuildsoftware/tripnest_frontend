import { money } from "./currency.js";
import { LuSailboat, LuPlane, LuArrowDownToLine, LuWaves, LuHotel, LuFish, LuWind, LuCableCar, LuTreePalm, LuCat } from "react-icons/lu";
import { IMG } from "./images.js";

export const CONTACT = { phone: "+66 61 376 7464", tel: "+66613767464", email: "tripnesttraveltech@gmail.com" };

export const SERVICES = [
  { id: "yacht", title: "Yacht Party", icon: LuSailboat, cat: "Sea", img: IMG.yacht, desc: "Private and group yacht charters with music, food and sunset cruises across the Andaman Sea.", from: 8500, dur: "Half / full day" },
  { id: "flights", title: "Flight Tickets", icon: LuPlane, cat: "Travel", img: IMG.flights, desc: "Domestic and international fares with flexible dates, instant e-tickets and 24/7 support.", from: 1990, dur: "Any route" },
  { id: "skydive", title: "Skydiving", icon: LuArrowDownToLine, cat: "Sky", img: IMG.skydive, desc: "Tandem jumps with certified instructors, GoPro footage and a complete safety briefing.", from: 12000, dur: "Half day" },
  { id: "jetski", title: "Jet Ski", icon: LuWaves, cat: "Sea", img: IMG.jetski, desc: "High-speed rides over turquoise water. Guided tours or solo sessions for every skill level.", from: 1200, dur: "30–60 min" },
  { id: "hotel", title: "Hotel Booking", icon: LuHotel, cat: "Travel", img: IMG.hotel, desc: "Handpicked resorts, villas and boutique stays with best-rate guarantee and flexible cancellation.", from: 900, dur: "Per night" },
  { id: "dolphin", title: "Dolphin Show", icon: LuFish, cat: "Wildlife", img: IMG.dolphin, desc: "Family-friendly marine shows and close encounters in a responsibly run venue.", from: 700, dur: "2 hours" },
  { id: "paraglide", title: "Paragliding", icon: LuWind, cat: "Sky", img: IMG.paraglide, desc: "Soar above the coastline with expert pilots and breathtaking views of limestone islands.", from: 2800, dur: "Half day" },
  { id: "zip", title: "Ziplining", icon: LuCableCar, cat: "Sky", img: IMG.zip, desc: "Race through the jungle canopy on world-class lines with full safety gear.", from: 1800, dur: "3 hours" },
  { id: "coral", title: "Coral Island", icon: LuTreePalm, cat: "Sea", img: IMG.coral, desc: "Snorkelling, glass-bottom boats and white-sand beaches on a perfect day trip.", from: 1500, dur: "Full day" },
  { id: "tiger", title: "Tiger Park", icon: LuCat, cat: "Wildlife", img: IMG.tiger, desc: "Walk through a protected park and see majestic tigers up close with trained handlers.", from: 1000, dur: "2–3 hours" },
];

export const CATEGORIES = [
  { id: "Sky", title: "Sky adventures", sub: "Skydiving, paragliding, ziplining", img: IMG.skydive },
  { id: "Sea", title: "Sea & islands", sub: "Yachts, jet ski, coral islands", img: IMG.yacht },
  { id: "Wildlife", title: "Wildlife", sub: "Dolphin shows, tiger park", img: IMG.dolphin },
  { id: "Travel", title: "Flights & stays", sub: "Tickets, resorts, villas", img: IMG.hotel },
];

export const DESTINATIONS = [
  { id: "phuket", name: "Phuket", sea: "Andaman Sea", img: IMG.phuket, blurb: "Thailand's largest island and the easiest beach base — lively Patong, family-friendly Kata and Karon, Old Town, and day trips to Phi Phi and the Similans.", miss: ["Phi Phi day trip", "Big Buddha", "Old Town", "Sunset yacht"], stats: [["Places", 22], ["Packages", 34], ["Activities", 21], ["Day tours", 11]] },
  { id: "krabi", name: "Krabi", sea: "Andaman Sea", img: IMG.railay, blurb: "Dramatic limestone cliffs, Railay beach, island hopping and rock climbing — a favourite for couples and adventure seekers.", miss: ["Railay beach", "4-island tour", "Emerald Pool", "Kayaking"], stats: [["Places", 14], ["Packages", 18], ["Activities", 15], ["Day tours", 9]] },
  { id: "phiphi", name: "Phi Phi", sea: "Andaman Sea", img: IMG.maya, blurb: "Crystal lagoons, snorkelling and the famous Maya Bay — best done as a speedboat day trip from Phuket or Krabi.", miss: ["Maya Bay", "Snorkelling", "Viking Cave", "Monkey Beach"], stats: [["Places", 8], ["Packages", 12], ["Activities", 9], ["Day tours", 7]] },
  { id: "phangnga", name: "Phang Nga Bay", sea: "Andaman Sea", img: IMG.bond, blurb: "Sea caves, emerald lagoons and James Bond Island — canoe between limestone towers on a full-day tour.", miss: ["James Bond Island", "Sea canoe", "Hong lagoon", "Floating village"], stats: [["Places", 9], ["Packages", 10], ["Activities", 8], ["Day tours", 6]] },
  { id: "bangkok", name: "Bangkok", sea: "Chao Phraya River", img: IMG.arun, blurb: "Temples, street food, river cruises and rooftop views — the perfect first stop and the gateway to the rest of Thailand.", miss: ["Wat Arun", "Grand Palace", "Floating market", "River dinner cruise"], stats: [["Places", 25], ["Packages", 28], ["Activities", 19], ["Day tours", 14]] },
  { id: "pattaya", name: "Pattaya", sea: "Gulf of Thailand", img: IMG.pattaya, blurb: "Two hours from Bangkok: beaches, water sports, jet ski and parasailing, plus easy day trips to Coral Island.", miss: ["Coral Island", "Jet ski", "Parasailing", "Sanctuary of Truth"], stats: [["Places", 12], ["Packages", 15], ["Activities", 17], ["Day tours", 8]] },
  { id: "samui", name: "Koh Samui", sea: "Gulf of Thailand", img: IMG.samui, blurb: "Palm-fringed beaches, villa stays with pools and quick hops to Koh Phangan and Koh Tao.", miss: ["Ang Thong park", "Big Buddha", "Villa pool day", "Koh Tao snorkel"], stats: [["Places", 11], ["Packages", 13], ["Activities", 12], ["Day tours", 6]] },
  { id: "kohtao", name: "Koh Tao", sea: "Gulf of Thailand", img: IMG.hero, blurb: "A tiny island famous for diving and its Nang Yuan viewpoint — clear water, coral and hammock-and-hike sunsets.", miss: ["Nang Yuan viewpoint", "Scuba diving", "Shark Bay", "Sunset hike"], stats: [["Places", 6], ["Packages", 7], ["Activities", 10], ["Day tours", 4]] },
  { id: "chiangmai", name: "Chiang Mai", sea: "Northern Thailand", img: IMG.north, blurb: "Cool mountain air, Doi Inthanon's royal pagodas, ethical elephant sanctuaries and night markets.", miss: ["Doi Inthanon", "Night bazaar", "Old city temples", "Ziplining"], stats: [["Places", 18], ["Packages", 16], ["Activities", 14], ["Day tours", 10]] },
];

// Sample packages – replace names, routes and prices with your real products.
export const PACKAGES = [
  { id: 1, title: "Phuket Grand Honeymoon 8N/9D", route: ["Bangkok", "Phuket", "Krabi"], tags: ["Honeymoon"], dest: "phuket", img: IMG.phuket, was: 67500, price: 66000, off: 2, rating: 4.9, reviews: 286, incl: ["8N/9D", "Ferry", "Breakfast"] },
  { id: 2, title: "Krabi & Phi Phi Island Hopping 6N/7D", route: ["Krabi", "Phi Phi"], tags: ["Island Hopping", "Group"], dest: "krabi", img: IMG.maya, was: 52000, price: 50400, off: 3, rating: 4.8, reviews: 214, incl: ["6N/7D", "Speedboat", "Breakfast"] },
  { id: 3, title: "Bangkok Pattaya Classic Circuit 6N/7D", route: ["Bangkok", "Pattaya"], tags: ["Classic Circuit", "Family"], dest: "bangkok", img: IMG.arun, was: 45000, price: 43500, off: 3, rating: 4.9, reviews: 342, incl: ["6N/7D", "Transfers", "Breakfast"] },
  { id: 4, title: "Phang Nga Bay & James Bond Island Escape 5N/6D", route: ["Phuket", "Phang Nga"], tags: ["Island Hopping", "Family"], dest: "phangnga", img: IMG.bond, was: 59500, price: 58000, off: 3, rating: 4.9, reviews: 198, incl: ["5N/6D", "Canoe tour", "Breakfast"] },
  { id: 5, title: "Koh Samui Villa Retreat 5N/6D", route: ["Koh Samui", "Koh Tao"], tags: ["Honeymoon", "Beach"], dest: "samui", img: IMG.samui, was: 58500, price: 57000, off: 3, rating: 4.8, reviews: 167, incl: ["5N/6D", "Ferry", "Private pool"] },
  { id: 6, title: "Pattaya Adventure Weekend 3N/4D", route: ["Pattaya"], tags: ["Group", "Beach"], dest: "pattaya", img: IMG.jetski, was: 22000, price: 21400, off: 3, rating: 4.7, reviews: 129, incl: ["3N/4D", "Jet ski", "Parasailing"] },
  { id: 7, title: "Chiang Mai Highlands & Culture 5N/6D", route: ["Chiang Mai", "Chiang Rai"], tags: ["Classic Circuit", "Family"], dest: "chiangmai", img: IMG.north, was: 41000, price: 39800, off: 3, rating: 4.8, reviews: 154, incl: ["5N/6D", "Guide", "Breakfast"] },
  { id: 8, title: "Phuket Yacht & Sunset Party 4N/5D", route: ["Phuket"], tags: ["Group", "Honeymoon"], dest: "phuket", img: IMG.yacht, was: 38500, price: 37200, off: 3, rating: 4.9, reviews: 221, incl: ["4N/5D", "Yacht party", "Breakfast"] },
];

export const NAV = [
  { to: "/", label: "Home" },
  { to: "/destinations", label: "Destinations" },
  { to: "/services", label: "Services" },
  { to: "/business", label: "For Business" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export const baht = (n) => money(n);
