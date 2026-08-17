import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Plus, Search, X, MoreVertical, Edit2, CheckCircle2, XCircle, Warehouse, UserPlus, Trash2,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { FormField, Input } from '../../components/ui/FormInputs'
import ColumnManager, { useColumnPrefs } from '../../components/table/ColumnManager'
import { getStores, subscribeStores, saveStore, setStoreStatus, isStoreNameTaken } from '../../data/storeStore'
import { usePermission } from '../../data/rolesStore'

const STORE_TABLE_COLUMNS = [
  { key: 'storeName',   label: 'Store Name',        visible: true, defaultVisible: true, locked: true },
  { key: 'branchCode',  label: 'Branch',            visible: true, defaultVisible: true },
  { key: 'contact',     label: 'Contact Person',    visible: true, defaultVisible: true },
  { key: 'email',       label: 'Email',             visible: true, defaultVisible: true },
  { key: 'productCount',label: 'No. of Products',   visible: true, defaultVisible: true },
  { key: 'totalInventory', label: 'Total Inventory', visible: true, defaultVisible: true },
  { key: 'status',      label: 'Status',            visible: true, defaultVisible: true },
  { key: 'actions',     label: 'Actions',           visible: true, defaultVisible: true },
]

const EMPTY_CONTACT = { name: '', phone: '', email: '' }
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function emptyForm() {
  return { storeName: '', branchCode: '', contacts: [{ ...EMPTY_CONTACT }] }
}

function storeToForm(store) {
  return {
    storeName: store.storeName, branchCode: store.branchCode,
    contacts: store.contacts?.length ? store.contacts.map(c => ({ ...c })) : [{ ...EMPTY_CONTACT }],
  }
}

