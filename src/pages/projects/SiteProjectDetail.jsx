import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardList, Boxes, FileText, Receipt, Copy, Phone, Plus, Trash2 } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormInputs'
import { getSiteProject, getSiteWorkOrders, addDPREntry, subscribeProjects } from '../../data/projectStore'
import { getProduct, getProducts } from '../../data/productStore'
import { getUsers } from '../../data/userStore'
import { usePermission } from '../../data/rolesStore'

const STATUS_BADGE = {
  'NEW': 'gray', 'SURVEY': 'indigo', 'ACQUIRED': 'orange', 'IN_EXECUTION': 'orange', 'Live': 'green',
}

// No separate stored status field for a work order — "Not Started" vs
// "In Progress" is derived straight from whether it has any DPR entries
// yet, per the Phase 6 spec ("keep this simple, no separate status field
// needed unless it's trivial to add").
function workOrderStatus(wo) {
  return (wo.dprEntries ?? []).length > 0 ? 'In Progress' : 'Not Started'
}
const WORK_ORDER_STATUS_BADGE = { 'Not Started': 'gray', 'In Progress': 'indigo' }

const TABS = ['Work Orders', 'Inventory & Consumption', 'Documents & Vault', 'CAPEX & Cost Ledger']
const TAB_SLUGS = {
  'Work Orders': 'work-orders',
  'Inventory & Consumption': 'inventory',
  'Documents & Vault': 'documents',
  'CAPEX & Cost Ledger': 'capex',
}
const SLUG_TO_TAB = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]))

