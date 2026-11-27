import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { TimezoneProvider } from './context/TimezoneContext';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './pages/Auth/Login';
import TableSortManager from './components/ui/TableSortManager';

// Pages
import Dashboard from './pages/Dashboard';
import Queries from './pages/Queries';
import QueryForm from './pages/Queries/QueryForm';
import Quotations from './pages/Quotations';
import QuotationBuilder from './pages/Quotations/QuotationBuilder';
import PDFDesigner from './pages/Quotations/PDFDesigner';
import Bookings from './pages/Bookings';
import BookingDetail from './pages/Bookings/BookingDetail';
import CreateVoucher from './pages/Bookings/CreateVoucher';
import VoucherPreview from './pages/Bookings/VoucherPreview';
import Operations from './pages/Operations';
import TourMasterSheet from './pages/Operations/TourMasterSheet';
import HotelReservation from './pages/Operations/HotelReservation';
import Accounts from './pages/Accounts';
import PaymentPlanner from './pages/Accounts/PaymentPlanner';
import InvoicesPayments from './pages/Accounts/InvoicesPayments';
import Reports from './pages/Reports';
import AgentPerformanceReport from './pages/Reports/AgentPerformanceReport';
import BookingReport from './pages/Reports/BookingReport';
import DestinationReport from './pages/Reports/DestinationReport';
import ExpenseReport from './pages/Reports/ExpenseReport';
import PaymentReport from './pages/Reports/PaymentReport';
import SalesReport from './pages/Reports/SalesReport';
import SupplierReport from './pages/Reports/SupplierReport';
import ProfitReport from './pages/Reports/ProfitReport';
import CollectionReport from './pages/Reports/CollectionReport';
import GuestReport from './pages/Reports/GuestReport';
import Documents from './pages/Documents';
import PDFTemplateSettings from './pages/Documents/PDFTemplateSettings';
import VoucherTemplateSettings from './pages/Documents/VoucherTemplateSettings';
import Masters from './pages/Masters';
import HotelMaster from './pages/Masters/HotelMaster';
import HotelRates from './pages/Masters/HotelRates';
import SupplierMaster from './pages/Masters/SupplierMaster';
import TransferPrices from './pages/Masters/TransferPrices';
import SightseeingPrices from './pages/Masters/SightseeingPrices';
import RestaurantPrices from './pages/Masters/RestaurantPrices';
import SightseeingEditor from './pages/Masters/SightseeingEditor';
import AgentMaster from './pages/Masters/AgentMaster';
import B2CMaster from './pages/Masters/B2CMaster';
import SalesMasterList from './pages/Masters/SalesMasterList';
import OperationsMaster from './pages/Masters/OperationsMaster';
import ActivityMaster from './pages/Masters/ActivityMaster';
import InsuranceMaster from './pages/Masters/InsuranceMaster';
import FinanceMaster from './pages/Masters/FinanceMaster';
import SystemMaster from './pages/Masters/SystemMaster';
import DocumentMaster from './pages/Masters/DocumentMaster';
import SightseeingMasterClone from './pages/Masters/SightseeingMasterClone';
import YachtMaster from './pages/Masters/YachtMaster';
import TermsConditionsMaster from './pages/Masters/TermsConditionsMaster';
import SettingsPage from './pages/Settings';
import ClientPaymentPortal from './pages/Public/ClientPaymentPortal';
import AgentQuotationShare from './pages/Public/AgentQuotationShare';
import LandingPage from './pages/Public/LandingPage';
import ContactPage from './pages/Public/ContactPage';

// Older in-app links (and browser bookmarks) used top-level workspace paths
// before the protected workspace was placed below `/app`. Preserve all of
// those links so a direct booking, quotation, or master URL cannot render a
// blank "No routes matched" page.
const LEGACY_WORKSPACE_SECTIONS = new Set([
  'dashboard', 'queries', 'quotations', 'bookings', 'operations', 'accounts',
  'reports', 'documents', 'masters', 'settings',
]);

