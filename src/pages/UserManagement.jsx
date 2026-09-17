import { useState, useEffect, Component } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Edit2, Eye, Users, UserCheck, UserX, Shield,
  Search, X, ChevronDown, CalendarDays, Phone, Mail,
  TrendingUp, PhoneCall, Clock, KeyRound,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ResetLinkPanel from '../components/ResetLinkPanel'
import { getUsers, updateUser, subscribeUsers } from '../data/userStore'
import { useSession } from '../data/sessionStore'
import { createResetToken } from '../data/passwordResetStore'
import { getAuditLogs, subscribeAuditLogs } from '../data/auditLogStore'

// ── Error boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div className="p-10 flex flex-col items-center gap-3 text-center">
          <p className="text-red-600 font-semibold text-sm">Runtime error in User Management</p>
          <pre className="text-xs text-gray-500 bg-gray-50 rounded-lg p-4 max-w-xl text-left overflow-auto whitespace-pre-wrap">
            {String(this.state.error)}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Role metadata ─────────────────────────────────────────────────────────────
// Exported for UserAdd.jsx's Role dropdown (the Add/Edit User form, now a
// full page rather than a modal here) — kept in one place so the table's
// RoleBadge/filter and the form's options never drift apart.

export const ROLE_META = {
  super_admin: { label: 'Super Admin',    cls: 'bg-purple-100 text-purple-700 border border-purple-200' },
  admin:       { label: 'Admin',          cls: 'bg-blue-100 text-brand-blue border border-blue-200'     },
  billing:     { label: 'Billing Mgr',    cls: 'bg-teal-100 text-teal-700 border border-teal-200'       },
  support:     { label: 'Support Agent',  cls: 'bg-amber-100 text-amber-700 border border-amber-200'    },
  engineer:    { label: 'Field Engineer', cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
  readonly:    { label: 'Read Only',      cls: 'bg-gray-100 text-gray-600 border border-gray-200'       },
}

export const ROLES_OPTIONS = Object.entries(ROLE_META).map(([value, { label }]) => ({ value, label }))

// ── Helpers ───────────────────────────────────────────────────────────────────

// Both lookups match a user to Audit Log entries by email — the only field
// shared between userStore.js's users and auditLogStore.js's log entries
// (the log has no userId). auditLogStore.js always keeps entries
// newest-first (seed sorted descending by timestamp, logAudit() prepends),
// so the first match is the most recent one.

// Login events specifically (module: 'Auth', action: 'Login').
function getLastLogin(auditLogs, email) {
  return auditLogs.find(l => l.module === 'Auth' && l.action === 'Login' && l.user === email) ?? null
}

// Any action at all, login included — a real, live "Last Active" (unlike
// userStore.js's old lastActive field, which was frozen mock data: a
// hardcoded seed value that only ever got set once more, at account
// creation, and never updated again). Since acting requires being logged
// in first, this will always resolve to the same-or-newer entry than
// getLastLogin() for the same user.
function getLastActivity(auditLogs, email) {
  return auditLogs.find(l => l.user === email) ?? null
}

// auditLogStore.js's timestamp is 'YYYY-MM-DD HH:MM:SS' — full date+time
// precision, not date-only — so Last Login/Last Active can show real
// time-of-day, not a fabricated one. `.replace(' ', 'T')` makes it a valid
// ISO string the Date constructor parses reliably. Same day/month/year +
// hour/minute + hour12 options this app's other pages already use for a
// date-and-time display (formatDateTime() in OutageList.jsx,
// SupportTicketDetail.jsx, TicketCreate.jsx, Approvals.jsx, etc. — there's
// no single shared date-formatting util, just this same options object
// repeated per-file, reused here rather than inventing a new one-off shape).
function formatLogTimestamp(entry) {
  if (!entry) return '—'
  return new Date(entry.timestamp.replace(' ', 'T')).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function RoleBadge({ role }) {
  const meta = ROLE_META[role] ?? { label: role, cls: 'bg-gray-100 text-gray-600 border border-gray-200' }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

function Avatar({ user, size = 'md' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-xs'
  return (
    <div className={`${sz} ${user.color ?? 'bg-gray-400'} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {user.initials ?? '?'}
    </div>
  )
}

function StatusToggle({ active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        active ? 'bg-emerald-500' : 'bg-gray-300'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
        active ? 'translate-x-4.5' : 'translate-x-0.5'
      }`} />
    </button>
  )
}

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card px-5 py-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
      </div>
    </div>
  )
}

// ── View User Modal ───────────────────────────────────────────────────────────

function ViewUserModal({ isOpen, onClose, user, onEdit, auditLogs }) {
  if (!user) return null
  const lastActivity = getLastActivity(auditLogs, user.email)
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Details"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button icon={<Edit2 size={14} />} onClick={() => { onClose(); onEdit(user) }}>Edit</Button>
        </>
      }
    >
      <div className="py-1 space-y-5">
        <div className="flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div>
            <p className="font-bold text-gray-900 text-base">{user.name}</p>
            <RoleBadge role={user.role} />
          </div>
          <div className="ml-auto">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              {user.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {[
            { icon: Mail,         label: 'Email',       value: user.email         },
            { icon: Phone,        label: 'Phone',       value: user.phone || '—'  },
            { icon: CalendarDays, label: 'Last Active', value: formatLogTimestamp(lastActivity) },
            { icon: Clock,        label: 'Member Since', value: user.memberSince ? new Date(user.memberSince).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gray-50 border border-surface-border flex items-center justify-center shrink-0">
                <Icon size={13} className="text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 leading-none mb-0.5">{label}</p>
                <p className="text-sm font-medium text-gray-800">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="text-center p-3 bg-brand-blue/5 rounded-xl border border-brand-blue/15">
            <TrendingUp size={16} className="text-brand-blue mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{user.leadsAssigned ?? 0}</p>
            <p className="text-[11px] text-gray-500">Leads Assigned</p>
          </div>
          <div className="text-center p-3 bg-brand-orange/5 rounded-xl border border-brand-orange/15">
            <PhoneCall size={16} className="text-brand-orange mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{user.followupsTotal ?? 0}</p>
            <p className="text-[11px] text-gray-500">Total Follow-ups</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Reset Link Modal ──────────────────────────────────────────────────────────
// Simulates what a real app would email the user — see
// passwordResetStore.js's top-of-file comment. The admin never learns the
// user's actual new password; they only get this one-time link to relay.

function ResetLinkModal({ isOpen, onClose, user, token }) {
  if (!user || !token) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Password Reset Link"
      size="sm"
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <ResetLinkPanel email={user.email} token={token} />
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function UserManagementInner() {
  const navigate = useNavigate()
  const currentUser = useSession()
  const [users, setUsers]         = useState(getUsers)
  const [auditLogs, setAuditLogs] = useState(getAuditLogs)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewUser, setViewUser]   = useState(null)
  // The user + freshly generated token for the "reset link sent" modal —
  // see ResetLinkModal below and handleResetPassword.
  const [resetInfo, setResetInfo] = useState(null)

  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => subscribeAuditLogs(setAuditLogs), [])

  const totalUsers    = users.length
  const activeUsers   = users.filter(u => u.status === 'active').length
  const inactiveUsers = users.filter(u => u.status === 'inactive').length
  const rolesCount    = new Set(users.map(u => u.role)).size

  const filtered = users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter && u.role !== roleFilter) return false
    if (statusFilter && u.status !== statusFilter) return false
    return true
  })

  function toggleStatus(id) {
    const u = users.find(u => u.id === id)
    if (u) updateUser({ ...u, status: u.status === 'active' ? 'inactive' : 'active' })
  }

  // Generates a reset token (passwordResetStore.js) and shows it in
  // ResetLinkModal — the admin relays this link, never a password, to the
  // user. This is the only "reset" surface the admin gets; the user sets
  // their own new password on ResetPassword.jsx.
  function handleResetPassword(user) {
    const entry = createResetToken(user.id)
    setResetInfo({ user, token: entry.token })
  }

  function clearFilters() {
    setSearch('')
    setRoleFilter('')
    setStatusFilter('')
  }

  const hasFilters = search || roleFilter || statusFilter

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage team members and their access</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => navigate('/users/new')}>Add User</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={totalUsers}    icon={Users}       color="text-brand-blue"   bg="bg-brand-blue/10"   />
        <StatCard label="Active Users"   value={activeUsers}   icon={UserCheck}   color="text-emerald-700"  bg="bg-emerald-100"     />
        <StatCard label="Inactive Users" value={inactiveUsers} icon={UserX}       color="text-gray-500"     bg="bg-gray-100"        />
        <StatCard label="Roles"          value={rolesCount}    icon={Shield}      color="text-purple-700"   bg="bg-purple-100"      />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>

          {/* Role filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
            >
              <option value="">All Roles</option>
              {ROLES_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue bg-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={13} /> Clear
            </button>
          )}

          <span className="ml-auto text-xs text-gray-400">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {['Name', 'Mobile No.', 'Role', 'Status', 'Last Active', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-gray-400">
                    No users match your filters.
                  </td>
                </tr>
              ) : filtered.map(user => {
                const lastLogin = getLastLogin(auditLogs, user.email)
                const lastActivity = getLastActivity(auditLogs, user.email)
                return (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                  {/* Name */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          {user.name}
                          {currentUser?.id === user.id && (
                            <span className="px-1.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-semibold">You</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Mobile No. */}
                  <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                    {user.phone || '—'}
                  </td>

                  {/* Role */}
                  <td className="px-5 py-3.5">
                    <RoleBadge role={user.role} />
                  </td>

                  {/* Status toggle */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <StatusToggle
                        active={user.status === 'active'}
                        onToggle={() => toggleStatus(user.id)}
                      />
                      <span className={`text-xs font-semibold ${user.status === 'active' ? 'text-emerald-700' : 'text-gray-400'}`}>
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>

                  {/* Last Active — most recent Audit Log entry of any type for this user's email, live-subscribed */}
                  <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                    {formatLogTimestamp(lastActivity)}
                  </td>

                  {/* Last Login — most recent Audit Log 'Login' entry for this user's email, live-subscribed */}
                  <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                    {formatLogTimestamp(lastLogin)}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigate(`/users/${user.id}/edit`)}
                        className="p-1.5 rounded-lg hover:bg-brand-blue/10 text-gray-400 hover:text-brand-blue transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setViewUser(user)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                        title="Reset Password"
                      >
                        <KeyRound size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* View User modal */}
      <ViewUserModal
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
        user={viewUser}
        auditLogs={auditLogs}
        onEdit={u => navigate(`/users/${u.id}/edit`)}
      />

      {/* Reset password link modal */}
      <ResetLinkModal
        isOpen={!!resetInfo}
        onClose={() => setResetInfo(null)}
        user={resetInfo?.user}
        token={resetInfo?.token}
      />
    </div>
  )
}

export default function UserManagement() {
  return <ErrorBoundary><UserManagementInner /></ErrorBoundary>
}
