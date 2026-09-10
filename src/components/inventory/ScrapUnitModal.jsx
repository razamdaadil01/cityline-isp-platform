// Shared "Scrap Unit" modal — used by both Assignments.jsx ("Scrap" row
// action, Assign to Engineer) and InventoryOverview.jsx (Units tab, next to
// "Mark as Replaced"), the one place this modal's fields/validation/save
// logic live rather than two copies drifting apart — same reasoning
// AddEditVendorModal.jsx already established for Add/Edit Vendor, and the
// same shape Assignments.jsx's own SendForRepairModal uses (minus
// Vendor/Expected Delivery Date, which scrap has no use for).
//
// `target` is { productId, productName, storeId, storeName, units: [{ value,
// kind }] } — `units` holds one entry per physical unit the caller is
// offering to scrap; a caller with a single already-known unit (Inventory
// Overview) passes a one-item array (no picker shown, same fallback
// SendForRepairModal uses), while a caller working from a whole assignment
// line (Assignments.jsx) passes every unit on that line so the picker
// appears when there's more than one.
//
// `onScrapped(unit)` fires after saveScrap() succeeds, with the specific
// unit that was scrapped, so each caller can run its own extra side effect
// (e.g. Assignments.jsx removing the unit from its still-active assignment
// line) before this modal closes — wrapped in the same try/catch as
// saveScrap() itself, so a failure there surfaces in this modal's own error
// box instead of throwing uncaught.

import { useState, useEffect } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { FormField, Input, Select, Textarea } from '../ui/FormInputs'
import { saveScrap } from '../../data/scrapStore'

export default function ScrapUnitModal({ target, onClose, onScrapped }) {
  const isOpen = !!target
  const [selectedValue, setSelectedValue] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSelectedValue(target.units[0]?.value ?? '')
      setReason('')
      setError('')
    }
  }, [isOpen, target])

  function handleConfirm() {
    if (!selectedValue) { setError('Select which unit is being scrapped.'); return }
    if (!reason.trim()) { setError('Reason is required.'); return }
    const unit = target.units.find(u => u.value === selectedValue)
    try {
      saveScrap({
        productId: target.productId, productName: target.productName,
        value: unit.value, kind: unit.kind,
        storeId: target.storeId, storeName: target.storeName,
        reason,
      })
      onScrapped?.(unit)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not scrap this unit.')
    }
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title="Scrap Unit" size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" icon={<Trash2 size={14} />} onClick={handleConfirm}>Scrap Unit</Button>
      </>}
    >
      {target && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700">
            <p className="font-medium">{target.productName}</p>
            {target.storeName && <p className="text-xs text-gray-500 mt-0.5">{target.storeName}</p>}
          </div>

          {target.units.length > 1 ? (
            <FormField label="Unit" required hint="This line has more than one unit — pick which one is being scrapped.">
              <Select value={selectedValue} onChange={e => setSelectedValue(e.target.value)}>
                <option value="">Select unit…</option>
                {target.units.map(u => (
                  <option key={u.value} value={u.value}>{u.value} ({u.kind === 'mac' ? 'MAC' : 'Serial'})</option>
                ))}
              </Select>
            </FormField>
          ) : (
            <FormField label="Unit">
              <Input value={target.units[0]?.value ?? ''} disabled />
            </FormField>
          )}

          <FormField label="Reason" required>
            <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Physically damaged beyond repair" />
          </FormField>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
