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
  Shield,
  Activity,
  Bell,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard',        icon: LayoutDashboard, to: '/',              exact: true },
  { label: 'Customers',        icon: Users,           to: '/customers'                 },
  { label: 'Sales & Leads',    icon: TrendingUp,      to: '/sales'                     },
  { label: 'Billing & Invoice',icon: Receipt,         to: '/billing'                   },
  { label: 'Support & Tickets',icon: HeadphonesIcon,  to: '/support'                   },
  { label: 'Packages',         icon: Boxes,           to: '/packages'                  },
  { label: 'Network',          icon: Network,         to: '/network',      exact: true  },
  { label: 'Jaze Servers',     icon: Server,          to: '/network/servers'           },
  { label: 'Inventory',        icon: Package,         to: '/inventory'                 },
  { label: 'Resellers',        icon: UserCog,         to: '/resellers'                 },
  { label: 'Bandwidth',        icon: Activity,        to: '/bandwidth'                 },
  { label: 'Reports',          icon: BarChart3,       to: '/reports'                   },
  { label: 'Audit Log',        icon: Shield,          to: '/audit'                     },
  { label: 'Settings',         icon: Settings,        to: '/settings',          exact: true },
  { label: 'Notifications',    icon: Bell,            to: '/notification-settings'         },
  { label: 'Roles',            icon: Shield,          to: '/settings/roles'                },
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
        {NAV_ITEMS.map(({ label, icon: Icon, to, exact }) => {
          const isActive = exact
            ? location.pathname === to
            : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 group relative
                ${isActive
                  ? 'bg-brand-blue text-white'
                  : 'text-blue-100/60 hover:bg-white/8 hover:text-white'
                }
              `}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md
                  opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  {label}
                </div>
              )}
            </NavLink>
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
