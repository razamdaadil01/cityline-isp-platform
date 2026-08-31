import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, X, MoreVertical, Eye, Edit2, CheckCircle2, XCircle, Truck,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormInputs'
import ColumnManager, { useColumnPrefs } from '../../components/table/ColumnManager'
import ContactsEditor, { EMPTY_CONTACT, validateContacts } from '../../components/inventory/ContactsEditor'
import {
  getVendors, subscribeVendors, saveVendor, setVendorStatus,
  isVendorNameTaken, PAYMENT_TERMS, getContacts,
} from '../../data/vendorStore'
import { usePermission } from '../../data/rolesStore'

const VENDOR_TABLE_COLUMNS = [
  { key: 'companyName',   label: 'Vendor Name',        visible: true, defaultVisible: true, locked: true },
  { key: 'gstNumber',     label: 'GST Number',         visible: true, defaultVisible: true },
  { key: 'primaryContact',label: 'Primary Contact',    visible: true, defaultVisible: true },
  { key: 'contactNumber', label: 'Contact Number',     visible: true, defaultVisible: true },
  { key: 'paymentTerms',  label: 'Payment Terms',      visible: true, defaultVisible: true },
  { key: 'outstanding',   label: 'Outstanding Amount', visible: true, defaultVisible: true },
  { key: 'lastPurchase',  label: 'Last Purchase',      visible: true, defaultVisible: true },
  { key: 'status',        label: 'Status',             visible: true, defaultVisible: true },
  { key: 'actions',       label: 'Actions',            visible: true, defaultVisible: true },
]

function emptyForm() {
  return {
    companyName: '', gstNumber: '', address: '', paymentTerms: PAYMENT_TERMS[0],
    contacts: [{ ...EMPTY_CONTACT }],
    isHDDContractor: false, drillingRatePerMeter: '',
  }
}

function vendorToForm(vendor) {
  return {
    companyName: vendor.companyName, gstNumber: vendor.gstNumber, address: vendor.address,
    paymentTerms: vendor.paymentTerms,
    contacts: getContacts(vendor).length ? getContacts(vendor).map(c => ({ ...c })) : [{ ...EMPTY_CONTACT }],
    isHDDContractor: !!vendor.isHDDContractor,
    drillingRatePerMeter: vendor.drillingRatePerMeter != null ? String(vendor.drillingRatePerMeter) : '',
  }
}

