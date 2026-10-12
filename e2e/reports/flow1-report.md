# Flow 1 E2E Test Report

**Test:** `e2e/flow1.spec.js` — Full ISP Lead-to-Activation Lifecycle  
**Run date:** 2026-10-12  
**Browser:** Chromium (headless)  
**Result:** ✅ 17 passed, 1 skipped, 0 failed  
**Duration:** ~1 m 12 s

---

## Step Results

| # | Step Description | Result | Detail |
|---|-----------------|--------|--------|
| 01 | Create Resident lead; assert ID preview = saved ID, Created By = current user | ✅ PASS | |
| 02 | Move to Feasibility; approve from list; assert stage = Installation Visit | ✅ PASS | |
| 03 | Lead ⋮ menu: assert "Mark as Won" disabled with tooltip text | ✅ PASS | |
| 04 | Kanban drag lead → Won column → snaps back, gate toast appears | ✅ PASS | |
| 05 | Complete eKYC; confirm hardware; assert installation record exists, NO customer yet | ✅ PASS | |
| 06 | Complete installation (state machine via `driveInstallationToDispatched` helper); assert "Go to Customer" appears; customer status = Pending Activation | ✅ PASS | |
| 07 | Customer profile: verify all sections; open every tab; screenshot each; hard assert "Pending activation" badge on packages tab | ✅ PASS | |
| 08 | Dashboard: Pending Activation count = before + 1; Active unchanged | ✅ PASS | |
| 09 | Collect activation payment; assert status Active; assert "Expiry Date" label visible; payment on Payments page | ✅ PASS | |
| 10 | Customer Activity Logs tab: assert "Lead Created", "Feasibility Approved", "Customer Created", "Service Activated" | ✅ PASS | |
| 11 | New lead → feasibility Rejected; assert rejected banner; moves to Installation Visit blocked; Mark Lost works | ✅ PASS | |
| 12 | New lead with eKYC pending → assert Mark Completed disabled at Scheduled+no-team; drive state machine via `driveInstallationToDispatched`; assert eKYC-blocked from list and detail | ✅ PASS | |
| 13 | Pick seed lead with already-approved feasibility → move to Installation Visit → ALLOWED | ⏭ SKIP | No B2C seed lead with approved feasibility exists in seed data (FR-001..FR-005 all link to Enterprise leads LD-301..LD-305). Test explicitly skipped with `test.skip`. |
| 14 | New Corporate lead with GST, PAN, legal name → Discussion → Follow-up → Proposal → "Mark as Won" (disabled before Proposal, enabled at Proposal); assert installation created + NO customer | ✅ PASS | |
| 15 | Complete corporate installation (state machine via `driveInstallationToDispatched` helper); assert customer created; GST/PAN/legal name on profile | ✅ PASS | |
| 16 | Reassign installation with reason; assert reassignment history on InstallationDetail | ✅ PASS | |
| 17 | Audit Log page: assert entries exist for above actions; no duplicate entries for same action | ✅ PASS | |
| 18 | Seed customer RES-2026-0001: profile renders fully; Customers list filters and counts render | ✅ PASS | |

---

## Findings

### Finding #1 — [RESOLVED] Scroll-race: RowActionMenu portal closed by post-click scroll events

**Classification:** Test infrastructure fix — not an app bug  
**Location:** `e2e/flow1.spec.js` — all 13 `td:last-child button` click sites; `waitForPortalMenu`

**Root cause:** `RowActionMenu` registers `window.addEventListener('scroll', close, true)` (capture phase) after `setOpen(true)`. When Playwright's `trigger.click()` needed to scroll a trigger into view, Chromium fired two post-click scroll events ~9 ms after the click. These events hit the capture listener while `open=true`, immediately closing the portal before `waitForPortalMenu` could detect it.

**Fix applied (this run):**
1. `waitForPortalMenu` now uses `waitForSelector('body > div[style*="position: fixed"]', { state: 'visible', timeout: 5000 })` instead of `waitForTimeout`. This waits until the portal div's `visibility` transitions from `hidden` to `visible` (set by `useLayoutEffect` after positioning).
2. `await trigger.scrollIntoViewIfNeeded()` added before every `await trigger.click()` at all 13 trigger sites. The pre-scroll fires while `open=false` (no listener registered); the subsequent click fires with the element already in-viewport, so Playwright generates no further scroll events and the portal stays open.

**App behaviour note (not fixed per task constraints):** The capture-phase scroll listener is intentional for closing the menu on user scroll, but it also fires on programmatic scroll events from Playwright. This interaction is a test-environment artifact only.

---

### Finding #2 — [RESOLVED] `td:last-child button` trigger selector

**Classification:** Test robustness improvement  
**Location:** `e2e/flow1.spec.js` — all ⋮ trigger locators

All RowActionMenu triggers are now located with `tr.locator('td:last-child button')` rather than `tr.locator('button').last()`. The actions column is always the last `<td>` in each row, making this selector unambiguous regardless of how many buttons appear elsewhere in the row.

---

### Finding #3 — [RESOLVED] `driveInstallationToDispatched` helper; Step 15 test gap

**Classification:** Test deficiency (not an app bug) — fixed in prior run  
**Location:** `e2e/flow1.spec.js` Steps 06, 12, 15

A shared `driveInstallationToDispatched(page, insId, scheduledDate)` helper performs: Assign Team from InstallationDetail → Move to HW Collection from list ⋮ → Move to Dispatch from list ⋮. It is called in Steps 06, 12, and 15 in place of previously duplicated inline state machine blocks. Enterprise installations (Step 15) have no eKYC gate.

---

### Finding #4 — [SKIP JUSTIFIED] No B2C seed lead with approved feasibility (Step 13)

Seed feasibility requests FR-001..FR-005 all link to Enterprise leads (LD-301..LD-305). Step 13 requires a B2C (Resident/SMB) lead at a stage before Installation Visit with its feasibility request already in `Approved` status. No such seed record exists.  
**Recommendation:** Add one seed B2C lead (e.g., LD-050) at stage "Feasibility" with a linked FR record in `Approved` status.
