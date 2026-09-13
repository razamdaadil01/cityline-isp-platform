import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Upload, Paperclip, X } from 'lucide-react'
import Button from '../../components/ui/Button'
import EmployeeSelect from '../../components/ui/EmployeeSelect'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormInputs'
import {
  generateHDDWorkOrderId, saveHDDWorkOrder, previewChamberTags,
  WORK_ORDER_STATUSES, LABOUR_RATE_TYPES,
} from '../../data/projectStore'
import { getProducts } from '../../data/productStore'

function emptyMaterialRow() {
  return { id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, itemId: '', quantity: '' }
}

function emptySegmentRow() {
  return {
    id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    startPointName: '', endPointName: '', lengthDrilled: '', shotsTaken: '', ductsUsed: '', couplersUsed: '', chambersInstalled: '',
  }
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CreateHDDWorkOrder() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()

  // Generated once for this creation session (same lazy-init idiom as
  // CreateHDDProject.jsx's projectId — shown read-only, reused as-is at
  // save time so the displayed id and the persisted id never diverge).
  const [workOrderId] = useState(generateHDDWorkOrderId)

  const products = getProducts()

  const [assignedEngineer, setAssignedEngineer] = useState('')
  const [executionDate, setExecutionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState(WORK_ORDER_STATUSES[0])

  const [materials, setMaterials] = useState(() => [emptyMaterialRow()])

  const [segments, setSegments] = useState(() => [emptySegmentRow()])
  const previewedSegments = previewChamberTags(projectId, segments)

  const [headcount, setHeadcount] = useState('')
  const [rateType, setRateType] = useState(LABOUR_RATE_TYPES[0])
  const [dailyRate, setDailyRate] = useState('')
  const [fixedTotal, setFixedTotal] = useState('')
  const isPerPerson = rateType === LABOUR_RATE_TYPES[0]
  const computedTotal = (Number(headcount) || 0) * (Number(dailyRate) || 0)

  const [remarks, setRemarks] = useState('')
  const [attachments, setAttachments] = useState([])

  const [errors, setErrors] = useState({})

  function updateMaterial(rowId, patch) {
    setMaterials(rows => rows.map(r => r.id === rowId ? { ...r, ...patch } : r))
  }
  function addMaterial() { setMaterials(rows => [...rows, emptyMaterialRow()]) }
  function removeMaterial(rowId) { setMaterials(rows => rows.filter(r => r.id !== rowId)) }

  function updateSegment(rowId, patch) {
    setSegments(rows => rows.map(r => r.id === rowId ? { ...r, ...patch } : r))
  }
  function addSegment() { setSegments(rows => [...rows, emptySegmentRow()]) }
  function removeSegment(rowId) { setSegments(rows => rows.filter(r => r.id !== rowId)) }

  function handleUpload(fileList) {
    const files = Array.from(fileList ?? [])
    if (!files.length) return
    setAttachments(a => [...a, ...files.map(f => ({ id: `${Date.now()}-${Math.random()}`, name: f.name, sizeLabel: fmtSize(f.size) }))])
  }
  function removeAttachment(fileId) { setAttachments(a => a.filter(f => f.id !== fileId)) }

  function validate() {
    const errs = {}
    if (!assignedEngineer) errs.assignedEngineer = 'Assigned Engineer is required.'
    if (!executionDate) errs.executionDate = 'Execution Date is required.'
    const validSegments = segments.filter(s => s.startPointName.trim() || s.endPointName.trim())
    if (validSegments.length === 0) errs.segments = 'Add at least one segment.'
    validSegments.forEach(s => {
      if (!s.startPointName.trim() || !s.endPointName.trim()) errs.segments = 'Every segment needs both a Start Point Name and an End Point Name.'
    })
    if (headcount === '' || Number.isNaN(Number(headcount)) || Number(headcount) < 0) errs.headcount = 'Enter a valid worker count.'
    if (isPerPerson) {
      if (dailyRate === '' || Number.isNaN(Number(dailyRate)) || Number(dailyRate) < 0) errs.dailyRate = 'Enter a valid daily rate.'
    } else if (fixedTotal === '' || Number.isNaN(Number(fixedTotal)) || Number(fixedTotal) < 0) {
      errs.fixedTotal = 'Enter a valid total daily labour cost.'
    }
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const cleanedMaterials = materials
      .filter(m => m.itemId)
      .map(m => ({ itemId: m.itemId, quantity: Number(m.quantity) || 0 }))

    const cleanedSegments = segments
      .filter(s => s.startPointName.trim() || s.endPointName.trim())
      .map(s => ({
        startPointName: s.startPointName.trim(),
        endPointName: s.endPointName.trim(),
        lengthDrilled: Number(s.lengthDrilled) || 0,
        shotsTaken: Number(s.shotsTaken) || 0,
        ductsUsed: Number(s.ductsUsed) || 0,
        couplersUsed: Number(s.couplersUsed) || 0,
        chambersInstalled: Number(s.chambersInstalled) || 0,
      }))

    const labour = {
      headcount: Number(headcount) || 0,
      rateType,
      dailyRate: isPerPerson ? Number(dailyRate) || 0 : null,
      totalCost: isPerPerson ? computedTotal : Number(fixedTotal) || 0,
    }

    saveHDDWorkOrder(projectId, {
      id: workOrderId,
      assignedEngineer,
      executionDate,
      status,
      requiredMaterials: cleanedMaterials,
      segments: cleanedSegments,
      labour,
      remarks: remarks.trim(),
      attachments: attachments.map(a => ({ name: a.name, sizeLabel: a.sizeLabel })),
    })
    navigate(`/projects/hdd/${projectId}/work-orders`)
  }

  return (
    <div className="p-6 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/projects/hdd/${projectId}/work-orders`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Work Order</h1>
          <p className="text-xs text-gray-500 mt-0.5">Work Order No: <span className="font-mono font-semibold text-brand-blue">{workOrderId}</span></p>
        </div>
      </div>

      <div className="max-w-4xl bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-6">
        {/* Work Order Details & Assigned Engineer */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Order Details &amp; Assigned Engineer</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Work Order No">
              <Input value={workOrderId} disabled className="font-mono" />
            </FormField>
            <FormField label="Assigned Engineer" required error={errors.assignedEngineer}>
              <EmployeeSelect error={errors.assignedEngineer} value={assignedEngineer} onChange={v => { setAssignedEngineer(v); setErrors(er => ({ ...er, assignedEngineer: undefined })) }} />
            </FormField>
            <FormField label="Execution Date" required error={errors.executionDate}>
              <Input type="date" value={executionDate} onChange={e => { setExecutionDate(e.target.value); setErrors(er => ({ ...er, executionDate: undefined })) }} />
            </FormField>
            <FormField label="Work Order Status" required>
              <Select value={status} onChange={e => setStatus(e.target.value)}>
                {WORK_ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>
        </div>

        {/* Required Material Allocation */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Required Material Allocation</h3>
          <div className="space-y-2">
            {materials.map(row => (
              <div key={row.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <FormField label="Item">
                    <Select value={row.itemId} onChange={e => updateMaterial(row.id, { itemId: e.target.value })}>
                      <option value="">Select item…</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </FormField>
                </div>
                <div className="w-32">
                  <FormField label="Quantity">
                    <Input type="number" min="0" placeholder="0" value={row.quantity} onChange={e => updateMaterial(row.id, { quantity: e.target.value })} />
                  </FormField>
                </div>
                <button
                  type="button"
                  onClick={() => removeMaterial(row.id)}
                  className="w-9 h-9 mb-0.5 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addMaterial}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark transition-colors"
          >
            <Plus size={13} /> Add Material
          </button>
        </div>

        {/* Dynamic Segments Builder */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Segments</h3>
          </div>
          {errors.segments && <p className="text-xs text-red-500">{errors.segments}</p>}
          <div className="space-y-3">
            {segments.map((seg, i) => {
              const previewed = previewedSegments[i]
              return (
                <div key={seg.id} className="rounded-xl border border-surface-border p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-600">Segment {i + 1}</p>
                    <div className="flex items-center gap-2">
                      {previewed?.chamberTag && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[11px] font-semibold font-mono">
                          {previewed.chamberTag}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSegment(seg.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Start Point Name">
                      <Input placeholder="e.g. CH-Start" value={seg.startPointName} onChange={e => updateSegment(seg.id, { startPointName: e.target.value })} />
                    </FormField>
                    <FormField label="End Point Name">
                      <Input placeholder="e.g. CH-End" value={seg.endPointName} onChange={e => updateSegment(seg.id, { endPointName: e.target.value })} />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    <FormField label="Length Drilled (m)">
                      <Input type="number" min="0" placeholder="0" value={seg.lengthDrilled} onChange={e => updateSegment(seg.id, { lengthDrilled: e.target.value })} />
                    </FormField>
                    <FormField label="Shots Taken">
                      <Input type="number" min="0" placeholder="0" value={seg.shotsTaken} onChange={e => updateSegment(seg.id, { shotsTaken: e.target.value })} />
                    </FormField>
                    <FormField label="Ducts Used (m)">
                      <Input type="number" min="0" placeholder="0" value={seg.ductsUsed} onChange={e => updateSegment(seg.id, { ductsUsed: e.target.value })} />
                    </FormField>
                    <FormField label="Couplers Used">
                      <Input type="number" min="0" placeholder="0" value={seg.couplersUsed} onChange={e => updateSegment(seg.id, { couplersUsed: e.target.value })} />
                    </FormField>
                    <FormField label="Chambers Installed">
                      <Input type="number" min="0" placeholder="0" value={seg.chambersInstalled} onChange={e => updateSegment(seg.id, { chambersInstalled: e.target.value })} />
                    </FormField>
                  </div>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={addSegment}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark transition-colors"
          >
            <Plus size={13} /> Add Segment
          </button>
        </div>

        {/* Daily Labour Tracking */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Daily Labour Tracking</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Labour Headcount / Worker Count" required error={errors.headcount}>
              <Input type="number" min="0" placeholder="e.g. 6" value={headcount} onChange={e => { setHeadcount(e.target.value); setErrors(er => ({ ...er, headcount: undefined })) }} />
            </FormField>
            <FormField label="Labour Rate Type" required>
              <Select value={rateType} onChange={e => setRateType(e.target.value)}>
                {LABOUR_RATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
          </div>
          {isPerPerson ? (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Daily Rate (per person)" required error={errors.dailyRate}>
                <Input type="number" min="0" placeholder="e.g. 800" value={dailyRate} onChange={e => { setDailyRate(e.target.value); setErrors(er => ({ ...er, dailyRate: undefined })) }} />
              </FormField>
              <FormField label="Total Daily Labour Cost" hint="Auto-calculated: Worker Count × Daily Rate">
                <Input value={`₹${computedTotal.toLocaleString('en-IN')}`} disabled />
              </FormField>
            </div>
          ) : (
            <FormField label="Total Daily Labour Cost" required error={errors.fixedTotal}>
              <Input type="number" min="0" placeholder="e.g. 5000" value={fixedTotal} onChange={e => { setFixedTotal(e.target.value); setErrors(er => ({ ...er, fixedTotal: undefined })) }} />
            </FormField>
          )}
          <FormField label="Remarks / Daily Site Notes">
            <Textarea rows={3} placeholder="Optional notes about today's progress, issues, etc." value={remarks} onChange={e => setRemarks(e.target.value)} />
          </FormField>
          <FormField label="Attachment" hint="Optional — photos or documents from site">
            <div className="space-y-2">
              <input
                id="wo-attachment-input"
                type="file"
                multiple
                className="hidden"
                onChange={e => { handleUpload(e.target.files); e.target.value = '' }}
              />
              <label htmlFor="wo-attachment-input">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-surface-border bg-white hover:bg-gray-50 text-gray-600 cursor-pointer transition-colors">
                  <Upload size={13} /> Upload files
                </span>
              </label>
              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                      <Paperclip size={12} className="text-gray-400 shrink-0" />
                      <span className="flex-1 truncate">{a.name}</span>
                      <span className="text-gray-400">{a.sizeLabel}</span>
                      <button type="button" onClick={() => removeAttachment(a.id)} className="text-gray-400 hover:text-red-500">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormField>
        </div>

        <div className="flex justify-end pt-4 border-t border-surface-border">
          <Button icon={<Save size={14} />} onClick={handleSave}>Save &amp; Assign Work Order</Button>
        </div>
      </div>
    </div>
  )
}
