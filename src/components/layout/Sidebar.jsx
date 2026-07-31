import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Receipt,
  HeadphonesIcon,
  Network,
  Package,
  BarChart3,
  Settings,
  Wifi,
  Boxes,
  Server,
  UserCog,
  UsersRound,
  Shield,
  Activity,
  Bell,
  PhoneCall,
  Layers,
  HardDrive,
  FileText,
  FileCheck,
  BarChart2,
  MapPin,
  ClipboardCheck,
  Wrench,
  Tv2,
  Phone,
  PackageSearch,
  Zap,
  ShieldCheck,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard',        icon: LayoutDashboard, to: '/',              exact: true },
  { label: 'Customers',        icon: Users,           to: '/customers'                 },
  { label: 'Installations',    icon: Wrench,          to: '/installations'             },
  { label: 'Approvals',        icon: ShieldCheck,     to: '/approvals'                 },
  {
    label: 'Sales & Leads',    icon: TrendingUp,      to: '/sales',         exact: true,
    children: [
      { label: 'Follow-ups',            icon: PhoneCall,      to: '/sales/followups'              },
      { label: 'Feasibility Requests',  icon: ClipboardCheck, to: '/sales/feasibility-requests'   },
      { label: 'Proposals',             icon: FileCheck,      to: '/sales/proposals'              },
      { label: 'Analytics',             icon: BarChart2,      to: '/sales/analytics'              },
    ],
  },
  {
    label: 'Intercom',        icon: Phone,           to: '/intercom/dashboard',
    children: [
      { label: 'Leads',             icon: PhoneCall,     to: '/intercom/leads'             },
      { label: 'Hardware Recovery', icon: PackageSearch, to: '/intercom/hardware-recovery' },
      { label: 'Customers',         icon: Users,         to: '/intercom/customers'         },
      { label: 'Dashboard',         icon: LayoutDashboard, to: '/intercom/dashboard'       },
    ],
  },
  { label: 'Billing & Invoice',icon: Receipt,         to: '/billing'                   },
  {
    label: 'Support & Tickets',icon: HeadphonesIcon,  to: '/support/dashboard',
    children: [
      { label: 'Ticket List', icon: ClipboardCheck,  to: '/support/tickets'   },
      { label: 'Outages',     icon: Zap,             to: '/support/outages'  },
      { label: 'Reports',     icon: BarChart2,       to: '/support/reports'  },
      { label: 'Dashboard',   icon: LayoutDashboard, to: '/support/dashboard' },
    ],
  },
  { label: 'Packages',         icon: Boxes,           to: '/packages'                  },
  { label: 'OTT',              icon: Tv2,             to: '/ott'                        },
  { label: 'Network',          icon: Network,         to: '/network',      exact: true  },
  { label: 'Jaze Servers',     icon: Server,          to: '/network/servers'           },
  {
    label: 'Inventory',        icon: Package,         to: '/inventory',
    children: [
      { label: 'HW Assignment', icon: HardDrive,  to: '/inventory/hw-assignment' },
    ],
  },
  { label: 'Resellers',        icon: UserCog,         to: '/resellers'                 },
  { label: 'Bandwidth',        icon: Activity,        to: '/bandwidth'                 },
  { label: 'Reports',          icon: BarChart3,       to: '/reports'                   },
  { label: 'Audit Log',        icon: Shield,          to: '/audit'                     },
  { label: 'User Management',  icon: UsersRound,      to: '/users'                     },
  { label: 'Settings',         icon: Settings,        to: '/settings',          exact: true },
  { label: 'Notifications',    icon: Bell,            to: '/notifications'                 },
]

export default function Sidebar({ collapsed }) {
  const location = useLocation()

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-navy flex flex-col z-30 transition-all duration-300
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 shrink-0">
        <div className="w-9 h-9 bg-brand-blue rounded-xl flex items-center justify-center shrink-0">
          <Wifi size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">Cityline</p>
            <p className="text-blue-300/70 text-xs">Networks Pvt Ltd</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ label, icon: Icon, to, exact, children }) => {
          const isActive = exact
            ? location.pathname === to
            : location.pathname.startsWith(to)
          const hasActiveChild = children?.some(c => location.pathname.startsWith(c.to))

          return (
            <div key={to}>
              <NavLink
                to={to}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150 group relative
                  ${isActive || hasActiveChild
                    ? 'bg-brand-blue text-white'
                    : 'text-blue-100/60 hover:bg-white/8 hover:text-white'
                  }
                `}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="flex-1">{label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md
                    opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    {label}
                  </div>
                )}
              </NavLink>

              {/* Sub-items — show when parent is active and sidebar is expanded */}
              {!collapsed && children && (isActive || hasActiveChild) && (
                <div className="ml-4 mt-0.5 space-y-0.5 pl-3 border-l border-white/10">
                  {children.map(child => {
                    const childActive = child.exact
                      ? location.pathname === child.to
                      : location.pathname.startsWith(child.to)
                    const ChildIcon = child.icon
                    return (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium
                          transition-all duration-150 group relative
                          ${childActive
                            ? 'bg-white/15 text-white'
                            : 'text-blue-100/50 hover:bg-white/8 hover:text-white'
                          }
                        `}
                      >
                        <ChildIcon size={14} className="shrink-0" />
                        <span>{child.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="shrink-0 px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-orange rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              AD
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white text-xs font-semibold truncate">Admin User</p>
              <p className="text-blue-300/60 text-xs truncate">admin@cityline.in</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
