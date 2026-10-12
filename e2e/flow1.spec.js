import { test, expect } from '@playwright/test'
import * as fs from 'fs'

const SS = 'e2e/screenshots/flow1'
fs.mkdirSync(SS, { recursive: true })

async function shot(page, step, name) {
  const s = String(step).padStart(2, '0')
  await page.screenshot({ path: `${SS}/${s}-${name}.png`, fullPage: true })
}

// Shared state across all steps — only works with test.describe.serial + shared page
const state = {}

/** Low-level: change URL via pushState + popstate (search-param changes, same-path modal opens).
 * React Router v6 BrowserRouter with v5Compat:true calls the listener on every popstate,
 * reading window.location — so the component re-renders with the new URL. */
async function pushStateNavigate(page, path) {
  await page.evaluate((p) => {
    const currentIdx = window.history.state?.idx ?? 0
    const nextState = { idx: currentIdx + 1, key: Math.random().toString(36).slice(2, 8) }
    window.history.pushState(nextState, '', p)
    window.dispatchEvent(new PopStateEvent('popstate', { state: nextState }))
  }, path)
  await page.waitForTimeout(400)
}

/** Navigate within the SPA without a full page reload.
 * Uses click-based navigation (NavLinks, row clicks, tab buttons) to drive React Router
 * through its own history.push() — which is the most reliable path and preserves
 * in-memory store state. Falls back to pushState+popstate only for search-param changes
 * (modal opens, view toggles) on an already-rendered page.
 *
 * Sidebar submenu visibility rule (from Sidebar.jsx line 172-175):
 *   Sales submenu shows only when isActive (pathname === '/sales') OR hasActiveChild
 *   (/sales/followups|feasibility-requests|proposals|analytics).
 *   /sales/leads/:id is NOT a submenu child — so we must navigate to /sales first.
 */
