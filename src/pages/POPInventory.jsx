import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Edit2, Boxes, Wrench } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { getPOP, equipmentWarrantyStatus } from '../data/popStore'
import { getWorkOrdersForEquipment } from '../data/workOrderStore'

const WARRANTY_BADGE = { Active: 'green', 'Expiring Soon': 'yellow', Expired: 'red', 'N/A': 'gray' }
const CONDITION_BADGE = { Working: 'green', Faulty: 'red', 'Under Repair': 'orange', Replaced: 'slate' }
const WO_STATUS_BADGE = {
  Open: 'blue', Assigned: 'indigo', 'In-Progress': 'orange', 'On-Hold': 'yellow', Resolved: 'green', Closed: 'gray',
}

function fmt(dateStr) { return dateStr || '—' }

// Per-equipment "POP Inventory Management" view (PRD Phase 1) — read-focused,
// deliberately separate from POPDetail.jsx's Add/Edit form (which owns the
// underlying data entry for these same fields, see its own "Inventory
// Details" table and file-level note). This page exists to surface the
// richer per-item picture — warranty/condition at a glance, and which Work
// Orders touched a given item — without cramming a 15-column table into an
// edit form.
export default function POPInventory() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const pop = getPOP(id)

  if (!pop) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">POP not found.</p>
      </div>
    )
  }

  const equipment = pop.equipment ?? []
  const linkedForId = searchParams.get('modal') === 'linked-workorders' ? searchParams.get('equipId') : null
  const linkedFor = linkedForId ? equipment.find(it => it.id === linkedForId) ?? null : null
  const linkedWorkOrders = linkedFor ? getWorkOrdersForEquipment(pop.id, linkedFor.id) : []

  function openLinkedWorkorders(item) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('modal', 'linked-workorders')
      next.set('equipId', item.id)
      return next
    })
  }

  function closeModal() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('modal')
      next.delete('equipId')
      return next
    })
  }

  return (
    <div className="p-6 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/network/pops/${pop.id}`)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{pop.name} — Inventory</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              POP ID: <span className="font-mono font-semibold text-brand-blue">{pop.id}</span>
              <span className="text-gray-400"> · {equipment.length} item{equipment.length === 1 ? '' : 's'}</span>
            </p>
          </div>
        </div>
        <Button size="sm" variant="secondary" icon={<Edit2 size={14} />} onClick={() => navigate(`/network/pops/${pop.id}/edit`)}>
          Edit POP
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[160px]">Item Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Serial Number</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Install Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Last Cleaning</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Last Maintenance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Warranty/AMC Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Condition</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Linked Work Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {equipment.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Boxes size={32} className="mx-auto mb-2 text-gray-200" />
                    No equipment recorded for this POP yet.
                  </td>
                </tr>
              ) : equipment.map(item => {
                const warranty = equipmentWarrantyStatus(item)
                const linkedCount = getWorkOrdersForEquipment(pop.id, item.id).length
                return (
                  <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{item.label}</span>
                      <span className="block text-xs text-gray-400">{item.type} · {item.model || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{item.itemCategory ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">{item.serialNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs text-center">{item.quantity ?? 1}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(item.installDate)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(item.lastCleaningDate)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(item.lastMaintenanceDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-gray-500">{fmt(item.warrantyAmcExpiry)}</p>
                      <Badge variant={WARRANTY_BADGE[warranty]} size="sm" className="mt-0.5">{warranty}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={CONDITION_BADGE[item.condition] ?? 'gray'} dot size="sm">{item.condition ?? '—'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => openLinkedWorkorders(item)}
                        disabled={linkedCount === 0}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                          linkedCount === 0
                            ? 'text-gray-300 cursor-default'
                            : 'text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 cursor-pointer'
                        }`}
                      >
                        <Wrench size={12} /> {linkedCount}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!linkedFor}
        onClose={closeModal}
        title={`Work Orders — ${linkedFor?.label ?? ''}`}
        size="md"
      >
        {linkedWorkOrders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No Work Orders reference this equipment item yet.</p>
        ) : (
          <ul className="divide-y divide-surface-border -mx-2">
            {linkedWorkOrders.map(wo => (
              <li key={wo.id}>
                <Link
                  to={`/network/pops/work-orders/${wo.id}`}
                  className="flex items-center justify-between gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span>
                    <span className="block text-sm font-medium text-gray-800 font-mono">{wo.id}</span>
                    <span className="block text-xs text-gray-500">{wo.category} · {wo.faultType ?? 'No fault type'}</span>
                  </span>
                  <Badge variant={WO_STATUS_BADGE[wo.status] ?? 'gray'} dot size="sm">{wo.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  )
}
