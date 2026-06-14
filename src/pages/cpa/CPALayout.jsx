import React, { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { LayoutDashboard, Calendar, Users, FileText, Receipt, MessageSquare, Star, User, Settings, CalendarDays, ChevronLeft, Menu } from 'lucide-react'

const NAV = [
  { label: 'Dashboard',    icon: LayoutDashboard, path: '/cpa/dashboard' },
  { label: 'Appointments', icon: Calendar,         path: '/cpa/appointments' },
  { label: 'Calendar',     icon: CalendarDays,     path: '/cpa/calendar' },
  { label: 'My Clients',   icon: Users,            path: '/cpa/clients' },
  { label: 'Documents',    icon: FileText,          path: '/cpa/documents' },
  { label: 'Invoices',     icon: Receipt,           path: '/cpa/invoices' },
  { label: 'Messages',     icon: MessageSquare,     path: '/cpa/messages' },
  { label: 'Reviews',      icon: Star,              path: '/cpa/reviews' },
  { label: 'Profile',      icon: User,              path: '/cpa/profile' },
  { label: 'Settings',     icon: Settings,          path: '/cpa/settings' },
]

export default function CPALayout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className={`${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 bg-[#1B3A5C] flex flex-col transition-all duration-200`}>
        <div className="h-16 flex items-center px-4 border-b border-white/10 gap-3">
          {!collapsed && <span className="text-white font-bold text-lg tracking-tight">CPA Connect</span>}
          <button onClick={() => setCollapsed(c => !c)} className="ml-auto text-white/60 hover:text-white">
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV.map(item => {
            const active = location.pathname === item.path || (item.path !== '/cpa/dashboard' && location.pathname.startsWith(item.path))
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  active ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}>
                <item.icon size={17} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
        {!collapsed && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E8541A] flex items-center justify-center text-white text-xs font-bold">EO</div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">Emeka Okonkwo</p>
                <p className="text-white/50 text-xs truncate">ICAN-2019-07831</p>
              </div>
            </div>
          </div>
        )}
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