function LegacyWorkspaceRedirect() {
  const location = useLocation();
  const { legacySection } = useParams();
  if (!LEGACY_WORKSPACE_SECTIONS.has(legacySection)) return <Navigate to="/" replace />;
  return <Navigate to={`/app${location.pathname}${location.search}${location.hash}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/crm">
        <TimezoneProvider>
        <AppProvider>
        <TableSortManager />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              borderRadius: '12px',
              fontSize: '13px',
              padding: '12px 16px',
            },
            success: {  
              style: {
                background: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0'
              },
              iconTheme: { primary: '#10b981', secondary: '#fff' }  
            },
            error: { 
              style: {
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca'
              },
              iconTheme: { primary: '#ef4444', secondary: '#fff' } 
            },
          }}
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/payment/:token" element={<ClientPaymentPortal />} />
          <Route path="/agent-quotation/:token" element={<AgentQuotationShare />} />
          <Route path="/q/:token" element={<AgentQuotationShare />} />
          <Route path="/q/:quotationNumber/:token" element={<AgentQuotationShare />} />
          <Route path="/:legacySection/*" element={<LegacyWorkspaceRedirect />} />
          <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Queries */}
            <Route path="queries" element={<Queries />} />
            <Route path="queries/new" element={<QueryForm />} />
            <Route path="queries/:id" element={<QueryForm />} />

            {/* Quotations */}
            <Route path="quotations" element={<Quotations />} />
            <Route path="quotations/new" element={<QuotationBuilder />} />
            <Route path="quotations/:id" element={<QuotationBuilder />} />
            <Route path="quotations/:id/pdf-designer" element={<PDFDesigner />} />

            {/* Bookings */}
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
            <Route path="bookings/:id/create-voucher" element={<CreateVoucher />} />
            <Route path="bookings/:id/voucher" element={<VoucherPreview />} />

            {/* Operations */}
            <Route path="operations" element={<Operations />} />
            <Route path="operations/tour-master-sheet" element={<TourMasterSheet />} />
            <Route path="operations/hotel-reservation" element={<HotelReservation />} />

            {/* Accounts */}
            <Route path="accounts" element={<Accounts />} />
            <Route path="accounts/payment-planner" element={<PaymentPlanner />} />
            <Route path="accounts/invoices-payments" element={<InvoicesPayments />} />

            {/* Reports */}
            <Route path="reports" element={<Reports />} />
            <Route path="reports/agent-performance" element={<AgentPerformanceReport />} />
            <Route path="reports/booking" element={<BookingReport />} />
            <Route path="reports/destination" element={<DestinationReport />} />
            <Route path="reports/expense" element={<ExpenseReport />} />
            <Route path="reports/payment" element={<PaymentReport />} />
            <Route path="reports/sales" element={<SalesReport />} />
            <Route path="reports/supplier" element={<SupplierReport />} />
            <Route path="reports/profit" element={<ProfitReport />} />
            <Route path="reports/collection" element={<CollectionReport />} />
            <Route path="reports/guests" element={<GuestReport />} />

            {/* Documents */}
            <Route path="documents" element={<Documents />} />
            <Route path="documents/pdf-template-settings" element={<PDFTemplateSettings />} />
            <Route path="documents/voucher-template-settings" element={<VoucherTemplateSettings />} />

            {/* Masters */}
            <Route path="masters" element={<Masters />} />
            <Route path="masters/hotels" element={<HotelMaster />} />
            <Route path="masters/hotels/:hotelId/rates" element={<HotelRates />} />
            <Route path="masters/suppliers" element={<SupplierMaster />} />
            <Route path="masters/agents" element={<AgentMaster />} />
            <Route path="masters/b2c" element={<B2CMaster />} />
            <Route path="masters/markets" element={<SalesMasterList type="markets" />} />
            <Route path="masters/lead-sources" element={<SalesMasterList type="lead-sources" />} />
            <Route path="masters/query-types" element={<SalesMasterList type="query-types" />} />
            <Route path="masters/hotel-categories" element={<SalesMasterList type="hotel-categories" />} />
            <Route path="masters/room-types" element={<SalesMasterList type="room-types" />} />
            <Route path="masters/room-categories" element={<SalesMasterList type="room-categories" />} />
            <Route path="masters/meal-plans" element={<SalesMasterList type="meal-plans" />} />
            <Route path="masters/amenities" element={<SalesMasterList type="amenities" />} />
            <Route path="masters/markup-categories" element={<SalesMasterList type="markup-categories" />} />
            <Route path="masters/destinations" element={<OperationsMaster type="destinations" />} />
            <Route path="masters/locations" element={<OperationsMaster type="locations" />} />
            <Route path="masters/airports" element={<OperationsMaster type="airports" />} />
            <Route path="masters/transfers" element={<OperationsMaster type="transfers" />} />
            <Route path="masters/transfers/:transferId/prices" element={<TransferPrices />} />
            <Route path="masters/vehicles" element={<OperationsMaster type="vehicles" />} />
            <Route path="masters/drivers" element={<OperationsMaster type="drivers" />} />
            <Route path="masters/guides" element={<OperationsMaster type="guides" />} />
            <Route path="masters/ferry-classes" element={<OperationsMaster type="ferry-classes" />} />
            {/*
              Legacy Sightseeing UI retained for reference but deliberately
              disabled from the active route. The dynamic Sightseeing module
              below is the single visible Activities entry.
              <Route path="masters/sightseeing" element={<ActivityMaster type="sightseeing" />} />
              <Route path="masters/sightseeing/new" element={<SightseeingEditor />} />
              <Route path="masters/sightseeing/:sightseeingId/prices" element={<SightseeingPrices />} />
              <Route path="masters/sightseeing/:sightseeingId" element={<SightseeingEditor />} />
            */}
            <Route path="masters/restaurants" element={<ActivityMaster type="restaurants" />} />
            <Route path="masters/restaurants/:restaurantId/prices" element={<RestaurantPrices />} />
            <Route path="masters/restaurant-types" element={<ActivityMaster type="restaurant-types" />} />
            <Route path="masters/visa" element={<ActivityMaster type="visa" />} />
            <Route path="masters/travel-insurance/*" element={<InsuranceMaster />} />
            <Route path="masters/currencies" element={<FinanceMaster type="currencies" />} />
            <Route path="masters/banks" element={<FinanceMaster type="banks" />} />
            <Route path="masters/expense-types" element={<FinanceMaster type="expense-types" />} />
            <Route path="masters/itinerary" element={<SystemMaster type="itinerary" />} />
            <Route path="masters/arrival-departure" element={<SystemMaster type="arrival-departure" />} />
            <Route path="masters/documents" element={<DocumentMaster />} />
            <Route path="masters/guest-documents" element={<SystemMaster type="guest-documents" />} />
            <Route path="masters/feedback-types" element={<SystemMaster type="feedback-types" />} />
            <Route path="masters/terms-conditions" element={<TermsConditionsMaster />} />
            <Route path="masters/sightseeing" element={<SightseeingMasterClone />} />
            <Route path="masters/yacht" element={<YachtMaster />} />
            {/* Legacy master links may use either of these older path shapes. */}
            <Route path="master/travel-insurance/*" element={<InsuranceMaster />} />
            <Route path="travel-insurance/*" element={<InsuranceMaster />} />

            {/* Settings */}
            <Route path="settings" element={<SettingsPage />} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Route>
        </Routes>
        </AppProvider>
        </TimezoneProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
