import React from 'react';
import {
  Award,
  Users,
  Package,
  ThumbsUp,
  Headphones,
  Briefcase,
  ArrowRight,
  Play,
  Star,
  Hotel,
  Car,
  Landmark,
  Ship,
  Home,
  Gift,
  BadgePercent,
  ShieldCheck,
  UserCheck,
  Clock3,
  Quote,
} from 'lucide-react';
import './LandingRef.css';
import heroImg from '../../assets/thailand_phiphi.jpg';
import bangkokImg from '../../assets/thailand_bangkok.jpg';
import phiphiImg from '../../assets/thailand_phiphi.jpg';
import phuketImg from '../../assets/thailand_phuket.jpg';
import krabiImg from '../../assets/thailand_krabi.jpg';
import chiangmaiImg from '../../assets/thailand_chiangmai.jpg';
import kohsamuiImg from '../../assets/thailand_kohsamui.jpg';
import hotelImg from '../../assets/tour_hotel.jpg';
import transferImg from '../../assets/tour_transfers.jpg';
import packageImg from '../../assets/PortrateCreative.png';
import partnerImg from '../../assets/tour_partner.jpg';
import panoramaImg from '../../assets/Topbar1.png';

// ─── Content (taken from the reference design) ───────────────────────────────
const heroStats = [
  { icon: Award, value: '15+', label: 'Years Experience' },
  { icon: Users, value: '50,000+', label: 'Happy Travelers' },
  { icon: Package, value: '200+', label: 'Tour Packages' },
  { icon: ThumbsUp, value: '98%', label: 'Satisfaction' },
  { icon: Headphones, value: '24/7', label: 'Local Support' },
  { icon: Briefcase, value: 'B2B', label: 'Trade Partner Focused' },
];

// name → destination in the data list (for the detail modal), plus card copy
const topDestinations = [
  { match: 'Bangkok', title: 'Bangkok', sub: 'City of Angels', img: bangkokImg },
  { match: 'Phi Phi Islands', title: 'Phi Phi Islands', sub: 'Paradise Found', img: phiphiImg },
  { match: 'Phuket', title: 'Phuket', sub: 'Island Paradise', img: phuketImg },
  { match: 'Krabi', title: 'Krabi', sub: "Nature's Playground", img: krabiImg },
  { match: 'Chiang Mai', title: 'Chiang Mai', sub: 'Culture & Nature', img: chiangmaiImg },
];

const solutions = [
  { icon: Hotel, title: 'Hotels', desc: 'Handpicked stays', img: hotelImg },
  { icon: Car, title: 'Transfers', desc: 'Private & comfortable', img: transferImg },
  { icon: Landmark, title: 'Sightseeing', desc: 'Tours & experiences', img: chiangmaiImg },
  { icon: Ship, title: 'Yacht & Cruises', desc: 'Island hopping', img: phiphiImg },
  { icon: Home, title: 'Villas', desc: 'Private luxury', img: kohsamuiImg },
  { icon: Gift, title: 'Readymade Packages', desc: 'Curated itineraries', img: packageImg },
];

const partnerPerks = [
  { icon: BadgePercent, label: 'Best B2B Rates' },
  { icon: ShieldCheck, label: 'Reliable Partner' },
  { icon: UserCheck, label: 'Dedicated Team' },
  { icon: Clock3, label: '24/7 Support' },
];

const testimonials = [
  {
    quote: 'Excellent service, best rates and always supportive team. Our go-to DMC for Thailand!',
    name: 'Rajesh Mehta',
    role: 'Travel Partner – India',
  },
  {
    quote: 'Professional, reliable and quick response. Highly recommended for B2B agents.',
    name: 'Priya Shah',
    role: 'Travel Partner – India',
  },
  {
    quote: 'Great selection of hotels and activities. Smooth bookings and excellent support 24/7.',
    name: 'Amit Desai',
    role: 'Travel Partner – India',
  },
];

const goTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

