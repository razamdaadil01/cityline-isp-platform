import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Route, Save, Plus, Trash2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import EmployeeSelect from '../../components/ui/EmployeeSelect'
import { FormField, Input, Select } from '../../components/ui/FormInputs'
import {
  generateHDDProjectId, saveHDDProject, DISTANCE_UNITS,
  PROJECT_EXECUTION_TYPES, PROJECT_EXECUTION_TYPE_LABELS,
} from '../../data/projectStore'
import { getVendors, getVendorDrillingRate } from '../../data/vendorStore'
import { getProducts } from '../../data/productStore'

function emptyPoint() {
  return { name: '', lat: '', lng: '' }
}

function emptyMaterialRow() {
  return { id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, productId: '', price: '', quantity: '' }
}

export default function CreateHDDProject() {
  const navigate = useNavigate()

  // Generated once for this creation session (mirrors ProductList.jsx's
  // previewNextProductId — shown read-only, then reused as-is at save time
  // so the id displayed here and the id actually persisted never diverge).
  const [projectId] = useState(generateHDDProjectId)

  const hddContractors = getVendors().filter(v => v.isHDDContractor)
  const products = getProducts().filter(p => p.status === 'active')

  const [title, setTitle] = useState('')
  const [siteIncharge, setSiteIncharge] = useState('')
  const [projectExecutionType, setProjectExecutionType] = useState(PROJECT_EXECUTION_TYPES[0])
  const [start, setStart] = useState(emptyPoint)
  const [end, setEnd] = useState(emptyPoint)
  const [distance, setDistance] = useState('')
  const [distanceUnit, setDistanceUnit] = useState(DISTANCE_UNITS[0])
  const [materials, setMaterials] = useState(() => [emptyMaterialRow()])
  const [vendorId, setVendorId] = useState('')
  const [drillingRate, setDrillingRate] = useState('')
  const [rateAutoFetched, setRateAutoFetched] = useState(false)
  const [errors, setErrors] = useState({})

  function setStartField(k, v) { setStart(s => ({ ...s, [k]: v })); setErrors(e => ({ ...e, [`start.${k}`]: undefined })) }
  function setEndField(k, v) { setEnd(s => ({ ...s, [k]: v })); setErrors(e => ({ ...e, [`end.${k}`]: undefined })) }

  function updateMaterial(rowId, patch) {
    setMaterials(rows => rows.map(r => r.id === rowId ? { ...r, ...patch } : r))
    setErrors(e => ({ ...e, materials: undefined }))
  }
  // Price auto-fills from the product's own Purchase Price (the same cost
  // basis the CAPEX Material Cost calc uses — see projectStore.js's
  // findPlannedMaterialProduct) but stays editable afterwards for a
  // negotiated rate, same as CreatePO.jsx's own Price cell.
  function handleProductSelect(rowId, productId) {
    const product = products.find(p => p.id === productId)
    updateMaterial(rowId, { productId, price: product ? String(product.purchasePrice ?? product.sellingPrice ?? '') : '' })
  }
  function addMaterial() { setMaterials(rows => [...rows, emptyMaterialRow()]) }
  function removeMaterial(rowId) { setMaterials(rows => rows.filter(r => r.id !== rowId)) }

  function handleVendorChange(id) {
    setVendorId(id)
    const rate = getVendorDrillingRate(id)
    setDrillingRate(rate != null ? String(rate) : '')
    setRateAutoFetched(rate != null)
    setErrors(e => ({ ...e, vendorId: undefined, drillingRate: undefined }))
  }

  function handleRateChange(v) {
    setDrillingRate(v)
    setRateAutoFetched(false)
    setErrors(e => ({ ...e, drillingRate: undefined }))
  }

  function validate() {
    const errs = {}
    if (!title.trim()) errs.title = 'Project title is required.'
    if (!siteIncharge) errs.siteIncharge = 'Site Incharge / Project Owner is required.'
    if (!start.name.trim()) errs['start.name'] = 'Start point name is required.'
    if (start.lat === '' || Number.isNaN(Number(start.lat))) errs['start.lat'] = 'Enter a valid latitude.'
    if (start.lng === '' || Number.isNaN(Number(start.lng))) errs['start.lng'] = 'Enter a valid longitude.'
    if (!end.name.trim()) errs['end.name'] = 'End point name is required.'
    if (end.lat === '' || Number.isNaN(Number(end.lat))) errs['end.lat'] = 'Enter a valid latitude.'
    if (end.lng === '' || Number.isNaN(Number(end.lng))) errs['end.lng'] = 'Enter a valid longitude.'
    if (distance === '' || Number.isNaN(Number(distance)) || Number(distance) <= 0) errs.distance = 'Enter a valid distance.'
    const chosenMaterials = materials.filter(m => m.productId)
    if (chosenMaterials.length === 0) {
      errs.materials = 'Add at least one planned material.'
    } else if (chosenMaterials.some(m => m.quantity === '' || Number.isNaN(Number(m.quantity)) || Number(m.quantity) <= 0)) {
      errs.materials = 'Every planned material needs a valid quantity.'
    }
    if (!vendorId) errs.vendorId = 'Select an HDD Contractor.'
    if (drillingRate === '' || Number.isNaN(Number(drillingRate)) || Number(drillingRate) < 0) errs.drillingRate = 'Enter a valid drilling rate per meter.'
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    const saved = saveHDDProject({
      id: projectId,
      title: title.trim(),
      siteIncharge,
      routeGeometry: {
        start: { name: start.name.trim(), lat: Number(start.lat), lng: Number(start.lng) },
        end: { name: end.name.trim(), lat: Number(end.lat), lng: Number(end.lng) },
      },
      distance: Number(distance),
      distanceUnit,
      plannedMaterials: materials
        .filter(m => m.productId)
        .map(m => {
          const price = Number(m.price) || 0
          const quantity = Number(m.quantity) || 0
          return { productId: m.productId, price, quantity, total: price * quantity }
        }),
      vendor: vendorId,
      drillingRate: Number(drillingRate),
      projectExecutionType,
    })
    navigate(`/projects/hdd/${saved.id}`)
  }

  return (
    <div className="p-6 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New HDD / Backbone Route Project</h1>
          <p className="text-xs text-gray-500 mt-0.5">Project ID: <span className="font-mono font-semibold text-brand-blue">{projectId}</span></p>
        </div>
      </div>

      <div className="w-full bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-6">
        {/* Basic Project Information */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic Project Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Project Type">
              <div className="flex items-center gap-2 px-3 py-2 text-sm border border-surface-border rounded-lg bg-gray-50 text-gray-600">
                <Route size={14} className="text-brand-blue shrink-0" /> HDD / Backbone Route
              </div>
            </FormField>
            <FormField label="Project ID">
              <Input value={projectId} disabled className="font-mono" />
            </FormField>
          </div>
          <FormField label="Project Title" required error={errors.title}>
            <Input placeholder="e.g. Expressway Sector 62 to 128 Backbone" value={title} onChange={e => { setTitle(e.target.value); setErrors(er => ({ ...er, title: undefined })) }} />
          </FormField>
          <FormField label="Site Incharge / Project Owner" required error={errors.siteIncharge}>
            <EmployeeSelect error={errors.siteIncharge} value={siteIncharge} onChange={v => { setSiteIncharge(v); setErrors(er => ({ ...er, siteIncharge: undefined })) }} />
          </FormField>
          <FormField label="Project Execution Type" required>
            <div className="flex gap-3">
              {PROJECT_EXECUTION_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProjectExecutionType(t)}
                  className={`flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                    projectExecutionType === t ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-surface-border text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {t} — {PROJECT_EXECUTION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </FormField>
        </div>

        {/* Master Route Geometry */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Master Route Geometry</h3>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Main Start Point</p>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Start Point Name" required error={errors['start.name']}>
                <Input placeholder="e.g. Sector 62 Chowk" value={start.name} onChange={e => setStartField('name', e.target.value)} />
              </FormField>
              <FormField label="Latitude" required error={errors['start.lat']}>
                <Input type="number" placeholder="e.g. 28.6139" value={start.lat} onChange={e => setStartField('lat', e.target.value)} />
              </FormField>
              <FormField label="Longitude" required error={errors['start.lng']}>
                <Input type="number" placeholder="e.g. 77.2090" value={start.lng} onChange={e => setStartField('lng', e.target.value)} />
              </FormField>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Main End Point</p>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="End Point Name" required error={errors['end.name']}>
                <Input placeholder="e.g. Sector 128 Junction" value={end.name} onChange={e => setEndField('name', e.target.value)} />
              </FormField>
              <FormField label="Latitude" required error={errors['end.lat']}>
                <Input type="number" placeholder="e.g. 28.5921" value={end.lat} onChange={e => setEndField('lat', e.target.value)} />
              </FormField>
              <FormField label="Longitude" required error={errors['end.lng']}>
                <Input type="number" placeholder="e.g. 77.3910" value={end.lng} onChange={e => setEndField('lng', e.target.value)} />
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Total Estimated Distance" required error={errors.distance}>
              <Input type="number" min="0" placeholder="e.g. 4200" value={distance} onChange={e => { setDistance(e.target.value); setErrors(er => ({ ...er, distance: undefined })) }} />
            </FormField>
            <FormField label="Unit" required>
              <Select value={distanceUnit} onChange={e => setDistanceUnit(e.target.value)}>
                {DISTANCE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
            </FormField>
          </div>
        </div>

        {/* Planned Materials — replaces the old fixed Duct Type/Fiber Core
            Size/Planned Chambers Count fields with a real Product
            Management-backed line-items table, same add-row/remove-row
            table pattern as CreatePO.jsx's Products step. */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Planned Materials</h3>
          {errors.materials && <p className="text-xs text-red-500">{errors.materials}</p>}
          <div className="border border-surface-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-surface-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Price</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Quantity</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Total Amount</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {materials.map(row => {
                  const total = (Number(row.price) || 0) * (Number(row.quantity) || 0)
                  return (
                    <tr key={row.id}>
                      <td className="px-3 py-2">
                        <Select value={row.productId} onChange={e => handleProductSelect(row.id, e.target.value)}>
                          <option value="">Select product…</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min="0" placeholder="0.00" value={row.price} onChange={e => updateMaterial(row.id, { price: e.target.value })} />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min="0" placeholder="0" value={row.quantity} onChange={e => updateMaterial(row.id, { quantity: e.target.value })} />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800 whitespace-nowrap">₹{total.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeMaterial(row.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addMaterial}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark transition-colors"
          >
            <Plus size={13} /> Add Row
          </button>
          <div className="flex justify-end">
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grand Total</span>
              <span className="text-base font-bold text-brand-blue">
                ₹{materials.reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.quantity) || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Vendor & Rate Setup */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor &amp; Rate Setup</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Vendor / HDD Contractor" required error={errors.vendorId}>
              <Select error={errors.vendorId} value={vendorId} onChange={e => handleVendorChange(e.target.value)}>
                <option value="">Select HDD contractor…</option>
                {hddContractors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
              </Select>
            </FormField>
            <FormField
              label="Digging/Drilling Rate per Meter"
              required
              error={errors.drillingRate}
              hint={rateAutoFetched ? 'Auto-fetched from vendor — editable.' : undefined}
            >
              <Input type="number" min="0" placeholder="e.g. 220" value={drillingRate} onChange={e => handleRateChange(e.target.value)} />
            </FormField>
          </div>
          {hddContractors.length === 0 && (
            <p className="text-xs text-gray-400">No vendors are tagged as an HDD Contractor yet — tag one in Vendor Management first.</p>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-surface-border">
          <Button icon={<Save size={14} />} onClick={handleSave}>Save Project</Button>
        </div>
      </div>
    </div>
  )
}
