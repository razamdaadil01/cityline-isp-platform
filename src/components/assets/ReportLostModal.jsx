import { useState, useEffect } from 'react'
import { ShieldAlert, AlertTriangle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { FormField, Textarea } from '../ui/FormInputs'
import { reportAssetLost, assetDisplayName } from '../../data/assetStore'

// Phase 8 — Lost/Stolen (PRD Section 12.5). Splicing Machine assets only
// get the whole-asset-vs-single-component toggle (kit components are the
// only sub-parts any asset here has); every other category always reports
// the whole asset lost. See assetStore.js's own reportAssetLost() note on
// why a component-level report never changes the parent asset's status.
export default function ReportLostModal({ isOpen, onClose, asset }) {
  const [reason, setReason] = useState('')
  const [scope, setScope] = useState('asset') // 'asset' | 'component'
  const [componentId, setComponentId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) { setReason(''); setScope('asset'); setComponentId(''); setError('') }
  }, [isOpen, asset?.id])

  if (!asset) return null

  const isSplicingMachine = asset.categoryId === 'field-splicing-tools' && asset.typeId === 'splicing-machine'
  const kitComponents = isSplicingMachine ? (asset.fields?.kitComponents || []).filter(c => c.receivedStatus !== 'Lost') : []

  function handleConfirm() {
    if (!reason.trim()) { setError('A reason is required.'); return }
    if (isSplicingMachine && scope === 'component' && !componentId) { setError('Select which kit component was lost.'); return }
    try {
      reportAssetLost(asset.id, {
        reason,
        reportedBy: 'Admin User',
        componentId: isSplicingMachine && scope === 'component' ? componentId : null,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not report this asset lost.')
    }
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} size="sm"
      title="Report Lost / Stolen"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="danger" size="sm" icon={<ShieldAlert size={14} />} onClick={handleConfirm}>Confirm Report</Button>
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

        {isSplicingMachine && (
          <FormField label="What was lost?">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button" onClick={() => { setScope('asset'); setComponentId('') }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  scope === 'asset' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-surface-border hover:bg-gray-50'
                }`}
              >
                Entire asset
              </button>
              <button
                type="button" onClick={() => setScope('component')}
                disabled={kitComponents.length === 0}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  scope === 'component' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-surface-border hover:bg-gray-50'
                }`}
              >
                Specific kit component
              </button>
            </div>
          </FormField>
        )}

        {isSplicingMachine && scope === 'component' && (
          <FormField label="Kit Component" required>
            <div className="space-y-1.5">
              {kitComponents.map(c => (
                <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-surface-border cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio" name="lost-component" value={c.id}
                    checked={componentId === c.id} onChange={() => setComponentId(c.id)}
                    className="accent-brand-blue"
                  />
                  <span className="font-medium text-gray-800">{c.componentType || c.componentName || '—'}</span>
                  {c.serialNumber && <span className="text-gray-400 font-mono">({c.serialNumber})</span>}
                </label>
              ))}
            </div>
          </FormField>
        )}

        <FormField label="Reason / Notes" required>
          <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe how/when it was lost or stolen…" />
        </FormField>

        {(!isSplicingMachine || scope === 'asset') && (
          <p className="text-xs text-gray-500">
            This marks the asset as Lost. It's excluded from further assignment; full history stays on record for audit.
          </p>
        )}
      </div>
    </Modal>
  )
}
