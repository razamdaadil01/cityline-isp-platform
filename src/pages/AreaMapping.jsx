import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, ChevronRight, ChevronDown, Edit2, Trash2, Save, X, MapPin,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select } from '../components/ui/FormInputs'
import {
  getAreas, saveArea, deleteArea, subscribeAreas,
  getStates, getDistricts, getAreasList, getLocalities,
} from '../data/areaMappingStore'

const SITE_TYPES = ['FTTH', 'Sector', 'Village']
const FEASIBILITY_OPTIONS = ['Feasible', 'Not Feasible', 'Pending']
const FORM_TABS = ['State', 'District', 'Area', 'Locality', 'Sub Locality']

const EMPTY_FORM = {
  state: '', district: '', area: '', locality: '', subLocality: '',
  siteType: 'FTTH', branchCode: '', feasibility: 'Feasible', active: true,
}

// ── Tree helpers ──────────────────────────────────────────────────────────────

function buildTree(areas) {
  const tree = {}
  areas.forEach(a => {
    tree[a.state] = tree[a.state] || {}
    tree[a.state][a.district] = tree[a.state][a.district] || {}
    tree[a.state][a.district][a.area] = tree[a.state][a.district][a.area] || {}
    tree[a.state][a.district][a.area][a.locality] = tree[a.state][a.district][a.area][a.locality] || []
    tree[a.state][a.district][a.area][a.locality].push(a)
  })
  return tree
}

// ── Tree Node ─────────────────────────────────────────────────────────────────

