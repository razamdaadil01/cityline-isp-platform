import { useState, useEffect } from 'react'
import { Bell, UserPlus, Clock, AlertCircle, MessageSquare, ArrowRight, CheckCheck, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../components/ui/Button'
import {
  getNotifications, markAsRead, markAllAsRead, clearNotifications, subscribeNotifications,
} from '../data/notificationStore'

const FILTER_TABS = [
  { id: 'all',       label: 'All' },
  { id: 'unread',    label: 'Unread' },
  { id: 'followups', label: 'Follow-ups' },
  { id: 'mentions',  label: 'Mentions' },
  { id: 'stage',     label: 'Stage Updates' },
  { id: 'assigned',  label: 'Assigned' },
]

const TYPE_ICONS = {
  lead_assigned:     UserPlus,
  followup_due:      Clock,
  followup_overdue:  AlertCircle,
  mention:           MessageSquare,
  stage_moved:       ArrowRight,
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

const PER_PAGE = 10

function NotificationRow({ n, onMarkRead }) {
  const Icon = TYPE_ICONS[n.type] ?? Bell

  return (
    <div
      className={`flex items-start gap-4 px-5 py-4 border-l-4 border-b border-surface-border last:border-b-0 transition-colors hover:bg-gray-50/60 ${
        n.read ? 'bg-white' : 'bg-blue-50/60'
      }`}
      style={{ borderLeftColor: BORDER_HEX[n.color] ?? BORDER_HEX.blue }}
    >
      <div className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${ICON_BG[n.color] ?? ICON_BG.blue}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm ${n.read ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>
            {n.title}
          </p>
          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 mt-0.5">{n.time}</span>
        </div>
        <p className="text-sm text-gray-600 mt-0.5">{n.description}</p>
        <p className="text-xs text-gray-400 mt-1">{n.meta}</p>
      </div>
      {!n.read && (
        <button
          onClick={() => onMarkRead(n.id)}
          title="Mark as read"
          className="shrink-0 mt-1 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-brand-blue/10 text-brand-blue transition-colors"
        >
          <CheckCheck size={14} />
        </button>
      )}
    </div>
  )
}

export default function Notifications() {
  const [notifications, setNotifications] = useState(getNotifications())
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => subscribeNotifications(setNotifications), [])
  useEffect(() => setPage(1), [filter])

  const filtered = notifications.filter(n => {
    switch (filter) {
      case 'unread':    return !n.read
      case 'followups': return ['followup_due', 'followup_overdue', 'followup_tomorrow'].includes(n.type)
      case 'mentions':  return n.type === 'mention'
      case 'stage':     return n.type === 'stage_moved'
      case 'assigned':  return n.type === 'lead_assigned'
      default:          return true
    }
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<CheckCheck size={14} />}
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={clearNotifications}
            disabled={notifications.length === 0}
          >
            Clear all
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_TABS.map(tab => {
          const isActive = filter === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                isActive
                  ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                  : 'bg-white text-gray-500 border-surface-border hover:border-brand-blue/40 hover:text-brand-blue'
              }`}
            >
              {tab.label}
              {tab.id === 'unread' && unreadCount > 0 && (
                <span className={`ml-1.5 text-[10px] font-bold px-1 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600'}`}>
                  {unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Notifications list */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Bell size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No notifications</p>
            <p className="text-xs text-gray-400 mt-1">Nothing here for this filter</p>
          </div>
        ) : (
          paginated.map(n => (
            <NotificationRow key={n.id} n={n} onMarkRead={markAsRead} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-medium text-gray-600">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
