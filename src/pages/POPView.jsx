import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit2, Boxes, FileText, Wrench } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import {
  getPOP, getLinkedProject, equipmentWarrantyStatus,
} from '../data/popStore'
import { getWorkOrdersForEquipment } from '../data/workOrderStore'
import { getAllTechnicians } from '../data/technicianHelpers'

const STATUS_BADGE = {
  Planned: 'slate', 'Under Construction': 'yellow', Active: 'green', Inactive: 'gray', Decommissioned: 'red',
}
const POP_TYPE_BADGE = { FTTH: 'blue', OH: 'orange', Hybrid: 'purple' }
const ITEM_CATEGORY_BADGE = { 'Active Equipment': 'blue', 'Passive Equipment': 'purple', Consumable: 'gray' }
const CONDITION_BADGE = { Working: 'green', Faulty: 'red', 'Under Repair': 'orange', Replaced: 'slate' }
const WARRANTY_BADGE = { Active: 'green', 'Expiring Soon': 'yellow', Expired: 'red', 'N/A': 'gray' }
const WO_STATUS_BADGE = {
  Open: 'blue', Assigned: 'indigo', 'In-Progress': 'orange', 'On-Hold': 'yellow', Resolved: 'green', Closed: 'gray',
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
      <div className="text-sm text-gray-800">{children ?? <span className="text-gray-400">—</span>}</div>
    </div>
  )
}

