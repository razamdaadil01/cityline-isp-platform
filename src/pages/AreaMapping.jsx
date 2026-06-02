import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, ChevronRight, ChevronDown, Edit2, Trash2, Save, MapPin, CheckCircle2,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select } from '../components/ui/FormInputs'
import {
  getAreas, saveArea, deleteArea, subscribeAreas, subscribeHierarchy,
  getStates, getDistricts, getAreasList, getLocalities,
  saveStateName, saveDistrictName, saveAreaName, saveLocalityName,
  updateStateName, updateDistrictName, updateAreaName, updateLocalityName,
  deleteStateName, deleteDistrictName, deleteAreaName, deleteLocalityName,
} from '../data/areaMappingStore'

const SITE_TYPES = ['FTTH', 'Sector', 'Village']
const FEASIBILITY_OPTIONS = ['Feasible', 'Not Feasible', 'Pending']
const FORM_TABS = ['State', 'District', 'Area', 'Locality', 'Sub Locality']

const SUB_FORM_INIT = {
  state: '', district: '', area: '', locality: '', subLocality: '',
  siteType: 'FTTH', branchCode: '', feasibility: 'Feasible', active: true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildTree(areas) {
  const tree = {}
  getStates().forEach(state => {
    tree[state] = tree[state] || {}
    getDistricts(state).forEach(district => {
      tree[state][district] = tree[state][district] || {}
      getAreasList(state, district).forEach(area => {
        tree[state][district][area] = tree[state][district][area] || {}
        getLocalities(state, district, area).forEach(locality => {
          tree[state][district][area][locality] = tree[state][district][area][locality] || []
        })
      })
    })
  })
  areas.forEach(a => {
    if (!tree[a.state]) tree[a.state] = {}
    if (!tree[a.state][a.district]) tree[a.state][a.district] = {}
    if (!tree[a.state][a.district][a.area]) tree[a.state][a.district][a.area] = {}
    const bucket = tree[a.state][a.district][a.area][a.locality] || []
    if (!bucket.find(x => x.id === a.id)) bucket.push(a)
    tree[a.state][a.district][a.area][a.locality] = bucket
  })
  return tree
}

function truncLabel(label) {
  return label.length > 25 ? label.slice(0, 22) + '…' : label
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-blue' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

// ── Tree Node ─────────────────────────────────────────────────────────────────

function TreeNode({ label, level = 0, children, items, onEdit, onDelete, onEditItem, onDeleteItem }) {
  const [open, setOpen] = useState(true)
  const hasChildren = (Array.isArray(children) ? children.length > 0 : !!children) || items?.length > 0
  const indent = level * 14
  const dotColor = level === 0 ? 'text-brand-blue' : level === 1 ? 'text-navy' : 'text-brand-orange'
  const labelClass = level === 0
    ? 'font-semibold text-gray-900'
    : level <= 2 ? 'font-medium text-gray-700'
    : 'font-normal text-gray-700'

  return (
    <div>
      {/* Node header — group div so edit/delete icons appear on hover */}
      <div
        className="group flex items-center w-full rounded-lg hover:bg-gray-100 transition-colors"
        style={{ paddingLeft: `${8 + indent}px`, paddingRight: '4px' }}
      >
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center gap-1.5 text-left py-1.5 min-w-0 pr-1"
        >
          {hasChildren
            ? open
              ? <ChevronDown size={13} className="text-gray-400 shrink-0" />
              : <ChevronRight size={13} className="text-gray-400 shrink-0" />
            : <span className="w-[13px] shrink-0" />
          }
          <MapPin size={12} className={`shrink-0 ${dotColor}`} />
          <span className={`text-sm ${labelClass}`} title={label}>{truncLabel(label)}</span>
        </button>
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onEdit?.() }}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete?.() }}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {open && children}

      {/* Sub-locality leaf items */}
      {open && items?.map(item => (
        <div
          key={item.id}
          className="group flex items-center rounded-lg hover:bg-gray-50 transition-colors"
          style={{ paddingLeft: `${8 + indent + 14}px`, paddingRight: '4px' }}
        >
          <div className="flex-1 flex items-center gap-1.5 py-1.5 min-w-0 pr-1">
            <span className="text-gray-300 text-xs shrink-0">•</span>
            <span className="text-sm text-gray-700" title={item.subLocality}>
              {truncLabel(item.subLocality)}
            </span>
            <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap ml-1">→ {item.siteType} · {item.branchCode}</span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
            <button
              onClick={() => onEditItem?.(item)}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
              title="Edit"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => onDeleteItem?.(item.id, item.subLocality)}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Area Form ─────────────────────────────────────────────────────────────────

function AreaForm({ initial, hierarchyEdit, onSave, onCancel, onToast }) {
  const isEdit  = !!initial
  const isHEdit = !!hierarchyEdit

  const [tab, setTab] = useState(isHEdit ? hierarchyEdit.type : 'Sub Locality')

  const [sf, setSf] = useState(
    isHEdit && hierarchyEdit.type === 'State'
      ? { name: hierarchyEdit.name }
      : { name: '' }
  )
  const [df, setDf] = useState(
    isHEdit && hierarchyEdit.type === 'District'
      ? { state: hierarchyEdit.state, name: hierarchyEdit.name }
      : { state: '', name: '' }
  )
  const [af, setAf] = useState(
    isHEdit && hierarchyEdit.type === 'Area'
      ? { state: hierarchyEdit.state, district: hierarchyEdit.district, name: hierarchyEdit.name }
      : { state: '', district: '', name: '' }
  )
  const [lf, setLf] = useState(
    isHEdit && hierarchyEdit.type === 'Locality'
      ? { state: hierarchyEdit.state, district: hierarchyEdit.district, area: hierarchyEdit.area, name: hierarchyEdit.name }
      : { state: '', district: '', area: '', name: '' }
  )
  const [slForm, setSlForm] = useState(isEdit ? {
    id:          initial.id,
    state:       initial.state,
    district:    initial.district,
    area:        initial.area,
    locality:    initial.locality,
    subLocality: initial.subLocality,
    siteType:    initial.siteType,
    branchCode:  initial.branchCode,
    feasibility: initial.feasibility,
    active:      initial.active,
  } : { ...SUB_FORM_INIT })

  const [errors, setErrors] = useState({})

  // Derived dropdowns
  const allStates    = getStates()
  const dfDistricts  = df.state ? getDistricts(df.state) : []
  const afDistricts  = af.state ? getDistricts(af.state) : []
  const lfDistricts  = lf.state ? getDistricts(lf.state) : []
  const lfAreas      = lf.state && lf.district ? getAreasList(lf.state, lf.district) : []
  const slDistricts  = slForm.state ? getDistricts(slForm.state) : []
  const slAreas      = slForm.state && slForm.district ? getAreasList(slForm.state, slForm.district) : []
  const slLocalities = slForm.state && slForm.district && slForm.area ? getLocalities(slForm.state, slForm.district, slForm.area) : []

  function changeTab(t) { setTab(t); setErrors({}) }

  // ── Save / Update handlers ────────────────────────────────────────────────

  function handleSaveState() {
    if (!sf.name.trim()) { setErrors({ name: 'State name is required' }); return }
    if (isHEdit) {
      updateStateName(hierarchyEdit.name, sf.name.trim())
      onToast('State updated successfully')
      onCancel()
    } else {
      saveStateName(sf.name.trim())
      setSf({ name: '' })
      setErrors({})
      onToast('State added successfully')
    }
  }

  function handleSaveDistrict() {
    const e = {}
    if (!df.state) e.state = 'Required'
    if (!df.name.trim()) e.name = 'Required'
    if (Object.keys(e).length) { setErrors(e); return }
    if (isHEdit) {
      updateDistrictName(hierarchyEdit.state, hierarchyEdit.name, df.name.trim())
      onToast('District updated successfully')
      onCancel()
    } else {
      saveDistrictName(df.state, df.name.trim())
      setDf({ state: '', name: '' })
      setErrors({})
      onToast('District added successfully')
    }
  }

  function handleSaveArea() {
    const e = {}
    if (!af.state) e.state = 'Required'
    if (!af.district) e.district = 'Required'
    if (!af.name.trim()) e.name = 'Required'
    if (Object.keys(e).length) { setErrors(e); return }
    if (isHEdit) {
      updateAreaName(hierarchyEdit.state, hierarchyEdit.district, hierarchyEdit.name, af.name.trim())
      onToast('Area updated successfully')
      onCancel()
    } else {
      saveAreaName(af.state, af.district, af.name.trim())
      setAf({ state: '', district: '', name: '' })
      setErrors({})
      onToast('Area added successfully')
    }
  }

  function handleSaveLocality() {
    const e = {}
    if (!lf.state) e.state = 'Required'
    if (!lf.district) e.district = 'Required'
    if (!lf.area) e.area = 'Required'
    if (!lf.name.trim()) e.name = 'Required'
    if (Object.keys(e).length) { setErrors(e); return }
    if (isHEdit) {
      updateLocalityName(hierarchyEdit.state, hierarchyEdit.district, hierarchyEdit.area, hierarchyEdit.name, lf.name.trim())
      onToast('Locality updated successfully')
      onCancel()
    } else {
      saveLocalityName(lf.state, lf.district, lf.area, lf.name.trim())
      setLf({ state: '', district: '', area: '', name: '' })
      setErrors({})
      onToast('Locality added successfully')
    }
  }

  function handleSaveSubLocality() {
    const e = {}
    if (!slForm.state.trim())       e.state       = 'Required'
    if (!slForm.district.trim())    e.district    = 'Required'
    if (!slForm.area.trim())        e.area        = 'Required'
    if (!slForm.locality.trim())    e.locality    = 'Required'
    if (!slForm.subLocality.trim()) e.subLocality = 'Required'
    if (!slForm.branchCode.trim())  e.branchCode  = 'Required'
    if (Object.keys(e).length) { setErrors(e); return }
    onSave(slForm)
  }

  const saveHandler =
    tab === 'State'      ? handleSaveState
    : tab === 'District' ? handleSaveDistrict
    : tab === 'Area'     ? handleSaveArea
    : tab === 'Locality' ? handleSaveLocality
    : handleSaveSubLocality

  const isAnyEdit = isEdit || isHEdit

  return (
    <div className="flex flex-col h-full">
      {/* Tabs — only for add-new flow */}
      {!isAnyEdit && (
        <div className="flex border-b border-surface-border px-5 pt-5 gap-0.5 shrink-0">
          {FORM_TABS.map(t => (
            <button
              key={t}
              onClick={() => changeTab(t)}
              className={`px-3.5 py-2 text-xs font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-brand-blue text-brand-blue bg-blue-50/60'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">

        {/* ── STATE ── */}
        {tab === 'State' && (
          <div className="space-y-3 w-full">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isHEdit ? 'Edit State' : 'Add State'}
            </p>
            <FormField label="State Name" required error={errors.name}>
              <Input
                value={sf.name}
                onChange={e => { setSf(f => ({ ...f, name: e.target.value })); setErrors({}) }}
                placeholder="e.g. Uttar Pradesh"
              />
            </FormField>
          </div>
        )}

        {/* ── DISTRICT ── */}
        {tab === 'District' && (
          <div className="space-y-3 w-full">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isHEdit ? 'Edit District' : 'Add District'}
            </p>
            <div className="grid grid-cols-2 gap-4 w-full">
              <FormField label="State" required error={errors.state}>
                <Select
                  value={df.state}
                  onChange={e => { setDf(f => ({ ...f, state: e.target.value, name: '' })); setErrors({}) }}
                  error={errors.state}
                  disabled={isHEdit}
                >
                  <option value="">Select state…</option>
                  {allStates.map(s => <option key={s}>{s}</option>)}
                </Select>
              </FormField>
              <FormField label="District Name" required error={errors.name}>
                <Input
                  value={df.name}
                  onChange={e => { setDf(f => ({ ...f, name: e.target.value })); setErrors({}) }}
                  placeholder="e.g. Gautam Buddha Nagar"
                />
              </FormField>
            </div>
          </div>
        )}

        {/* ── AREA ── */}
        {tab === 'Area' && (
          <div className="space-y-3 w-full">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isHEdit ? 'Edit Area' : 'Add Area'}
            </p>
            <div className="grid grid-cols-2 gap-4 w-full">
              <FormField label="State" required error={errors.state}>
                <Select
                  value={af.state}
                  onChange={e => { setAf(f => ({ ...f, state: e.target.value, district: '', name: '' })); setErrors({}) }}
                  error={errors.state}
                  disabled={isHEdit}
                >
                  <option value="">Select state…</option>
                  {allStates.map(s => <option key={s}>{s}</option>)}
                </Select>
              </FormField>
              <FormField label="District" required error={errors.district}>
                <Select
                  value={af.district}
                  onChange={e => { setAf(f => ({ ...f, district: e.target.value, name: '' })); setErrors({}) }}
                  disabled={isHEdit || !af.state}
                  error={errors.district}
                >
                  <option value="">Select district…</option>
                  {afDistricts.map(d => <option key={d}>{d}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Area Name" required error={errors.name}>
              <Input
                value={af.name}
                onChange={e => { setAf(f => ({ ...f, name: e.target.value })); setErrors({}) }}
                placeholder="e.g. Noida"
              />
            </FormField>
          </div>
        )}

        {/* ── LOCALITY ── */}
        {tab === 'Locality' && (
          <div className="space-y-3 w-full">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isHEdit ? 'Edit Locality' : 'Add Locality'}
            </p>
            <div className="grid grid-cols-2 gap-4 w-full">
              <FormField label="State" required error={errors.state}>
                <Select
                  value={lf.state}
                  onChange={e => { setLf(f => ({ ...f, state: e.target.value, district: '', area: '', name: '' })); setErrors({}) }}
                  error={errors.state}
                  disabled={isHEdit}
                >
                  <option value="">Select state…</option>
                  {allStates.map(s => <option key={s}>{s}</option>)}
                </Select>
              </FormField>
              <FormField label="District" required error={errors.district}>
                <Select
                  value={lf.district}
                  onChange={e => { setLf(f => ({ ...f, district: e.target.value, area: '', name: '' })); setErrors({}) }}
                  disabled={isHEdit || !lf.state}
                  error={errors.district}
                >
                  <option value="">Select district…</option>
                  {lfDistricts.map(d => <option key={d}>{d}</option>)}
                </Select>
              </FormField>
              <FormField label="Area" required error={errors.area}>
                <Select
                  value={lf.area}
                  onChange={e => { setLf(f => ({ ...f, area: e.target.value, name: '' })); setErrors({}) }}
                  disabled={isHEdit || !lf.district}
                  error={errors.area}
                >
                  <option value="">Select area…</option>
                  {lfAreas.map(a => <option key={a}>{a}</option>)}
                </Select>
              </FormField>
              <FormField label="Locality Name" required error={errors.name}>
                <Input
                  value={lf.name}
                  onChange={e => { setLf(f => ({ ...f, name: e.target.value })); setErrors({}) }}
                  placeholder="e.g. Sector 62"
                />
              </FormField>
            </div>
          </div>
        )}

        {/* ── SUB LOCALITY ── */}
        {(tab === 'Sub Locality' || isEdit) && (
          <div className="space-y-3 w-full">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isEdit ? 'Edit Sub Locality' : 'Add Sub Locality'}
            </p>

            <div className="grid grid-cols-2 gap-4 w-full">
              <FormField label="State" required error={errors.state}>
                <Select
                  value={slForm.state}
                  onChange={e => { setSlForm(f => ({ ...f, state: e.target.value, district: '', area: '', locality: '' })); setErrors(er => ({ ...er, state: '' })) }}
                  error={errors.state}
                >
                  <option value="">Select state…</option>
                  {allStates.map(s => <option key={s}>{s}</option>)}
                </Select>
              </FormField>
              <FormField label="District" required error={errors.district}>
                <Select
                  value={slForm.district}
                  onChange={e => { setSlForm(f => ({ ...f, district: e.target.value, area: '', locality: '' })); setErrors(er => ({ ...er, district: '' })) }}
                  disabled={!slForm.state}
                  error={errors.district}
                >
                  <option value="">Select district…</option>
                  {slDistricts.map(d => <option key={d}>{d}</option>)}
                </Select>
              </FormField>
              <FormField label="Area" required error={errors.area}>
                <Select
                  value={slForm.area}
                  onChange={e => { setSlForm(f => ({ ...f, area: e.target.value, locality: '' })); setErrors(er => ({ ...er, area: '' })) }}
                  disabled={!slForm.district}
                  error={errors.area}
                >
                  <option value="">Select area…</option>
                  {slAreas.map(a => <option key={a}>{a}</option>)}
                </Select>
              </FormField>
              <FormField label="Locality" required error={errors.locality}>
                <Select
                  value={slForm.locality}
                  onChange={e => { setSlForm(f => ({ ...f, locality: e.target.value })); setErrors(er => ({ ...er, locality: '' })) }}
                  disabled={!slForm.area}
                  error={errors.locality}
                >
                  <option value="">Select locality…</option>
                  {slLocalities.map(l => <option key={l}>{l}</option>)}
                </Select>
              </FormField>
              <FormField label="Sub Locality Name" required error={errors.subLocality}>
                <Input
                  value={slForm.subLocality}
                  onChange={e => { setSlForm(f => ({ ...f, subLocality: e.target.value })); setErrors(er => ({ ...er, subLocality: '' })) }}
                  placeholder="e.g. Tower A"
                  error={errors.subLocality}
                />
              </FormField>
              <FormField label="Site Type">
                <Select value={slForm.siteType} onChange={e => setSlForm(f => ({ ...f, siteType: e.target.value }))}>
                  {SITE_TYPES.map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Branch Code" required error={errors.branchCode}>
                <Input
                  value={slForm.branchCode}
                  onChange={e => { setSlForm(f => ({ ...f, branchCode: e.target.value })); setErrors(er => ({ ...er, branchCode: '' })) }}
                  placeholder="e.g. CNPL-001"
                  error={errors.branchCode}
                />
              </FormField>
              <FormField label="Feasibility Status">
                <Select value={slForm.feasibility} onChange={e => setSlForm(f => ({ ...f, feasibility: e.target.value }))}>
                  {FEASIBILITY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </Select>
              </FormField>
            </div>

            <div className="flex items-center gap-2.5">
              <Toggle checked={slForm.active} onChange={v => setSlForm(f => ({ ...f, active: v }))} />
              <span className="text-sm text-gray-700">
                <span className="font-medium">Active</span>
                {' — '}
                <span className="text-gray-400 font-normal">Show this sub-locality in lead forms</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-white flex items-center justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" icon={<Save size={13} />} onClick={saveHandler}>
          {isAnyEdit ? 'Update' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AreaMapping() {
  const navigate = useNavigate()
  const [areas, setAreas]   = useState(getAreas)
  const [, setTick]         = useState(0)
  const [showForm, setShowForm]           = useState(false)
  const [editItem, setEditItem]           = useState(null)
  const [hierarchyEditItem, setHierarchyEditItem] = useState(null)
  const [deleteId, setDeleteId]           = useState(null)
  const [deleteItemName, setDeleteItemName] = useState('')
  const [hierarchyDeleteItem, setHierarchyDeleteItem] = useState(null)
  const [toast, setToast]   = useState(null)

  useEffect(() => subscribeAreas(setAreas), [])
  useEffect(() => subscribeHierarchy(() => setTick(t => t + 1)), [])

  const tree = buildTree(areas)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function closeForm() {
    setShowForm(false)
    setEditItem(null)
    setHierarchyEditItem(null)
  }

  function handleSave(form) {
    saveArea(form)
    closeForm()
    showToast(form.id ? 'Sub locality updated' : 'Sub locality added successfully')
  }

  function handleEdit(item) {
    setEditItem(item)
    setHierarchyEditItem(null)
    setShowForm(true)
  }

  function handleDelete(id, name) {
    setDeleteId(id)
    setDeleteItemName(name || 'this entry')
  }

  function confirmDelete() {
    deleteArea(deleteId)
    setDeleteId(null)
    setDeleteItemName('')
    showToast('Entry deleted')
  }

  function handleHierarchyEdit(item) {
    setHierarchyEditItem(item)
    setEditItem(null)
    setShowForm(true)
  }

  function handleHierarchyDelete(item) {
    setHierarchyDeleteItem(item)
  }

  function confirmHierarchyDelete() {
    const { type, name, state, district, area } = hierarchyDeleteItem
    if (type === 'State')         deleteStateName(name)
    else if (type === 'District') deleteDistrictName(state, name)
    else if (type === 'Area')     deleteAreaName(state, district, name)
    else if (type === 'Locality') deleteLocalityName(state, district, area, name)
    setHierarchyDeleteItem(null)
    showToast(`${type} deleted`)
  }

  const feasVariant = { Feasible: 'green', 'Not Feasible': 'red', Pending: 'yellow' }

  const formKey = editItem?.id
    ?? (hierarchyEditItem ? `${hierarchyEditItem.type}-${hierarchyEditItem.name}` : 'new')

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 shrink-0 bg-white border-b border-surface-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/settings')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Area Mapping</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage service areas, localities and feasibility settings</p>
            </div>
          </div>
          <Button
            icon={<Plus size={14} />}
            onClick={() => { setEditItem(null); setHierarchyEditItem(null); setShowForm(true) }}
          >
            Add Entry
          </Button>
        </div>
      </div>

      {/* Body — two-panel */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Hierarchy tree */}
        <div className="w-80 min-w-[280px] shrink-0 border-r border-surface-border bg-white overflow-y-auto p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">Hierarchy</p>
          {Object.keys(tree).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MapPin size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No areas added yet</p>
            </div>
          ) : (
            Object.entries(tree).map(([state, districts]) => (
              <TreeNode
                key={state}
                label={state}
                level={0}
                onEdit={() => handleHierarchyEdit({ type: 'State', name: state })}
                onDelete={() => handleHierarchyDelete({ type: 'State', name: state })}
              >
                {Object.entries(districts).map(([district, areasMap]) => (
                  <TreeNode
                    key={district}
                    label={district}
                    level={1}
                    onEdit={() => handleHierarchyEdit({ type: 'District', state, name: district })}
                    onDelete={() => handleHierarchyDelete({ type: 'District', state, name: district })}
                  >
                    {Object.entries(areasMap).map(([area, localitiesMap]) => (
                      <TreeNode
                        key={area}
                        label={area}
                        level={2}
                        onEdit={() => handleHierarchyEdit({ type: 'Area', state, district, name: area })}
                        onDelete={() => handleHierarchyDelete({ type: 'Area', state, district, name: area })}
                      >
                        {Object.entries(localitiesMap).map(([locality, subItems]) => (
                          <TreeNode
                            key={locality}
                            label={locality}
                            level={3}
                            items={subItems}
                            onEdit={() => handleHierarchyEdit({ type: 'Locality', state, district, area, name: locality })}
                            onDelete={() => handleHierarchyDelete({ type: 'Locality', state, district, area, name: locality })}
                            onEditItem={handleEdit}
                            onDeleteItem={handleDelete}
                          />
                        ))}
                      </TreeNode>
                    ))}
                  </TreeNode>
                ))}
              </TreeNode>
            ))
          )}
        </div>

        {/* Right: Form or summary */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {showForm ? (
            <AreaForm
              key={formKey}
              initial={editItem}
              hierarchyEdit={hierarchyEditItem}
              onSave={handleSave}
              onCancel={closeForm}
              onToast={showToast}
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Total Sub Localities', value: areas.length,                                            color: 'text-brand-blue'  },
                  { label: 'Feasible',              value: areas.filter(a => a.feasibility === 'Feasible').length, color: 'text-emerald-600' },
                  { label: 'Pending Feasibility',   value: areas.filter(a => a.feasibility === 'Pending').length,  color: 'text-amber-600'   },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-surface-border p-4 shadow-card">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-surface-border overflow-hidden shadow-card">
                <div className="px-4 py-3 border-b border-surface-border bg-gray-50/80 grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span>Location</span>
                  <span>Branch Code</span>
                  <span>Site Type</span>
                  <span>Feasibility</span>
                  <span>Actions</span>
                </div>
                {areas.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <MapPin size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No sub localities yet. Click "Add Entry" to get started.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-surface-border">
                    {areas.map(a => (
                      <div key={a.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-gray-50/50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">{a.subLocality}</p>
                          <p className="text-xs text-gray-400">{a.locality} · {a.area} · {a.district}</p>
                        </div>
                        <span className="text-sm font-mono text-gray-700">{a.branchCode}</span>
                        <Badge variant="blue" size="sm">{a.siteType}</Badge>
                        <Badge variant={feasVariant[a.feasibility] || 'gray'} size="sm">{a.feasibility}</Badge>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(a)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(a.id, a.subLocality)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-locality delete confirm */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Sub Locality"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete{' '}
          <span className="font-medium text-gray-800">{deleteItemName}</span>?{' '}
          This action cannot be undone.
        </p>
      </Modal>

      {/* Hierarchy delete confirm */}
      <Modal
        isOpen={!!hierarchyDeleteItem}
        onClose={() => setHierarchyDeleteItem(null)}
        title={`Delete ${hierarchyDeleteItem?.type ?? ''}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setHierarchyDeleteItem(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={confirmHierarchyDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete{' '}
          <span className="font-medium text-gray-800">{hierarchyDeleteItem?.name}</span>?{' '}
          This will also remove all child entries.
        </p>
      </Modal>

      {/* Success toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle2 size={16} className="shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}
