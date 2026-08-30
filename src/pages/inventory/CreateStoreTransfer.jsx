import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, ChevronDown, Plus, Trash2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { FormField, Select, Textarea, SearchInput } from '../../components/ui/FormInputs'
import { getStores } from '../../data/storeStore'
import { getProduct, getProducts } from '../../data/productStore'
import { getUnits, getDrums, getProductAvailability } from '../../data/inventoryLedger'
import { getStoreTransfer, saveStoreTransfer, updateStoreTransfer } from '../../data/storeTransferStore'

// Same live-lookup helper as CreateAssignment.jsx's/CreateUserAssignment.jsx's
// own liveTrackingType — reads the product's *current* Tracking Configuration
// on every call rather than a value cached once on the line, and
// distinguishes 'dual' (Serial Number AND MAC Number both enabled — one
// physical unit carrying both identifiers) from single 'serial'/'mac'
// tracking so TransferHardwareLineRow can render the same combined
// serial+mac picker those two flows do. The original card-based version of
// this file collapsed 'dual' into 'serial' and silently dropped the paired
// MAC — fixed here to match.
function liveTrackingType(productId) {
  if (!productId) return 'quantity'
  const product = getProduct(productId)
  if (!product) return 'quantity'
  if (product.trackedBySerial && product.trackedByMac) return 'dual'
  if (product.trackedBySerial) return 'serial'
  if (product.trackedByMac) return 'mac'
  return 'quantity'
}

