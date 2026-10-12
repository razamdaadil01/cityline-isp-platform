import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

/**
 * Self-contained ⋮ row-action menu rendered in a document.body portal.
 *
 * Positioning is measured after render (useLayoutEffect, before paint) for
 * flicker-free viewport-aware placement:
 *   - Opens below the trigger by default.
 *   - Flips upward when the menu would overflow the viewport bottom edge.
 *   - Clamps to avoid viewport left overflow.
 * Closes on outside mousedown, Escape, scroll (any ancestor), or resize.
 * Clicking any item also closes the menu via event bubbling.
 *
 * Props:
 *   children       — menu items (buttons, separators, etc.)
 *   menuClassName  — className for the dropdown container
 *   className      — trigger button className (closed state)
 *   activeClassName — trigger button className (open state)
 */
export default function RowActionMenu({
  children,
  menuClassName   = 'bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44',
  className       = 'w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-gray-400 hover:bg-gray-100 hover:text-gray-600',
  activeClassName = 'w-7 h-7 flex items-center justify-center rounded-lg transition-colors bg-gray-100 text-gray-700',
}) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: -9999, right: 0, visible: false })
  const triggerRef = useRef(null)
  const menuRef    = useRef(null)

  function handleTrigger(e) {
    e.stopPropagation()
    if (open) { setOpen(false); return }
    setPos({ top: -9999, right: 0, visible: false })
    setOpen(true)
  }

  // Measure actual size and reposition without flicker (fires before browser paint)
  useLayoutEffect(() => {
    if (!open || !menuRef.current || !triggerRef.current) return
    const tRect = triggerRef.current.getBoundingClientRect()
    const mH    = menuRef.current.offsetHeight
    const mW    = menuRef.current.offsetWidth
    const vW    = window.innerWidth
    const vH    = window.innerHeight

    let top   = tRect.bottom + 4
    let right = vW - tRect.right

    // Flip upward if the menu would overflow the bottom edge
    if (top + mH > vH - 8) top = Math.max(4, tRect.top - mH - 4)

    // Clamp: prevent left-edge overflow
    const left = vW - right - mW
    if (left < 4) right = vW - mW - 4

    setPos({ top, right, visible: true })
  }, [open])

  // Close on outside mousedown
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (!menuRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target))
        setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Close on Escape, scroll (any ancestor), or resize
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = e => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll',   close, true)
    window.addEventListener('resize',   close)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll',   close, true)
      window.removeEventListener('resize',   close)
    }
  }, [open])

  return (
    <>
      <button ref={triggerRef} onClick={handleTrigger}
        className={open ? activeClassName : className}>
        <MoreVertical size={15} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          onClick={() => setOpen(false)}
          style={{
            position:   'fixed',
            top:        pos.top,
            right:      pos.right,
            zIndex:     9999,
            visibility: pos.visible ? 'visible' : 'hidden',
          }}
          className={menuClassName}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  )
}
