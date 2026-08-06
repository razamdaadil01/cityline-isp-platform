import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit2, CheckCircle2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Accordion from '../components/ui/Accordion'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import {
  getCompanyEntities, subscribeCompanyEntities, saveCompanyEntity, setCompanyEntityStatus,
  isValidGstin, PG_CONNECTIONS,
} from '../data/companyEntities'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-blue' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function emptyForm() {
  return {
    name: '', gstin: '', email: '', address: '',
    bankName: '', accountNo: '', ifsc: '', branch: '',
    pgId: '', pgConnection: PG_CONNECTIONS[0], status: 'Active',
  }
}

function toForm(entity) {
  return {
    name: entity.name, gstin: entity.gstin, email: entity.email, address: entity.address,
    bankName: entity.bank?.bankName || '', accountNo: entity.bank?.accountNo || '',
    ifsc: entity.bank?.ifsc || '', branch: entity.bank?.branch || '',
    pgId: entity.pgId, pgConnection: entity.pgConnection, status: entity.status,
  }
}

export default function CompanyEntitySettings() {
  const navigate = useNavigate()
  const [entities, setEntities] = useState(getCompanyEntities)
  const [modalEntity, setModalEntity] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState('')

  useEffect(() => subscribeCompanyEntities(setEntities), [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  function openAdd() {
    setModalEntity(null)
    setForm(emptyForm())
    setErrors({})
    setShowModal(true)
  }

  function openEdit(entity) {
    setModalEntity(entity)
    setForm(toForm(entity))
    setErrors({})
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setModalEntity(null)
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Legal company name is required.'
    if (!form.gstin.trim()) errs.gstin = 'GSTIN is required.'
    else if (!isValidGstin(form.gstin)) errs.gstin = 'Enter a valid 15-character GSTIN (e.g. 27AABCU9603R1ZM).'
    if (!form.email.trim()) errs.email = 'Email is required.'
    else if (!EMAIL_REGEX.test(form.email.trim())) errs.email = 'Enter a valid email address.'
    if (!form.address.trim()) errs.address = 'Address is required.'
    if (!form.bankName.trim()) errs.bankName = 'Bank name is required.'
    if (!form.accountNo.trim()) errs.accountNo = 'Account number is required.'
    if (!form.ifsc.trim()) errs.ifsc = 'IFSC code is required.'
    if (!form.branch.trim()) errs.branch = 'Branch is required.'
    if (!form.pgId.trim()) errs.pgId = 'PG ID is required.'
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    saveCompanyEntity({
      id: modalEntity?.id,
      name: form.name.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      email: form.email.trim(),
      address: form.address.trim(),
      bank: { bankName: form.bankName.trim(), accountNo: form.accountNo.trim(), ifsc: form.ifsc.trim().toUpperCase(), branch: form.branch.trim() },
      pgId: form.pgId.trim(),
      pgConnection: form.pgConnection,
      status: form.status,
    })
    setToast(modalEntity ? 'Company/Entity updated successfully' : 'Company/Entity added successfully')
    closeModal()
  }

  function handleStatusToggle(entity, checked) {
    setCompanyEntityStatus(entity.id, checked ? 'Active' : 'Inactive')
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Company / Entity</h1>
            <p className="text-sm text-gray-500 mt-0.5">System Configuration — legal billing entities used under Connection Type = Own</p>
          </div>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Company/Entity</Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-surface-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Legal Company Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">GSTIN</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">PG Connection</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {entities.map(entity => (
              <tr key={entity.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3.5 font-medium text-gray-900">{entity.name}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-gray-600">{entity.gstin}</td>
                <td className="px-4 py-3.5 text-gray-600">{entity.email}</td>
                <td className="px-4 py-3.5 text-gray-600">{entity.pgConnection}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Toggle checked={entity.status === 'Active'} onChange={v => handleStatusToggle(entity, v)} />
                    <span className={`text-xs font-medium whitespace-nowrap ${entity.status === 'Active' ? 'text-green-600' : 'text-gray-400'}`}>{entity.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    onClick={() => openEdit(entity)}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {entities.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No companies/entities added yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={modalEntity ? `Edit Company/Entity — ${modalEntity.name}` : 'Add Company/Entity'}
        size="lg"
        footer={<>
          <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>{modalEntity ? 'Save Changes' : 'Save'}</Button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Legal Company Name" required error={errors.name}>
              <Input placeholder="e.g. Cityline Networks Pvt Ltd" value={form.name} onChange={e => setField('name', e.target.value)} />
            </FormField>
            <FormField label="GSTIN" required error={errors.gstin} hint={!errors.gstin ? '15-character GSTIN, e.g. 27AABCU9603R1ZM' : undefined}>
              <Input
                placeholder="27AABCU9603R1ZM"
                value={form.gstin}
                maxLength={15}
                onChange={e => setField('gstin', e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email" required error={errors.email}>
              <Input type="email" placeholder="accounts@company.in" value={form.email} onChange={e => setField('email', e.target.value)} />
            </FormField>
            <FormField label="Status">
              <div className="flex items-center gap-2.5 h-[38px]">
                <Toggle checked={form.status === 'Active'} onChange={v => setField('status', v ? 'Active' : 'Inactive')} />
                <span className="text-sm text-gray-600 whitespace-nowrap">{form.status}</span>
              </div>
            </FormField>
          </div>
          <FormField label="Address" required error={errors.address}>
            <Textarea rows={2} placeholder="Registered address" value={form.address} onChange={e => setField('address', e.target.value)} />
          </FormField>

          <Accordion title="Bank Details & PG Connection" subtitle="Payout account and payment gateway used for this entity">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Bank Name" required error={errors.bankName}>
                <Input placeholder="e.g. HDFC Bank" value={form.bankName} onChange={e => setField('bankName', e.target.value)} />
              </FormField>
              <FormField label="Account No." required error={errors.accountNo}>
                <Input placeholder="Account number" value={form.accountNo} onChange={e => setField('accountNo', e.target.value)} />
              </FormField>
              <FormField label="IFSC" required error={errors.ifsc}>
                <Input placeholder="e.g. HDFC0001234" value={form.ifsc} onChange={e => setField('ifsc', e.target.value.toUpperCase())} className="font-mono uppercase" />
              </FormField>
              <FormField label="Branch" required error={errors.branch}>
                <Input placeholder="e.g. Andheri West" value={form.branch} onChange={e => setField('branch', e.target.value)} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="PG ID" required error={errors.pgId}>
                <Input placeholder="e.g. rzp_live_XXXXXXXX" value={form.pgId} onChange={e => setField('pgId', e.target.value)} />
              </FormField>
              <FormField label="PG Connection" required hint="Illustrative list — depends on integrations built">
                <Select value={form.pgConnection} onChange={e => setField('pgConnection', e.target.value)}>
                  {PG_CONNECTIONS.map(pg => <option key={pg} value={pg}>{pg}</option>)}
                </Select>
              </FormField>
            </div>
          </Accordion>
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
