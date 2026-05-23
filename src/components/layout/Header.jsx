import { useState, useRef, useEffect } from 'react'
import { Bell, Search, Menu, ChevronDown, UserPlus, Clock, AlertCircle, MessageSquare, ArrowRight, CheckCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  getNotifications, markAsRead, markAllAsRead, subscribeNotifications,
} from '../../data/notificationStore'

const TYPE_ICONS = {
  lead_assigned:    UserPlus,
  followup_due:     Clock,
  followup_overdue: AlertCircle,
  mention:          MessageSquare,
  stage_moved:      ArrowRight,
  followup_tomorrow: Clock,
}

const ICON_BG = {
  blue:   'bg-brand-blue/10 text-brand-blue',
  yellow: 'bg-amber-100 text-amber-500',
  red:    'bg-red-100 text-red-500',
  purple: 'bg-purple-100 text-purple-500',
}

const BORDER_HEX = {
  blue:   '#0A8DCD',
  yellow: '#F59E0B',
  red:    '#EF4444',
  purple: '#A855F7',
}

export default function Header({ onToggleSidebar }) {
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState(getNotifications())
  const notifsRef = useRef(null)

  useEffect(() => subscribeNotifications(setNotifications), [])

  useEffect(() => {
    if (!showNotifs) return
    function onClickOutside(e) {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showNotifs])

  const unreadCount = notifications.filter(n => !n.read).length
  const dropdownNotifs = notifications.slice(0, 6)

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
        {/* Notification bell */}
        <div className="relative" ref={notifsRef}>
          <button
            onClick={() => setShowNotifs(p => !p)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 relative transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-[22rem] bg-white rounded-xl shadow-xl border border-surface-border z-50 overflow-hidden">
              {/* Panel header */}
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-brand-blue hover:text-brand-blue-dark font-medium transition-colors"
                  >
                    <CheckCheck size={12} />
                    Mark all as read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto max-h-[400px]">
                {dropdownNotifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Bell size={24} className="text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">No notifications</p>
                  </div>
                ) : (
                  dropdownNotifs.map(n => {
                    const Icon = TYPE_ICONS[n.type] ?? Bell
                    return (
                      <div
                        key={n.id}
                        onClick={() => !n.read && markAsRead(n.id)}
                        className={`flex items-start gap-3 px-4 py-3 border-l-4 border-b border-surface-border last:border-b-0 cursor-pointer transition-colors hover:bg-gray-50/80 ${
                          n.read ? 'bg-white' : 'bg-blue-50/60'
                        }`}
                        style={{ borderLeftColor: BORDER_HEX[n.color] ?? BORDER_HEX.blue }}
                      >
                        <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${ICON_BG[n.color] ?? ICON_BG.blue}`}>
                          <Icon size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug ${n.read ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{n.meta} · {n.time}</p>
                        </div>
                        {!n.read && (
                          <span className="w-2 h-2 mt-1.5 bg-brand-blue rounded-full shrink-0" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-surface-border bg-gray-50/50">
                <Link
                  to="/notifications"
                  onClick={() => setShowNotifs(false)}
                  className="flex items-center justify-center gap-1.5 text-sm font-medium text-brand-blue hover:text-brand-blue-dark transition-colors"
                >
                  View all notifications
                  <ArrowRight size={13} />
                </Link>
              </div>
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