function AddEditVendorModal({ isOpen, onClose, editing }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isOpen) return
    setForm(editing ? vendorToForm(editing) : emptyForm())
    setErrors({})
  }, [isOpen, editing])

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  function validate() {
    const errs = {}
    if (!form.companyName.trim()) {
      errs.companyName = 'Company name is required.'
    } else if (isVendorNameTaken(form.companyName.trim(), editing?.id ?? null)) {
      errs.companyName = `"${form.companyName.trim()}" already exists. Please use a different vendor name.`
    }
    if (!form.gstNumber.trim()) errs.gstNumber = 'GST number is required.'
    if (!form.address.trim()) errs.address = 'Address is required.'
    if (form.isHDDContractor && (form.drillingRatePerMeter === '' || Number.isNaN(Number(form.drillingRatePerMeter)) || Number(form.drillingRatePerMeter) < 0)) {
      errs.drillingRatePerMeter = 'Enter a valid drilling rate per meter.'
    }
    return { ...errs, ...validateContacts(form.contacts) }
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    saveVendor({
      id: editing?.id,
      companyName: form.companyName.trim(),
      gstNumber: form.gstNumber.trim().toUpperCase(),
      address: form.address.trim(),
      paymentTerms: form.paymentTerms,
      contacts: form.contacts.map(c => ({ name: c.name.trim(), phone: c.phone.trim(), email: c.email.trim() })),
      isHDDContractor: form.isHDDContractor,
      drillingRatePerMeter: form.isHDDContractor ? Number(form.drillingRatePerMeter) : null,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title={editing ? 'Edit Vendor' : 'Add Vendor'} size="lg"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<Plus size={14} />} onClick={handleSave}>{editing ? 'Save Changes' : 'Add Vendor'}</Button>
      </>}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company Information</h3>
          <FormField label="Company Name" required error={errors.companyName}>
            <Input placeholder="e.g. ZTE India Ltd" value={form.companyName} onChange={e => setField('companyName', e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="GST Number" required error={errors.gstNumber}>
              <Input placeholder="e.g. 27AABCZ1234E1Z5" value={form.gstNumber} onChange={e => setField('gstNumber', e.target.value.toUpperCase())} />
            </FormField>
          </div>
          <FormField label="Address" required error={errors.address}>
            <Textarea rows={2} placeholder="Full registered address" value={form.address} onChange={e => setField('address', e.target.value)} />
          </FormField>
        </div>

        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Commercial Information</h3>
          <FormField label="Payment Terms" required>
            <Select value={form.paymentTerms} onChange={e => setField('paymentTerms', e.target.value)}>
              {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormField>
          <label className="flex items-center gap-2.5 rounded-lg border border-surface-border px-3.5 py-3 bg-gray-50/60 cursor-pointer">
            <input
              type="checkbox"
              className="accent-brand-blue"
              checked={form.isHDDContractor}
              onChange={e => setField('isHDDContractor', e.target.checked)}
            />
            <span className="text-sm text-gray-700">HDD Contractor</span>
          </label>
          {form.isHDDContractor && (
            <FormField label="Drilling Rate per Meter" required error={errors.drillingRatePerMeter} hint="Used by HDD/Backbone Route Projects to calculate drilling cost.">
              <Input type="number" min="0" placeholder="e.g. 220" value={form.drillingRatePerMeter} onChange={e => setField('drillingRatePerMeter', e.target.value)} />
            </FormField>
          )}
        </div>

        <div className="pt-4 border-t border-surface-border">
          <ContactsEditor
            contacts={form.contacts}
            onChange={contacts => setForm(f => ({ ...f, contacts }))}
            errors={errors}
            clearError={key => setErrors(e => ({ ...e, [key]: undefined }))}
            personLabel="Contact Name"
            namePlaceholder="e.g. Rakesh Iyer"
            phonePlaceholder="e.g. 98200 11223"
            emailPlaceholder="e.g. contact@vendor.com"
          />
        </div>
      </div>
    </Modal>
  )
}

export default function VendorList() {
  const canCreate = usePermission('Inventory', 'Create')
  const canEdit = usePermission('Inventory', 'Edit')

  const navigate = useNavigate()
  const [vendors, setVendors] = useState(getVendors)
  useEffect(() => subscribeVendors(setVendors), [])

  const [tableColumns, setTableColumns] = useColumnPrefs('columnPrefs:inventoryVendorTable', VENDOR_TABLE_COLUMNS)
  const visibleCols = new Set(tableColumns.filter(c => c.visible).map(c => c.key))

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuId) return
    function handleClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuId])

  function openMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return vendors
    return vendors.filter(v =>
      v.companyName.toLowerCase().includes(q) ||
      v.gstNumber.toLowerCase().includes(q) ||
      getContacts(v).some(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(q))
    )
  }, [vendors, search])

  function openAdd() { setEditing(null); setModalOpen(true) }
  function openEdit(vendor) { setEditing(vendor); setModalOpen(true); setMenuId(null) }
  function toggleStatus(vendor) {
    setVendorStatus(vendor.id, vendor.status === 'active' ? 'inactive' : 'active')
    setMenuId(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {vendors.length} vendors</p>
        </div>
        <div className="flex gap-2">
          <ColumnManager columns={tableColumns} onChange={setTableColumns} />
          {canCreate && <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Vendor</Button>}
        </div>
      </div>

      <div className="relative w-72">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search vendor, GST, contact…"
          className="pl-9 pr-8 py-1.5 text-sm w-full bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                {visibleCols.has('companyName')    && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[180px]">Vendor Name</th>}
                {visibleCols.has('gstNumber')       && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">GST Number</th>}
                {visibleCols.has('primaryContact')  && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Primary Contact</th>}
                {visibleCols.has('contactNumber')   && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Contact Number</th>}
                {visibleCols.has('paymentTerms')    && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Payment Terms</th>}
                {visibleCols.has('outstanding')     && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Outstanding</th>}
                {visibleCols.has('lastPurchase')    && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Last Purchase</th>}
                {visibleCols.has('status')          && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>}
                {visibleCols.has('actions')         && <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.size} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Truck size={32} className="mx-auto mb-2 text-gray-200" />
                    No vendors found
                  </td>
                </tr>
              ) : filtered.map(v => (
                <tr
                  key={v.id}
                  onClick={() => navigate(`/inventory/vendors/${v.id}`)}
                  className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                >
                  {visibleCols.has('companyName') && (
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{v.companyName}</span>
                    </td>
                  )}
                  {visibleCols.has('gstNumber')      && <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{v.gstNumber}</td>}
                  {visibleCols.has('primaryContact') && (
                    <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                      {getContacts(v)[0]?.name}
                      {getContacts(v).length > 1 && <span className="text-gray-400"> +{getContacts(v).length - 1} more</span>}
                    </td>
                  )}
                  {visibleCols.has('contactNumber')  && <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{getContacts(v)[0]?.phone}</td>}
                  {visibleCols.has('paymentTerms')   && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{v.paymentTerms}</td>}
                  {visibleCols.has('outstanding')    && (
                    <td className="px-4 py-3 text-right text-xs font-semibold whitespace-nowrap">
                      <span className={v.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}>₹{v.outstanding.toLocaleString('en-IN')}</span>
                    </td>
                  )}
                  {visibleCols.has('lastPurchase')   && <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{v.lastPurchaseDate || '—'}</td>}
                  {visibleCols.has('status') && (
                    <td className="px-4 py-3">
                      <Badge variant={v.status === 'active' ? 'green' : 'gray'} dot size="sm">{v.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                    </td>
                  )}
                  {visibleCols.has('actions') && (
                    <td className="px-4 py-3 w-12 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => openMenu(e, v.id)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === v.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      >
                        <MoreVertical size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const vendor = vendors.find(v => v.id === menuId)
        if (!vendor) return null
        return (
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
          >
            <button onClick={() => { navigate(`/inventory/vendors/${vendor.id}`); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <Eye size={13} className="text-brand-blue shrink-0" /> View Details
            </button>
            {canEdit && (
              <button onClick={() => openEdit(vendor)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
              </button>
            )}
            {canEdit && (
              <button onClick={() => toggleStatus(vendor)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                {vendor.status === 'active'
                  ? <><XCircle size={13} className="text-red-400 shrink-0" /> Deactivate</>
                  : <><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> Activate</>}
              </button>
            )}
          </div>
        )
      })()}

      <AddEditVendorModal isOpen={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  )
}
