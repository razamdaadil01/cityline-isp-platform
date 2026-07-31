import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, CheckCircle2, Plus, X, Wrench } from 'lucide-react'
import Button from '../components/ui/Button'
import NasPortMultiSelect from '../components/ui/NasPortMultiSelect'
import { FormField, Input, Select, Textarea } from '../components/ui/FormInputs'
import { createOutage, OUTAGE_TYPES, SEVERITIES, WHATSAPP_TEMPLATES } from '../data/outagesStore'
import { NAS_PORTS } from '../data/ticketsStore'
import { HARDWARE_CATALOG } from '../data/hardwareCatalog'

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

// ── Hardware Requirement — non-chargeable, so no price/total columns, just
// item + quantity rows, matching the searchable-dropdown + quantity pattern
// used by Ticket Detail's Add Hardware modal (minus the pricing fields). ──

function HardwareRequirementRow({ row, onChange, onRemove }) {
  const [search, setSearch] = useState(row.name)

  function pick(name) {
    setSearch(name)
    onChange({ ...row, name })
  }

  const filtered = search.trim()
    ? HARDWARE_CATALOG.filter(h => h.name.toLowerCase().includes(search.trim().toLowerCase()) && h.name !== search)
    : []

  return (
    <div className="flex items-start gap-2">
      <div className="relative flex-1">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); onChange({ ...row, name: e.target.value }) }}
          placeholder="Search hardware item…"
          className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
        {filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full border border-surface-border rounded-lg overflow-hidden shadow-lg bg-white max-h-40 overflow-y-auto">
            {filtered.map(h => (
              <button key={h.name} type="button" onClick={() => pick(h.name)}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-brand-blue/5 transition-colors border-b border-surface-border last:border-0">
                {h.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <Input type="number" min="1" value={row.quantity} onChange={e => onChange({ ...row, quantity: e.target.value })}
        className="w-24" placeholder="Qty" />
      <button type="button" onClick={onRemove}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-surface-border text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}

export default function OutageCreate() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [affectedNasPorts, setAffectedNasPorts] = useState([])
  const [affectedEquipment, setAffectedEquipment] = useState('')
  const [serverId, setServerId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [severity, setSeverity] = useState('')
  const [description, setDescription] = useState('')
  const [expectedRestorationTime, setExpectedRestorationTime] = useState('')
  const [customerMessage, setCustomerMessage] = useState('')
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(false)
  const [templateId, setTemplateId] = useState('')
  const [hardwareRequirement, setHardwareRequirement] = useState([])

  const selectedTemplate = WHATSAPP_TEMPLATES.find(t => t.id === templateId)

  function addHardwareRow() {
    setHardwareRequirement(rows => [...rows, { key: Date.now() + Math.random(), name: '', quantity: 1 }])
  }
  function updateHardwareRow(key, next) {
    setHardwareRequirement(rows => rows.map(r => r.key === key ? next : r))
  }
  function removeHardwareRow(key) {
    setHardwareRequirement(rows => rows.filter(r => r.key !== key))
  }

  const messageValid = sendViaWhatsApp ? !!templateId : !!customerMessage.trim()

  const canCreate = title.trim() && type && affectedNasPorts.length > 0 && affectedEquipment.trim() &&
    startTime && severity && description.trim() && expectedRestorationTime && messageValid

  function handleCreate() {
    if (!canCreate) return
    const outage = createOutage({
      title: title.trim(),
      type,
      affectedNasPorts,
      affectedEquipment: affectedEquipment.trim(),
      serverId: serverId.trim() || null,
      startTime: new Date(startTime).toISOString(),
      severity,
      description: description.trim(),
      expectedRestorationTime: new Date(expectedRestorationTime).toISOString(),
      customerMessage: sendViaWhatsApp ? selectedTemplate?.text ?? '' : customerMessage.trim(),
      sendViaWhatsApp,
      templateId: sendViaWhatsApp ? templateId : null,
      hardwareRequirement: hardwareRequirement
        .filter(r => r.name.trim() && Number(r.quantity) > 0)
        .map(r => ({ name: r.name.trim(), quantity: Number(r.quantity) })),
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
          <FormField label="Affected NAS Port ID(s)" required hint="Pulled from network NAS Port records — select every affected port.">
            <NasPortMultiSelect selected={affectedNasPorts} onChange={setAffectedNasPorts} ports={NAS_PORTS} />
          </FormField>
        </div>

        <FormField label="Affected Equipment" required>
          <Input value={affectedEquipment} onChange={e => setAffectedEquipment(e.target.value)} placeholder="e.g. OLT-AW-02, Junction Box #23" />
        </FormField>
        <FormField label="Server ID">
          <Input value={serverId} onChange={e => setServerId(e.target.value)} placeholder="e.g. SRV-MUM-04" />
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

        <div className="col-span-2 space-y-2">
          {!sendViaWhatsApp && (
            <FormField label="Customer Message" required hint="Shown to customers who report this issue">
              <Textarea value={customerMessage} onChange={e => setCustomerMessage(e.target.value)} rows={2} placeholder="What should customers be told?" />
            </FormField>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={sendViaWhatsApp} onChange={e => setSendViaWhatsApp(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
            <span className="text-sm text-gray-700">Send Message to Customer via WhatsApp</span>
          </label>

          {sendViaWhatsApp && (
            <div className="space-y-2 pt-1">
              <FormField label="Select Template" required hint="WhatsApp requires pre-approved message templates — freeform text can't be sent.">
                <Select value={templateId} onChange={e => setTemplateId(e.target.value)}>
                  <option value="">Select template…</option>
                  {WHATSAPP_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              </FormField>
              {selectedTemplate && (
                <div className="p-3 rounded-lg bg-gray-50 border border-surface-border text-sm text-gray-600">
                  {selectedTemplate.text}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="col-span-2 pt-2 border-t border-surface-border">
          <div className="flex items-center gap-2 mb-3">
            <Wrench size={14} className="text-brand-blue" />
            <p className="text-sm font-semibold text-gray-700">Hardware Requirement</p>
            <span className="text-xs text-gray-400">(non-chargeable)</span>
          </div>
          <div className="space-y-2">
            {hardwareRequirement.map(row => (
              <HardwareRequirementRow key={row.key} row={row}
                onChange={next => updateHardwareRow(row.key, next)}
                onRemove={() => removeHardwareRow(row.key)} />
            ))}
            <button type="button" onClick={addHardwareRow}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-blue bg-brand-blue/5 hover:bg-brand-blue/10 border border-brand-blue/20 rounded-lg transition-colors">
              <Plus size={13} /> Add Hardware Item
            </button>
          </div>
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
