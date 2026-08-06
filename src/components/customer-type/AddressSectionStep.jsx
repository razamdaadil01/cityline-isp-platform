import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { FormField, Input, Select, Textarea } from '../ui/FormInputs'
import { getStates, getDistricts, getAreasList, getLocalities, getSubLocalities } from '../../data/areaMappingStore'
import { getFeasibilityRequests, saveFeasibilityRequest, subscribeFeasibility } from '../../data/feasibilityStore'

// TODO: confirm exact FR-9 spec with BA — section referenced in PRD but not
// present in document body. Built from the field-table note ("State → City →
// Locality → Sub-locality; Billing Address; Installation Address; Feasibility
// toggle") plus BR-13/BR-14. Reuses the existing Area Mapping hierarchy
// (State → District → Area → Locality → Sub-Locality), the same one used by
// the Sales & Feasibility modules — the PRD's "City" corresponds to this
// hierarchy's District/Area levels.

const EMPTY_ADDRESS_BLOCK = { state: '', district: '', area: '', locality: '', subLocality: '', addressLine: '', landmark: '', pincode: '' }

export const EMPTY_ADDRESS_SECTION = {
  billing: { ...EMPTY_ADDRESS_BLOCK },
  installation: { ...EMPTY_ADDRESS_BLOCK },
  sameAsBilling: false,
  feasibilityEnabled: false,
}

export function isAddressBlockFilled(block) {
  return !!(block.state && block.district && block.area && block.locality &&
    block.addressLine.trim() && block.pincode.trim())
}

export function isAddressSectionValid(section) {
  return isAddressBlockFilled(section.billing) && isAddressBlockFilled(section.installation)
}

// BR-14: a Lead/Customer cannot proceed to Package Selection while a triggered
// Feasibility Work Order is pending/unresolved.
export function isPackageStepBlocked(section, feasibilityRecord) {
  if (!section.feasibilityEnabled) return false
  return feasibilityRecord?.feasibilityStatus !== 'Approved'
}

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

function AddressBlock({ title, value, onChange, disabled }) {
  function set(k, v) {
    const next = { ...value, [k]: v }
    if (k === 'state') Object.assign(next, { district: '', area: '', locality: '', subLocality: '' })
    if (k === 'district') Object.assign(next, { area: '', locality: '', subLocality: '' })
    if (k === 'area') Object.assign(next, { locality: '', subLocality: '' })
    if (k === 'locality') Object.assign(next, { subLocality: '' })
    onChange(next)
  }

  const districts = value.state ? getDistricts(value.state) : []
  const areas = value.state && value.district ? getAreasList(value.state, value.district) : []
  const localities = value.state && value.district && value.area ? getLocalities(value.state, value.district, value.area) : []
  const subLocalities = value.state && value.district && value.area && value.locality
    ? getSubLocalities(value.state, value.district, value.area, value.locality) : []

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <div className="grid grid-cols-3 gap-4">
        <FormField label="State" required>
          <Select disabled={disabled} value={value.state} onChange={e => set('state', e.target.value)}>
            <option value="">Select...</option>
            {getStates().map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <FormField label="District" required>
          <Select disabled={disabled || !value.state} value={value.district} onChange={e => set('district', e.target.value)}>
            <option value="">Select...</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </Select>
        </FormField>
        <FormField label="Area / City" required>
          <Select disabled={disabled || !value.district} value={value.area} onChange={e => set('area', e.target.value)}>
            <option value="">Select...</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
        </FormField>
        <FormField label="Locality" required>
          <Select disabled={disabled || !value.area} value={value.locality} onChange={e => set('locality', e.target.value)}>
            <option value="">Select...</option>
            {localities.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
        </FormField>
        <FormField label="Sub-Locality">
          <Select disabled={disabled || !value.locality} value={value.subLocality} onChange={e => set('subLocality', e.target.value)}>
            <option value="">Select...</option>
            {subLocalities.map(sl => <option key={sl} value={sl}>{sl}</option>)}
          </Select>
        </FormField>
        <FormField label="Pincode" required>
          <Input disabled={disabled} value={value.pincode} maxLength={6} placeholder="560001"
            onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))} />
        </FormField>
      </div>
      <FormField label="Address Line" required>
        <Textarea disabled={disabled} rows={2} value={value.addressLine} placeholder="House / Street / Building"
          onChange={e => set('addressLine', e.target.value)} />
      </FormField>
      <FormField label="Landmark">
        <Input disabled={disabled} value={value.landmark} placeholder="Near..." onChange={e => set('landmark', e.target.value)} />
      </FormField>
    </div>
  )
}

