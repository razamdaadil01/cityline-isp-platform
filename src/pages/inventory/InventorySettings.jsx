import { useState, useEffect } from 'react'
import { Save, CheckCircle2, Hash, ShieldCheck } from 'lucide-react'
import Button from '../../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormInputs'
import { getActiveCompanyEntities } from '../../data/companyEntities'
import { getInventorySettings, saveInventorySettings, formatPoNumber } from '../../data/inventorySettingsStore'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-blue' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function formToSettings(form) {
  return {
    poApprovalRequired: form.poApprovalRequired,
    poTerms: form.poTerms.trim(),
    defaultGstPercent: Number(form.defaultGstPercent),
    poNumberFormat: form.poNumberFormat.trim(),
  }
}

function settingsToForm(settings) {
  return {
    poApprovalRequired: settings.poApprovalRequired,
    poTerms: settings.poTerms,
    defaultGstPercent: String(settings.defaultGstPercent),
    poNumberFormat: settings.poNumberFormat,
  }
}

export default function InventorySettings() {
  const entities = getActiveCompanyEntities()
  const [entityId, setEntityId] = useState(entities[0]?.id ?? null)
  const [form, setForm] = useState(() => entities[0] ? settingsToForm(getInventorySettings(entities[0].id)) : null)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (entityId != null) setForm(settingsToForm(getInventorySettings(entityId)))
    setErrors({})
  }, [entityId])

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

  function validate() {
    const errs = {}
    if (!form.poNumberFormat.trim()) errs.poNumberFormat = 'PO number format is required.'
    if (form.defaultGstPercent === '' || Number.isNaN(Number(form.defaultGstPercent)) || Number(form.defaultGstPercent) < 0 || Number(form.defaultGstPercent) > 100)
      errs.defaultGstPercent = 'Enter a valid GST percentage (0–100).'
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    saveInventorySettings(entityId, formToSettings(form))
    setToast('Inventory settings saved successfully')
  }

  if (!entities.length || !form) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-10 text-center text-sm text-gray-500">
          No active Company/Entity found. Add one under Settings → Company/Entity before configuring Inventory settings.
        </div>
      </div>
    )
  }

  const preview = form.poNumberFormat.trim() ? formatPoNumber(form.poNumberFormat, 1) : ''

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">General Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Inventory-module configuration — purchase order numbering, approval and default tax rate</p>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border p-6">
        <FormField label="Company / Entity" hint="Inventory settings are configured per legal billing entity">
          <Select value={entityId ?? ''} onChange={e => setEntityId(Number(e.target.value))}>
            {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-card border border-surface-border p-6 space-y-5">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand-blue" /> Purchase Order Approval</h2>
            <div className="flex items-center gap-3">
              <Toggle checked={form.poApprovalRequired} onChange={v => setField('poApprovalRequired', v)} />
              <div>
                <p className="text-sm font-medium text-gray-800">Require approval before a Purchase Order is sent</p>
                <p className="text-xs text-gray-500">When on, new POs go through an approval step (status "Sent for Approval") before being sent to the vendor.</p>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-surface-border">
            <FormField label="Purchase Order Terms" hint="Printed on every PO sent to a vendor">
              <Textarea rows={3} placeholder="e.g. Payment due within agreed terms. Goods must match PO specification." value={form.poTerms} onChange={e => setField('poTerms', e.target.value)} />
            </FormField>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-surface-border p-6 space-y-5">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Tax</h2>
            <FormField label="Default GST %" required error={errors.defaultGstPercent} hint="Pre-filled on new Purchase Orders">
              <Input type="number" min="0" max="100" step="0.01" className="max-w-[160px]" value={form.defaultGstPercent} onChange={e => setField('defaultGstPercent', e.target.value)} />
            </FormField>
          </div>

          <div className="pt-5 border-t border-surface-border space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><Hash size={14} className="text-brand-blue" /> Purchase Order Number Format</h2>
            <FormField label="Format" required error={errors.poNumberFormat} hint="Use {YYYY} for year and a zero run like {00001} for the zero-padded sequence">
              <Input placeholder="e.g. CITY/PO/{YYYY}/{00001}" value={form.poNumberFormat} onChange={e => setField('poNumberFormat', e.target.value)} />
            </FormField>
            <p className="text-xs text-gray-500">
              Preview: <span className="font-mono font-semibold text-gray-800">{preview || '—'}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border p-6 flex justify-end">
        <Button size="sm" icon={<Save size={14} />} onClick={handleSave}>Save Changes</Button>
      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}
