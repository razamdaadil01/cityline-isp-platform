import { useState, useEffect } from 'react'
import { RotateCcw, AlertTriangle, CheckCircle2, PackageOpen } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { FormField, Select, Textarea } from '../ui/FormInputs'
import { initiateAssetReturn, assetDisplayName, ASSET_RETURN_CONDITIONS } from '../../data/assetStore'

// Phase 4b — the only Return flow in this app; nothing existing to reuse
// (see the Phase 4b audit). Same asset-summary-card look as
// AssignAssetModal.jsx for visual consistency between the two.
export default function ReturnAssetModal({ isOpen, onClose, asset }) {
  const [condition, setCondition] = useState('')
  const [remarks, setRemarks] = useState('')
  const [kitChecklist, setKitChecklist] = useState([])
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // null while on the form; set once confirmed

  const isSplicingMachine = asset?.categoryId === 'field-splicing-tools' && asset?.typeId === 'splicing-machine'
  const kitComponents = isSplicingMachine ? (asset?.fields?.kitComponents || []) : []

  useEffect(() => {
    if (isOpen) {
      setCondition('')
      setRemarks('')
      setError('')
      setResult(null)
      // "Returned" checked by default — uncheck to flag a component missing,
      // per the PRD's "anything not ticked is auto-flagged as Missing
      // Component."
      setKitChecklist(kitComponents.map(c => ({ componentId: c.id, returned: true })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, asset?.id])

  if (!asset) return null

  function toggleComponent(componentId) {
    setKitChecklist(prev => prev.map(k => k.componentId === componentId ? { ...k, returned: !k.returned } : k))
  }

  function handleConfirm() {
    if (!condition) { setError('Select the returned condition to continue.'); return }
    try {
      const updated = initiateAssetReturn(asset.id, {
        condition, remarks, kitComponentsReturned: kitChecklist, initiatedBy: 'Admin User',
      })
      const missingCount = kitChecklist.filter(k => !k.returned).length
      setResult({ status: updated.status, missingCount })
    } catch (err) {
      setError(err.message || 'Could not process this return.')
    }
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} size="sm"
      title="Return Asset"
      footer={result ? (
        <Button size="sm" onClick={onClose}>Done</Button>
      ) : (
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" icon={<RotateCcw size={14} />} onClick={handleConfirm} disabled={!condition}>
            Confirm Return
          </Button>
        </>
      )}
    >
      {result ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <p>{result.status === 'Under Repair' ? 'Asset sent for repair.' : 'Asset returned to stock.'}</p>
          </div>
          {result.missingCount > 0 && (
            <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>{result.missingCount} kit component{result.missingCount !== 1 ? 's were' : ' was'} flagged missing and recorded for follow-up.</p>
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

          <FormField label="Condition" required>
            <Select value={condition} onChange={e => setCondition(e.target.value)}>
              <option value="">Select condition…</option>
              {ASSET_RETURN_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormField>

          {isSplicingMachine && kitComponents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <PackageOpen size={13} className="text-brand-blue" /> Kit Components Checklist
              </p>
              <div className="space-y-2">
                {kitComponents.map(c => {
                  const checked = kitChecklist.find(k => k.componentId === c.id)?.returned ?? true
                  return (
                    <label key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 border border-surface-border rounded-lg bg-white cursor-pointer">
                      <div>
                        <p className="text-xs font-medium text-gray-800">{c.componentType || '—'} — {c.componentName || '—'}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{c.serialNumber || 'No serial recorded'}</p>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs font-medium shrink-0">
                        <input type="checkbox" checked={checked} onChange={() => toggleComponent(c.id)} className="accent-brand-blue" />
                        {checked ? <span className="text-emerald-600">Returned</span> : <span className="text-red-500">Missing</span>}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <FormField label="Remarks" hint="Optional">
            <Textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes about the returned condition…" />
          </FormField>
        </div>
      )}
    </Modal>
  )
}
