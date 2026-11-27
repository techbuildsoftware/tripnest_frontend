import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import './LandingPage.css';
import logoTransparent from '../../assets/icon-color.png';
import logoWhite from '../../assets/logo-color.png';
import loginHeroImage from '../../assets/Loignimage.png';
import bangkokImg from '../../assets/thailand_bangkok.jpg';
import phiphiImg from '../../assets/thailand_phiphi.jpg';
import chiangmaiImg from '../../assets/thailand_chiangmai.jpg';
import krabiImg from '../../assets/thailand_krabi.jpg';
import phuketImg from '../../assets/thailand_phuket.jpg';
import kohsamuiImg from '../../assets/thailand_kohsamui.jpg';
import tourHotelImg from '../../assets/tour_hotel.jpg';
import tourTransfersImg from '../../assets/tour_transfers.jpg';
import tourQuotationImg from '../../assets/tour_quotation.jpg';
import tourPartnerImg from '../../assets/tour_partner.jpg';
import topbarImg from '../../assets/Topbar1.png';
import { RefHero, RefDestinations, RefExperiences, RefSolutions, RefPartner, RefTestimonials } from './LandingRefSections';

// ─── 7-Step "Take a Tour of BuildSoftware" Data (Reference Image 2) ───────────
const tourSteps = [
  {
    step: 1,
    title: 'Welcome to BuildSoftware',
    desc: 'Learn about our company and B2B partnership benefits.',
    image: bangkokImg,
    badge: '1',
    modalTitle: 'Welcome to BuildSoftware',
    modalSubtitle: 'Thailand’s Leading B2B Destination Management Company',
    details: [
      'Over 15+ years of operational excellence crafting unforgettable journeys in Thailand.',
      'Headquartered in Bangkok with dedicated ground operations hubs in Phuket and Chiang Mai.',
      'Fully licensed under Tourism Authority of Thailand (TAT License No. 11/XXXXX).',
      'Dedicated multilingual reservation and ground support teams operating 24/7.',
      'Exclusive B2B contracted net rates for registered global tour operators and travel agencies.',
    ],
  },
  {
    step: 2,
    title: 'Explore Destinations',
    desc: 'Bangkok, Pattaya, Phuket, Krabi, Koh Samui, Chiang Mai.',
    image: phiphiImg,
    badge: '2',
    modalTitle: 'Iconic Thai Destinations',
    modalSubtitle: 'Comprehensive Ground Coverage Across Every Thai Province',
    details: [
      'Bangkok: Golden grand palaces, Michelin gastronomy, and river cruise charters.',
      'Phuket & Andaman: Private luxury yachts, beach clubs, and 5-star island hopping.',
      'Chiang Mai & North: Serene Lanna culture, misty tea hills, and elephant sanctuaries.',
      'Krabi & Koh Samui: Emerald karst lagoons, Railay rock towers, and wellness sanctuaries.',
      'Pattaya & Hua Hin: Family theme attractions, championship golf courses, and coastal luxury.',
    ],
  },
  {
    step: 3,
    title: 'Hotels & Accommodation',
    desc: 'Browse hotel categories, room types and sample rates.',
    image: tourHotelImg,
    badge: '3',
    modalTitle: 'Curated Hotels & Luxury Villas',
    modalSubtitle: 'Preferred Rates with Over 500+ Luxury Thai Properties',
    details: [
      'Direct contracts with top international brands: Marriott, Hyatt, Four Seasons, Banyan Tree, and boutique luxury stays.',
      'Private pool villas in Phuket, Koh Samui, and Krabi with private chef services.',
      'Guaranteed room allotment and instant inventory check in the BuildSoftware CRM.',
      'Special agent amenities: VIP welcome drinks, complimentary room upgrades, and flexible policies.',
    ],
  },
  {
    step: 4,
    title: 'Sightseeing & Transfers',
    desc: 'Discover tours, attractions and vehicle options.',
    image: tourTransfersImg,
    badge: '4',
    modalTitle: 'Fleet Transfers & Sightseeing',
    modalSubtitle: 'Private Chauffeur Fleet & Licensed Expert Guides',
    details: [
      'Modern, air-conditioned fleet: Toyota Commuter VIP vans, Alphard luxury MPVs, and private VIP motor coaches.',
      'Airport meet & greet with branded welcome signboards and dedicated arrival coordinators.',
      'Licensed professional tour guides fluent in English, Chinese, Hindi, and European languages.',
      'Bespoke private tours and shared group excursions with full traveler insurance coverage.',
    ],
  },
  {
    step: 5,
    title: 'Build a Sample Package',
    desc: 'Create a day-wise itinerary with hotel and tours.',
    image: kohsamuiImg,
    badge: '5',
    modalTitle: 'Custom Day-Wise Itinerary Builder',
    modalSubtitle: 'Craft Bespoke Multi-City Travel Experiences in Minutes',
    details: [
      'Combine flights, inter-city transfers, luxury hotels, and guided activities seamlessly.',
      'Flexible customizable templates: Romantic Honeymoon, Family Adventure, Luxury Wellness, and MICE groups.',
      'Interactive route maps and day-by-day scheduling with transparent itemized pricing.',
      'Export client-ready branded day-wise travel itineraries ready for sharing with travelers.',
    ],
  },
  {
    step: 6,
    title: 'Quotation & Booking',
    desc: 'See sample quotations, confirmations and vouchers.',
    image: tourQuotationImg,
    badge: '6',
    modalTitle: 'Fast Quotations & Instant Vouchers',
    modalSubtitle: 'Generate Official Branded PDF Quotes & Confirmations',
    details: [
      'Generate accurate, multi-currency quotations in under 60 seconds directly from our CRM.',
      'Custom markup management: set your agency commission and net profit margins easily.',
      'One-click booking confirmation with automated service vouchers and client payment links.',
      'Real-time booking tracking from query stage to traveler arrival and departure.',
    ],
  },
  {
    step: 7,
    title: 'Become a Travel Partner',
    desc: 'How to register, account approval and support.',
    image: tourPartnerImg,
    badge: '7',
    modalTitle: 'Join the BuildSoftware B2B Network',
    modalSubtitle: 'Instant Registration, Dedicated Account Manager & CRM Access',
    details: [
      'Fast online onboarding: register your agency and receive verified approval within 24 hours.',
      'Dedicated Key Account Manager assigned for day-to-day operations and customized contracting.',
      'Access the full BuildSoftware CRM portal to manage queries, bookings, vouchers, and accounts.',
      'Exclusive agent incentives, fam-trips, and continuous B2B support.',
    ],
  },
];

