import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, ChevronRight, ChevronDown, Edit2, Trash2, Save, MapPin, CheckCircle2,
  Upload, Download, FileSpreadsheet, AlertTriangle, X, CheckCircle, XCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select } from '../components/ui/FormInputs'
import {
  getAreas, saveArea, deleteArea, subscribeAreas, subscribeHierarchy,
  getStates, getDistricts, getAreasList, getLocalities, getLocalityInfo, upsertLocalityIntercomSite,
  saveStateName, saveDistrictName, saveAreaName, saveLocalityName,
  updateStateName, updateDistrictName, updateAreaName, updateLocalityName,
  deleteStateName, deleteDistrictName, deleteAreaName, deleteLocalityName,
} from '../data/areaMappingStore'

const SITE_TYPES = ['FTTH', 'Sector', 'Village']
const FEASIBILITY_OPTIONS = ['Feasible', 'Not Feasible', 'Pending']
const FORM_TABS = ['State', 'District', 'Area', 'Locality', 'Sub Locality']

const PATH_TO_TAB = {
  '/settings/area-mapping/state':        'State',
  '/settings/area-mapping/district':     'District',
  '/settings/area-mapping/area':         'Area',
  '/settings/area-mapping/locality':     'Locality',
  '/settings/area-mapping/sub-locality': 'Sub Locality',
}
const TAB_TO_PATH = {
  'State':        '/settings/area-mapping/state',
  'District':     '/settings/area-mapping/district',
  'Area':         '/settings/area-mapping/area',
  'Locality':     '/settings/area-mapping/locality',
  'Sub Locality': '/settings/area-mapping/sub-locality',
}

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

