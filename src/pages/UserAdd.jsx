import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Camera, User as UserIcon, X, ChevronDown,
  TrendingUp, PhoneCall, Clock, AlertTriangle,
} from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select } from '../components/ui/FormInputs'
import { addUser, updateUser, hashPassword } from '../data/userStore'
import { useSession } from '../data/sessionStore'
import { getAreas, getAllLocalities } from '../data/areaMappingStore'
import { getActiveCompanyEntities } from '../data/companyEntities'
import { getDepartments, subscribeDepartments } from '../data/departmentStore'
import { ROLES_OPTIONS } from './UserManagement'

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

function initialsFromName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return (first + last).toUpperCase()
}

// Circular profile-picture upload — same FileReader.readAsDataURL capture
// pattern as SalesNewLead.jsx's ProfilePictureUpload/CustomerDetail.jsx's
// KYC document uploads (a data URL is the only way to keep real image data
// on a record with no file-storage backend behind it). The no-photo-yet
// fallback matches this app's own colored-initials Avatar convention (the
// User Management table), rather than SalesNewLead's generic blue-tinted
// circle, so a new user's picture slot looks like the avatar it'll become.
function ProfilePictureUpload({ name, color, photoUrl, onChange }) {
  const inputRef = useRef(null)
  const initials = initialsFromName(name)

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="relative">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden text-white text-xl font-bold ${photoUrl ? '' : (color ?? 'bg-brand-blue')}`}>
          {photoUrl
            ? <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            : (initials || <UserIcon size={28} />)}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center shadow-md border-2 border-white hover:bg-brand-blue/90 transition-colors"
        >
          <Camera size={13} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }}
        />
      </div>
      <p className="text-xs text-gray-500">Profile Picture</p>
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

const EMPTY_FORM = {
  name: '', email: '', phone: '', role: '', status: 'active', password: '',
  photoUrl: '', departmentId: '', zone: '', skills: [], companyId: '', area: '', customerType: '',
}

function formFromUser(user) {
  return user ? {
    name: user.name, email: user.email, phone: user.phone ?? '', role: user.role, status: user.status, password: '',
    photoUrl: user.photoUrl ?? '', departmentId: user.departmentId ?? '',
    zone: user.zone ?? '', skills: user.skills ?? [], companyId: user.companyId ?? '', area: user.area ?? '', customerType: user.customerType ?? '',
  } : EMPTY_FORM
}

// Add User / Edit User — a full page (moved off the old Add/Edit modal),
// same "shared form component, `user` prop switches it into edit mode"
// convention as SalesNewLead.jsx/SalesEditLead.jsx. Page layout (header with
// back button, single form card, fixed bottom Cancel/Submit bar) follows
// PackageAdd.jsx's single-step "add new record" page convention.
export default function UserAdd({ user = null } = {}) {
  const navigate = useNavigate()
  const currentUser = useSession()
  const isEdit = !!user

  const [form, setForm] = useState(() => formFromUser(user))
  const [errors, setErrors] = useState({})

  const [departments, setDepartments] = useState(getDepartments)
  useEffect(() => subscribeDepartments(setDepartments), [])

  // There's no genuine, independently-scoped "Branch" master entity anywhere
  // in this app — areaMappingStore.js's own comments say so explicitly
  // ("no canonical Branch master to foreign-key against yet"), and its
  // branchCode field is Sub-Locality provisioning metadata that mixes two
  // unrelated ID schemes across regions. role='engineer' users' real
  // geographic field for this purpose is `zone` (e.g. 'Andheri West') —
  // plain locality names, the same tier areaMappingStore.js's own
  // getAllLocalities() already exposes for pickers elsewhere. `area` is the
  // tier above locality (e.g. 'Mumbai', 'Noida'). Company options reuse
  // Company/Entity settings data (Active only, same convention as
  // CreatePO.jsx/AddAsset.jsx/ProductList.jsx's own company pickers).
  const zoneOptions = getAllLocalities()
  const areaOptions = [...new Set(getAreas().map(a => a.area))].sort()
  const companyOptions = getActiveCompanyEntities()

  useEffect(() => {
    setForm(formFromUser(user))
    setErrors({})
  }, [user])

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
    // as '' so the merge below still works; hashPassword('') would
    // otherwise be a non-empty string and look like an intentional change.
    const payload = {
      ...form,
      password: form.password.trim() ? hashPassword(form.password.trim()) : '',
      // Skill only ever applies to Field Engineer — drop any stale
      // selection left over from before the role was switched away.
      skills: form.role === 'engineer' ? form.skills : [],
    }
    if (isEdit) {
      const { password, ...rest } = payload
      updateUser({ ...user, ...rest, ...(password.trim() ? { password } : {}) })
    } else {
      addUser(payload)
    }
    navigate('/users')
  }

  // Self-lockout warning: editing your own role to something other than
  // what it currently is changes what getCurrentUserRole() resolves to on
  // its next call (it always re-reads live, never caches) — so already
  // gated UI on this page reflects it on its next render (e.g. navigating
  // elsewhere), even without logging out and back in first.
  const isSelf = isEdit && user.id === currentUser?.id
  const roleChanged = isSelf && form.role && form.role !== user.role

  return (
    <div className="p-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/users')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit User' : 'Add User'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEdit ? `Update ${user.name}'s account details` : 'Create a new team member account'}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-card border border-surface-border p-6 space-y-5">
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

        {/* Profile Picture + Full Name/Email */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-5 border-b border-surface-border">
          <ProfilePictureUpload
            name={form.name}
            color={user?.color}
            photoUrl={form.photoUrl}
            onChange={url => set('photoUrl', url)}
          />
          <div className="hidden sm:block w-px self-stretch bg-surface-border shrink-0" />
          <div className="flex-1 w-full space-y-4">
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
          </div>
        </div>

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

        <FormField label="Department">
          <Select value={form.departmentId} onChange={e => set('departmentId', e.target.value)}>
            <option value="">Select department…</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </FormField>

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
            <button
              onClick={() => set('status', form.status === 'active' ? 'inactive' : 'active')}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                form.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                form.status === 'active' ? 'translate-x-4.5' : 'translate-x-0.5'
              }`} />
            </button>
            <span className={`text-sm font-semibold ${form.status === 'active' ? 'text-emerald-700' : 'text-gray-500'}`}>
              {form.status === 'active' ? 'Active' : 'Inactive'}
            </span>
            {form.status === 'inactive' && (
              <span className="text-xs text-gray-400 ml-1">— User will not appear in assignments or mentions</span>
            )}
          </div>
        </FormField>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-border px-6 py-3 flex items-center justify-end gap-3 z-10">
        <Button variant="secondary" onClick={() => navigate('/users')}>Cancel</Button>
        <Button onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Add User'}</Button>
      </div>
    </div>
  )
}