// ─── Destinations Data with Rich Details ──────────────────────────────────────
const destinations = [
  {
    id: 1,
    name: 'Bangkok',
    tagline: 'City of Angels',
    description: 'Explore the vibrant capital with golden temples, bustling markets, and world-class cuisine.',
    image: bangkokImg,
    highlight: 'Grand Palace & Wat Phra Kaew',
    duration: '3–5 Days',
    best: 'Nov – Feb',
    temp: '32°C',
    airport: 'BKK / DMK',
    vibe: 'Cultural & Cosmopolitan',
    coordinates: '13.7563° N, 100.5018° E',
    topAttractions: [
      'The Grand Palace & Emerald Buddha',
      'Wat Arun (Temple of Dawn) at Sunset',
      'Chao Phraya River Luxury Dinner Cruise',
      'Chatuchak Weekend Market & Michelin Street Food',
      'IconSiam & Skyline Rooftop Lounges',
    ],
    curatedPackage: 'Bangkok Heritage & Luxury City Break',
    travelersChoice: '99% Loved Wat Arun at Sunset',
  },
  {
    id: 2,
    name: 'Phi Phi Islands',
    tagline: 'Paradise Found',
    description: 'Dive into crystal-clear waters surrounded by dramatic limestone cliffs and white sandy beaches.',
    image: phiphiImg,
    highlight: 'Maya Bay & Viking Cave',
    duration: '2–4 Days',
    best: 'Dec – Apr',
    temp: '29°C',
    airport: 'HKT / KBV + Speedboat',
    vibe: 'Island Paradise & Diving',
    coordinates: '7.7407° N, 98.7784° E',
    topAttractions: [
      'Maya Bay Lagoon (The Beach)',
      'Pileh Lagoon Emerald Swimming',
      'Bamboo Island Coral Reef Snorkeling',
      'Phi Phi Viewpoint 360° Sunset Panorama',
      'Private Sunset Catamaran & Night Plankton',
    ],
    curatedPackage: 'Phi Phi Private Catamaran Expedition',
    travelersChoice: 'Top Rated Island in the Andaman Sea',
  },
  {
    id: 3,
    name: 'Chiang Mai',
    tagline: 'Rose of the North',
    description: 'Discover ancient temples, floating lanterns, and rich hill-tribe culture in northern Thailand.',
    image: chiangmaiImg,
    highlight: 'Doi Suthep & Old City Temples',
    duration: '3–5 Days',
    best: 'Oct – Feb',
    temp: '26°C',
    airport: 'CNX',
    vibe: 'Serene Heritage & Mountain Mist',
    coordinates: '18.7883° N, 98.9853° E',
    topAttractions: [
      'Wat Phra That Doi Suthep Temple',
      'Ethical Elephant Rescue Sanctuary Day Tour',
      'Historic Old City & Sunday Night Walking Street',
      'Doi Inthanon National Park & Highest Peak',
      'Authentic Lanna Cooking Masterclass',
    ],
    curatedPackage: 'Lanna Heritage & Rainforest Sanctuary',
    travelersChoice: '#1 Cultural Destination in Thailand',
  },
  {
    id: 4,
    name: 'Krabi',
    tagline: "Nature's Masterpiece",
    description: 'Towering karst cliffs, emerald lagoons, and pristine beaches make Krabi a paradise for explorers.',
    image: krabiImg,
    highlight: 'Railay Beach & Four Islands',
    duration: '4–6 Days',
    best: 'Nov – Apr',
    temp: '30°C',
    airport: 'KBV',
    vibe: 'Adventure, Romance & Nature',
    coordinates: '8.0863° N, 98.9063° E',
    topAttractions: [
      'Railay Beach & Phra Nang Cave Rock Formations',
      'Four Islands Speedboat Tour & Sandbar Walk',
      'Emerald Pool (Sa Morakot) & Natural Hot Springs',
      'Hong Island 360° Panoramic Viewpoint',
      'Tiger Cave Temple (Wat Tham Suea)',
    ],
    curatedPackage: 'Krabi Karst Adventure & Pool Villas',
    travelersChoice: 'Favorite for Couples & Eco-Travelers',
  },
  {
    id: 5,
    name: 'Phuket',
    tagline: 'Pearl of the Andaman',
    description: 'From luxury resorts to vibrant nightlife, Phuket offers something extraordinary for every traveler.',
    image: phuketImg,
    highlight: 'Phang Nga Bay & Kata Beach',
    duration: '5–7 Days',
    best: 'Nov – Apr',
    temp: '31°C',
    airport: 'HKT',
    vibe: 'Luxury Beach Living & Nightlife',
    coordinates: '7.8804° N, 98.3923° E',
    topAttractions: [
      'Phang Nga Bay & James Bond Island Yachting',
      'Charming Sino-Portuguese Old Phuket Town',
      'Big Buddha Monument & Chalong Temple',
      'Kata Noi & Surin Beach VIP Beach Clubs',
      'Promthep Cape Breathtaking Sunset',
    ],
    curatedPackage: 'Phuket Ultra-Luxury Villa & Yacht Experience',
    travelersChoice: 'Most Popular Luxury DMC Destination',
  },
  {
    id: 6,
    name: 'Koh Samui',
    tagline: 'Island Escape',
    description: 'Overwater bungalows, turquoise waters, and lush coconut groves create an unforgettable island escape.',
    image: kohsamuiImg,
    highlight: 'Ang Thong Marine Park & Fisherman’s Village',
    duration: '4–6 Days',
    best: 'Jan – Sep',
    temp: '29°C',
    airport: 'USM',
    vibe: 'Boho Luxury & Tropical Wellness',
    coordinates: '9.5120° N, 100.0136° E',
    topAttractions: [
      'Ang Thong National Marine Park Kayak & Viewpoint',
      'Fisherman’s Village Bophut Night Dining',
      'Big Buddha (Wat Phra Yai) & Wat Plai Laem',
      'Silver Beach & Chaweng Luxury Beachfronts',
      'Private Spa Sanctuary & Yoga Retreats',
    ],
    curatedPackage: 'Koh Samui Tropical Wellness & Island Luxe',
    travelersChoice: 'Top Island for Honeymooners',
  },
];

const stats = [
  { value: '15+', label: 'Years Experience' },
  { value: '50,000+', label: 'Happy Travelers' },
  { value: '200+', label: 'Tour Packages' },
  { value: '98%', label: 'Satisfaction' },
];

