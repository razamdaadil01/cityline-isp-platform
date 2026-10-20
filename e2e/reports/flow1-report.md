# Flow 1 — Lead-to-Activation Lifecycle: Test Report

**Run date:** 2026-10-12  
**Suite:** `e2e/flow1.spec.js` — 18 steps, serial, shared page  
**Result:** ✅ 17 / 18 PASSED, 1 SKIP (Step 13) (1m 12s)

---

## Step Results

| Step | Result | Detail |
|------|--------|--------|
| 01 — Create Resident lead; assert ID preview = saved ID | PASS | Lead created; ID preview matches saved ID; Created By = current user |
| 02 — Move to Feasibility; approve; assert stage = Installation Visit | PASS | Feasibility approved from list; lead stage transitions correctly |
| 03 — Lead ⋮ menu: "Mark as Won" disabled with tooltip | PASS | Button disabled before Installation Visit; tooltip text asserted |
| 04 — Kanban drag → Won column → snaps back; gate toast | PASS | Drag rejected; toast gate message shown; lead returns to original column |
| 05 — eKYC, hardware confirm; installation record; no customer yet | PASS | Installation record created; customer not yet created (Pending Activation gate holds) |
| 06 — Complete installation; "Go to Customer"; customer = Pending Activation | PASS | `driveInstallationToDispatched` helper: Assign Team → HW Collection → Dispatch; "Go to Customer" visible; customer created with `Pending Activation` status |
| 07 — Customer profile: all sections, all tabs; "Pending activation" badge | PASS | All profile tabs screenshotted; "Pending activation" badge on Packages tab |
| 08 — Dashboard: Pending Activation count = before + 1 | PASS | Dashboard counter incremented correctly |
| 09 — Collect activation payment; status Active; Expiry Date visible | PASS | Activation payment recorded; customer status = Active; Expiry Date label visible; payment appears on Payments page |
| 10 — Activity Logs: Lead Created, Feasibility Approved, Customer Created, Service Activated | PASS | All four audit events visible on Activity Logs tab |
| 11 — New lead → Feasibility Rejected; rejected banner; Mark Lost works | PASS | Rejected feasibility shows banner; Mark Lost transitions lead correctly |
| 12 — New lead → eKYC pending; Mark Completed disabled at Scheduled+no-team | PASS | State machine validated; eKYC-blocked state visible from list and detail |
| 13 — Seed lead with approved feasibility → Installation Visit | SKIP | No B2C seed lead with approved feasibility in seed data. FR-001..FR-005 all link to Enterprise leads LD-301..LD-305. `test.skip()` called explicitly. |
| 14 — Corporate lead: GST, PAN; "Mark as Won" gated; installation + no customer | PASS | Corporate lead created with GST/PAN; "Mark as Won" disabled before Proposal, enabled at Proposal; installation created without customer |
| 15 — Complete corporate installation; customer with GST/PAN on profile | PASS | Customer created; GST/PAN/legal name shown on profile |
| 16 — Reassign installation with reason; reassignment history shown | PASS | Reassignment recorded; history visible on InstallationDetail |
| 17 — Audit Log: entries for above actions; no duplicates | PASS | Audit log has entries for key actions; no duplicate entries detected |
| 18 — Seed customer RES-2026-0001: profile renders; list filters work | PASS | Seed customer profile renders fully; Customers list filters and counts correct |

---

## Findings

| ID | Severity | Component | Description |
|----|----------|-----------|-------------|
| FINDING-F1-01 | Low (test infra) | `RowActionMenu` / `flow1.spec.js` | Scroll-race: `RowActionMenu` registers `window.addEventListener('scroll', close, true)` after `setOpen(true)`. Post-click scroll events from Playwright's `scrollIntoViewIfNeeded` closed the portal before the test could detect it. **Fixed in test**: `scrollIntoViewIfNeeded()` called before every trigger `.click()`; `waitForPortalMenu` waits for `body > div[style*="position: fixed"]` to become visible. Not an app bug. |
| FINDING-F1-02 | Low (test infra) | `flow1.spec.js` | All RowActionMenu triggers previously used `tr.locator('button').last()` — ambiguous when rows have multiple buttons. Fixed to `tr.locator('td:last-child button')`. Not an app bug. |
| FINDING-F1-03 | Low (test gap) | Seed data / Step 13 | No B2C seed lead with an approved feasibility request exists. FR-001..FR-005 link to Enterprise leads only. Step 13 skipped. **Recommendation**: Add seed B2C lead at Feasibility stage with a linked FR in `Approved` status. |