function TreeNode({ label, level = 0, children, items, onEdit, onDelete }) {
  const [open, setOpen] = useState(true)
  const hasChildren = children || items?.length
  const indent = level * 14

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 w-full text-left py-1.5 px-2 rounded-lg hover:bg-gray-100 text-sm transition-colors"
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        {hasChildren
          ? open ? <ChevronDown size={13} className="text-gray-400 shrink-0" /> : <ChevronRight size={13} className="text-gray-400 shrink-0" />
          : <span className="w-[13px] shrink-0" />
        }
        <MapPin size={12} className={`shrink-0 ${level === 0 ? 'text-brand-blue' : level === 1 ? 'text-navy' : 'text-brand-orange'}`} />
        <span className={`font-${level === 0 ? 'semibold' : level <= 2 ? 'medium' : 'normal'} text-gray-${level === 0 ? '900' : '700'} truncate`}>
          {label}
        </span>
      </button>

      {open && children}

      {open && items?.map(item => (
        <div
          key={item.id}
          className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 group"
          style={{ paddingLeft: `${8 + indent + 14}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-gray-300 text-xs">•</span>
            <span className="text-sm text-gray-700 truncate">{item.subLocality}</span>
            <span className="text-xs text-gray-400 shrink-0">→ {item.siteType} · {item.branchCode}</span>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => onEdit(item)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600">
              <Edit2 size={11} />
            </button>
            <button onClick={() => onDelete(item.id)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Form Panel ────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-blue' : 'bg-gray-200'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function AreaForm({ initial, onSave, onCancel }) {
  const [tab, setTab] = useState('Sub Locality')
  const [form, setForm] = useState(initial || { ...EMPTY_FORM })
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const states = getStates()
  const districts = form.state ? getDistricts(form.state) : []
  const areas = form.state && form.district ? getAreasList(form.state, form.district) : []
  const localities = form.state && form.district && form.area ? getLocalities(form.state, form.district, form.area) : []

  function validate() {
    const e = {}
    if (!form.state.trim()) e.state = 'Required'
    if (!form.district.trim()) e.district = 'Required'
    if (!form.area.trim()) e.area = 'Required'
    if (!form.locality.trim()) e.locality = 'Required'
    if (!form.subLocality.trim()) e.subLocality = 'Required'
    if (!form.branchCode.trim()) e.branchCode = 'Required'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave(form)
  }

  return (
    <div className="flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-surface-border px-4 pt-4 gap-1 flex-wrap sticky top-0 bg-white z-10">
        {FORM_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
              tab === t
                ? 'border-brand-blue text-brand-blue bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* State */}
        <FormField label="State" required>
          {tab === 'State'
            ? <Input value={form.state} onChange={e => { set('state', e.target.value); set('district', ''); set('area', ''); set('locality', '') }}
                placeholder="e.g. Uttar Pradesh" error={errors.state} />
            : <Select value={form.state} onChange={e => { set('state', e.target.value); set('district', ''); set('area', ''); set('locality', '') }}
                className={errors.state ? 'border-red-400' : ''}>
                <option value="">Select state…</option>
                {states.map(s => <option key={s}>{s}</option>)}
                <option value="__new__">+ Add new state</option>
              </Select>
          }
          {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
        </FormField>

        {/* District */}
        {(tab === 'District' || tab === 'Area' || tab === 'Locality' || tab === 'Sub Locality') && (
          <FormField label="District" required>
            {tab === 'District'
              ? <Input value={form.district} onChange={e => { set('district', e.target.value); set('area', ''); set('locality', '') }}
                  placeholder="e.g. Gautam Buddha Nagar" error={errors.district} />
              : <Select value={form.district} onChange={e => { set('district', e.target.value); set('area', ''); set('locality', '') }}
                  className={errors.district ? 'border-red-400' : ''}>
                  <option value="">Select district…</option>
                  {districts.map(d => <option key={d}>{d}</option>)}
                  <option value="__new__">+ Add new district</option>
                </Select>
            }
            {errors.district && <p className="text-xs text-red-500 mt-1">{errors.district}</p>}
          </FormField>
        )}

        {/* Area */}
        {(tab === 'Area' || tab === 'Locality' || tab === 'Sub Locality') && (
          <FormField label="Area" required>
            {tab === 'Area'
              ? <Input value={form.area} onChange={e => { set('area', e.target.value); set('locality', '') }}
                  placeholder="e.g. Noida" error={errors.area} />
              : <Select value={form.area} onChange={e => { set('area', e.target.value); set('locality', '') }}
                  className={errors.area ? 'border-red-400' : ''}>
                  <option value="">Select area…</option>
                  {areas.map(a => <option key={a}>{a}</option>)}
                  <option value="__new__">+ Add new area</option>
                </Select>
            }
            {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
          </FormField>
        )}

        {/* Locality */}
        {(tab === 'Locality' || tab === 'Sub Locality') && (
          <FormField label="Locality" required>
            <Input value={form.locality} onChange={e => set('locality', e.target.value)}
              placeholder="e.g. Sector 62" error={errors.locality} />
            {errors.locality && <p className="text-xs text-red-500 mt-1">{errors.locality}</p>}
          </FormField>
        )}

        {/* Sub Locality fields */}
        {tab === 'Sub Locality' && (
          <>
            <FormField label="Sub Locality" required>
              <Input value={form.subLocality} onChange={e => set('subLocality', e.target.value)}
                placeholder="e.g. Tower A" error={errors.subLocality} />
              {errors.subLocality && <p className="text-xs text-red-500 mt-1">{errors.subLocality}</p>}
            </FormField>

            <FormField label="Site Type">
              <Select value={form.siteType} onChange={e => set('siteType', e.target.value)}>
                {SITE_TYPES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </FormField>

            <FormField label="Branch Code" required>
              <Input value={form.branchCode} onChange={e => set('branchCode', e.target.value)}
                placeholder="e.g. CNPL-001" error={errors.branchCode} />
              {errors.branchCode && <p className="text-xs text-red-500 mt-1">{errors.branchCode}</p>}
            </FormField>

            <FormField label="Feasibility Status">
              <Select value={form.feasibility} onChange={e => set('feasibility', e.target.value)}>
                {FEASIBILITY_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </Select>
            </FormField>

            <div className="flex items-center justify-between p-3 rounded-lg border border-surface-border">
              <div>
                <p className="text-sm font-medium text-gray-700">Active</p>
                <p className="text-xs text-gray-400 mt-0.5">Show this sub-locality in lead forms</p>
              </div>
              <Toggle checked={form.active} onChange={v => set('active', v)} />
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-t border-surface-border flex justify-end gap-2 sticky bottom-0 bg-white z-10">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" icon={<Save size={13} />} onClick={handleSave}>Save</Button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AreaMapping() {
  const navigate = useNavigate()
  const [areas, setAreas] = useState(getAreas())
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => subscribeAreas(setAreas), [])

  const tree = buildTree(areas)

  function handleSave(form) {
    // handle __new__ sentinel values
    const cleaned = { ...form }
    if (cleaned.state === '__new__') cleaned.state = ''
    if (cleaned.district === '__new__') cleaned.district = ''
    if (cleaned.area === '__new__') cleaned.area = ''
    saveArea(cleaned)
    setShowForm(false)
    setEditItem(null)
  }

  function handleEdit(item) {
    setEditItem(item)
    setShowForm(true)
  }

  function handleDelete(id) {
    setDeleteId(id)
  }

  function confirmDelete() {
    deleteArea(deleteId)
    setDeleteId(null)
  }

  const feasVariant = { Feasible: 'green', 'Not Feasible': 'red', Pending: 'yellow' }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/settings')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Area Mapping</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage service areas, localities and feasibility settings</p>
            </div>
          </div>
          <Button icon={<Plus size={14} />} onClick={() => { setEditItem(null); setShowForm(true) }}>
            + Add Area
          </Button>
        </div>
      </div>

      {/* Body — two-panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tree */}
        <div className="w-80 shrink-0 border-r border-surface-border bg-white overflow-y-auto p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">Hierarchy</p>
          {Object.entries(tree).map(([state, districts]) => (
            <TreeNode key={state} label={state} level={0}>
              {Object.entries(districts).map(([district, areasMap]) => (
                <TreeNode key={district} label={district} level={1}>
                  {Object.entries(areasMap).map(([area, localitiesMap]) => (
                    <TreeNode key={area} label={area} level={2}>
                      {Object.entries(localitiesMap).map(([locality, subItems]) => (
                        <TreeNode key={locality} label={locality} level={3}
                          items={subItems} onEdit={handleEdit} onDelete={handleDelete} />
                      ))}
                    </TreeNode>
                  ))}
                </TreeNode>
              ))}
            </TreeNode>
          ))}
          {areas.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <MapPin size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No areas added yet</p>
            </div>
          )}
        </div>

        {/* Right: Form or summary */}
        <div className="flex-1 overflow-y-auto">
          {showForm ? (
            <AreaForm
              initial={editItem ? { ...editItem } : null}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditItem(null) }}
            />
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Total Sub Localities', value: areas.length, color: 'text-brand-blue' },
                  { label: 'Feasible', value: areas.filter(a => a.feasibility === 'Feasible').length, color: 'text-emerald-600' },
                  { label: 'Pending Feasibility', value: areas.filter(a => a.feasibility === 'Pending').length, color: 'text-amber-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-surface-border p-4">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-border bg-gray-50/80 grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span>Location</span>
                  <span>Branch Code</span>
                  <span>Site Type</span>
                  <span>Feasibility</span>
                  <span>Actions</span>
                </div>
                <div className="divide-y divide-surface-border">
                  {areas.map(a => (
                    <div key={a.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-gray-50/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.subLocality}</p>
                        <p className="text-xs text-gray-400 truncate">{a.locality} · {a.area} · {a.district}</p>
                      </div>
                      <span className="text-sm font-mono text-gray-700">{a.branchCode}</span>
                      <Badge variant="blue" size="sm">{a.siteType}</Badge>
                      <Badge variant={feasVariant[a.feasibility] || 'gray'} size="sm">{a.feasibility}</Badge>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(a)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(a.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Sub Locality" size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={confirmDelete}>Delete</Button>
        </>}>
        <p className="text-sm text-gray-600">Are you sure you want to delete this sub locality entry? This action cannot be undone.</p>
      </Modal>
    </div>
  )
}
