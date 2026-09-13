// Shared Add/Edit Vendor modal — used by both VendorList.jsx (Add Vendor)
// and VendorDetail.jsx (Edit Vendor from the header Actions dropdown), so
// there's exactly one place the vendor form's fields/validation/save logic
// live rather than two copies drifting apart.

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { FormField, Input, Select, Textarea } from '../ui/FormInputs'
import ContactsEditor, { EMPTY_CONTACT, validateContacts } from './ContactsEditor'
import {
  saveVendor, isVendorNameTaken, PAYMENT_TERMS, getContacts,
} from '../../data/vendorStore'

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

export default function AddEditVendorModal({ isOpen, onClose, editing }) {
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
