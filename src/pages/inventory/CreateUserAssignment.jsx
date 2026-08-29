import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertTriangle, ChevronDown, Plus, PackagePlus, RefreshCw, PackageX } from 'lucide-react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { FormField, Select, Textarea, SearchInput } from '../../components/ui/FormInputs'
import { FIELD_ENGINEERS } from '../../data/installationsStore'
import { getProducts, getProduct } from '../../data/productStore'
import { getUnits, getEngineerHeldQty, getEngineerHeldDrums } from '../../data/inventoryLedger'
import { WORK_ORDER_TYPES } from '../../data/assignmentStore'
import { ASSIGNMENT_TYPES, getWorkOrderTypeRecords, getUserAssignment, saveUserAssignment, updateUserAssignment } from '../../data/userAssignmentStore'

// Segmented-control config for the Assignment Type selector — same
// bordered-button, icon+label style TicketCreate.jsx's own "Suggested
// Assignment Type" choice uses (border-brand-blue bg-brand-blue/5 when
// selected). 'new' is the default and today's only behavior; 'replace' and
// 'disconnection' are new — see the top-level file note by ASSIGNMENT_TYPE_META's
// usage below for what each does.
const ASSIGNMENT_TYPE_META = {
  new:          { label: 'New',          icon: PackagePlus, hint: 'Hand off held product(s) to the user' },
  replace:      { label: 'Replace',      icon: RefreshCw,   hint: 'Hand off a new unit and record the old one coming back' },
  disconnection: { label: 'Disconnection', icon: PackageX,   hint: 'No handoff — only record the unit being taken back' },
}

// Same live-lookup helper as CreateAssignment.jsx's — reads the product's
// *current* Tracking Configuration on every call rather than a value cached
// once on the line, and distinguishes 'dual' (Serial Number AND MAC Number
// both enabled — one physical unit carrying both identifiers) from single
// 'serial'/'mac' tracking so HandoffLineRow can render the same combined
// serial+mac picker CreateAssignment.jsx's HardwareLineRow does. The
// previous version of this file collapsed 'dual' into 'serial' and silently
// dropped the paired MAC — fixed here to match.
function liveTrackingType(productId) {
  const p = getProduct(productId)
  if (!p) return 'quantity'
  if (p.trackedBySerial && p.trackedByMac) return 'dual'
  if (p.trackedBySerial) return 'serial'
  if (p.trackedByMac) return 'mac'
  return 'quantity'
}

