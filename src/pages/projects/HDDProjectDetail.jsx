import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardList, Boxes, Plus, Download } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { getHDDProject, getHDDWorkOrders, getHDDProjectCapex, subscribeProjects } from '../../data/projectStore'
import { getVendor } from '../../data/vendorStore'
import { getUsers } from '../../data/userStore'
import { getProduct } from '../../data/productStore'
import { usePermission } from '../../data/rolesStore'
import { exportWorkbook } from '../../utils/excelExport'

const STATUS_BADGE = {
  'Planning': 'gray', 'In Progress': 'indigo', 'On Hold': 'orange', 'Completed': 'green', 'Cancelled': 'red',
}

const WORK_ORDER_STATUS_BADGE = {
  'Assigned': 'gray', 'In-Progress': 'indigo', 'Completed': 'green',
}

const TABS = ['Work Orders', 'Inventory', 'CAPEX & Financials']
const TAB_SLUGS = { 'Work Orders': 'work-orders', 'Inventory': 'inventory', 'CAPEX & Financials': 'capex' }
const SLUG_TO_TAB = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]))

function unitAbbrev(unit) { return unit === 'Kilometers' ? 'km' : 'm' }

function EmptyTabState({ icon: Icon, text, action }) {
  return (
    <div className="py-14 text-center text-sm text-gray-400">
      <Icon size={28} className="mx-auto mb-2 text-gray-200" />
      {text}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function WorkOrderDetailModal({ workOrder, onClose }) {
  const isOpen = !!workOrder
  if (!isOpen) return null

  const engineerName = getUsers().find(u => u.id === workOrder.assignedEngineer)?.name ?? '—'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={workOrder.id} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-400">Assigned Engineer</p><p className="font-medium text-gray-800">{engineerName}</p></div>
          <div><p className="text-xs text-gray-400">Execution Date</p><p className="font-medium text-gray-800">{workOrder.executionDate}</p></div>
          <div><p className="text-xs text-gray-400">Status</p><Badge variant={WORK_ORDER_STATUS_BADGE[workOrder.status] ?? 'gray'} dot size="sm">{workOrder.status}</Badge></div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Segments</h4>
          {(workOrder.segments ?? []).length === 0 ? (
            <p className="text-xs text-gray-400">No segments recorded.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-surface-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-surface-border">
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Start → End</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wide">Length (m)</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wide">Shots</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wide">Ducts (m)</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wide">Couplers</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wide">Chambers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {workOrder.segments.map((seg, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-700">
                        {seg.startPointName} → {seg.endPointName}
                        {seg.chamberTag && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-mono font-semibold">{seg.chamberTag}</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">{seg.lengthDrilled}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{seg.shotsTaken}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{seg.ductsUsed}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{seg.couplersUsed}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{seg.chambersInstalled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Daily Labour</h4>
          {workOrder.labour ? (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Headcount</p><p className="font-medium text-gray-800">{workOrder.labour.headcount}</p></div>
              <div><p className="text-xs text-gray-400">Rate Type</p><p className="font-medium text-gray-800">{workOrder.labour.rateType}</p></div>
              <div><p className="text-xs text-gray-400">Total Cost</p><p className="font-medium text-gray-800">₹{(workOrder.labour.totalCost ?? 0).toLocaleString('en-IN')}</p></div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No labour data recorded.</p>
          )}
        </div>

        {workOrder.remarks && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Remarks</h4>
            <p className="text-sm text-gray-700">{workOrder.remarks}</p>
          </div>
        )}

        {(workOrder.attachments ?? []).length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attachments</h4>
            <div className="space-y-1">
              {workOrder.attachments.map((a, i) => (
                <p key={i} className="text-xs text-gray-600">{a.name} <span className="text-gray-400">({a.sizeLabel})</span></p>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function HDDProjectDetail() {
  const { id, tab } = useParams()
  const navigate = useNavigate()
  const canCreate = usePermission('Projects', 'Create')

  // Subscribing (without using the payload directly) just forces a
  // re-render whenever projectStore changes, so the getHDDProject(id)
  // lookup below always reflects the latest saved state (mirrors
  // VendorDetail.jsx's forceRerender pattern).
  const [, forceRerender] = useState(0)
  useEffect(() => subscribeProjects(() => forceRerender(n => n + 1)), [])
  const project = getHDDProject(id)

  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null)

  const activeTab = SLUG_TO_TAB[tab] ?? 'Work Orders'
  useEffect(() => {
    if (project && !tab) navigate(`/projects/hdd/${id}/work-orders`, { replace: true })
  }, [id, tab, project, navigate])

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Project not found.</p>
      </div>
    )
  }

  const siteInchargeName = getUsers().find(u => u.id === project.siteIncharge)?.name ?? '—'
  const vendorName = getVendor(project.vendor)?.companyName ?? '—'
  const unit = unitAbbrev(project.distanceUnit)
  const totalDistance = project.distance ?? 0

  // Drilled Distance is always captured in meters (Segment.lengthDrilled);
  // normalize both sides to meters for the percentage, then display the
  // drilled figure back in the project's own chosen unit.
  const totalDistanceMeters = project.distanceUnit === 'Kilometers' ? totalDistance * 1000 : totalDistance
  const drilledMeters = project.drilledDistance ?? 0
  const drilledDisplay = project.distanceUnit === 'Kilometers' ? Number((drilledMeters / 1000).toFixed(2)) : drilledMeters
  const progressPercent = totalDistanceMeters > 0 ? Math.min(100, (drilledMeters / totalDistanceMeters) * 100) : 0

  const workOrders = getHDDWorkOrders(project.id)
  const capex = getHDDProjectCapex(project.id)

  function setActiveTab(t) {
    navigate(`/projects/hdd/${id}/${TAB_SLUGS[t]}`)
  }

  function handleExportCapex() {
    exportWorkbook(`${project.title.replace(/\s+/g, '_')}_${project.id}_CAPEX.xlsx`, [
      {
        name: 'CAPEX Breakdown',
        rows: [
          { 'Cost Component': 'Contractor Drilling Cost', 'Amount (₹)': capex.drillingCost },
          { 'Cost Component': 'Labour Charges', 'Amount (₹)': capex.labourCharges },
          { 'Cost Component': 'Material / Hardware Cost', 'Amount (₹)': capex.materialCost },
          { 'Cost Component': 'Total HDD Project CAPEX', 'Amount (₹)': capex.totalCapex },
        ],
      },
    ])
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
              <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
              <Badge variant={STATUS_BADGE[project.status] ?? 'gray'} dot size="sm">{project.status}</Badge>
            </div>
            <p className="text-xs text-gray-500 font-mono">{project.id}</p>
          </div>

          <p className="text-sm text-gray-700">
            {project.routeGeometry?.start?.name ?? '—'} → {project.routeGeometry?.end?.name ?? '—'}
            <span className="text-gray-400"> · Total: {totalDistance}{unit}</span>
          </p>

          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Drilled Distance</span>
              <span>{drilledDisplay}{unit} / {totalDistance}{unit} — {progressPercent.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-brand-blue rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Site Incharge', value: siteInchargeName },
              { label: 'Vendor', value: vendorName },
              { label: 'Drilling Rate / m', value: project.drillingRate != null ? `₹${project.drillingRate.toLocaleString('en-IN')}` : '—' },
              { label: 'Live Total CAPEX', value: `₹${capex.totalCapex.toLocaleString('en-IN')}` },
            ].map(s => (
              <div key={s.label} className="text-center px-3 py-2.5 rounded-lg border border-surface-border bg-surface">
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-sm font-bold mt-0.5 text-gray-900 truncate">{s.value}</p>
              </div>
            ))}
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
              <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate(`/projects/hdd/${id}/work-orders/new`)}>Add Work Order</Button>
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
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate(`/projects/hdd/${id}/work-orders/new`)}>Add Work Order</Button>
                )}
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-surface-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-surface-border">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Order No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Engineer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Execution Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Segments</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {workOrders.map(wo => (
                      <tr key={wo.id} onClick={() => setSelectedWorkOrder(wo)} className="cursor-pointer hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{wo.id}</td>
                        <td className="px-4 py-3 text-gray-800 font-medium">{getUsers().find(u => u.id === wo.assignedEngineer)?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{wo.executionDate}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{(wo.segments ?? []).length}</td>
                        <td className="px-4 py-3">
                          <Badge variant={WORK_ORDER_STATUS_BADGE[wo.status] ?? 'gray'} dot size="sm">{wo.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
          {activeTab === 'Inventory' && <EmptyTabState icon={Boxes} text="No materials assigned yet" />}
          {activeTab === 'CAPEX & Financials' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExportCapex}>Export Excel</Button>
              </div>
              <div className="rounded-xl border border-surface-border divide-y divide-surface-border overflow-hidden">
                {[
                  { label: 'Contractor Drilling Cost', value: capex.drillingCost },
                  { label: 'Labour Charges', value: capex.labourCharges },
                  { label: 'Material / Hardware Cost', value: capex.materialCost },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3 text-sm bg-white">
                    <span className="text-gray-600">{row.label}</span>
                    <span className="font-semibold text-gray-900">₹{row.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3.5 text-sm bg-gray-50/60">
                  <span className="font-semibold text-gray-800">Total HDD Project CAPEX</span>
                  <span className="font-bold text-brand-blue text-base">₹{capex.totalCapex.toLocaleString('en-IN')}</span>
                </div>
              </div>
              {workOrders.length === 0 && (
                <p className="text-xs text-gray-400 text-center">No work orders yet — every figure above will update as work orders are added.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <WorkOrderDetailModal workOrder={selectedWorkOrder} onClose={() => setSelectedWorkOrder(null)} />
    </div>
  )
}
