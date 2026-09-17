import { useState, useEffect, useRef, Component } from 'react'
import {
  Plus, Edit2, Eye, Users, UserCheck, UserX, Shield,
  Search, X, ChevronDown, CalendarDays, Phone, Mail,
  TrendingUp, PhoneCall, Clock, CheckCircle2, AlertTriangle,
  KeyRound,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select } from '../components/ui/FormInputs'
import ResetLinkPanel from '../components/ResetLinkPanel'
import { getUsers, addUser, updateUser, subscribeUsers, hashPassword } from '../data/userStore'
import { useSession } from '../data/sessionStore'
import { createResetToken } from '../data/passwordResetStore'
import { getAuditLogs, subscribeAuditLogs } from '../data/auditLogStore'
import { getAreas, getAllLocalities } from '../data/areaMappingStore'
import { getActiveCompanyEntities } from '../data/companyEntities'

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

const ROLE_META = {
  super_admin: { label: 'Super Admin',    cls: 'bg-purple-100 text-purple-700 border border-purple-200' },
  admin:       { label: 'Admin',          cls: 'bg-blue-100 text-brand-blue border border-blue-200'     },
  billing:     { label: 'Billing Mgr',    cls: 'bg-teal-100 text-teal-700 border border-teal-200'       },
  support:     { label: 'Support Agent',  cls: 'bg-amber-100 text-amber-700 border border-amber-200'    },
  engineer:    { label: 'Field Engineer', cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
  readonly:    { label: 'Read Only',      cls: 'bg-gray-100 text-gray-600 border border-gray-200'       },
}

const ROLES_OPTIONS = Object.entries(ROLE_META).map(([value, { label }]) => ({ value, label }))

// Fixed skill list for Field Engineer (role='engineer') users — per client
// request, this only appears on the Add/Edit User form when that role is
// selected, same conditional-field convention as this form's own
// roleChanged self-lockout warning below.
const SKILL_OPTIONS = ['Fiber Installation', 'Router Repair', 'Cabling', 'OTT Setup', 'Network Troubleshooting']

// The real Customer Type enum, as it's actually stored/displayed on customer
// records (customersData.js's `customerType` field, AddCustomer.jsx,
// CustomerDetail.jsx, Customers.jsx's CUSTOMER_TYPE_STYLE/filter dropdown) —
// deliberately NOT customerTypes.js's getCustomerTypes() `name` field, which
// is a mismatched label ('Resident') from an unrelated Settings config
// entity (Lead ID/Customer ID format, PPPoE pattern, etc.), not the value
// actually written to/read from a customer record.
const CUSTOMER_TYPE_OPTIONS = ['Residential', 'Corporate']

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

// Closed-by-default multi-select: selected values show as removable chips
// inside the trigger field itself, click opens a checkbox-list panel below —
// same chip style (rounded-full bg-brand-blue/10 + X) and checkbox-list-row
// style as NasPortMultiSelect.jsx/AssignTeamModal.jsx's always-open
// multi-selects, and the same outside-click-close ref pattern
// Header.jsx's notification/search dropdowns use, just collapsed into a
// closed field instead of an always-expanded panel.
function SkillsMultiSelect({ options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function toggle(value) {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(o => !o)}
        className="w-full min-h-[38px] px-3 py-1.5 border border-surface-border rounded-lg bg-white flex items-center flex-wrap gap-1.5 cursor-pointer focus-within:ring-2 focus-within:ring-brand-blue/30 focus-within:border-brand-blue"
      >
        {selected.length === 0 ? (
          <span className="text-sm text-gray-400">Select skills…</span>
        ) : selected.map(value => (
          <span key={value} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
            {value}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); toggle(value) }}
              className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <ChevronDown size={13} className={`ml-auto text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-10 mt-1 w-full border border-surface-border rounded-lg bg-white shadow-lg divide-y divide-surface-border overflow-hidden">
          {options.map(value => {
            const isSelected = selected.includes(value)
            return (
              <label key={value}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(value)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                />
                <span className="text-sm text-gray-700">{value}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── User Form Modal ───────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', email: '', phone: '', role: '', status: 'active', password: '',
  zone: '', skills: [], companyId: '', area: '', customerType: '',
}

function UserFormModal({ isOpen, onClose, user, onSave, currentUserId }) {
  const isEdit = !!user
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  // There's no genuine, independently-scoped "Branch" master entity anywhere
  // in this app — areaMappingStore.js's own comments say so explicitly
  // ("no canonical Branch master to foreign-key against yet"), and its
  // branchCode field is Sub-Locality provisioning metadata that mixes two
  // unrelated ID schemes across regions (sequential CNPL-00N for
  // Noida/Bangalore rows, zone-coded CNPL-<ZONE>-01 for the Mumbai suburb
  // rows) — pulling a dropdown from it produced a confusing mixed list.
  // role='engineer' users' real geographic field for this purpose is
  // `zone` (e.g. 'Andheri West', 'Whitefield') — plain locality names, the
  // same tier areaMappingStore.js's own getAllLocalities() already exposes
  // for pickers elsewhere (e.g. Outage Management's Affected Area(s)). This
  // field reuses that as the one real "Branch/Zone" equivalent, rather than
  // branchCode. `area` is the tier above locality (e.g. 'Mumbai', 'Noida').
  // Company options reuse Company/Entity settings data (Active only, same
  // convention as CreatePO.jsx/AddAsset.jsx/ProductList.jsx's own company
  // pickers).
  const zoneOptions = getAllLocalities()
  const areaOptions = [...new Set(getAreas().map(a => a.area))].sort()
  const companyOptions = getActiveCompanyEntities()

  useEffect(() => {
    // password always starts blank, even when editing — we never display an
    // existing password, and a blank value on save means "leave unchanged"
    // (see handleSave in UserManagementInner).
    setForm(user ? {
      name: user.name, email: user.email, phone: user.phone ?? '', role: user.role, status: user.status, password: '',
      zone: user.zone ?? '', skills: user.skills ?? [], companyId: user.companyId ?? '', area: user.area ?? '', customerType: user.customerType ?? '',
    } : EMPTY_FORM)
    setErrors({})
  }, [user, isOpen])

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function validate() {
    const e = {}
    if (!form.name.trim())  e.name  = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    if (!form.role)         e.role  = 'Role is required'
    if (!isEdit && !form.password.trim()) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    // Hash a non-blank password before it ever reaches addUser()/updateUser()
    // — a blank value (edit mode only, meaning "leave unchanged") is left
    // as '' so handleSave's "blank means unchanged" check in
    // UserManagementInner still works; hashPassword('') would otherwise be
    // a non-empty string and look like an intentional change.
    onSave({
      ...form,
      password: form.password.trim() ? hashPassword(form.password.trim()) : '',
      // Skill only ever applies to Field Engineer — drop any stale
      // selection left over from before the role was switched away.
      skills: form.role === 'engineer' ? form.skills : [],
    })
  }

  // Self-lockout warning: editing your own role to something other than
  // what it currently is changes what getCurrentUserRole() resolves to on
  // its next call (it always re-reads live, never caches) — so already
  // gated UI on this page reflects it on its next render (e.g. navigating
  // elsewhere), even without logging out and back in first.
  const isSelf = isEdit && user.id === currentUserId
  const roleChanged = isSelf && form.role && form.role !== user.role

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit User' : 'Add User'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Add User'}</Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        {/* Activity stats for edit */}
        {isEdit && user && (
          <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl border border-surface-border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp size={13} className="text-brand-blue" />
                <p className="text-xs font-semibold text-gray-500">Leads</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{user.leadsAssigned ?? 0}</p>
            </div>
            <div className="text-center border-x border-surface-border">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <PhoneCall size={13} className="text-brand-orange" />
                <p className="text-xs font-semibold text-gray-500">Follow-ups</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{user.followupsTotal ?? 0}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Clock size={13} className="text-gray-400" />
                <p className="text-xs font-semibold text-gray-500">Member Since</p>
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {user.memberSince ? new Date(user.memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        )}

        <FormField label="Full Name" required error={errors.name}>
          <Input
            placeholder="e.g. Arjun Kumar"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            error={!!errors.name}
          />
        </FormField>

        <FormField label="Email" required error={errors.email}>
          <Input
            type="email"
            placeholder="e.g. arjun@cityline.in"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            error={!!errors.email}
          />
        </FormField>

        <FormField
          label="Password"
          required={!isEdit}
          error={errors.password}
          hint={isEdit ? 'Leave blank to keep the current password' : 'Used to sign in via /login (demo-grade — see sessionStore.js)'}
        >
          <Input
            type="password"
            placeholder={isEdit ? '••••••••' : 'Set a password'}
            value={form.password}
            onChange={e => set('password', e.target.value)}
            error={!!errors.password}
          />
        </FormField>

        <FormField label="Phone">
          <Input
            type="tel"
            placeholder="e.g. 9876543210"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
          />
        </FormField>

        <FormField label="Role" required error={errors.role}>
          <Select value={form.role} onChange={e => set('role', e.target.value)} error={!!errors.role}>
            <option value="">Select role…</option>
            {ROLES_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </FormField>

        {roleChanged && (
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              You're changing your own role — this may restrict your own access until you log in again.
            </p>
          </div>
        )}

        {form.role === 'engineer' && (
          <FormField label="Skills" hint="Only shown for Field Engineer">
            <SkillsMultiSelect
              options={SKILL_OPTIONS}
              selected={form.skills}
              onChange={skills => set('skills', skills)}
            />
          </FormField>
        )}

        <FormField label="Company">
          <Select value={form.companyId} onChange={e => set('companyId', e.target.value)}>
            <option value="">Select company…</option>
            {companyOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FormField>

        <FormField label="Area">
          <Select value={form.area} onChange={e => set('area', e.target.value)}>
            <option value="">Select area…</option>
            {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
        </FormField>

        <FormField label="Zone">
          <Select value={form.zone} onChange={e => set('zone', e.target.value)}>
            <option value="">Select zone…</option>
            {zoneOptions.map(z => <option key={z} value={z}>{z}</option>)}
          </Select>
        </FormField>

        <FormField label="Customer Type">
          <Select value={form.customerType} onChange={e => set('customerType', e.target.value)}>
            <option value="">Select customer type…</option>
            {CUSTOMER_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>

        <FormField label="Status">
          <div className="flex items-center gap-3 h-9">
            <StatusToggle active={form.status === 'active'} onToggle={() => set('status', form.status === 'active' ? 'inactive' : 'active')} />
            <span className={`text-sm font-semibold ${form.status === 'active' ? 'text-emerald-700' : 'text-gray-500'}`}>
              {form.status === 'active' ? 'Active' : 'Inactive'}
            </span>
            {form.status === 'inactive' && (
              <span className="text-xs text-gray-400 ml-1">— User will not appear in assignments or mentions</span>
            )}
          </div>
        </FormField>
      </div>
    </Modal>
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
  const currentUser = useSession()
  const [users, setUsers]         = useState(getUsers)
  const [auditLogs, setAuditLogs] = useState(getAuditLogs)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd]     = useState(false)
  const [editUser, setEditUser]   = useState(null)
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

  function handleSave(formData) {
    if (editUser) {
      // Blank password means "leave unchanged" — never overwrite an
      // existing password with an empty string.
      const { password, ...rest } = formData
      updateUser({ ...editUser, ...rest, ...(password.trim() ? { password } : {}) })
      setEditUser(null)
    } else {
      addUser(formData)
      setShowAdd(false)
    }
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
        <Button icon={<Plus size={15} />} onClick={() => setShowAdd(true)}>Add User</Button>
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
                        onClick={() => setEditUser(user)}
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

      {/* Add User modal */}
      <UserFormModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        user={null}
        onSave={handleSave}
        currentUserId={currentUser?.id}
      />

      {/* Edit User modal */}
      <UserFormModal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        user={editUser}
        onSave={handleSave}
        currentUserId={currentUser?.id}
      />

      {/* View User modal */}
      <ViewUserModal
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
        user={viewUser}
        auditLogs={auditLogs}
        onEdit={u => setEditUser(u)}
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