// ── User (reference) picker ──────────────────────────────────────────────
// Searchable combobox spanning ALL supported Work Order Types at once
// (Installation/Ticket/Incident — Network/Project have no backing module
// yet and resolve to no records, see userAssignmentStore.js's
// getWorkOrderTypeRecords) — no separate "Work Order Type" selector needed
// first. Each result is labeled with its type so it's still clear what
// kind of record is being picked. Same floating-dropdown pattern as
// CreatePurchase.jsx's POPicker and CreateAssignment.jsx's WorkOrderPicker.
// Selection is always a real record object, never free text.
function ReferencePicker({ records, value, onSelect, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const q = query.toLowerCase().trim()
  const filtered = (q ? records.filter(r => r.searchText.includes(q)) : records).slice(0, 30)

  return (
    <div className="relative" ref={wrapRef}>
      <input
        value={open ? query : (value ? `${value.label}${value.customerName ? ` · ${value.customerName}` : ''} (${value.type})` : '')}
        onChange={e => { setQuery(e.target.value); setOpen(true); onSelect(null) }}
        onFocus={() => { setQuery(''); setOpen(true) }}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-surface-border rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No matching records</p>
          ) : filtered.map(r => (
            <button key={`${r.type}-${r.id}`} type="button"
              onClick={() => { onSelect(r); setOpen(false); setQuery('') }}
              className="flex flex-col w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors border-b border-surface-border last:border-0">
              <span className="font-mono font-semibold text-brand-blue">{r.id} <span className="text-gray-400 font-sans font-normal">({r.type})</span></span>
              {r.customerName && <span className="text-gray-500 truncate">{r.customerName}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Product dropdown & unit picker popover ──────────────────────────────
// Ported verbatim (same click-to-open/type-to-filter combobox interaction,
// same closed-state "select" look) from CreateAssignment.jsx's Select Items
// table — see that file for the shared origin of this pattern. Duplicated
// here rather than extracted to a shared file since neither component was
// already shared/exported; each page owns its own copy, same as
// ReferencePicker above mirrors WorkOrderPicker without the two files
// importing from each other.
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

// Compact, bounded-height searchable multi-select for a single line's
// serial/MAC units — identical to CreateAssignment.jsx's UnitPickerPopover.
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

// ── Select Items table rows — Hardware tab ───────────────────────────────
// Same compact-table shape as CreateAssignment.jsx's HardwareLineRow
// (Product Name | Serial No. / Mac No. | Quantity | Avl. Qty. | Comment),
// adapted to this flow's holdings-based model: there's no Work Order
// "requirement" here, so every line already starts pointing at a real held
// product (no "unmapped, pick one" branch), and "Avl. Qty." always reads
// what THIS ENGINEER currently holds (getEngineerHeldQty / getUnits with
// engineerId) — never store stock, which has no meaning in a handoff. The
// Product Name dropdown only ever offers OTHER products the engineer holds
// that don't already have their own line (`products`, computed at the page
// level) — the same "already present as a line" exclusion CreateAssignment.jsx
// applies to its own Product dropdown, just against held products instead of
// the full catalog. Every held product gets its own line the moment an
// engineer is picked, so this pool is usually empty for an EXISTING row's
// own dropdown — it's really AddHandoffHwRow below (a held product that was
// somehow not auto-generated, or one the user wants to re-add after this
// pool's own exclusion logic runs) that makes use of it.
function HandoffLineRow({ line, engineerId, otherLines, products, onChange, excludeAssignmentId }) {
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

  const emptyCell = <div className="px-2.5 py-1.5 text-xs text-gray-300 border border-surface-border rounded-lg bg-gray-50 text-center">—</div>

  // Held rows are never removable (unlike CreateAssignment.jsx's lines) —
  // this empty cell only exists so the column count/widths line up with
  // AddHandoffHwRow's trailing action column below.
  const actionCell = <td className="px-3 py-2.5 align-top" />

  function availableCell(count) {
    return (
      <td className="px-3 py-2.5 align-top">
        <div className="px-2.5 py-1.5 text-xs text-gray-500 bg-gray-50 border border-surface-border rounded-lg text-center">{count.toLocaleString('en-IN')}</div>
      </td>
    )
  }

  if (trackingType === 'dual' || trackingType === 'serial' || trackingType === 'mac') {
    // Serial + MAC both enabled (dual) — each unit carries one of each,
    // paired at the same index in line.serials/line.macs, same fix
    // CreateAssignment.jsx's HardwareLineRow already applies: a dual-tracked
    // unit is never split into two independent identifiers.
    const isDual = trackingType === 'dual'
    const kindLabel = isDual ? 'unit' : trackingType === 'serial' ? 'serial' : 'MAC'
    const pickedElsewhere = new Set(otherLines.flatMap(l => [...l.serials, ...l.macs]))
    const units = getUnits({ productId: line.productId, status: 'Assigned to Engineer', engineerId, excludeUserAssignmentId: excludeAssignmentId })
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
            <p className="text-xs text-gray-400 py-1.5">No {isDual ? '' : kindLabel + ' '}units held</p>
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

  // Quantity-tracked — capped by however much of this product the engineer
  // still holds (getEngineerHeldQty), never store stock.
  const held = getEngineerHeldQty(engineerId, line.productId, excludeAssignmentId)
  return (
    <tr>
      {nameCell}
      <td className="px-3 py-2.5 align-top">{emptyCell}</td>
      <td className="px-3 py-2.5 align-top">
        <input
          type="number" min="0" max={held}
          value={line.qty}
          onChange={e => {
            const v = Math.max(0, Math.min(held, Number(e.target.value) || 0))
            onChange({ qty: v })
          }}
          className="w-16 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
        />
      </td>
      {availableCell(held)}
      {commentCell}
      {actionCell}
    </tr>
  )
}

// Trailing, always-visible "add a line" row for the Hardware tab — same
// pattern as CreateAssignment.jsx's AddHardwareRow (local draft state,
// green + confirms and resets), scoped to this flow's holdings: `products`
// (heldHwProductsToAdd from the page) already excludes products already
// shown as a row, so this dropdown only ever offers a held product with no
// row yet — never an arbitrary store/catalog product. Units are read via
// getUnits({ status: 'Assigned to Engineer', engineerId }) and quantity via
// getEngineerHeldQty(engineerId, ...), same held-stock sources
// HandoffLineRow itself reads from, never store availability.
function AddHandoffHwRow({ products, otherLines, engineerId, onAdd, excludeAssignmentId }) {
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
    ? getUnits({ productId: product.id, status: 'Assigned to Engineer', engineerId, excludeUserAssignmentId: excludeAssignmentId })
      .filter(u => !pickedElsewhere.has(u.value) && !(isDual && u.mac && pickedElsewhere.has(u.mac)))
    : []
  const picked = pickedUnits.map(u => u.value)
  const held = product && !isTracked ? getEngineerHeldQty(engineerId, product.id, excludeAssignmentId) : 0

  const availableCount = !product ? null : isTracked ? units.length : held

  const emptyCell = <div className="px-2.5 py-1.5 text-xs text-gray-300 border border-surface-border rounded-lg bg-gray-50 text-center">—</div>

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
          <p className="text-xs text-gray-400 py-1.5">No units held</p>
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
            type="number" min="0" max={held} value={qty}
            onChange={e => setQty(String(Math.max(0, Math.min(held, Number(e.target.value) || 0))))}
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
// Quantity | Avl. Qty. | Comment), adapted the same way HandoffLineRow above
// adapts HardwareLineRow: one row per wire product the engineer holds meters
// of (no "requirement", no unmapped branch, never itself removable), and
// every drum figure is read from what THIS ENGINEER holds
// (getEngineerHeldDrums with engineerId) rather than store stock. Drum No.
// is still a picker rather than a fixed value — an engineer can hold meters
// cut from more than one drum of the same wire product (e.g. two separate
// hardware handoffs), so the row lets them choose which held drum this line
// draws from, same as CreateAssignment.jsx's own drum picker does against
// store stock.
function WireHandoffLineRow({ line, engineerId, otherLines, products, onChange, excludeAssignmentId }) {
  function changeProduct(product) {
    onChange({ productId: product.id, productName: product.name, drumNumber: '', assignedMeters: 0 })
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

  // Held rows are never removable — this empty cell only exists so the
  // column count/widths line up with AddHandoffWireRow's trailing action
  // column below.
  const actionCell = <td className="px-3 py-2.5 align-top" />

  const drums = getEngineerHeldDrums(engineerId, line.productId, excludeAssignmentId)
  const usedOnDrum = drumNumber => otherLines.reduce((s, l) => l.drumNumber === drumNumber ? s + (Number(l.assignedMeters) || 0) : s, 0)
  const selectedDrum = drums.find(d => d.drumNumber === line.drumNumber) ?? null
  // roomToGrow (excludes this line's own meters) caps the input; the
  // dropdown option text includes this line's own meters so it visibly
  // decrements as the user raises it — same pattern as CreateAssignment.jsx.
  const roomToGrow = selectedDrum ? Math.max(0, selectedDrum.remainingMeters - usedOnDrum(selectedDrum.drumNumber)) : 0

  return (
    <tr>
      {nameCell}
      <td className="px-3 py-2.5 align-top">
        {drums.length === 0 ? (
          <p className="text-xs text-gray-400 py-1.5">No drums held</p>
        ) : (
          <select
            value={line.drumNumber}
            onChange={e => onChange({ drumNumber: e.target.value, assignedMeters: 0 })}
            className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
          >
            <option value="">Select drum…</option>
            {drums.map(d => {
              const selfMeters = d.drumNumber === line.drumNumber ? (Number(line.assignedMeters) || 0) : 0
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
          value={line.assignedMeters}
          onChange={e => {
            const v = Math.max(0, Math.min(roomToGrow, Number(e.target.value) || 0))
            onChange({ assignedMeters: v })
          }}
          className="w-16 px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-gray-50"
        />
      </td>
      <td className="px-3 py-2.5 align-top">
        <div className="px-2.5 py-1.5 text-xs text-gray-500 bg-gray-50 border border-surface-border rounded-lg text-center">
          {selectedDrum ? `${roomToGrow.toLocaleString('en-IN')}m` : '—'}
        </div>
      </td>
      {commentCell}
      {actionCell}
    </tr>
  )
}

// Trailing, always-visible "add a line" row for the Wire tab — same pattern
// as AddHandoffHwRow above, scoped to held drums via getEngineerHeldDrums
// instead of store getDrums; `products` (heldWireProductsToAdd from the
// page) already excludes wire products already shown as a row.
function AddHandoffWireRow({ products, otherLines, engineerId, onAdd, excludeAssignmentId }) {
  const [product, setProduct] = useState(null)
  const [drumNumber, setDrumNumber] = useState('')
  const [meters, setMeters] = useState('')
  const [remark, setRemark] = useState('')
  const [error, setError] = useState('')

  const drums = product ? getEngineerHeldDrums(engineerId, product.id, excludeAssignmentId) : []
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
      productId: product.id, productName: product.name,
      drumNumber, assignedMeters: Number(meters), remark: remark.trim(),
    })
    setProduct(null); setDrumNumber(''); setMeters(''); setRemark(''); setError('')
  }

  const emptyCell = <div className="px-2.5 py-1.5 text-xs text-gray-300 border border-surface-border rounded-lg bg-gray-50 text-center">—</div>

  return (
    <tr className="bg-emerald-50/20">
      <td className="px-3 py-2.5 align-top">
        <ProductDropdown products={products} value={product?.name ?? ''} placeholder="Select Product…" onSelect={selectProduct} />
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      </td>
      <td className="px-3 py-2.5 align-top">
        {!product ? emptyCell : drums.length === 0 ? (
          <p className="text-xs text-gray-400 py-1.5">No drums held</p>
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

export default function CreateUserAssignment() {
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  // Edit mode — route is /inventory/assign-to-user/:id/edit rather than
  // .../new. `editId` is undefined on the create route, so every edit-mode
  // branch below is a no-op there and behaves exactly as before. Looked up
  // once per `editId` (never changes mid-session) rather than re-read on
  // every render.
  const existingAssignment = useMemo(() => editId ? getUserAssignment(editId) : null, [editId])
  const isEditMode = !!existingAssignment

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

  const [engineer, setEngineer] = useState(null)
  const [reference, setReference] = useState(null)
  const [assignmentType, setAssignmentType] = useState('new')
  const [hwLines, setHwLines] = useState([])
  const [wireLines, setWireLines] = useState([])
  const [remarks, setRemarks] = useState('')
  const [attemptedAction, setAttemptedAction] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Combined across every supported Work Order Type at once (no separate
  // "Work Order Type" selector) — each record tagged with its own `type` so
  // ReferencePicker can label results and so the picked record still knows
  // which type it came from (stored as `workOrderType` on save, same as
  // before). Doesn't depend on any other selection, so this only needs to
  // run once.
  const records = useMemo(() => WORK_ORDER_TYPES.flatMap(type =>
    getWorkOrderTypeRecords(type).map(r => ({ ...r, type, searchText: `${r.searchText} ${type.toLowerCase()}` }))
  ), [])

  // Prefill Engineer/User/Assignment Type/Remarks from the existing record
  // in Edit mode — bypasses selectEngineer()/selectReference() (which clear
  // downstream selections and rewrite the URL) since this is a one-time
  // load, not a user pick. `records` is synchronous/static, so it's already
  // populated by the time this runs — no loading race to guard against.
  // Select Items' own hwLines/wireLines are prefilled separately below,
  // since they depend on `engineer` being set first.
  useEffect(() => {
    if (!existingAssignment) return
    setEngineer(FIELD_ENGINEERS.find(e => e.id === existingAssignment.engineerId) ?? null)
    setReference(records.find(r => r.id === existingAssignment.workOrderId && r.type === existingAssignment.workOrderType) ?? null)
    setAssignmentType(ASSIGNMENT_TYPES.includes(existingAssignment.assignmentType) ? existingAssignment.assignmentType : 'new')
    setRemarks(existingAssignment.remarks || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingAssignment])

  // Selecting Engineer keeps `?engineer=` in sync (and clears the downstream
  // User selection, which no longer applies), same idea as
  // CreateAssignment.jsx's `?branch=`/`?engineer=` sync — so the URL always
  // reflects exactly what's picked and a refresh (or a copy-pasted link)
  // doesn't lose it.
  function selectEngineer(picked) {
    setEngineer(picked)
    setReference(null)
    patchSearchParams({ engineer: picked?.id ?? null, reference: null }, { replace: true })
  }
  function selectReference(rec) {
    setReference(rec)
    patchSearchParams({ reference: rec?.id ?? null }, { replace: true })
  }
  function selectAssignmentType(type) {
    setAssignmentType(type)
    patchSearchParams({ type }, { replace: true })
  }

  // Select Items' Hardware/Wire tab — same URL-driven pattern as
  // CreateAssignment.jsx's own itemsTab, so reloading or sharing a link
  // with &itemsTab=wire lands on that tab directly.
  const itemsTabParam = searchParams.get('itemsTab')
  const itemsTab = ['hardware', 'wire'].includes(itemsTabParam) ? itemsTabParam : 'hardware'
  function setItemsTab(tab) {
    patchSearchParams({ itemsTab: tab }, { replace: true })
  }

  // Auto-select an Engineer carried in the URL (?engineer=<id>) on first
  // render — guarded on `!engineer` so it never fights a selection already
  // made this session. Unlike CreateAssignment.jsx's engineer list, FIELD_ENGINEERS
  // isn't scoped by any prior selection, so this resolves immediately rather
  // than waiting on another effect.
  useEffect(() => {
    if (engineer) return
    const engineerFromUrl = searchParams.get('engineer')
    if (!engineerFromUrl) return
    const match = FIELD_ENGINEERS.find(e => e.id === engineerFromUrl)
    if (match) setEngineer(match)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-select an Assignment Type carried in the URL (?type=<t>).
  useEffect(() => {
    const typeFromUrl = searchParams.get('type')
    if (typeFromUrl && ASSIGNMENT_TYPES.includes(typeFromUrl)) setAssignmentType(typeFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-select a Reference record carried in the URL (?reference=<id>) —
  // mirrors CreateAssignment.jsx's `?wo=` pre-select, resolving once
  // `records` is populated for whichever Work Order Type was itself
  // restored above. Guarded on `!reference` so it never fights a selection
  // already made this session.
  useEffect(() => {
    if (reference) return
    const referenceFromUrl = searchParams.get('reference')
    if (!referenceFromUrl) return
    const match = records.find(r => r.id === referenceFromUrl)
    if (match) setReference(match)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records])

  // Rebuild the Hardware tab's editable line state whenever the selected
  // engineer changes — one line per product they currently hold ANY of
  // (serial/MAC units with status 'Assigned to Engineer', or a positive net
  // quantity via getEngineerHeldQty()). Unlike Assign to Engineer there's no
  // "requirement" driving this list — it's simply everything this engineer
  // is currently holding, since a handoff can cover any of it.
  //
  // Edit mode: `editId` is passed as `excludeUserAssignmentId` to both
  // held-stock reads, so this specific assignment's own already-handed-off
  // units/qty come back as "held" (see inventoryLedger.js's computeLedger()
  // note) instead of looking already spoken for; existingAssignment.items
  // is then merged in so those held lines start pre-populated with exactly
  // what this assignment already picked, rather than at zero.
  useEffect(() => {
    if (!engineer) { setHwLines([]); return }
    const heldUnits = getUnits({ status: 'Assigned to Engineer', engineerId: engineer.id, excludeUserAssignmentId: editId })
    const productIdsWithUnits = new Set(heldUnits.map(u => u.productId))
    const existingByProduct = new Map((existingAssignment?.items ?? []).filter(it => !it.drumNumber).map(it => [it.productId, it]))
    const unitLines = [...productIdsWithUnits].map(productId => {
      const existing = existingByProduct.get(productId)
      return {
        productId, productName: getProduct(productId)?.name ?? productId,
        qty: 0, serials: existing?.serials ?? [], macs: existing?.macs ?? [], remark: '',
      }
    })
    const qtyLines = getProducts()
      .filter(p => !productIdsWithUnits.has(p.id) && getEngineerHeldQty(engineer.id, p.id, editId) > 0)
      .map(p => {
        const existing = existingByProduct.get(p.id)
        return { productId: p.id, productName: p.name, qty: existing?.qty ?? 0, serials: [], macs: [], remark: '' }
      })
    setHwLines([...unitLines, ...qtyLines])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineer?.id, editId, existingAssignment])

  // Rebuild the Wire tab's editable line state the same way — one line per
  // wire product the engineer currently holds meters of, from ANY drum
  // (getEngineerHeldDrums, see inventoryLedger.js's file-level note on why
  // this needed its own per-engineer-per-drum tracking alongside the
  // existing per-engineer-per-product tracking hardware already had). Edit
  // mode merges in existingAssignment's own wire item the same way as
  // above — one item per product at most, since a single WireHandoffLineRow
  // can only ever save one drum per product (see that component's note).
  useEffect(() => {
    if (!engineer) { setWireLines([]); return }
    const heldWireProductIds = new Set(getEngineerHeldDrums(engineer.id, null, editId).map(d => d.productId))
    const existingByProduct = new Map((existingAssignment?.items ?? []).filter(it => it.drumNumber).map(it => [it.productId, it]))
    setWireLines([...heldWireProductIds].map(productId => {
      const existing = existingByProduct.get(productId)
      return {
        productId, productName: getProduct(productId)?.name ?? productId,
        drumNumber: existing?.drumNumber ?? '', assignedMeters: existing?.qty ?? 0, remark: '',
      }
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineer?.id, editId, existingAssignment])

  function updateHwLine(idx, patch) { setHwLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l)) }
  function updateWireLine(idx, patch) { setWireLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l)) }

  // AddHandoffHwRow/AddHandoffWireRow build the whole line themselves and
  // hand it here fully-formed, shaped identically to an auto-generated
  // holdings line — same pattern as CreateAssignment.jsx's addHwLine/
  // addWireLine.
  function addHwLine(line) { setHwLines(prev => [...prev, line]) }
  function addWireLine(line) { setWireLines(prev => [...prev, line]) }

  // Products the engineer holds that don't already have their own line —
  // the pool offered by each row's Product Name dropdown, same
  // "already present as a line" exclusion CreateAssignment.jsx applies to
  // its own Product dropdown (see HandoffLineRow's file-level note above).
  const heldHwProductsToAdd = useMemo(() => {
    if (!engineer) return []
    const heldUnits = getUnits({ status: 'Assigned to Engineer', engineerId: engineer.id, excludeUserAssignmentId: editId })
    const productIdsWithUnits = new Set(heldUnits.map(u => u.productId))
    const heldProducts = [
      ...[...productIdsWithUnits].map(id => getProduct(id)).filter(Boolean),
      ...getProducts().filter(p => !productIdsWithUnits.has(p.id) && getEngineerHeldQty(engineer.id, p.id, editId) > 0),
    ]
    return heldProducts.filter(p => !hwLines.some(l => l.productId === p.id))
  }, [engineer, hwLines, editId])

  // Same exclusion, against held wire products instead.
  const heldWireProductsToAdd = useMemo(() => {
    if (!engineer) return []
    const heldWireProducts = [...new Set(getEngineerHeldDrums(engineer.id, null, editId).map(d => d.productId))]
      .map(id => getProduct(id)).filter(Boolean)
    return heldWireProducts.filter(p => !wireLines.some(l => l.productId === p.id))
  }, [engineer, wireLines, editId])

  // Engineer & User is always visible (User just stays disabled until an
  // Engineer is picked); Assignment Type and Select Items both reveal once
  // a User is picked; the bottom "Assign to User" button (and the Confirm
  // modal it opens) sit alongside Select Items once that section is
  // reachable — same progressive-reveal structure as CreateAssignment.jsx,
  // replacing the old 4-step wizard. Select Items' own requirement (and the
  // Confirm modal's content) stay the same for every Assignment Type —
  // 'replace'/'disconnection' only change which value gets stored on the
  // record, not the page layout; if they need their own capture fields
  // later that's a separate change.
  const engineerValid = !!engineer
  const referenceValid = !!engineer && !!reference

  const issuedHwLines = hwLines.filter(l => liveTrackingType(l.productId) === 'quantity' ? Number(l.qty) > 0 : (l.serials.length + l.macs.length) > 0)
  const issuedWireLines = wireLines.filter(l => l.drumNumber && Number(l.assignedMeters) > 0)
  const itemsValid = issuedHwLines.length > 0 || issuedWireLines.length > 0

  // The page-level "Assign to User" button only opens the Confirm modal —
  // an invalid click surfaces the same error banner as before instead of
  // opening the modal; a valid click clears any stale error/banner state
  // before showing the summary.
  function openConfirmModal() {
    if (!itemsValid) { setAttemptedAction('items'); return }
    setAttemptedAction(null)
    setSaveError('')
    setShowConfirmModal(true)
  }

  function handleConfirm() {
    if (!itemsValid) { setAttemptedAction('items'); return }
    setSaveError('')
    try {
      const payload = {
        engineerId: engineer.id, engineerName: engineer.name,
        workOrderType: reference.type, workOrderId: reference.id, workOrderLabel: reference.label,
        customerName: reference.customerName, customerId: reference.customerId,
        assignmentType,
        items: [
          ...issuedHwLines.map(l => ({
            productId: l.productId, productName: l.productName,
            serials: l.serials, macs: l.macs, qty: l.qty, drumNumber: null,
          })),
          ...issuedWireLines.map(l => ({
            productId: l.productId, productName: l.productName,
            serials: [], macs: [], qty: l.assignedMeters, drumNumber: l.drumNumber,
          })),
        ],
        remarks,
      }
      // No detail page to land on (removed) — both create and edit return
      // to the list.
      if (isEditMode) updateUserAssignment(existingAssignment.id, payload)
      else saveUserAssignment(payload)
      navigate('/inventory/assign-to-user')
    } catch (err) {
      setSaveError(err.message || 'Could not save this assignment.')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/inventory/assign-to-user')}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isEditMode ? 'Edit User Assignment' : 'Assign to User'}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {engineer ? <>From <span className="font-semibold text-gray-700">{engineer.name}</span>{reference ? <> to <span className="font-mono">{reference.customerName ?? reference.label}</span></> : null}</> : 'Select an engineer to begin'}
            </p>
          </div>
        </div>
      </div>

      {/* Body — a single scrollable page; each section below reveals once
          its prerequisite is satisfied, replacing the old wizard's discrete
          steps + Next/Back navigation. Full-width, no side margins — same
          as CreateAssignment.jsx. */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pb-16 space-y-5">

          {/* ── Section 1: Engineer & User — always visible, both pickers
              shown inline side by side (same combined-row treatment
              CreateAssignment.jsx gives Store & Engineer). No Store/Branch
              field here (unlike CreateAssignment.jsx) — this flow moves
              stock an engineer already holds, it never draws from store
              stock. User stays a disabled placeholder until an Engineer is
              picked, same pattern CreateAssignment.jsx's own Engineer field
              uses while its Store is still unset. ── */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-5">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Engineer & User</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Engineer" required hint="Who currently holds the hardware being handed off">
                <Select value={engineer?.id ?? ''} onChange={e => {
                  const picked = FIELD_ENGINEERS.find(x => x.id === e.target.value) ?? null
                  selectEngineer(picked)
                }}>
                  <option value="">Select engineer…</option>
                  {FIELD_ENGINEERS.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </Select>
              </FormField>

              <FormField label="User" required hint="Search by ID, customer name, or type">
                {!engineerValid ? (
                  <Select value="" disabled className="disabled:text-gray-400 disabled:cursor-not-allowed">
                    <option value="">Select an engineer first</option>
                  </Select>
                ) : records.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No records are available to reference yet.</p>
                ) : (
                  <ReferencePicker records={records} value={reference} onSelect={selectReference} placeholder="Search ID, customer, Installation, Ticket, Incident…" />
                )}
              </FormField>
            </div>
          </div>

          {/* ── Section 2: Assignment Type — reveals once Engineer + User
              are both set, before Select Items. Segmented control, same
              bordered-button style as TicketCreate.jsx's own "Suggested
              Assignment Type" choice. Defaults to 'new'. Only the selected
              value is stored on the record (see handleConfirm below) — it
              doesn't change anything else on this page; if Replace/
              Disconnection need their own capture fields later, that's a
              separate change. ── */}
          {referenceValid && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-4">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Assignment Type</p>
              <div className="flex gap-3">
                {ASSIGNMENT_TYPES.map(type => {
                  const meta = ASSIGNMENT_TYPE_META[type]
                  const Icon = meta.icon
                  return (
                    <button key={type} type="button" onClick={() => selectAssignmentType(type)}
                      className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                        assignmentType === type ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-surface-border text-gray-500 hover:border-gray-300'
                      }`}>
                      <Icon size={14} /> {meta.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400">{ASSIGNMENT_TYPE_META[assignmentType].hint}</p>
            </div>
          )}

          {/* ── Section 3: Select Items — reveals once a User is picked. Same
              regardless of Assignment Type. Split into Hardware/Wire tabs,
              same pattern as CreateAssignment.jsx, since an engineer can
              hold both hardware and wire at once. Each tab's line set is
              seeded from holdings and can be extended via the trailing
              AddHandoffHwRow/AddHandoffWireRow "add a line" row — but
              (unlike CreateAssignment.jsx) that row's own Product dropdown
              is still scoped to held-and-not-yet-listed products only, so a
              handoff still can never include a product the engineer doesn't
              actually hold. ── */}
          {engineerValid && referenceValid && (
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
                        {/* Widths sum to 100% — same Serial No. / Mac No.
                            widening (at Quantity/Avl. Qty.'s expense) as
                            CreateAssignment.jsx's Hardware table. */}
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
                        <HandoffLineRow key={`hw-${l.productId}-${idx}`} line={l} engineerId={engineer.id}
                          otherLines={hwLines.filter((_, i) => i !== idx)}
                          products={heldHwProductsToAdd}
                          onChange={patch => updateHwLine(idx, patch)}
                          excludeAssignmentId={editId} />
                      ))}
                      <AddHandoffHwRow products={heldHwProductsToAdd} otherLines={hwLines} engineerId={engineer.id} onAdd={addHwLine} excludeAssignmentId={editId} />
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
                        <WireHandoffLineRow key={`wire-${l.productId}-${idx}`} line={l} engineerId={engineer.id}
                          otherLines={wireLines.filter((_, i) => i !== idx)}
                          products={heldWireProductsToAdd}
                          onChange={patch => updateWireLine(idx, patch)}
                          excludeAssignmentId={editId} />
                      ))}
                      <AddHandoffWireRow products={heldWireProductsToAdd} otherLines={wireLines} engineerId={engineer.id} onAdd={addWireLine} excludeAssignmentId={editId} />
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Submit — reveals alongside Select Items; opens the Confirm modal ── */}
          {engineerValid && referenceValid && (
            <div className="space-y-3">
              {attemptedAction === 'items' && !itemsValid && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select at least one item to hand off.
                </div>
              )}
              <div className="flex justify-end">
                <Button size="sm" icon={<CheckCircle2 size={14} />} onClick={openConfirmModal}>{isEditMode ? 'Save Changes' : 'Assign to User'}</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm modal — same summary content the inline Confirm step used
          to show, now behind the bottom "Assign to User"/"Save Changes"
          button. Guarded on `reference` (not just `showConfirmModal`) since
          the content below reads engineer/reference fields directly — the
          modal can only ever be opened once both are set (openConfirmModal
          checks itemsValid, which itself requires Select Items to be
          populated, which itself requires a Reference). No "Not Fulfilled —
          Out of Stock" panel here — lines only ever exist for products with
          positive held quantity, so that state can't occur in this flow. */}
      {reference && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          size="lg"
          title={isEditMode ? 'Confirm Changes' : 'Confirm Handoff'}
          footer={<Button size="sm" icon={<CheckCircle2 size={14} />} onClick={handleConfirm}>{isEditMode ? 'Save Changes' : 'Assign to User'}</Button>}
        >
          <div className="space-y-5">
            {saveError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {saveError}
              </div>
            )}

            <div className="rounded-xl border border-surface-border p-4 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Engineer</span>
                <span className="font-semibold text-gray-800">{engineer.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Type</span>
                <span className="font-semibold text-gray-800">{ASSIGNMENT_TYPE_META[assignmentType].label}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Work Order</span>
                <span className="font-mono font-semibold text-gray-800">{reference.id} <span className="text-gray-400 font-sans">({reference.type})</span></span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium text-gray-800">{reference.customerName ?? '—'}</span>
              </div>
              {reference.customerName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">User Id</span>
                  <span className="font-mono font-medium text-gray-800">{reference.customerId ?? '—'}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-surface-border overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-border bg-gray-50/60">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Handing Off</p>
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
                        <span className="font-semibold text-gray-700">{l.assignedMeters} m</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <FormField label="Remarks" hint="Optional notes about this handoff">
              <Textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes…" />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  )
}