function EmptyTabState({ icon: Icon, text, action }) {
  return (
    <div className="py-14 text-center text-sm text-gray-400">
      <Icon size={28} className="mx-auto mb-2 text-gray-200" />
      {text}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Built dynamically from the project's own siteType/capacity/competitors —
// never hardcoded, since the three site types capture completely different
// capacity fields (see CreateSiteProject.jsx's buildCapacity()).
function capacitySummary(project) {
  const c = project.capacity || {}
  const parts = []
  if (project.siteType === 'Residential') {
    parts.push(`${c.homePasses ?? 0} Home Passes`, `${c.flatsCount ?? 0} Flats`, `${c.towersCount ?? 0} Towers`)
  } else if (project.siteType === 'Commercial') {
    parts.push(`${c.shopUnits ?? 0} Shops/Office Units`)
  } else {
    parts.push(`${c.residentialUnits ?? 0} Residential Units`, `${c.commercialUnits ?? 0} Commercial Units`)
  }
  let summary = `Total Capacity: ${parts.join(' | ')}`
  if (project.competitors?.length) summary += ` | Competitor: ${project.competitors.join(', ')}`
  return summary
}

function emptyMaterialRow() {
  return { id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, itemId: '', quantity: '' }
}

// ── Add DPR Entry modal ──────────────────────────────────────────────────

function AddDPREntryModal({ workOrder, onClose }) {
  const isOpen = !!workOrder
  const products = getProducts()

  const [workDoneToday, setWorkDoneToday] = useState('')
  const [materials, setMaterials] = useState(() => [emptyMaterialRow()])
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodes, setBarcodes] = useState([])
  const [installationLocation, setInstallationLocation] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isOpen) return
    setWorkDoneToday('')
    setMaterials([emptyMaterialRow()])
    setBarcodeInput('')
    setBarcodes([])
    setInstallationLocation('')
    setErrors({})
  }, [isOpen])

  if (!isOpen) return null

  function updateMaterial(rowId, patch) {
    setMaterials(rows => rows.map(r => r.id === rowId ? { ...r, ...patch } : r))
  }
  function addMaterial() { setMaterials(rows => [...rows, emptyMaterialRow()]) }
  function removeMaterial(rowId) { setMaterials(rows => rows.filter(r => r.id !== rowId)) }

  function addBarcode() {
    const code = barcodeInput.trim()
    if (!code || barcodes.includes(code)) { setBarcodeInput(''); return }
    setBarcodes(list => [...list, code])
    setBarcodeInput('')
  }
  function removeBarcode(code) { setBarcodes(list => list.filter(c => c !== code)) }
  function handleBarcodeKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addBarcode() }
  }

  function validate() {
    const errs = {}
    if (!workDoneToday.trim()) errs.workDoneToday = 'Describe the work done today.'
    if (!installationLocation.trim()) errs.installationLocation = 'Installation location is required.'
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    addDPREntry(workOrder.id, {
      workDoneToday: workDoneToday.trim(),
      materialConsumed: materials.filter(m => m.itemId).map(m => ({ itemId: m.itemId, quantity: Number(m.quantity) || 0 })),
      barcodesScanned: barcodes,
      installationLocation: installationLocation.trim(),
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title={`Add DPR Entry — ${workOrder.id}`} size="lg"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSave}>Save DPR Entry</Button>
      </>}
    >
      <div className="space-y-5">
        <FormField label="Work Done Today" required error={errors.workDoneToday}>
          <Textarea rows={3} placeholder="Describe today's progress…" value={workDoneToday} onChange={e => { setWorkDoneToday(e.target.value); setErrors(er => ({ ...er, workDoneToday: undefined })) }} />
        </FormField>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Material Consumed</p>
          {materials.map(row => (
            <div key={row.id} className="flex items-end gap-2">
              <div className="flex-1">
                <Select value={row.itemId} onChange={e => updateMaterial(row.id, { itemId: e.target.value })}>
                  <option value="">Select item…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              <div className="w-28">
                <Input type="number" min="0" placeholder="Qty" value={row.quantity} onChange={e => updateMaterial(row.id, { quantity: e.target.value })} />
              </div>
              <button type="button" onClick={() => removeMaterial(row.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addMaterial} className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark transition-colors">
            <Plus size={13} /> Add Material
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Barcode Scanned</p>
          {barcodes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {barcodes.map(code => (
                <span key={code} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-mono font-medium">
                  {code}
                  <button type="button" onClick={() => removeBarcode(code)} className="text-brand-blue/60 hover:text-brand-blue transition-colors leading-none">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input placeholder="Type or paste a barcode, then press Enter" value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeKeyDown} />
            <Button type="button" variant="secondary" size="sm" onClick={addBarcode}>Add</Button>
          </div>
        </div>

        <FormField label="Installation Location" required error={errors.installationLocation}>
          <Input placeholder="e.g. Floor 1-6" value={installationLocation} onChange={e => { setInstallationLocation(e.target.value); setErrors(er => ({ ...er, installationLocation: undefined })) }} />
        </FormField>
      </div>
    </Modal>
  )
}

// ── Work Order detail modal ──────────────────────────────────────────────

function WorkOrderDetailModal({ workOrder, onClose, onAddDPR }) {
  const isOpen = !!workOrder
  if (!isOpen) return null

  const technicianNames = (workOrder.assignedTechnicians ?? [])
    .map(id => getUsers().find(u => u.id === id)?.name ?? id)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={workOrder.id} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-400">Activity Type</p><p className="font-medium text-gray-800">{workOrder.activityType}</p></div>
          <div><p className="text-xs text-gray-400">Target Location</p><p className="font-medium text-gray-800">{workOrder.targetLocation}</p></div>
          <div><p className="text-xs text-gray-400">Execution Date</p><p className="font-medium text-gray-800">{workOrder.executionDate}</p></div>
          <div><p className="text-xs text-gray-400">Target Deadline</p><p className="font-medium text-gray-800">{workOrder.targetDeadline}</p></div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400">Assigned Technicians</p>
            <p className="font-medium text-gray-800">{technicianNames.join(', ') || '—'}</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Required Materials</h4>
          {(workOrder.requiredMaterials ?? []).length === 0 ? (
            <p className="text-xs text-gray-400">No materials allocated.</p>
          ) : (
            <div className="space-y-1">
              {workOrder.requiredMaterials.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                  <span className="text-gray-700">{getProduct(m.itemId)?.name ?? m.itemId}</span>
                  <span className="text-gray-500">Qty: {m.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Daily Progress Reports</h4>
            <Button size="xs" icon={<Plus size={12} />} onClick={() => onAddDPR(workOrder)}>Add DPR Entry</Button>
          </div>
          {(workOrder.dprEntries ?? []).length === 0 ? (
            <p className="text-xs text-gray-400">No DPR entries yet.</p>
          ) : (
            <div className="space-y-2">
              {[...workOrder.dprEntries].reverse().map(entry => (
                <div key={entry.id} className="rounded-lg border border-surface-border p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-brand-blue">{entry.id}</span>
                    <span className="text-xs text-gray-400">{entry.date}</span>
                  </div>
                  <p className="text-sm text-gray-700">{entry.workDoneToday}</p>
                  <p className="text-xs text-gray-500">Location: {entry.installationLocation || '—'}</p>
                  {(entry.materialConsumed ?? []).length > 0 && (
                    <p className="text-xs text-gray-500">
                      Materials: {entry.materialConsumed.map(m => `${getProduct(m.itemId)?.name ?? m.itemId} (${m.quantity})`).join(', ')}
                    </p>
                  )}
                  {(entry.barcodesScanned ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {entry.barcodesScanned.map(code => (
                        <span key={code} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-mono">{code}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function SiteProjectDetail() {
  const { id, tab } = useParams()
  const navigate = useNavigate()
  const canCreate = usePermission('Projects', 'Create')

  // Subscribing (without using the payload directly) just forces a
  // re-render whenever projectStore changes (mirrors HDDProjectDetail.jsx's
  // forceRerender pattern).
  const [, forceRerender] = useState(0)
  useEffect(() => subscribeProjects(() => forceRerender(n => n + 1)), [])
  const project = getSiteProject(id)

  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null)
  const [dprWorkOrder, setDprWorkOrder] = useState(null)

  const activeTab = SLUG_TO_TAB[tab] ?? 'Work Orders'
  useEffect(() => {
    if (project && !tab) navigate(`/projects/site/${id}/work-orders`, { replace: true })
  }, [id, tab, project, navigate])

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Project not found.</p>
      </div>
    )
  }

  const workOrders = getSiteWorkOrders(project.id)

  function setActiveTab(t) {
    navigate(`/projects/site/${id}/${TAB_SLUGS[t]}`)
  }

  function openDprFromDetail(wo) {
    setSelectedWorkOrder(null)
    setDprWorkOrder(wo)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header summary card */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-navy via-brand-blue to-brand-orange" />
        <div className="px-6 pt-3 pb-3 flex items-center gap-1.5 text-[12px]">
          <button onClick={() => navigate('/projects')} className="text-gray-400 hover:underline transition-colors">
            Projects
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-500 truncate">{project.id}</span>
        </div>
        <div className="border-t border-surface-border" />

        <div className="p-6 space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <Badge variant={STATUS_BADGE[project.status] ?? 'gray'} dot size="sm">{project.status}</Badge>
            </div>
            <p className="text-xs text-gray-500 font-mono">{project.id}</p>
          </div>

          <p className="text-sm text-gray-700">{capacitySummary(project)}</p>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Contacts</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="px-3 py-2.5 rounded-lg border border-surface-border bg-surface">
                <p className="text-xs text-gray-400">Builder / Developer</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{project.builderName || '—'}</p>
              </div>
              <div className="px-3 py-2.5 rounded-lg border border-surface-border bg-surface">
                <p className="text-xs text-gray-400">Site Contact</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{project.contactPerson || '—'}</p>
              </div>
              <div className="px-3 py-2.5 rounded-lg border border-surface-border bg-surface flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Contact Number</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{project.contactNumber || '—'}</p>
                </div>
                {project.contactNumber && (
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={`tel:${project.contactNumber}`} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors">
                      <Phone size={13} />
                    </a>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(project.contactNumber)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-border">
          <div className="flex overflow-x-auto scrollbar-none">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`shrink-0 px-4 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap
                  ${activeTab === t ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'}`}
              >
                {t}
              </button>
            ))}
          </div>
          {activeTab === 'Work Orders' && workOrders.length > 0 && canCreate && (
            <div className="pr-4">
              <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate(`/projects/site/${id}/work-orders/new`)}>Add Work Order</Button>
            </div>
          )}
        </div>
        <div className="p-5 sm:p-6">
          {activeTab === 'Work Orders' && (
            workOrders.length === 0 ? (
              <EmptyTabState
                icon={ClipboardList}
                text="No work orders yet"
                action={canCreate && (
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate(`/projects/site/${id}/work-orders/new`)}>Add Work Order</Button>
                )}
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-surface-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-surface-border">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Order No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Activity Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Target Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Technicians</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Execution Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">DPR Entries</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {workOrders.map(wo => {
                      const status = workOrderStatus(wo)
                      const techNames = (wo.assignedTechnicians ?? []).map(uid => getUsers().find(u => u.id === uid)?.name ?? uid)
                      return (
                        <tr key={wo.id} onClick={() => setSelectedWorkOrder(wo)} className="cursor-pointer hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{wo.id}</td>
                          <td className="px-4 py-3 text-gray-800 font-medium">{wo.activityType}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{wo.targetLocation}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {techNames.slice(0, 2).join(', ')}{techNames.length > 2 && <span className="text-gray-400"> +{techNames.length - 2} more</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{wo.executionDate}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{(wo.dprEntries ?? []).length}</td>
                          <td className="px-4 py-3">
                            <Badge variant={WORK_ORDER_STATUS_BADGE[status] ?? 'gray'} dot size="sm">{status}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
          {activeTab === 'Inventory & Consumption' && <EmptyTabState icon={Boxes} text="No inventory recorded yet" />}
          {activeTab === 'Documents & Vault' && <EmptyTabState icon={FileText} text="No documents uploaded yet" />}
          {activeTab === 'CAPEX & Cost Ledger' && <EmptyTabState icon={Receipt} text="CAPEX tracking will be available once work orders are added" />}
        </div>
      </div>

      <WorkOrderDetailModal workOrder={selectedWorkOrder} onClose={() => setSelectedWorkOrder(null)} onAddDPR={openDprFromDetail} />
      <AddDPREntryModal workOrder={dprWorkOrder} onClose={() => setDprWorkOrder(null)} />
    </div>
  )
}
