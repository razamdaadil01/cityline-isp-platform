# Flow 1 E2E Test Report

**Test:** `e2e/flow1.spec.js` — Full ISP Lead-to-Activation Lifecycle  
**Run date:** 2026-10-11  
**Browser:** Chromium (headless)  
**Result:** ❌ 1 FAILED — 5 passed, 1 failed, 12 did not run (serial cascade)  
**Duration:** ~24 s (stopped early at Step 06 failure)

---

## Step Results

| # | Step Description | Result | Detail |
|---|-----------------|--------|--------|
| 01 | Create Resident lead; assert ID preview = saved ID, Created By = current user | ✅ PASS | |
| 02 | Move to Feasibility; approve from list; assert stage = Installation Visit | ✅ PASS | |
| 03 | Lead ⋮ menu: assert "Mark as Won" disabled with tooltip text | ✅ PASS | |
| 04 | Kanban drag lead → Won column → snaps back, gate toast appears | ✅ PASS | |
| 05 | Complete eKYC; confirm hardware; assert installation record exists, NO customer yet | ✅ PASS | |
| 06 | Complete installation; assert "Go to Customer" appears; customer status = Pending Activation | ❌ FAIL | **App bug:** `ProfileTab` crashes with `ReferenceError: customer is not defined` at `CustomerDetail.jsx:1069`. Lines 1069–1070 reference `customer.activationDate` / `customer.expiry` but in `ProfileTab`'s scope the prop is destructured as `customer: initCustomer` (local state = `cust`). The variable `customer` does not exist in that scope. React unmounts the entire CustomerDetail tree; no status badge renders. `state.customerId1` was captured from the URL before the assertion failed. State machine progression (Assign Team → HW Collection → Dispatch → Mark Completed) and "Go to Customer" all worked correctly. |
| 07 | Customer profile: verify all sections; open every tab; screenshot each | ⏭ DID NOT RUN | Blocked by Step 06 failure — `test.describe.serial` skips all subsequent tests when one fails |
| 08 | Dashboard: Pending Activation count = before + 1; Active unchanged | ⏭ DID NOT RUN | Blocked by Step 06 failure |
| 09 | Collect activation payment; assert status Active, expiry set, payment on Payments page | ⏭ DID NOT RUN | Blocked by Step 06 failure |
| 10 | Customer Activity Logs tab: assert entries from lead creation to activation exist | ⏭ DID NOT RUN | Blocked by Step 06 failure |
| 11 | New lead → feasibility Rejected; assert rejected banner; moves to Installation Visit blocked; Mark Lost works | ⏭ DID NOT RUN | Blocked by Step 06 failure |
| 12 | New lead with eKYC pending → installation → try Complete; assert eKYC-blocked both from list and detail | ⏭ DID NOT RUN | Blocked by Step 06 failure |
| 13 | Pick seed lead with already-approved feasibility → move to Installation Visit → ALLOWED | ⏭ SKIP (explicit) | No B2C seed lead with approved feasibility exists. All seed feasibility requests (FR-001..FR-005) link to Enterprise leads (LD-301..LD-305). Seed data needs a B2C lead with `feasibilityStatus: 'Approved'` at a stage before Installation Visit. |
| 14 | New Corporate lead with GST, PAN, legal name → Proposal → "Mark as Won"; assert installation created + NO customer | ⏭ DID NOT RUN | Blocked by Step 06 failure |
| 15 | Complete corporate installation; assert customer created; GST/PAN/legal name on profile | ⏭ DID NOT RUN | Blocked by Step 06 failure |
| 16 | Reassign installation with reason; assert reassignment history on InstallationDetail | ⏭ DID NOT RUN | Blocked by Step 06 failure |
| 17 | Audit Log page: assert entries exist for above actions; no duplicate entries for same action | ⏭ DID NOT RUN | Blocked by Step 06 failure |
| 18 | Seed customer RES-2026-0001: profile renders fully; Customers list filters and counts render | ⏭ DID NOT RUN | Blocked by Step 06 failure |

---

## Findings

### Finding #1 — [REGRESSION — Batch 6] ProfileTab crashes with `customer is not defined`

**Severity:** Critical — blocks all customer profile views  
**Location:** `src/pages/CustomerDetail.jsx` lines 1069–1070 (inside `ProfileTab`)  
**Introduced by:** Batch 6 changes that added "Activation Date" and "Expiry Date" fields to the Sales & Account Info section of `ProfileTab`

**Root cause:**
```jsx
// ProfileTab destructures its prop as:
function ProfileTab({ customer: initCustomer, ... }) {
  const [cust, setCust] = useState(initCustomer)
  // ...
  // Lines 1069-1070 — BUG: uses `customer` (not in scope), should be `cust`
  <InfoField label="Activation Date" value={customer.activationDate ?? '—'} />
  <InfoField label="Expiry Date"     value={customer.expiry ?? '—'} />
```

