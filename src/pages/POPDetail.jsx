import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select } from '../components/ui/FormInputs'
import {
  getPOP, savePOP, isPopNameTaken, POWER_BACKUP_TYPES, POP_STATUSES, EQUIPMENT_TYPES, EQUIPMENT_STATUSES,
} from '../data/popStore'
import { getStates, getDistricts, getAreasList, getLocalities } from '../data/areaMappingStore'

function emptyEquipmentRow() {
  return {
    id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: EQUIPMENT_TYPES[0], label: '', ip: '', model: '', ports: '', portsUsed: '',
    status: EQUIPMENT_STATUSES[0], customers: '', vlan: '',
  }
}

// Existing equipment's numeric fields come back from the store as numbers;
// form inputs need strings, same as every other create/edit page's own
// existing-record -> form-state conversion (e.g. CreateHDDProject.jsx).
function equipmentToForm(eq) {
  return {
    id: eq.id, type: eq.type, label: eq.label ?? '', ip: eq.ip ?? '', model: eq.model ?? '',
    ports: eq.ports != null ? String(eq.ports) : '',
    portsUsed: eq.portsUsed != null ? String(eq.portsUsed) : '',
    status: eq.status ?? EQUIPMENT_STATUSES[0],
    customers: eq.customers != null ? String(eq.customers) : '',
    vlan: eq.vlan ?? '',
  }
}