const services = [
  {
    icon: 'plane',
    title: 'Flight Coordination',
    desc: "Seamless flight arrangements with major airlines connecting to Thailand's key airports.",
  },
  {
    icon: 'hotel',
    title: 'Premium Hotels',
    desc: 'Handpicked luxury and boutique hotels across every Thai destination you dream of.',
  },
  {
    icon: 'bus',
    title: 'Private Transfers',
    desc: 'Comfortable, air-conditioned vehicle transfers from airport pickups to inter-city journeys.',
  },
  {
    icon: 'boat',
    title: 'Island Tours',
    desc: "Exclusive boat tours to Thailand's most breathtaking islands and hidden gems.",
  },
  {
    icon: 'map',
    title: 'Custom Itineraries',
    desc: 'Fully bespoke travel plans crafted to match your style, budget, and dream destinations.',
  },
  {
    icon: 'culture',
    title: 'Cultural Experiences',
    desc: 'Authentic Thai experiences: cooking classes, temple visits, elephant sanctuaries, and more.',
  },
];

const serviceIcons = {
  plane: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2C4.3 5.1 3.9 5.4 3.7 5.9L3 8.2c-.3.6 0 1.2.6 1.5l6.7 3.2-2 2-2.9-.3c-.4-.1-.9.1-1 .5l-.5 1.9c-.2.7.3 1.3 1 1.3h.2l2.4.3 1.8 2.4c.3.5 1 .7 1.5.4l2-1c.5-.3.8-.9.6-1.5z" />
    </svg>
  ),
  hotel: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 22V8a2 2 0 012-2h14a2 2 0 012 2v14M3 11h18M3 16h18" />
      <path d="M9 22V16h6v6" />
      <path d="M9 11V6M15 11V6" />
    </svg>
  ),
  bus: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 3v5h-7V8zM5 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
  ),
  boat: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M19.38 20A11.6 11.6 0 0021 14l-9-4-9 4c1.12 6.54 7 11.63 7 11.63" />
      <path d="M12 2v8" />
    </svg>
  ),
  map: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  culture: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
};

