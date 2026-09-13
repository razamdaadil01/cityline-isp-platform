import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, X } from 'lucide-react'
import Button from '../../components/ui/Button'
import { FormField, Input, Select } from '../../components/ui/FormInputs'
import { generateSiteWorkOrderId, saveSiteWorkOrder, SITE_ACTIVITY_TYPES } from '../../data/projectStore'
import { getProducts } from '../../data/productStore'
import { getActiveUsers } from '../../data/userStore'

function emptyMaterialRow() {
  return { id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, itemId: '', quantity: '' }
}

export default function CreateSiteWorkOrder() {
  const { id: siteProjectId } = useParams()
  const navigate = useNavigate()

  // Generated once for this creation session (same lazy-init idiom as
  // CreateHDDWorkOrder.jsx's workOrderId — shown read-only, reused as-is at
  // save time so the displayed id and the persisted id never diverge).
  const [workOrderId] = useState(generateSiteWorkOrderId)

  const products = getProducts()
  const employees = getActiveUsers()

  const [activityType, setActivityType] = useState(SITE_ACTIVITY_TYPES[0])
  const [targetLocation, setTargetLocation] = useState('')
  const [executionDate, setExecutionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [targetDeadline, setTargetDeadline] = useState('')

  const [materials, setMaterials] = useState(() => [emptyMaterialRow()])

  const [assignedTechnicians, setAssignedTechnicians] = useState([])

  const [errors, setErrors] = useState({})

  function updateMaterial(rowId, patch) {
    setMaterials(rows => rows.map(r => r.id === rowId ? { ...r, ...patch } : r))
  }
  function addMaterial() { setMaterials(rows => [...rows, emptyMaterialRow()]) }
  function removeMaterial(rowId) { setMaterials(rows => rows.filter(r => r.id !== rowId)) }

  function toggleTechnician(userId) {
    setAssignedTechnicians(list => list.includes(userId) ? list.filter(id => id !== userId) : [...list, userId])
    setErrors(er => ({ ...er, assignedTechnicians: undefined }))
  }

  function validate() {
    const errs = {}
    if (!targetLocation.trim()) errs.targetLocation = 'Target location is required.'
    if (!executionDate) errs.executionDate = 'Execution date is required.'
    if (!targetDeadline) errs.targetDeadline = 'Target deadline is required.'
    if (assignedTechnicians.length === 0) errs.assignedTechnicians = 'Assign at least one technician.'
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const cleanedMaterials = materials
      .filter(m => m.itemId)
      .map(m => ({ itemId: m.itemId, quantity: Number(m.quantity) || 0 }))

    saveSiteWorkOrder({
      id: workOrderId,
      siteProjectId,
      activityType,
      targetLocation: targetLocation.trim(),
      requiredMaterials: cleanedMaterials,
      assignedTechnicians,
      executionDate,
      targetDeadline,
    })
    navigate(`/projects/site/${siteProjectId}/work-orders`)
  }

  return (
    <div className="p-6 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/projects/site/${siteProjectId}/work-orders`)}
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
        {/* Work Order Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Order Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Work Order No">
              <Input value={workOrderId} disabled className="font-mono" />
            </FormField>
            <FormField label="Activity Type" required>
              <Select value={activityType} onChange={e => setActivityType(e.target.value)}>
                {SITE_ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Target Location" required error={errors.targetLocation}>
              <Input placeholder="e.g. Tower A - Floors 1 to 10" value={targetLocation} onChange={e => { setTargetLocation(e.target.value); setErrors(er => ({ ...er, targetLocation: undefined })) }} />
            </FormField>
            <FormField label="Execution Date" required error={errors.executionDate}>
              <Input type="date" value={executionDate} onChange={e => { setExecutionDate(e.target.value); setErrors(er => ({ ...er, executionDate: undefined })) }} />
            </FormField>
            <FormField label="Target Deadline" required error={errors.targetDeadline}>
              <Input type="date" value={targetDeadline} onChange={e => { setTargetDeadline(e.target.value); setErrors(er => ({ ...er, targetDeadline: undefined })) }} />
            </FormField>
          </div>
        </div>

        {/* Required Material List */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Required Material List</h3>
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
                  <FormField label="Required Qty">
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

        {/* Assigned Technicians */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Technicians</h3>
          {errors.assignedTechnicians && <p className="text-xs text-red-500">{errors.assignedTechnicians}</p>}
          {assignedTechnicians.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {assignedTechnicians.map(userId => {
                const u = employees.find(e => e.id === userId)
                return (
                  <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
                    {u?.name ?? userId}
                    <button type="button" onClick={() => toggleTechnician(userId)} className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none">
                      <X size={11} />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
          <div className="border border-surface-border rounded-lg divide-y divide-surface-border max-h-52 overflow-y-auto">
            {employees.map(u => {
              const selected = assignedTechnicians.includes(u.id)
              return (
                <label key={u.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleTechnician(u.id)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <span className="text-sm text-gray-700">{u.name}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-surface-border">
          <Button icon={<Save size={14} />} onClick={handleSave}>Save Work Order</Button>
        </div>
      </div>
    </div>
  )
}
