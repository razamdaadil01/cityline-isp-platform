import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, Upload, FileText, X, Boxes, Wrench } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select } from '../components/ui/FormInputs'
import {
  getPOP, savePOP, isPopNameTaken, previewPOPId, getProjectsForPOPType,
  POWER_BACKUP_TYPES, POP_STATUSES, POP_TYPES, POP_CATEGORIES, POWER_SOURCES, SITE_OWNERSHIP_TYPES,
  EQUIPMENT_TYPES, EQUIPMENT_STATUSES, EQUIPMENT_ITEM_CATEGORIES, EQUIPMENT_CONDITIONS,
} from '../data/popStore'
import { getStates, getDistricts, getAreasList, getLocalities } from '../data/areaMappingStore'
import { getAllTechnicians } from '../data/technicianHelpers'
import { getWorkOrdersForEquipment } from '../data/workOrderStore'

const WO_STATUS_BADGE = {
  Open: 'blue', Assigned: 'indigo', 'In-Progress': 'orange', 'On-Hold': 'yellow', Resolved: 'green', Closed: 'gray',
}

// Same variant -> Tailwind class palette as components/ui/Badge.jsx's own
// `variants` map, applied to a real <select> instead of a <span> — Category
// and Condition are still fully editable dropdowns (same onChange contract
// as every other Select on this page), just styled compact/pill-shaped like
// a status badge instead of taking a full FormInputs.Select's width, so the
// Inventory Details table below doesn't burn its scarce width on two fields
// that only ever hold one short word.
const BADGE_SELECT_CLASSES = {
  blue: 'bg-brand-blue/10 text-brand-blue',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-600',
  orange: 'bg-brand-orange/10 text-brand-orange',
  yellow: 'bg-amber-100 text-amber-700',
  gray: 'bg-gray-100 text-gray-600',
  purple: 'bg-purple-100 text-purple-700',
  slate: 'bg-slate-100 text-slate-700',
}
const ITEM_CATEGORY_BADGE = { 'Active Equipment': 'blue', 'Passive Equipment': 'purple', Consumable: 'gray' }
// Matches POPInventory.jsx's own CONDITION_BADGE exactly, so Condition
// reads as the same color language on both pages.
const CONDITION_BADGE = { Working: 'green', Faulty: 'red', 'Under Repair': 'orange', Replaced: 'slate' }

function BadgeSelect({ value, onChange, options, colorMap }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`text-xs font-medium rounded-full pl-2.5 pr-6 py-1 border-0 cursor-pointer appearance-none
        focus:outline-none focus:ring-2 focus:ring-brand-blue/30
        ${BADGE_SELECT_CLASSES[colorMap[value]] ?? BADGE_SELECT_CLASSES.gray}`}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function emptyEquipmentRow() {
  return {
    id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: EQUIPMENT_TYPES[0], label: '', ip: '', model: '', ports: '', portsUsed: '',
    status: EQUIPMENT_STATUSES[0], customers: '', vlan: '',
    itemCategory: EQUIPMENT_ITEM_CATEGORIES[0], serialNumber: '', quantity: '1',
    installDate: '', warrantyAmcExpiry: '', condition: EQUIPMENT_CONDITIONS[0],
  }
}

// Existing equipment's numeric fields come back from the store as numbers;
// form inputs need strings, same as every other create/edit page's own
// existing-record -> form-state conversion (e.g. CreateHDDProject.jsx).
// lastCleaningDate/lastMaintenanceDate are deliberately NOT part of this
// form's editable state — they're auto-stamped by Work Order resolution
// (see popStore.js's markPOPCleaned()/markEquipmentMaintained()), read-only
// values surfaced instead on the POP Inventory view (POPInventory.jsx).
function equipmentToForm(eq) {
  return {
    id: eq.id, type: eq.type, label: eq.label ?? '', ip: eq.ip ?? '', model: eq.model ?? '',
    ports: eq.ports != null ? String(eq.ports) : '',
    portsUsed: eq.portsUsed != null ? String(eq.portsUsed) : '',
    status: eq.status ?? EQUIPMENT_STATUSES[0],
    customers: eq.customers != null ? String(eq.customers) : '',
    vlan: eq.vlan ?? '',
    itemCategory: eq.itemCategory ?? EQUIPMENT_ITEM_CATEGORIES[0],
    serialNumber: eq.serialNumber ?? '',
    quantity: eq.quantity != null ? String(eq.quantity) : '1',
    installDate: eq.installDate ?? '',
    warrantyAmcExpiry: eq.warrantyAmcExpiry ?? '',
    condition: eq.condition ?? EQUIPMENT_CONDITIONS[0],
  }
}

