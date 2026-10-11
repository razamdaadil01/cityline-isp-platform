# Flow 1 E2E Test Report

**Test:** `e2e/flow1.spec.js` — Full ISP Lead-to-Activation Lifecycle  
**Run date:** 2026-10-11  
**Browser:** Chromium (headless)  
**Result:** ✅ 17 passed, 1 skipped, 0 failed  
**Duration:** ~1 m 18 s

---

## Step Results

| # | Step Description | Result | Detail |
|---|-----------------|--------|--------|
| 01 | Create Resident lead; assert ID preview = saved ID, Created By = current user | ✅ PASS | |
| 02 | Move to Feasibility; approve from list; assert stage = Installation Visit | ✅ PASS | |
| 03 | Lead ⋮ menu: assert "Mark as Won" disabled with tooltip text | ✅ PASS | |
| 04 | Kanban drag lead → Won column → snaps back, gate toast appears | ✅ PASS | |
| 05 | Complete eKYC; confirm hardware; assert installation record exists, NO customer yet | ✅ PASS | |
| 06 | Complete installation (state machine via `driveInstallationToDispatched` helper); assert "Go to Customer" appears; customer status = Pending Activation | ✅ PASS | Refactored to use shared helper |
| 07 | Customer profile: verify all sections; open every tab; screenshot each; hard assert "Pending activation" badge on packages tab | ✅ PASS | |
| 08 | Dashboard: Pending Activation count = before + 1; Active unchanged | ✅ PASS | |
| 09 | Collect activation payment; assert status Active; assert "Expiry Date" label visible; payment on Payments page | ✅ PASS | |
| 10 | Customer Activity Logs tab: assert "Lead Created", "Feasibility Approved", "Customer Created", "Service Activated" | ✅ PASS | |
| 11 | New lead → feasibility Rejected; assert rejected banner; moves to Installation Visit blocked; Mark Lost works | ✅ PASS | |
| 12 | New lead with eKYC pending → assert Mark Completed disabled at Scheduled+no-team; drive state machine via `driveInstallationToDispatched`; assert eKYC-blocked from list and detail | ✅ PASS | Refactored to use shared helper |
| 13 | Pick seed lead with already-approved feasibility → move to Installation Visit → ALLOWED | ⏭ SKIP | No B2C seed lead with approved feasibility exists in seed data (FR-001..FR-005 all link to Enterprise leads LD-301..LD-305). Test explicitly skipped with `test.skip`. |
| 14 | New Corporate lead with GST, PAN, legal name → Discussion → Follow-up → Proposal → "Mark as Won" (disabled before Proposal, enabled at Proposal); assert installation created + NO customer | ✅ PASS | |
| 15 | Complete corporate installation (state machine via `driveInstallationToDispatched` helper); assert customer created; GST/PAN/legal name on profile | ✅ PASS | Fixed test gap from previous run — state machine now drives insId14 to Dispatched before Mark Completed |
| 16 | Reassign installation with reason; assert reassignment history on InstallationDetail | ✅ PASS | |
| 17 | Audit Log page: assert entries exist for above actions; no duplicate entries for same action | ✅ PASS | |
| 18 | Seed customer RES-2026-0001: profile renders fully; Customers list filters and counts render | ✅ PASS | |

---

## Findings

### Finding #1 — [RESOLVED] Step 15 test gap: corporate install not driven through state machine

**Classification:** Test deficiency (not an app bug) — now fixed  
**Location:** `e2e/flow1.spec.js` Step 15

**Root cause:** Step 15 previously tried to click "Mark Completed" directly on a `Scheduled` corporate installation with no assigned team. The `canComplete` guard (`!!assignedTeam && ['Dispatched','In Progress'].includes(status)`) = false → button was disabled → test timed out after 120 s.

**Fix applied (this run):** Extracted a shared `driveInstallationToDispatched(page, insId, scheduledDate)` helper that performs: Assign Team from InstallationDetail → Move to HW Collection from list ⋮ → Move to Dispatch from list ⋮. The helper is now called in Steps 06, 12, and 15 in place of the previously duplicated inline state machine blocks. Enterprise installations have no eKYC gate, so Step 15 completes without any eKYC-blocked assertion.

---

### Finding #2 — [SKIP JUSTIFIED] No B2C seed lead with approved feasibility (Step 13)

Seed feasibility requests FR-001..FR-005 all link to Enterprise leads (LD-301..LD-305). Step 13 requires a B2C (Resident/SMB) lead at a stage before Installation Visit with its feasibility request already in `Approved` status. No such seed record exists.  
**Recommendation:** Add one seed B2C lead (e.g., LD-050) at stage "Feasibility" with a linked FR record in `Approved` status.

---

## Refactoring Summary

A `driveInstallationToDispatched(page, insId, scheduledDate)` helper was extracted and applied to Steps 06, 12, and 15, replacing ~24 lines of duplicated state machine code in each step.

| Step | Change |
|------|--------|
| 06 | Inline 28-line state machine replaced with `driveInstallationToDispatched` call |
| 12 | Inline 24-line state machine replaced with `driveInstallationToDispatched` call |
| 15 | Broken direct-click replaced with `driveInstallationToDispatched` + Mark Completed |
