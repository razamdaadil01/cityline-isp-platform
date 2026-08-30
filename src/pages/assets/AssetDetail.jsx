import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { getAsset, subscribeAssets, assetDisplayName } from '../../data/assetStore'
import { getFieldsForType } from '../../data/assetTaxonomy'
import { getVendors } from '../../data/vendorStore'
import { FIELD_ENGINEERS } from '../../data/installationsStore'

const STATUS_BADGE = { Draft: 'gray', 'PO Raised': 'indigo', 'In Stock': 'green' }

// Which "section" a taxonomy field's value belongs in — purely by its key,
// since every category's field keys already carry that meaning
// consistently (purchaseDate/warrantyStartDate/warrantyEndDate/
// warrantyDate/vendorId/validFrom/validTo/issuedTo across all 5
// categories) rather than needing a per-category grouping map. Kit
// Components is always its own section, never folded into either group.
const PURCHASE_WARRANTY_KEYS = new Set([
  'purchaseDate', 'warrantyStartDate', 'warrantyEndDate', 'warrantyDate', 'vendorId', 'validFrom', 'validTo', 'issuedTo',
])

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">
        {value === undefined || value === null || value === '' ? <span className="text-gray-300">—</span> : value}
      </span>
    </div>
  )
}

export default function AssetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [, forceRerender] = useState(0)
  useEffect(() => subscribeAssets(() => forceRerender(n => n + 1)), [])

  const asset = getAsset(id)

  if (!asset) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/assets')} className="text-sm text-brand-blue hover:underline flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Asset Management
        </button>
        <p className="text-sm text-gray-400 mt-4">Asset {id} was not found.</p>
      </div>
    )
  }

  const fieldDefs = getFieldsForType(asset.categoryId, asset.typeId)
  const basicFields = fieldDefs.filter(f => f.type !== 'kit-components' && !PURCHASE_WARRANTY_KEYS.has(f.key))
  const purchaseWarrantyFields = fieldDefs.filter(f => f.type !== 'kit-components' && PURCHASE_WARRANTY_KEYS.has(f.key))
  const kitComponentsField = fieldDefs.find(f => f.type === 'kit-components')
  const kitRows = kitComponentsField ? (asset.fields[kitComponentsField.key] || []) : []

  function displayValue(field) {
    const raw = asset.fields[field.key]
    if (raw === undefined || raw === null || raw === '') return null
    if (field.type === 'vendor-select') return getVendors().find(v => v.id === raw)?.companyName ?? raw
    if (field.type === 'engineer-select') return FIELD_ENGINEERS.find(e => e.id === raw)?.name ?? raw
    return raw
  }

  return (
    <div className="p-6 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/assets')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 font-mono">{asset.id}</h1>
              <Badge variant={STATUS_BADGE[asset.status] ?? 'gray'} size="sm" dot>{asset.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{asset.categoryLabel} · {asset.typeLabel} · {assetDisplayName(asset)}</p>
          </div>
        </div>
        {asset.poId && (
          <Button variant="secondary" size="sm" icon={<FileText size={14} />} onClick={() => navigate(`/inventory/purchase-orders/${asset.poId}`)}>
            View PO
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
          <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Basic Information</p>
          {basicFields.length === 0 ? (
            <p className="text-xs text-gray-400">No basic fields recorded for this type.</p>
          ) : basicFields.map(f => <InfoRow key={f.key} label={f.label} value={displayValue(f)} />)}
        </div>

        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
          <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Purchase / Warranty Information</p>
          {purchaseWarrantyFields.length === 0 ? (
            <p className="text-xs text-gray-400">No purchase/warranty fields recorded for this type.</p>
          ) : purchaseWarrantyFields.map(f => <InfoRow key={f.key} label={f.label} value={displayValue(f)} />)}
          <InfoRow label="Added By" value={asset.createdBy} />
          <InfoRow label="Added On" value={(asset.createdAt || '').slice(0, 10)} />
        </div>

        {kitComponentsField && (
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden xl:col-span-2">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-gray-800">Kit Components</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2 font-semibold">Component Type</th>
                    <th className="text-left px-3 py-2 font-semibold">Component Name</th>
                    <th className="text-left px-3 py-2 font-semibold">Serial Number</th>
                    <th className="text-right px-3 py-2 font-semibold">Quantity</th>
                    <th className="text-left px-3 py-2 font-semibold">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {kitRows.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No kit components recorded.</td></tr>
                  ) : kitRows.map(row => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-gray-700">{row.componentType || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-gray-700">{row.componentName || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{row.serialNumber || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{row.quantity}</td>
                      <td className="px-3 py-2 text-gray-700">{row.condition || <span className="text-gray-300">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