export default function POPDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id
  const existing = isEditing ? getPOP(id) : null

  const [name, setName] = useState(existing?.name ?? '')
  const [address, setAddress] = useState(existing?.address ?? '')
  const [latitude, setLatitude] = useState(existing?.latitude != null ? String(existing.latitude) : '')
  const [longitude, setLongitude] = useState(existing?.longitude != null ? String(existing.longitude) : '')
  const [state, setState] = useState(existing?.locality?.state ?? '')
  const [district, setDistrict] = useState(existing?.locality?.district ?? '')
  const [area, setArea] = useState(existing?.locality?.area ?? '')
  const [locality, setLocality] = useState(existing?.locality?.locality ?? '')
  const [powerBackup, setPowerBackup] = useState(existing?.powerBackup ?? POWER_BACKUP_TYPES[0])
  const [status, setStatus] = useState(existing?.status ?? POP_STATUSES[0])
  const [equipment, setEquipment] = useState(() => existing?.equipment?.map(equipmentToForm) ?? [])
  const [errors, setErrors] = useState({})

  const districts = state ? getDistricts(state) : []
  const areas = state && district ? getAreasList(state, district) : []
  const localities = state && district && area ? getLocalities(state, district, area) : []

  function handleStateChange(v) { setState(v); setDistrict(''); setArea(''); setLocality('') }
  function handleDistrictChange(v) { setDistrict(v); setArea(''); setLocality('') }
  function handleAreaChange(v) { setArea(v); setLocality('') }

  function updateEquipment(rowId, patch) {
    setEquipment(rows => rows.map(r => r.id === rowId ? { ...r, ...patch } : r))
    setErrors(e => ({ ...e, equipment: undefined }))
  }
  function addEquipment() { setEquipment(rows => [...rows, emptyEquipmentRow()]) }
  function removeEquipment(rowId) { setEquipment(rows => rows.filter(r => r.id !== rowId)) }

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name = 'POP name is required.'
    else if (isPopNameTaken(name.trim(), existing?.id)) errs.name = 'A POP with this name already exists.'
    if (!address.trim()) errs.address = 'Address is required.'
    if (latitude !== '' && Number.isNaN(Number(latitude))) errs.latitude = 'Enter a valid latitude.'
    if (longitude !== '' && Number.isNaN(Number(longitude))) errs.longitude = 'Enter a valid longitude.'
    const namedRows = equipment.filter(eq => eq.label.trim() || eq.ip.trim())
    if (namedRows.some(eq => eq.ports === '' || Number.isNaN(Number(eq.ports)) || Number(eq.ports) < 0)) {
      errs.equipment = 'Every equipment row needs a valid port count.'
    }
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const cleanedEquipment = equipment
      .filter(eq => eq.label.trim() || eq.ip.trim())
      .map(eq => ({
        id: eq.id,
        type: eq.type,
        label: eq.label.trim(),
        ip: eq.ip.trim(),
        model: eq.model.trim(),
        ports: Number(eq.ports) || 0,
        portsUsed: Number(eq.portsUsed) || 0,
        status: eq.status,
        ...(eq.type === 'OLT'
          ? { customers: Number(eq.customers) || 0 }
          : { vlan: eq.vlan.trim() }),
      }))

    savePOP({
      id: existing?.id,
      name: name.trim(),
      address: address.trim(),
      latitude: latitude === '' ? null : Number(latitude),
      longitude: longitude === '' ? null : Number(longitude),
      locality: (state && district && area && locality) ? { state, district, area, locality } : null,
      powerBackup,
      status,
      equipment: cleanedEquipment,
    })
    navigate('/network/pops')
  }

  return (
    <div className="p-6 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/network/pops')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit POP' : 'Add POP'}</h1>
          {isEditing && <p className="text-xs text-gray-500 mt-0.5">POP ID: <span className="font-mono font-semibold text-brand-blue">{existing?.id}</span></p>}
        </div>
      </div>

      <div className="max-w-4xl bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-6">
        {/* Basic Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="POP Name" required error={errors.name}>
              <Input placeholder="e.g. Goregaon POP" value={name} onChange={e => { setName(e.target.value); setErrors(er => ({ ...er, name: undefined })) }} />
            </FormField>
            <FormField label="Status" required>
              <Select value={status} onChange={e => setStatus(e.target.value)}>
                {POP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</h3>
          <FormField label="Address" required error={errors.address}>
            <Input placeholder="e.g. Plot 14, MIDC Industrial Area, Goregaon" value={address} onChange={e => { setAddress(e.target.value); setErrors(er => ({ ...er, address: undefined })) }} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Latitude" error={errors.latitude}>
              <Input type="number" placeholder="e.g. 19.1364" value={latitude} onChange={e => { setLatitude(e.target.value); setErrors(er => ({ ...er, latitude: undefined })) }} />
            </FormField>
            <FormField label="Longitude" error={errors.longitude}>
              <Input type="number" placeholder="e.g. 72.8296" value={longitude} onChange={e => { setLongitude(e.target.value); setErrors(er => ({ ...er, longitude: undefined })) }} />
            </FormField>
          </div>

          {/* Area Mapping locality reference — state/district/area/locality
              cascade, same getStates/getDistricts/getAreasList/getLocalities
              lookups AddressSectionStep.jsx uses for a customer's address.
              Optional: not every POP sits in an already-mapped locality (see
              the seeded Core POP, at the corporate HQ rather than a
              customer-facing neighborhood) — this only stores the compound
              key, never a copy of areaMappingStore.js's own data. */}
          <p className="text-xs font-medium text-gray-600 pt-1">Area Mapping Locality (optional)</p>
          <div className="grid grid-cols-4 gap-4">
            <FormField label="State">
              <Select value={state} onChange={e => handleStateChange(e.target.value)}>
                <option value="">Select…</option>
                {getStates().map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="District">
              <Select disabled={!state} value={district} onChange={e => handleDistrictChange(e.target.value)}>
                <option value="">Select…</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
            </FormField>
            <FormField label="Area">
              <Select disabled={!district} value={area} onChange={e => handleAreaChange(e.target.value)}>
                <option value="">Select…</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
            </FormField>
            <FormField label="Locality">
              <Select disabled={!area} value={locality} onChange={e => setLocality(e.target.value)}>
                <option value="">Select…</option>
                {localities.map(l => <option key={l} value={l}>{l}</option>)}
              </Select>
            </FormField>
          </div>
        </div>

        {/* Power Backup */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Power Backup</h3>
          <FormField label="Power Backup Type" required>
            <Select value={powerBackup} onChange={e => setPowerBackup(e.target.value)}>
              {POWER_BACKUP_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </FormField>
        </div>

        {/* Equipment */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipment</h3>
          {errors.equipment && <p className="text-xs text-red-500">{errors.equipment}</p>}
          <div className="border border-surface-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-surface-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Label</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">IP Address</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Model</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Ports</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Used</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Customers / VLAN</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {equipment.map(row => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">
                      <Select value={row.type} onChange={e => updateEquipment(row.id, { type: e.target.value })}>
                        {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input placeholder="e.g. OLT — Versova" value={row.label} onChange={e => updateEquipment(row.id, { label: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input placeholder="10.10.1.1" value={row.ip} onChange={e => updateEquipment(row.id, { ip: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input placeholder="ZTE C300" value={row.model} onChange={e => updateEquipment(row.id, { model: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min="0" placeholder="8" value={row.ports} onChange={e => updateEquipment(row.id, { ports: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min="0" placeholder="0" value={row.portsUsed} onChange={e => updateEquipment(row.id, { portsUsed: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Select value={row.status} onChange={e => updateEquipment(row.id, { status: e.target.value })}>
                        {EQUIPMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      {row.type === 'OLT' ? (
                        <Input type="number" min="0" placeholder="Customers" value={row.customers} onChange={e => updateEquipment(row.id, { customers: e.target.value })} />
                      ) : (
                        <Input placeholder="VLAN 10, 20" value={row.vlan} onChange={e => updateEquipment(row.id, { vlan: e.target.value })} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeEquipment(row.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {equipment.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-xs text-gray-400">No equipment added yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addEquipment}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark transition-colors"
          >
            <Plus size={13} /> Add Equipment
          </button>
        </div>

        <div className="flex justify-end pt-4 border-t border-surface-border">
          <Button icon={<Save size={14} />} onClick={handleSave}>Save POP</Button>
        </div>
      </div>
    </div>
  )
}
