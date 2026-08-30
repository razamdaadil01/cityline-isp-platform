import { useState, useMemo, useEffect } from 'react'
import { UserCheck, AlertTriangle, PackageOpen } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { FormField, Select } from '../ui/FormInputs'
import { getStores } from '../../data/storeStore'
import { getEngineersForBranch } from '../../data/assignmentStore'
import { assignAssetToEngineer, assetDisplayName } from '../../data/assetStore'

// Reuses Inventory's own Assign to Engineer branch->engineer selection
// pattern (CreateAssignment.jsx: a branch list sourced from storeStore.js,
// then getEngineersForBranch(branchCode) imported straight from
// assignmentStore.js rather than duplicated) — but writes through
// assetStore.js's own assignAssetToEngineer(), not assignmentStore.js's
// saveAssignment(). Assets have a separate, stored-status data model from
// Inventory's ledger-derived one (see the Phase 4a audit); the two systems
// stay independent, this modal is the only bridge and it's UI/UX-only.
export default function AssignAssetModal({ isOpen, onClose, asset }) {
  const [branchCode, setBranchCode] = useState('')
  const [engineerId, setEngineerId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) { setBranchCode(''); setEngineerId(''); setError('') }
  }, [isOpen, asset?.id])

  const branches = useMemo(() => [...getStores()].filter(s => s.branchCode).sort((a, b) => a.branchCode.localeCompare(b.branchCode)), [])
  const engineers = branchCode ? getEngineersForBranch(branchCode) : []
  const engineer = engineers.find(e => e.id === engineerId) ?? null

  if (!asset) return null

  const isSplicingMachine = asset.categoryId === 'field-splicing-tools' && asset.typeId === 'splicing-machine'
  const kitComponents = isSplicingMachine ? (asset.fields?.kitComponents || []) : []
  const serial = asset.fields?.serialNumber

  function selectBranch(v) {
    setBranchCode(v)
    setEngineerId('')
  }

  function handleConfirm() {
    if (!branchCode || !engineer) { setError('Select a branch and an engineer to continue.'); return }
    try {
      assignAssetToEngineer(asset.id, { engineerName: engineer.name, branchCode, assignedBy: 'Admin User' })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not assign this asset.')
    }
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} size="sm"
      title="Assign to Engineer"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={<UserCheck size={14} />} onClick={handleConfirm} disabled={!branchCode || !engineer}>
          Confirm Assignment
        </Button>
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

        <FormField label="Branch" required>
          <Select value={branchCode} onChange={e => selectBranch(e.target.value)}>
            <option value="">Select branch…</option>
            {branches.map(b => <option key={b.branchCode} value={b.branchCode}>{b.storeName} ({b.branchCode})</option>)}
          </Select>
        </FormField>

        <FormField label="Engineer" required>
          {!branchCode ? (
            <Select value="" disabled className="disabled:text-gray-400 disabled:cursor-not-allowed">
              <option value="">Select a branch first</option>
            </Select>
          ) : engineers.length === 0 ? (
            <p className="text-xs text-gray-400">No engineers have Work Orders assigned in this branch yet.</p>
          ) : (
            <Select value={engineerId} onChange={e => setEngineerId(e.target.value)}>
              <option value="">Select engineer…</option>
              {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          )}
        </FormField>

        {isSplicingMachine && (
          <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/5 px-3 py-2.5 space-y-1">
            <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <PackageOpen size={13} className="text-brand-blue" /> This will assign as one kit
            </p>
            <p className="text-xs text-gray-600">
              This will assign: {asset.typeLabel}{serial ? ` (${serial})` : ''}
              {kitComponents.length > 0 && (
                <> + {kitComponents.length} kit component{kitComponents.length !== 1 ? 's' : ''}: {kitComponents.map(c => c.componentType || c.componentName || '—').join(', ')}</>
              )}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
