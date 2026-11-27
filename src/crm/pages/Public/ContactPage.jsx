import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import DateInput from '../../components/ui/DateInput';
import './ContactPage.css';
import './LandingPage.css';
import './LandingRef.css';

import logoWhite from '../../assets/logo-color.png';
import logoTransparent from '../../assets/icon-color.png';
import loginHeroImage from '../../assets/Loignimage.png';
import phiphiImg from '../../assets/thailand_phiphi.jpg';
import bangkokImg from '../../assets/thailand_bangkok.jpg';
import phuketImg from '../../assets/thailand_phuket.jpg';
import chiangmaiImg from '../../assets/thailand_chiangmai.jpg';
import topbarImg from '../../assets/Topbar1.png';

// ─── FAQ Data for B2B Partners ────────────────────────────────────────────────
const faqs = [
  {
    q: 'How fast will my custom B2B tour quotation be sent?',
    a: 'FIT quotations for standard destinations (Bangkok, Pattaya, Phuket, Krabi, Samui) are generated and delivered within 2 hours during Thai business hours (08:30 – 19:30 ICT). Multi-city or complex MICE proposals are delivered within 24 hours with complete itemized net pricing.',
  },
  {
    q: 'Do you provide white-label client vouchers and airport placards?',
    a: 'Yes, 100%! All client documents, day-by-day travel itineraries, service vouchers, and airport welcome signboards are customized with your travel agency brand name and logo with zero TripNest public branding visible to your travelers.',
  },
  {
    q: 'How does airport arrival pickup work for our clients in Thailand?',
    a: 'Our uniformed airport representatives monitor incoming flights in real-time. Clients are met at designated airport gates (Gate 3/4 at Suvarnabhumi BKK, Gate 2 at Don Mueang DMK, Exit 1 at Phuket HKT) with your agency name signboard. Our representative assists with luggage and introduces them to their private licensed driver.',
  },
  {
    q: 'What payment terms and currencies do you support for overseas agents?',
    a: 'We accept payments in USD, EUR, GBP, AUD, SGD, THB, and INR. Registered B2B partners can settle via international wire transfer, local Thai bank transfer, or instant credit card payment links with transparent conversion rates.',
  },
  {
    q: 'What 24/7 on-tour emergency assistance is available for guests?',
    a: 'We maintain an active 24/7 operations room with dedicated multilingual dispatch managers stationed in Bangkok and Phuket. In the event of flight delays, medical assistance, or itinerary adjustments, our duty managers resolve requests on live WhatsApp within minutes.',
  },
];

// ─── Office Hubs in Thailand ──────────────────────────────────────────────────
const officeHubs = [
  {
    id: 'bkk',
    city: 'Bangkok Command Hub',
    role: 'Central Operations & Contracting',
    address: '142 Silom Road, Suriyawong, Bang Rak, Bangkok 10500',
    airport: 'Suvarnabhumi (BKK) Gate 4 & Don Mueang (DMK) Gate 2',
    phone: '+66 2 123 4567',
    email: 'ops@tripnest.com',
    image: bangkokImg,
    status: '● Live 24/7 Dispatch',
    specialties: ['VIP Limousine Fleet', 'Chao Phraya River Charters', 'Luxury Hotel Contracting'],
  },
  {
    id: 'hkt',
    city: 'Phuket Southern Base',
    role: 'Island & Marine Operations',
    address: '48/12 Chao Fah West Road, Chalong, Mueang Phuket 83000',
    airport: 'Phuket International Airport (HKT) Ground Counter',
    phone: '+66 76 987 654',
    email: 'phuket@tripnest.com',
    image: phuketImg,
    status: '● Live Pier Logistics',
    specialties: ['Private Speedboat Fleet', 'Phi Phi & Phang Nga Charters', 'Krabi VIP Transfers'],
  },
  {
    id: 'cnx',
    city: 'Chiang Mai Northern Hub',
    role: 'Cultural & Expedition Logistics',
    address: '88 Nimmanahaeminda Road, Suthep, Mueang Chiang Mai 50200',
    airport: 'Chiang Mai International Airport (CNX)',
    phone: '+66 53 456 789',
    email: 'chiangmai@tripnest.com',
    image: chiangmaiImg,
    status: '● Active Tour Coordination',
    specialties: ['Ethical Elephant Sanctuaries', 'Golden Triangle Expeditions', 'Lanna Heritage Guides'],
  },
];

