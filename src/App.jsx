import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import IntercomDashboard from './pages/IntercomDashboard'
import IntercomLeads from './pages/IntercomLeads'
import IntercomLeadNew from './pages/IntercomLeadNew'
import IntercomLeadNewForm from './pages/IntercomLeadNewForm'
import IntercomLeadDetail from './pages/IntercomLeadDetail'
import IntercomCustomerNew from './pages/IntercomCustomerNew'
import IntercomCustomers from './pages/IntercomCustomers'
import IntercomCustomerDetail from './pages/IntercomCustomerDetail'
import IntercomInstallationDetail from './pages/IntercomInstallationDetail'
import IntercomHardwareRecovery from './pages/IntercomHardwareRecovery'
import IntercomBilling from './pages/IntercomBilling'
import FeasibilityRequests from './pages/FeasibilityRequests'
import FeasibilityDetail from './pages/FeasibilityDetail'
import Installations from './pages/Installations'
import InstallationDetail from './pages/InstallationDetail'
import Approvals from './pages/Approvals'
import ApprovalDetail from './pages/ApprovalDetail'
import Billing from './pages/Billing'
import InvoicePDF from './pages/InvoicePDF'
import Support from './pages/Support'
import TicketDetail from './pages/TicketDetail'
import TicketList from './pages/TicketList'
import TicketCreate from './pages/TicketCreate'
import SupportTicketDetail from './pages/SupportTicketDetail'
import OutageList from './pages/OutageList'
import OutageCreate from './pages/OutageCreate'
import OutageDetail from './pages/OutageDetail'
import SupportDashboard from './pages/SupportDashboard'
import SupportReports from './pages/SupportReports'
import Packages from './pages/Packages'
import PackageAdd from './pages/PackageAdd'
import PackageDetail from './pages/PackageDetail'
import PackageEdit from './pages/PackageEdit'
import OTTManagement from './pages/OTTManagement'
import Network from './pages/Network'
import NetworkServers from './pages/NetworkServers'
import ProductList from './pages/inventory/ProductList'
import VendorList from './pages/inventory/VendorList'
import VendorDetail from './pages/inventory/VendorDetail'
import StoreList from './pages/inventory/StoreList'
import InventorySettings from './pages/inventory/InventorySettings'
import PurchaseOrders from './pages/inventory/PurchaseOrders'
import CreatePO from './pages/inventory/CreatePO'
import PODetail from './pages/inventory/PODetail'
import Purchases from './pages/inventory/Purchases'
import CreatePurchase from './pages/inventory/CreatePurchase'
import PurchaseDetail from './pages/inventory/PurchaseDetail'
import PurchaseInvoiceView from './pages/inventory/PurchaseInvoiceView'
import InventoryOverview from './pages/inventory/InventoryOverview'
import Assignments from './pages/inventory/Assignments'
import CreateAssignment from './pages/inventory/CreateAssignment'
import AssignToUser from './pages/inventory/AssignToUser'
import CreateUserAssignment from './pages/inventory/CreateUserAssignment'
import StoreTransfer from './pages/inventory/StoreTransfer'
import CreateStoreTransfer from './pages/inventory/CreateStoreTransfer'
import DeliveryChallanView from './pages/inventory/DeliveryChallanView'
import ProjectList from './pages/projects/ProjectList'
import CreateHDDProject from './pages/projects/CreateHDDProject'
import CreateSiteProject from './pages/projects/CreateSiteProject'
import HDDProjectDetail from './pages/projects/HDDProjectDetail'
import CreateHDDWorkOrder from './pages/projects/CreateHDDWorkOrder'
import SiteProjectDetail from './pages/projects/SiteProjectDetail'
import CreateSiteWorkOrder from './pages/projects/CreateSiteWorkOrder'
import AssetList from './pages/assets/AssetList'
import AddAsset from './pages/assets/AddAsset'
import AssetDetail from './pages/assets/AssetDetail'
import AssetReports from './pages/assets/AssetReports'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import AreaMapping from './pages/AreaMapping'
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
          <Route path="/intercom" element={<Navigate to="/intercom/dashboard" replace />} />
          <Route path="/intercom/dashboard" element={<IntercomDashboard />} />
          <Route path="/intercom/leads" element={<IntercomLeads />} />
          <Route path="/intercom/leads/new" element={<IntercomLeadNew />} />
          <Route path="/intercom/leads/new/existing" element={<IntercomLeadNewForm />} />
          <Route path="/intercom/leads/new/intercom-only" element={<IntercomLeadNewForm />} />
          <Route path="/intercom/leads/:id" element={<IntercomLeadDetail />} />
          <Route path="/intercom/leads/:id/:tab" element={<IntercomLeadDetail />} />
          <Route path="/intercom/customers/new" element={<IntercomCustomerNew />} />
          <Route path="/intercom/customers/:id" element={<IntercomCustomerDetail />} />
          <Route path="/intercom/customers/:id/:tab" element={<IntercomCustomerDetail />} />
          <Route path="/intercom/customers/:id/:tab/:subTab" element={<IntercomCustomerDetail />} />
          <Route path="/intercom/customers" element={<IntercomCustomers />} />
          <Route path="/intercom/installations/:id" element={<IntercomInstallationDetail />} />
          <Route path="/intercom/hardware-recovery" element={<IntercomHardwareRecovery />} />
          <Route path="/intercom/billing" element={<IntercomBilling />} />
          <Route path="/intercom/billing/recharge" element={<IntercomBilling />} />
          <Route path="/intercom/billing/payments" element={<IntercomBilling />} />
          <Route path="/installations" element={<Installations />} />
          <Route path="/installations/:id" element={<InstallationDetail />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/approvals/:approvalId" element={<ApprovalDetail />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/billing/package-recharge" element={<Billing />} />
          <Route path="/billing/tax-invoice" element={<Billing />} />
          <Route path="/billing/payment-history" element={<Billing />} />
          <Route path="/billing/invoice/:id" element={<InvoicePDF />} />
          <Route path="/support" element={<Support />} />
          <Route path="/support/ticket/:id" element={<TicketDetail />} />
          <Route path="/support/tickets" element={<TicketList />} />
          <Route path="/support/tickets/new" element={<TicketCreate />} />
          <Route path="/support/tickets/:id" element={<SupportTicketDetail />} />
          <Route path="/support/tickets/:id/:tab" element={<SupportTicketDetail />} />
          <Route path="/support/outages" element={<OutageList />} />
          <Route path="/support/outages/new" element={<OutageCreate />} />
          <Route path="/support/outages/:id" element={<OutageDetail />} />
          <Route path="/support/dashboard" element={<SupportDashboard />} />
          <Route path="/support/reports" element={<SupportReports />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/ott" element={<OTTManagement />} />
          <Route path="/packages/add" element={<PackageAdd />} />
          <Route path="/packages/:packageId/edit" element={<PackageEdit />} />
          <Route path="/packages/:packageId/:tab" element={<PackageDetail />} />
          <Route path="/packages/:packageId" element={<PackageDetail />} />
          <Route path="/network" element={<Network />} />
          <Route path="/network/servers" element={<NetworkServers />} />
          <Route path="/inventory" element={<Navigate to="/inventory/products" replace />} />
          <Route path="/inventory/overview" element={<InventoryOverview />} />
          <Route path="/inventory/products" element={<ProductList />} />
          <Route path="/inventory/vendors" element={<VendorList />} />
          <Route path="/inventory/vendors/:id" element={<VendorDetail />} />
          <Route path="/inventory/vendors/:id/:tab" element={<VendorDetail />} />
          <Route path="/inventory/stores" element={<StoreList />} />
          <Route path="/inventory/settings" element={<InventorySettings />} />
          <Route path="/inventory/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/inventory/purchase-orders/new" element={<CreatePO />} />
          <Route path="/inventory/purchase-orders/:id/edit" element={<CreatePO />} />
          <Route path="/inventory/purchase-orders/:id" element={<PODetail />} />
          <Route path="/inventory/purchases" element={<Purchases />} />
          <Route path="/inventory/purchases/new" element={<CreatePurchase />} />
          <Route path="/inventory/purchases/:id/edit" element={<CreatePurchase />} />
          <Route path="/inventory/purchases/:id/invoice" element={<PurchaseInvoiceView />} />
          <Route path="/inventory/purchases/:id" element={<PurchaseDetail />} />
          <Route path="/inventory/assign" element={<Assignments />} />
          <Route path="/inventory/assign/new" element={<CreateAssignment />} />
          <Route path="/inventory/assign/:id/edit" element={<CreateAssignment />} />
          <Route path="/inventory/assign-to-user" element={<AssignToUser />} />
          <Route path="/inventory/assign-to-user/new" element={<CreateUserAssignment />} />
          <Route path="/inventory/assign-to-user/:id/edit" element={<CreateUserAssignment />} />
          <Route path="/inventory/store-transfer" element={<StoreTransfer />} />
          <Route path="/inventory/store-transfer/new" element={<CreateStoreTransfer />} />
          <Route path="/inventory/store-transfer/:id/edit" element={<CreateStoreTransfer />} />
          <Route path="/inventory/store-transfer/:id/challan" element={<DeliveryChallanView />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/new/hdd" element={<CreateHDDProject />} />
          <Route path="/projects/new/site" element={<CreateSiteProject />} />
          <Route path="/projects/hdd/:id" element={<HDDProjectDetail />} />
          <Route path="/projects/hdd/:id/:tab" element={<HDDProjectDetail />} />
          <Route path="/projects/hdd/:id/work-orders/new" element={<CreateHDDWorkOrder />} />
          <Route path="/projects/site/:id" element={<SiteProjectDetail />} />
          <Route path="/projects/site/:id/:tab" element={<SiteProjectDetail />} />
          <Route path="/projects/site/:id/work-orders/new" element={<CreateSiteWorkOrder />} />
          <Route path="/assets" element={<AssetList />} />
          <Route path="/assets/new" element={<AddAsset />} />
          <Route path="/assets/new/:categoryId" element={<AddAsset />} />
          <Route path="/assets/new/:categoryId/:typeId" element={<AddAsset />} />
          <Route path="/assets/reports" element={<AssetReports />} />
          <Route path="/assets/:id" element={<AssetDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/master-config" element={<Settings />} />
          <Route path="/settings/master-config/:tab" element={<Settings />} />
          <Route path="/settings/area-mapping" element={<AreaMapping />} />
          <Route path="/settings/area-mapping/state" element={<AreaMapping />} />
          <Route path="/settings/area-mapping/district" element={<AreaMapping />} />
          <Route path="/settings/area-mapping/area" element={<AreaMapping />} />
          <Route path="/settings/area-mapping/locality" element={<AreaMapping />} />
          <Route path="/settings/area-mapping/sub-locality" element={<AreaMapping />} />
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
