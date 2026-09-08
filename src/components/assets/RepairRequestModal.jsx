import { useState, useEffect, useRef } from 'react'
import { Wrench, AlertTriangle, Info, Upload, Paperclip, X } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { FormField, Input, Select, Textarea } from '../ui/FormInputs'
import EmployeeSelect from '../ui/EmployeeSelect'
import { raiseRepairRequest, isAssetWithinWarranty, isSplicingMachineAsset, REPAIR_PATHS } from '../../data/assetRepairStore'
import { assetDisplayName } from '../../data/assetStore'

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Phase 5 — raises a new repair record. Reused from two entry points on
// AssetDetail.jsx: an asset already 'Under Repair' (reached via the Phase
// 4b Return flow's Damaged/Not Working path) and, now, an asset still
// 'Assigned' (an engineer reporting a fault directly, without first
// returning it) — raiseRepairRequest() itself handles the status
// transition correctly either way (a no-op if already Under Repair, else
// it moves the asset there — see that function's own note), so this modal
// doesn't need to know or care which state it was opened from.
// isWarrantyClaim is never asked of the user — the inline note below is
// computed live from isAssetWithinWarranty()/repairPath, the exact same
// check raiseRepairRequest() itself uses to set the record's own
// isWarrantyClaim, so the note never drifts from what actually gets saved.
export default function RepairRequestModal({ isOpen, onClose, asset }) {
  const [faultDescription, setFaultDescription] = useState('')
  const [reportedBy, setReportedBy] = useState('Admin User')
  const [photos, setPhotos] = useState([])
  const [includeKitComponents, setIncludeKitComponents] = useState(false)
  const [repairPath, setRepairPath] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef()

  useEffect(() => {
    if (isOpen) {
      setFaultDescription('')
      setReportedBy('Admin User')
      setPhotos([])
      setIncludeKitComponents(false)
      setRepairPath('')
      setTechnicianId('')
      setError('')
    }
  }, [isOpen, asset?.id])

  if (!asset) return null

  const isSplicingMachine = isSplicingMachineAsset(asset)
  const isInHouse = repairPath === 'In-house'
  const willBeWarrantyClaim = repairPath === 'Vendor' && isAssetWithinWarranty(asset)
  const today = new Date().toISOString().slice(0, 10)

  // Same lightweight attachment pattern TicketCreate.jsx's own "Attachment
  // / Screenshot" field uses — a plain <input type="file"> hidden behind a
  // styled button, filename + size kept in local state, no real upload/
  // storage backend exists in this app so only the filename is what
  // actually gets persisted (see handleConfirm() below).
  function handleUpload(fileList) {
    const files = Array.from(fileList ?? [])
    if (!files.length) return
    setPhotos(p => [...files.map(f => ({ id: Date.now() + Math.random(), name: f.name, sizeLabel: fmtSize(f.size) })), ...p])
  }
  function removePhoto(id) { setPhotos(p => p.filter(x => x.id !== id)) }

  function handleConfirm() {
    if (!faultDescription.trim()) { setError('Fault description is required.'); return }
    if (!repairPath) { setError('Select a repair path.'); return }
    if (isInHouse && !technicianId) { setError('Select an assigned technician for an in-house repair.'); return }
    try {
      raiseRepairRequest(asset.id, {
        faultDescription, reportedBy, includeKitComponents, repairPath,
        technicianId: isInHouse ? technicianId : null,
        photos: photos.map(p => p.name),
      })
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

        <FormField label="Photos" hint="Optional">
          <div className="space-y-2">
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => { handleUpload(e.target.files); e.target.value = '' }} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-brand-blue bg-brand-blue/5 hover:bg-brand-blue/10 border border-brand-blue/20 rounded-lg transition-colors">
              <Upload size={13} /> Upload photos
            </button>
            {photos.length > 0 && (
              <div className="space-y-1.5">
                {photos.map(p => (
                  <div key={p.id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-surface-border bg-gray-50 text-xs">
                    <Paperclip size={12} className="text-gray-400 shrink-0" />
                    <span className="flex-1 truncate text-gray-700">{p.name}</span>
                    <span className="text-gray-400">{p.sizeLabel}</span>
                    <button type="button" onClick={() => removePhoto(p.id)} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormField>

        {isSplicingMachine && (
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" checked={includeKitComponents} onChange={e => setIncludeKitComponents(e.target.checked)} className="accent-brand-blue" />
            Include kit components with this repair?
          </label>
        )}

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
