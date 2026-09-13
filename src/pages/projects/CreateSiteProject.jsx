import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Save, X } from 'lucide-react'
import Button from '../../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormInputs'
import {
  generateSiteProjectId, saveSiteProject, SITE_TYPES, COMPETITOR_OPTIONS, SITE_PROJECT_STATUSES,
} from '../../data/projectStore'

function emptyCapacityForm() {
  return { homePasses: '', flatsCount: '', towersCount: '', shopUnits: '', residentialUnits: '', commercialUnits: '' }
}

export default function CreateSiteProject() {
  const navigate = useNavigate()

  // Generated once for this creation session (same lazy-init idiom as
  // CreateHDDProject.jsx's projectId — shown read-only, reused as-is at
  // save time so the displayed id and the persisted id never diverge).
  const [projectId] = useState(generateSiteProjectId)

  const [name, setName] = useState('')
  const [builderName, setBuilderName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [address, setAddress] = useState('')
  const [pincode, setPincode] = useState('')
  const [geo, setGeo] = useState({ lat: '', lng: '' })

  const [siteType, setSiteType] = useState(SITE_TYPES[0])
  const [capacityForm, setCapacityForm] = useState(emptyCapacityForm)

  const [competitors, setCompetitors] = useState([])
  const [expectedClosureDate, setExpectedClosureDate] = useState('')

  const [errors, setErrors] = useState({})

  function setGeoField(k, v) { setGeo(g => ({ ...g, [k]: v })); setErrors(e => ({ ...e, [`geo.${k}`]: undefined })) }
  function setCapacityField(k, v) { setCapacityForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  function toggleCompetitor(name) {
    setCompetitors(list => list.includes(name) ? list.filter(c => c !== name) : [...list, name])
  }

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name = 'Project site name is required.'
    if (!builderName.trim()) errs.builderName = 'Builder / Developer name is required.'
    if (!contactPerson.trim()) errs.contactPerson = 'Contact person name is required.'
    if (!contactNumber.trim()) errs.contactNumber = 'Contact person number is required.'
    if (!address.trim()) errs.address = 'Site address is required.'
    if (!pincode.trim()) errs.pincode = 'Pincode is required.'
    if (geo.lat === '' || Number.isNaN(Number(geo.lat))) errs['geo.lat'] = 'Enter a valid latitude.'
    if (geo.lng === '' || Number.isNaN(Number(geo.lng))) errs['geo.lng'] = 'Enter a valid longitude.'

    if (siteType === 'Residential') {
      if (capacityForm.homePasses === '' || Number.isNaN(Number(capacityForm.homePasses)) || Number(capacityForm.homePasses) < 0) errs.homePasses = 'Enter a valid home passes count.'
      if (capacityForm.flatsCount === '' || Number.isNaN(Number(capacityForm.flatsCount)) || Number(capacityForm.flatsCount) < 0) errs.flatsCount = 'Enter a valid flats count.'
      if (capacityForm.towersCount === '' || Number.isNaN(Number(capacityForm.towersCount)) || Number(capacityForm.towersCount) < 0) errs.towersCount = 'Enter a valid towers count.'
    } else if (siteType === 'Commercial') {
      if (capacityForm.shopUnits === '' || Number.isNaN(Number(capacityForm.shopUnits)) || Number(capacityForm.shopUnits) < 0) errs.shopUnits = 'Enter a valid shop/office unit count.'
    } else {
      if (capacityForm.residentialUnits === '' || Number.isNaN(Number(capacityForm.residentialUnits)) || Number(capacityForm.residentialUnits) < 0) errs.residentialUnits = 'Enter a valid residential unit count.'
      if (capacityForm.commercialUnits === '' || Number.isNaN(Number(capacityForm.commercialUnits)) || Number(capacityForm.commercialUnits) < 0) errs.commercialUnits = 'Enter a valid commercial unit count.'
    }

    if (!expectedClosureDate) errs.expectedClosureDate = 'Expected closure date is required.'
    return errs
  }

  function buildCapacity() {
    if (siteType === 'Residential') {
      return {
        homePasses: Number(capacityForm.homePasses) || 0,
        flatsCount: Number(capacityForm.flatsCount) || 0,
        towersCount: Number(capacityForm.towersCount) || 0,
      }
    }
    if (siteType === 'Commercial') {
      return { shopUnits: Number(capacityForm.shopUnits) || 0 }
    }
    return {
      residentialUnits: Number(capacityForm.residentialUnits) || 0,
      commercialUnits: Number(capacityForm.commercialUnits) || 0,
    }
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    const saved = saveSiteProject({
      id: projectId,
      name: name.trim(),
      builderName: builderName.trim(),
      contactPerson: contactPerson.trim(),
      contactNumber: contactNumber.trim(),
      address: address.trim(),
      pincode: pincode.trim(),
      geo: { lat: Number(geo.lat), lng: Number(geo.lng) },
      siteType,
      capacity: buildCapacity(),
      competitors,
      expectedClosureDate,
      status: SITE_PROJECT_STATUSES[0],
    })
    navigate(`/projects/site/${saved.id}`)
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
          <h1 className="text-xl font-bold text-gray-900">New Site Project</h1>
          <p className="text-xs text-gray-500 mt-0.5">Project ID: <span className="font-mono font-semibold text-brand-blue">{projectId}</span></p>
        </div>
      </div>

      <div className="max-w-4xl bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-6">
        {/* Basic Site & Builder Information */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic Site &amp; Builder Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Project Site Name" required error={errors.name}>
              <Input placeholder="e.g. Ace City" value={name} onChange={e => { setName(e.target.value); setErrors(er => ({ ...er, name: undefined })) }} />
            </FormField>
            <FormField label="Project ID">
              <Input value={projectId} disabled className="font-mono" />
            </FormField>
            <FormField label="Builder / Developer Name" required error={errors.builderName}>
              <Input placeholder="e.g. Ace Group" value={builderName} onChange={e => { setBuilderName(e.target.value); setErrors(er => ({ ...er, builderName: undefined })) }} />
            </FormField>
            <FormField label="Contact Person Name" required error={errors.contactPerson}>
              <Input placeholder="e.g. Vikram Rao" value={contactPerson} onChange={e => { setContactPerson(e.target.value); setErrors(er => ({ ...er, contactPerson: undefined })) }} />
            </FormField>
            <FormField label="Contact Person Number" required error={errors.contactNumber}>
              <Input type="tel" placeholder="e.g. 98200 11223" value={contactNumber} onChange={e => { setContactNumber(e.target.value); setErrors(er => ({ ...er, contactNumber: undefined })) }} />
            </FormField>
            <FormField label="Pincode" required error={errors.pincode}>
              <Input placeholder="e.g. 201301" value={pincode} onChange={e => { setPincode(e.target.value); setErrors(er => ({ ...er, pincode: undefined })) }} />
            </FormField>
          </div>
          <FormField label="Site Full Address" required error={errors.address}>
            <Textarea rows={2} placeholder="Full site address" value={address} onChange={e => { setAddress(e.target.value); setErrors(er => ({ ...er, address: undefined })) }} />
          </FormField>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Geolocation Pin</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Latitude" required error={errors['geo.lat']}>
                <Input type="number" placeholder="e.g. 28.5355" value={geo.lat} onChange={e => setGeoField('lat', e.target.value)} />
              </FormField>
              <FormField label="Longitude" required error={errors['geo.lng']}>
                <Input type="number" placeholder="e.g. 77.3910" value={geo.lng} onChange={e => setGeoField('lng', e.target.value)} />
              </FormField>
            </div>
          </div>
        </div>

        {/* Dynamic Capacity & Site Type Logic */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacity &amp; Site Type</h3>
          <FormField label="Site Type" required>
            <Select value={siteType} onChange={e => setSiteType(e.target.value)}>
              {SITE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormField>

          {siteType === 'Residential' && (
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Total Home Passes" required error={errors.homePasses}>
                <Input type="number" min="0" placeholder="e.g. 850" value={capacityForm.homePasses} onChange={e => setCapacityField('homePasses', e.target.value)} />
              </FormField>
              <FormField label="Flats Count" required error={errors.flatsCount}>
                <Input type="number" min="0" placeholder="e.g. 800" value={capacityForm.flatsCount} onChange={e => setCapacityField('flatsCount', e.target.value)} />
              </FormField>
              <FormField label="Towers Count" required error={errors.towersCount}>
                <Input type="number" min="0" placeholder="e.g. 4" value={capacityForm.towersCount} onChange={e => setCapacityField('towersCount', e.target.value)} />
              </FormField>
            </div>
          )}

          {siteType === 'Commercial' && (
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Total Shops / Office Units" required error={errors.shopUnits}>
                <Input type="number" min="0" placeholder="e.g. 120" value={capacityForm.shopUnits} onChange={e => setCapacityField('shopUnits', e.target.value)} />
              </FormField>
            </div>
          )}

          {siteType === 'Mixed-Use' && (
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Flats / Residential Units" required error={errors.residentialUnits}>
                <Input type="number" min="0" placeholder="e.g. 500" value={capacityForm.residentialUnits} onChange={e => setCapacityField('residentialUnits', e.target.value)} />
              </FormField>
              <FormField label="Shops / Commercial Units" required error={errors.commercialUnits}>
                <Input type="number" min="0" placeholder="e.g. 60" value={capacityForm.commercialUnits} onChange={e => setCapacityField('commercialUnits', e.target.value)} />
              </FormField>
            </div>
          )}
        </div>

        {/* Market Intelligence & Dates */}
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Market Intelligence &amp; Dates</h3>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Existing Competitors Inside Site</p>
            {competitors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {competitors.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
                    {name}
                    <button type="button" onClick={() => toggleCompetitor(name)} className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {COMPETITOR_OPTIONS.filter(name => !competitors.includes(name)).map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleCompetitor(name)}
                  className="px-2.5 py-1 rounded-full border border-surface-border text-xs text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Expected Closure Date" required error={errors.expectedClosureDate}>
              <Input type="date" value={expectedClosureDate} onChange={e => { setExpectedClosureDate(e.target.value); setErrors(er => ({ ...er, expectedClosureDate: undefined })) }} />
            </FormField>
            <FormField label="Initial Status">
              <div className="flex items-center gap-2 px-3 py-2 text-sm border border-surface-border rounded-lg bg-gray-50 text-gray-600">
                <Building2 size={14} className="text-brand-blue shrink-0" /> NEW / PROSPECT
              </div>
            </FormField>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-surface-border">
          <Button icon={<Save size={14} />} onClick={handleSave}>Create Site Project</Button>
        </div>
      </div>
    </div>
  )
}
