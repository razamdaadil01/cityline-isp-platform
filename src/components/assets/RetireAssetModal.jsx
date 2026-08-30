import { useState, useEffect } from 'react'
import { Archive, AlertTriangle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { FormField, Select } from '../ui/FormInputs'
import { retireAsset, assetDisplayName, ASSET_RETIREMENT_REASONS } from '../../data/assetStore'

// Phase 8 — Retirement (PRD Section 12.4). A manual admin action available
// from any status except the two other terminal ones (see assetStore.js's
// own retireAsset() note) — this modal doesn't gate on the asset's current
// status itself, it just surfaces whatever error retireAsset() throws.
export default function RetireAssetModal({ isOpen, onClose, asset }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) { setReason(''); setError('') }
  }, [isOpen, asset?.id])

  if (!asset) return null

  function handleConfirm() {
    if (!reason) { setError('Select a retirement reason.'); return }
    try {
      retireAsset(asset.id, { reason, retiredBy: 'Admin User' })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not retire this asset.')
    }
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} size="sm"
      title="Retire Asset"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="danger" size="sm" icon={<Archive size={14} />} onClick={handleConfirm}>Confirm Retirement</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-surface-border bg-gray-50/60 px-3 py-2.5">
          <p className="text-xs text-gray-500">Asset</p>
          <p className="text-sm font-semibold text-gray-800">{asset.id} — {asset.categoryLabel} · {asset.typeLabel} · {assetDisplayName(asset)}</p>
          <p className="text-xs text-gray-500 mt-1">Current status: {asset.status}</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <FormField label="Retirement Reason" required>
          <Select value={reason} onChange={e => setReason(e.target.value)}>
            <option value="">Select reason…</option>
            {ASSET_RETIREMENT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
        </FormField>

        <p className="text-xs text-gray-500">
          This marks the asset as Retired. It stays fully visible on record for audit — purchase, assignment, return and repair history are all kept — but it's excluded from further assignment.
        </p>
      </div>
    </Modal>
  )
}
