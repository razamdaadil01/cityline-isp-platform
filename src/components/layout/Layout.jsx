import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

// Ticket Detail gets more room by auto-collapsing the sidebar while it's open;
// the user's manual collapsed/expanded preference (`collapsed`) is left untouched
// so leaving the page restores exactly what it was before. Matches any
// /support/tickets/:ticketId/:tab sub-route (Overview, Communication, Notes,
// Activity Log, Documents, and any future tab) rather than an enumerated list of
// tab slugs, so adding a new tab can't silently fall outside this pattern again.
// Does NOT match /support/tickets (list) or /support/tickets/new (create), which
// have no second path segment.
const AUTO_COLLAPSE_PATTERN = /^\/support\/tickets\/[^/]+\/[^/]+/

// Lead Detail's 3-column layout (left info sidebar, main content, right
// Installation/eKYC sidebar) also wants the extra width, but with a softer
// touch than Ticket Detail's hard force above: it only sets `collapsed` to
// true once on entry (a default, not a lock), so the user's own hamburger
// toggle keeps working normally for the rest of the visit — see the effect
// below. Matches the bare /sales/leads/:id detail route and any of its tab
// sub-routes (/overview, /comments, /stage-history, etc.) — but not
// /sales/leads/new (Create Lead) or /sales/leads/:id/edit (Edit Lead), which
// are different pages that happen to share the same route prefix.
const LEAD_DETAIL_PATTERN = /^\/sales\/leads\/(?!new(?:\/|$))[^/]+(?:\/(?!edit$)[^/]+)?$/

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  // Tracks whether the *previous* location was a Lead Detail route, and what
  // `collapsed` was right before auto-collapsing on entry — so leaving the
  // page can restore exactly that, the same restore-on-exit contract Ticket
  // Detail gets from its own (always-on) force above.
  const wasOnLeadDetail = useRef(false)
  const collapsedBeforeLeadDetail = useRef(false)

  useEffect(() => {
    const onLeadDetail = LEAD_DETAIL_PATTERN.test(location.pathname)
    if (onLeadDetail && !wasOnLeadDetail.current) {
      collapsedBeforeLeadDetail.current = collapsed
      setCollapsed(true)
    } else if (!onLeadDetail && wasOnLeadDetail.current) {
      setCollapsed(collapsedBeforeLeadDetail.current)
    }
    wasOnLeadDetail.current = onLeadDetail
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const forceCollapsed = AUTO_COLLAPSE_PATTERN.test(location.pathname)
  const effectiveCollapsed = forceCollapsed || collapsed

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar collapsed={effectiveCollapsed} />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${effectiveCollapsed ? 'ml-16' : 'ml-60'}`}>
        <Header onToggleSidebar={() => setCollapsed(c => !c)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