// ── Product dropdown & unit picker popover ──────────────────────────────
// Ported verbatim from CreateAssignment.jsx's Select Items table (same
// click-to-open/type-to-filter combobox interaction, same closed-state
// "select" look) — duplicated here rather than extracted to a shared file,
// same as CreateUserAssignment.jsx's own copy of these two components.
function ProductDropdown({ products, value, onSelect, placeholder }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 240 })
  const wrapRef = useRef(null)
  const btnRef = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleOpen() {
    if (open) { setOpen(false); return }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) setMenuRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 240) })
    setQuery('')
    setOpen(true)
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return products
    return products.filter(p => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
  }, [products, query])

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button" ref={btnRef} onClick={toggleOpen}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white hover:bg-gray-50 transition-colors"
      >
        <span className={`truncate text-left ${value ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{value || placeholder}</span>
        <ChevronDown size={13} className="text-gray-400 shrink-0" />
      </button>
      {open && (
        <div
          style={{ position: 'fixed', top: menuRect.top, left: menuRect.left, width: menuRect.width, zIndex: 9999 }}
          className="bg-white border border-surface-border rounded-lg shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-surface-border">
            <SearchInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Search product…" />
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-surface-border">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No matching products</p>
            ) : filtered.map(p => (
              <button
                key={p.id} type="button"
                onClick={() => { onSelect(p); setOpen(false); setQuery('') }}
                className="flex flex-col w-full text-left px-3 py-2 gap-0.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>{p.name} {p.sku && <span className="text-gray-400">· {p.sku}</span>}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function UnitPickerPopover({ units, picked, onToggle, onSelectAll, renderLabel, emptyText }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 260 })
  const wrapRef = useRef(null)
  const btnRef = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleOpen() {
    if (open) { setOpen(false); return }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) setMenuRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 260) })
    setQuery('')
    setOpen(true)
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return units
    return units.filter(u => renderLabel(u).toLowerCase().includes(q))
  }, [units, query, renderLabel])

  const allVisibleSelected = filtered.length > 0 && filtered.every(u => picked.includes(u.value))

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button" ref={btnRef} onClick={toggleOpen}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white hover:bg-gray-50 transition-colors"
      >
        <span className={picked.length === 0 ? 'text-gray-400' : 'text-gray-700 font-medium'}>
          {picked.length === 0 ? 'None selected' : `${picked.length} selected`}
        </span>
        <ChevronDown size={13} className="text-gray-400 shrink-0" />
      </button>
      {open && (
        <div
          style={{ position: 'fixed', top: menuRect.top, left: menuRect.left, width: menuRect.width, zIndex: 9999 }}
          className="bg-white border border-surface-border rounded-lg shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-surface-border">
            <SearchInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Search serial/MAC…" />
          </div>
          <label className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 border-b border-surface-border cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={allVisibleSelected} onChange={() => onSelectAll(filtered, !allVisibleSelected)} className="accent-brand-blue" />
            Select all{query ? ' (filtered)' : ''}
          </label>
          <div className="max-h-56 overflow-y-auto divide-y divide-surface-border">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">{emptyText}</p>
            ) : filtered.map(u => {
              const isPicked = picked.includes(u.value)
              return (
                <label key={u.value} className="flex items-center gap-2 px-3 py-2 text-xs font-mono transition-colors text-gray-700 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={isPicked} onChange={() => onToggle(u)} className="accent-brand-blue shrink-0" />
                  <span className="truncate">{renderLabel(u)}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const emptyCell = <div className="px-2.5 py-1.5 text-xs text-gray-300 border border-surface-border rounded-lg bg-gray-50 text-center">—</div>

// ── Select Items table rows — Hardware tab ───────────────────────────────
// Same compact-table shape as CreateAssignment.jsx's HardwareLineRow
// (Product Name | Serial No. / Mac No. | Quantity | Avl. Qty. | Comment),
// but every line here is always freely removable and always already points
// at a real product — Store Transfer has no Work-Order-style "requirement"
// that could leave a line unmapped, so there's no amber "pick a product"
// branch to handle. "Avl. Qty." always reads what STORE FROM currently has
// (getProductAvailability/getUnits scoped to storeFromId) — never Store To,
// which has no bearing on what CAN be pulled for this transfer.
function TransferHardwareLineRow({ line, storeFromId, otherLines, products, onChange, onRemove, excludeStoreTransferId }) {
  const trackingType = liveTrackingType(line.productId)

  function changeProduct(product) {
    onChange({ productId: product.id, productName: product.name, qty: 0, serials: [], macs: [] })
  }

  const nameCell = (
    <td className="px-3 py-2.5 align-top">
      <ProductDropdown products={products} value={line.productName} placeholder="Select product…" onSelect={changeProduct} />
    </td>
  )

  const commentCell = (
    <td className="px-3 py-2.5 align-top">
      <input
        type="text" value={line.remark ?? ''} onChange={e => onChange({ remark: e.target.value })}
        placeholder="Optional note…"
        className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
      />
    </td>
  )

  const actionCell = (
    <td className="px-3 py-2.5 align-top text-right">
      <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0">
        <Trash2 size={13} />
      </button>
    </td>
  )

  function availableCell(count) {
    return (
      <td className="px-3 py-2.5 align-top">
        <div className="px-2.5 py-1.5 text-xs text-gray-500 bg-gray-50 border border-surface-border rounded-lg text-center">{count.toLocaleString('en-IN')}</div>
      </td>
    )
  }

  if (trackingType === 'dual' || trackingType === 'serial' || trackingType === 'mac') {
    const isDual = trackingType === 'dual'
    const kindLabel = isDual ? 'unit' : trackingType === 'serial' ? 'serial' : 'MAC'
    const pickedElsewhere = new Set(otherLines.flatMap(l => [...l.serials, ...l.macs]))
    const units = getUnits({ productId: line.productId, storeId: storeFromId, status: 'Available', excludeStoreTransferId })
      .filter(u => !pickedElsewhere.has(u.value) && !(isDual && u.mac && pickedElsewhere.has(u.mac)))
    const picked = isDual ? line.serials : (trackingType === 'serial' ? line.serials : line.macs)

    function applySelection(nextSerials, nextMacs) {
      if (isDual) onChange({ serials: nextSerials, macs: nextMacs })
      else onChange(trackingType === 'serial' ? { serials: nextSerials } : { macs: nextSerials })
    }
    function toggleUnit(u) {
      const idx = picked.indexOf(u.value)
      const isPicked = idx !== -1
      if (isDual) {
        if (isPicked) applySelection(line.serials.filter((_, i) => i !== idx), line.macs.filter((_, i) => i !== idx))
        else applySelection([...line.serials, u.value], [...line.macs, u.mac])
      } else {
        applySelection(isPicked ? picked.filter(v => v !== u.value) : [...picked, u.value])
      }
    }
    function selectAllVisible(visibleUnits, shouldSelect) {
      if (shouldSelect) {
        const toAdd = visibleUnits.filter(u => !picked.includes(u.value))
        if (isDual) applySelection([...line.serials, ...toAdd.map(u => u.value)], [...line.macs, ...toAdd.map(u => u.mac)])
        else applySelection([...picked, ...toAdd.map(u => u.value)])
      } else {
        const remove = new Set(visibleUnits.map(u => u.value))
        if (isDual) {
          const keepIdx = line.serials.map((_, i) => i).filter(i => !remove.has(line.serials[i]))
          applySelection(keepIdx.map(i => line.serials[i]), keepIdx.map(i => line.macs[i]))
        } else {
          applySelection(picked.filter(v => !remove.has(v)))
        }
      }
    }

    return (
      <tr>
        {nameCell}
        <td className="px-3 py-2.5 align-top">
          {units.length === 0 ? (
            <p className="text-xs text-gray-400 py-1.5">No available {isDual ? '' : kindLabel + ' '}units</p>
          ) : (
            <UnitPickerPopover
              units={units} picked={picked}
              onToggle={toggleUnit} onSelectAll={selectAllVisible}
              renderLabel={u => isDual ? `${u.value} / MAC:${u.mac}` : u.value}
              emptyText="No matching units"
            />
          )}
        </td>
        <td className="px-3 py-2.5 align-top">
          <div className="px-2.5 py-1.5 text-xs text-gray-500 bg-gray-50 border border-surface-border rounded-lg text-center">{picked.length}</div>
        </td>
        {availableCell(units.length)}
        {commentCell}
        {actionCell}
      </tr>
    )
  }

  // Quantity-tracked — capped by however much of this product Store From
  // still has, minus whatever other lines in this same transfer already
  // claim.
  const usedElsewhere = otherLines.reduce((s, l) => l.productId === line.productId ? s + (Number(l.qty) || 0) : s, 0)
  const grossAvailable = line.productId ? getProductAvailability(line.productId, storeFromId, undefined, excludeStoreTransferId) : 0
  const roomToGrow = Math.max(0, grossAvailable - usedElsewhere)
  const remainingInPool = Math.max(0, grossAvailable - usedElsewhere - (Number(line.qty) || 0))

  return (
    <tr>
      {nameCell}
      <td className="px-3 py-2.5 align-top">{emptyCell}</td>
      <td className="px-3 py-2.5 align-top">
        <input
          type="number" min="0" max={roomToGrow}
          value={line.qty}
          onChange={e => {
            const v = Math.max(0, Math.min(roomToGrow, Number(e.target.value) || 0))
            onChange({ qty: v })
          }}
          className="w-16 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
      </td>
      {availableCell(remainingInPool)}
      {commentCell}
      {actionCell}
    </tr>
  )
}

// Trailing, always-visible "add a line" row for the Hardware tab — same
// pattern as CreateAssignment.jsx's AddHardwareRow (local draft state,
// green + confirms and resets), scoped to Store From's available stock:
// `products` (hardwareProductsToAdd from the page) already excludes
// products with zero stock at Store From and products already shown as a
// row — Store Transfer has no requirement to fall back to, so a product
// with nothing available there simply never appears as an option.
function AddHardwareRow({ products, otherLines, storeFromId, onAdd, excludeStoreTransferId }) {
  const [product, setProduct] = useState(null)
  const [qty, setQty] = useState('')
  const [pickedUnits, setPickedUnits] = useState([])
  const [remark, setRemark] = useState('')
  const [error, setError] = useState('')

  const trackingType = product ? liveTrackingType(product.id) : null
  const isTracked = !!trackingType && trackingType !== 'quantity'
  const isDual = trackingType === 'dual'
  const pickedElsewhere = new Set(otherLines.flatMap(l => [...l.serials, ...l.macs]))
  const units = isTracked
    ? getUnits({ productId: product.id, storeId: storeFromId, status: 'Available', excludeStoreTransferId })
      .filter(u => !pickedElsewhere.has(u.value) && !(isDual && u.mac && pickedElsewhere.has(u.mac)))
    : []
  const picked = pickedUnits.map(u => u.value)

  const usedElsewhere = product ? otherLines.reduce((s, l) => l.productId === product.id ? s + (Number(l.qty) || 0) : s, 0) : 0
  const grossAvailable = product && !isTracked ? getProductAvailability(product.id, storeFromId, undefined, excludeStoreTransferId) : 0
  const availableCount = !product ? null : isTracked ? Math.max(0, units.length - picked.length) : Math.max(0, grossAvailable - usedElsewhere)

  function selectProduct(p) {
    setProduct(p); setQty(''); setPickedUnits([]); setError('')
  }
  function toggleUnit(u) {
    setPickedUnits(prev => prev.some(x => x.value === u.value) ? prev.filter(x => x.value !== u.value) : [...prev, u])
  }
  function selectAllVisible(visibleUnits, shouldSelect) {
    setPickedUnits(prev => {
      if (shouldSelect) return [...prev, ...visibleUnits.filter(u => !prev.some(x => x.value === u.value))]
      const remove = new Set(visibleUnits.map(u => u.value))
      return prev.filter(x => !remove.has(x.value))
    })
  }

  function handleConfirm() {
    if (!product) { setError('Select a product.'); return }
    if (isTracked) {
      if (pickedUnits.length === 0) { setError('Select at least one unit.'); return }
    } else if (!qty || Number(qty) <= 0) {
      setError('Enter a valid quantity.'); return
    }
    onAdd({
      productId: product.id, productName: product.name,
      qty: isTracked ? 0 : Number(qty),
      serials: isDual || trackingType === 'serial' ? pickedUnits.map(u => u.value) : [],
      macs: isDual ? pickedUnits.map(u => u.mac) : trackingType === 'mac' ? pickedUnits.map(u => u.value) : [],
      remark: remark.trim(),
    })
    setProduct(null); setQty(''); setPickedUnits([]); setRemark(''); setError('')
  }

  return (
    <tr className="bg-emerald-50/20">
      <td className="px-3 py-2.5 align-top">
        <ProductDropdown products={products} value={product?.name ?? ''} placeholder="Select Product…" onSelect={selectProduct} />
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      </td>
      <td className="px-3 py-2.5 align-top">
        {!product || !isTracked ? emptyCell : units.length === 0 ? (
          <p className="text-xs text-gray-400 py-1.5">No available units</p>
        ) : (
          <UnitPickerPopover
            units={units} picked={picked}
            onToggle={toggleUnit} onSelectAll={selectAllVisible}
            renderLabel={u => isDual ? `${u.value} / MAC:${u.mac}` : u.value}
            emptyText="No matching units"
          />
        )}
      </td>
      <td className="px-3 py-2.5 align-top">
        {!product ? emptyCell : isTracked ? (
          <div className="px-2.5 py-1.5 text-xs text-gray-500 bg-gray-50 border border-surface-border rounded-lg text-center">{picked.length}</div>
        ) : (
          <input
            type="number" min="0" value={qty} onChange={e => setQty(e.target.value)}
            placeholder="0"
            className="w-16 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
        )}
      </td>
      <td className="px-3 py-2.5 align-top">
        {availableCount === null ? emptyCell : (
          <div className="px-2.5 py-1.5 text-xs text-gray-500 bg-gray-50 border border-surface-border rounded-lg text-center">{availableCount.toLocaleString('en-IN')}</div>
        )}
      </td>
      <td className="px-3 py-2.5 align-top">
        <input
          type="text" value={remark} onChange={e => setRemark(e.target.value)}
          placeholder="Optional note…"
          className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
      </td>
      <td className="px-3 py-2.5 align-top text-right">
        <button type="button" onClick={handleConfirm}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
          <Plus size={14} />
        </button>
      </td>
    </tr>
  )
}

// ── Select Items table row — Wire tab ────────────────────────────────────
// Same shape as CreateAssignment.jsx's WireLineRow (Product Name | Drum No |
// Quantity | Avl. Qty. | Comment). Fixes the gap the card-based version of
// this file had: wire was previously moved as an anonymous flat quantity
// with no drum identity at all. Here, like Assign to Engineer's own wire
// line, the user picks a SPECIFIC source drum at Store From and a meter
// length off it; inventoryLedger.js's own Store Transfers block (see that
// file) deducts those meters from that exact drum and represents them as
// their own drum row at Store To once the transfer is saved.
function TransferWireLineRow({ line, storeFromId, otherLines, products, onChange, onRemove, excludeStoreTransferId }) {
  function changeProduct(product) {
    onChange({ productId: product.id, productName: product.name, drumNumber: '', meters: 0 })
  }

  const nameCell = (
    <td className="px-3 py-2.5 align-top">
      <ProductDropdown products={products} value={line.productName} placeholder="Select product…" onSelect={changeProduct} />
    </td>
  )

  const commentCell = (
    <td className="px-3 py-2.5 align-top">
      <input
        type="text" value={line.remark ?? ''} onChange={e => onChange({ remark: e.target.value })}
        placeholder="Optional note…"
        className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
      />
    </td>
  )

  const actionCell = (
    <td className="px-3 py-2.5 align-top text-right">
      <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0">
        <Trash2 size={13} />
      </button>
    </td>
  )

  const drums = getDrums({ productId: line.productId, storeId: storeFromId, excludeStoreTransferId }).filter(d => d.remainingMeters > 0)
  const usedOnDrum = drumNumber => otherLines.reduce((s, l) => l.drumNumber === drumNumber ? s + (Number(l.meters) || 0) : s, 0)
  const selectedDrum = drums.find(d => d.drumNumber === line.drumNumber) ?? null
  const roomToGrow = selectedDrum ? Math.max(0, selectedDrum.remainingMeters - usedOnDrum(selectedDrum.drumNumber)) : 0

  return (
    <tr>
      {nameCell}
      <td className="px-3 py-2.5 align-top">
        {drums.length === 0 ? (
          <p className="text-xs text-gray-400 py-1.5">No drums available</p>
        ) : (
          <select
            value={line.drumNumber}
            onChange={e => onChange({ drumNumber: e.target.value, meters: 0 })}
            className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          >
            <option value="">Select drum…</option>
            {drums.map(d => {
              const selfMeters = d.drumNumber === line.drumNumber ? (Number(line.meters) || 0) : 0
              return (
                <option key={d.drumNumber} value={d.drumNumber}>{d.drumNumber} — {Math.max(0, d.remainingMeters - usedOnDrum(d.drumNumber) - selfMeters)}m left</option>
              )
            })}
          </select>
        )}
      </td>
      <td className="px-3 py-2.5 align-top">
        <input
          type="number" min="0" max={roomToGrow} disabled={!selectedDrum}
          value={line.meters}
          onChange={e => {
            const v = Math.max(0, Math.min(roomToGrow, Number(e.target.value) || 0))
            onChange({ meters: v })
          }}
          className="w-16 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-gray-50"
        />
      </td>
      <td className="px-3 py-2.5 align-top">
        {!selectedDrum ? emptyCell : (
          <div className="px-2.5 py-1.5 text-xs text-gray-500 bg-gray-50 border border-surface-border rounded-lg text-center">{roomToGrow.toLocaleString('en-IN')}m</div>
        )}
      </td>
      {commentCell}
      {actionCell}
    </tr>
  )
}

// Trailing, always-visible "add a line" row for the Wire tab — same pattern
// as AddHardwareRow above, scoped to Store From's own drums via getDrums.
function AddWireRow({ products, otherLines, storeFromId, onAdd, excludeStoreTransferId }) {
  const [product, setProduct] = useState(null)
  const [drumNumber, setDrumNumber] = useState('')
  const [meters, setMeters] = useState('')
  const [remark, setRemark] = useState('')
  const [error, setError] = useState('')

  const drums = product ? getDrums({ productId: product.id, storeId: storeFromId, excludeStoreTransferId }).filter(d => d.remainingMeters > 0) : []
  const usedOnDrum = dn => otherLines.reduce((s, l) => l.drumNumber === dn ? s + (Number(l.meters) || 0) : s, 0)
  const selectedDrum = drums.find(d => d.drumNumber === drumNumber) ?? null
  const roomToGrow = selectedDrum ? Math.max(0, selectedDrum.remainingMeters - usedOnDrum(selectedDrum.drumNumber)) : 0

  function selectProduct(p) {
    setProduct(p); setDrumNumber(''); setMeters(''); setError('')
  }

  function handleConfirm() {
    if (!product) { setError('Select a product.'); return }
    if (!drumNumber) { setError('Select a drum.'); return }
    if (!meters || Number(meters) <= 0) { setError('Enter valid meters.'); return }
    onAdd({
      productId: product.id, productName: product.name,
      drumNumber, meters: Number(meters), remark: remark.trim(),
    })
    setProduct(null); setDrumNumber(''); setMeters(''); setRemark(''); setError('')
  }

  return (
    <tr className="bg-emerald-50/20">
      <td className="px-3 py-2.5 align-top">
        <ProductDropdown products={products} value={product?.name ?? ''} placeholder="Select Product…" onSelect={selectProduct} />
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      </td>
      <td className="px-3 py-2.5 align-top">
        {!product ? emptyCell : drums.length === 0 ? (
          <p className="text-xs text-gray-400 py-1.5">No drums available</p>
        ) : (
          <select
            value={drumNumber} onChange={e => { setDrumNumber(e.target.value); setMeters('') }}
            className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          >
            <option value="">Select drum…</option>
            {drums.map(d => (
              <option key={d.drumNumber} value={d.drumNumber}>{d.drumNumber} — {Math.max(0, d.remainingMeters - usedOnDrum(d.drumNumber))}m left</option>
            ))}
          </select>
        )}
      </td>
      <td className="px-3 py-2.5 align-top">
        <input
          type="number" min="0" max={roomToGrow} disabled={!selectedDrum}
          value={meters}
          onChange={e => setMeters(String(Math.max(0, Math.min(roomToGrow, Number(e.target.value) || 0))))}
          placeholder="0m"
          className="w-16 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-gray-50"
        />
      </td>
      <td className="px-3 py-2.5 align-top">
        {!selectedDrum ? emptyCell : (
          <div className="px-2.5 py-1.5 text-xs text-gray-500 bg-gray-50 border border-surface-border rounded-lg text-center">{roomToGrow.toLocaleString('en-IN')}m</div>
        )}
      </td>
      <td className="px-3 py-2.5 align-top">
        <input
          type="text" value={remark} onChange={e => setRemark(e.target.value)}
          placeholder="Optional note…"
          className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
      </td>
      <td className="px-3 py-2.5 align-top text-right">
        <button type="button" onClick={handleConfirm}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
          <Plus size={14} />
        </button>
      </td>
    </tr>
  )
}

export default function CreateStoreTransfer() {
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  // Edit mode — route is /inventory/store-transfer/:id/edit rather than
  // .../new. `editId` is undefined on the create route, so every edit-mode
  // branch below is a no-op there and behaves exactly as before.
  const existingTransfer = useMemo(() => editId ? getStoreTransfer(editId) : null, [editId])
  const isEditMode = !!existingTransfer

  // Merge-safe searchParams update — same pattern as CreateAssignment.jsx's
  // patchSearchParams, so selecting one field never drops another already
  // in the URL.
  function patchSearchParams(patch, options) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      Object.entries(patch).forEach(([key, value]) => {
        if (value == null) next.delete(key)
        else next.set(key, String(value))
      })
      return next
    }, options)
  }

  const stores = getStores().filter(s => s.status === 'active')

  // Prefill from a quick "Transfer" link elsewhere (Inventory Overview's
  // Units tab or a product's store balance row) — ?storeFrom=, ?productId=,
  // ?unit= seed Store From and a first line on mount; every later selection
  // change keeps the URL in sync itself via patchSearchParams below, so a
  // refresh or a copied link reproduces exactly what's picked, not just this
  // one-time prefill.
  const [storeFromId, setStoreFromId] = useState(searchParams.get('storeFrom') || '')
  const [storeToId, setStoreToId] = useState(searchParams.get('storeTo') || '')
  const [hwLines, setHwLines] = useState([])
  const [wireLines, setWireLines] = useState([])
  const [reason, setReason] = useState('')
  const [attemptedAction, setAttemptedAction] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const storeFrom = stores.find(s => s.id === storeFromId) ?? null
  const storeTo = stores.find(s => s.id === storeToId) ?? null

  // Prefill Store From/To/Reason from the existing record in Edit mode —
  // bypasses selectStoreFrom()/selectStoreTo() (which clear downstream
  // selections and rewrite the URL) since this is a one-time load, not a
  // user pick. Select Items' own hwLines/wireLines are prefilled separately
  // below.
  useEffect(() => {
    if (!existingTransfer) return
    setStoreFromId(existingTransfer.storeFromId)
    setStoreToId(existingTransfer.storeToId)
    setReason(existingTransfer.reason || '')
    setHwLines(existingTransfer.items.filter(it => !it.drumNumber).map(it => ({
      productId: it.productId, productName: it.productName,
      qty: (it.serials.length || it.macs.length) ? 0 : it.qty,
      serials: it.serials, macs: it.macs, remark: it.remark || '',
    })))
    setWireLines(existingTransfer.items.filter(it => it.drumNumber).map(it => ({
      productId: it.productId, productName: it.productName,
      drumNumber: it.drumNumber, meters: it.qty, remark: it.remark || '',
    })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingTransfer])

  // Selecting Store From keeps `?storeFrom=` in sync and clears Select
  // Items — every line is scoped to Store From's own stock, so a different
  // Store From invalidates whatever was already picked, same idea as
  // CreateAssignment.jsx's selectBranch() clearing its own downstream
  // selections. Selecting Store To only affects where stock lands, not what
  // can be picked, so it leaves Select Items alone.
  function selectStoreFrom(id) {
    setStoreFromId(id)
    setHwLines([])
    setWireLines([])
    patchSearchParams({ storeFrom: id || null }, { replace: true })
  }
  function selectStoreTo(id) {
    setStoreToId(id)
    patchSearchParams({ storeTo: id || null }, { replace: true })
  }

  // Select Items' Hardware/Wire tab — same URL-driven pattern as
  // CreateAssignment.jsx's own itemsTab, so reloading or sharing a link with
  // &itemsTab=wire lands on that tab directly.
  const itemsTabParam = searchParams.get('itemsTab')
  const itemsTab = ['hardware', 'wire'].includes(itemsTabParam) ? itemsTabParam : 'hardware'
  function setItemsTab(tab) {
    patchSearchParams({ itemsTab: tab }, { replace: true })
  }

  // One-time prefill of a first line from a quick "Transfer" link — mirrors
  // the original wizard's own Step 2 seed. Only ever a hardware/serial/MAC
  // product (see InventoryOverview.jsx's two Transfer links, neither of
  // which offers a wire/drum quick-link today); the rest of Store From's
  // stock stays browsable via the trailing "Add" row below. Skipped
  // entirely in Edit mode, where hwLines/wireLines are seeded from the
  // existing record instead.
  useEffect(() => {
    if (existingTransfer) return
    const prefillProductId = searchParams.get('productId')
    const prefillUnit = searchParams.get('unit')
    if (!prefillProductId) return
    const product = getProduct(prefillProductId)
    if (!product) return
    const trackingType = liveTrackingType(product.id)
    setHwLines(prev => {
      if (prev.some(l => l.productId === prefillProductId)) return prev
      const line = { productId: prefillProductId, productName: product.name, qty: 0, serials: [], macs: [] }
      if (prefillUnit && trackingType === 'serial') line.serials = [prefillUnit]
      else if (prefillUnit && trackingType === 'mac') line.macs = [prefillUnit]
      return [...prev, line]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Products Store From currently has ANY stock of — one pool, split into
  // hardware/wire below. A product with zero stock at Store From never
  // appears as an option; Store Transfer has no requirement to fall back to
  // the way Assign to Engineer does, so there's nothing to show as
  // "required but out of stock" here (see this app's own Store Transfer UX
  // audit note on why that indicator doesn't apply to this flow).
  const availableProducts = useMemo(() => {
    if (!storeFromId) return []
    return getProducts().filter(p => {
      if (p.status && p.status !== 'active') return false
      if (p.productType === 'wire') {
        return getDrums({ productId: p.id, storeId: storeFromId, excludeStoreTransferId: editId }).some(d => d.remainingMeters > 0)
      }
      return getProductAvailability(p.id, storeFromId, undefined, editId) > 0
        || getUnits({ productId: p.id, storeId: storeFromId, status: 'Available', excludeStoreTransferId: editId }).length > 0
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeFromId, editId])

  const hardwareProductsToAdd = availableProducts.filter(p => p.productType !== 'wire' && !hwLines.some(l => l.productId === p.id))
  const wireProductsToAdd = availableProducts.filter(p => p.productType === 'wire' && !wireLines.some(l => l.productId === p.id))

  function updateHwLine(idx, patch) { setHwLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l)) }
  function updateWireLine(idx, patch) { setWireLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l)) }
  function removeHwLine(idx) { setHwLines(prev => prev.filter((_, i) => i !== idx)) }
  function removeWireLine(idx) { setWireLines(prev => prev.filter((_, i) => i !== idx)) }
  function addHwLine(line) { setHwLines(prev => [...prev, line]) }
  function addWireLine(line) { setWireLines(prev => [...prev, line]) }

  // Store From & Store To are always visible; Select Items reveals once
  // both are picked (and differ); the bottom "Transfer Stock" button (and
  // the Confirm modal it opens) sit alongside Select Items once that
  // section is reachable — same progressive-reveal structure as
  // CreateAssignment.jsx/CreateUserAssignment.jsx, replacing the old
  // 3-step wizard.
  const storesValid = !!storeFromId && !!storeToId && storeFromId !== storeToId

  const issuedHwLines = hwLines.filter(l => liveTrackingType(l.productId) === 'quantity' ? Number(l.qty) > 0 : (l.serials.length + l.macs.length) > 0)
  const issuedWireLines = wireLines.filter(l => l.drumNumber && Number(l.meters) > 0)
  const itemsValid = issuedHwLines.length > 0 || issuedWireLines.length > 0

  function openConfirmModal() {
    if (!storesValid) { setAttemptedAction('stores'); return }
    if (!itemsValid) { setAttemptedAction('items'); return }
    setAttemptedAction(null)
    setSaveError('')
    setShowConfirmModal(true)
  }

  function handleConfirm() {
    if (!storesValid) { setAttemptedAction('stores'); return }
    if (!itemsValid) { setAttemptedAction('items'); return }
    setSaveError('')
    try {
      const payload = {
        storeFromId, storeFromName: storeFrom?.storeName ?? storeFromId,
        storeToId, storeToName: storeTo?.storeName ?? storeToId,
        items: [
          ...issuedHwLines.map(l => ({
            productId: l.productId, productName: l.productName,
            serials: l.serials, macs: l.macs, qty: l.qty, drumNumber: null, remark: l.remark,
          })),
          ...issuedWireLines.map(l => ({
            productId: l.productId, productName: l.productName,
            serials: [], macs: [], qty: l.meters, drumNumber: l.drumNumber, remark: l.remark,
          })),
        ],
        reason,
      }
      // No detail page to land on (removed) — both create and edit return
      // to the list, same as CreateAssignment.jsx/CreateUserAssignment.jsx.
      if (isEditMode) updateStoreTransfer(existingTransfer.id, payload)
      else saveStoreTransfer(payload)
      navigate('/inventory/store-transfer')
    } catch (err) {
      setSaveError(err.message || 'Could not save this transfer.')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/inventory/store-transfer')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isEditMode ? 'Edit Store Transfer' : 'Store Transfer'}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {storeFrom ? <>From <span className="font-semibold text-gray-700">{storeFrom.storeName}</span>{storeTo ? <> to <span className="font-semibold text-gray-700">{storeTo.storeName}</span></> : null}</> : 'Select stores to begin'}
            </p>
          </div>
        </div>
      </div>

      {/* Body — a single scrollable page; each section below reveals once
          its prerequisite is satisfied, replacing the old wizard's discrete
          steps + Next/Back navigation. Full-width, no side margins — same
          as CreateAssignment.jsx/CreateUserAssignment.jsx. */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pb-16 space-y-5">

          {/* ── Section 1: Store From & Store To — always visible, both
              pickers shown inline side by side, same combined-row treatment
              CreateAssignment.jsx gives Store & Engineer. Dropdowns showing
              full store names, not codes. ── */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-5">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Store From & Store To</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Store From" required hint="Stock will be pulled from this store">
                <Select value={storeFromId} onChange={e => selectStoreFrom(e.target.value)}>
                  <option value="">Select store…</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                </Select>
              </FormField>
              <FormField label="Store To" required hint="Stock will be relocated to this store">
                <Select value={storeToId} onChange={e => selectStoreTo(e.target.value)}>
                  <option value="">Select store…</option>
                  {stores.map(s => <option key={s.id} value={s.id} disabled={s.id === storeFromId}>{s.storeName}</option>)}
                </Select>
              </FormField>
            </div>
            {attemptedAction === 'stores' && !storesValid && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select a Store From and a different Store To to continue.
              </div>
            )}
          </div>

          {/* ── Section 2: Select Items — reveals once both stores are
              picked. Split into Hardware/Wire tabs, same pattern as
              CreateAssignment.jsx/CreateUserAssignment.jsx, since a store
              can hold both hardware and wire at once. ── */}
          {storesValid && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-4">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Select Items</p>

              <div className="flex gap-1 border-b border-surface-border -mt-1">
                {['hardware', 'wire'].map(t => (
                  <button
                    key={t} type="button" onClick={() => setItemsTab(t)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize
                      ${itemsTab === t ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {itemsTab === 'hardware' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {[
                          ['Product Name', 'w-[20%]'],
                          ['Serial No. / Mac No.', 'w-[32%]'],
                          ['Quantity', 'w-[8%]'],
                          ['Avl. Qty.', 'w-[10%]'],
                          ['Comment', 'w-[24%]'],
                          ['', 'w-[6%]'],
                        ].map(([h, w], i) => (
                          <th key={i} className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap ${w}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {hwLines.map((l, idx) => (
                        <TransferHardwareLineRow key={`hw-${l.productId}-${idx}`} line={l} storeFromId={storeFromId} products={hardwareProductsToAdd}
                          otherLines={hwLines.filter((_, i) => i !== idx)}
                          onChange={patch => updateHwLine(idx, patch)}
                          onRemove={() => removeHwLine(idx)}
                          excludeStoreTransferId={editId} />
                      ))}
                      <AddHardwareRow products={hardwareProductsToAdd} otherLines={hwLines} storeFromId={storeFromId} onAdd={addHwLine} excludeStoreTransferId={editId} />
                    </tbody>
                  </table>
                </div>
              )}

              {itemsTab === 'wire' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {[
                          ['Product Name', 'w-[20%]'],
                          ['Drum No', 'w-[26%]'],
                          ['Quantity', 'w-[8%]'],
                          ['Avl. Qty.', 'w-[10%]'],
                          ['Comment', 'w-[30%]'],
                          ['', 'w-[6%]'],
                        ].map(([h, w], i) => (
                          <th key={i} className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap ${w}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {wireLines.map((l, idx) => (
                        <TransferWireLineRow key={`wire-${l.productId}-${idx}`} line={l} storeFromId={storeFromId} products={wireProductsToAdd}
                          otherLines={wireLines.filter((_, i) => i !== idx)}
                          onChange={patch => updateWireLine(idx, patch)}
                          onRemove={() => removeWireLine(idx)}
                          excludeStoreTransferId={editId} />
                      ))}
                      <AddWireRow products={wireProductsToAdd} otherLines={wireLines} storeFromId={storeFromId} onAdd={addWireLine} excludeStoreTransferId={editId} />
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Submit — reveals alongside Select Items; opens the Confirm modal ── */}
          {storesValid && (
            <div className="space-y-3">
              {attemptedAction === 'items' && !itemsValid && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select at least one item to transfer.
                </div>
              )}
              <div className="flex justify-end">
                <Button size="sm" icon={<CheckCircle2 size={14} />} onClick={openConfirmModal}>{isEditMode ? 'Save Changes' : 'Transfer Stock'}</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm modal — triggered by the page-bottom submit button,
          replacing the old wizard's inline Confirm step. Guarded on
          `storesValid` since the content below reads storeFrom/storeTo
          directly. ── */}
      {storesValid && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          size="lg"
          title={isEditMode ? 'Confirm Changes' : 'Confirm Transfer'}
          footer={<Button size="sm" icon={<CheckCircle2 size={14} />} onClick={handleConfirm}>{isEditMode ? 'Save Changes' : 'Transfer Stock'}</Button>}
        >
          <div className="space-y-5">
            {saveError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {saveError}
              </div>
            )}

            <div className="rounded-xl border border-surface-border p-4 flex items-center justify-center gap-3">
              <span className="text-sm font-semibold text-gray-800">{storeFrom?.storeName}</span>
              <ArrowRight size={16} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-800">{storeTo?.storeName}</span>
            </div>

            <div className="rounded-xl border border-surface-border overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-border bg-gray-50/60">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Transferring</p>
              </div>
              <div className="divide-y divide-surface-border">
                {issuedHwLines.length === 0 && issuedWireLines.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-400 text-center">Nothing selected yet — go back to Select Items.</p>
                ) : (
                  <>
                    {issuedHwLines.map((l, i) => (
                      <div key={`hw-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <div>
                          <span className="font-medium text-gray-800">{l.productName}</span>
                          {(l.serials.length || l.macs.length) ? (
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">{[...l.serials, ...l.macs].join(', ')}</p>
                          ) : null}
                        </div>
                        <span className="font-semibold text-gray-700">
                          {liveTrackingType(l.productId) === 'quantity' ? l.qty : l.serials.length + l.macs.length}
                        </span>
                      </div>
                    ))}
                    {issuedWireLines.map((l, i) => (
                      <div key={`wire-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <div>
                          <span className="font-medium text-gray-800">{l.productName}</span>
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5">Drum {l.drumNumber}</p>
                        </div>
                        <span className="font-semibold text-gray-700">{l.meters} m</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Unique to Store Transfer — a whole-transfer "why", same
                placement/style as the other two flows' whole-assignment
                Remarks field. */}
            <FormField label="Reason for Transfer" hint="Optional — why this stock is being moved">
              <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Any notes…" />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  )
}
