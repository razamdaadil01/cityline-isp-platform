import { useState, useMemo } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Shield,
  ChevronRight,
  Users,
  CheckSquare,
  Search,
  AlertTriangle,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

// ─── Constants ───────────────────────────────────────────────────────────────

const MODULES = [
  'Dashboard',
  'Customers',
  'Sales',
  'Billing',
  'Support',
  'Network',
  'Inventory',
  'Reports',
  'Settings',
  'Resellers',
  'Audit Log',
]

const ACTIONS = ['View', 'Create', 'Edit', 'Delete']

// Helper: build a full permissions object (all true or all false)
function buildPerms(defaultVal = false) {
  return Object.fromEntries(
    MODULES.map((m) => [m, Object.fromEntries(ACTIONS.map((a) => [a, defaultVal]))])
  )
}

// Helper: count how many permissions are enabled
function countPerms(perms) {
  return MODULES.reduce(
    (sum, m) => sum + ACTIONS.reduce((s, a) => s + (perms[m]?.[a] ? 1 : 0), 0),
    0
  )
}

// ─── Initial Roles Data ───────────────────────────────────────────────────────

const INITIAL_ROLES = [
  {
    id: 1,
    name: 'Super Admin',
    description: 'Full system access with no restrictions',
    usersCount: 2,
    color: 'navy',
    permissions: buildPerms(true),
  },
  {
    id: 2,
    name: 'Admin',
    description: 'Full access except system-level settings and audit log',
    usersCount: 5,
    color: 'blue',
    permissions: (() => {
      const p = buildPerms(true)
      p['Settings']['Delete'] = false
      p['Audit Log']['Create'] = false
      p['Audit Log']['Edit'] = false
      p['Audit Log']['Delete'] = false
      return p
    })(),
  },
  {
    id: 3,
    name: 'Billing Manager',
    description: 'Manage invoices, payments, and billing reports',
    usersCount: 3,
    color: 'green',
    permissions: (() => {
      const p = buildPerms(false)
      p['Dashboard']['View'] = true
      p['Billing']['View'] = true
      p['Billing']['Create'] = true
      p['Billing']['Edit'] = true
      p['Billing']['Delete'] = true
      p['Customers']['View'] = true
      p['Reports']['View'] = true
      return p
    })(),
  },
  {
    id: 4,
    name: 'Support Agent',
    description: 'Handle customer support tickets and inquiries',
    usersCount: 8,
    color: 'cyan',
    permissions: (() => {
      const p = buildPerms(false)
      p['Dashboard']['View'] = true
      p['Support']['View'] = true
      p['Support']['Create'] = true
      p['Support']['Edit'] = true
      p['Customers']['View'] = true
      p['Customers']['Edit'] = true
      return p
    })(),
  },
  {
    id: 5,
    name: 'Network Engineer',
    description: 'Manage network infrastructure and server configurations',
    usersCount: 4,
    color: 'purple',
    permissions: (() => {
      const p = buildPerms(false)
      p['Dashboard']['View'] = true
      p['Network']['View'] = true
      p['Network']['Create'] = true
      p['Network']['Edit'] = true
      p['Network']['Delete'] = true
      p['Inventory']['View'] = true
      p['Inventory']['Create'] = true
      p['Inventory']['Edit'] = true
      p['Reports']['View'] = true
      return p
    })(),
  },
  {
    id: 6,
    name: 'Field Technician',
    description: 'On-site installations, repairs, and inventory updates',
    usersCount: 12,
    color: 'orange',
    permissions: (() => {
      const p = buildPerms(false)
      p['Dashboard']['View'] = true
      p['Network']['View'] = true
      p['Network']['Edit'] = true
      p['Inventory']['View'] = true
      p['Inventory']['Edit'] = true
      p['Customers']['View'] = true
      return p
    })(),
  },
  {
    id: 7,
    name: 'Reseller',
    description: 'Manage reseller customers and view sales data',
    usersCount: 6,
    color: 'yellow',
    permissions: (() => {
      const p = buildPerms(false)
      p['Dashboard']['View'] = true
      p['Customers']['View'] = true
      p['Sales']['View'] = true
      p['Billing']['View'] = true
      p['Resellers']['View'] = true
      p['Resellers']['Create'] = true
      p['Resellers']['Edit'] = true
      return p
    })(),
  },
  {
    id: 8,
    name: 'Read Only',
    description: 'View-only access across all modules',
    usersCount: 3,
    color: 'gray',
    permissions: (() => {
      const p = buildPerms(false)
      MODULES.forEach((m) => { p[m]['View'] = true })
      return p
    })(),
  },
]

// ─── Permission Matrix Component ──────────────────────────────────────────────

