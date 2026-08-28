import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Search, AlertTriangle, ChevronDown, Plus, Trash2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { FormField, Select, Textarea, SearchInput } from '../../components/ui/FormInputs'
import ProductPicker from '../../components/inventory/ProductPicker'
import { getStores } from '../../data/storeStore'
import { getProduct, getProducts } from '../../data/productStore'
import { getUnits, getDrums, getProductAvailability } from '../../data/inventoryLedger'
import {
  getStoreForBranch, getEngineersForBranch, getAssignableWorkOrders, getWorkOrder,
  resolveWorkOrderRequirement, saveAssignment, WORK_ORDER_TYPES,
} from '../../data/assignmentStore'

// ── Select Items section line cards ─────────────────────────────────────

// Always reads the product's *current* Tracking Configuration live from
// productStore.js rather than a value captured once and cached in hwLines
// state — a change made in Product Management after this Work Order/store
// was already selected earlier in the same session must be reflected
// immediately, never silently stale. Called fresh on every render, same as
// getProductAvailability()/getUnits() calls elsewhere in this file already
// are. Returns 'dual' when both Serial Number and MAC Number are enabled —
// a single physical unit tracked by both at once — distinct from 'serial'/
// 'mac' single-tracking so HardwareLineRow can render its combined picker.
function liveTrackingType(productId) {
  if (!productId) return 'quantity'
  const product = getProduct(productId)
  if (!product) return 'quantity'
  if (product.trackedBySerial && product.trackedByMac) return 'dual'
  if (product.trackedBySerial) return 'serial'
  if (product.trackedByMac) return 'mac'
  return 'quantity'
}

// Raw store availability for a hardware line, ignoring what other lines on
// THIS assignment might also want — used only to answer "does this store
// have any of this product at all," not to cap an input.
function hwLineAvailability(l, storeId) {
  if (!l.productId) return 0
  return liveTrackingType(l.productId) === 'quantity'
    ? getProductAvailability(l.productId, storeId)
    : getUnits({ productId: l.productId, storeId, status: 'Available' }).length
}

function wireLineAvailability(l, storeId) {
  if (!l.productId) return 0
  return getDrums({ productId: l.productId, storeId })
    .filter(d => d.remainingMeters > 0)
    .reduce((s, d) => s + d.remainingMeters, 0)
}

// A line the store genuinely has zero stock/serials/drums for — purely
// informational stock awareness (surfaced via the amber `outOfStock` prop
// on the row and the Confirm step's "Not Fulfilled — Out of Stock" list),
// unrelated to whether the row started out Work-Order-required or was
// added freely — Select Items no longer enforces any per-line "must be
// fulfilled" rule at all (see isStep3Valid below).
function isHwLineOutOfStock(l, storeId) {
  return !!l.productId && Number(l.requiredQty) > 0 && hwLineAvailability(l, storeId) === 0
}
function isWireLineOutOfStock(l, storeId) {
  return !!l.productId && Number(l.requiredMeters) > 0 && wireLineAvailability(l, storeId) === 0
}

