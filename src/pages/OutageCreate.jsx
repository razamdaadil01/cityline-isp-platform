import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, X, CheckCircle2, Search, ChevronDown } from 'lucide-react'
import Button from '../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { createOutage, OUTAGE_TYPES, SEVERITIES } from '../data/outagesStore'
import { getAllLocalitiesGrouped } from '../data/areaMappingStore'

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

function AreaMultiSelect({ selected, onChange, groups }) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(new Set())

  function toggle(locality) {
    onChange(selected.includes(locality) ? selected.filter(a => a !== locality) : [...selected, locality])
  }

  function toggleGroup(localities) {
    const allSelected = localities.every(l => selected.includes(l))
    onChange(allSelected
      ? selected.filter(a => !localities.includes(a))
      : [...new Set([...selected, ...localities])])
  }

  function toggleCollapsed(area) {
    setCollapsed(c => {
      const next = new Set(c)
      next.has(area) ? next.delete(area) : next.add(area)
      return next
    })
  }

  const q = search.trim().toLowerCase()
  const filteredGroups = groups
    .map(g => ({
      ...g,
      localities: q
        ? g.localities.filter(l => l.toLowerCase().includes(q) || g.area.toLowerCase().includes(q))
        : g.localities,
    }))
    .filter(g => g.localities.length > 0)

  return (
    <div>
      {selected.length > 0 && (
        <p className="text-xs text-gray-500 mb-1.5">{selected.length} area{selected.length !== 1 ? 's' : ''} selected</p>
      )}

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

      <div className="relative mb-2">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search area/locality..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
        />
      </div>

      <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[220px] overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No areas found</p>
        ) : filteredGroups.map(g => {
          const isCollapsed = collapsed.has(g.area)
          const allSelected = g.localities.every(l => selected.includes(l))
          return (
            <div key={g.area}>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                <input type="checkbox" checked={allSelected} onChange={() => toggleGroup(g.localities)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
                <button type="button" onClick={() => toggleCollapsed(g.area)}
                  className="flex items-center gap-1.5 flex-1 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  <ChevronDown size={12} className={`transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`} />
                  {g.area} Zone
                  <span className="text-gray-400 font-normal normal-case">({g.localities.length})</span>
                </button>
              </div>
              {!isCollapsed && g.localities.map(locality => {
                const isSelected = selected.includes(locality)
                return (
                  <label key={locality}
                    className={`flex items-center gap-3 pl-8 pr-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(locality)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
                    <MapPin size={12} className="text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700">{locality}</span>
                  </label>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OutageCreate() {
  const navigate = useNavigate()
  const areaGroups = useMemo(() => getAllLocalitiesGrouped(), [])

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
            <AreaMultiSelect selected={affectedAreas} onChange={setAffectedAreas} groups={areaGroups} />
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
