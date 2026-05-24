import { useState, useRef, useEffect } from 'react'
import { Bell, Search, Menu, ChevronDown, UserPlus, Clock, AlertCircle, MessageSquare, ArrowRight, CheckCheck, Users, Ticket } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getNotifications, markAsRead, markAllAsRead, subscribeNotifications,
} from '../../data/notificationStore'
import { getLeads, subscribeLeads } from '../../data/leadsStore'
import { CUSTOMERS } from '../../data/customersData'
import { MOCK_TICKETS } from '../../data/supportData'

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

const PIPELINE_LABEL = { B2C: 'Residential', B2B: 'Corporate', Custom: 'Custom' }

const STATUS_STYLE = {
  active:    'bg-emerald-100 text-emerald-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  inactive:  'bg-gray-100 text-gray-500',
  expired:   'bg-red-100 text-red-600',
}

export default function Header({ onToggleSidebar }) {
  const [showNotifs, setShowNotifs]   = useState(false)
  const [notifications, setNotifications] = useState(getNotifications())
  const [leads, setLeads]             = useState(getLeads)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch]   = useState(false)
  const notifsRef  = useRef(null)
  const searchRef  = useRef(null)
  const navigate   = useNavigate()

  useEffect(() => subscribeNotifications(setNotifications), [])
  useEffect(() => subscribeLeads(setLeads), [])

  useEffect(() => {
    if (!showNotifs) return
    function onClickOutside(e) {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showNotifs])

  useEffect(() => {
    if (!showSearch) return
    function onClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showSearch])

  const unreadCount    = notifications.filter(n => !n.read).length
  const dropdownNotifs = notifications.slice(0, 6)

  // ── Search logic ──────────────────────────────────────────────────────────
  const q = searchQuery.trim().toLowerCase()
  const searchResults = q.length >= 2 ? (() => {
    const matchedLeads = leads
      .filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.id.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map(l => ({
        type: 'lead',
        id:   l.id,
        title:  l.name,
        sub1:  l.stage,
        sub2:  PIPELINE_LABEL[l.pipeline] ?? l.pipeline,
        href:  `/sales/leads/${l.id}`,
      }))

    const matchedCustomers = CUSTOMERS
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        c.id.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map(c => ({
        type: 'customer',
        id:   c.id,
        title: c.name,
        sub1:  c.id,
        sub2:  c.status.charAt(0).toUpperCase() + c.status.slice(1),
        statusVariant: c.status,
        href: `/customers/${c.id}`,
      }))

    const matchedTickets = MOCK_TICKETS
      .filter(t =>
        t.customerName.toLowerCase().includes(q) ||
        t.issue.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map(t => ({
        type: 'ticket',
        id:   t.id,
        title: t.id,
        sub1:  t.issue,
        sub2:  t.customerName,
        href:  `/support/ticket/${t.id}`,
      }))

    return { leads: matchedLeads, customers: matchedCustomers, tickets: matchedTickets }
  })() : null

  const hasResults = searchResults && (
    searchResults.leads.length > 0 ||
    searchResults.customers.length > 0 ||
    searchResults.tickets.length > 0
  )

  function handleResultClick(href) {
    setShowSearch(false)
    setSearchQuery('')
    navigate(href)
  }

  return (
    <header className="h-14 bg-white border-b border-surface-border flex items-center px-4 gap-4 sticky top-0 z-20 shadow-sm">
      <button
        onClick={onToggleSidebar}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm relative" ref={searchRef}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSearch(true) }}
            onFocus={() => setShowSearch(true)}
            placeholder="Search customers, tickets..."
            className="pl-8 pr-4 py-1.5 text-sm border border-surface-border rounded-lg bg-gray-50 w-full
              focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white
              placeholder-gray-400"
          />
        </div>

        {/* Search dropdown */}
        {showSearch && searchQuery.length >= 2 && (
          <div className="absolute top-full mt-2 left-0 w-[420px] bg-white rounded-xl shadow-xl border border-surface-border z-50 overflow-hidden">
            {!hasResults ? (
              <div className="px-4 py-6 text-center">
                <Search size={20} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No results for <span className="font-semibold text-gray-600">"{searchQuery}"</span></p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[400px]">

                {/* Leads section */}
                {searchResults.leads.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-surface-border">
                      <Users size={11} className="text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Leads ({searchResults.leads.length})
                      </span>
                    </div>
                    {searchResults.leads.map(r => (
                      <button
                        key={r.id}
                        onClick={() => handleResultClick(r.href)}
                        className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-surface-border last:border-b-0 text-left"
                      >
                        <div className="w-7 h-7 bg-brand-blue/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <Users size={12} className="text-brand-blue" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                          <p className="text-xs text-gray-500">{r.sub1} · {r.sub2}</p>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 shrink-0 mt-1">{r.id}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Customers section */}
                {searchResults.customers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-surface-border">
                      <Users size={11} className="text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Customers ({searchResults.customers.length})
                      </span>
                    </div>
                    {searchResults.customers.map(r => (
                      <button
                        key={r.id}
                        onClick={() => handleResultClick(r.href)}
                        className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-surface-border last:border-b-0 text-left"
                      >
                        <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <Users size={12} className="text-emerald-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                          <p className="text-xs text-gray-500">{r.sub1}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-1 ${STATUS_STYLE[r.statusVariant] ?? 'bg-gray-100 text-gray-500'}`}>
                          {r.sub2}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Tickets section */}
                {searchResults.tickets.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-surface-border">
                      <MessageSquare size={11} className="text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Tickets ({searchResults.tickets.length})
                      </span>
                    </div>
                    {searchResults.tickets.map(r => (
                      <button
                        key={r.id}
                        onClick={() => handleResultClick(r.href)}
                        className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-surface-border last:border-b-0 text-left"
                      >
                        <div className="w-7 h-7 bg-brand-orange/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <MessageSquare size={12} className="text-brand-orange" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                          <p className="text-xs text-gray-500 truncate">{r.sub1}</p>
                          <p className="text-[11px] text-gray-400">{r.sub2}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