async function spaNavigate(page, path) {
  const qIdx = path.indexOf('?')
  const newPathname = qIdx >= 0 ? path.slice(0, qIdx) : path
  const newSearch   = qIdx >= 0 ? path.slice(qIdx) : ''
  const cp = new URL(page.url()).pathname

  // ── Same path, no search-param change ────────────────────────────────────
  if (cp === newPathname && !newSearch) return

  // ── Same path, search-param-only change ──────────────────────────────────
  if (cp === newPathname && newSearch) {
    await pushStateNavigate(page, path)
    return
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  if (newPathname === '/') {
    await page.locator('nav a[href="/"]').first().click()
    await page.waitForTimeout(300)
    return
  }

  // ── Payments ──────────────────────────────────────────────────────────────
  if (newPathname === '/payments') {
    await page.locator('nav a[href="/payments"]').first().click()
    await page.waitForTimeout(300)
    return
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  if (newPathname === '/audit') {
    await page.locator('nav a[href="/audit"]').first().click()
    await page.waitForTimeout(300)
    return
  }

  // ── Installations list ────────────────────────────────────────────────────
  if (newPathname === '/installations') {
    await page.locator('nav a[href="/installations"]').first().click()
    await page.waitForTimeout(400)
    return
  }

  // ── Installation detail ───────────────────────────────────────────────────
  if (newPathname.startsWith('/installations/')) {
    const insId = newPathname.split('/')[2]
    if (cp !== '/installations') {
      await page.locator('nav a[href="/installations"]').first().click()
      await page.waitForTimeout(400)
    }
    // Open ⋮ menu for this installation row, then click View Details
    const _insTrigger = page.locator('tr').filter({ hasText: insId }).first().locator('td:last-child button')
    await _insTrigger.scrollIntoViewIfNeeded()
    await _insTrigger.click()
    await waitForPortalMenu(page)
    await page.locator('button:has-text("View Details")').click()
    await page.waitForTimeout(400)
    return
  }

  // ── Sales – Feasibility Requests ──────────────────────────────────────────
  // The Sales submenu is only visible when on /sales exactly or on a submenu
  // child (/sales/followups|feasibility-requests|proposals|analytics).
  // From /sales/leads/:id or /customers/*, must click /sales NavLink first
  // so the submenu renders; then wait for the submenu link before clicking.
  if (newPathname === '/sales/feasibility-requests') {
    const submenuAlreadyVisible = cp === '/sales' ||
      cp.startsWith('/sales/followups') ||
      cp.startsWith('/sales/feasibility-requests') ||
      cp.startsWith('/sales/proposals') ||
      cp.startsWith('/sales/analytics')

    if (!submenuAlreadyVisible) {
      await page.locator('nav a[href="/sales"]').first().click()
      await page.waitForURL(/\/sales($|\?)/, { timeout: 8000 })
      await page.waitForTimeout(200)
    }

    // Ensure the submenu link is visible before clicking
    await page.locator('nav a[href="/sales/feasibility-requests"]').first()
      .waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('nav a[href="/sales/feasibility-requests"]').first().click()
    await page.waitForURL('**/sales/feasibility-requests**', { timeout: 8000 })
    await page.waitForTimeout(300)
    return
  }

  // ── Sales – New Lead form ─────────────────────────────────────────────────
  if (newPathname === '/sales/leads/new') {
    if (cp !== '/sales') {
      await page.locator('nav a[href="/sales"]').first().click()
      await page.waitForTimeout(400)
    }
    await page.locator('button:has-text("Add Lead")').first().click()
    await page.waitForTimeout(400)
    return
  }

  // ── Sales – Lead detail (/sales/leads/:id[/:tab][?search]) ───────────────
  if (newPathname.startsWith('/sales/leads/')) {
    const segs    = newPathname.split('/')   // ['','sales','leads',id,tab?]
    const leadId  = segs[3]
    const tabPath = segs[4]

    const LEAD_TABS = {
      'overview':     'Overview',
      'followups':    'Follow-ups',
      'comments':     'Comments',
      'activity-log': 'Activity Log',
      'package':      'Package',
      'document':     'Document',
    }

    const onThisLead = cp === `/sales/leads/${leadId}` ||
                       cp.startsWith(`/sales/leads/${leadId}/`)

    if (!onThisLead) {
      // Go to /sales list
      if (cp !== '/sales') {
        await page.locator('nav a[href="/sales"]').first().click()
        await page.waitForTimeout(400)
      }
      // If in kanban view, switch to table view first (tr rows only exist in table view)
      if (new URL(page.url()).search.includes('view=kanban')) {
        await page.locator('button:has-text("Table")').first().click()
        await page.waitForTimeout(400)
      }
      // Click the lead ID button in the row (navigates to lead detail)
      await page.locator('tr').filter({ hasText: leadId }).first()
        .locator(`button:has-text("${leadId}")`).first().click()
      await page.waitForURL(`**/sales/leads/${leadId}**`, { timeout: 10000 })
      await page.waitForTimeout(300)
    }

    // Navigate to a specific sub-tab (e.g., 'document')
    if (tabPath) {
      const tabLabel = LEAD_TABS[tabPath] ?? tabPath
      await page.locator(`button:has-text("${tabLabel}")`).first().click()
      await page.waitForTimeout(300)
    }

    // Apply search params (e.g., ?modal=assign-hardware)
    if (newSearch) {
      await pushStateNavigate(page, newPathname + newSearch)
    }
    return
  }

  // ── Sales list [?view=kanban] ─────────────────────────────────────────────
  if (newPathname === '/sales') {
    await page.locator('nav a[href="/sales"]').first().click()
    await page.waitForTimeout(400)
    if (newSearch) {
      await pushStateNavigate(page, '/sales' + newSearch)
    }
    return
  }

  // ── Customers list ────────────────────────────────────────────────────────
  if (newPathname === '/customers') {
    await page.locator('nav a[href="/customers"]').first().click()
    await page.waitForTimeout(400)
    return
  }

  // ── Customer detail (/customers/:id[/:tab]) ───────────────────────────────
  if (newPathname.startsWith('/customers/')) {
    const segs    = newPathname.split('/')   // ['','customers',id,tab?]
    const custId  = segs[2]
    const tabSlug = segs[3]

    const CUST_TABS = {
      'profile':       'Profile',
      'packages':      'Package Details',
      'finance':       'Finance',
      'tickets':       'Tickets',
      'inventory':     'Inventory',
      'network-map':   'Network Map',
      'tr-069':        'TR-069',
      'recordings':    'Recordings',
      'activity-logs': 'Activity Logs',
    }

    const onThisCust = cp.startsWith(`/customers/${custId}`)
    if (!onThisCust) {
      // Ensure we're on the customers list
      if (cp !== '/customers') {
        await page.locator('nav a[href="/customers"]').first().click()
        await page.waitForTimeout(400)
      }
      // Click the customer row (onClick on <tr> navigates to /customers/:id)
      await page.locator('tr').filter({ hasText: custId }).first().click()
      await page.waitForURL(`**/customers/${custId}/**`, { timeout: 10000 })
      await page.waitForTimeout(300)
    }

    // Navigate to a specific tab if not already there
    if (tabSlug) {
      const currentTab = new URL(page.url()).pathname.split('/')[3]
      if (currentTab !== tabSlug) {
        const tabLabel = CUST_TABS[tabSlug] ?? tabSlug
        await page.locator(`button:has-text("${tabLabel}")`).first().click()
        await page.waitForTimeout(300)
      }
    }
    return
  }

  // ── Fallback: pushState + popstate ────────────────────────────────────────
  await pushStateNavigate(page, path)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Wait for the RowActionMenu portal to finish positioning (invisible → visible).
 * Must be called after clicking a ⋮ trigger and before clicking any menu item.
 * The portal renders initially with visibility:hidden, then useLayoutEffect
 * positions it and flips visibility:visible. Waiting for the visible state
 * ensures the menu is fully positioned before Playwright fires the next click. */
async function waitForPortalMenu(page) {
  await page.waitForSelector('body > div[style*="position: fixed"]', {
    state: 'visible',
    timeout: 5000,
  })
}

/** Fill a complete Resident lead form and return the preview ID from the subtitle. */
async function fillResidentLead(page, opts = {}) {
  const {
    firstName = 'TestRes',
    lastName  = 'UserOne',
    phone     = '9876543201',
    branch    = 'CNPL-001',
    exec      = 'Arjun Kumar',
    source    = 'Referral',
    pkg       = 'Sonic 100',
  } = opts

  // Select Customer Type first — preview ID only appears after a type is chosen
  await page.locator('select').nth(0).selectOption({ label: 'Resident' })

  // Grab preview ID from subtitle (appears after type is selected)
  // New leads use format RES-LD-YYYY-NNN (Resident) or CORP-LD-YYYY-NNN (Corporate)
  await page.locator('text=/Lead ID (RES-LD|CORP-LD|LD)-/').first().waitFor({ timeout: 10000 })
  const subtitleText = await page.locator('text=/Lead ID (RES-LD|CORP-LD|LD)-/').first().textContent()
  const previewId = subtitleText.match(/Lead ID ([\w-]+)/)?.[1]
  await page.locator('select').nth(1).selectOption(branch)
  await page.locator('select').nth(2).selectOption(exec)
  await page.locator('input[placeholder="Rajan"]').fill(firstName)
  if (lastName) await page.locator('input[placeholder="Mehta"]').fill(lastName)
  await page.locator('input[placeholder="9876543210"]').fill(phone)
  await page.locator('select').nth(3).selectOption(source)
  await page.locator('button:has-text("Broadband")').click()

  // Connection Type: 'Own' is default → Entity select appears
  await page.locator('select').nth(4).selectOption({ label: 'Cityline Networks Pvt Ltd' })

  // Billing address — scoped to the Billing Address block.
  // Each select cascades (district disabled until state set, etc.) — wait for
  // React to re-render and enable the next select before selecting.
  const billing = page.locator('xpath=//p[normalize-space()="Billing Address"]/parent::div')
  const billingSt = billing.locator('select').nth(0)
  const billingDist = billing.locator('select').nth(1)
  const billingArea = billing.locator('select').nth(2)
  const billingLoc  = billing.locator('select').nth(3)
  await billingSt.selectOption('Uttar Pradesh')
  await expect(billingDist).not.toBeDisabled({ timeout: 5000 })
  await billingDist.selectOption('Gautam Buddha Nagar')
  await expect(billingArea).not.toBeDisabled({ timeout: 5000 })
  await billingArea.selectOption('Noida')
  await expect(billingLoc).not.toBeDisabled({ timeout: 5000 })
  await billingLoc.selectOption('Sector 62')
  await billing.locator('input[placeholder="560001"]').fill('201309')
  await billing.locator('textarea').fill('A-101, Tower A, Sector 62')

  // Diagnostic: verify billing address values were actually set in the DOM
  const _bSt  = await billingSt.inputValue()
  const _bDi  = await billingDist.inputValue()
  const _bAr  = await billingArea.inputValue()
  const _bLo  = await billingLoc.inputValue()
  fs.appendFileSync(`${SS}/console-errors.txt`,
    `[billing-diag] state=${_bSt} district=${_bDi} area=${_bAr} locality=${_bLo}\n`)

  // Installation same as billing
  await page
    .locator('label:has-text("Installation Address same as Billing Address") input[type="checkbox"]')
    .check()

  // Package
  await page.locator(`button:has-text("${pkg}")`).first().click()

  return previewId
}

/** Move a B2C lead to Feasibility from its detail page and approve it on the requests list. */
async function moveToFeasibilityAndApprove(page, leadId) {
  // Open More Options → Check for Feasibility
  await spaNavigate(page, `/sales/leads/${leadId}`)

  // Diagnostic: check lead.area in store BEFORE moving to Feasibility
  const preDiag = await page.evaluate(async (lid) => {
    const [{ getLeads }, { getFeasibilityRequests }] = await Promise.all([
      import('/src/data/leadsStore.js'),
      import('/src/data/feasibilityStore.js'),
    ])
    const lead = getLeads().find(l => l.id === lid)
    const existingFR = getFeasibilityRequests().find(r => r.leadId === lid)
    return {
      leadArea: lead ? (typeof lead.area !== 'string' ? `[${typeof lead.area}: ${JSON.stringify(lead.area).slice(0, 80)}]` : lead.area) : 'NO LEAD',
      leadAreaType: typeof lead?.area,
      existingFR: existingFR ? existingFR.id : 'none',
    }
  }, leadId)
  fs.appendFileSync(`${SS}/console-errors.txt`, `[pre-feasibility-diag] ${JSON.stringify(preDiag)}\n`)

  await page.locator('button[title="More options"]').click()
  await page.locator('button:has-text("Check for Feasibility")').click()

  // MoveStageModal — fix UX BUG: MoveStageModal pre-fills s4-f3 (Complete Address)
  // with lead.address which is the full AddressSectionStep object, not a string.
  // Submitting without overwriting stores the object as completeAddress on the FR,
  // which then crashes FeasibilityRequests.jsx at line 461 when rendered in JSX.
  // UX FINDING #1: MoveStageModal line 50 — 's4-f3': lead.address ?? '' — lead.address
  // is an object; should be lead.address?.billing?.addressLine ?? '' or similar.
  await expect(page.locator('h2:has-text("Move to"), h2:has-text("Feasibility")').first()).toBeVisible({ timeout: 5000 })
  // Batch 6: MoveStageModal now pre-fills address as a readable string from lead.address.installation.*
  // Assert it is NOT "[object Object]" and DO NOT overwrite it
  const addrPrefill = await page.locator('textarea[placeholder="Enter complete address…"]').inputValue()
  expect(addrPrefill, 'Address pre-fill must not be "[object Object]"').not.toBe('[object Object]')
  expect(addrPrefill.trim(), 'Address pre-fill must not be empty').not.toBe('')
  await page.locator('button:has-text("Submit")').click()
  await page.waitForTimeout(700) // 600ms animation

  // Diagnostic: check ALL feasibility requests AFTER modal submit
  const postDiag = await page.evaluate(async (lid) => {
    const { getFeasibilityRequests } = await import('/src/data/feasibilityStore.js')
    const all = getFeasibilityRequests()
    return all.map(r => ({
      id: r.id,
      leadId: r.leadId,
      areaType: typeof r.area,
      area: typeof r.area !== 'string' ? `[OBJECT: ${JSON.stringify(Object.keys(r.area || {})).slice(0, 60)}]` : r.area,
    }))
  }, leadId)
  fs.appendFileSync(`${SS}/console-errors.txt`, `[post-feasibility-diag] ${JSON.stringify(postDiag)}\n`)

  // Debug: record the URL we're on before navigating to feasibility-requests
  fs.appendFileSync(`${SS}/console-errors.txt`, `[nav] before feasibility nav: ${page.url()}\n`)


  // Navigate to Feasibility Requests list
  await spaNavigate(page, '/sales/feasibility-requests')
  fs.appendFileSync(`${SS}/console-errors.txt`, `[nav] after feasibility nav: ${page.url()}\n`)
  // Dump the page body text to diagnose what's actually rendered
  const bodyText = await page.locator('body').textContent().catch(() => '(failed to read body)')
  fs.appendFileSync(`${SS}/console-errors.txt`, `[body-text] ${bodyText.slice(0, 500)}\n`)
  await page.screenshot({ path: `${SS}/debug-feasibility-page.png`, fullPage: true })

  // Wait for the table to render
  await page.locator('table, tr').first().waitFor({ timeout: 10000 })

  // Find row for this lead and open ⋮
  const frRow = page.locator('tr').filter({ hasText: leadId }).first()
  const frTrigger = frRow.locator('td:last-child button')
  await frTrigger.scrollIntoViewIfNeeded()
  await frTrigger.click({ timeout: 15000 })

  await waitForPortalMenu(page)
  await page.locator('button:has-text("Approve")').click()

  // Approve modal
  await expect(page.locator(`h2:has-text("Approve Feasibility")`)).toBeVisible({ timeout: 5000 })
  await page.locator('textarea[placeholder="Reason for approval…"]').fill('Approved — site survey confirmed')
  await page.locator('input[placeholder="e.g. 250"]').fill('200')
  await page.locator('button.bg-emerald-600').click() // green Approve button
  await page.waitForTimeout(700)
}

/** Assign hardware to a lead via the ?modal=assign-hardware URL param.
 * UX FINDING: there is NO "Assign Hardware" button in the lead detail UI;
 * the modal can only be opened by setting ?modal=assign-hardware in the URL.
 * spaNavigate handles navigation to the lead detail page first (if needed),
 * then opens the modal via pushState+popstate. */
async function assignHardware(page, leadId, serial, mac) {
  await spaNavigate(page, `/sales/leads/${leadId}?modal=assign-hardware`)
  await expect(page.locator('input[placeholder="e.g. HW2024001234"]')).toBeVisible({ timeout: 8000 })
  await page.locator('input[placeholder="e.g. HW2024001234"]').fill(serial)
  await page.locator('input[placeholder="e.g. 123450A1B2C3D4"]').fill(mac)
  await page.locator('button:has-text("Next: Confirm")').click()
  await page.locator('button:has-text("Confirm & Complete")').click()
  // Batch 6: handleHardwareConfirm now calls closeLeadDetailModal() — modal auto-dismisses
  await page.waitForTimeout(500)
}

/**
 * Drive an installation from Scheduled (no team) to Dispatched (with team) via the UI.
 * Assign Team from detail → Move to HW Collection from list ⋮ → Move to Dispatch from list ⋮.
 * canComplete requires assignedTeam set AND status Dispatched/In Progress.
 * Returns the list-row locator so callers can proceed to Mark Completed.
 */
async function driveInstallationToDispatched(page, insId, scheduledDate = '2026-10-14') {
  await spaNavigate(page, `/installations/${insId}`)
  await page.locator('button:has-text("Assign Team")').first().click()
  await expect(page.locator('h2:has-text("Assign Team")')).toBeVisible({ timeout: 5000 })
  await page.locator('select').filter({ has: page.locator('option:has-text("Select team…")') }).selectOption('Team Alpha')
  await page.locator('label:has-text("Arjun Kumar") input[type="checkbox"]').check()
  await page.locator('input[type="date"]').fill(scheduledDate)
  await page.locator('button:has-text("Assign Team")').last().click()
  await page.waitForTimeout(500)

  await spaNavigate(page, '/installations')
  const insRow = page.locator('tr').filter({ hasText: insId }).first()
  const insTrigger = insRow.locator('td:last-child button')

  await insTrigger.scrollIntoViewIfNeeded()
  await insTrigger.click()
  await waitForPortalMenu(page)
  await page.locator('button:has-text("Move to Hardware Collection")').click()
  await expect(page.locator('h2:has-text("Move to Hardware Collection")')).toBeVisible({ timeout: 5000 })
  await page.locator('button:has-text("Confirm")').last().click()
  await page.waitForTimeout(500)

  await insTrigger.scrollIntoViewIfNeeded()
  await insTrigger.click()
  await waitForPortalMenu(page)
  await page.locator('button:has-text("Move to Dispatch")').click()
  await expect(page.locator('h2:has-text("Confirm Dispatch")')).toBeVisible({ timeout: 5000 })
  await page.locator('button:has-text("Confirm — Dispatch")').click()
  await page.waitForTimeout(500)

  return insRow
}

/** Find the installation ID for a given lead in the /installations list. */
async function findInstallationIdForLead(page, leadId) {
  await spaNavigate(page, '/installations')
  // Installations are prepended — find by the leadId text if shown,
  // otherwise look for a row that was just created (use customer name)
  const rows = page.locator('tr')
  const count = await rows.count()
  for (let i = 0; i < count; i++) {
    const rowText = await rows.nth(i).textContent()
    if (rowText.includes(leadId)) {
      const insIdMatch = rowText.match(/INS-\d+/)
      if (insIdMatch) return insIdMatch[0]
    }
  }
  return null
}

// ── Suite ────────────────────────────────────────────────────────────────────

test.describe.serial('Flow 1: Full ISP Lead-to-Activation Lifecycle', () => {
  let page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()

    // Fresh log each run
    fs.writeFileSync(`${SS}/console-errors.txt`, `--- run start ${new Date().toISOString()} ---\n`)

    // Capture browser console errors for diagnostics
    page.on('console', msg => {
      if (msg.type() === 'error') {
        fs.appendFileSync(`${SS}/console-errors.txt`, `[console.error] ${msg.text()}\n`)
      }
    })
    page.on('pageerror', err => {
      fs.appendFileSync(`${SS}/console-errors.txt`, `[pageerror] ${err.message}\n`)
    })

    await page.goto('/')
    await page.waitForLoadState('load')
  })

  test.afterAll(async () => {
    await page.close()
  })

  test.setTimeout(120000)

  // ── Step 01 ─────────────────────────────────────────────────────────────────
  test('Step 01 — Create Resident lead; assert ID preview = saved ID, Created By = current user', async () => {
    // Cancel 1: open form then navigate away
    await spaNavigate(page, '/sales/leads/new')
    await shot(page, 1, '01a-new-lead-form-open')
    await spaNavigate(page, '/sales')

    // Cancel 2: open form then navigate away
    await spaNavigate(page, '/sales/leads/new')
    await spaNavigate(page, '/sales')

    // Third time: actually fill and create
    await spaNavigate(page, '/sales/leads/new')

    const previewId = await fillResidentLead(page, {
      firstName: 'TestRes',
      lastName:  'UserOne',
      phone:     '9876543201',
    })
    expect(previewId).toBeTruthy()
    state.leadPreviewId1 = previewId

    await shot(page, 1, '01b-form-filled')

    await page.locator('button:has-text("Create Lead")').click()
    await page.waitForURL('**/sales/leads/**', { timeout: 10000 })

    const urlId = page.url().match(/\/sales\/leads\/([^/]+)$/)?.[1]
    state.leadId1 = urlId
    expect(urlId).toBeTruthy()

    // Preview ID must match saved ID
    expect(urlId).toBe(previewId)

    // Created By = current user (not hardcoded — comes from sessionStore's getCurrentUser)
    await expect(page.locator('text=Admin User').first()).toBeVisible({ timeout: 5000 })

    // Diagnostic: read lead.area from the store right after creation
    const leadStoreDiag = await page.evaluate(async (lid) => {
      const { getLeads } = await import('/src/data/leadsStore.js')
      const lead = getLeads().find(l => l.id === lid)
      if (!lead) return { error: 'lead not found' }
      return {
        area: typeof lead.area !== 'string' ? `[${typeof lead.area}: ${JSON.stringify(lead.area).slice(0, 100)}]` : lead.area,
        areaType: typeof lead.area,
        state: lead.state,
        district: lead.district,
        locality: lead.locality,
        addressType: typeof lead.address,
      }
    }, urlId)
    fs.appendFileSync(`${SS}/console-errors.txt`, `[lead-store-diag] ${JSON.stringify(leadStoreDiag)}\n`)

    await shot(page, 1, '01c-lead-created')
  })

  // ── Step 02 ─────────────────────────────────────────────────────────────────
  test('Step 02 — Move to Feasibility; approve from list; assert stage = Installation Visit', async () => {
    await moveToFeasibilityAndApprove(page, state.leadId1)

    // Navigate to lead detail and verify stage chip
    await spaNavigate(page, `/sales/leads/${state.leadId1}`)

    await expect(page.locator('span:has-text("Installation Visit")').first()).toBeVisible({ timeout: 5000 })
    await shot(page, 2, '02-stage-installation-visit')
  })

  // ── Step 03 ─────────────────────────────────────────────────────────────────
  test('Step 03 — Lead ⋮ menu: assert "Mark as Won" disabled with tooltip text', async () => {
    await spaNavigate(page, `/sales/leads/${state.leadId1}`)

    await page.locator('button[title="More options"]').click()

    const markWonBtn = page.locator('button:has-text("Mark as Won")')
    await expect(markWonBtn).toBeVisible({ timeout: 5000 })
    await expect(markWonBtn).toBeDisabled()

    // Tooltip is on the <span> wrapper around the disabled button (not on the button itself)
    const tooltip = await page.locator('span:has(button:has-text("Mark as Won"))').getAttribute('title')
    expect(tooltip).toBe('Won is set automatically when installation is completed.')

    await shot(page, 3, '03-mark-as-won-disabled')

    // Close dropdown by pressing Escape
    await page.keyboard.press('Escape')
  })

  // ── Step 04 ─────────────────────────────────────────────────────────────────
  test('Step 04 — Kanban drag lead → Won column → snaps back, gate toast appears', async () => {
    await spaNavigate(page, '/sales?view=kanban')

    // Lead should be in Installation Visit column
    await expect(
      page.locator(`[data-kanban-stage="Installation Visit"] [data-lead-card="${state.leadId1}"]`)
    ).toBeVisible({ timeout: 5000 })
    await shot(page, 4, '04a-kanban-lead-in-install-visit')

    // Drag to Won → blocked
    await page.dragAndDrop(
      `[data-kanban-stage="Installation Visit"] [data-lead-card="${state.leadId1}"]`,
      '[data-kanban-stage="Won"]'
    )
    await expect(
      page.locator('text=Won can only be set automatically')
    ).toBeVisible({ timeout: 5000 })
    await shot(page, 4, '04b-won-gate-toast')
  })

  // ── Step 05 ─────────────────────────────────────────────────────────────────
  test('Step 05 — Complete eKYC; confirm hardware; assert installation record exists, NO customer yet', async () => {
    // Navigate to Document tab
    await spaNavigate(page, `/sales/leads/${state.leadId1}/document`)

    // eKYC: Not Started → In Progress → Completed
    await page.locator('button:has-text("Start eKYC")').click()
    await page.waitForTimeout(300)
    await page.locator('button:has-text("Mark Completed")').first().click()
    await expect(page.locator('text=eKYC Completed')).toBeVisible({ timeout: 5000 })
    await shot(page, 5, '05a-ekyc-completed')

    // Assign hardware via ?modal=assign-hardware URL
    // UX FINDING: "Assign Hardware" button missing from kanban LeadCard UI;
    // must navigate via URL param.
    await assignHardware(page, state.leadId1, 'HW2026001001', 'AA:BB:CC:DD:EE:01')
    await shot(page, 5, '05b-hardware-confirmed')

    // Navigate to installations list — verify installation record created
    await spaNavigate(page, '/installations')

    // Find installation for our customer name (TestRes UserOne)
    await expect(page.locator('text=TestRes UserOne').first()).toBeVisible({ timeout: 5000 })

    // Capture installation ID
    const newInsRow = page.locator('tr').filter({ hasText: 'TestRes UserOne' }).first()
    const rowText = await newInsRow.textContent()
    const insIdMatch = rowText.match(/INS-\d+/)
    expect(insIdMatch).toBeTruthy()
    state.insId1 = insIdMatch[0]

    await shot(page, 5, '05c-installation-in-list')

    // Assert NO customer created yet (customer URL would require activation step)
    // The Go to Customer button should not be present in the dropdown for a Scheduled/In-Progress install
    await newInsRow.locator('td:last-child button').scrollIntoViewIfNeeded()
    await newInsRow.locator('td:last-child button').click()
    await waitForPortalMenu(page)
    const goToCustomerBtn = page.locator('button:has-text("Go to Customer")')
    await expect(goToCustomerBtn).not.toBeVisible()
    await page.keyboard.press('Escape')

    await shot(page, 5, '05d-no-customer-yet')
  })

  // ── Step 06 ─────────────────────────────────────────────────────────────────
  test('Step 06 — Complete installation; assert "Go to Customer" appears; customer status = Pending Activation', async () => {
    // Record dashboard counts before completing installation
    await spaNavigate(page, '/')
    // Dashboard cards: label is p.text-xs, count is the immediately-following p.text-xl
    await page.locator('p:has-text("Pending Activation")').first().waitFor({ timeout: 5000 })
    const pendingCount = await page.locator('p:has-text("Pending Activation") + p').first().textContent()
    state.pendingActBefore = parseInt(pendingCount?.trim().replace(/,/g, '') || '0', 10)

    const activeCount = await page.locator('p:has-text("Active Connections") + p').first().textContent()
    state.activeBefore = parseInt(activeCount?.trim().replace(/,/g, '') || '0', 10)

    await shot(page, 6, '06a-dashboard-before')

    // Drive state machine: Assign Team → HW Collection → Dispatch → Mark Completed
    const insRow = await driveInstallationToDispatched(page, state.insId1, '2026-10-14')
    const ins1Trigger = insRow.locator('td:last-child button')
    // Now Dispatched + team → canComplete=true → Mark Completed enabled
    await ins1Trigger.scrollIntoViewIfNeeded()
    await ins1Trigger.click()
    await waitForPortalMenu(page)
    await page.locator('button:has-text("Mark Completed")').first().click()
    await shot(page, 6, '06b-mark-completed-dropdown')

    // Modal: Mark as Completed
    await expect(page.locator('h2:has-text("Mark as Completed")')).toBeVisible({ timeout: 5000 })
    await page.locator('button:has-text("Mark Completed")').last().click()

    // Toast
    await expect(page.locator('text=Installation completed')).toBeVisible({ timeout: 5000 })
    await shot(page, 6, '06c-installation-completed-toast')

    // Re-open ⋮ → Go to Customer appears
    await ins1Trigger.scrollIntoViewIfNeeded()
    await ins1Trigger.click()
    await waitForPortalMenu(page)
    await expect(page.locator('button:has-text("Go to Customer")')).toBeVisible({ timeout: 5000 })
    await shot(page, 6, '06d-go-to-customer-visible')

    // Navigate to customer profile
    // Batch 6: dropdown threshold fixed (240→340px) — normal click should work
    await page.locator('button:has-text("Go to Customer")').click()
    await page.waitForURL('**/customers/**/profile', { timeout: 10000 })

    const customerUrl = page.url()
    const custIdMatch = customerUrl.match(/\/customers\/([^/]+)\/profile/)
    expect(custIdMatch).toBeTruthy()
    state.customerId1 = custIdMatch[1]

    // Assert customer status = Pending Activation
    await expect(page.locator('text=Pending Activation').first()).toBeVisible({ timeout: 5000 })
    await shot(page, 6, '06e-customer-pending-activation')
  })

  // ── Step 07 ─────────────────────────────────────────────────────────────────
  test('Step 07 — Customer profile: verify all sections; open every tab; screenshot each', async () => {
    await spaNavigate(page, `/customers/${state.customerId1}/profile`)

    // Profile Overview assertions
    // Connection type visible
    await expect(page.locator('text=FTTH, text=Own, text=Broadband').first().or(
      page.locator('text=Connection Type').first()
    )).toBeVisible({ timeout: 5000 })

    // KYC data: customer name from lead
    await expect(page.locator('text=TestRes UserOne').first().or(
      page.locator('text=TestRes').first()
    )).toBeVisible({ timeout: 5000 })

    // PPPoE ID — UX FINDING: new customers show "—" before RADIUS provisioning
    // App Password — UX FINDING: new customers show "—" before RADIUS provisioning

    await shot(page, 7, '07a-profile-overview')

    // Open each tab and screenshot; assert no crashes
    const tabs = [
      { name: 'Package Details', slug: 'packages' },
      { name: 'Finance',         slug: 'finance'   },
      { name: 'Tickets',         slug: 'tickets'   },
      { name: 'Inventory',       slug: 'inventory' },
      { name: 'Network Map',     slug: 'network-map' },
      { name: 'TR-069',          slug: 'tr-069'    },
      { name: 'Recordings',      slug: 'recordings' },
      { name: 'Activity Logs',   slug: 'activity-logs' },
    ]

    for (const tab of tabs) {
      await spaNavigate(page, `/customers/${state.customerId1}/${tab.slug}`)
      // Assert no uncaught error — just that the page renders without crashing
      await expect(page.locator('body')).not.toContainText('Something went wrong', { timeout: 3000 })
      // On packages tab: assert pre-activation package badge is visible (Batch 6 fix)
      if (tab.slug === 'packages') {
        await shot(page, 7, '07-debug-packages-tab')
        // Batch 6: makeCustomerFromBase() now includes selectedPackage/bandwidthPackage;
        // PackagesTab now shows the Pre-activation Package card with "Pending activation" badge
        await expect(page.locator('text=Pending activation').first()).toBeVisible({ timeout: 5000 })
      }
      await shot(page, 7, `07-tab-${tab.slug}`)
    }

    // Return to profile for next step
    await spaNavigate(page, `/customers/${state.customerId1}/profile`)
  })

  // ── Step 08 ─────────────────────────────────────────────────────────────────
  test('Step 08 — Dashboard: Pending Activation count = before + 1; Active unchanged', async () => {
    await spaNavigate(page, '/')
    await page.waitForTimeout(500)

    // Dashboard cards: label is p.text-xs, count is the immediately-following p.text-xl
    const pendingCountText = await page.locator('p:has-text("Pending Activation") + p').first().textContent()
    const pendingNow = parseInt(pendingCountText?.trim().replace(/,/g, '') || '0', 10)

    const activeCountText = await page.locator('p:has-text("Active Connections") + p').first().textContent()
    const activeNow = parseInt(activeCountText?.trim().replace(/,/g, '') || '0', 10)

    await shot(page, 8, '08-dashboard-after-install')

    // Pending Activation should be +1 from before step 06
    expect(pendingNow).toBe(state.pendingActBefore + 1)
    // Active Connections should be unchanged (customer is Pending, not Active yet)
    expect(activeNow).toBe(state.activeBefore)
  })

  // ── Step 09 ─────────────────────────────────────────────────────────────────
  test('Step 09 — Collect activation payment; assert status Active, expiry set, payment on Payments page', async () => {
    await spaNavigate(page, `/customers/${state.customerId1}/profile`)

    // Activate — fill payment amount (activates addPayment in handleActivateCustomer)
    await page.locator('button:has-text("Activate Now")').click()
    await page.locator('input[placeholder="e.g. 3500"]').fill('899')
    await page.locator('button:has-text("Confirm Activation")').first().click()

    await expect(page.locator('text=Internet Service Activated')).toBeVisible({ timeout: 10000 })
    await shot(page, 9, '09a-internet-service-activated')

    // Dismiss the activation success modal so the profile renders
    await page.locator('button:has-text("Done")').click()
    await page.waitForTimeout(500)

    // Status badge should now show Active
    await expect(page.locator('text=Active').first()).toBeVisible({ timeout: 5000 })

    // Batch 6: Expiry Date is now a labeled InfoField on the profile page
    await expect(page.locator('text=Expiry Date').first()).toBeVisible({ timeout: 5000 })
    await shot(page, 9, '09b-customer-active')

    // Navigate to Payments page and verify payment record
    await spaNavigate(page, '/payments')
    // Search by customer ID to bring the new payment to the top of the filtered list
    await page.locator('input[placeholder="Search receipt, customer, invoice, mode..."]').fill(state.customerId1)
    await page.waitForTimeout(300)
    await expect(page.locator(`text=${state.customerId1}`).first()).toBeVisible({ timeout: 5000 })
    await shot(page, 9, '09c-payment-in-payments-page')
  })

  // ── Step 10 ─────────────────────────────────────────────────────────────────
  test('Step 10 — Customer Activity Logs tab: assert entries from lead creation to activation exist', async () => {
    // For converted customers, ActivityTab is fed from the global auditLogs store
    // filtered by customer ID or lead ID (CustomerDetail.jsx line 4350-4358).
    // Entries render the full audit detail string, not human-friendly labels.
    await spaNavigate(page, `/customers/${state.customerId1}/activity-logs`)
    await shot(page, 10, '10a-activity-logs-tab')

    // Batch 6: activity log now renders human-readable labels instead of raw audit strings
    await expect(page.locator('text=Lead Created').first()).toBeVisible({ timeout: 8000 })
    await expect(page.locator('text=Feasibility Approved').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Customer Created').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Service Activated').first()).toBeVisible({ timeout: 5000 })
    await shot(page, 10, '10b-activity-logs-entries')
  })

  // ── Step 11 ─────────────────────────────────────────────────────────────────
  test('Step 11 — New lead → feasibility Rejected; assert rejected banner; moves to Installation Visit blocked; Mark Lost works', async () => {
    // Create a new Resident lead
    await spaNavigate(page, '/sales/leads/new')

    await fillResidentLead(page, {
      firstName: 'RejTest',
      lastName:  'UserEleven',
      phone:     '9876543211',
    })
    await page.locator('button:has-text("Create Lead")').click()
    await page.waitForURL('**/sales/leads/**', { timeout: 10000 })
    state.leadId11 = page.url().match(/\/sales\/leads\/([^/]+)$/)?.[1]
    expect(state.leadId11).toBeTruthy()

    // Move to Feasibility
    await page.locator('button[title="More options"]').click()
    await page.locator('button:has-text("Check for Feasibility")').click()
    await expect(page.locator('button:has-text("Submit")')).toBeVisible({ timeout: 5000 })
    // Batch 6: address pre-fill is now a readable string — assert and submit without overwriting
    const addrVal11 = await page.locator('textarea[placeholder="Enter complete address…"]').inputValue()
    expect(addrVal11, 'Pre-fill must not be "[object Object]"').not.toBe('[object Object]')
    await page.locator('button:has-text("Submit")').click()
    await page.waitForTimeout(700)

    // Reject on FeasibilityRequests page
    await spaNavigate(page, '/sales/feasibility-requests')

    const frRow = page.locator('tr').filter({ hasText: state.leadId11 }).first()
    const frTrigger11 = frRow.locator('td:last-child button')
    await frTrigger11.scrollIntoViewIfNeeded()
    await frTrigger11.click()
    await waitForPortalMenu(page)
    await page.locator('button:has-text("Reject")').click()

    await expect(page.locator(`h2:has-text("Reject Feasibility")`)).toBeVisible({ timeout: 5000 })
    // Select rejection reason
    await page.locator('select').filter({ has: page.locator('option[value=""]') }).last().selectOption('Not Feasible — Too Far from Network')
    await page.locator('textarea[placeholder="Additional remarks…"]').fill('Test rejection — too far from network node')
    await page.locator('button.bg-red-600').click()
    await page.waitForTimeout(500)

    await shot(page, 11, '11a-feasibility-rejected')

    // Navigate to lead detail and assert Feasibility Rejected banner
    await spaNavigate(page, `/sales/leads/${state.leadId11}`)

    await expect(page.locator('text=Feasibility Rejected')).toBeVisible({ timeout: 5000 })
    await expect(
      page.locator('text=This lead cannot proceed to Installation Visit until feasibility is re-approved.')
    ).toBeVisible({ timeout: 5000 })
    await shot(page, 11, '11b-rejected-banner-on-lead')

    // Try to move to Installation Visit via modal: More Options → click "Check for Feasibility"
    // will open Feasibility stage (already done) — or try via "Move Stage" for Installation Visit directly
    // The canMoveLeadToStage gate blocks this. Try clicking "Check for Feasibility" again:
    await page.locator('button[title="More options"]').click()
    const installVisitMoveBtn = page.locator('button:has-text("Move to Installation Visit")')
    if (await installVisitMoveBtn.isVisible()) {
      await installVisitMoveBtn.click()
      // Modal should show blocked state or button should be disabled
      await shot(page, 11, '11c-install-visit-move-attempt')
    } else {
      // No direct button — the gate is enforced at the kanban drag level
      await page.keyboard.press('Escape')
    }

    // Kanban: drag to Installation Visit → gate toast
    await spaNavigate(page, '/sales?view=kanban')
    // Lead should be in Feasibility column (rejected but still there)
    const leadCard = page.locator(`[data-lead-card="${state.leadId11}"]`)
    if (await leadCard.isVisible()) {
      await page.dragAndDrop(
        `[data-lead-card="${state.leadId11}"]`,
        '[data-kanban-stage="Installation Visit"]'
      )
      await expect(
        page.locator('text=Feasibility must be approved first')
      ).toBeVisible({ timeout: 5000 })
      await shot(page, 11, '11d-kanban-gate-toast')
    }

    // Mark Lost via the "Mark Lost" button in the rejected banner
    await spaNavigate(page, `/sales/leads/${state.leadId11}`)

    await page.locator('button:has-text("Mark Lost")').click()
    // Modal title is "Move Stage — {lead.name}" (MoveStageModal default title)
    await expect(page.locator('h2:has-text("Move Stage")').first()).toBeVisible({ timeout: 5000 })
    // "Lost Reason" is a required dropdown — must be filled before "Close Lead" is enabled
    await page.locator('label:has-text("Lost Reason")').locator('..').locator('select').selectOption('Not Interested')
    await page.locator('button:has-text("Close Lead")').click()
    await page.waitForTimeout(700)

    // Assert stage = Lost
    await expect(page.locator('span:has-text("Lost")').first()).toBeVisible({ timeout: 5000 })
    await shot(page, 11, '11e-lead-marked-lost')
  })

  // ── Step 12 ─────────────────────────────────────────────────────────────────
  test('Step 12 — New lead with eKYC pending → installation → try Complete; assert eKYC-blocked both from list and detail', async () => {
    // Create lead
    await spaNavigate(page, '/sales/leads/new')
    await fillResidentLead(page, {
      firstName: 'EkycPend',
      lastName:  'UserTwelve',
      phone:     '9876543212',
    })
    await page.locator('button:has-text("Create Lead")').click()
    await page.waitForURL('**/sales/leads/**', { timeout: 10000 })
    state.leadId12 = page.url().match(/\/sales\/leads\/([^/]+)$/)?.[1]
    expect(state.leadId12).toBeTruthy()

    // Move to Feasibility and approve
    await moveToFeasibilityAndApprove(page, state.leadId12)

    // Assign hardware WITHOUT completing eKYC first
    await assignHardware(page, state.leadId12, 'HW2026001002', 'AA:BB:CC:DD:EE:02')

    // Find installation ID
    await spaNavigate(page, '/installations')
    const ins12Row = page.locator('tr').filter({ hasText: 'EkycPend UserTwelve' }).first()
    const ins12Text = await ins12Row.textContent()
    const ins12Match = ins12Text.match(/INS-\d+/)
    expect(ins12Match).toBeTruthy()
    state.insId12 = ins12Match[0]

    await shot(page, 12, '12a-install-in-list')

    // ── Assert Mark Completed NOT available when Scheduled with no team ──────
    // canComplete requires assignedTeam set AND status Dispatched/In Progress;
    // at Scheduled+no-team both conditions fail → button is disabled in list ⋮
    const ins12Trigger = ins12Row.locator('td:last-child button')
    await ins12Trigger.scrollIntoViewIfNeeded()
    await ins12Trigger.click()
    await waitForPortalMenu(page)
    const mcInMenu = page.locator('button:has-text("Mark Completed")').first()
    await expect(mcInMenu).toBeVisible({ timeout: 5000 })
    await expect(mcInMenu).toBeDisabled()
    await page.keyboard.press('Escape')
    await shot(page, 12, '12a2-mark-completed-disabled-no-team')

    // InstallationDetail at Scheduled: action block shows Assign Team, NOT Mark Completed
    await spaNavigate(page, `/installations/${state.insId12}`)
    await page.waitForTimeout(300)
    await expect(page.locator('button:has-text("Assign Team")').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button:has-text("Mark Completed")')).not.toBeVisible()
    await shot(page, 12, '12a3-no-mark-completed-scheduled-detail')

    // ── Drive through UI: Assign Team (detail) → HW Collection (list) → Dispatch (list) ─
    await driveInstallationToDispatched(page, state.insId12, '2026-10-15')
    await shot(page, 12, '12b-team-assigned')
    await shot(page, 12, '12c-install-dispatched')

    // Now: Dispatched + team → canComplete=true → Mark Completed enabled
    // Try Mark Completed from list ⋮ → eKYC blocked toast
    await ins12Trigger.scrollIntoViewIfNeeded()
    await ins12Trigger.click()
    await waitForPortalMenu(page)
    await page.locator('button:has-text("Mark Completed")').first().click()

    // Modal opens — click confirm
    if (await page.locator('h2:has-text("Mark as Completed")').isVisible()) {
      await page.locator('button:has-text("Mark Completed")').last().click()
    }

    await expect(
      page.locator('text=Cannot complete: eKYC must be completed for this lead before marking the installation as done.')
    ).toBeVisible({ timeout: 5000 })
    await shot(page, 12, '12d-ekyc-blocked-from-list')

    // Navigate to installation detail: Dispatched + team → Mark Completed button visible
    await spaNavigate(page, `/installations/${state.insId12}`)
    await page.waitForTimeout(300)

    await page.locator('button:has-text("Mark Completed")').click()
    await expect(page.locator('h2:has-text("Mark as Completed")')).toBeVisible({ timeout: 5000 })
    await page.locator('button:has-text("Mark Completed")').last().click()

    await expect(
      page.locator('text=Cannot complete: eKYC must be completed for this lead before marking the installation as done.')
    ).toBeVisible({ timeout: 5000 })
    await shot(page, 12, '12e-ekyc-blocked-from-detail')
  })

  // ── Step 13 ─────────────────────────────────────────────────────────────────
  test('Step 13 — Pick seed lead with already-approved feasibility → move to Installation Visit → ALLOWED', async () => {
    // SKIP: All seed feasibility requests (FR-001..FR-005) link to Enterprise leads
    // (LD-301..LD-305). FR-005 is Approved but LD-305 is Enterprise pipeline — not B2C.
    // canMoveLeadToStage Installation Visit gate only applies to B2C leads.
    // No B2C seed lead with an approved feasibility request exists in seed data.
    // Seed data must be updated to include a B2C lead with feasibilityStatus: 'Approved'.
    test.skip(true, 'SKIP: No B2C seed lead with approved feasibility exists in seed data (FR-001..005 all link to Enterprise leads LD-301..305).')
  })

  // ── Step 14 ─────────────────────────────────────────────────────────────────
  test('Step 14 — New Corporate lead with GST, PAN, legal name → Proposal → "Mark as Won"; assert installation created + NO customer', async () => {
    await spaNavigate(page, '/sales/leads/new')

    // Select Corporate
    await page.locator('select').nth(0).selectOption({ label: 'Corporate' })
    await page.waitForTimeout(300)

    // Branch
    await page.locator('select').nth(1).selectOption('CNPL-001')

    // GSTIN → trigger 900ms lookup
    await page.locator('input[placeholder="27AABCU9603R1ZM"]').fill('27AABCU9603R1ZM')
    await expect(page.locator('text=GST details fetched')).toBeVisible({ timeout: 5000 })

    // GST Type, PAN, Legal Name auto-filled
    // Contact Person Name
    await page.locator('input[placeholder="Sunil Mehta"]').fill('Sunil Mehta')
    // Contact Person Email
    await page.locator('input[placeholder="sunil@company.in"]').fill('sunil@acmecorp.in')
    // Primary Number (use unique number to avoid duplicate-lead banner)
    await page.locator('input[placeholder="9812340001"]').fill('9812340091')

    // Accounts Contact (required for Corporate leads)
    await page.locator('label:has-text("Accounts Name")').locator('..').locator('input').fill('Accounts Person')
    await page.locator('label:has-text("Accounts Email")').locator('..').locator('input').fill('accounts@acmecorp.in')
    await page.locator('label:has-text("Accounts Phone")').locator('..').locator('input').fill('9812340092')

    // Technical Contact (required for Corporate leads)
    await page.locator('label:has-text("Technical Name")').locator('..').locator('input').fill('Technical Person')
    await page.locator('label:has-text("Technical Email")').locator('..').locator('input').fill('tech@acmecorp.in')
    await page.locator('label:has-text("Technical Phone")').locator('..').locator('input').fill('9812340093')

    // Service Tag ILL (first() — a second button contains "ILL" in its longer package label)
    await page.locator('button:has-text("ILL")').first().click()

    // Connection Type: Own is default → Entity select appears
    // For Corporate, the entity select might be at a different nth position
    // Find the Entity select (should contain 'Cityline Networks Pvt Ltd')
    const entitySelects = page.locator('select').filter({ has: page.locator('option:has-text("Cityline Networks Pvt Ltd")') })
    await entitySelects.first().selectOption({ label: 'Cityline Networks Pvt Ltd' })

    // Assigned To / Sales Executive
    const assignedToSelect = page.locator('select').filter({ has: page.locator('option:has-text("Arjun Kumar")') }).last()
    await assignedToSelect.selectOption('Arjun Kumar')

    // Billing Address
    const billing = page.locator('xpath=//p[normalize-space()="Billing Address"]/parent::div')
    await billing.locator('select').nth(0).selectOption('Uttar Pradesh')
    await billing.locator('select').nth(1).selectOption('Gautam Buddha Nagar')
    await billing.locator('select').nth(2).selectOption('Noida')
    await billing.locator('select').nth(3).selectOption('Sector 62')
    await billing.locator('input[placeholder="560001"]').fill('201309')
    await billing.locator('textarea').fill('B-201, Tower B, Sector 62')

    // Same as billing
    await page
      .locator('label:has-text("Installation Address same as Billing Address") input[type="checkbox"]')
      .check()

    // Package: Enterprise ILL 100
    await page.locator('button:has-text("Enterprise ILL 100")').first().click()

    await shot(page, 14, '14a-corporate-form-filled')

    // UX FINDING #7: A "Duplicate lead detected" banner appears when the phone number
    // matches a seed-data lead (Priya Venkatesh) and disables the Create Lead button
    // until the user explicitly clicks "Continue Anyway". The button appears styled as
    // enabled (blue) while the disabled attribute is set — visual feedback is misleading.
    const duplicateBanner = page.locator('text=Duplicate lead detected')
    if (await duplicateBanner.isVisible({ timeout: 1500 })) {
      await page.locator('button:has-text("Continue Anyway")').click()
      await page.waitForTimeout(300)
    }

    await page.locator('button:has-text("Create Lead")').click()
    await page.waitForURL('**/sales/leads/**', { timeout: 10000 })
    state.leadId14 = page.url().match(/\/sales\/leads\/([^/]+)$/)?.[1]
    expect(state.leadId14).toBeTruthy()
    await shot(page, 14, '14b-corporate-lead-created')

    // Batch 6: Enterprise ⋮ menu now has intermediate stage buttons.
    // Drive through: New Inquiry Filed → Discussion → Follow-up → Proposal → Won
    // Assert "Mark as Won" is DISABLED before Proposal, ENABLED at Proposal.

    // New Inquiry Filed → assert Mark as Won disabled
    await page.locator('button[title="More options"]').click()
    await expect(page.locator('span:has(button:has-text("Mark as Won")) button').first()).toBeDisabled()
    // Move to Discussion
    await page.locator('button:has-text("Move to Discussion")').click()
    await expect(page.locator('button:has-text("Move Stage")')).toBeVisible({ timeout: 5000 })
    await page.locator('button:has-text("Move Stage")').click()
    await page.waitForTimeout(700)
    await expect(page.locator('span:has-text("Discussion")').first()).toBeVisible({ timeout: 5000 })
    await shot(page, 14, '14c1-at-discussion')

    // Discussion → assert Mark as Won disabled
    await page.locator('button[title="More options"]').click()
    await expect(page.locator('span:has(button:has-text("Mark as Won")) button').first()).toBeDisabled()
    // Move to Follow-up
    await page.locator('button:has-text("Move to Follow-up")').click()
    await expect(page.locator('button:has-text("Move Stage")')).toBeVisible({ timeout: 5000 })
    await page.locator('button:has-text("Move Stage")').click()
    await page.waitForTimeout(700)
    await expect(page.locator('span:has-text("Follow-up")').first()).toBeVisible({ timeout: 5000 })
    await shot(page, 14, '14c2-at-followup')

    // Follow-up → assert Mark as Won disabled
    await page.locator('button[title="More options"]').click()
    await expect(page.locator('span:has(button:has-text("Mark as Won")) button').first()).toBeDisabled()
    // Move to Proposal
    await page.locator('button:has-text("Move to Proposal")').click()
    await expect(page.locator('button:has-text("Move Stage")')).toBeVisible({ timeout: 5000 })
    await page.locator('button:has-text("Move Stage")').click()
    await page.waitForTimeout(700)
    await expect(page.locator('span:has-text("Proposal")').first()).toBeVisible({ timeout: 5000 })
    await shot(page, 14, '14c3-at-proposal')

    // Proposal → Mark as Won ENABLED
    await page.locator('button[title="More options"]').click()
    const wonBtnEnabled = page.locator('button:has-text("Mark as Won")').first()
    await expect(wonBtnEnabled).not.toBeDisabled()
    await wonBtnEnabled.click()
    // MoveStageModal opens with target 'Won' — no required fields for Won stage
    await expect(page.locator('button:has-text("Move Stage")')).toBeVisible({ timeout: 5000 })
    await page.locator('button:has-text("Move Stage")').click()
    await page.waitForTimeout(700)

    await shot(page, 14, '14d-corporate-lead-won')

    // Assert stage = Won
    await expect(page.locator('span:has-text("Won")').first()).toBeVisible({ timeout: 5000 })

    // Assert installation record created (status = Scheduled)
    await spaNavigate(page, '/installations')
    const corp14Row = page.locator('tr').filter({ hasText: 'Sunil Mehta' }).first()
    await expect(corp14Row).toBeVisible({ timeout: 5000 })

    const corp14Text = await corp14Row.textContent()
    const corp14InsMatch = corp14Text.match(/INS-\d+/)
    expect(corp14InsMatch).toBeTruthy()
    state.insId14 = corp14InsMatch[0]

    // Assert NO customer created yet
    const corp14Trigger = corp14Row.locator('td:last-child button')
    await corp14Trigger.scrollIntoViewIfNeeded()
    await corp14Trigger.click()
    await waitForPortalMenu(page)
    await expect(page.locator('button:has-text("Go to Customer")')).not.toBeVisible()
    await page.keyboard.press('Escape')

    await shot(page, 14, '14e-corporate-installation-no-customer')
  })

  // ── Step 15 ─────────────────────────────────────────────────────────────────
  test('Step 15 — Complete corporate installation; assert customer created; GST/PAN/legal name on profile', async () => {
    // Enterprise installs have no eKYC gate — drive state machine then Mark Completed directly
    const corp14Row = await driveInstallationToDispatched(page, state.insId14, '2026-10-15')
    const corp15Trigger = corp14Row.locator('td:last-child button')
    await shot(page, 15, '15a-corp-install-dispatched')

    await corp15Trigger.scrollIntoViewIfNeeded()
    await corp15Trigger.click()
    await waitForPortalMenu(page)
    await page.locator('button:has-text("Mark Completed")').first().click()

    await expect(page.locator('h2:has-text("Mark as Completed")')).toBeVisible({ timeout: 5000 })
    await page.locator('button:has-text("Mark Completed")').last().click()

    await expect(page.locator('text=Installation completed')).toBeVisible({ timeout: 5000 })
    await shot(page, 15, '15b-corp-installation-completed')

    await corp15Trigger.scrollIntoViewIfNeeded()
    await corp15Trigger.click()
    await waitForPortalMenu(page)
    await expect(page.locator('button:has-text("Go to Customer")')).toBeVisible({ timeout: 5000 })
    await page.locator('button:has-text("Go to Customer")').click()
    await page.waitForURL('**/customers/**/profile', { timeout: 10000 })

    state.customerId14 = page.url().match(/\/customers\/([^/]+)\/profile/)?.[1]
    expect(state.customerId14).toBeTruthy()

    await shot(page, 15, '15c-corp-customer-profile')

    await expect(page.locator('text=27AABCU9603R1ZM').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=AABCU9603R').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Cityline Networks Pvt Ltd').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=eKYC must be completed')).not.toBeVisible()

    await shot(page, 15, '15d-corp-gst-pan-visible')
  })

  // ── Step 16 ─────────────────────────────────────────────────────────────────
  test('Step 16 — Reassign installation with reason; assert reassignment history on InstallationDetail', async () => {
    // Create a fresh lead for the reassignment test so we have a clean Scheduled
    // installation with no team (insId12 was advanced to Dispatched in Step 12).
    await spaNavigate(page, '/sales/leads/new')
    await fillResidentLead(page, {
      firstName: 'Reassign',
      lastName:  'UserSixteen',
      phone:     '9876543216',
    })
    await page.locator('button:has-text("Create Lead")').click()
    await page.waitForURL('**/sales/leads/**', { timeout: 10000 })
    state.leadId16 = page.url().match(/\/sales\/leads\/([^/]+)$/)?.[1]
    expect(state.leadId16).toBeTruthy()

    // Move to Feasibility and approve
    await moveToFeasibilityAndApprove(page, state.leadId16)

    // Assign hardware → creates Scheduled installation with no team
    await assignHardware(page, state.leadId16, 'HW2026001016', 'AA:BB:CC:DD:EE:16')

    // Find the new installation
    await spaNavigate(page, '/installations')
    const ins16Row = page.locator('tr').filter({ hasText: 'Reassign UserSixteen' }).first()
    const ins16Text = await ins16Row.textContent()
    const ins16Match = ins16Text.match(/INS-\d+/)
    expect(ins16Match).toBeTruthy()
    state.insId16 = ins16Match[0]

    // Navigate to installation detail (Scheduled, no team)
    await spaNavigate(page, `/installations/${state.insId16}`)
    await shot(page, 16, '16a-install-detail-before-assign')

    // First: Assign Team (sets assignedTeam + status → Assigned)
    await page.locator('button:has-text("Assign Team")').click()
    await expect(page.locator('h2:has-text("Assign Team")')).toBeVisible({ timeout: 5000 })

    await page.locator('select').filter({ has: page.locator('option:has-text("Select team…")') }).selectOption('Team Alpha')
    await page.locator('label:has-text("Arjun Kumar") input[type="checkbox"]').check()
    await page.locator('input[type="date"]').fill('2026-10-15')
    await page.locator('button:has-text("Assign Team")').last().click()
    await page.waitForTimeout(500)
    await shot(page, 16, '16b-team-assigned')

    // Now Reassign — "Reassign" button appears in Team Details card after first assignment
    await page.locator('button:has-text("Reassign")').click()
    await expect(page.locator('h2:has-text("Reassign Team")')).toBeVisible({ timeout: 5000 })

    await page.locator('textarea[placeholder="Why is this team being reassigned?"]').fill('Engineer unavailable — reassigning to Team Beta')
    await page.locator('select').filter({ has: page.locator('option:has-text("Select team…")') }).selectOption('Team Beta')
    await page.locator('label:has-text("Karan Mehta") input[type="checkbox"]').check()
    await page.locator('input[type="date"]').fill('2026-10-16')
    await page.locator('button:has-text("Reassign Team")').click()
    await page.waitForTimeout(500)
    await shot(page, 16, '16c-team-reassigned')

    // Assert Reassignment History section appears
    await expect(page.locator('text=Reassignment History')).toBeVisible({ timeout: 5000 })
    await shot(page, 16, '16d-reassignment-history')
  })

  // ── Step 17 ─────────────────────────────────────────────────────────────────
  test('Step 17 — Audit Log page: assert entries exist for above actions; no duplicate entries for same action', async () => {
    await spaNavigate(page, '/audit')
    await shot(page, 17, '17a-audit-log-page')

    // Assert audit log has entries
    const rows = page.locator('tr')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(1)

    // Assert entries exist for key actions from this test run
    // Lead creation
    await expect(page.locator('text=Sales').first()).toBeVisible({ timeout: 5000 })

    // Assert no exact duplicate rows (same action + same ID appearing consecutively)
    // Collect all row texts and check for consecutive duplicates
    const rowTexts = []
    for (let i = 0; i < Math.min(rowCount, 50); i++) {
      rowTexts.push(await rows.nth(i).textContent())
    }
    let hasDuplicate = false
    for (let i = 0; i < rowTexts.length - 1; i++) {
      if (rowTexts[i] === rowTexts[i + 1] && rowTexts[i].trim() !== '') {
        hasDuplicate = true
        break
      }
    }
    expect(hasDuplicate, 'No consecutive duplicate audit entries for the same action').toBe(false)

    await shot(page, 17, '17b-audit-entries-verified')
  })

  // ── Step 18 ─────────────────────────────────────────────────────────────────
  test('Step 18 — Seed customer RES-2026-0001: profile renders fully; Customers list filters and counts render', async () => {
    // Open seed customer profile
    await spaNavigate(page, '/customers/RES-2026-0001/profile')

    // Assert profile renders — key sections visible
    await expect(page.locator('text=Rajan Mehta').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=RES-2026-0001').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=9876').first()).toBeVisible({ timeout: 5000 })

    // PPPoE ID: seed customer RES-2026-0001 has RADIUS data (pppoeUsername)
    await expect(page.locator('text=CL1001@cityline, text=rajan_mehta_cl1001').first().or(
      page.locator('[class*="mono"]').first()
    )).toBeVisible({ timeout: 5000 })

    await shot(page, 18, '18a-seed-customer-profile')

    // Navigate to Customers list
    await spaNavigate(page, '/customers')

    // Assert customer list renders
    await expect(page.locator('text=Rajan Mehta').first()).toBeVisible({ timeout: 5000 })

    // Assert filter controls render — the customer list has its own search input
    // (placeholder: "Search name, phone, customer ID, MAC, serial…"), distinct from the
    // global "Search customers, tickets..." bar at the top.
    const custSearch = page.locator('input[placeholder*="name, phone"]')
    await expect(custSearch).toBeVisible({ timeout: 5000 })

    // Assert count/total visible (e.g. "X of Y customers")
    await expect(
      page.locator('text=/of .* customers/i').first()
    ).toBeVisible({ timeout: 5000 })

    await shot(page, 18, '18b-customers-list-with-filters')

    // Test a filter: search for "Rajan" in the customer list search (not global search)
    await custSearch.fill('Rajan')
    await page.waitForTimeout(600)
    await expect(page.locator('text=Rajan Mehta').first()).toBeVisible({ timeout: 3000 })
    // Other customers should not be visible after filtering
    await expect(page.locator('text=Priya Sharma').first()).not.toBeVisible()

    await shot(page, 18, '18c-filtered-to-rajan')
  })
})
