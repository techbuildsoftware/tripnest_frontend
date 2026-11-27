import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useApp } from '../../context/AppContext';
import { useTimeZone } from '../../context/TimezoneContext';
import GlobalSearch from '../ui/GlobalSearch';
import { PageSkeleton } from '../ui/PageLoader';

export default function AppShell() {
  const { sidebarCollapsed, searchOpen, setSearchOpen, dataLoading } = useApp();
  const { timeZone } = useTimeZone();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const main = document.getElementById('main-scroll');
    if (main) {
      main.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-background overflow-hidden" data-display-timezone={timeZone}>

      <div className="no-print">
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      </div>

      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-14' : 'lg:ml-52'}`}>
        <div className="no-print">
          <Navbar onMenuClick={() => setMobileOpen(true)} />
        </div>
        <main id="main-scroll" className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 relative">
          {dataLoading && <div className="sticky top-0 z-30 h-0"><div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-primary-100"><div className="h-full w-1/3 bg-primary-600 animate-[pulse_1s_ease-in-out_infinite]" /></div></div>}
          <div key={location.pathname} className="crm-page-enter"><Outlet /></div>
          {dataLoading && <PageSkeleton />}
        </main>
      </div>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
