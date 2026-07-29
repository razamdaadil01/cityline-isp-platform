import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

// Ticket Detail gets more room by auto-collapsing the sidebar while it's open;
// the user's manual collapsed/expanded preference (`collapsed`) is left untouched
// so leaving the page restores exactly what it was before.
const AUTO_COLLAPSE_PATTERN = /^\/support\/tickets\/[^/]+\/(overview|communication|internal-notes|activity-log)/

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const forceCollapsed = AUTO_COLLAPSE_PATTERN.test(location.pathname)
  const effectiveCollapsed = forceCollapsed || collapsed

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar collapsed={effectiveCollapsed} />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${effectiveCollapsed ? 'ml-16' : 'ml-60'}`}>
        <Header onToggleSidebar={() => setCollapsed(c => !c)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