function PermissionMatrix({ permissions, onChange }) {
  const total = countPerms(permissions)

  function toggleCell(module, action) {
    onChange(module, action, !permissions[module][action])
  }

  function toggleRow(module) {
    const allOn = ACTIONS.every((a) => permissions[module][a])
    ACTIONS.forEach((a) => onChange(module, a, !allOn))
  }

  function toggleColumn(action) {
    const allOn = MODULES.every((m) => permissions[m][action])
    MODULES.forEach((m) => onChange(m, action, !allOn))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          Toggle individual cells, entire rows, or column headers
        </p>
        <Badge variant="blue" size="sm">
          {total} / {MODULES.length * ACTIONS.length} permissions
        </Badge>
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-surface-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">
                Module
              </th>
              {ACTIONS.map((action) => {
                const allOn = MODULES.every((m) => permissions[m][action])
                return (
                  <th key={action} className="px-4 py-3 text-center w-20">
                    <button
                      onClick={() => toggleColumn(action)}
                      className="flex flex-col items-center gap-1 group"
                      title={`Toggle all ${action}`}
                    >
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide group-hover:text-brand-blue transition-colors">
                        {action}
                      </span>
                      <span
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          allOn
                            ? 'bg-brand-blue border-brand-blue'
                            : 'border-gray-300 group-hover:border-brand-blue/50'
                        }`}
                      >
                        {allOn && (
                          <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white">
                            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((module, idx) => {
              const rowAllOn = ACTIONS.every((a) => permissions[module][a])
              const rowAnyOn = ACTIONS.some((a) => permissions[module][a])
              return (
                <tr
                  key={module}
                  className={`border-b border-surface-border last:border-0 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  } hover:bg-brand-blue/5`}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRow(module)}
                      className="flex items-center gap-2 group text-left"
                      title={`Toggle all ${module} permissions`}
                    >
                      <span
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          rowAllOn
                            ? 'bg-brand-blue border-brand-blue'
                            : rowAnyOn
                            ? 'bg-brand-blue/20 border-brand-blue/50'
                            : 'border-gray-300 group-hover:border-brand-blue/50'
                        }`}
                      >
                        {rowAllOn && (
                          <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white">
                            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {rowAnyOn && !rowAllOn && (
                          <span className="w-2 h-0.5 bg-brand-blue rounded-full" />
                        )}
                      </span>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-brand-blue transition-colors">
                        {module}
                      </span>
                    </button>
                  </td>
                  {ACTIONS.map((action) => {
                    const checked = permissions[module][action]
                    return (
                      <td key={action} className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleCell(module, action)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            checked
                              ? 'bg-brand-blue border-brand-blue'
                              : 'border-gray-300 hover:border-brand-blue/60 hover:bg-brand-blue/5'
                          }`}
                        >
                          {checked && (
                            <svg viewBox="0 0 10 8" className="w-3 h-3 fill-white">
                              <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Slide-Over Panel ─────────────────────────────────────────────────────────

function SlideOver({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
              <Shield size={16} className="text-brand-blue" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border shrink-0 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ isOpen, onClose, onConfirm, roleName }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Delete Role</h3>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to delete <span className="font-medium text-gray-700">"{roleName}"</span>?
              This action cannot be undone and will remove the role from all assigned users.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Delete Role</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Role Form Fields ─────────────────────────────────────────────────────────

function RoleFormFields({ name, description, onNameChange, onDescChange }) {
  return (
    <div className="grid gap-4 mb-6">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Role Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Network Manager"
          className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescChange(e.target.value)}
          placeholder="Brief description of this role's responsibilities"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all resize-none"
        />
      </div>
    </div>
  )
}

// ─── Role Color Badge ─────────────────────────────────────────────────────────

const ROLE_BADGE_COLORS = {
  navy: 'navy',
  blue: 'blue',
  green: 'green',
  cyan: 'cyan',
  purple: 'purple',
  orange: 'orange',
  yellow: 'yellow',
  gray: 'gray',
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RolesSettings() {
  const [roles, setRoles] = useState(INITIAL_ROLES)
  const [search, setSearch] = useState('')

  // Slide-over state
  const [slideOver, setSlideOver] = useState({ open: false, mode: 'edit', roleId: null })

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPerms, setEditPerms] = useState(buildPerms(false))

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ open: false, roleId: null })

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredRoles = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return roles
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    )
  }, [roles, search])

  const totalUsers = useMemo(() => roles.reduce((s, r) => s + r.usersCount, 0), [roles])

  // ── Open edit slide-over ───────────────────────────────────────────────────

  function openEdit(role) {
    setEditName(role.name)
    setEditDesc(role.description)
    setEditPerms(JSON.parse(JSON.stringify(role.permissions)))
    setSlideOver({ open: true, mode: 'edit', roleId: role.id })
  }

  function openAdd() {
    setEditName('')
    setEditDesc('')
    setEditPerms(buildPerms(false))
    setSlideOver({ open: true, mode: 'add', roleId: null })
  }

  function closeSlideOver() {
    setSlideOver({ open: false, mode: 'edit', roleId: null })
  }

  // ── Permission toggle ──────────────────────────────────────────────────────

  function handlePermChange(module, action, value) {
    setEditPerms((prev) => ({
      ...prev,
      [module]: { ...prev[module], [action]: value },
    }))
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  function handleSave() {
    if (!editName.trim()) return
    if (slideOver.mode === 'edit') {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === slideOver.roleId
            ? { ...r, name: editName.trim(), description: editDesc.trim(), permissions: editPerms }
            : r
        )
      )
    } else {
      const newRole = {
        id: Date.now(),
        name: editName.trim(),
        description: editDesc.trim(),
        usersCount: 0,
        color: 'blue',
        permissions: editPerms,
      }
      setRoles((prev) => [...prev, newRole])
    }
    closeSlideOver()
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  function openDelete(role) {
    setDeleteModal({ open: true, roleId: role.id })
  }

  function confirmDelete() {
    setRoles((prev) => prev.filter((r) => r.id !== deleteModal.roleId))
    setDeleteModal({ open: false, roleId: null })
  }

  const deleteTarget = roles.find((r) => r.id === deleteModal.roleId)

  // ── Summary badge text ─────────────────────────────────────────────────────

  function permSummary(permissions) {
    const count = countPerms(permissions)
    const max = MODULES.length * ACTIONS.length
    if (count === max) return 'Full Access'
    if (count === 0) return 'No Access'
    const viewOnly = ACTIONS.slice(1).every(
      (a) => MODULES.every((m) => !permissions[m][a])
    )
    if (viewOnly) return 'View Only'
    return `${count} permissions`
  }

  function permBadgeVariant(permissions) {
    const count = countPerms(permissions)
    const max = MODULES.length * ACTIONS.length
    if (count === max) return 'navy'
    if (count === 0) return 'gray'
    if (count <= 6) return 'yellow'
    if (count <= 18) return 'cyan'
    return 'blue'
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <span>Settings</span>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">Role Management</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Role Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Define roles and configure granular module permissions for your team
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={15} />}
          onClick={openAdd}
        >
          Add Role
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Total Roles',
            value: roles.length,
            icon: Shield,
            color: 'bg-brand-blue/10 text-brand-blue',
          },
          {
            label: 'Total Users',
            value: totalUsers,
            icon: Users,
            color: 'bg-emerald-100 text-emerald-600',
          },
          {
            label: 'Permission Slots',
            value: `${MODULES.length * ACTIONS.length}`,
            sub: 'per role',
            icon: CheckSquare,
            color: 'bg-purple-100 text-purple-600',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-surface-border shadow-card px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {value}
                {sub && <span className="text-sm font-normal text-gray-400 ml-1">{sub}</span>}
              </p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card">
        {/* Table Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-gray-700">All Roles ({filteredRoles.length})</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles…"
              className="pl-8 pr-3 py-1.5 text-sm border border-surface-border rounded-lg w-56
                focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-surface-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Role Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Description
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Users
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Permissions
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">
                    No roles match your search.
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => {
                  const permCount = countPerms(role.permissions)
                  const summary = permSummary(role.permissions)
                  const badgeVariant = permBadgeVariant(role.permissions)
                  return (
                    <tr
                      key={role.id}
                      className="border-b border-surface-border last:border-0 hover:bg-gray-50/70 transition-colors"
                    >
                      {/* Role Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-navy/8 flex items-center justify-center shrink-0">
                            <Shield size={15} className="text-navy" />
                          </div>
                          <span className="font-semibold text-gray-900">{role.name}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-5 py-4 text-gray-500 max-w-xs">
                        <span className="line-clamp-2">{role.description || '—'}</span>
                      </td>

                      {/* Users Count */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 text-gray-600">
                          <Users size={13} className="text-gray-400" />
                          <span className="font-medium">{role.usersCount}</span>
                        </div>
                      </td>

                      {/* Permissions Badge */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={badgeVariant} size="md">
                            {summary}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {permCount}/{MODULES.length * ACTIONS.length}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(role)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
                              text-brand-blue bg-brand-blue/8 hover:bg-brand-blue/15 transition-colors"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => openDelete(role)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
                              text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Slide-Over */}
      <SlideOver
        isOpen={slideOver.open}
        onClose={closeSlideOver}
        title={slideOver.mode === 'add' ? 'Add New Role' : `Edit Role: ${editName}`}
        footer={
          <>
            <Button variant="secondary" onClick={closeSlideOver}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!editName.trim()}
            >
              {slideOver.mode === 'add' ? 'Create Role' : 'Save Role'}
            </Button>
          </>
        }
      >
        <RoleFormFields
          name={editName}
          description={editDesc}
          onNameChange={setEditName}
          onDescChange={setEditDesc}
        />

        <div className="mb-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-0.5">Permission Matrix</h3>
          <p className="text-xs text-gray-400 mb-4">
            Click a column header to toggle all rows for that action, or a row label to toggle all actions for that module.
          </p>
        </div>

        <PermissionMatrix permissions={editPerms} onChange={handlePermChange} />
      </SlideOver>

      {/* Delete Confirmation */}
      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, roleId: null })}
        onConfirm={confirmDelete}
        roleName={deleteTarget?.name}
      />
    </div>
  )
}
