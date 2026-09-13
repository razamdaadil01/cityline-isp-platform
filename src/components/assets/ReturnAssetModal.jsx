import { useState, useEffect } from 'react'
import { RotateCcw, AlertTriangle, CheckCircle2, PackageOpen, ShieldAlert, Info } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { FormField, Input, Select, Textarea } from '../ui/FormInputs'
import EmployeeSelect from '../ui/EmployeeSelect'
import { initiateAssetReturn, reportAssetLost, assetDisplayName, ASSET_RETURN_CONDITIONS } from '../../data/assetStore'
import { raiseRepairRequest, isAssetWithinWarranty, REPAIR_PATHS } from '../../data/assetRepairStore'

// Non-kit condition options shown in the dropdown — the 2 real
// ASSET_RETURN_CONDITIONS ('Working'/'Damage') plus a 3rd, modal-only
// "Lost" choice that never reaches initiateAssetReturn() at all (see
// handleConfirm() below): selecting it hands off straight to
// reportAssetLost() instead, since a non-kit asset that never comes back
// is a loss, not a return outcome. Kept local rather than folded into the
// exported ASSET_RETURN_CONDITIONS constant so that constant's own
// ASSET_RETURN_CONDITIONS.includes(condition) validation in
// initiateAssetReturn() keeps correctly rejecting this value if it were
// ever passed there by mistake.
const NON_KIT_CONDITION_OPTIONS = [...ASSET_RETURN_CONDITIONS, 'Lost']

// Per-component 3-way condition — Good / Damaged / Missing — replacing the
// old plain Returned/Missing checkbox so the kit's overall outcome can be
// derived from real per-component data (see initiateAssetReturn()'s own
// note) instead of an unrelated single top-level dropdown. These internal
// values ('good'/'damaged'/'missing') are their own vocabulary, separate
// from the top-level condition options above ('Working'/'Damage'/'Lost') —
// renaming the top-level set doesn't need to touch these.
const KIT_COMPONENT_CONDITIONS = [
  { value: 'good', label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'missing', label: 'Missing' },
]