// ─── Login Modal Component ────────────────────────────────────────────────────
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
                    <img src={logoTransparent} alt="TripNest" className="lp-modal-logo" />
                    <div className="lp-modal-logo-titles">
                      <span className="lp-modal-brand-name">TripNest</span>
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
                  <h2 className="lp-modal-title">Welcome to TripNest Portal</h2>
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

// ─── Main Contact Page Component ──────────────────────────────────────────────
export default function ContactPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);

  // Form State
  const [category, setCategory] = useState('hotels');
  const [formData, setFormData] = useState({
    agencyName: '',
    agentName: '',
    email: '',
    phone: '',
    destinations: ['Bangkok', 'Phuket'],
    pax: '2',
    travelDate: '',
    hotelTier: '5star',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDestToggle = (dest) => {
    setFormData((prev) => {
      const exists = prev.destinations.includes(dest);
      if (exists) {
        if (prev.destinations.length === 1) return prev; // keep at least 1
        return { ...prev, destinations: prev.destinations.filter((d) => d !== dest) };
      }
      return { ...prev, destinations: [...prev.destinations, dest] };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.agentName || !formData.email) {
      toast.error('Please enter your name and email address.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const refCode = `TA-B2B-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedRef(refCode);
      toast.success('Inquiry submitted! Our Bangkok desk will reply in under 2 hours.');
    }, 1100);
  };

  const handleResetForm = () => {
    setSubmittedRef(null);
    setFormData({
      agencyName: '',
      agentName: '',
      email: '',
      phone: '',
      destinations: ['Bangkok', 'Phuket'],
      pax: '2',
      travelDate: '',
      hotelTier: '5star',
      message: '',
    });
  };

  const navigateToSection = (sectionId) => {
    setMenuOpen(false);
    navigate(`/?scroll=${sectionId}`);
  };

  return (
    <div className="cp-root">
      {/* ── Shared Header (No # in routes) ── */}
      <header className={`lp-header ${scrolled ? 'lp-header--scrolled' : ''}`}>
        <div className="lp-header-inner">
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/')}
            className="lp-header-logo"
            style={{ cursor: 'pointer' }}
          >
            <div className="lp-header-logo-badge">
              <img src={logoWhite} alt="TripNest" className="lp-header-logo-img" />
            </div>
          </div>

          <nav className="lp-nav">
            <button type="button" onClick={() => navigate('/')} className="lp-nav-link">Home</button>
            <button type="button" onClick={() => navigateToSection('destinations')} className="lp-nav-link">Destinations</button>
            <button type="button" onClick={() => navigateToSection('experiences')} className="lp-nav-link">Experiences</button>
            <button type="button" onClick={() => navigateToSection('services')} className="lp-nav-link">Services</button>
            <button type="button" onClick={() => navigateToSection('about')} className="lp-nav-link">About Us</button>
            <button type="button" onClick={() => navigate('/contact')} className="lp-nav-link lp-nav-link--active">Help</button>
            <span className="lp-lang-chip" aria-label="Language">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" /></svg>
              English
            </span>
          </nav>

          <button id="header-login-btn" className="lp-header-login-btn" onClick={() => navigate(isAuthenticated ? '/app/dashboard' : '/login')}>
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
            <button type="button" className="lp-mobile-menu-item" onClick={() => { setMenuOpen(false); navigate('/'); }}>Home</button>
            <button type="button" className="lp-mobile-menu-item" onClick={() => navigateToSection('destinations')}>Destinations</button>
            <button type="button" className="lp-mobile-menu-item" onClick={() => navigateToSection('experiences')}>Experiences</button>
            <button type="button" className="lp-mobile-menu-item" onClick={() => navigateToSection('services')}>Services</button>
            <button type="button" className="lp-mobile-menu-item" onClick={() => navigateToSection('about')}>About Us</button>
            <button type="button" className="lp-mobile-menu-item lp-mobile-menu-item--active" onClick={() => setMenuOpen(false)}>Help</button>
            <button className="lp-mobile-menu-login" onClick={() => { setMenuOpen(false); navigate(isAuthenticated ? '/app/dashboard' : '/login'); }}>{isAuthenticated ? 'Dashboard' : 'Login Portal'}</button>
          </div>
        )}
      </header>

      {/* ── Hero Section ── */}
      <section className="cp-hero">
        <div className="cp-hero-glow" />
        <div className="cp-hero-wrap">
          <div className="cp-eyebrow">
            <span>🇹🇭 Dedicated Inbound Ground Support</span>
          </div>
          <h1 className="cp-hero-title">
            Contact TripNest Operations
          </h1>
          <p className="cp-hero-subtitle">
            Direct communication with our Bangkok &amp; Phuket ground operations desks. Instant B2B tour quotations, VIP airport transfers, group logistics, and 24/7 client dispatch across Thailand.
          </p>

          {/* 4 Trust Feature Cards */}
          <div className="cp-trust-grid">
            <div className="cp-trust-card">
              <div className="cp-trust-icon">⚡</div>
              <div className="cp-trust-info">
                <strong>&lt; 2-Hour Turnaround</strong>
                <span>Instant B2B Net Quotations</span>
              </div>
            </div>
            <div className="cp-trust-card">
              <div className="cp-trust-icon">🛡️</div>
              <div className="cp-trust-info">
                <strong>TAT License No. 11/08942</strong>
                <span>Official Inbound DMC Operator</span>
              </div>
            </div>
            <div className="cp-trust-card">
              <div className="cp-trust-icon">📱</div>
              <div className="cp-trust-info">
                <strong>24/7 Live WhatsApp</strong>
                <span>Duty Operations Dispatch</span>
              </div>
            </div>
            <div className="cp-trust-card">
              <div className="cp-trust-icon">🤝</div>
              <div className="cp-trust-info">
                <strong>White-Label Vouchers</strong>
                <span>Branded with Your Logo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Two-Column Workdesk ── */}
      <section className="cp-section">
        <div className="cp-wrap">
          <div className="cp-desk-grid">
            {/* Left Column: Interactive Form */}
            <div className="cp-form-card">
              <div className="cp-form-header">
                <div className="cp-form-badge">B2B Partner Desk</div>
                <h2 className="cp-form-title">Send Inquiry or Request Quotation</h2>
                <p className="cp-form-desc">
                  Fill in your itinerary or partnership details below. Our reservations team will respond with complete itemized net pricing.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="cp-cat-tabs">
                {[
                  { id: 'hotels', label: '🏨 Hotels' },
                  { id: 'transfers', label: '🚐 Transfers' },
                  { id: 'sightseeing', label: '🗺️ Sightseeing' },
                  { id: 'yacht', label: '🛥️ Yacht & Cruises' },
                  { id: 'villas', label: '🏡 Villas' },
                  { id: 'packages', label: '🎁 Readymade Packages' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`cp-cat-btn ${category === tab.id ? 'cp-cat-btn--active' : ''}`}
                    onClick={() => setCategory(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {submittedRef ? (
                <div className="cp-success-card">
                  <div className="cp-success-icon">✓</div>
                  <h3 className="cp-success-title">Inquiry Successfully Received!</h3>
                  <p className="cp-success-text">
                    Your request has been logged into our Bangkok DMC reservations dispatch. A destination coordinator has been assigned to your request.
                  </p>
                  <div className="cp-success-ref-box">
                    <span className="cp-success-ref-lbl">Inquiry Reference Code</span>
                    <strong className="cp-success-ref-code">{submittedRef}</strong>
                  </div>
                  <div className="cp-success-actions">
                    <a
                      href={`https://wa.me/66828901234?text=Hello%20Thai%20Arrival%2C%20following%20up%20on%20my%20inquiry%20${submittedRef}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cp-success-wa-btn"
                    >
                      <span>💬 Expedite on WhatsApp</span>
                    </a>
                    <button type="button" className="cp-success-reset-btn" onClick={handleResetForm}>
                      Submit Another Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form className="cp-form" onSubmit={handleSubmit}>
                  <div className="cp-form-row">
                    <div className="cp-field">
                      <label className="cp-label">Travel Agency / Company Name</label>
                      <input
                        type="text"
                        className="cp-input"
                        placeholder="e.g. Wanderlust Travel Global"
                        value={formData.agencyName}
                        onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                      />
                    </div>
                    <div className="cp-field">
                      <label className="cp-label">Contact Person Name *</label>
                      <input
                        type="text"
                        required
                        className="cp-input"
                        placeholder="e.g. Sarah Jenkins"
                        value={formData.agentName}
                        onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="cp-form-row">
                    <div className="cp-field">
                      <label className="cp-label">Official Work Email *</label>
                      <input
                        type="email"
                        required
                        className="cp-input"
                        placeholder="agent@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="cp-field">
                      <label className="cp-label">WhatsApp / Phone (with Country Code) *</label>
                      <input
                        type="tel"
                        required
                        className="cp-input"
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Destination Chips */}
                  <div className="cp-field">
                    <label className="cp-label">Target Destinations in Thailand</label>
                    <div className="cp-dest-chips">
                      {['Bangkok', 'Pattaya', 'Phuket', 'Krabi', 'Koh Samui', 'Chiang Mai', 'Hua Hin'].map((dest) => {
                        const isSelected = formData.destinations.includes(dest);
                        return (
                          <button
                            key={dest}
                            type="button"
                            className={`cp-dest-chip ${isSelected ? 'cp-dest-chip--selected' : ''}`}
                            onClick={() => handleDestToggle(dest)}
                          >
                            <span>{isSelected ? '✓' : '+'}</span>
                            {dest}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="cp-form-row cp-form-row--3">
                    <div className="cp-field">
                      <label className="cp-label">Estimated Guests (PAX)</label>
                      <input
                        type="number"
                        min="1"
                        className="cp-input"
                        placeholder="2"
                        value={formData.pax}
                        onChange={(e) => setFormData({ ...formData, pax: e.target.value })}
                      />
                    </div>
                    <div className="cp-field">
                      <label className="cp-label">Expected Travel Date</label>
                      <DateInput
                        className="cp-input"
                        value={formData.travelDate}
                        onChange={(value) => setFormData({ ...formData, travelDate: value })}
                      />
                    </div>
                    <div className="cp-field">
                      <label className="cp-label">Hotel Category</label>
                      <select
                        className="cp-input"
                        value={formData.hotelTier}
                        onChange={(e) => setFormData({ ...formData, hotelTier: e.target.value })}
                      >
                        <option value="4star">4★ Deluxe Hotels</option>
                        <option value="5star">5★ Luxury Resorts</option>
                        <option value="villa">Private Pool Villas</option>
                        <option value="budget">3★ Comfortable Standard</option>
                        <option value="transfersOnly">Ground Transfers Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="cp-field">
                    <label className="cp-label">Itinerary Details / Specific Requests</label>
                    <textarea
                      rows="4"
                      className="cp-input cp-textarea"
                      placeholder="Please specify flight timings, preferred sightseeing (temples, island cruises, Michelin dining, elephant sanctuaries), or any custom requirements..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="cp-submit-btn" disabled={submitting}>
                    {submitting ? (
                      <span className="cp-btn-loader">
                        <span className="cp-spinner" /> Routing to Bangkok Operations...
                      </span>
                    ) : (
                      <>
                        <span>Submit B2B Inquiry</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                  <p className="cp-form-footer-note">
                    🔒 Guaranteed B2B confidential net rates. We strictly serve travel agents and tour operators.
                  </p>
                </form>
              )}
            </div>

            {/* Right Column: Direct Channels & Duty Manager */}
            <div className="cp-channels-col">
              {/* Emergency WhatsApp Card */}
              <div className="cp-wa-card">
                <div className="cp-wa-glow" />
                <div className="cp-wa-header">
                  <div className="cp-wa-badge">
                    <span className="cp-live-dot" />
                    <span>24/7 EMERGENCY DISPATCH</span>
                  </div>
                  <h3 className="cp-wa-title">Direct Operations Hotline</h3>
                  <p className="cp-wa-desc">
                    Immediate on-ground coordination for arriving flights, client emergencies, or active itinerary changes.
                  </p>
                </div>
                <div className="cp-wa-contact-row">
                  <div className="cp-wa-number">+66 82 890 1234</div>
                  <a
                    href="https://wa.me/66828901234?text=Hello%20Thai%20Arrival%20Operations%2C%20I%20am%20a%20travel%20agent%20seeking%20assistance."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cp-wa-chat-btn"
                  >
                    <span>💬 Open WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Department Directory */}
              <div className="cp-dept-card">
                <h3 className="cp-dept-title">Department Contacts</h3>
                <ul className="cp-dept-list">
                  <li className="cp-dept-item">
                    <div className="cp-dept-icon">📑</div>
                    <div className="cp-dept-info">
                      <strong>FIT &amp; Group Quotations</strong>
                      <a href="mailto:quotes@tripnest.com">quotes@tripnest.com</a>
                    </div>
                  </li>
                  <li className="cp-dept-item">
                    <div className="cp-dept-icon">🛎️</div>
                    <div className="cp-dept-info">
                      <strong>Reservations &amp; Vouchers</strong>
                      <a href="mailto:ops@tripnest.com">ops@tripnest.com</a>
                    </div>
                  </li>
                  <li className="cp-dept-item">
                    <div className="cp-dept-icon">🤝</div>
                    <div className="cp-dept-info">
                      <strong>Agent Partnerships &amp; Contracting</strong>
                      <a href="mailto:partners@tripnest.com">partners@tripnest.com</a>
                    </div>
                  </li>
                  <li className="cp-dept-item">
                    <div className="cp-dept-icon">💳</div>
                    <div className="cp-dept-info">
                      <strong>Accounts &amp; Billing Portal</strong>
                      <a href="mailto:billing@tripnest.com">billing@tripnest.com</a>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Official License & Accreditation */}
              <div className="cp-license-card">
                <div className="cp-license-badge">TAT CERTIFIED INBOUND DMC</div>
                <h4 className="cp-license-title">Official Government Registration</h4>
                <div className="cp-license-grid">
                  <div>
                    <span className="cp-license-lbl">TAT License No.</span>
                    <strong>11/08942</strong>
                  </div>
                  <div>
                    <span className="cp-license-lbl">ATTA Membership</span>
                    <strong>Active B2B Member</strong>
                  </div>
                  <div>
                    <span className="cp-license-lbl">DBD Registration</span>
                    <strong>0105559048192</strong>
                  </div>
                  <div>
                    <span className="cp-license-lbl">Liability Insurance</span>
                    <strong>฿20,000,000 THB Covered</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Regional Ground Hubs in Thailand ── */}
      <section className="cp-section cp-hubs-section">
        <div className="cp-wrap">
          <div className="cp-section-header">
            <span className="lp-eyebrow">Physical Infrastructure</span>
            <h2 className="lp-section-title">Our Ground Hubs in Thailand</h2>
            <p className="lp-section-desc">
              Operating our own private vehicle fleets, airport hospitality counters, and marine docks across all key tourism provinces.
            </p>
          </div>

          <div className="cp-hubs-grid">
            {officeHubs.map((hub) => (
              <div key={hub.id} className="cp-hub-card">
                <div className="cp-hub-img-wrap">
                  <img src={hub.image} alt={hub.city} className="cp-hub-img" />
                  <div className="cp-hub-status-pill">{hub.status}</div>
                </div>
                <div className="cp-hub-body">
                  <span className="cp-hub-role">{hub.role}</span>
                  <h3 className="cp-hub-city">{hub.city}</h3>
                  <p className="cp-hub-address">📍 {hub.address}</p>
                  <p className="cp-hub-airport">✈️ {hub.airport}</p>
                  <div className="cp-hub-tags">
                    {hub.specialties.map((spec, i) => (
                      <span key={i} className="cp-hub-tag">✓ {spec}</span>
                    ))}
                  </div>
                  <div className="cp-hub-contact-row">
                    <a href={`tel:${hub.phone}`} className="cp-hub-tel">{hub.phone}</a>
                    <a href={`mailto:${hub.email}`} className="cp-hub-mail">{hub.email}</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Travel Agent FAQ Accordion ── */}
      <section className="cp-section cp-faq-section">
        <div className="cp-wrap cp-wrap--narrow">
          <div className="cp-section-header">
            <span className="lp-eyebrow">Travel Agent Answers</span>
            <h2 className="lp-section-title">Frequently Asked Questions</h2>
            <p className="lp-section-desc">
              Common operational questions from global travel partners regarding our contracting, vouchers, and ground delivery.
            </p>
          </div>

          <div className="cp-faq-list">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className={`cp-faq-item ${isOpen ? 'cp-faq-item--open' : ''}`}>
                  <button
                    type="button"
                    className="cp-faq-question"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                  >
                    <span>{faq.q}</span>
                    <span className="cp-faq-toggle-icon">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="cp-faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Footer (Clean White Background with Monochromedark Logo) ── */}
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            {/* Logo on white background - Zero border, Zero shadow */}
            <div className="lp-footer-logo-badge">
              <img src={logoWhite} alt="TripNest" className="lp-footer-logo" />
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
            <h4 className="lp-footer-col-title">Navigation</h4>
            <ul>
              <li><button type="button" className="lp-footer-link-btn" onClick={() => navigate('/')}>Home</button></li>
              <li><button type="button" className="lp-footer-link-btn" onClick={() => navigateToSection('tour')}>Guided Tour</button></li>
              <li><button type="button" className="lp-footer-link-btn" onClick={() => navigateToSection('destinations')}>Iconic Destinations</button></li>
              <li><button type="button" className="lp-footer-link-btn" onClick={() => navigateToSection('services')}>DMC Services</button></li>
              <li><button type="button" className="lp-footer-link-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Contact Desk</button></li>
            </ul>
          </div>

          <div className="lp-footer-col">
            <h4 className="lp-footer-col-title">Key Destinations</h4>
            <ul>
              <li><button type="button" className="lp-footer-link-btn" onClick={() => navigateToSection('destinations')}>Bangkok Hub</button></li>
              <li><button type="button" className="lp-footer-link-btn" onClick={() => navigateToSection('destinations')}>Phuket &amp; Phi Phi</button></li>
              <li><button type="button" className="lp-footer-link-btn" onClick={() => navigateToSection('destinations')}>Chiang Mai &amp; North</button></li>
              <li><button type="button" className="lp-footer-link-btn" onClick={() => navigateToSection('destinations')}>Krabi Coast</button></li>
              <li><button type="button" className="lp-footer-link-btn" onClick={() => navigateToSection('destinations')}>Koh Samui Islands</button></li>
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
                <a href="mailto:b2b@tripnest.com">b2b@tripnest.com</a>
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
              © {new Date().getFullYear()} TripNest. All rights reserved.
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

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        navigate={navigate}
      />
    </div>
  );
}