// Site Photos/Documents are stored as base64 data URLs directly on the POP
// record — same no-file-storage-backend convention as CustomerDetail.jsx's
// KYC document upload (handleDocUpload there). Unlike KYC's fixed named
// slots, this is a free-form multi-file list, so each upload just appends
// to the array rather than replacing a named slot.
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result, uploadedAt: new Date().toISOString().split('T')[0] })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const OWNERSHIP_NEEDING_LANDLORD = ['Rented', 'Shared']

export default function POPDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id
  const existing = isEditing ? getPOP(id) : null

  // lastCleaningDate/lastMaintenanceDate aren't part of the equipment form
  // state (see equipmentToForm()'s own note) — they're auto-stamped by Work
  // Order resolution, never hand-edited here — so the Inventory Details
  // table below reads them straight from the last-saved record by id
  // instead, and handleSave() carries them forward the same way rather than
  // silently dropping them on a save that only knows about this form's own
  // fields. A brand-new row (no matching existing record) simply has
  // neither yet.
  const existingEquipmentById = Object.fromEntries((existing?.equipment ?? []).map(eq => [eq.id, eq]))

  const [name, setName] = useState(existing?.name ?? '')
  const [popType, setPopType] = useState(existing?.popType ?? POP_TYPES[0])
  const [category, setCategory] = useState(existing?.category ?? POP_CATEGORIES[0])
  const [projectId, setProjectId] = useState(existing?.projectId ?? '')
  const [address, setAddress] = useState(existing?.address ?? '')
  const [landmark, setLandmark] = useState(existing?.landmark ?? '')
  const [latitude, setLatitude] = useState(existing?.latitude != null ? String(existing.latitude) : '')
  const [longitude, setLongitude] = useState(existing?.longitude != null ? String(existing.longitude) : '')
  const [state, setState] = useState(existing?.locality?.state ?? '')
  const [district, setDistrict] = useState(existing?.locality?.district ?? '')
  const [area, setArea] = useState(existing?.locality?.area ?? '')
  const [locality, setLocality] = useState(existing?.locality?.locality ?? '')
  const [capacity, setCapacity] = useState(existing?.capacity ?? '')
  const [powerSource, setPowerSource] = useState(existing?.powerSource ?? POWER_SOURCES[0])
  const [powerBackup, setPowerBackup] = useState(existing?.powerBackup ?? POWER_BACKUP_TYPES[0])
  const [hasBackupPower, setHasBackupPower] = useState(existing?.hasBackupPower ?? false)
  const [backupHours, setBackupHours] = useState(existing?.backupHours != null ? String(existing.backupHours) : '')
  const [siteOwnership, setSiteOwnership] = useState(existing?.siteOwnership ?? SITE_OWNERSHIP_TYPES[0])
  const [ownerContactName, setOwnerContactName] = useState(existing?.ownerContactName ?? '')
  const [ownerContactPhone, setOwnerContactPhone] = useState(existing?.ownerContactPhone ?? '')
  const [rentAgreementExpiry, setRentAgreementExpiry] = useState(existing?.rentAgreementExpiry ?? '')
  const [siteContactName, setSiteContactName] = useState(existing?.siteContactName ?? '')
  const [siteContactPhone, setSiteContactPhone] = useState(existing?.siteContactPhone ?? '')
  const [defaultTechnicianId, setDefaultTechnicianId] = useState(existing?.defaultTechnicianId ?? '')
  const [documents, setDocuments] = useState(existing?.documents ?? [])
  const [status, setStatus] = useState(existing?.status ?? POP_STATUSES[0])
  const [equipment, setEquipment] = useState(() => existing?.equipment?.map(equipmentToForm) ?? [])
  const [errors, setErrors] = useState({})
  // Which equipment row's Linked Work Orders modal is open, if any — a
  // saved-form row, not just an id, so the modal's title can show its label
  // without a second lookup.
  const [linkedWorkOrdersFor, setLinkedWorkOrdersFor] = useState(null)

  const districts = state ? getDistricts(state) : []
  const areas = state && district ? getAreasList(state, district) : []
  const localities = state && district && area ? getLocalities(state, district, area) : []

  const projectOptions = getProjectsForPOPType(popType)
  const technicians = getAllTechnicians()

  function handleStateChange(v) { setState(v); setDistrict(''); setArea(''); setLocality('') }
  function handleDistrictChange(v) { setDistrict(v); setArea(''); setLocality('') }
  function handleAreaChange(v) { setArea(v); setLocality('') }

  // Changing POP Type re-scopes the Project dropdown (getProjectsForPOPType
  // above) — an already-picked Project that no longer matches the new type
  // is cleared rather than silently kept, so the saved link never disagrees
  // with its own POP's type.
  function handlePopTypeChange(v) {
    setPopType(v)
    const stillValid = getProjectsForPOPType(v).some(p => p.id === projectId)
    if (!stillValid) setProjectId('')
  }

  function updateEquipment(rowId, patch) {
    setEquipment(rows => rows.map(r => r.id === rowId ? { ...r, ...patch } : r))
    setErrors(e => ({ ...e, equipment: undefined }))
  }
  function addEquipment() { setEquipment(rows => [...rows, emptyEquipmentRow()]) }
  function removeEquipment(rowId) { setEquipment(rows => rows.filter(r => r.id !== rowId)) }

  async function handleFilesSelected(fileList) {
    const files = Array.from(fileList)
    if (files.length === 0) return
    const read = await Promise.all(files.map(readFileAsDataUrl))
    setDocuments(docs => [...docs, ...read])
  }
  function removeDocument(idx) { setDocuments(docs => docs.filter((_, i) => i !== idx)) }

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name = 'POP name is required.'
    else if (isPopNameTaken(name.trim(), existing?.id)) errs.name = 'A POP with this name already exists.'
    if (!address.trim()) errs.address = 'Address is required.'
    if (latitude !== '' && Number.isNaN(Number(latitude))) errs.latitude = 'Enter a valid latitude.'
    if (longitude !== '' && Number.isNaN(Number(longitude))) errs.longitude = 'Enter a valid longitude.'
    if (hasBackupPower && (backupHours === '' || Number.isNaN(Number(backupHours)) || Number(backupHours) < 0)) {
      errs.backupHours = 'Enter valid backup hours.'
    }
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
        itemCategory: eq.itemCategory,
        serialNumber: eq.serialNumber.trim(),
        quantity: Number(eq.quantity) || 1,
        installDate: eq.installDate || null,
        warrantyAmcExpiry: eq.warrantyAmcExpiry || null,
        condition: eq.condition,
        lastCleaningDate: existingEquipmentById[eq.id]?.lastCleaningDate ?? null,
        lastMaintenanceDate: existingEquipmentById[eq.id]?.lastMaintenanceDate ?? null,
      }))

    const showsLandlordFields = OWNERSHIP_NEEDING_LANDLORD.includes(siteOwnership)

    const saved = savePOP({
      id: existing?.id,
      name: name.trim(),
      popType,
      category,
      projectId: projectId || null,
      address: address.trim(),
      landmark: landmark.trim(),
      latitude: latitude === '' ? null : Number(latitude),
      longitude: longitude === '' ? null : Number(longitude),
      locality: (state && district && area && locality) ? { state, district, area, locality } : null,
      capacity: capacity.trim(),
      powerSource,
      powerBackup,
      hasBackupPower,
      backupHours: hasBackupPower ? Number(backupHours) : null,
      siteOwnership,
      ownerContactName: showsLandlordFields ? ownerContactName.trim() : '',
      ownerContactPhone: showsLandlordFields ? ownerContactPhone.trim() : '',
      rentAgreementExpiry: rentAgreementExpiry || null,
      siteContactName: siteContactName.trim(),
      siteContactPhone: siteContactPhone.trim(),
      defaultTechnicianId: defaultTechnicianId || null,
      documents,
      status,
      equipment: cleanedEquipment,
    })
    navigate(saved?.id ? `/network/pops/${saved.id}` : '/network/pops')
  }

  const showsLandlordFields = OWNERSHIP_NEEDING_LANDLORD.includes(siteOwnership)

  return (
    <div className="p-6 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(isEditing ? `/network/pops/${existing.id}` : '/network/pops')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit POP' : 'Add POP'}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              POP ID: <span className="font-mono font-semibold text-brand-blue">{isEditing ? existing?.id : previewPOPId(popType)}</span>
              {!isEditing && <span className="text-gray-400"> (assigned on save)</span>}
              {/* Read-only — set automatically when a linked Cleaning Work
                  Order (POPWorkOrderDetail.jsx) is marked Resolved, never
                  hand-edited here. */}
              {isEditing && existing?.lastCleaningDate && (
                <span className="text-gray-400"> · Last cleaned {existing.lastCleaningDate}</span>
              )}
            </p>
          </div>
        </div>
        {isEditing && (
          <Button size="sm" variant="secondary" icon={<Boxes size={14} />} onClick={() => navigate(`/network/pops/${existing.id}/inventory`)}>
            View Inventory
          </Button>
        )}
      </div>

      <div className="w-full bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-6">
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
            <FormField label="POP Type" required hint="Determines which Projects can be linked below.">
              <Select value={popType} onChange={e => handlePopTypeChange(e.target.value)}>
                {POP_TYPES.map(t => <option key={t} value={t}>{t === 'OH' ? 'OH (Overhead)' : t}</option>)}
              </Select>
            </FormField>
            <FormField label="POP Category" required>
              <Select value={category} onChange={e => setCategory(e.target.value)}>
                {POP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
          </div>
        </div>

        {/* Project Linkage */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Linkage</h3>
          <FormField label="Linked Project" hint={`Showing Projects matching "${popType}" — a Project can have multiple linked POPs.`}>
            <Select value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">None</option>
              {projectOptions.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
              ))}
            </Select>
          </FormField>
        </div>

        {/* Location */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Address" required error={errors.address}>
              <Input placeholder="e.g. Plot 14, MIDC Industrial Area, Goregaon" value={address} onChange={e => { setAddress(e.target.value); setErrors(er => ({ ...er, address: undefined })) }} />
            </FormField>
            <FormField label="Landmark">
              <Input placeholder="e.g. Opposite City Mall" value={landmark} onChange={e => setLandmark(e.target.value)} />
            </FormField>
          </div>
          {/* No map-picker component exists anywhere in this app yet (only
              read-only Leaflet display maps, e.g. TechnicianDashboard.jsx) —
              building one from scratch is out of scope here, so this stays a
              plain lat/lng text-input pair, same as before. */}
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

        {/* Capacity & Power */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacity & Power</h3>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Capacity" hint="Port count or splitter ratio, e.g. 1:8, 1:16, 64.">
              <Input placeholder="e.g. 1:16" value={capacity} onChange={e => setCapacity(e.target.value)} />
            </FormField>
            <FormField label="Power Source" required hint="Primary supply.">
              <Select value={powerSource} onChange={e => setPowerSource(e.target.value)}>
                {POWER_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="Power Backup Type" required hint="Backup equipment installed.">
              <Select value={powerBackup} onChange={e => setPowerBackup(e.target.value)}>
                {POWER_BACKUP_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Backup Power Present (UPS/Battery)">
              <Select value={hasBackupPower ? 'yes' : 'no'} onChange={e => { const v = e.target.value === 'yes'; setHasBackupPower(v); if (!v) setErrors(er => ({ ...er, backupHours: undefined })) }}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Select>
            </FormField>
            {hasBackupPower && (
              <FormField label="Backup Hours" required error={errors.backupHours}>
                <Input type="number" min="0" placeholder="e.g. 4" value={backupHours} onChange={e => { setBackupHours(e.target.value); setErrors(er => ({ ...er, backupHours: undefined })) }} />
              </FormField>
            )}
          </div>
        </div>

        {/* Site Ownership & Contacts */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Site Ownership & Contacts</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Site Ownership" required>
              <Select value={siteOwnership} onChange={e => setSiteOwnership(e.target.value)}>
                {SITE_OWNERSHIP_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </FormField>
            <FormField label="Rent & Agreement Expiry" hint="Optional.">
              <Input type="date" value={rentAgreementExpiry} onChange={e => setRentAgreementExpiry(e.target.value)} />
            </FormField>
          </div>
          {showsLandlordFields && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50/60 rounded-lg border border-surface-border">
              <FormField label="Owner / Landlord Name">
                <Input placeholder="e.g. Ramesh Gupta" value={ownerContactName} onChange={e => setOwnerContactName(e.target.value)} />
              </FormField>
              <FormField label="Owner / Landlord Phone">
                <Input type="tel" placeholder="e.g. 9820011223" value={ownerContactPhone} onChange={e => setOwnerContactPhone(e.target.value)} />
              </FormField>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Site Contact Person">
              <Input placeholder="e.g. Arjun Kumar" value={siteContactName} onChange={e => setSiteContactName(e.target.value)} />
            </FormField>
            <FormField label="Site Contact Phone">
              <Input type="tel" placeholder="e.g. 9876543210" value={siteContactPhone} onChange={e => setSiteContactPhone(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Default In-charge Technician" hint="Field Engineer / Technician users.">
            <Select value={defaultTechnicianId} onChange={e => setDefaultTechnicianId(e.target.value)}>
              <option value="">Unassigned</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}{t.zone ? ` — ${t.zone}` : ''}</option>)}
            </Select>
          </FormField>
        </div>

        {/* Site Photos / Documents */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Site Photos / Documents</h3>
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark transition-colors cursor-pointer">
            <Upload size={13} /> Upload Photos / Documents
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={e => { handleFilesSelected(e.target.files); e.target.value = '' }}
            />
          </label>
          {documents.length > 0 && (
            <ul className="divide-y divide-surface-border border border-surface-border rounded-xl overflow-hidden">
              {documents.map((doc, idx) => (
                <li key={idx} className="flex items-center justify-between px-3 py-2 text-sm bg-white">
                  <a href={doc.dataUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-brand-blue truncate">
                    <FileText size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{doc.name}</span>
                  </a>
                  <button type="button" onClick={() => removeDocument(idx)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
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

        {/* Inventory Details — POP Inventory Management (PRD Phase 1). Kept
            as its own table (same underlying `equipment` rows as the table
            above, via updateEquipment) rather than widened into it — the
            table above is already 8 columns of network/device config, and
            adding this many asset-management columns to one table would
            make it unreadable. Last Cleaning/Last Maintenance and Linked
            Work Orders are read-only here (auto-stamped by Work Order
            resolution via popStore.js's markPOPCleaned()/
            markEquipmentMaintained() — see existingEquipmentById above),
            never hand-edited on this form; a Warranty/AMC "expiring soon"
            flag is also shown on the dedicated, read-focused POP Inventory
            view (POPInventory.jsx), reachable from POP Management's list/
            detail pages.

            One row per item, one column per field — a two-row-per-item card
            layout was tried here and reverted; horizontal scroll on a wide
            table (overflow-x-auto below) is the accepted tradeoff for
            keeping every field readable in a single row. Each column is
            sized generously (not the original cramped widths) so its own
            content never gets visually truncated — Serial Number in
            particular is now wide enough for a realistic value like
            "SN-HUAWEIMA5600-04". Category/Condition stay as compact
            pill-styled <select>s (BadgeSelect) rather than full-width
            FormInputs.Selects — still fully editable dropdowns, just
            visually lighter so they don't need as much of that width. */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inventory Details</h3>
          <div className="border border-surface-border rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-surface-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Item</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-56">Serial Number</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Install Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Last Cleaning</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Last Maintenance</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Warranty/AMC Expiry</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Condition</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Linked Work Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {equipment.map(row => {
                  const savedEq = existingEquipmentById[row.id]
                  const linkedCount = existing ? getWorkOrdersForEquipment(existing.id, row.id).length : 0
                  return (
                  <tr key={row.id}>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap" title={row.label || undefined}>
                      {row.label || <span className="text-gray-300">Untitled</span>}
                      {row.type && <span className="text-gray-400"> · {row.type}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <BadgeSelect
                        value={row.itemCategory}
                        onChange={e => updateEquipment(row.id, { itemCategory: e.target.value })}
                        options={EQUIPMENT_ITEM_CATEGORIES}
                        colorMap={ITEM_CATEGORY_BADGE}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        placeholder="e.g. SN-ZTEC300-01"
                        value={row.serialNumber}
                        title={row.serialNumber || undefined}
                        onChange={e => updateEquipment(row.id, { serialNumber: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min="1" value={row.quantity} onChange={e => updateEquipment(row.id, { quantity: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="date" value={row.installDate} onChange={e => updateEquipment(row.id, { installDate: e.target.value })} />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{savedEq?.lastCleaningDate ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{savedEq?.lastMaintenanceDate ?? '—'}</td>
                    <td className="px-3 py-2">
                      <Input type="date" value={row.warrantyAmcExpiry} onChange={e => updateEquipment(row.id, { warrantyAmcExpiry: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <BadgeSelect
                        value={row.condition}
                        onChange={e => updateEquipment(row.id, { condition: e.target.value })}
                        options={EQUIPMENT_CONDITIONS}
                        colorMap={CONDITION_BADGE}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setLinkedWorkOrdersFor(row)}
                        disabled={linkedCount === 0}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors ${
                          linkedCount === 0
                            ? 'text-gray-300 cursor-default'
                            : 'text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 cursor-pointer'
                        }`}
                      >
                        <Wrench size={12} /> {linkedCount}
                      </button>
                    </td>
                  </tr>
                  )
                })}
                {equipment.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-xs text-gray-400">Add equipment above to set its inventory details.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Modal
          isOpen={!!linkedWorkOrdersFor}
          onClose={() => setLinkedWorkOrdersFor(null)}
          title={`Work Orders — ${linkedWorkOrdersFor?.label ?? ''}`}
          size="md"
        >
          {(() => {
            const linkedWorkOrders = (existing && linkedWorkOrdersFor)
              ? getWorkOrdersForEquipment(existing.id, linkedWorkOrdersFor.id)
              : []
            return linkedWorkOrders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No Work Orders reference this equipment item yet.</p>
            ) : (
              <ul className="divide-y divide-surface-border -mx-2">
                {linkedWorkOrders.map(wo => (
                  <li key={wo.id} className="flex items-center justify-between gap-3 px-2 py-2.5">
                    <span>
                      <span className="block text-sm font-medium text-gray-800 font-mono">{wo.id}</span>
                      <span className="block text-xs text-gray-500">{wo.category} · {wo.scheduledDateTime?.slice(0, 10) ?? '—'}</span>
                    </span>
                    <Badge variant={WO_STATUS_BADGE[wo.status] ?? 'gray'} dot size="sm">{wo.status}</Badge>
                  </li>
                ))}
              </ul>
            )
          })()}
        </Modal>

        <div className="flex justify-end pt-4 border-t border-surface-border">
          <Button icon={<Save size={14} />} onClick={handleSave}>Save POP</Button>
        </div>
      </div>
    </div>
  )
}