// Phase 4b — the only Return flow in this app. Reworked per the Return
// Flow Audit to close its 4 gaps: a "Lost" path for non-kit assets
// (routes to reportAssetLost()), auto-created repair requests when the
// outcome is 'Under Repair' (raiseRepairRequest(), called from here rather
// than from assetStore.js itself — see initiateAssetReturn()'s own note on
// why, to avoid a circular import), real per-component condition capture
// for kits, and kit status derived from those component conditions instead
// of a single manual dropdown. Same asset-summary-card look as
// AssignAssetModal.jsx for visual consistency between the two.
export default function ReturnAssetModal({ isOpen, onClose, asset }) {
  const [condition, setCondition] = useState('')
  const [remarks, setRemarks] = useState('')
  const [kitChecklist, setKitChecklist] = useState([])
  const [repairPath, setRepairPath] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [isChargeable, setIsChargeable] = useState(false)
  const [chargeableAmount, setChargeableAmount] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // null while on the form; set once confirmed

  const isSplicingMachine = asset?.categoryId === 'field-splicing-tools' && asset?.typeId === 'splicing-machine'
  const kitComponents = isSplicingMachine ? (asset?.fields?.kitComponents || []) : []
  const hasKitComponents = kitComponents.length > 0

  useEffect(() => {
    if (isOpen) {
      setCondition('')
      setRemarks('')
      setError('')
      setResult(null)
      setRepairPath('')
      setTechnicianId('')
      setIsChargeable(false)
      setChargeableAmount('')
      // Every component defaults to "Returned — Good" — switch it to flag
      // damage or a no-show, per the PRD's "anything not ticked is
      // auto-flagged" idea, now expressed as a 3-way condition per row
      // instead of a single checkbox.
      setKitChecklist(kitComponents.map(c => ({ componentId: c.id, returnCondition: 'good' })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, asset?.id])

  if (!asset) return null

  function setComponentCondition(componentId, returnCondition) {
    setKitChecklist(prev => prev.map(k => k.componentId === componentId ? { ...k, returnCondition } : k))
  }

  const isLost = !hasKitComponents && condition === 'Lost'
  const anyComponentDamaged = hasKitComponents && kitChecklist.some(k => k.returnCondition === 'damaged')
  const willNeedRepair = hasKitComponents ? anyComponentDamaged : condition === 'Damage'
  const isInHouse = repairPath === 'In-house'
  // Same auto-warranty-claim check raiseRepairRequest() itself uses (see
  // RepairRequestModal.jsx's identical note) — used here only to hide the
  // Chargeable toggle, since a warranty claim is already no-cost.
  const willBeWarrantyClaim = repairPath === 'Vendor' && isAssetWithinWarranty(asset)
  const chargeableFieldValid = willBeWarrantyClaim || !isChargeable || Number(chargeableAmount) > 0
  const repairFieldsValid = !willNeedRepair || (!!repairPath && (!isInHouse || !!technicianId) && chargeableFieldValid)

  const canConfirm = hasKitComponents
    ? repairFieldsValid
    : isLost
      ? remarks.trim().length > 0
      : !!condition && repairFieldsValid

  function handleConfirm() {
    setError('')

    // Non-kit "Lost" — a loss, not a return outcome. Hands off to the
    // existing lost-reporting mechanism (no componentId — this is the
    // whole asset) rather than inventing a new status transition here.
    if (isLost) {
      if (!remarks.trim()) { setError('A reason is required.'); return }
      try {
        reportAssetLost(asset.id, { reason: remarks, reportedBy: 'Admin User' })
        setResult({ status: 'Lost', missingCount: 0, repairCreated: false })
      } catch (err) {
        setError(err.message || 'Could not report this asset lost.')
      }
      return
    }

    if (!hasKitComponents && !condition) { setError('Select the returned condition to continue.'); return }
    if (willNeedRepair) {
      if (!repairPath) { setError('Select a repair path for the resulting repair request.'); return }
      if (isInHouse && !technicianId) { setError('Select an assigned technician for an in-house repair.'); return }
      if (!willBeWarrantyClaim && isChargeable && !(Number(chargeableAmount) > 0)) {
        setError('Enter a valid chargeable amount.'); return
      }
    }

    try {
      const updated = initiateAssetReturn(asset.id, {
        condition: hasKitComponents ? undefined : condition,
        remarks,
        kitComponentsReturned: hasKitComponents ? kitChecklist : [],
        initiatedBy: 'Admin User',
      })

      let repairCreated = false
      if (updated.status === 'Under Repair') {
        const faultDescription = hasKitComponents
          ? `Kit component(s) damaged at return: ${kitComponents
              .filter(c => kitChecklist.find(k => k.componentId === c.id)?.returnCondition === 'damaged')
              .map(c => c.componentType || c.componentName || 'component')
              .join(', ')}.`
          : `${condition} at return.${remarks.trim() ? ` ${remarks.trim()}` : ''}`
        raiseRepairRequest(asset.id, {
          faultDescription,
          reportedBy: 'Admin User',
          includeKitComponents: hasKitComponents,
          repairPath,
          technicianId: isInHouse ? technicianId : null,
          isChargeable: !willBeWarrantyClaim && isChargeable,
          chargeableAmount: !willBeWarrantyClaim && isChargeable ? Number(chargeableAmount) : null,
        })
        repairCreated = true
      }

      const missingCount = hasKitComponents ? kitChecklist.filter(k => k.returnCondition === 'missing').length : 0
      setResult({ status: updated.status, missingCount, repairCreated })
    } catch (err) {
      setError(err.message || 'Could not process this return.')
    }
  }

  const confirmLabel = isLost ? 'Report Lost' : 'Confirm Return'
  const confirmIcon = isLost ? <ShieldAlert size={14} /> : <RotateCcw size={14} />

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} size="lg"
      title="Return Asset"
      footer={result ? (
        <Button size="sm" onClick={onClose}>Done</Button>
      ) : (
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant={isLost ? 'danger' : 'primary'} icon={confirmIcon} onClick={handleConfirm} disabled={!canConfirm}>
            {confirmLabel}
          </Button>
        </>
      )}
    >
      {result ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <p>
              {result.status === 'Lost' ? 'Asset reported lost.' : result.status === 'Under Repair' ? 'Asset sent for repair.' : 'Asset returned to stock.'}
              {result.repairCreated && ' A repair request was raised automatically.'}
            </p>
          </div>
          {result.missingCount > 0 && (
            <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>{result.missingCount} kit component{result.missingCount !== 1 ? 's were' : ' was'} not returned — reported lost against this asset.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-surface-border bg-gray-50/60 px-3 py-2.5">
            <p className="text-xs text-gray-500">Asset</p>
            <p className="text-sm font-semibold text-gray-800">{asset.id} — {asset.categoryLabel} · {asset.typeLabel} · {assetDisplayName(asset)}</p>
            {asset.assignedTo && <p className="text-xs text-gray-500 mt-1">Currently with {asset.assignedTo.engineerName} ({asset.assignedTo.branchCode})</p>}
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {!hasKitComponents && (
            <FormField label="Condition" required>
              <Select value={condition} onChange={e => setCondition(e.target.value)}>
                <option value="">Select condition…</option>
                {NON_KIT_CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
          )}

          {hasKitComponents && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <PackageOpen size={13} className="text-brand-blue" /> Kit Components Checklist
              </p>
              <p className="text-[11px] text-gray-500">
                The kit's overall outcome is derived from these — any component Damaged sends the whole kit to Under Repair; a component Missing is reported lost individually.
              </p>
              <div className="space-y-2">
                {kitComponents.map(c => {
                  const value = kitChecklist.find(k => k.componentId === c.id)?.returnCondition ?? 'good'
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 border border-surface-border rounded-lg bg-white">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{c.componentType || '—'} — {c.componentName || '—'}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{c.serialNumber || 'No serial recorded'}</p>
                      </div>
                      <select
                        value={value}
                        onChange={e => setComponentCondition(c.id, e.target.value)}
                        className="shrink-0 w-40 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                      >
                        {KIT_COMPONENT_CONDITIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {willNeedRepair && (
            <div className="rounded-lg border border-brand-orange/20 bg-brand-orange/5 px-3 py-2.5 space-y-3">
              <p className="text-xs font-semibold text-gray-700">This will raise a repair request automatically</p>
              <FormField label="Repair Path" required>
                <Select value={repairPath} onChange={e => { setRepairPath(e.target.value); if (e.target.value !== 'In-house') setTechnicianId('') }}>
                  <option value="">Select repair path…</option>
                  {REPAIR_PATHS.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
              </FormField>
              {isInHouse && (
                <FormField label="Assigned Technician" required>
                  <EmployeeSelect value={technicianId} onChange={setTechnicianId} placeholder="Select technician…" />
                </FormField>
              )}
              {willBeWarrantyClaim ? (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-cyan-50 border border-cyan-200 text-xs text-cyan-800">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  This will be routed as a warranty claim (no cost).
                </div>
              ) : (
                <>
                  <FormField label="Chargeable?" required>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                        <input type="radio" name="chargeable" checked={!isChargeable} onChange={() => setIsChargeable(false)} className="accent-brand-blue" />
                        No
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                        <input type="radio" name="chargeable" checked={isChargeable} onChange={() => setIsChargeable(true)} className="accent-brand-blue" />
                        Yes
                      </label>
                    </div>
                  </FormField>
                  {isChargeable && (
                    <FormField label="Amount" required hint="₹">
                      <Input type="number" min="0" value={chargeableAmount} onChange={e => setChargeableAmount(e.target.value)} placeholder="0" />
                    </FormField>
                  )}
                </>
              )}
            </div>
          )}

          <FormField label={isLost ? 'Reason' : 'Remarks'} required={isLost} hint={isLost ? undefined : 'Optional'}>
            <Textarea
              rows={3} value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder={isLost ? 'Describe how/when it was lost or stolen…' : 'Any notes about the returned condition…'}
            />
          </FormField>
        </div>
      )}
    </Modal>
  )
}
