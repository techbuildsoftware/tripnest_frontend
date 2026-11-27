import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, Bell, Plus, ChevronDown,
  MessageSquare, FileText, BookOpen, Users, Truck,
  DollarSign, Menu, LogOut, User, Settings, Building2,
  PlaneTakeoff, Eye, Anchor, Clock3
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTimeZone } from '../../context/TimezoneContext';
import NotificationPanel from '../ui/NotificationPanel';
import GlobalSearch from '../ui/GlobalSearch';

const quickCreateItems = [
  { label: 'New Query', path: '/queries/new', icon: MessageSquare, color: 'text-primary-600', bg: 'bg-primary-50' },
  { label: 'New Quotation', path: '/quotations/new', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'New Booking', path: '/bookings', icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Add Agent', path: '/masters/agents', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
  { label: 'Add Supplier', path: '/masters/suppliers', icon: Truck, color: 'text-red-600', bg: 'bg-red-50' },
  { label: 'Add Hotel', path: '/masters/hotels', icon: Building2, color: 'text-sky-600', bg: 'bg-sky-50' },
  { label: 'Add Sightseeing', path: '/masters/sightseeing', icon: Eye, color: 'text-teal-600', bg: 'bg-teal-50' },
  { label: 'Add Transfer', path: '/masters/transfers', icon: PlaneTakeoff, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Add Flight', path: '/flights', icon: PlaneTakeoff, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { label: 'Add Yacht', path: '/masters/yacht', icon: Anchor, color: 'text-pink-600', bg: 'bg-pink-50' },
];

// Thailand flag SVG inline
const ThailandFlag = () => (
  <svg width="22" height="15" viewBox="0 0 22 15" className="rounded-sm shadow-sm flex-shrink-0">
    <rect width="22" height="15" fill="#A51931" />
    <rect y="3" width="22" height="9" fill="white" />
    <rect y="4.5" width="22" height="6" fill="#2D2A4A" />
  </svg>
);

const IndiaFlag = () => (
  <svg width="22" height="15" viewBox="0 0 22 15" className="rounded-sm shadow-sm flex-shrink-0">
    <rect width="22" height="5" fill="#3fb5b0" />
    <rect y="5" width="22" height="5" fill="white" />
    <rect y="10" width="22" height="5" fill="#138808" />
    <circle cx="11" cy="7.5" r="1.4" fill="none" stroke="#000080" strokeWidth="0.65" />
  </svg>
);

const TimeZoneFlag = ({ timeZone }) => (
  timeZone === 'Asia/Kolkata' ? <IndiaFlag /> : <ThailandFlag />
);

export default function Navbar({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, setSearchOpen, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const { user, logout } = useAuth();
  const { timeZone, setTimeZone, options: timeZoneOptions } = useTimeZone();
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTimeZoneMenu, setShowTimeZoneMenu] = useState(false);
  const newMenuRef = useRef(null);
  const notifRef = useRef(null);
  const userRef = useRef(null);
  const timeZoneRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  // Mock a second badge number for tasks (matches reference "5" orange badge)
  const taskCount = 5;

  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  useEffect(() => {
    function handleClickOutside(e) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target)) setShowNewMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserMenu(false);
      if (timeZoneRef.current && !timeZoneRef.current.contains(e.target)) setShowTimeZoneMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className="h-14 flex items-center px-4 gap-3 flex-shrink-0 sticky top-0 z-30 relative"
      style={{
        background: 'transparent',
        boxShadow: '0 4px 18px -10px rgba(19,35,79,0.25)',
      }}
    >
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden bg-white">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(14,138,133,0.05) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(19,35,79,0.05) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #13234f 0%, #0e8a85 55%, #22c3a6 100%)' }} />
      </div>

      {/* Mobile menu button */}
      <button onClick={onMenuClick} className="lg:hidden text-slate-500 hover:text-slate-700 flex-shrink-0 z-10">
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop Collapse Button */}
      <button 
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
        className="hidden lg:flex items-center justify-center w-8 h-8 mr-1 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-primary-600 hover:border-primary-300 hover:bg-white flex-shrink-0 z-10 transition-all shadow-sm"
      >
        <Menu className="w-4.5 h-4.5" />
      </button>

      {/* Search Box */}
      <div className="flex-1 max-w-lg min-w-0 z-10">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-slate-400 text-sm hover:border-primary-400 transition-all group"
          style={{
            background: '#f4f7fb',
            border: '1.5px solid #e3eaf3',
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover:text-primary-500 transition-colors" />
          <span className="flex-1 text-left text-[13px] truncate">
            Search <span className="hidden sm:inline">queries, bookings, agents, suppliers...</span>
          </span>
          <kbd
            className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-white border border-slate-200 rounded-md text-slate-400 shadow-sm flex-shrink-0"
          >
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto flex-shrink-0 z-10">

        {/* + New Button */}
        <div className="relative" ref={newMenuRef}>
          <button
            onClick={() => { setShowNewMenu(!showNewMenu); setShowNotifications(false); setShowUserMenu(false); setShowTimeZoneMenu(false); }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-sm font-semibold text-white transition-all shadow-lg hover:shadow-primary-500/30 hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #14a09a, #0b6f6b)',
              boxShadow: '0 4px 14px rgba(14,160,154,0.35)',
            }}
          >
            <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
          {showNewMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-48 rounded-2xl py-2 z-50 fade-in"
              style={{
                background: 'white',
                boxShadow: '0 20px 60px -10px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
                border: '1px solid rgba(226,232,240,0.8)',
              }}
            >
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quick Create</div>
              {quickCreateItems.map(item => (
                <button
                  key={item.label}
                  onClick={() => { navigate(item.path); setShowNewMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                  <span className="text-[12.5px]">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowNewMenu(false); setShowUserMenu(false); setShowTimeZoneMenu(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-colors text-slate-600 hover:text-slate-800 shadow-sm"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold"
                style={{ background: '#ef4444', boxShadow: '0 2px 6px rgba(239,68,68,0.5)' }}
              >
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
        </div>



        {/* Display timezone */}
        <div className="relative hidden sm:block" ref={timeZoneRef}>
          <button
            type="button"
            onClick={() => { setShowTimeZoneMenu(!showTimeZoneMenu); setShowNewMenu(false); setShowNotifications(false); setShowUserMenu(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-colors shadow-sm"
            style={{ borderColor: '#e2e8f0', fontSize: '12px' }}
            aria-label="Change display timezone"
          >
            <Clock3 className="w-3.5 h-3.5 text-primary-600" />
            <TimeZoneFlag timeZone={timeZone} />
            <span className="font-bold text-slate-600">{timeZone === 'Asia/Kolkata' ? 'India' : 'Thailand'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          {showTimeZoneMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl p-1.5 z-50 fade-in bg-white" style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)', border: '1px solid rgba(226,232,240,0.8)' }}>
              <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Display timezone</p>
              {timeZoneOptions.map((option) => {
                const active = option.value === timeZone;
                return (
                  <button type="button" key={option.value} onClick={() => { setTimeZone(option.value); setShowTimeZoneMenu(false); }} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${active ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <TimeZoneFlag timeZone={option.value} />
                    <span className="flex-1 text-xs font-semibold">{option.label}</span>
                    <span className="text-[10px] text-slate-400">{option.detail}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Currency */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-semibold text-slate-700 cursor-pointer bg-white border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-colors shadow-sm"
          style={{ borderColor: '#e2e8f0', fontSize: '12px' }}
        >
          <span className="text-[12px] font-bold text-slate-600">THB</span>
          {/* <ChevronDown className="w-3 h-3 text-slate-400" /> */}
        </div>

        {/* User Avatar */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNewMenu(false); setShowNotifications(false); setShowTimeZoneMenu(false); }}
            className="flex items-center gap-2 pl-1 pr-2.5 py-0.5 rounded-full bg-white border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all shadow-sm"
            style={{ border: '1.5px solid #e2e8f0' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #13234f, #0e8a85)',
                boxShadow: '0 2px 8px rgba(14,160,154,0.4)',
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'R'}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-[12px] font-bold text-slate-800 leading-none">{user?.name || 'Ronik Soni'}</span>
              <span className="text-[10px] text-slate-400 leading-none mt-0.5">{user?.role || 'Managing Director'}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>
          {showUserMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-2xl py-1.5 z-50 fade-in"
              style={{
                background: 'white',
                boxShadow: '0 20px 60px -10px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
                border: '1px solid rgba(226,232,240,0.8)',
              }}
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-sm font-bold text-slate-900">{user?.name || 'Ronik Soni'}</div>
                <div className="text-xs text-slate-500 mt-0.5">{user?.email || 'admin@tripnest.com'}</div>
                <div className="text-[10px] text-primary-600 font-medium mt-0.5">{user?.role || 'Managing Director'}</div>
              </div>
              <button
                onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" /> Profile
              </button>
              <button
                onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" /> Settings
              </button>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
