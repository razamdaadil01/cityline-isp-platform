import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import AddPayment from './pages/AddPayment'
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
import SalesEditLead from './pages/SalesEditLead'
import IntercomLeads from './pages/IntercomLeads'
import IntercomLeadNew from './pages/IntercomLeadNew'
import IntercomLeadDetail from './pages/IntercomLeadDetail'
import FeasibilityRequests from './pages/FeasibilityRequests'
import FeasibilityDetail from './pages/FeasibilityDetail'
import Installations from './pages/Installations'
import InstallationDetail from './pages/InstallationDetail'
import Billing from './pages/Billing'
import InvoicePDF from './pages/InvoicePDF'
import Support from './pages/Support'
import TicketDetail from './pages/TicketDetail'
import Packages from './pages/Packages'
import PackageAdd from './pages/PackageAdd'
import PackageDetail from './pages/PackageDetail'
import PackageEdit from './pages/PackageEdit'
import OTTManagement from './pages/OTTManagement'
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
import UserManagement from './pages/UserManagement'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<AddCustomer />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/customers/:id/:tab" element={<CustomerDetail />} />
          <Route path="/customers/:customerId/finance/payments/add" element={<AddPayment />} />
          <Route path="/customers/:id/:tab/:subTab" element={<CustomerDetail />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/today" element={<SalesToday />} />
          <Route path="/sales/followups" element={<SalesFollowups />} />
          <Route path="/sales/pipelines" element={<SalesPipelines />} />
          <Route path="/sales/hw-assignment" element={<SalesHwAssignment />} />
          <Route path="/sales/form-builder" element={<SalesFormBuilder />} />
          <Route path="/sales/proposals" element={<SalesProposals />} />
          <Route path="/sales/analytics" element={<SalesAnalytics />} />
          <Route path="/sales/leads/new" element={<SalesNewLead />} />
          <Route path="/sales/leads/:id/edit" element={<SalesEditLead />} />
          <Route path="/sales/leads/:id" element={<SalesLeadDetail />} />
          <Route path="/sales/leads/:id/:tab" element={<SalesLeadDetail />} />
          <Route path="/sales/feasibility-requests" element={<FeasibilityRequests />} />
          <Route path="/sales/feasibility-requests/:id" element={<FeasibilityDetail />} />
          <Route path="/intercom/leads" element={<IntercomLeads />} />
          <Route path="/intercom/leads/new" element={<IntercomLeadNew />} />
          <Route path="/intercom/leads/:id" element={<IntercomLeadDetail />} />
          <Route path="/installations" element={<Installations />} />
          <Route path="/installations/:id" element={<InstallationDetail />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/billing/package-recharge" element={<Billing />} />
          <Route path="/billing/tax-invoice" element={<Billing />} />
          <Route path="/billing/payment-history" element={<Billing />} />
          <Route path="/billing/invoice/:id" element={<InvoicePDF />} />
          <Route path="/support" element={<Support />} />
          <Route path="/support/ticket/:id" element={<TicketDetail />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/ott" element={<OTTManagement />} />
          <Route path="/packages/add" element={<PackageAdd />} />
          <Route path="/packages/:packageId/edit" element={<PackageEdit />} />
          <Route path="/packages/:packageId/:tab" element={<PackageDetail />} />
          <Route path="/packages/:packageId" element={<PackageDetail />} />
          <Route path="/network" element={<Network />} />
          <Route path="/network/servers" element={<NetworkServers />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/master-config" element={<Settings />} />
          <Route path="/settings/master-config/:tab" element={<Settings />} />
          <Route path="/settings/roles" element={<RolesSettings />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/resellers" element={<Resellers />} />
          <Route path="/resellers/:id" element={<ResellerDetail />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/bandwidth" element={<BandwidthMonitoring />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