function AddEditStoreModal({ isOpen, onClose, editing }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isOpen) return
    setForm(editing ? storeToForm(editing) : emptyForm())
    setErrors({})
  }, [isOpen, editing])

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  function setContactField(idx, k, v) {
    setForm(f => ({ ...f, contacts: f.contacts.map((c, i) => i === idx ? { ...c, [k]: v } : c) }))
    setErrors(e => ({ ...e, [`contact_${idx}_${k}`]: undefined }))
  }

  function addContact() {
    setForm(f => ({ ...f, contacts: [...f.contacts, { ...EMPTY_CONTACT }] }))
  }

  function removeContact(idx) {
    setForm(f => ({ ...f, contacts: f.contacts.filter((_, i) => i !== idx) }))
  }

  function validate() {
    const errs = {}
    if (!form.storeName.trim()) {
      errs.storeName = 'Store name is required.'
    } else if (isStoreNameTaken(form.storeName.trim(), editing?.id ?? null)) {
      errs.storeName = `"${form.storeName.trim()}" already exists. Please use a different store name.`
    }
    if (!form.branchCode.trim()) errs.branchCode = 'Branch is required.'
    form.contacts.forEach((c, i) => {
      if (!c.name.trim()) errs[`contact_${i}_name`] = 'Contact person is required.'
      if (c.email.trim() && !EMAIL_REGEX.test(c.email.trim())) errs[`contact_${i}_email`] = 'Enter a valid email address.'
    })
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    saveStore({
      id: editing?.id,
      storeName: form.storeName.trim(),
      branchCode: form.branchCode.trim(),
      contacts: form.contacts.map(c => ({ name: c.name.trim(), phone: c.phone.trim(), email: c.email.trim() })),
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title={editing ? 'Edit Store' : 'Add Store'} size="lg"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<Plus size={14} />} onClick={handleSave}>{editing ? 'Save Changes' : 'Add Store'}</Button>
      </>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Store Name" required error={errors.storeName}>
            <Input placeholder="e.g. Andheri Store" value={form.storeName} onChange={e => setField('storeName', e.target.value)} />
          </FormField>
          <FormField label="Branch" required error={errors.branchCode} hint="Free text — no branch master exists yet">
            <Input placeholder="e.g. CNPL-002" value={form.branchCode} onChange={e => setField('branchCode', e.target.value)} />
          </FormField>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacts</h3>
            <button type="button" onClick={addContact} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark">
              <UserPlus size={13} /> Add Another Contact
            </button>
          </div>

          {form.contacts.map((c, i) => (
            <div key={i} className="rounded-lg border border-surface-border p-3.5 space-y-3 relative">
              {form.contacts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <div className="grid grid-cols-2 gap-3 pr-8">
                <FormField label="Contact Person" required error={errors[`contact_${i}_name`]}>
                  <Input placeholder="e.g. Vinod Sharma" value={c.name} onChange={e => setContactField(i, 'name', e.target.value)} />
                </FormField>
                <FormField label="Phone">
                  <Input placeholder="e.g. 98200 44556" value={c.phone} onChange={e => setContactField(i, 'phone', e.target.value)} />
                </FormField>
              </div>
              <FormField label="Email" error={errors[`contact_${i}_email`]}>
                <Input type="email" placeholder="e.g. contact@store.com" value={c.email} onChange={e => setContactField(i, 'email', e.target.value)} />
              </FormField>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default function StoreList() {
  const canCreate = usePermission('Inventory', 'Create')
  const canEdit = usePermission('Inventory', 'Edit')

  const [stores, setStores] = useState(getStores)
  useEffect(() => subscribeStores(setStores), [])

  const [tableColumns, setTableColumns] = useColumnPrefs('columnPrefs:inventoryStoreTable', STORE_TABLE_COLUMNS)
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
    if (!q) return stores
    return stores.filter(s =>
      s.storeName.toLowerCase().includes(q) ||
      s.branchCode.toLowerCase().includes(q) ||
      s.contacts?.some(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    )
  }, [stores, search])

  function openAdd() { setEditing(null); setModalOpen(true) }
  function openEdit(store) { setEditing(store); setModalOpen(true); setMenuId(null) }
  function toggleStatus(store) {
    setStoreStatus(store.id, store.status === 'active' ? 'inactive' : 'active')
    setMenuId(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {stores.length} stores</p>
        </div>
        <div className="flex gap-2">
          <ColumnManager columns={tableColumns} onChange={setTableColumns} />
          {canCreate && <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Store</Button>}
        </div>
      </div>

      <div className="relative w-72">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search store, branch, contact…"
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
                {visibleCols.has('storeName')      && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[160px]">Store Name</th>}
                {visibleCols.has('branchCode')      && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Branch</th>}
                {visibleCols.has('contact')         && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Contact Person</th>}
                {visibleCols.has('email')           && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Email</th>}
                {visibleCols.has('productCount')    && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">No. of Products</th>}
                {visibleCols.has('totalInventory')  && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Total Inventory</th>}
                {visibleCols.has('status')          && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>}
                {visibleCols.has('actions')         && <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.size} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Warehouse size={32} className="mx-auto mb-2 text-gray-200" />
                    No stores found
                  </td>
                </tr>
              ) : filtered.map(s => {
                const primary = s.contacts?.[0]
                return (
                  <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                    {visibleCols.has('storeName') && (
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">{s.storeName}</span>
                        <span className="block text-xs text-gray-400 font-mono">{s.id}</span>
                      </td>
                    )}
                    {visibleCols.has('branchCode')     && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{s.branchCode}</td>}
                    {visibleCols.has('contact')         && (
                      <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                        {primary?.name || '—'}
                        {s.contacts?.length > 1 && <span className="text-gray-400"> +{s.contacts.length - 1} more</span>}
                      </td>
                    )}
                    {visibleCols.has('email')           && <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{primary?.email || '—'}</td>}
                    {visibleCols.has('productCount')    && <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">{s.productCount}</td>}
                    {visibleCols.has('totalInventory')  && <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">{s.totalInventory}</td>}
                    {visibleCols.has('status') && (
                      <td className="px-4 py-3">
                        <Badge variant={s.status === 'active' ? 'green' : 'gray'} dot size="sm">{s.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                      </td>
                    )}
                    {visibleCols.has('actions') && (
                      <td className="px-4 py-3 w-12 text-center">
                        <button
                          onClick={e => openMenu(e, s.id)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === s.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        >
                          <MoreVertical size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const store = stores.find(s => s.id === menuId)
        if (!store) return null
        return (
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
          >
            {canEdit && (
              <button onClick={() => openEdit(store)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
              </button>
            )}
            {canEdit && (
              <button onClick={() => toggleStatus(store)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                {store.status === 'active'
                  ? <><XCircle size={13} className="text-red-400 shrink-0" /> Deactivate</>
                  : <><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> Activate</>}
              </button>
            )}
          </div>
        )
      })()}

      <AddEditStoreModal isOpen={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  )
}