// ─── Header (Navbar with Logo on White Background - No border, No shadow) ────
function Header({ onLoginClick, isAuthenticated }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`lp-header ${scrolled ? 'lp-header--scrolled' : ''}`}>
      <div className="lp-header-inner">
        <div
          role="button"
          tabIndex={0}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="lp-header-logo"
          style={{ cursor: 'pointer' }}
        >
          {/* Logo with White Background - Zero border, Zero shadow */}
          <div className="lp-header-logo-badge">
            <img src={logoWhite} alt="BuildSoftware" className="lp-header-logo-img" />
          </div>
        </div>

        <nav className="lp-nav">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={`lp-nav-link ${scrolled ? '' : 'lp-nav-link--active'}`}>Home</button>
          <button type="button" onClick={() => scrollTo('destinations')} className="lp-nav-link">Destinations</button>
          <button type="button" onClick={() => scrollTo('experiences')} className="lp-nav-link">Experiences</button>
          <button type="button" onClick={() => scrollTo('services')} className="lp-nav-link">Services</button>
          <button type="button" onClick={() => scrollTo('about')} className="lp-nav-link">About Us</button>
          <button type="button" onClick={() => navigate('/contact')} className="lp-nav-link">Help</button>
          <span className="lp-lang-chip" aria-label="Language">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" /></svg>
            English
          </span>
        </nav>

        <button id="header-login-btn" className="lp-header-login-btn" onClick={onLoginClick}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            {isAuthenticated ? (
              <>
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </>
            ) : (
              <>
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </>
            )}
          </svg>
          {isAuthenticated ? 'Dashboard' : 'Login'}
        </button>

        <button className={`lp-hamburger ${menuOpen ? 'lp-hamburger--open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
      </div>

      {menuOpen && (
        <div className="lp-mobile-menu">
          <button type="button" className="lp-mobile-menu-item" onClick={() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Home</button>
          <button type="button" className="lp-mobile-menu-item" onClick={() => scrollTo('destinations')}>Destinations</button>
          <button type="button" className="lp-mobile-menu-item" onClick={() => scrollTo('experiences')}>Experiences</button>
          <button type="button" className="lp-mobile-menu-item" onClick={() => scrollTo('services')}>Services</button>
          <button type="button" className="lp-mobile-menu-item" onClick={() => scrollTo('about')}>About Us</button>
          <button type="button" className="lp-mobile-menu-item" onClick={() => { setMenuOpen(false); navigate('/contact'); }}>Help</button>
          <button className="lp-mobile-menu-login" onClick={() => { setMenuOpen(false); onLoginClick(); }}>{isAuthenticated ? 'Dashboard' : 'Login Portal'}</button>
        </div>
      )}
    </header>
  );
}

// ─── Animated & Unique Hero Visual Hub ────────────────────────────────────────
function HeroInteractiveHub({ onOpenDestination }) {
  const [activeTab, setActiveTab] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const hubItems = [
    {
      city: 'Bangkok',
      code: 'BKK',
      tag: 'Grand Palace & Wat Arun',
      temp: '32°C',
      status: 'High Season',
      route: 'Suvarnabhumi Gateway',
      flightTime: 'Arrival Hub',
      img: bangkokImg,
      destIndex: 0,
      badge: '🏛️ Capital Glory',
    },
    {
      city: 'Phuket',
      code: 'HKT',
      tag: 'Andaman Yacht & Pool Villas',
      temp: '31°C',
      status: 'Tropical Sun',
      route: 'BKK ➔ HKT Direct 1h 15m',
      flightTime: 'VIP Charter Daily',
      img: phuketImg,
      destIndex: 4,
      badge: '🏖️ Luxury Island',
    },
    {
      city: 'Chiang Mai',
      code: 'CNX',
      tag: 'Mist Peaks & Lanna Temples',
      temp: '26°C',
      status: 'Cool Breeze',
      route: 'BKK ➔ CNX Direct 1h 10m',
      flightTime: 'Mountain Escapes',
      img: chiangmaiImg,
      destIndex: 2,
      badge: '⛰️ Serene Culture',
    },
    {
      city: 'Phi Phi',
      code: 'PHI',
      tag: 'Maya Bay & Turquoise Lagoons',
      temp: '29°C',
      status: 'Crystal Water',
      route: 'HKT ➔ Speedboat 45m',
      flightTime: 'Private Catamaran',
      img: phiphiImg,
      destIndex: 1,
      badge: '⛵ Island Wonder',
    },
  ];

  const current = hubItems[activeTab];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % hubItems.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [hubItems.length]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className="lp-hero-nexus"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="lp-nexus-sonar-wrap">
        <div className="lp-nexus-sonar-ring lp-nexus-sonar-ring--1" />
        <div className="lp-nexus-sonar-ring lp-nexus-sonar-ring--2" />
        <div className="lp-nexus-sonar-ring lp-nexus-sonar-ring--3" />
        <div className="lp-nexus-compass-ring" />
      </div>

      {/* Floating 3D Micro-Card: Live Booking Ticker (Top Right) */}
      <div
        className="lp-nexus-float lp-nexus-float--top-right"
        style={{
          translate: `${mousePos.x * -16}px ${mousePos.y * -16}px`,
        }}
      >
        <div className="lp-nexus-float-pulse">
          <span className="lp-pulse-dot lp-pulse-dot--green" />
          <span className="lp-nexus-float-status">LIVE DMC ACTIVITY</span>
        </div>
        <div className="lp-nexus-float-main">
          <strong>Phuket &amp; Phi Phi Yacht</strong>
          <span>Booked 2 mins ago · 4 Guests</span>
        </div>
        <div className="lp-nexus-float-stars">★★★★★ <span>4.99/5 Rating</span></div>
      </div>

      {/* Floating 3D Micro-Card: Fast CRM Engine (Bottom Left) */}
      <div
        className="lp-nexus-float lp-nexus-float--bottom-left"
        style={{
          translate: `${mousePos.x * 14}px ${mousePos.y * 14}px`,
        }}
      >
        <div className="lp-nexus-float-pulse">
          <span className="lp-pulse-dot" />
          <span className="lp-nexus-float-status">CRM AUTOMATION</span>
        </div>
        <div className="lp-nexus-float-main">
          <strong>Instant DMC Quotation</strong>
          <span>Generated in 42s · 100% Bespoke</span>
        </div>
        <div className="lp-nexus-float-bar">
          <div className="lp-nexus-float-bar-fill" />
        </div>
      </div>

      {/* Main Interactive 3D Travel Centerpiece */}
      <div
        className="lp-nexus-centerpiece"
        style={{
          transform: `perspective(1000px) rotateY(${mousePos.x * 8}deg) rotateX(${-mousePos.y * 8}deg)`,
        }}
      >
        <div className="lp-nexus-tabs">
          {hubItems.map((item, idx) => (
            <button
              key={item.city}
              className={`lp-nexus-tab ${activeTab === idx ? 'lp-nexus-tab--active' : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              <span className="lp-nexus-tab-badge">{item.badge.split(' ')[0]}</span>
              <span className="lp-nexus-tab-city">{item.city}</span>
              {activeTab === idx && <span key={`p-${idx}`} className="lp-nexus-tab-progress" />}
            </button>
          ))}
        </div>

        <div className="lp-nexus-card">
          <div className="lp-nexus-card-bg">
            <img key={current.city} src={current.img} alt={current.city} className="lp-nexus-card-img" />
            <div className="lp-nexus-card-overlay" />
          </div>

          <div className="lp-nexus-card-content">
            <div className="lp-nexus-flight-banner">
              <div className="lp-nexus-flight-endpoint">
                <span className="lp-nexus-airport-code">BKK</span>
                <span className="lp-nexus-airport-label">Bangkok Hub</span>
              </div>

              <div className="lp-nexus-flight-tracker">
                <svg className="lp-nexus-flight-svg" viewBox="0 0 160 28" fill="none">
                  <path
                    d="M 5 20 Q 80 2 155 20"
                    stroke="rgba(247,146,42,0.65)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <g className="lp-nexus-flying-plane">
                    <path
                      d="M 12 2 L 15 8 L 22 9 L 17 13 L 19 19 L 12 15 L 5 19 L 7 13 L 2 9 L 9 8 Z"
                      fill="#f7922a"
                      transform="scale(0.8)"
                    />
                  </g>
                </svg>
                <span className="lp-nexus-flight-tag">{current.route}</span>
              </div>

              <div className="lp-nexus-flight-endpoint">
                <span className="lp-nexus-airport-code">{current.code}</span>
                <span className="lp-nexus-airport-label">{current.city}</span>
              </div>
            </div>

            <div className="lp-nexus-card-info" key={current.city}>
              <div className="lp-nexus-card-eyebrow">
                <span className="lp-nexus-pill">{current.status}</span>
                <span className="lp-nexus-pill lp-nexus-pill--gold">🌡️ {current.temp}</span>
                <span className="lp-nexus-pill lp-nexus-pill--blue">⚡ {current.flightTime}</span>
              </div>

              <h3 className="lp-nexus-card-title">{current.city}</h3>
              <p className="lp-nexus-card-tag">{current.tag}</p>

              <button
                className="lp-nexus-cta"
                onClick={() => onOpenDestination(destinations[current.destIndex])}
              >
                <span>Explore {current.city} Itinerary</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="lp-nexus-meta-row">
          <span className="lp-nexus-coord">📍 {destinations[current.destIndex]?.coordinates || '13.7563° N, 100.5018° E'}</span>
          <span className="lp-nexus-verified">✓ 100% Certified Thai DMC Operations</span>
        </div>
      </div>
    </div>
  );
}

