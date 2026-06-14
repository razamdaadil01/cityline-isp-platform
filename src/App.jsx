import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import AddCustomer from './pages/AddCustomer'
import Sales from './pages/Sales'
import SalesToday from './pages/SalesToday'
import SalesFollowups from './pages/SalesFollowups'
import SalesPipelines from './pages/SalesPipelines'
import SalesHwAssignment from './pages/SalesHwAssignment'
import SalesFormBuilder from './pages/SalesFormBuilder'
import SalesProposals from './pages/SalesProposals'
import SalesAnalytics from './pages/SalesAnalytics'
import SalesNewLead from './pages/SalesNewLead'
import SalesLeadDetail from './pages/SalesLeadDetail'
import Billing from './pages/Billing'
import InvoicePDF from './pages/InvoicePDF'
import Support from './pages/Support'
import TicketDetail from './pages/TicketDetail'
import Packages from './pages/Packages'
import Network from './pages/Network'
import NetworkServers from './pages/NetworkServers'
import Inventory from './pages/Inventory'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Resellers from './pages/Resellers'
import ResellerDetail from './pages/ResellerDetail'
import AuditLog from './pages/AuditLog'
import BandwidthMonitoring from './pages/BandwidthMonitoring'
import RolesSettings from './pages/RolesSettings'
import NotificationSettings from './pages/NotificationSettings'
import CPALayout from './pages/cpa/CPALayout'
import CPADashboard from './pages/cpa/CPADashboard'
import CPAAppointments from './pages/cpa/CPAAppointments'
import CPAClients from './pages/cpa/CPAClients'
import CPAClientDetail from './pages/cpa/CPAClientDetail'
import CPADocuments from './pages/cpa/CPADocuments'
import CPAInvoices from './pages/cpa/CPAInvoices'
import CPAMessages from './pages/cpa/CPAMessages'
import CPAReviews from './pages/cpa/CPAReviews'
import CPAProfile from './pages/cpa/CPAProfile'
import CPARegister from './pages/cpa/CPARegister'

const CPACalendarPlaceholder = () => (
  <div className="p-6"><div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400"><p className="text-lg font-medium">Calendar View</p><p className="text-sm mt-1">Coming soon</p></div></div>
)
const CPASettingsPlaceholder = () => (
  <div className="p-6"><div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400"><p className="text-lg font-medium">Settings</p><p className="text-sm mt-1">Coming soon</p></div></div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<AddCustomer />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/today" element={<SalesToday />} />
          <Route path="/sales/followups" element={<SalesFollowups />} />
          <Route path="/sales/pipelines" element={<SalesPipelines />} />
          <Route path="/sales/hw-assignment" element={<SalesHwAssignment />} />
          <Route path="/sales/form-builder" element={<SalesFormBuilder />} />
          <Route path="/sales/proposals" element={<SalesProposals />} />
          <Route path="/sales/analytics" element={<SalesAnalytics />} />
          <Route path="/sales/leads/new" element={<SalesNewLead />} />
          <Route path="/sales/leads/:id" element={<SalesLeadDetail />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/billing/invoice/:id" element={<InvoicePDF />} />
          <Route path="/support" element={<Support />} />
          <Route path="/support/ticket/:id" element={<TicketDetail />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/network" element={<Network />} />
          <Route path="/network/servers" element={<NetworkServers />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/roles" element={<RolesSettings />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/resellers" element={<Resellers />} />
          <Route path="/resellers/:id" element={<ResellerDetail />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/bandwidth" element={<BandwidthMonitoring />} />
        </Route>
        <Route path="/register/cpa" element={<CPARegister />} />
        <Route element={<CPALayout />}>
          <Route path="/cpa" element={<Navigate to="/cpa/dashboard" replace />} />
          <Route path="/cpa/dashboard" element={<CPADashboard />} />
          <Route path="/cpa/appointments" element={<CPAAppointments />} />
          <Route path="/cpa/calendar" element={<CPACalendarPlaceholder />} />
          <Route path="/cpa/clients" element={<CPAClients />} />
          <Route path="/cpa/clients/:id" element={<CPAClientDetail />} />
          <Route path="/cpa/documents" element={<CPADocuments />} />
          <Route path="/cpa/invoices" element={<CPAInvoices />} />
          <Route path="/cpa/messages" element={<CPAMessages />} />
          <Route path="/cpa/reviews" element={<CPAReviews />} />
          <Route path="/cpa/profile" element={<CPAProfile />} />
          <Route path="/cpa/settings" element={<CPASettingsPlaceholder />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
