import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit2, CheckCircle2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Accordion from '../components/ui/Accordion'
import { FormField, Input, Textarea } from '../components/ui/FormInputs'
import {
  getPartners, subscribePartners, savePartner, setPartnerStatus,
  isValidContactNumber, formatShareValue, SHARE_TYPES,
} from '../data/partners'

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
const SHARE_TYPE_VARIANT = { Percentage: 'blue', Fixed: 'orange' }

function emptyForm() {
  return {
    name: '', shareType: 'Percentage', shareValue: '', contactNumber: '', email: '', address: '',
    bankName: '', accountNo: '', ifsc: '', status: 'Active',
  }
}

function toForm(partner) {
  return {
    name: partner.name, shareType: partner.shareType, shareValue: partner.shareValue,
    contactNumber: partner.contactNumber, email: partner.email, address: partner.address || '',
    bankName: partner.bank?.bankName || '', accountNo: partner.bank?.accountNo || '', ifsc: partner.bank?.ifsc || '',
    status: partner.status,
  }
}

export default function PartnerSettings() {
  const navigate = useNavigate()
  const [partners, setPartners] = useState(getPartners)
  const [modalPartner, setModalPartner] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState('')

  useEffect(() => subscribePartners(setPartners), [])

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
    setModalPartner(null)
    setForm(emptyForm())
    setErrors({})
    setShowModal(true)
  }

  function openEdit(partner) {
    setModalPartner(partner)
    setForm(toForm(partner))
    setErrors({})
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setModalPartner(null)
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Partner name is required.'
    const value = Number(form.shareValue)
    if (form.shareValue === '' || Number.isNaN(value)) errs.shareValue = 'Share value is required.'
    else if (form.shareType === 'Percentage' && (value < 0 || value > 100)) errs.shareValue = 'Percentage share must be between 0 and 100.'
    else if (form.shareType === 'Fixed' && value <= 0) errs.shareValue = 'Fixed share must be a positive amount.'
    if (!form.contactNumber.trim()) errs.contactNumber = 'Contact number is required.'
    else if (!isValidContactNumber(form.contactNumber)) errs.contactNumber = 'Enter a valid 10-digit contact number.'
    if (!form.email.trim()) errs.email = 'Email is required.'
    else if (!EMAIL_REGEX.test(form.email.trim())) errs.email = 'Enter a valid email address.'
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    savePartner({
      id: modalPartner?.id,
      name: form.name.trim(),
      shareType: form.shareType,
      shareValue: Number(form.shareValue),
      contactNumber: form.contactNumber.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      bank: { bankName: form.bankName.trim(), accountNo: form.accountNo.trim(), ifsc: form.ifsc.trim().toUpperCase() },
      status: form.status,
    })
    setToast(modalPartner ? 'Partner updated successfully' : 'Partner added successfully')
    closeModal()
  }

  function handleStatusToggle(partner, checked) {
    setPartnerStatus(partner.id, checked ? 'Active' : 'Inactive')
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
            <h1 className="text-xl font-bold text-gray-900">Partner</h1>
            <p className="text-sm text-gray-500 mt-0.5">System Configuration — reseller/channel entities used under Connection Type = Partner</p>
          </div>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Partner</Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-surface-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Partner Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Share Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Share Value</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Number</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {partners.map(partner => (
              <tr key={partner.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3.5 font-medium text-gray-900">{partner.name}</td>
                <td className="px-4 py-3.5">
                  <Badge variant={SHARE_TYPE_VARIANT[partner.shareType] || 'gray'} size="sm">{partner.shareType}</Badge>
                </td>
                <td className="px-4 py-3.5 text-gray-600">{formatShareValue(partner)}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-gray-600">{partner.contactNumber}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Toggle checked={partner.status === 'Active'} onChange={v => handleStatusToggle(partner, v)} />
                    <span className={`text-xs font-medium whitespace-nowrap ${partner.status === 'Active' ? 'text-green-600' : 'text-gray-400'}`}>{partner.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    onClick={() => openEdit(partner)}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No partners added yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={modalPartner ? `Edit Partner — ${modalPartner.name}` : 'Add Partner'}
        size="lg"
        footer={<>
          <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>{modalPartner ? 'Save Changes' : 'Save'}</Button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Partner Name" required error={errors.name}>
              <Input placeholder="e.g. Metro Broadband Partners" value={form.name} onChange={e => setField('name', e.target.value)} />
            </FormField>
            <FormField label="Status">
              <div className="flex items-center gap-2.5 h-[38px]">
                <Toggle checked={form.status === 'Active'} onChange={v => setField('status', v ? 'Active' : 'Inactive')} />
                <span className="text-sm text-gray-600 whitespace-nowrap">{form.status}</span>
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Share Type" required>
              <div className="inline-flex rounded-lg border border-surface-border p-0.5 bg-gray-50">
                {SHARE_TYPES.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setField('shareType', opt)}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all
                      ${form.shareType === opt ? 'bg-white shadow-sm text-brand-blue' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Share Value" required error={errors.shareValue}>
              <div className="relative">
                {form.shareType === 'Fixed' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₹</span>
                )}
                <Input
                  type="number"
                  min={0}
                  max={form.shareType === 'Percentage' ? 100 : undefined}
                  step={form.shareType === 'Percentage' ? 1 : 0.01}
                  placeholder={form.shareType === 'Percentage' ? 'e.g. 15' : 'e.g. 500'}
                  value={form.shareValue}
                  onChange={e => setField('shareValue', e.target.value)}
                  className={form.shareType === 'Fixed' ? 'pl-7' : 'pr-8'}
                />
                {form.shareType === 'Percentage' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
                )}
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact Number" required error={errors.contactNumber}>
              <Input type="tel" placeholder="10-digit mobile number" maxLength={10} value={form.contactNumber} onChange={e => setField('contactNumber', e.target.value.replace(/\D/g, ''))} />
            </FormField>
            <FormField label="Email" required error={errors.email}>
              <Input type="email" placeholder="partner@company.in" value={form.email} onChange={e => setField('email', e.target.value)} />
            </FormField>
          </div>

          <FormField label="Address">
            <Textarea rows={2} placeholder="Address (optional)" value={form.address} onChange={e => setField('address', e.target.value)} />
          </FormField>

          <Accordion title="Bank Details" subtitle="Mandatory if payouts are disbursed via bank transfer" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Bank Name">
                <Input placeholder="e.g. Axis Bank" value={form.bankName} onChange={e => setField('bankName', e.target.value)} />
              </FormField>
              <FormField label="Account No.">
                <Input placeholder="Account number" value={form.accountNo} onChange={e => setField('accountNo', e.target.value)} />
              </FormField>
              <FormField label="IFSC">
                <Input placeholder="e.g. UTIB0000123" value={form.ifsc} onChange={e => setField('ifsc', e.target.value.toUpperCase())} className="font-mono uppercase" />
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
