import { useMemo } from 'react'
import { FormField, Select } from '../ui/FormInputs'
import { getActiveCompanyEntities } from '../../data/companyEntities'
import { getActivePartners } from '../../data/partners'

// Reusable Connection Type component (UI Checklist #8) — shared by the
// Resident and Corporate Customer Creation wizards.

export const EMPTY_CONNECTION_TYPE = { connectionType: '', entityId: '', partnerId: '', billingTo: '' }

const BILLING_TO_OPTIONS = ['Direct', 'Partner Billing']

// Entity/Partner and Billing To are marked "Conditional" in Field Configuration —
// their required-ness is driven by whether Connection Type makes them visible,
// not by the Field Configuration mandatory toggle (per FR-8's own note on these
// two fields), so validation here doesn't read fieldConfig at all.
export function isConnectionTypeValid(value) {
  if (!value.connectionType) return false
  if (value.connectionType === 'Own') return !!value.entityId
  if (value.connectionType === 'Partner') return !!value.partnerId && !!value.billingTo
  return false
}

export default function ConnectionTypeStep({ value, onChange }) {
  const entities = useMemo(getActiveCompanyEntities, []) // BR-7: Active only
  const partners = useMemo(getActivePartners, [])         // BR-8: Active only

  function selectType(opt) {
    onChange({ connectionType: opt, entityId: '', partnerId: '', billingTo: '' })
  }

  return (
    <div className="space-y-5">
      <FormField label="Connection Type" required>
        <div className="inline-flex rounded-lg border border-surface-border p-0.5 bg-gray-50">
          {['Own', 'Partner'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => selectType(opt)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all
                ${value.connectionType === opt ? 'bg-white shadow-sm text-brand-blue' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </FormField>

      {value.connectionType === 'Own' && (
        <FormField label="Entity" required hint="Conditional — required because Connection Type = Own (BR-7)">
          <Select value={value.entityId} onChange={e => onChange({ ...value, entityId: e.target.value })}>
            <option value="">Select entity...</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </FormField>
      )}

      {value.connectionType === 'Partner' && (
        <>
          <FormField label="Partner" required hint="Conditional — required because Connection Type = Partner (BR-8)">
            <Select value={value.partnerId} onChange={e => onChange({ ...value, partnerId: e.target.value })}>
              <option value="">Select partner...</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Billing To" required hint="Only shown because Connection Type = Partner">
            <Select value={value.billingTo} onChange={e => onChange({ ...value, billingTo: e.target.value })}>
              <option value="">Select...</option>
              {BILLING_TO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </Select>
          </FormField>
        </>
      )}
    </div>
  )
}