// ─── Animated number (counts up once on load) ────────────────────────────────
function CountUp({ value, duration = 1900, delay = 900 }) {
  const match = String(value).match(/^(\D*)([\d,]+)(.*)$/);
  const target = match ? parseInt(match[2].replace(/,/g, ''), 10) : 0;
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!match) return undefined;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(target);
      return undefined;
    }
    let raf;
    let startTs;
    const timer = setTimeout(() => {
      const tick = (ts) => {
        if (startTs === undefined) startTs = ts;
        const p = Math.min((ts - startTs) / duration, 1);
        setN(Math.round(target * (1 - Math.pow(1 - p, 4))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, delay]);

  if (!match) return <>{value}</>;
  return <>{match[1]}{n.toLocaleString('en-US')}{match[3]}</>;
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection({ onLoginClick, onContactClick, onOpenDestination }) {
  return (
    <section id="top" className="lp-hero">
      <div className="lp-hero-bg-wrap">
        <div className="lp-hero-bg-gradient" />
        <div className="lp-hero-grid" />
        <div className="lp-hero-orb lp-hero-orb--1" />
        <div className="lp-hero-orb lp-hero-orb--2" />
        <div className="lp-hero-orb lp-hero-orb--3" />
      </div>

      <div className="lp-hero-particles">
        {[...Array(16)].map((_, i) => (
          <span
            key={i}
            className="lp-hero-particle"
            style={{
              left: `${(i * 6.4 + 3) % 100}%`,
              animationDelay: `${(i * 0.7) % 6}s`,
              animationDuration: `${7 + (i % 5)}s`,
            }}
          />
        ))}
      </div>

      <div className="lp-hero-layout">
        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <span className="lp-hero-badge-dot" />
            Thailand's #1 Destination Management Company
          </div>

          <h1 className="lp-hero-title">
            <span className="lp-hero-title-line">Discover the</span>
            <span className="lp-hero-title-gradient">Magic of Thailand</span>
          </h1>

          <p className="lp-hero-subtitle">
            Experience Thailand like never before — BuildSoftware crafts unforgettable journeys with precision, passion, and local expertise.
          </p>

          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={onContactClick}>
              Contact Us
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <a href="#tour" className="lp-btn-outline">
              Take the Tour
            </a>
          </div>

          <div className="lp-hero-stats">
            {stats.map((s, i) => (
              <div key={i} className="lp-hero-stat-item">
                <span className="lp-hero-stat-val"><CountUp value={s.value} delay={900 + i * 120} /></span>
                <span className="lp-hero-stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-hero-visual">
          <HeroInteractiveHub onOpenDestination={onOpenDestination} />
        </div>
      </div>

      <a href="#tour" className="lp-scroll-cue">
        <div className="lp-scroll-cue-dot" />
        <span>Scroll to explore</span>
      </a>
    </section>
  );
}

// ─── "Take a Tour of BuildSoftware" Section (Directly from Reference Image 2) ──
function TourSection({ onStartTour, onSelectStep, onWatchVideo }) {
  return (
    <section id="tour" className="lp-tour-section">
      <div className="lp-tour-container">
        {/* Top Header Row with Title, Subtitle, and Buttons */}
        <div className="lp-tour-header">
          <div className="lp-tour-header-text">
            <h2 className="lp-tour-title">
              Take a Tour of <span className="lp-tour-title-gold">BuildSoftware</span>
            </h2>
            <p className="lp-tour-subtitle">
              Explore our services, destinations and partner portal in a quick guided tour.
            </p>
          </div>

          <div className="lp-tour-header-actions">
            <button className="lp-tour-btn-start" onClick={onStartTour}>
              Start the Tour →
            </button>
            <button className="lp-tour-btn-video" onClick={onWatchVideo}>
              <span className="lp-tour-play-circle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <div className="lp-tour-video-label">
                <span className="lp-tour-video-top">Watch Video</span>
                <span className="lp-tour-video-bottom">(1 min)</span>
              </div>
            </button>
          </div>
        </div>

        {/* 7-Step Cards Flow with Connector Arrows */}
        <div className="lp-tour-steps-row">
          {tourSteps.map((item, index) => (
            <React.Fragment key={item.step}>
              {/* Step Card */}
              <div
                className="lp-tour-step-card"
                onClick={() => onSelectStep(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectStep(index)}
              >
                <div className="lp-tour-img-wrap">
                  <img src={item.image} alt={item.title} className="lp-tour-img" loading="lazy" />
                  <div className="lp-tour-img-overlay" />
                </div>

                {/* Overlapping Gold Number Badge */}
                <div className="lp-tour-badge">{item.badge}</div>

                <div className="lp-tour-info">
                  <h3 className="lp-tour-step-title">{item.title}</h3>
                  <p className="lp-tour-step-desc">{item.desc}</p>
                </div>
              </div>

              {/* Arrow Connector between steps */}
              {index < tourSteps.length - 1 && (
                <div className="lp-tour-connector" aria-hidden="true">
                  <span className="lp-tour-arrow-circle">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Guided Tour Interactive Modal ───────────────────────────────────────────
function TourModal({ stepIndex, onClose, onNext, onPrev, onOpenLogin }) {
  if (stepIndex === null || stepIndex === undefined) return null;
  const current = tourSteps[stepIndex];

  return (
    <div className="lp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lp-tour-modal-container">
        <button className="lp-modal-close" onClick={onClose} title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Banner */}
        <div className="lp-tour-modal-hero">
          <img src={current.image} alt={current.title} className="lp-tour-modal-hero-img" />
          <div className="lp-tour-modal-hero-gradient" />
          <div className="lp-tour-modal-hero-content">
            <div className="lp-tour-modal-badge">
              Step {current.step} of {tourSteps.length}
            </div>
            <h2 className="lp-tour-modal-title">{current.modalTitle}</h2>
            <p className="lp-tour-modal-subtitle">{current.modalSubtitle}</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="lp-tour-modal-body">
          <h4 className="lp-tour-modal-section-title">Key Advantages &amp; Capabilities</h4>
          <div className="lp-tour-modal-list">
            {current.details.map((point, idx) => (
              <div key={idx} className="lp-tour-modal-point">
                <span className="lp-tour-modal-check">✓</span>
                <span>{point}</span>
              </div>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="lp-tour-modal-nav-row">
            <button
              className="lp-tour-modal-btn lp-tour-modal-btn--prev"
              onClick={onPrev}
              disabled={stepIndex === 0}
            >
              ← Previous Step
            </button>

            {/* Stepper Dots */}
            <div className="lp-tour-modal-dots">
              {tourSteps.map((s, i) => (
                <span
                  key={s.step}
                  className={`lp-tour-modal-dot ${i === stepIndex ? 'lp-tour-modal-dot--active' : ''}`}
                />
              ))}
            </div>

            {stepIndex < tourSteps.length - 1 ? (
              <button className="lp-tour-modal-btn lp-tour-modal-btn--next" onClick={onNext}>
                Next Step →
              </button>
            ) : (
              <button
                className="lp-tour-modal-btn lp-tour-modal-btn--cta"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
              >
                Contact Us
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Guided Video Modal ───────────────────────────────────────────────────────
function VideoModal({ isOpen, onClose, onOpenLogin }) {
  if (!isOpen) return null;

  return (
    <div className="lp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lp-video-modal-container">
        <button className="lp-modal-close" onClick={onClose} title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="lp-video-player-wrap">
          <img src={bangkokImg} alt="BuildSoftware Overview" className="lp-video-player-thumb" />
          <div className="lp-video-player-overlay">
            <div className="lp-video-play-pulse">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="lp-video-tagline">1-Minute DMC Partner Tour</span>
          </div>
        </div>

        <div className="lp-video-modal-body">
          <h3 className="lp-video-modal-title">Experience the BuildSoftware Ecosystem</h3>
          <p className="lp-video-modal-desc">
            Discover how leading global travel agents and B2B partners leverage our end-to-end Thailand operations, automated CRM quotations, contracted luxury hotels, and VIP airport transfers.
          </p>

          <div className="lp-video-modal-features">
            <div className="lp-video-modal-feat">⚡ 60s Multi-Currency Quotations</div>
            <div className="lp-video-modal-feat">🏨 500+ Luxury Resort Allocations</div>
            <div className="lp-video-modal-feat">🚐 Private VIP Transport Fleet</div>
            <div className="lp-video-modal-feat">🛡️ 100% TAT Licensed DMC</div>
          </div>

          <div className="lp-video-modal-actions">
            <button
              className="lp-btn-primary"
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
            >
              Contact Us
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button className="lp-btn-outline" onClick={onClose}>
              Continue Exploring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Destination Details Modal ────────────────────────────────────────────────
function DestinationModal({ dest, onClose, onSelectNext, onSelectPrev, onOpenLogin }) {
  if (!dest) return null;

  return (
    <div className="lp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lp-dest-modal-container">
        <button className="lp-modal-close" onClick={onClose} title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="lp-dest-modal-hero">
          <img src={dest.image} alt={dest.name} className="lp-dest-modal-hero-img" />
          <div className="lp-dest-modal-hero-gradient" />
          <div className="lp-dest-modal-hero-content">
            <div className="lp-dest-modal-badge">
              <span className="lp-pulse-dot" />
              {dest.tagline}
            </div>
            <h2 className="lp-dest-modal-title">{dest.name}</h2>
            <div className="lp-dest-modal-chips-row">
              <span className="lp-dest-modal-chip">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {dest.duration}
              </span>
              <span className="lp-dest-modal-chip">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
                </svg>
                {dest.temp} Avg Temp
              </span>
              <span className="lp-dest-modal-chip">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Best: {dest.best}
              </span>
              <span className="lp-dest-modal-chip">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2C4.3 5.1 3.9 5.4 3.7 5.9L3 8.2c-.3.6 0 1.2.6 1.5l6.7 3.2-2 2-2.9-.3c-.4-.1-.9.1-1 .5l-.5 1.9c-.2.7.3 1.3 1 1.3h.2l2.4.3 1.8 2.4c.3.5 1 .7 1.5.4l2-1c.5-.3.8-.9.6-1.5z" />
                </svg>
                Airport: {dest.airport}
              </span>
            </div>
          </div>
        </div>

        <div className="lp-dest-modal-body">
          <div className="lp-dest-modal-section">
            <h4 className="lp-dest-modal-heading">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Destination Overview
            </h4>
            <p className="lp-dest-modal-text">{dest.description}</p>
            <div className="lp-dest-modal-highlight-box">
              <span className="lp-dest-modal-highlight-label">Signature Highlight:</span>
              <span className="lp-dest-modal-highlight-val">{dest.highlight}</span>
            </div>
          </div>

          <div className="lp-dest-modal-section">
            <h4 className="lp-dest-modal-heading">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Top Curated Attractions &amp; Experiences
            </h4>
            <div className="lp-dest-modal-attractions">
              {dest.topAttractions.map((att, i) => (
                <div key={i} className="lp-dest-modal-attraction-item">
                  <div className="lp-dest-modal-check">✓</div>
                  <span>{att}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lp-dest-modal-package">
            <div className="lp-dest-modal-pkg-info">
              <span className="lp-dest-modal-pkg-lbl">Recommended DMC Tour</span>
              <span className="lp-dest-modal-pkg-title">{dest.curatedPackage}</span>
              <span className="lp-dest-modal-pkg-quote">✨ {dest.travelersChoice}</span>
            </div>
            <button
              className="lp-dest-modal-btn-plan"
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
            >
              Plan / Book in CRM
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="lp-dest-modal-nav-row">
            <button className="lp-dest-modal-nav-btn" onClick={onSelectPrev}>
              ← Previous Destination
            </button>
            <span className="lp-dest-modal-nav-counter">{dest.id} / {destinations.length}</span>
            <button className="lp-dest-modal-nav-btn" onClick={onSelectNext}>
              Next Destination →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Login Modal ─────────────────────────────────────────────────────────────
function LoginModal({ isOpen, onClose, navigate }) {
  const [step, setStep] = useState('choose');

  const handleClose = () => {
    setStep('choose');
    onClose();
  };

  const handleAdminLogin = () => {
    handleClose();
    navigate('/login');
  };

  if (!isOpen) return null;

  return (
    <div
      className="lp-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="lp-modal-container">
        <button className="lp-modal-close" onClick={handleClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {step === 'choose' && (
          <div className="lp-modal-content-wrap">
            {/* Attractive Branded Header Banner covering top empty space */}
            <div className="lp-modal-header-banner">
              <div className="lp-modal-banner-bg">
                <img src={topbarImg} alt="" className="lp-modal-banner-img" />
                <div className="lp-modal-banner-overlay" />
              </div>

              <div className="lp-modal-banner-inner">
                <div className="lp-modal-top-row">
                  <div className="lp-modal-logo-badge">
                    <img src={logoTransparent} alt="BuildSoftware" className="lp-modal-logo" />
                    <div className="lp-modal-logo-titles">
                      <span className="lp-modal-brand-name">BuildSoftware</span>
                      <span className="lp-modal-brand-tag">DMC PORTAL</span>
                    </div>
                  </div>
                  <div className="lp-modal-access-pill">
                    <span className="lp-modal-access-dot" />
                    <span>Authorized Operations</span>
                  </div>
                </div>

                <div className="lp-modal-title-block">
                  <span className="lp-modal-eyebrow">🇹🇭 OFFICIAL B2B OPERATIONS ACCESS</span>
                  <h2 className="lp-modal-title">Welcome to BuildSoftware Portal</h2>
                  <p className="lp-modal-subtitle">
                    Select your authorized login portal below to access CRM itineraries, live quotations, and ground operations.
                  </p>
                </div>

                <div className="lp-modal-trust-pills">
                  <div className="lp-modal-trust-pill">
                    <span>🔒 256-Bit SSL Encrypted</span>
                  </div>
                  <div className="lp-modal-trust-pill">
                    <span>⚡ Real-Time CRM Engine</span>
                  </div>
                  <div className="lp-modal-trust-pill">
                    <span>🛡️ TAT License 11/08942</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Portal Cards */}
            <div className="lp-modal-cards-wrap">
              <div className="lp-login-cards">
                <button className="lp-login-card lp-login-card--admin" onClick={handleAdminLogin}>
                  <div className="lp-login-card-bg-image">
                    <img src={loginHeroImage} alt="" />
                    <div className="lp-login-card-bg-gradient" />
                  </div>
                  <div className="lp-login-card-body">
                    <div className="lp-login-card-icon-wrap">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 2a5 5 0 100 10A5 5 0 0012 2z" />
                        <path d="M21 21a9 9 0 10-18 0" />
                      </svg>
                    </div>
                    <span className="lp-login-card-title">Admin Login</span>
                    <span className="lp-login-card-desc">CRM Dashboard &amp; Management</span>
                    <div className="lp-login-card-cta">
                      Access Portal
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>

                <button className="lp-login-card lp-login-card--agent" onClick={() => setStep('agent-soon')}>
                  <div className="lp-login-card-bg-image">
                    <img src={phiphiImg} alt="" />
                    <div className="lp-login-card-bg-gradient lp-login-card-bg-gradient--blue" />
                  </div>
                  <div className="lp-login-card-body">
                    <div className="lp-login-card-icon-wrap lp-login-card-icon-wrap--blue">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                      </svg>
                    </div>
                    <span className="lp-login-card-title">Agent Login</span>
                    <span className="lp-login-card-desc">Partner &amp; Agent Portal</span>
                    <div className="lp-login-card-cta lp-login-card-cta--blue">
                      Agent Access
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'agent-soon' && (
          <div className="lp-modal-inner lp-coming-soon-inner">
            <div className="lp-coming-soon-emoji">🚀</div>
            <h2 className="lp-coming-soon-title">Coming Soon!</h2>
            <p className="lp-coming-soon-text">
              The Agent Portal is currently under development.<br />
              We are building something amazing for our partners.
            </p>
            <div className="lp-coming-soon-badge">Launching 2026</div>
            <button className="lp-coming-soon-back" onClick={() => setStep('choose')}>
              ← Back to Login Options
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Destinations Section (Clickable Cards with Modal) ─────────────────────────
function DestinationsSection({ onSelectDestination }) {
  return (
    <section id="destinations" className="lp-section">
      <div className="lp-section-wrap">
        <div className="lp-section-header">
          <span className="lp-eyebrow">Best Places to Visit</span>
          <h2 className="lp-section-title">Thailand's Iconic Destinations</h2>
          <p className="lp-section-desc">
            From ancient temples to pristine beaches — click any destination to view signature highlights, best travel seasons, and bespoke tour packages.
          </p>
        </div>

        <div className="lp-dest-grid">
          {destinations.map((dest) => (
            <div
              key={dest.id}
              className="lp-dest-card lp-dest-card--clickable"
              onClick={() => onSelectDestination(dest)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectDestination(dest)}
            >
              <div className="lp-dest-img-wrap">
                <img src={dest.image} alt={dest.name} className="lp-dest-img" loading="lazy" />
                <div className="lp-dest-img-overlay" />
                <div className="lp-dest-pin">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                  </svg>
                  {dest.highlight}
                </div>
                <div className="lp-dest-click-badge">Click to Explore</div>
              </div>

              <div className="lp-dest-body">
                <div className="lp-dest-row1">
                  <div>
                    <h3 className="lp-dest-name">{dest.name}</h3>
                    <p className="lp-dest-tagline">{dest.tagline}</p>
                  </div>
                  <div className="lp-dest-arrow" title="View details">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                <p className="lp-dest-desc">{dest.description}</p>

                <div className="lp-dest-footer">
                  <span className="lp-dest-chip">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    {dest.duration}
                  </span>
                  <span className="lp-dest-chip">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Best: {dest.best}
                  </span>
                  <span className="lp-dest-chip lp-dest-chip--temp">
                    🌡️ {dest.temp}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Services Section ─────────────────────────────────────────────────────────
function ServicesSection() {
  return (
    <section id="services" className="lp-section lp-services-bg">
      <div className="lp-section-wrap">
        <div className="lp-section-header">
          <span className="lp-eyebrow lp-eyebrow--light">What We Offer</span>
          <h2 className="lp-section-title">Complete Thailand Travel Solutions</h2>
          <p className="lp-section-desc">
            From the moment you land to the moment you depart — BuildSoftware handles every detail of your perfect Thailand experience.
          </p>
        </div>

        <div className="lp-services-grid">
          {services.map((svc, i) => (
            <div key={i} className="lp-svc-card">
              <div className="lp-svc-icon">{serviceIcons[svc.icon]}</div>
              <h3 className="lp-svc-title">{svc.title}</h3>
              <p className="lp-svc-desc">{svc.desc}</p>
              <div className="lp-svc-line" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Section ──────────────────────────────────────────────────────────────
function CTASection({ onContactClick }) {
  return (
    <section id="about" className="lp-cta-section">
      <div className="lp-cta-overlay" />
      <div className="lp-cta-wrap">
        <span className="lp-cta-eyebrow">For Travel Professionals</span>
        <h2 className="lp-cta-title">Ready to Power Your<br />Thailand Operations?</h2>
        <p className="lp-cta-desc">
          Join hundreds of travel agents and operators who trust BuildSoftware CRM to manage bookings, quotations, and operations all in one place.
        </p>
        <button className="lp-cta-btn" onClick={onContactClick}>
          Contact Us
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
}

// ─── Footer (Modern, Compact, White Background UI - No border, No shadow) ────
function Footer({ onOpenDestination }) {
  const navigate = useNavigate();

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer id="footer-contact" className="lp-footer">
      <div className="lp-footer-top">
        <div className="lp-footer-brand">
          {/* Logo on white background - Zero border, Zero shadow */}
          <div className="lp-footer-logo-badge">
            <img src={logoWhite} alt="BuildSoftware" className="lp-footer-logo" />
          </div>
          <div className="lp-footer-brand-body">
            <p className="lp-footer-tagline">
              Thailand's Premier Destination Management Company — crafting bespoke itineraries and unforgettable luxury journeys since 2009.
            </p>
            <div className="lp-footer-follow">Follow us</div>
            <div className="lp-footer-socials">
              {[
                { brand: 'fb', name: 'Facebook', icon: <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" fill="currentColor" /> },
                { brand: 'ig', name: 'Instagram', icon: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" /></> },
                { brand: 'in', name: 'LinkedIn', icon: <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11.25H3V9.75zm6.5 0h3.83v1.54h.05c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.67 4.8 6.13V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.69V21h-4V9.75z" fill="currentColor" /> },
                { brand: 'wa', name: 'WhatsApp', icon: <path d="M20.5 3.5A11.8 11.8 0 0 0 12 0C5.4 0 .1 5.3.1 11.9c0 2.1.55 4.1 1.6 5.9L0 24l6.4-1.7a11.9 11.9 0 0 0 5.6 1.4c6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.4-8.3zM12 21.7a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4A9.8 9.8 0 1 1 12 21.7zm5.4-7.3c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z" fill="currentColor" /> },
              ].map((s) => (
                <button
                  key={s.brand}
                  type="button"
                  className={`lp-footer-social lp-footer-social--${s.brand}`}
                  title={s.name}
                  aria-label={s.name}
                  onClick={() => toast(`${s.name} channel opens soon!`)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">{s.icon}</svg>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lp-footer-col">
          <h4 className="lp-footer-col-title">Destinations</h4>
          <ul>
            {destinations.map((d) => (
              <li key={d.id}>
                <button
                  className="lp-footer-link-btn"
                  onClick={() => onOpenDestination(d)}
                >
                  {d.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-footer-col">
          <h4 className="lp-footer-col-title">Services</h4>
          <ul>
            {services.map((s, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  className="lp-footer-link-btn"
                  onClick={() => scrollTo('services')}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-footer-col">
          <h4 className="lp-footer-col-title">Contact &amp; Operations</h4>
          <ul className="lp-footer-contact">
            <li><span><strong>Mr. Ronnie Soni</strong> · B2B Operations</span></li>
            <li>
              <div className="lp-footer-contact-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.65A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14v2.92z" />
                </svg>
              </div>
              <a href="tel:+66949831312">+66 949831312</a>
            </li>
            <li>
              <div className="lp-footer-contact-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <a href="mailto:b2b@buildsoftware.in">b2b@buildsoftware.in</a>
            </li>
            <li>
              <div className="lp-footer-contact-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <span>64/103 Soi 3/5, Thepprasit Road, Moo 12, Nongprue, Bang Lamung, Pattaya, Chonburi 20150</span>
            </li>
            <li style={{ marginTop: '4px' }}>
              <button
                type="button"
                className="lp-footer-link-btn"
                style={{ color: 'var(--lp-primary)', fontWeight: '700' }}
                onClick={() => navigate('/contact')}
              >
                Open B2B Contact Desk →
              </button>
            </li>
          </ul>

          <div className="lp-footer-dmc-badge">
            <span className="lp-footer-dmc-dot" />
            <span>Licensed Thai DMC · TAT Registered</span>
          </div>
        </div>
      </div>

      <div className="lp-footer-bottom">
        <div className="lp-footer-bottom-left">
          <p className="lp-footer-copyright">
            © {new Date().getFullYear()} BuildSoftware. All rights reserved.
          </p>
        </div>
        <div className="lp-footer-bottom-links">
          <button type="button" className="lp-footer-legal-btn" onClick={() => toast('Privacy Policy details coming soon!')}>Privacy Policy</button>
          <span className="lp-footer-sep">•</span>
          <button type="button" className="lp-footer-legal-btn" onClick={() => toast('Terms of Service details coming soon!')}>Terms of Service</button>
          <span className="lp-footer-sep">•</span>
          <button type="button" className="lp-footer-legal-btn" onClick={() => toast('Cookie Policy details coming soon!')}>Cookie Policy</button>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page Component ──────────────────────────────────────────────
export default function LandingPage() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [activeDestination, setActiveDestination] = useState(null);
  const [activeTourStep, setActiveTourStep] = useState(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const goPortal = () => navigate(isAuthenticated ? '/app/dashboard' : '/login');

  useEffect(() => {
    // Clean up any lingering hash from previous visits
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    // Check if redirected with ?scroll=sectionName
    const params = new URLSearchParams(window.location.search);
    const scrollTarget = params.get('scroll');
    if (scrollTarget === 'tour') {
      setTimeout(() => setActiveTourStep(0), 150);
      window.history.replaceState(null, '', window.location.pathname);
    } else if (scrollTarget) {
      setTimeout(() => {
        const el = document.getElementById(scrollTarget);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 120);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleSelectNextDest = () => {
    if (!activeDestination) return;
    const currentIndex = destinations.findIndex((d) => d.id === activeDestination.id);
    const nextIndex = (currentIndex + 1) % destinations.length;
    setActiveDestination(destinations[nextIndex]);
  };

  const handleSelectPrevDest = () => {
    if (!activeDestination) return;
    const currentIndex = destinations.findIndex((d) => d.id === activeDestination.id);
    const prevIndex = (currentIndex - 1 + destinations.length) % destinations.length;
    setActiveDestination(destinations[prevIndex]);
  };

  return (
    <div className="lp-root">
      <Header onLoginClick={goPortal} isAuthenticated={isAuthenticated} />
      <RefHero
        isAuthenticated={isAuthenticated}
        onLoginClick={goPortal}
        onTakeTour={() => setActiveTourStep(0)}
      />
      <RefDestinations
        destinations={destinations}
        onSelectDestination={(dest) => setActiveDestination(dest)}
      />
      <RefExperiences
        destinations={destinations}
        onSelectDestination={(dest) => setActiveDestination(dest)}
        onContact={() => navigate('/contact')}
      />
      <RefSolutions onContact={() => navigate('/contact')} />
      <RefPartner
        onPartner={() => navigate('/contact')}
        onWatchVideo={() => setVideoModalOpen(true)}
      />
      <RefTestimonials />
      <Footer onOpenDestination={(dest) => setActiveDestination(dest)} />

      {/* Login Selection Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        navigate={navigate}
      />

      {/* Interactive Destination Details Modal */}
      <DestinationModal
        dest={activeDestination}
        onClose={() => setActiveDestination(null)}
        onSelectNext={handleSelectNextDest}
        onSelectPrev={handleSelectPrevDest}
        onOpenLogin={goPortal}
      />

      {/* Guided Tour Modal */}
      <TourModal
        stepIndex={activeTourStep}
        onClose={() => setActiveTourStep(null)}
        onNext={() => setActiveTourStep((prev) => (prev !== null && prev < tourSteps.length - 1 ? prev + 1 : prev))}
        onPrev={() => setActiveTourStep((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
        onOpenLogin={() => navigate('/contact')}
      />

      {/* 1-Minute Guided Video Modal */}
      <VideoModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        onOpenLogin={() => navigate('/contact')}
      />
    </div>
  );
}