export default function POPView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pop = getPOP(id)
  const [linkedFor, setLinkedFor] = useState(null)

  if (!pop) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">POP not found.</p>
        <button onClick={() => navigate('/network/pops')} className="mt-2 text-sm text-brand-blue hover:underline">
          Back to POP Management
        </button>
      </div>
    )
  }

  const technicians = getAllTechnicians()
  const defaultTech = pop.defaultTechnicianId
    ? technicians.find(t => t.id === pop.defaultTechnicianId)
    : null
  const linkedProject = getLinkedProject(pop.projectId)
  const equipment = pop.equipment ?? []
  const linkedWorkOrders = linkedFor ? getWorkOrdersForEquipment(pop.id, linkedFor.id) : []

  const loc = pop.locality
  const localityLabel = loc
    ? [loc.locality, loc.area, loc.district, loc.state].filter(Boolean).join(', ')
    : null

  const showsLandlordFields = ['Rented', 'Shared'].includes(pop.siteOwnership)

  return (
    <div className="p-6 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/network/pops')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{pop.name}</h1>
              <Badge variant={STATUS_BADGE[pop.status] ?? 'gray'} dot size="sm">{pop.status}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="font-mono font-semibold text-brand-blue">{pop.id}</span>
              {pop.lastCleaningDate && (
                <span className="text-gray-400"> · Last cleaned {pop.lastCleaningDate}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Boxes size={14} />}
            onClick={() => navigate(`/network/pops/${pop.id}/inventory`)}
          >
            View Inventory
          </Button>
          <Button
            size="sm"
            icon={<Edit2 size={14} />}
            onClick={() => navigate(`/network/pops/${pop.id}/edit`)}
          >
            Edit POP
          </Button>
        </div>
      </div>

      <div className="w-full bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-6">

        {/* Basic Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic Details</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="POP Name">{pop.name}</Field>
            <Field label="POP Type">
              <Badge variant={POP_TYPE_BADGE[pop.popType] ?? 'gray'} size="sm">{pop.popType ?? '—'}</Badge>
            </Field>
            <Field label="Category">{pop.category}</Field>
            <Field label="Status">
              <Badge variant={STATUS_BADGE[pop.status] ?? 'gray'} dot size="sm">{pop.status}</Badge>
            </Field>
          </div>
        </div>

        {/* Project Linkage */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Linkage</h3>
          <Field label="Linked Project">
            {linkedProject ? `${linkedProject.name} (${linkedProject.id})` : 'None'}
          </Field>
        </div>

        {/* Location */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Address">{pop.address || null}</Field>
            <Field label="Landmark">{pop.landmark || null}</Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude">{pop.latitude != null ? String(pop.latitude) : null}</Field>
            <Field label="Longitude">{pop.longitude != null ? String(pop.longitude) : null}</Field>
          </div>
          <Field label="Area Mapping Locality">{localityLabel}</Field>
        </div>

        {/* Capacity & Power */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacity & Power</h3>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Capacity">{pop.capacity || null}</Field>
            <Field label="Power Source">{pop.powerSource}</Field>
            <Field label="Power Backup Type">{pop.powerBackup}</Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Backup Power Present">{pop.hasBackupPower ? 'Yes' : 'No'}</Field>
            {pop.hasBackupPower && (
              <Field label="Backup Hours">
                {pop.backupHours != null ? `${pop.backupHours} hrs` : null}
              </Field>
            )}
          </div>
        </div>

        {/* Site Ownership & Contacts */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Site Ownership & Contacts</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Site Ownership">{pop.siteOwnership}</Field>
            <Field label="Rent & Agreement Expiry">{pop.rentAgreementExpiry || null}</Field>
          </div>
          {showsLandlordFields && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50/60 rounded-lg border border-surface-border">
              <Field label="Owner / Landlord Name">{pop.ownerContactName || null}</Field>
              <Field label="Owner / Landlord Phone">{pop.ownerContactPhone || null}</Field>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Site Contact Person">{pop.siteContactName || null}</Field>
            <Field label="Site Contact Phone">{pop.siteContactPhone || null}</Field>
          </div>
          <Field label="Default In-charge Technician">
            {defaultTech
              ? `${defaultTech.name}${defaultTech.zone ? ` — ${defaultTech.zone}` : ''}`
              : 'Unassigned'}
          </Field>
        </div>

        {/* Site Photos / Documents */}
        {(pop.documents ?? []).length > 0 && (
          <div className="space-y-3 pt-4 border-t border-surface-border">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Site Photos / Documents</h3>
            <ul className="divide-y divide-surface-border border border-surface-border rounded-xl overflow-hidden">
              {pop.documents.map((doc, idx) => (
                <li key={idx} className="flex items-center gap-2 px-3 py-2 bg-white">
                  <FileText size={14} className="text-gray-400 shrink-0" />
                  <a
                    href={doc.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-gray-700 hover:text-brand-blue truncate"
                  >
                    {doc.name}
                  </a>
                  {doc.uploadedAt && (
                    <span className="ml-auto text-xs text-gray-400 shrink-0">{doc.uploadedAt}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Equipment */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipment</h3>
          <div className="border border-surface-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-surface-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Label</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">IP Address</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Model</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Ports</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Used</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Customers / VLAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {equipment.map(eq => (
                  <tr key={eq.id} className="hover:bg-gray-50/40">
                    <td className="px-3 py-2 text-xs font-medium text-gray-700">{eq.type}</td>
                    <td className="px-3 py-2 text-gray-800">
                      {eq.label || <span className="text-gray-300">Untitled</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{eq.ip || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{eq.model || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{eq.ports ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{eq.portsUsed ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{eq.status}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {eq.type === 'OLT' ? (eq.customers ?? '—') : (eq.vlan || '—')}
                    </td>
                  </tr>
                ))}
                {equipment.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-xs text-gray-400">
                      No equipment on record.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Details */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inventory Details</h3>
          <div className="border border-surface-border rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-surface-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[140px]">Item</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[140px]">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[180px]">Serial Number</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[110px]">Install Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[110px]">Last Cleaning</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[120px]">Last Maintenance</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[150px]">Warranty/AMC Expiry</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[110px]">Condition</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[120px]">Linked WOs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {equipment.map(eq => {
                  const warranty = equipmentWarrantyStatus(eq)
                  const linkedCount = getWorkOrdersForEquipment(pop.id, eq.id).length
                  return (
                    <tr key={eq.id} className="hover:bg-gray-50/40">
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                        <span className="font-medium">{eq.label || <span className="text-gray-300">Untitled</span>}</span>
                        {eq.type && <span className="block text-xs text-gray-400">{eq.type}</span>}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={ITEM_CATEGORY_BADGE[eq.itemCategory] ?? 'gray'} size="sm">
                          {eq.itemCategory ?? '—'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600">{eq.serialNumber || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 text-center">{eq.quantity ?? 1}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{eq.installDate || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{eq.lastCleaningDate ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{eq.lastMaintenanceDate ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <p className="text-xs text-gray-500">{eq.warrantyAmcExpiry || '—'}</p>
                        <Badge variant={WARRANTY_BADGE[warranty]} size="sm" className="mt-0.5">{warranty}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={CONDITION_BADGE[eq.condition] ?? 'gray'} dot size="sm">
                          {eq.condition ?? '—'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setLinkedFor(eq)}
                          disabled={linkedCount === 0}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors ${
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
                {equipment.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-xs text-gray-400">
                      No equipment on record.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!linkedFor}
        onClose={() => setLinkedFor(null)}
        title={`Work Orders — ${linkedFor?.label ?? ''}`}
        size="md"
      >
        {linkedWorkOrders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No Work Orders reference this equipment item yet.
          </p>
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
                    <span className="block text-xs text-gray-500">
                      {wo.category} · {wo.scheduledDateTime?.slice(0, 10) ?? '—'}
                    </span>
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