// `leadId` is pre-generated by the parent wizard before this step is reachable,
// so a Feasibility Work Order created here can be linked to the eventual lead
// record. `customerName`/`phone`/`pipeline`/`branch` seed that linked record —
// same fields SalesLeadDetail's "Check for Feasibility" flow populates.
export default function AddressSectionStep({ value, onChange, leadId, customerName, phone, pipeline, branch }) {
  const navigate = useNavigate()
  const [feasibilityRecord, setFeasibilityRecord] = useState(() =>
    getFeasibilityRequests().find(r => r.leadId === leadId) ?? null)

  useEffect(() => subscribeFeasibility(() => {
    setFeasibilityRecord(getFeasibilityRequests().find(r => r.leadId === leadId) ?? null)
  }), [leadId])

  function setBilling(block) {
    const next = { ...value, billing: block }
    if (value.sameAsBilling) next.installation = block
    onChange(next)
  }

  function setInstallation(block) {
    onChange({ ...value, installation: block })
  }

  function toggleSameAsBilling(checked) {
    onChange({ ...value, sameAsBilling: checked, installation: checked ? value.billing : value.installation })
  }

  function toggleFeasibility(checked) {
    onChange({ ...value, feasibilityEnabled: checked })
    if (!checked) return
    const existing = getFeasibilityRequests().find(r => r.leadId === leadId)
    saveFeasibilityRequest({
      ...(existing ?? {}),
      leadId,
      customerName,
      mobile: phone,
      pipeline,
      stage: 'Feasibility Check',
      feasibilityStatus: existing?.feasibilityStatus ?? 'Pending',
      localityName: value.installation.locality || value.billing.locality || '',
      subLocalityName: value.installation.subLocality || value.billing.subLocality || '',
      completeAddress: value.installation.addressLine || value.billing.addressLine || '',
      landmark: value.installation.landmark || value.billing.landmark || '',
      connectionType: 'FTTH',
      assignedBranch: branch || '',
    })
  }

  return (
    <div className="space-y-6">
      <AddressBlock title="Billing Address" value={value.billing} onChange={setBilling} />

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={value.sameAsBilling}
          onChange={e => toggleSameAsBilling(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
        />
        Installation Address same as Billing Address
      </label>

      <AddressBlock title="Installation Address" value={value.installation} onChange={setInstallation} disabled={value.sameAsBilling} />

      <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-surface-border">
        <div>
          <p className="text-sm font-medium text-gray-800">Feasibility Required</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Enable if a site feasibility check is needed before installation. Creates a linked Feasibility Work
            Order — Package Selection is blocked until it's Approved (BR-14).
          </p>
          {value.feasibilityEnabled && feasibilityRecord && (
            <div className="mt-2 flex items-center gap-2">
              {feasibilityRecord.feasibilityStatus !== 'Approved' && <AlertTriangle size={12} className="text-amber-500 shrink-0" />}
              <span className={`text-xs font-medium ${feasibilityRecord.feasibilityStatus === 'Approved' ? 'text-green-600' : 'text-amber-600'}`}>
                {feasibilityRecord.id} — {feasibilityRecord.feasibilityStatus}
              </span>
              <button
                type="button"
                onClick={() => navigate(`/sales/feasibility-requests/${feasibilityRecord.id}`)}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
              >
                View <ExternalLink size={11} />
              </button>
            </div>
          )}
        </div>
        <Toggle checked={value.feasibilityEnabled} onChange={toggleFeasibility} />
      </div>
    </div>
  )
}