// Compact, bounded-height searchable multi-select for a single line's
// serial/MAC units — replaces an unbounded checkbox grid so a product with
// many available units doesn't blow out the row's height. Purely a
// presentation layer: the caller (HardwareLineRow) still owns exactly which
// arrays get toggled, this component only reports which unit was clicked or
// which visible units should be select-all'd/cleared.
function UnitPickerPopover({ units, picked, atCap, onToggle, onSelectAll, renderLabel, emptyText }) {
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
              const rowDisabled = !isPicked && atCap
              return (
                <label key={u.value} className={`flex items-center gap-2 px-3 py-2 text-xs font-mono transition-colors ${rowDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 cursor-pointer hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={isPicked} disabled={rowDisabled} onChange={() => onToggle(u)} className="accent-brand-blue shrink-0" />
                  <span className="truncate">{renderLabel(u)}</span>
                </label>
              )
            })}
          </div>
          {atCap && <p className="px-3 py-1.5 text-[11px] text-gray-400 border-t border-surface-border">Required quantity reached — uncheck a unit to pick a different one.</p>}
        </div>
      )}
    </div>
  )
}

// Unified, fully free-form row shape for both Work-Order-sourced and
// user-added lines: Product | Serial No./Qty | Comment | status-or-action.
// A required line only pre-populates this row as a starting suggestion —
// the requirement itself lives independently in the read-only "Hardware /
// Wire Required" panel above (Section 2), so nothing here is locked: the
// Product dropdown is always the same interactive ProductPicker search
// combobox regardless of where the row came from, the row can always be
// removed, and neither the serial/MAC picker nor the qty input are capped
// by (or even aware of) `line.requiredQty` — that field is kept on the line
// purely as inherited reference data for saveAssignment(), never as a gate.
function HardwareLineRow({ line, storeId, otherLines, products, onChange, onRemove, outOfStock }) {
  const trackingType = liveTrackingType(line.productId)
  // A dual-tracked line's serials/macs are paired 1:1 (same unit, two
  // identifiers) — Math.max avoids double-counting each physical unit the
  // way `serials.length + macs.length` would; for single-tracked lines one
  // of the two arrays is always empty, so this is unchanged for them.
  const usedElsewhere = otherLines.reduce((s, l) => l.productId === line.productId ? s + (liveTrackingType(l.productId) === 'quantity' ? Number(l.assignedQty) || 0 : Math.max(l.serials.length, l.macs.length)) : s, 0)
  const grossAvailable = line.productId ? getProductAvailability(line.productId, storeId) : 0
  // Room left for THIS line to still grow into (excludes its own current
  // pick) — this remains a real physical-stock cap (can't assign more units
  // than the store actually has), unrelated to the Work Order's requirement.
  const roomToGrow = Math.max(0, grossAvailable - usedElsewhere)
  const remainingInPool = Math.max(0, grossAvailable - usedElsewhere - (Number(line.assignedQty) || 0))

  const rowTone = outOfStock ? 'bg-amber-50/40' : ''

  // Picking a product (whether filling in an originally-unmapped requirement
  // row or swapping an existing row to a different product entirely)
  // invalidates whatever was already picked against the old product — reset
  // the tracking-specific fields so a serial/qty from product A never
  // lingers on a line now pointing at product B.
  function changeProduct(product) {
    onChange({ productId: product.id, productName: product.name, name: product.name, assignedQty: 0, serials: [], macs: [] })
  }

  const removeButton = (
    <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0">
      <Trash2 size={13} />
    </button>
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

  if (!line.productId) {
    return (
      <tr className="bg-amber-50/30">
        <td className="px-3 py-2.5 align-top">
          <ProductPicker products={products} value="" placeholder="Select product…" onSelect={changeProduct} />
          <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1"><AlertTriangle size={11} className="shrink-0" /> No product mapped to "{line.name}" — pick one to issue.</p>
        </td>
        <td className="px-3 py-2.5 align-top">
          <p className="text-xs text-gray-400 py-1.5">Pick a product first</p>
        </td>
        {commentCell}
        <td className="px-3 py-2.5 align-top text-right">{removeButton}</td>
      </tr>
    )
  }

  const nameCell = (
    <td className="px-3 py-2.5 align-top">
      <div className="space-y-1">
        <ProductPicker products={products} value={line.productName} placeholder="Select product…" onSelect={changeProduct} />
        {line.isExtra && <Badge variant="purple" size="sm">Extra</Badge>}
      </div>
    </td>
  )

  const pickedElsewhere = new Set(otherLines.flatMap(l => [...l.serials, ...l.macs]))

  if (trackingType === 'dual' || trackingType === 'serial' || trackingType === 'mac') {
    // Serial + MAC both enabled — each unit carries one of each, paired at
    // the same index in line.serials/line.macs (not two independent lists).
    // Toggling a dual-tracked unit always adds/removes both values together.
    const isDual = trackingType === 'dual'
    const kindLabel = isDual ? 'unit' : trackingType === 'serial' ? 'serial' : 'MAC'
    const units = getUnits({ productId: line.productId, storeId, status: 'Available' })
      .filter(u => !pickedElsewhere.has(u.value) && !(isDual && u.mac && pickedElsewhere.has(u.mac)))
    // Units already checked on THIS line stay visible in the list (so they
    // can be unchecked) — same self-inclusive live behavior as before.
    const picked = isDual ? line.serials : (trackingType === 'serial' ? line.serials : line.macs)
    const remainingAvailable = Math.max(0, units.length - picked.length)

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
    // Select-all/clear-all act on whatever's currently filtered/visible —
    // no cap against a "required" count, so this can freely select more
    // units than the Work Order ever asked for.
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
      <tr className={rowTone}>
        {nameCell}
        <td className="px-3 py-2.5 align-top">
          {units.length === 0 ? (
            <p className="text-xs text-gray-400 py-1.5">{outOfStock ? 'Out of stock at this store' : `No available ${isDual ? '' : kindLabel + ' '}units`}</p>
          ) : (
            <UnitPickerPopover
              units={units} picked={picked} atCap={false}
              onToggle={toggleUnit} onSelectAll={selectAllVisible}
              renderLabel={u => isDual ? `${u.value} / MAC:${u.mac}` : u.value}
              emptyText="No matching units"
            />
          )}
        </td>
        {commentCell}
        <td className="px-3 py-2.5 align-top text-xs whitespace-nowrap">
          <div className="flex items-center justify-between gap-2">
            {outOfStock ? (
              <span className="text-amber-700 flex items-center gap-1"><AlertTriangle size={11} className="shrink-0" /> Out of stock</span>
            ) : (
              <span className="text-gray-500">{picked.length} selected · {remainingAvailable} available</span>
            )}
            {removeButton}
          </div>
        </td>
      </tr>
    )
  }

  // Quantity-tracked
  return (
    <tr className={rowTone}>
      {nameCell}
      <td className="px-3 py-2.5 align-top">
        <input
          type="number" min="0" max={roomToGrow} disabled={outOfStock}
          value={line.assignedQty}
          onChange={e => {
            const v = Math.max(0, Math.min(roomToGrow, Number(e.target.value) || 0))
            onChange({ assignedQty: v })
          }}
          className="w-24 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-gray-50"
        />
      </td>
      {commentCell}
      <td className="px-3 py-2.5 align-top text-xs whitespace-nowrap">
        <div className="flex items-center justify-between gap-2">
          {outOfStock ? (
            <span className="text-amber-700 flex items-center gap-1"><AlertTriangle size={11} className="shrink-0" /> Out of stock</span>
          ) : (
            <span className="text-gray-500">{remainingInPool} available</span>
          )}
          {removeButton}
        </div>
      </td>
    </tr>
  )
}

// Trailing, always-visible "add a line" row for the Hardware tab — replaces
// the old separate "+ Add Hardware" link + popup form. Holds its own local
// draft state (product/qty/picked units/remark) until the green + button is
// clicked, at which point it calls onAdd() with a fully-formed line — shaped
// identically to a requirement-sourced line, just flagged `isExtra: true` —
// and resets itself back to empty so another can be added right away. Like
// HardwareLineRow's own picker, this draft's picker is never capped by a
// "required" count — requiredQty is just set to whatever was picked at the
// moment of confirming, kept only as reference data on the resulting line.
function AddHardwareRow({ products, otherLines, storeId, onAdd }) {
  const [product, setProduct] = useState(null)
  const [qty, setQty] = useState('')
  const [pickedUnits, setPickedUnits] = useState([]) // unit objects {value, mac?}
  const [remark, setRemark] = useState('')
  const [error, setError] = useState('')

  const trackingType = product ? liveTrackingType(product.id) : null
  const isTracked = !!trackingType && trackingType !== 'quantity'
  const isDual = trackingType === 'dual'
  const pickedElsewhere = new Set(otherLines.flatMap(l => [...l.serials, ...l.macs]))
  const units = isTracked
    ? getUnits({ productId: product.id, storeId, status: 'Available' })
      .filter(u => !pickedElsewhere.has(u.value) && !(isDual && u.mac && pickedElsewhere.has(u.mac)))
    : []
  const picked = pickedUnits.map(u => u.value)

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
      name: product.name, productId: product.id, productName: product.name,
      requiredQty: isTracked ? pickedUnits.length : Number(qty),
      assignedQty: isTracked ? 0 : Number(qty),
      serials: isDual || trackingType === 'serial' ? pickedUnits.map(u => u.value) : [],
      macs: isDual ? pickedUnits.map(u => u.mac) : trackingType === 'mac' ? pickedUnits.map(u => u.value) : [],
      remark: remark.trim(), isExtra: true,
    })
    setProduct(null); setQty(''); setPickedUnits([]); setRemark(''); setError('')
  }

  return (
    <tr className="bg-emerald-50/20">
      <td className="px-3 py-2.5 align-top">
        <ProductPicker products={products} value={product?.name ?? ''} placeholder="Select Product…" onSelect={selectProduct} />
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      </td>
      <td className="px-3 py-2.5 align-top">
        {!product ? (
          <p className="text-xs text-gray-400 py-1.5">Select a product first</p>
        ) : isTracked ? (
          units.length === 0 ? (
            <p className="text-xs text-gray-400 py-1.5">No available units</p>
          ) : (
            <UnitPickerPopover
              units={units} picked={picked} atCap={false}
              onToggle={toggleUnit} onSelectAll={selectAllVisible}
              renderLabel={u => isDual ? `${u.value} / MAC:${u.mac}` : u.value}
              emptyText="No matching units"
            />
          )
        ) : (
          <input
            type="number" min="0" value={qty} onChange={e => setQty(e.target.value)}
            placeholder="0"
            className="w-24 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          />
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

// Same fully free-form treatment as HardwareLineRow above: the Product
// dropdown is always the interactive ProductPicker, the row is always
// removable, and drum/meters are only ever capped by the drum's real
// remaining stock — never by `line.requiredMeters`, which is kept purely as
// inherited reference data.
function WireLineRow({ line, storeId, otherLines, products, onChange, onRemove, outOfStock }) {
  const rowTone = outOfStock ? 'bg-amber-50/40' : ''

  // Picking a product invalidates whatever drum/meters were already picked
  // against the old product.
  function changeProduct(product) {
    onChange({ productId: product.id, productName: product.name, name: product.name, drumNumber: '', assignedMeters: 0 })
  }

  const removeButton = (
    <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0">
      <Trash2 size={13} />
    </button>
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

  if (!line.productId) {
    return (
      <tr className="bg-amber-50/30">
        <td className="px-3 py-2.5 align-top">
          <ProductPicker products={products} value="" placeholder="Select product…" onSelect={changeProduct} />
          <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1"><AlertTriangle size={11} className="shrink-0" /> No wire product mapped to "{line.name}" — pick one to issue.</p>
        </td>
        <td className="px-3 py-2.5 align-top">
          <p className="text-xs text-gray-400 py-1.5">Pick a product first</p>
        </td>
        {commentCell}
        <td className="px-3 py-2.5 align-top text-right">{removeButton}</td>
      </tr>
    )
  }

  const drums = getDrums({ productId: line.productId, storeId }).filter(d => d.remainingMeters > 0)
  const usedOnDrum = drumNumber => otherLines.reduce((s, l) => l.drumNumber === drumNumber ? s + (Number(l.assignedMeters) || 0) : s, 0)
  const selectedDrum = drums.find(d => d.drumNumber === line.drumNumber) ?? null
  // roomToGrow (excludes this line's own meters) caps the input; the
  // dropdown option text includes this line's own meters so it visibly
  // decrements as the user raises it.
  const roomToGrow = selectedDrum ? Math.max(0, selectedDrum.remainingMeters - usedOnDrum(selectedDrum.drumNumber)) : 0

  return (
    <tr className={rowTone}>
      <td className="px-3 py-2.5 align-top">
        <div className="space-y-1">
          <ProductPicker products={products} value={line.productName} placeholder="Select product…" onSelect={changeProduct} />
          {line.isExtra && <Badge variant="purple" size="sm">Extra</Badge>}
        </div>
      </td>
      <td className="px-3 py-2.5 align-top">
        {drums.length === 0 ? (
          <p className="text-xs text-gray-400 py-1.5">{outOfStock ? 'Out of stock' : 'No drums'}</p>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={line.drumNumber}
              onChange={e => onChange({ drumNumber: e.target.value, assignedMeters: 0 })}
              className="flex-1 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            >
              <option value="">Select drum…</option>
              {drums.map(d => {
                const selfMeters = d.drumNumber === line.drumNumber ? (Number(line.assignedMeters) || 0) : 0
                return (
                  <option key={d.drumNumber} value={d.drumNumber}>{d.drumNumber} — {Math.max(0, d.remainingMeters - usedOnDrum(d.drumNumber) - selfMeters)}m left</option>
                )
              })}
            </select>
            <input
              type="number" min="0" max={roomToGrow} disabled={!selectedDrum}
              value={line.assignedMeters}
              onChange={e => {
                const v = Math.max(0, Math.min(roomToGrow, Number(e.target.value) || 0))
                onChange({ assignedMeters: v })
              }}
              className="w-20 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-gray-50"
            />
          </div>
        )}
      </td>
      {commentCell}
      <td className="px-3 py-2.5 align-top text-xs whitespace-nowrap">
        <div className="flex items-center justify-between gap-2">
          {outOfStock ? (
            <span className="text-amber-700 flex items-center gap-1"><AlertTriangle size={11} className="shrink-0" /> Out of stock</span>
          ) : (
            <span className="text-gray-500">{selectedDrum ? `${roomToGrow}m left` : '—'}</span>
          )}
          {removeButton}
        </div>
      </td>
    </tr>
  )
}

// Trailing, always-visible "add a line" row for the Wire tab — same pattern
// as AddHardwareRow above (local draft state, green + confirms and resets).
function AddWireRow({ products, otherLines, storeId, onAdd }) {
  const [product, setProduct] = useState(null)
  const [drumNumber, setDrumNumber] = useState('')
  const [meters, setMeters] = useState('')
  const [remark, setRemark] = useState('')
  const [error, setError] = useState('')

  const drums = product ? getDrums({ productId: product.id, storeId }).filter(d => d.remainingMeters > 0) : []
  const usedOnDrum = dn => otherLines.reduce((s, l) => l.drumNumber === dn ? s + (Number(l.assignedMeters) || 0) : s, 0)
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
      name: product.name, productId: product.id, productName: product.name,
      requiredMeters: Number(meters), drumNumber, assignedMeters: Number(meters),
      remark: remark.trim(), isExtra: true,
    })
    setProduct(null); setDrumNumber(''); setMeters(''); setRemark(''); setError('')
  }

  return (
    <tr className="bg-emerald-50/20">
      <td className="px-3 py-2.5 align-top">
        <ProductPicker products={products} value={product?.name ?? ''} placeholder="Select Product…" onSelect={selectProduct} />
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      </td>
      <td className="px-3 py-2.5 align-top">
        {!product ? (
          <p className="text-xs text-gray-400 py-1.5">Select a product first</p>
        ) : drums.length === 0 ? (
          <p className="text-xs text-gray-400 py-1.5">No drums available</p>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={drumNumber} onChange={e => { setDrumNumber(e.target.value); setMeters('') }}
              className="flex-1 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            >
              <option value="">Select drum…</option>
              {drums.map(d => (
                <option key={d.drumNumber} value={d.drumNumber}>{d.drumNumber} — {Math.max(0, d.remainingMeters - usedOnDrum(d.drumNumber))}m left</option>
              ))}
            </select>
            <input
              type="number" min="0" max={roomToGrow} disabled={!selectedDrum}
              value={meters}
              onChange={e => setMeters(String(Math.max(0, Math.min(roomToGrow, Number(e.target.value) || 0))))}
              placeholder="0m"
              className="w-20 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-gray-50"
            />
          </div>
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

// ── Work Order section — searchable Work Order combobox ─────────────────
// Same floating-dropdown pattern as CreatePurchase.jsx's POPicker/
// ProductPicker.jsx (position: fixed, computed from the input's own rect,
// outside-click closes it) rather than a new one-off pattern. Opens on
// focus even with no text typed (showing the full assignable list); typing
// filters it live by Work Order ID/customer/plan — same fields the old
// always-visible table filtered by. Editing the input after a Work Order is
// already selected clears that selection (via onClear) so the Requirement
// panel below disappears until a fresh pick is made; just focusing/
// reopening the dropdown without typing leaves the current selection alone.
function WorkOrderPicker({ workOrders, workOrder, onSelect, onClear, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 320 })
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function openDropdown() {
    const rect = inputRef.current?.getBoundingClientRect()
    if (rect) setMenuRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 320) })
    setOpen(true)
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return workOrders
    return workOrders.filter(w =>
      w.id.toLowerCase().includes(q) || (w.customerName || '').toLowerCase().includes(q) || (w.plan || '').toLowerCase().includes(q)
    )
  }, [workOrders, query])

  const label = workOrder ? `${workOrder.id} — ${workOrder.customerName}` : ''

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          value={open ? query : label}
          onChange={e => { setQuery(e.target.value); onClear(); openDropdown() }}
          onFocus={() => { setQuery(''); openDropdown() }}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
      </div>
      {open && (
        <div
          style={{ position: 'fixed', top: menuRect.top, left: menuRect.left, width: menuRect.width, zIndex: 9999 }}
          className="max-h-72 overflow-y-auto bg-white border border-surface-border rounded-lg shadow-lg"
        >
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No assignable Work Orders found</p>
          ) : filtered.map(wo => (
            <button
              key={wo.id} type="button"
              onClick={() => { onSelect(wo); setOpen(false); setQuery('') }}
              className="flex items-center justify-between gap-2 w-full text-left px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors border-b border-surface-border last:border-0"
            >
              <span className="min-w-0 truncate">
                <span className="font-mono font-semibold text-brand-blue">{wo.id}</span>
                <span className="text-gray-500"> · {wo.customerName}</span>
                <span className="text-gray-400"> · {wo.plan}</span>
              </span>
              <Badge variant="indigo" size="sm" className="shrink-0">{wo.status}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CreateAssignment() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Merge-safe searchParams update — same pattern as CreatePurchase.jsx's
  // `?po=` selection, reused here rather than a new one-off (a plain
  // setSearchParams({branch}) call replaces the whole query string, which
  // would silently drop the other selections every time one changes).
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

  const [branchCode, setBranchCode] = useState('')
  const [engineer, setEngineer] = useState(null)
  const [workOrderType, setWorkOrderType] = useState('Installation')
  const [workOrderId, setWorkOrderId] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [hwLines, setHwLines] = useState([])
  const [wireLines, setWireLines] = useState([])
  const [attemptedAction, setAttemptedAction] = useState(null)
  const [saveError, setSaveError] = useState('')

  const products = getProducts().filter(p => p.status === 'active')
  // Products already present as a line (required or extra) are hidden from
  // "Add Product" so the same product can't be added as a second, redundant
  // line in this same assignment.
  const hardwareProductsToAdd = products.filter(p => p.productType === 'hardware' && !hwLines.some(l => l.productId === p.id))
  const wireProductsToAdd = products.filter(p => p.productType === 'wire' && !wireLines.some(l => l.productId === p.id))

  const stores = getStores().filter(s => s.status === 'active')
  // Full store objects (not just the branch code) so the Branch dropdown
  // and every other place branch is shown can display the store's actual
  // name, with the code only as secondary reference — a bare branch code
  // like 'CNPL-001' means nothing to a user picking a physical location.
  const branches = useMemo(() => [...stores].filter(s => s.branchCode).sort((a, b) => a.branchCode.localeCompare(b.branchCode)), [stores])
  const store = branchCode ? getStoreForBranch(branchCode) : null
  const engineers = branchCode ? getEngineersForBranch(branchCode) : []
  // Only 'Installation' has a real backing source (getAssignableWorkOrders
  // reads Installations) — the other Work Order Types are real, selectable
  // options with no data behind them yet, so they resolve to an empty list
  // rather than fabricating records. See WORK_ORDER_TYPES in
  // assignmentStore.js for the shared list Assign to User reuses too.
  const workOrders = (branchCode && engineer && workOrderType === 'Installation') ? getAssignableWorkOrders(branchCode, engineer.name) : []
  const workOrder = workOrderId ? getWorkOrder(workOrderId) : null

  // Selecting Branch/Engineer keeps `?branch=`/`?engineer=` in sync (and
  // clears whichever downstream selections no longer apply), same idea as
  // the `?wo=` sync below — so the URL always reflects exactly what's
  // picked and a refresh (or a copy-pasted link) doesn't lose it.
  function selectBranch(code) {
    setBranchCode(code)
    setEngineer(null)
    clearWorkOrder()
    patchSearchParams({ branch: code || null, engineer: null }, { replace: true })
  }
  function selectEngineer(picked) {
    setEngineer(picked)
    clearWorkOrder()
    patchSearchParams({ engineer: picked?.id ?? null }, { replace: true })
  }

  // Selecting/clearing the Work Order always keeps `?wo=` in sync — same
  // idea as CreatePurchase.jsx's `?po=` param, so the URL reflects exactly
  // what's picked and a copy-pasted link (once branch/engineer are set)
  // doesn't lose the selection.
  function selectWorkOrder(wo) {
    setWorkOrderId(wo.id)
    patchSearchParams({ wo: wo.id }, { replace: true })
  }
  function clearWorkOrder() {
    setWorkOrderId(null)
    patchSearchParams({ wo: null }, { replace: true })
  }

  // Auto-select a Branch carried in the URL (?branch=<code>) on first
  // render — guarded on `!branchCode` so it never fights a selection
  // already made this session.
  useEffect(() => {
    if (branchCode) return
    const branchFromUrl = searchParams.get('branch')
    if (!branchFromUrl) return
    const match = branches.find(b => b.branchCode === branchFromUrl)
    if (match) setBranchCode(match.branchCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches])

  // Auto-select an Engineer carried in the URL (?engineer=<id>) — mirrors
  // the Branch auto-select above, but only resolves once `engineers` is
  // populated for the branch that just got restored (or was already
  // selected), not at raw page-mount time.
  useEffect(() => {
    if (engineer || !branchCode) return
    const engineerFromUrl = searchParams.get('engineer')
    if (!engineerFromUrl) return
    const match = engineers.find(e => e.id === engineerFromUrl)
    if (match) setEngineer(match)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineers])

  // Auto-select a Work Order carried in the URL (?wo=<id>) — mirrors
  // CreatePurchase.jsx's ?po= pre-select, but Work Orders are branch/
  // engineer-scoped (unlike Purchase Orders, a global list resolvable
  // immediately), so this only resolves once `workOrders` itself is
  // non-empty for the currently selected branch/engineer, not at raw
  // page-mount time. Guarded on `!workOrderId` so it never fights a
  // selection already made this session.
  useEffect(() => {
    if (workOrderId) return
    const woIdFromUrl = searchParams.get('wo')
    if (!woIdFromUrl) return
    const match = workOrders.find(w => w.id === woIdFromUrl)
    if (match) setWorkOrderId(match.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrders])

  const requirement = useMemo(() => workOrder ? resolveWorkOrderRequirement(workOrder) : { hardware: [], wire: [] }, [workOrder])

  // Rebuild the Select Items section's editable line state whenever a new
  // Work Order's requirement resolves. Every line starts fully empty —
  // assignedQty: 0, no serials/macs picked, no drum/meters — so the section
  // never shows a reduced Available count before the user has touched
  // anything. A prior draft that never reached Confirm never wrote anything
  // to assignmentStore either: saveAssignment() (called only from
  // handleAssign(), the Confirm section's "Assign Inventory" button) is the
  // sole place that appends to _assignments, so nothing here or in the
  // ledger's read-only queries below can leave a phantom deduction behind.
  useEffect(() => {
    if (!workOrder || !store) { setHwLines([]); setWireLines([]); return }
    // trackingType is intentionally NOT captured here — HardwareLineRow and
    // every validity check below call liveTrackingType(productId) fresh
    // instead, so a Tracking Type edited in Product Management after this
    // Work Order/store was already selected is picked up immediately rather
    // than staying stuck on whatever it was at the moment this effect ran.
    setHwLines(requirement.hardware.map(h => ({
      name: h.name, productId: h.productId, productName: h.productName, requiredQty: h.requiredQty,
      assignedQty: 0, serials: [], macs: [], remark: '',
    })))
    setWireLines(requirement.wire.map(w => ({
      name: w.name, productId: w.productId, productName: w.productName, requiredMeters: w.requiredMeters,
      drumNumber: '', assignedMeters: 0, remark: '',
    })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrder?.id, store?.id])

  function updateHwLine(idx, patch) { setHwLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l)) }
  function updateWireLine(idx, patch) { setWireLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l)) }

  // Select Items' Hardware/Wire tab — same URL-driven pattern as CreatePO.jsx's
  // Products step tabs, so reloading or sharing a link with &itemsTab=wire
  // lands on that tab directly.
  const itemsTabParam = searchParams.get('itemsTab')
  const itemsTab = ['hardware', 'wire'].includes(itemsTabParam) ? itemsTabParam : 'hardware'
  function setItemsTab(tab) {
    patchSearchParams({ itemsTab: tab }, { replace: true })
  }

  // The trailing "add a line" row (AddHardwareRow/AddWireRow) builds the
  // whole line itself and hands it here fully-formed — shaped identically
  // to a requirement-sourced line, just flagged `isExtra: true` — so every
  // completeness/out-of-stock/save rule already written for required lines
  // applies to it unchanged.
  function addHwLine(line) { setHwLines(prev => [...prev, line]) }
  function addWireLine(line) { setWireLines(prev => [...prev, line]) }
  function removeHwLine(idx) { setHwLines(prev => prev.filter((_, i) => i !== idx)) }
  function removeWireLine(idx) { setWireLines(prev => prev.filter((_, i) => i !== idx)) }

  // Branch & Engineer section is always visible. The Work Order section
  // reveals once it's valid; Select Items reveals once a Work Order is
  // picked; Confirm reveals once Select Items is valid. Each function only
  // needs to cover what's newly required at that point — the JSX below
  // already guards each later section on every earlier one being valid
  // before it's even rendered.
  function isStep1Valid() { return !!branchCode && !!engineer }
  function isStep2Valid() { return !!workOrderId }
  // Select Items is fully free-form — required lines only pre-populate it as
  // a starting suggestion, so there's no more per-line "must match what the
  // Work Order asked for" rule. The only bar left is the basic "don't submit
  // an empty assignment" check: at least one row across Hardware or Wire has
  // a non-zero pick (serials/macs, qty, or meters) — rows left at zero (or
  // removed entirely) are simply not part of what gets issued.
  function isStep3Valid() {
    const hwCount = hwLines.reduce((s, l) => s + (liveTrackingType(l.productId) === 'quantity' ? (Number(l.assignedQty) || 0) : l.serials.length + l.macs.length), 0)
    const wireCount = wireLines.reduce((s, l) => s + (Number(l.assignedMeters) || 0), 0)
    return hwCount > 0 || wireCount > 0
  }

  function handleAssign() {
    if (!isStep3Valid()) { setAttemptedAction('step3'); return }
    setSaveError('')
    try {
      const assignment = saveAssignment({
        engineerId: engineer.id, engineerName: engineer.name,
        branchCode, workOrderId: workOrder.id, workOrderLabel: workOrder.id,
        storeId: store.id, storeName: store.storeName,
        hardwareLines: hwLines.filter(l => l.productId).map(l => ({
          productId: l.productId, productName: l.productName, requiredQty: l.requiredQty,
          assignedQty: l.assignedQty, serials: l.serials, macs: l.macs, remark: l.remark,
        })),
        wireLines: wireLines.filter(l => l.productId).map(l => ({
          productId: l.productId, productName: l.productName, requiredMeters: l.requiredMeters,
          assignedMeters: l.assignedMeters, drumNumber: l.drumNumber, remark: l.remark,
        })),
        remarks,
      })
      navigate(`/inventory/assign/${assignment.id}`)
    } catch (err) {
      setSaveError(err.message || 'Could not save this assignment.')
    }
  }

  const issuedHwLines = hwLines.filter(l => l.productId && (liveTrackingType(l.productId) === 'quantity' ? Number(l.assignedQty) > 0 : (l.serials.length + l.macs.length) > 0))
  const issuedWireLines = wireLines.filter(l => l.productId && Number(l.assignedMeters) > 0)
  // Lines the store has zero stock for — never blocked submission (see
  // isHwLineOutOfStock/isWireLineOutOfStock), but still worth surfacing
  // explicitly at Confirm so a partial assignment is visibly partial, not a
  // silently dropped line.
  const outOfStockHwLines = hwLines.filter(l => isHwLineOutOfStock(l, store?.id))
  const outOfStockWireLines = wireLines.filter(l => isWireLineOutOfStock(l, store?.id))

  const step1Valid = isStep1Valid()
  const step2Valid = isStep2Valid()
  const step3Valid = isStep3Valid()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/inventory/assign')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Assign Inventory</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {engineer ? <>To <span className="font-semibold text-gray-700">{engineer.name}</span>{workOrder ? <> for <span className="font-mono">{workOrder.id}</span></> : null}</> : 'Select a branch and engineer to begin'}
            </p>
          </div>
        </div>
      </div>

      {/* Body — a single scrollable page; each section below reveals once
          its prerequisite is satisfied, replacing the old wizard's discrete
          steps + Next/Back navigation. */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pb-16 space-y-5">
          {saveError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {saveError}
            </div>
          )}

          {/* ── Section 1: Branch & Engineer — always visible ── */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-5">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Branch & Engineer</p>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Branch" required>
                <Select value={branchCode} onChange={e => selectBranch(e.target.value)}>
                  <option value="">Select branch…</option>
                  {branches.map(b => <option key={b.branchCode} value={b.branchCode}>{b.storeName} ({b.branchCode})</option>)}
                </Select>
              </FormField>

              <FormField label="Engineer" required>
                {!branchCode ? (
                  <Select value="" disabled className="disabled:text-gray-400 disabled:cursor-not-allowed">
                    <option value="">Select a branch first</option>
                  </Select>
                ) : engineers.length === 0 ? (
                  <p className="text-xs text-gray-400">No engineers have Work Orders assigned in this branch yet.</p>
                ) : (
                  <Select value={engineer?.id ?? ''} onChange={e => {
                    const picked = engineers.find(x => x.id === e.target.value) ?? null
                    selectEngineer(picked)
                  }}>
                    <option value="">Select engineer…</option>
                    {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </Select>
                )}
              </FormField>
            </div>
          </div>

          {/* ── Section 2: Work Order — reveals once Branch + Engineer are set ── */}
          {step1Valid && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-4">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Work Order</p>

              <div className="grid grid-cols-3 gap-4">
                <FormField label="Work Order Type" required hint="Only Installation has assignable Work Orders in this flow today">
                  <Select value={workOrderType} onChange={e => { setWorkOrderType(e.target.value); clearWorkOrder() }}>
                    {WORK_ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </FormField>

                <div className="col-span-2">
                  <FormField label="Work Order" required hint="Only Work Orders with a completed Assign Team step, not yet issued hardware">
                    {workOrderType !== 'Installation' ? (
                      <p className="text-xs text-gray-400 py-2">No {workOrderType} Work Orders are assignable from this flow yet.</p>
                    ) : (
                      <WorkOrderPicker
                        workOrders={workOrders}
                        workOrder={workOrder}
                        onSelect={selectWorkOrder}
                        onClear={clearWorkOrder}
                        placeholder="Search Work Order ID, customer, plan…"
                      />
                    )}
                  </FormField>
                </div>
              </div>

              {/* Requirement — purely informational, so it never itself
                  gates progression. Shown directly below the search bar
                  once a Work Order is selected; disappears the moment the
                  selection is cleared (editing the search input above). */}
              {workOrder && (
                <div className="rounded-lg border border-surface-border bg-surface p-3">
                  <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Hardware / Wire Required — {workOrder.id}</p>
                  {requirement.hardware.length === 0 && requirement.wire.length === 0 ? (
                    <p className="text-xs text-gray-400">No hardware or wire requirement recorded for this Work Order.</p>
                  ) : (
                    <div className="border border-surface-border rounded-lg divide-y divide-surface-border overflow-hidden bg-white">
                      {requirement.hardware.map((h, i) => (
                        <div key={`h-${i}`} className="flex items-center justify-between px-3 py-2 text-xs">
                          <span className={h.productId ? 'text-gray-700' : 'text-amber-700'}>{h.name}</span>
                          <span className="font-semibold text-gray-800">Qty: {h.requiredQty}</span>
                        </div>
                      ))}
                      {requirement.wire.map((w, i) => (
                        <div key={`w-${i}`} className="flex items-center justify-between px-3 py-2 text-xs">
                          <span className={w.productId ? 'text-gray-700' : 'text-amber-700'}>{w.name}</span>
                          <span className="font-semibold text-gray-800">Qty: {w.requiredMeters}m</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-2">This is what's required for the Work Order — Select Items below lets you pick the actual inventory to issue against it.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Section 3: Select Items — reveals once a Work Order is picked ── */}
          {step1Valid && step2Valid && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-4">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Select Items</p>

              {attemptedAction === 'step3' && !step3Valid && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select at least one item (hardware or wire) — assign a quantity, or pick serials/MACs — before continuing.
                </div>
              )}

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
                        {['Product', 'Serial No. / Qty', 'Comment', ''].map((h, i) => (
                          <th key={i} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {hwLines.map((l, idx) => (
                        <HardwareLineRow key={`hw-${idx}`} line={l} storeId={store.id} products={hardwareProductsToAdd}
                          otherLines={hwLines.filter((_, i) => i !== idx)}
                          onChange={patch => updateHwLine(idx, patch)}
                          onRemove={() => removeHwLine(idx)}
                          outOfStock={isHwLineOutOfStock(l, store.id)} />
                      ))}
                      <AddHardwareRow products={hardwareProductsToAdd} otherLines={hwLines} storeId={store.id} onAdd={addHwLine} />
                    </tbody>
                  </table>
                </div>
              )}

              {itemsTab === 'wire' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['Product', 'Drum / Meters', 'Comment', ''].map((h, i) => (
                          <th key={i} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {wireLines.map((l, idx) => (
                        <WireLineRow key={`wire-${idx}`} line={l} storeId={store.id} products={wireProductsToAdd}
                          otherLines={wireLines.filter((_, i) => i !== idx)}
                          onChange={patch => updateWireLine(idx, patch)}
                          onRemove={() => removeWireLine(idx)}
                          outOfStock={isWireLineOutOfStock(l, store.id)} />
                      ))}
                      <AddWireRow products={wireProductsToAdd} otherLines={wireLines} storeId={store.id} onAdd={addWireLine} />
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Section 4: Confirm — reveals once Select Items has at least one valid line ── */}
          {step1Valid && step2Valid && step3Valid && workOrder && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-5">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Confirm</p>

              <div className="rounded-xl border border-surface-border p-4 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Engineer</span>
                  <span className="font-semibold text-gray-800">{engineer.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Work Order</span>
                  <span className="font-mono font-semibold text-gray-800">{workOrder.id}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium text-gray-800">{workOrder.customerName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Branch / Store</span>
                  <span className="font-medium text-gray-800">
                    {store?.storeName ?? branchCode}
                    {store && <span className="text-gray-400 font-normal"> ({branchCode})</span>}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-surface-border overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-border bg-gray-50/60">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Issuing</p>
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
                            {l.isExtra && <Badge variant="purple" size="sm" className="ml-1.5">Extra</Badge>}
                            {(l.serials.length || l.macs.length) ? (
                              <p className="text-[11px] text-gray-400 font-mono mt-0.5">{[...l.serials, ...l.macs].join(', ')}</p>
                            ) : null}
                          </div>
                          <span className="font-semibold text-gray-700">
                            {liveTrackingType(l.productId) === 'quantity' ? l.assignedQty : l.serials.length + l.macs.length}
                          </span>
                        </div>
                      ))}
                      {issuedWireLines.map((l, i) => (
                        <div key={`wire-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <div>
                            <span className="font-medium text-gray-800">{l.productName}</span>
                            {l.isExtra && <Badge variant="purple" size="sm" className="ml-1.5">Extra</Badge>}
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">Drum {l.drumNumber}</p>
                          </div>
                          <span className="font-semibold text-gray-700">{l.assignedMeters} m</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {(outOfStockHwLines.length > 0 || outOfStockWireLines.length > 0) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-amber-200">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                      <AlertTriangle size={13} /> Not Fulfilled — Out of Stock
                    </p>
                  </div>
                  <div className="divide-y divide-amber-200/60">
                    {outOfStockHwLines.map((l, i) => (
                      <div key={`hw-oos-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="font-medium text-gray-800">{l.productName}</span>
                        <span className="text-amber-700 text-xs">Required {l.requiredQty} · 0 available</span>
                      </div>
                    ))}
                    {outOfStockWireLines.map((l, i) => (
                      <div key={`wire-oos-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="font-medium text-gray-800">{l.productName}</span>
                        <span className="text-amber-700 text-xs">Required {l.requiredMeters}m · 0 available</span>
                      </div>
                    ))}
                  </div>
                  <p className="px-4 py-2.5 text-[11px] text-amber-700 border-t border-amber-200/60">
                    This will be a partial assignment — these lines are left pending and can be issued once stock is received.
                  </p>
                </div>
              )}

              <FormField label="Remarks" hint="Optional notes about this assignment">
                <Textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes…" />
              </FormField>

              <div className="flex justify-end">
                <Button size="sm" icon={<CheckCircle2 size={14} />} onClick={handleAssign}>Assign Inventory</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
