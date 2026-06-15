import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
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
import SalesStageFields from './pages/SalesStageFields'
import SalesProposals from './pages/SalesProposals'
import SalesAnalytics from './pages/SalesAnalytics'
import SalesNewLead from './pages/SalesNewLead'
import SalesLeadDetail from './pages/SalesLeadDetail'
import SalesEditLead from './pages/SalesEditLead'
import Billing from './pages/Billing'
import InvoicePDF from './pages/InvoicePDF'
import Support from './pages/Support'
import TicketDetail from './pages/TicketDetail'
import Packages from './pages/Packages'
import AddNewPlan from './pages/AddNewPlan'
import PackageDetail from './pages/PackageDetail'
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
import Notifications from './pages/Notifications'
import AreaMapping from './pages/AreaMapping'
import FeasibilityRequests from './pages/FeasibilityRequests'
import FeasibilityDetail from './pages/FeasibilityDetail'
import UserManagement from './pages/UserManagement'
import Installations from './pages/Installations'
import InstallationDetail from './pages/InstallationDetail'

function LeadDetailRedirect() {
  const { id } = useParams()
  return <Navigate to={`/sales/leads/${id}/overview`} replace />
}

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
          <Route path="/customers/:id/:tab/:subTab" element={<CustomerDetail />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/today" element={<SalesToday />} />
          <Route path="/sales/followups" element={<SalesFollowups />} />
          <Route path="/sales/feasibility-requests" element={<FeasibilityRequests />} />
          <Route path="/sales/feasibility-requests/:id" element={<FeasibilityDetail />} />
          <Route path="/settings/sales-configuration/pipelines"    element={<SalesPipelines />} />
          <Route path="/settings/sales-configuration/stage-fields" element={<SalesStageFields />} />
          <Route path="/inventory/hw-assignment"     element={<SalesHwAssignment />} />
          <Route path="/sales/proposals" element={<SalesProposals />} />
          <Route path="/sales/analytics" element={<SalesAnalytics />} />
          <Route path="/sales/leads/new" element={<SalesNewLead />} />
          <Route path="/sales/leads/:id/edit" element={<SalesEditLead />} />
          <Route path="/sales/leads/:id" element={<LeadDetailRedirect />} />
          <Route path="/sales/leads/:id/:tab" element={<SalesLeadDetail />} />
          <Route path="/installations" element={<Installations />} />
          <Route path="/installations/:id" element={<InstallationDetail />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/billing/invoice/:id" element={<InvoicePDF />} />
          <Route path="/support" element={<Support />} />
          <Route path="/support/ticket/:id" element={<TicketDetail />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/packages/add" element={<AddNewPlan />} />
          <Route path="/packages/:id" element={<PackageDetail />} />
          <Route path="/network" element={<Network />} />
          <Route path="/network/servers" element={<NetworkServers />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
          <Route path="/settings/area-mapping/manage"       element={<Navigate to="/settings/area-mapping/state" replace />} />
          <Route path="/settings/area-mapping/state"        element={<AreaMapping />} />
          <Route path="/settings/area-mapping/district"     element={<AreaMapping />} />
          <Route path="/settings/area-mapping/area"         element={<AreaMapping />} />
          <Route path="/settings/area-mapping/locality"     element={<AreaMapping />} />
          <Route path="/settings/area-mapping/sub-locality" element={<AreaMapping />} />
          <Route path="/settings/area-mapping/feasibility-requests" element={<FeasibilityRequests />} />
          <Route path="/settings/:tab" element={<Settings />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/resellers" element={<Resellers />} />
          <Route path="/resellers/:id" element={<ResellerDetail />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/bandwidth" element={<BandwidthMonitoring />} />
          <Route path="/users" element={<UserManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