// ─── Hero + stats strip ──────────────────────────────────────────────────────
export function RefHero({ onLoginClick, onTakeTour, isAuthenticated }) {
  return (
    <section id="top" className="lr-hero">
      <div className="lr-hero-stage">
      <div className="lr-hero-bg" style={{ backgroundImage: `url(${heroImg})` }} />
      <div className="lr-hero-shade" />

      <div className="lr-hero-inner">
        <div className="lr-hero-copy">
          <span className="lr-hero-badge">
            <span className="lr-hero-badge-dot" />
            Thailand&apos;s #1 Destination Management Company
          </span>

          <h1 className="lr-hero-title">
            Discover the
            <span className="lr-hero-title-accent">Magic of Thailand</span>
          </h1>

          <p className="lr-hero-sub">
            Your trusted B2B partner for seamless travel experiences across Thailand. Premium services, expert local
            support and unforgettable journeys for your clients.
          </p>

          <div className="lr-hero-actions">
            <button type="button" className="lr-btn lr-btn--primary" onClick={onLoginClick}>
              {isAuthenticated ? 'Go to Dashboard' : 'Login to B2B Portal'}
              <ArrowRight size={16} strokeWidth={2.6} />
            </button>
            <button type="button" className="lr-btn lr-btn--ghost" onClick={onTakeTour}>
              <Play size={14} fill="currentColor" strokeWidth={0} />
              Take the Tour
            </button>
          </div>
        </div>

        <span className="lr-hero-script" aria-hidden="true">Thailand</span>
      </div>
      </div>

      <div className="lr-stats-wrap">
        <div className="lr-stats">
          {heroStats.map((s) => (
            <div key={s.label} className="lr-stat">
              <span className="lr-stat-icon"><s.icon size={22} strokeWidth={1.9} /></span>
              <span className="lr-stat-text">
                <strong>{s.value}</strong>
                <small>{s.label}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Top destinations ────────────────────────────────────────────────────────
export function RefDestinations({ destinations, onSelectDestination }) {
  return (
    <section id="destinations" className="lr-section">
      <div className="lr-wrap">
        <div className="lr-head">
          <h2 className="lr-title">
            Explore Our <span>Top Destinations</span>
          </h2>
          <button type="button" className="lr-link" onClick={() => destinations[0] && onSelectDestination(destinations[0])}>
            View All Destinations <ArrowRight size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="lr-dest-grid">
          {topDestinations.map((d) => {
            const dest = destinations.find((x) => x.name === d.match);
            return (
              <button
                type="button"
                key={d.title}
                className="lr-dest-card"
                onClick={() => dest && onSelectDestination(dest)}
              >
                <img src={d.img} alt={d.title} loading="lazy" />
                <span className="lr-dest-shade" />
                <span className="lr-dest-label">
                  <strong>{d.title}</strong>
                  <small>{d.sub}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Signature experiences ───────────────────────────────────────────────────
const experiences = [
  {
    tag: 'Sea & Islands',
    title: 'Island Hopping & Cruises',
    desc: 'Longtail and speedboat days across Phi Phi and Phang Nga, with lagoons, beaches and sunset sails.',
    img: phiphiImg,
    dest: 'Phi Phi Islands',
  },
  {
    tag: 'Culture',
    title: 'Temples & City Heritage',
    desc: 'The Grand Palace, Wat Arun at sunset and river dinner cruises in the City of Angels.',
    img: bangkokImg,
    dest: 'Bangkok',
  },
  {
    tag: 'Luxury Stays',
    title: 'Beach & Pool Villas',
    desc: 'Infinity pools, private villas and cliffside resorts on Phuket’s best bays.',
    img: phuketImg,
    dest: 'Phuket',
  },
  {
    tag: 'Romance',
    title: 'Overwater Escapes',
    desc: 'Sunrise decks, lagoon views and slow island days in Koh Samui, made for honeymooners.',
    img: kohsamuiImg,
    dest: 'Koh Samui',
  },
  {
    tag: 'Adventure',
    title: 'Nature & Adventure',
    desc: 'Limestone cliffs, kayaking and hidden beaches along the Krabi coast.',
    img: krabiImg,
    dest: 'Krabi',
  },
  {
    tag: 'Festivals',
    title: 'Lantern Nights & Old Town',
    desc: 'Golden temples, hill-top views and lantern-lit evenings around Chiang Mai.',
    img: chiangmaiImg,
    dest: 'Chiang Mai',
  },
];

export function RefExperiences({ destinations, onSelectDestination, onContact }) {
  return (
    <section id="experiences" className="lr-section">
      <div className="lr-wrap">
        <div className="lr-head">
          <h2 className="lr-title">
            Unforgettable <span>Thailand Experiences</span>
          </h2>
          <button type="button" className="lr-link" onClick={onContact}>
            Plan a Custom Trip <ArrowRight size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="lr-exp-grid">
          {experiences.map((e, i) => {
            const dest = destinations.find((d) => d.name === e.dest);
            return (
              <button
                type="button"
                key={e.title}
                className={`lr-exp-card ${i === 0 ? 'lr-exp-card--feature' : ''}`}
                onClick={() => (dest ? onSelectDestination(dest) : onContact())}
              >
                <img src={e.img} alt={e.title} loading="lazy" />
                <span className="lr-exp-shade" />
                <span className="lr-exp-tag">{e.tag}</span>
                <span className="lr-exp-body">
                  <strong>{e.title}</strong>
                  <small>{e.desc}</small>
                  <span className="lr-exp-cta">
                    Explore {e.dest} <ArrowRight size={14} strokeWidth={2.6} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Complete travel solutions ───────────────────────────────────────────────
export function RefSolutions({ onContact }) {
  return (
    <section id="services" className="lr-section lr-section--tint">
      <div className="lr-wrap">
        <div className="lr-head">
          <h2 className="lr-title">
            Our Services <span>Complete Travel Solutions</span>
          </h2>
          <button type="button" className="lr-link" onClick={onContact}>
            View All Services <ArrowRight size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="lr-sol-grid">
          {solutions.map((s) => (
            <button type="button" key={s.title} className="lr-sol-card" onClick={onContact}>
              <span className="lr-sol-img">
                <img src={s.img} alt={s.title} loading="lazy" />
              </span>
              <span className="lr-sol-body">
                <span className="lr-sol-icon"><s.icon size={18} strokeWidth={2} /></span>
                <span className="lr-sol-text">
                  <strong>{s.title}</strong>
                  <small>{s.desc}</small>
                </span>
                <ArrowRight size={16} strokeWidth={2.4} className="lr-sol-arrow" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Success partner banner ──────────────────────────────────────────────────
export function RefPartner({ onPartner, onWatchVideo }) {
  return (
    <section id="about" className="lr-section lr-section--flush">
      <div className="lr-wrap">
        <div className="lr-partner" style={{ backgroundImage: `url(${panoramaImg})` }}>
          <div className="lr-partner-shade" />

          <div className="lr-partner-copy">
            <h2>
              Your Success Partner
              <span>in Thailand</span>
            </h2>

            <ul className="lr-perks">
              {partnerPerks.map((p) => (
                <li key={p.label}>
                  <span className="lr-perk-icon"><p.icon size={18} strokeWidth={2} /></span>
                  {p.label}
                </li>
              ))}
            </ul>

            <button type="button" className="lr-btn lr-btn--primary" onClick={onPartner}>
              Partner With Us
              <ArrowRight size={16} strokeWidth={2.6} />
            </button>
          </div>

          <button type="button" className="lr-video" onClick={onWatchVideo} aria-label="Watch our video">
            <img src={partnerImg} alt="" />
            <span className="lr-video-shade" />
            <span className="lr-video-play"><Play size={20} fill="currentColor" strokeWidth={0} /></span>
            <span className="lr-video-label">Watch Our Video</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ────────────────────────────────────────────────────────────
export function RefTestimonials() {
  return (
    <section id="reviews" className="lr-section">
      <div className="lr-wrap">
        <div className="lr-head lr-head--center">
          <h2 className="lr-title">
            What Our <span>Partners Say</span>
          </h2>
        </div>

        <div className="lr-reviews">
          {testimonials.map((t) => (
            <figure key={t.name} className="lr-review">
              <Quote size={26} strokeWidth={1.6} className="lr-review-quote" />
              <div className="lr-stars" aria-label="5 out of 5 stars">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={15} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <blockquote>{t.quote}</blockquote>
              <figcaption>
                <span className="lr-avatar">{t.name.charAt(0)}</span>
                <span>
                  <strong>{t.name}</strong>
                  <small>{t.role}</small>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export { goTo };
