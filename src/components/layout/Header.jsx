import { useState } from 'react'
import { Bell, Search, Menu, ChevronDown } from 'lucide-react'

export default function Header({ onToggleSidebar }) {
  const [showNotifs, setShowNotifs] = useState(false)

  return (
    <header className="h-14 bg-white border-b border-surface-border flex items-center px-4 gap-4 sticky top-0 z-20 shadow-sm">
      <button
        onClick={onToggleSidebar}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers, tickets..."
            className="pl-8 pr-4 py-1.5 text-sm border border-surface-border rounded-lg bg-gray-50 w-full
              focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white
              placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 relative transition-colors"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-orange rounded-full" />
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-surface-border z-50">
              <div className="px-4 py-3 border-b border-surface-border">
                <p className="text-sm font-semibold text-gray-800">Notifications</p>
              </div>
              {[
                { text: '3 renewals due today', time: '5m ago', color: 'bg-amber-400' },
                { text: 'Ticket #TK-1024 escalated', time: '18m ago', color: 'bg-red-400' },
                { text: 'New lead from website', time: '1h ago', color: 'bg-brand-blue' },
                { text: 'Invoice #INV-8821 paid', time: '2h ago', color: 'bg-emerald-400' },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-surface-border last:border-0">
                  <span className={`w-2 h-2 mt-1.5 rounded-full ${n.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today date */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-navy/5 rounded-lg">
          <span className="text-xs text-navy font-medium">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
          <div className="w-7 h-7 bg-brand-orange rounded-full flex items-center justify-center text-white text-xs font-bold">
            AD
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">Admin</span>
          <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
        </div>
      </div>
    </header>
  )
}
