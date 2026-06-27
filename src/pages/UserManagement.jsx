import { useState, useEffect, Component } from 'react'
import {
  Plus, Edit2, Eye, Users, UserCheck, UserX, Shield,
  Search, X, ChevronDown, CalendarDays, Phone, Mail,
  TrendingUp, PhoneCall, Clock, CheckCircle2,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select } from '../components/ui/FormInputs'
import { getUsers, addUser, updateUser, subscribeUsers } from '../data/userStore'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── User Form Modal ───────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', email: '', phone: '', role: '', status: 'active' }

function UserFormModal({ isOpen, onClose, user, onSave }) {
  const isEdit = !!user
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setForm(user ? { name: user.name, email: user.email, phone: user.phone ?? '', role: user.role, status: user.status } : EMPTY_FORM)
    setErrors({})
  }, [user, isOpen])

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function validate() {
    const e = {}
    if (!form.name.trim())  e.name  = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    if (!form.role)         e.role  = 'Role is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    onSave(form)
  }

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

function ViewUserModal({ isOpen, onClose, user, onEdit }) {
  if (!user) return null
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
            { icon: CalendarDays, label: 'Last Active', value: user.lastActive ? new Date(user.lastActive).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
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

// ── Main Page ─────────────────────────────────────────────────────────────────

function UserManagementInner() {
  const [users, setUsers]         = useState(getUsers)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd]     = useState(false)
  const [editUser, setEditUser]   = useState(null)
  const [viewUser, setViewUser]   = useState(null)

  useEffect(() => subscribeUsers(setUsers), [])

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
      updateUser({ ...editUser, ...formData })
      setEditUser(null)
    } else {
      addUser(formData)
      setShowAdd(false)
    }
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
                {['Name', 'Role', 'Status', 'Last Active', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm text-gray-400">
                    No users match your filters.
                  </td>
                </tr>
              ) : filtered.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                  {/* Name */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
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

                  {/* Last Active */}
                  <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                    {user.lastActive
                      ? new Date(user.lastActive).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
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
                    </div>
                  </td>
                </tr>
              ))}
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
      />

      {/* Edit User modal */}
      <UserFormModal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        user={editUser}
        onSave={handleSave}
      />

      {/* View User modal */}
      <ViewUserModal
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
        user={viewUser}
        onEdit={u => setEditUser(u)}
      />
    </div>
  )
}

export default function UserManagement() {
  return <ErrorBoundary><UserManagementInner /></ErrorBoundary>
}
