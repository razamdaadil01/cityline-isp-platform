import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, X, CheckCircle2 } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { createOutage, OUTAGE_TYPES, SEVERITIES } from '../data/outagesStore'
import { getAllLocalities } from '../data/areaMappingStore'

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} className="text-brand-blue" />
        <p className="text-sm font-bold text-gray-700">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        {children}
      </div>
    </div>
  )
}

function AreaMultiSelect({ selected, onChange, areas }) {
  function toggle(area) {
    onChange(selected.includes(area) ? selected.filter(a => a !== area) : [...selected, area])
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(area => (
            <span key={area} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
              {area}
              <button type="button" onClick={() => toggle(area)} className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[180px] overflow-y-auto">
        {areas.map(area => {
          const isSelected = selected.includes(area)
          return (
            <label key={area} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <input type="checkbox" checked={isSelected} onChange={() => toggle(area)}
                className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
              <MapPin size={12} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">{area}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default function OutageCreate() {
  const navigate = useNavigate()
  const areas = useMemo(() => getAllLocalities(), [])

  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [affectedAreas, setAffectedAreas] = useState([])
  const [affectedEquipment, setAffectedEquipment] = useState('')
  const [startTime, setStartTime] = useState('')
  const [severity, setSeverity] = useState('')
  const [description, setDescription] = useState('')
  const [expectedRestorationTime, setExpectedRestorationTime] = useState('')
  const [customerMessage, setCustomerMessage] = useState('')

  const canCreate = title.trim() && type && affectedAreas.length > 0 && affectedEquipment.trim() &&
    startTime && severity && description.trim() && expectedRestorationTime && customerMessage.trim()

  function handleCreate() {
    if (!canCreate) return
    const outage = createOutage({
      title: title.trim(),
      type,
      affectedAreas,
      affectedEquipment: affectedEquipment.trim(),
      startTime: new Date(startTime).toISOString(),
      severity,
      description: description.trim(),
      expectedRestorationTime: new Date(expectedRestorationTime).toISOString(),
      customerMessage: customerMessage.trim(),
    })
    navigate(`/support/outages/${outage.id}`)
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">

      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/support/outages')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create Outage</h1>
          <p className="text-sm text-gray-500 mt-0.5">Confirm a network outage and notify affected customers</p>
        </div>
      </div>

      <SectionCard title="Outage Details" icon={MapPin}>
        <FormField label="Outage Title" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fiber Cut Near Four Bungalows Junction" />
        </FormField>
        <FormField label="Outage Type" required>
          <Select value={type} onChange={e => setType(e.target.value)}>
            <option value="">Select type…</option>
            {OUTAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>

        <div className="col-span-2">
          <FormField label="Affected Area(s)" required hint="Pulled from the area/locality mapping — select every affected locality">
            <AreaMultiSelect selected={affectedAreas} onChange={setAffectedAreas} areas={areas} />
          </FormField>
        </div>

        <FormField label="Affected Equipment" required>
          <Input value={affectedEquipment} onChange={e => setAffectedEquipment(e.target.value)} placeholder="e.g. OLT-AW-02, Junction Box #23" />
        </FormField>
        <FormField label="Severity" required>
          <Select value={severity} onChange={e => setSeverity(e.target.value)}>
            <option value="">Select severity…</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>

        <FormField label="Start Time" required>
          <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
        </FormField>
        <FormField label="Expected Restoration Time" required>
          <Input type="datetime-local" value={expectedRestorationTime} onChange={e => setExpectedRestorationTime(e.target.value)} />
        </FormField>

        <div className="col-span-2">
          <FormField label="Description" required>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Internal description of the outage and its cause…" />
          </FormField>
        </div>
        <div className="col-span-2">
          <FormField label="Customer Message" required hint="Shown to customers who report this issue">
            <Textarea value={customerMessage} onChange={e => setCustomerMessage(e.target.value)} rows={2} placeholder="What should customers be told?" />
          </FormField>
        </div>
      </SectionCard>

      <div className="flex items-center justify-end gap-3 pb-2">
        <Button variant="secondary" onClick={() => navigate('/support/outages')}>Cancel</Button>
        <Button onClick={handleCreate} disabled={!canCreate} icon={<CheckCircle2 size={15} />}>
          Create Outage
        </Button>
      </div>
    </div>
  )
}
