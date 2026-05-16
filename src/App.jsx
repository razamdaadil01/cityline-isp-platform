import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
      </Routes>
    </BrowserRouter>
  )
}
