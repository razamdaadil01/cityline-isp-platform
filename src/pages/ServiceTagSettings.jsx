import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, GripVertical, Edit2, CheckCircle2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select } from '../components/ui/FormInputs'
import { getCustomerTypes } from '../data/customerTypes'
import {
  getServiceTags, subscribeServiceTags, saveServiceTag, setServiceTagStatus,
  reorderServiceTags, nextDisplayOrder, isTagNameTaken,
} from '../data/serviceTags'

const TAG_BADGE_VARIANT = { resident: 'blue', corporate: 'purple' }

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-blue' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function emptyForm(defaultType) {
  return { name: '', customerType: defaultType, status: 'Active', displayOrder: nextDisplayOrder(defaultType) }
}

export default function ServiceTagSettings() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const customerTypes = getCustomerTypes()
  const typeParam = searchParams.get('type')
  const filterType = customerTypes.some(t => t.id === typeParam) ? typeParam : 'all'

  const [tags, setTags] = useState(getServiceTags)
  const [modalTag, setModalTag] = useState(null) // existing tag being edited, or null
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(() => emptyForm(customerTypes[0]?.id))
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)

  useEffect(() => subscribeServiceTags(setTags), [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  const filtered = filterType === 'all' ? tags : tags.filter(t => t.customerType === filterType)

  function setField(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'customerType') next.displayOrder = nextDisplayOrder(v, modalTag?.id)
      return next
    })
    setError('')
  }

  function openAdd() {
    const defaultType = filterType !== 'all' ? filterType : customerTypes[0]?.id
    setModalTag(null)
    setForm(emptyForm(defaultType))
    setError('')
    setShowModal(true)
  }

  function openEdit(tag) {
    setModalTag(tag)
    setForm({ name: tag.name, customerType: tag.customerType, status: tag.status, displayOrder: tag.displayOrder })
    setError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setModalTag(null)
  }

  function handleSave() {
    const name = form.name.trim()
    if (!name) { setError('Tag name is required.'); return }
    if (isTagNameTaken(name, form.customerType, modalTag?.id)) {
      setError('A service tag with this name already exists for the selected customer type.')
      return
    }
    saveServiceTag({
      id: modalTag?.id,
      name,
      customerType: form.customerType,
      status: form.status,
      displayOrder: Number(form.displayOrder) || nextDisplayOrder(form.customerType, modalTag?.id),
    })
    setToast(modalTag ? 'Service tag updated successfully' : 'Service tag added successfully')
    closeModal()
  }

  function handleStatusToggle(tag, checked) {
    setServiceTagStatus(tag.id, checked ? 'Active' : 'Inactive')
  }

  function handleFilterChange(value) {
    if (value === 'all') setSearchParams({})
    else setSearchParams({ type: value })
  }

  function handleDrop(dropIdx) {
    if (dragIndex === null || dragIndex === dropIdx) { setDragIndex(null); setOverIndex(null); return }
    const reordered = [...filtered]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(dropIdx, 0, moved)
    reorderServiceTags(reordered.map(t => t.id))
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings/customer-type')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Service Tags</h1>
            <p className="text-sm text-gray-500 mt-0.5">System Configuration — Customer Type</p>
          </div>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Service Tag</Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600 shrink-0">Customer Type</label>
        <Select
          className="w-52"
          value={filterType}
          onChange={e => handleFilterChange(e.target.value)}
        >
          <option value="all">All</option>
          {customerTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-surface-border">
              <th className="px-3 py-3 w-8" />
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tag Name</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Applicable Customer Type</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Display Order</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filtered.map((tag, idx) => (
              <tr
                key={tag.id}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={e => { e.preventDefault(); setOverIndex(idx) }}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null) }}
                className={`transition-colors select-none
                  ${dragIndex === idx ? 'opacity-40' : 'hover:bg-gray-50/50'}
                  ${overIndex === idx && dragIndex !== null && dragIndex !== idx ? 'bg-blue-50/60' : ''}`}
              >
                <td className="px-3 py-3 text-gray-300 cursor-grab active:cursor-grabbing">
                  <GripVertical size={15} />
                </td>
                <td className="px-3 py-3 font-medium text-gray-900">{tag.name}</td>
                <td className="px-3 py-3">
                  <Badge variant={TAG_BADGE_VARIANT[tag.customerType] || 'gray'} size="sm">
                    {customerTypes.find(t => t.id === tag.customerType)?.name || tag.customerType}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Toggle checked={tag.status === 'Active'} onChange={v => handleStatusToggle(tag, v)} />
                    <span className={`text-xs font-medium ${tag.status === 'Active' ? 'text-green-600' : 'text-gray-400'}`}>{tag.status}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-gray-600">{tag.displayOrder}</td>
                <td className="px-3 py-3 text-right">
                  <button
                    onClick={() => openEdit(tag)}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No service tags for this customer type yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={modalTag ? `Edit Service Tag — ${modalTag.name}` : 'Add Service Tag'}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>{modalTag ? 'Save Changes' : 'Save'}</Button>
        </>}
      >
        <div className="space-y-4">
          <FormField label="Tag Name" required error={error}>
            <Input placeholder="e.g. Broadband" value={form.name} onChange={e => setField('name', e.target.value)} />
          </FormField>
          <FormField label="Applicable Customer Type" required>
            <Select value={form.customerType} onChange={e => setField('customerType', e.target.value)}>
              {customerTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Display Order">
              <Input type="number" min="1" value={form.displayOrder} onChange={e => setField('displayOrder', e.target.value)} />
            </FormField>
            <FormField label="Status">
              <div className="flex items-center gap-2 h-[38px]">
                <Toggle checked={form.status === 'Active'} onChange={v => setField('status', v ? 'Active' : 'Inactive')} />
                <span className="text-sm text-gray-600">{form.status}</span>
              </div>
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Success toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}
