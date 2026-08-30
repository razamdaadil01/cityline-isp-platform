import { useState, useEffect } from 'react'
import { Wrench, AlertTriangle, Info } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { FormField, Input, Select, Textarea } from '../ui/FormInputs'
import { raiseRepairRequest, isAssetWithinWarranty, isSplicingMachineAsset, REPAIR_PATHS } from '../../data/assetRepairStore'
import { assetDisplayName } from '../../data/assetStore'

// Phase 5 — raises a new repair record for an asset already 'Under Repair'
// (reached via the Phase 4b Return flow). isWarrantyClaim is never asked of
// the user — the inline note below is computed live from
// isAssetWithinWarranty()/repairPath, the exact same check
// raiseRepairRequest() itself uses to set the record's own isWarrantyClaim,
// so the note never drifts from what actually gets saved.
export default function RepairRequestModal({ isOpen, onClose, asset }) {
  const [faultDescription, setFaultDescription] = useState('')
  const [reportedBy, setReportedBy] = useState('Admin User')
  const [includeKitComponents, setIncludeKitComponents] = useState(false)
  const [repairPath, setRepairPath] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setFaultDescription('')
      setReportedBy('Admin User')
      setIncludeKitComponents(false)
      setRepairPath('')
      setError('')
    }
  }, [isOpen, asset?.id])

  if (!asset) return null

  const isSplicingMachine = isSplicingMachineAsset(asset)
  const willBeWarrantyClaim = repairPath === 'Vendor' && isAssetWithinWarranty(asset)
  const today = new Date().toISOString().slice(0, 10)

  function handleConfirm() {
    if (!faultDescription.trim()) { setError('Fault description is required.'); return }
    if (!repairPath) { setError('Select a repair path.'); return }
    try {
      raiseRepairRequest(asset.id, { faultDescription, reportedBy, includeKitComponents, repairPath })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not raise this repair request.')
    }
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} size="sm"
      title="Send for Repair"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<Wrench size={14} />} onClick={handleConfirm}>Raise Repair Request</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-surface-border bg-gray-50/60 px-3 py-2.5">
          <p className="text-xs text-gray-500">Asset</p>
          <p className="text-sm font-semibold text-gray-800">{asset.id} — {asset.categoryLabel} · {asset.typeLabel} · {assetDisplayName(asset)}</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <FormField label="Fault Description" required>
          <Textarea rows={3} value={faultDescription} onChange={e => setFaultDescription(e.target.value)} placeholder="Describe the fault…" />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Reported By">
            <Input value={reportedBy} onChange={e => setReportedBy(e.target.value)} />
          </FormField>
          <FormField label="Date" hint="Auto — today">
            <Input value={today} disabled />
          </FormField>
        </div>

        {isSplicingMachine && (
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" checked={includeKitComponents} onChange={e => setIncludeKitComponents(e.target.checked)} className="accent-brand-blue" />
            Include kit components with this repair?
          </label>
        )}

        <FormField label="Repair Path" required>
          <Select value={repairPath} onChange={e => setRepairPath(e.target.value)}>
            <option value="">Select repair path…</option>
            {REPAIR_PATHS.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </FormField>

        {willBeWarrantyClaim && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-cyan-50 border border-cyan-200 text-xs text-cyan-800">
            <Info size={14} className="shrink-0 mt-0.5" />
            This will be routed as a warranty claim (no cost).
          </div>
        )}
      </div>
    </Modal>
  )
}