**Fix (one-line — DO NOT APPLY per current task scope):**  
Replace `customer.activationDate` and `customer.expiry` at lines 1069–1070 with `cust.activationDate` and `cust.expiry`.

**Impact:**
- Navigating to any `/customers/:id/profile` URL crashes the entire CustomerDetail page (no error boundary wraps `ProfileTab`)
- Step 06 hard assertion for "Pending Activation" status badge fails
- Step 09 (Activate customer), Step 10 (Activity Logs), Step 15 (corporate customer profile) and Step 18 (seed customer profile) would all fail for the same reason — none ran in this test due to serial cascade

---

### Finding #2 — [SKIP JUSTIFIED] No B2C seed lead with approved feasibility

**Severity:** Low — test data gap  
**Location:** `src/data/installationsStore.js`, `src/data/feasibilityRequestsStore.js`  
**Detail:** Seed feasibility requests FR-001..FR-005 all link to Enterprise leads (LD-301..LD-305). No Resident/B2C seed lead exists at an intermediate stage (e.g., Follow-up or Feasibility) with a linked feasibility request in `Approved` status. Step 13 requires exactly this to test that `canMoveLeadToStage('Installation Visit')` returns `true` when the feasibility is already approved.  
**Recommendation:** Add one seed B2C lead (e.g., LD-050) at stage "Feasibility" with a linked FR in `Approved` status to enable Step 13.

---

### Prior Batch 6 Fixes (VERIFIED RESOLVED in previous run 2026-10-11 03:58)

The following findings from the pre-Batch-6 report were resolved and confirmed passing in the 03:58 run:

| # | Finding | Status |
|---|---------|--------|
| F1 | Address pre-fill showed `[object Object]` in Feasibility modal | ✅ Fixed — now pre-fills as readable address string (tested in Steps 02, 11) |
| F2 | Feasibility Requests ⋮ menu clips outside viewport | ✅ Fixed — normal `.click()` works; `dispatchEvent` workaround removed |
| F3 | Hardware confirm modal not auto-dismissed after "Confirm & Complete" | ✅ Fixed — `handleHardwareConfirm()` now calls `closeLeadDetailModal()` |
| F4 | `makeCustomerFromBase()` missing `selectedPackage`/`bandwidthPackage` | ✅ Fixed — packages now included; packages tab shows "Pending activation" badge |
| F5 | Expiry Date not rendered on customer profile | ✅ Fixed — added as `InfoField` in Sales & Account Info section (Batch 6 lines 1069–1070) — *but this same change introduced Finding #1 above* |
| F6 | Activity log shows raw audit strings, not human labels | ✅ Fixed — human-readable labels confirmed in Step 10 |
| F7 | Duplicate lead banner disables submit with misleading visual | Unchanged UX — test handles with "Continue Anyway" check |
| F8 | Enterprise lead has no intermediate stage navigation (Discussion/Follow-up/Proposal) | ✅ Fixed — `⋮` menu now shows "Move to Discussion", "Move to Follow-up", "Move to Proposal" buttons |

---

## Test Coverage Changes (this batch)

The following assertions were upgraded from soft to hard (per task requirements):

| Step | Before | After |
|------|--------|-------|
| 07 | `expect.soft()` for "Pending activation" package badge | Hard `expect()` — would PASS but DID NOT RUN due to Step 06 cascade |
| 09 | No assertion for Expiry Date | Hard `expect()` for visible "Expiry Date" label — DID NOT RUN |
| 10 | Raw audit string substrings | Human labels: "Lead Created", "Feasibility Approved", "Customer Created", "Service Activated" — DID NOT RUN |

The following workarounds were removed:

| Step | Removed workaround | Replacement |
|------|-------------------|-------------|
| 02/11 | `dispatchEvent('click')` on Approve button | Normal `.click()` (Batch 6 fixed viewport clipping) |
| 06/15 | `dispatchEvent('click')` on "Go to Customer" | Normal `.click()` (Batch 6 fixed dropdown threshold) |
| 12/16 | `page.evaluate` direct store manipulation | Full UI-driven state machine (Assign Team → HW Collection → Dispatch) |

---

## Notes

- **`test.describe.serial` cascade:** When Step 06 fails, Playwright marks all 12 subsequent tests as "did not run". To get results for Steps 07–18 in isolation, Step 06's app bug (`customer is not defined`) must be fixed first.
- **Screenshots:** `e2e/screenshots/flow1/` — current run captured screenshots `06a`–`06d` (Steps 01–06 up to the crash point). Screenshots for Steps 07–18 in that directory are from the prior 03:58 run.
- **HTML report:** `e2e/reports/playwright-html/index.html`
- **Step 06 state:** Despite the failure, `state.customerId1` was captured from the URL before the assertion failed. If Step 06's app bug is fixed, subsequent steps should use the correct customer ID without any test changes.