function TreeNode({ label, level = 0, children, items, onEdit, onDelete, onEditItem, onDeleteItem, intercomSite }) {
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
          <span className={`text-sm ${labelClass} whitespace-nowrap`} title={label}>{truncLabel(label)}</span>
          {level === 3 && (
            <span
              className={`ml-1 shrink-0 inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-semibold ${
                intercomSite ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}
              title="Intercom Site"
            >
              {intercomSite ? 'Yes' : 'No'}
            </span>
          )}
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
            <span className="text-sm text-gray-700 whitespace-nowrap" title={item.subLocality}>
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

// ── Bulk Upload Modal ─────────────────────────────────────────────────────────

const TEMPLATE_COLS  = ['State', 'District', 'Area', 'Locality', 'Site Type', 'Branch Code', 'Sub Locality']
const VALID_SITE_TYPES    = ['FTTH', 'Sector', 'Village']
const TEMPLATE_SAMPLE_ROWS = [
  ['Karnataka', 'Bangalore Urban', 'Koramangala', 'Koramangala 4th Block', 'FTTH',   'CNPL-KOR-01', 'Jakkasandra'],
  ['Karnataka', 'Bangalore Urban', 'Indiranagar',  '12th Main',            'FTTH',   'CNPL-IND-01', 'CMH Road'  ],
  ['Uttar Pradesh', 'Gautam Buddha Nagar', 'Sector 62', 'Block A',         'Sector', 'CNPL-NOI-01', ''          ],
]

function validateRow(row, existingAreas) {
  const errors = []
  const warnings = []
  const [state, district, area, locality, siteType, branchCode, subLocality] = row

  if (!state?.trim())      errors.push('State required')
  if (!district?.trim())   errors.push('District required')
  if (!area?.trim())       errors.push('Area required')
  if (!locality?.trim())   errors.push('Locality required')
  if (!branchCode?.trim()) errors.push('Branch Code required')
  if (siteType && !VALID_SITE_TYPES.includes(siteType))
    errors.push(`Site Type must be ${VALID_SITE_TYPES.join('/')}`)

  if (!errors.length && subLocality?.trim()) {
    const isDup = existingAreas.some(a =>
      a.state?.toLowerCase() === state?.toLowerCase().trim() &&
      a.district?.toLowerCase() === district?.toLowerCase().trim() &&
      a.area?.toLowerCase() === area?.toLowerCase().trim() &&
      a.locality?.toLowerCase() === locality?.toLowerCase().trim() &&
      a.subLocality?.toLowerCase() === subLocality?.toLowerCase().trim()
    )
    if (isDup) warnings.push('Duplicate entry')
  }

  return { errors, warnings }
}

function BulkUploadModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile]         = useState(null)
  const [rows, setRows]         = useState([])
  const [validated, setValidated] = useState([])
  const [dragging, setDragging] = useState(false)
  const fileRef                 = useRef(null)
  const existingAreas           = getAreas()

  useEffect(() => {
    if (!isOpen) { setFile(null); setRows([]); setValidated([]) }
  }, [isOpen])

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLS, ...TEMPLATE_SAMPLE_ROWS])
    ws['!cols'] = TEMPLATE_COLS.map(() => ({ wch: 22 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Area Mapping')
    XLSX.writeFile(wb, 'area-mapping-template.xlsx')
  }

  function processFile(f) {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'csv'].includes(ext)) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const wb   = XLSX.read(e.target.result, { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const dataRows = data.slice(1).filter(r => r.some(c => String(c).trim()))
      setRows(dataRows)
      setValidated(dataRows.map(r => validateRow(r.map(c => String(c)), existingAreas)))
    }
    reader.readAsArrayBuffer(f)
  }

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    processFile(e.dataTransfer.files[0])
  }, [])

  const validCount   = validated.filter(v => !v.errors.length && !v.warnings.length).length
  const warnCount    = validated.filter(v => !v.errors.length && v.warnings.length).length
  const invalidCount = validated.filter(v => v.errors.length).length
  const uploadableCount = validCount + warnCount

  function handleUpload() {
    rows.forEach((row, i) => {
      if (validated[i]?.errors.length) return
      const [state, district, area, locality, siteType, branchCode, subLocality] = row.map(c => String(c).trim())
      saveStateName(state)
      saveDistrictName(state, district)
      saveAreaName(state, district, area)
      saveLocalityName(state, district, area, locality, siteType || 'FTTH', branchCode)
      if (subLocality) {
        saveArea({ state, district, area, locality, subLocality, siteType: siteType || 'FTTH', branchCode, feasibility: 'Feasible', active: true })
      }
    })
    onSuccess(uploadableCount)
    onClose()
  }

  const previewRows = rows.slice(0, 5)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Upload Area Data" size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            icon={<Upload size={14} />}
            onClick={handleUpload}
            disabled={!file || uploadableCount === 0}
          >
            Upload {uploadableCount > 0 ? `(${uploadableCount} rows)` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* Step 1 — Template */}
        <div className="rounded-xl border border-surface-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-brand-blue text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
            <p className="text-sm font-semibold text-gray-800">Download Template</p>
          </div>
          <p className="text-xs text-gray-500 pl-7">
            Download the Excel template with required columns and sample data.
          </p>
          <div className="pl-7">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 text-xs font-medium text-brand-blue border border-brand-blue/30 bg-brand-blue/5 hover:bg-brand-blue/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={13} />
              Download Template (.xlsx)
            </button>
          </div>
          <div className="pl-7 flex flex-wrap gap-1.5">
            {TEMPLATE_COLS.map(c => (
              <span key={c} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">{c}</span>
            ))}
          </div>
        </div>

        {/* Step 2 — Upload */}
        <div className="rounded-xl border border-surface-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-brand-blue text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
            <p className="text-sm font-semibold text-gray-800">Upload File</p>
          </div>
          <div
            className={`pl-7`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div
              onClick={() => fileRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-colors ${
                dragging ? 'border-brand-blue bg-brand-blue/5' : 'border-surface-border hover:border-brand-blue/40 hover:bg-gray-50'
              }`}
            >
              <FileSpreadsheet size={28} className={dragging ? 'text-brand-blue' : 'text-gray-300'} />
              {file ? (
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="text-sm font-medium text-gray-700">{file.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null); setRows([]); setValidated([]) }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500">Drag & drop or <span className="text-brand-blue font-medium">click to upload</span></p>
                  <p className="text-xs text-gray-400">Accepts .xlsx and .csv files</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden"
              onChange={e => processFile(e.target.files[0])} />
          </div>
        </div>

        {/* Step 3 — Preview */}
        {rows.length > 0 && (
          <div className="rounded-xl border border-surface-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-blue text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
              <p className="text-sm font-semibold text-gray-800">Preview & Validate</p>
            </div>

            {/* Stats */}
            <div className="pl-7 flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <CheckCircle size={12} /> Valid rows: {validCount}
              </div>
              {warnCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  <AlertTriangle size={12} /> Warnings: {warnCount}
                </div>
              )}
              {invalidCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                  <XCircle size={12} /> Invalid: {invalidCount}
                </div>
              )}
              <span className="text-xs text-gray-400 self-center">Showing first {Math.min(5, rows.length)} of {rows.length} rows</span>
            </div>

            {/* Preview table */}
            <div className="pl-7 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-2 py-1.5 text-gray-500 font-semibold border border-surface-border w-6">#</th>
                    {TEMPLATE_COLS.map(c => (
                      <th key={c} className="text-left px-2 py-1.5 text-gray-500 font-semibold border border-surface-border whitespace-nowrap">{c}</th>
                    ))}
                    <th className="text-left px-2 py-1.5 text-gray-500 font-semibold border border-surface-border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => {
                    const v = validated[i]
                    const rowClass = v?.errors.length ? 'bg-red-50' : v?.warnings.length ? 'bg-amber-50' : 'bg-white'
                    return (
                      <tr key={i} className={rowClass}>
                        <td className="px-2 py-1.5 border border-surface-border text-gray-400">{i + 1}</td>
                        {TEMPLATE_COLS.map((_, ci) => (
                          <td key={ci} className="px-2 py-1.5 border border-surface-border text-gray-700 max-w-[100px] truncate">
                            {row[ci] ?? ''}
                          </td>
                        ))}
                        <td className="px-2 py-1.5 border border-surface-border">
                          {v?.errors.length ? (
                            <span className="text-red-600 font-medium" title={v.errors.join(', ')}>
                              ❌ {v.errors[0]}
                            </span>
                          ) : v?.warnings.length ? (
                            <span className="text-amber-600 font-medium" title={v.warnings.join(', ')}>
                              ⚠️ {v.warnings[0]}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">✅ Valid</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Area Form ─────────────────────────────────────────────────────────────────

function AreaForm({ initial, hierarchyEdit, onSave, onCancel, onToast, initialTab, onTabChange }) {
  const isEdit  = !!initial
  const isHEdit = !!hierarchyEdit

  const [tab, setTab] = useState(isHEdit ? hierarchyEdit.type : (initialTab ?? 'Sub Locality'))

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
      ? {
          state: hierarchyEdit.state, district: hierarchyEdit.district, area: hierarchyEdit.area, name: hierarchyEdit.name,
          siteType: 'FTTH', branchCode: '',
          intercomSite: !!getLocalityInfo(hierarchyEdit.state, hierarchyEdit.district, hierarchyEdit.area, hierarchyEdit.name)?.intercomSite,
        }
      : { state: '', district: '', area: '', name: '', siteType: 'FTTH', branchCode: '', intercomSite: false }
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
  const slLocalities  = slForm.state && slForm.district && slForm.area ? getLocalities(slForm.state, slForm.district, slForm.area) : []
  const slLocalityInfo = slForm.locality ? getLocalityInfo(slForm.state, slForm.district, slForm.area, slForm.locality) : null

  function changeTab(t) { setTab(t); setErrors({}); onTabChange?.(t) }

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
    if (!lf.branchCode.trim()) e.branchCode = 'Required'
    if (Object.keys(e).length) { setErrors(e); return }
    if (isHEdit) {
      updateLocalityName(hierarchyEdit.state, hierarchyEdit.district, hierarchyEdit.area, hierarchyEdit.name, lf.name.trim())
      upsertLocalityIntercomSite(hierarchyEdit.state, hierarchyEdit.district, hierarchyEdit.area, lf.name.trim(), lf.intercomSite)
      onToast('Locality updated successfully')
      onCancel()
    } else {
      saveLocalityName(lf.state, lf.district, lf.area, lf.name.trim(), lf.siteType, lf.branchCode, lf.intercomSite)
      setLf({ state: '', district: '', area: '', name: '', siteType: 'FTTH', branchCode: '', intercomSite: false })
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
              <FormField label="Site Type">
                <Select value={lf.siteType} onChange={e => setLf(f => ({ ...f, siteType: e.target.value }))}>
                  {SITE_TYPES.map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Branch Code" required error={errors.branchCode}>
                <Input
                  value={lf.branchCode}
                  onChange={e => { setLf(f => ({ ...f, branchCode: e.target.value })); setErrors(er => ({ ...er, branchCode: '' })) }}
                  placeholder="e.g. CNPL-001"
                  error={errors.branchCode}
                />
              </FormField>
            </div>
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="locality-intercom-site"
                checked={lf.intercomSite}
                onChange={e => setLf(f => ({ ...f, intercomSite: e.target.checked }))}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30"
              />
              <label htmlFor="locality-intercom-site" className="cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Intercom Site</span>
                <p className="text-xs text-gray-400 mt-0.5">Check this if intercom service is available at this locality</p>
              </label>
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
            </div>

            {slLocalityInfo && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Locality Info</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Site Type</p>
                    <p className="text-sm font-medium text-gray-800">{slLocalityInfo.siteType || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Branch Code</p>
                    <p className="text-sm font-medium text-gray-800">{slLocalityInfo.branchCode || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <Toggle checked={slForm.active} onChange={v => setSlForm(f => ({ ...f, active: v }))} />
              <span className="text-sm font-medium text-gray-700">
                Active <span className="font-normal text-gray-400">— Show this sub-locality in lead forms</span>
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
  const navigate  = useNavigate()
  const location  = useLocation()
  const activeUrlTab = PATH_TO_TAB[location.pathname] ?? null

  const [areas, setAreas]   = useState(getAreas)
  const [, setTick]         = useState(0)
  const [showForm, setShowForm]           = useState(false)
  const [editItem, setEditItem]           = useState(null)
  const [hierarchyEditItem, setHierarchyEditItem] = useState(null)
  const [deleteId, setDeleteId]           = useState(null)
  const [deleteItemName, setDeleteItemName] = useState('')
  const [hierarchyDeleteItem, setHierarchyDeleteItem] = useState(null)
  const [toast, setToast]   = useState(null)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)

  useEffect(() => subscribeAreas(setAreas), [])
  useEffect(() => subscribeHierarchy(() => setTick(t => t + 1)), [])

  const tree = buildTree(areas)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function closeForm() {
    if (!activeUrlTab) setShowForm(false)
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
            variant="secondary"
            icon={<Upload size={14} />}
            onClick={() => setBulkUploadOpen(true)}
          >
            Bulk Upload
          </Button>
        </div>
      </div>

      {/* Body — two-panel */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Hierarchy tree */}
        <div className="w-[360px] min-w-[320px] shrink-0 border-r border-surface-border bg-white overflow-y-auto p-3">
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
                            intercomSite={!!getLocalityInfo(state, district, area, locality)?.intercomSite}
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
          {(showForm || activeUrlTab) ? (
            <AreaForm
              key={formKey}
              initial={editItem}
              hierarchyEdit={hierarchyEditItem}
              onSave={handleSave}
              onCancel={closeForm}
              onToast={showToast}
              initialTab={(!editItem && !hierarchyEditItem && activeUrlTab) ? activeUrlTab : undefined}
              onTabChange={(!editItem && !hierarchyEditItem && activeUrlTab) ? t => navigate(TAB_TO_PATH[t]) : undefined}
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
                    <p className="text-sm">No sub localities yet. Use "Bulk Upload" to get started.</p>
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

      {/* Bulk Upload */}
      <BulkUploadModal
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={count => { showToast(`${count} entries added successfully`); setBulkUploadOpen(false) }}
      />

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
