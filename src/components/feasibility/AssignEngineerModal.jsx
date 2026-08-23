import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { FormField, Select, Textarea } from '../ui/FormInputs'
import { updateFeasibilityStatus, FEASIBILITY_ENGINEERS as ENGINEERS } from '../../data/feasibilityStore'

// Shared "Assign Engineer" modal for a feasibility request — originally
// built inline on the Feasibility Requests list page (row action), reused
// as-is here so the Feasibility Request Detail page's Actions dropdown
// opens the exact same UI/behavior instead of its own single-select variant.
export default function AssignEngineerModal({ isOpen, request, onClose, onAssigned }) {
  const [form, setForm] = useState({ engineers: [], priority: 'Medium', notes: '' })
  const [engSearch, setEngSearch] = useState('')

  // Pre-fill whenever the modal opens (including for a different request)
  // so add vs. re-assign pre-fill correctly, same as the list page's
  // startAssign() did.
  useEffect(() => {
    if (isOpen && request) {
      const existing = request.assignedEngineer ? request.assignedEngineer.split(', ').filter(Boolean) : []
      setForm({ engineers: existing, priority: request.priority || 'Medium', notes: '' })
      setEngSearch('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, request?.id])

  function toggleEngineer(name) {
    setForm(f => ({
      ...f,
      engineers: f.engineers.includes(name) ? f.engineers.filter(e => e !== name) : [...f.engineers, name],
    }))
  }

  function handleAssign() {
    updateFeasibilityStatus(request.id, 'Assigned', {
      assignedEngineer: form.engineers.join(', '),
      priority: form.priority,
    })
    onAssigned()
  }

  const filtered = ENGINEERS.filter(e => e.name.toLowerCase().includes(engSearch.toLowerCase()))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Engineer — ${request?.id}`}
      size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleAssign} disabled={form.engineers.length === 0}>Assign Engineer</Button>
      </>}
    >
      <div className="space-y-4">
        {/* Section 1 — Engineers */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Engineers <span className="text-red-500">*</span></p>

          {/* Selected chips */}
          {form.engineers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.engineers.map(name => (
                <span key={name} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium">
                  {name}
                  <button type="button" onClick={() => toggleEngineer(name)}
                    className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative mb-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={engSearch}
              onChange={e => setEngSearch(e.target.value)}
              placeholder="Search engineer..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400 text-gray-800"
            />
          </div>

          {/* Filtered list */}
          <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden max-h-[200px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No engineers found</p>
            ) : filtered.map(eng => {
              const selected = form.engineers.includes(eng.name)
              return (
                <label key={eng.name}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox"
                    checked={selected}
                    onChange={() => toggleEngineer(eng.name)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
                  />
                  <div className={`w-6 h-6 rounded-full ${eng.color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                    {eng.initials}
                  </div>
                  <span className="text-sm text-gray-700">{eng.name}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Section 3 — Priority */}
        <FormField label="Priority" required>
          <Select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
          </Select>
        </FormField>

        {/* Section 4 — Internal Notes */}
        <FormField label="Internal Notes">
          <Textarea rows={2} placeholder="Any notes for the engineers…"
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </FormField>
      </div>
    </Modal>
  )
}
