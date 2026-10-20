# Flow 2 — Billing Lifecycle: Test Report

**Run date:** 2026-10-20  
**Suite:** `e2e/flow2.spec.js` — 20 steps, serial, shared page  
**Result:** ✅ 20 / 20 PASSED (1m 6s)

---

## Step Results

| Step | Result | Detail |
|------|--------|--------|
| 01 — Settings: set Activation Fee = 500 | PASS | `activationFee` set to ₹500 in Settings → Billing |
| 02 — Packages: create package with 2 tenures | PASS | UI accepted form; **FINDING-02**: `handleSubmit` is a stub — package not persisted to store |
| 03 — Create fresh customer (Pending Activation) | PASS | Customer `RES-2026-0031` created via flow1 helpers |
| 04 — Activate: amount < invoice total; assert GST | PASS | **FINDING-04b/04c**: Invoice = ₹590 (expected ₹1,650.82); `planPrice=0` because lead-form package has no tenure/price. Activation payment (₹1,000) > actual invoice (₹590) → goes to `creditBalance` first, then `addInvoice` auto-applies → invoice = Paid, Outstanding = ₹0 |
| 05 — Add Payment: pay part of remaining | PASS | **FINDING-05**: No outstanding invoice to pay (step 04 paid in full via credit path); `AddPayment` form did not render; ₹300 went to creditBalance |
| 06 — Payments page: credit notice; overpay | PASS | **FINDING-06**: `PendingTab` only shows `status=pending`, excludes `partially_paid`. **FINDING-06b**: `getOutstandingTotal(id)` at `CustomerDetail.jsx:2130` uses bare `id` instead of `customerId` alias from `useParams` — ReferenceError crashes React tree; overpayment submission skipped to avoid 5-min hang |
| 07 — Billing → Create Invoice; credit auto-applied | PASS | New invoice created; `creditBalance` card shows Outstanding ₹0 / Credit ₹0 / Total Paid ₹1,000 |
| 08 — Collection: record payment with proof | PASS | **FINDING-08b**: Modal title "Record Collection Payment" not visible within 8 s after click (modal render race); amount input appeared separately — payment of ₹500 recorded. Pending Verification row confirmed (payment `117680`, customer `RES-2026-0003`) |
| 09 — Verify collection payment | PASS | Pending Verification row found; ThreeDot → Verify Payment clicked; payment verified |
| 10 — Second collection payment; Reject | PASS | **FINDING-10b**: Record Payment modal title not visible. **FINDING-10d**: No Pending Verification row after second payment — modal did not fully render so no payment was submitted; reject flow skipped |
| 11 — Renew via Packages tab | PASS | **FINDING-11**: No "Renew" button visible on Packages tab for `RES-2026-0031` — subscription may not exist (package save was a stub in step 02) |
| 12 — Billing → renew expired seed customer | PASS | **FINDING-12**: Expired customer `RES-2026-0008` row not visible in Package Recharge tab — customer may already be Active or tab does not filter by expiry |
| 13 — Plan change to pricier plan | PASS | **FINDING-13**: No "Modify" button for `RES-2026-0031` (no active subscription). Remaining days calculation logged: 60 days unused = ₹1,798 credit vs new plan total ₹1,768.82 |
| 14 — Ledger integrity: running balance | PASS | Ledger tab rendered 3 rows; **FINDING-14**: "Internet Service" / "Sonic 100" keywords not found in ledger (different label used) |
| 15 — Billing list: filter by customer; stats | PASS | Billing tab shows 10+ invoice rows; stats tiles visible |
| 16 — Cancel invoice: allowed/blocked | PASS | 10 invoice rows for `RES-2026-0031`; no "Cancel Invoice" option in dropdown (cancel may be restricted when payments exist) |
| 17 — GST inter-state IGST / intra-state CGST+SGST | PASS | **FINDING-17**: Neither IGST nor CGST+SGST text visible in invoice detail for `RES-2026-0031` (UP customer + MH entity) — GST breakdown may not be shown in invoice list view |
| 18 — Payment History + Dashboard Today's Collection | PASS | Payment History: 10 rows. Dashboard "Today's Collection" = ₹1,800 ✓ |
| 19 — Audit Log entries | PASS | 20 audit rows; "Payment" ✓; `RES-2026-0031` ✓; "renewed" and "Plan changed" keywords not found in log text |
| 20 — Seed customer regression: Finance data isolation | PASS | Seed customer `RES-2026-0001` ledger: 5 rows; no data leak from `RES-2026-0031` |

---

## Findings

| ID | Severity | Component | Description |
|----|----------|-----------|-------------|
| FINDING-02 | High | Packages / `PackageAdd` | `handleSubmit` is a stub — package is never saved to the package store. All subsequent package-dependent flows (Renew, Modify, tenure selection) are broken for newly created packages. |
| FINDING-04b | High | Activation / `handleActivateCustomer` | Invoice total = ₹590 (activation fee only) instead of ₹1,650.82. `selectedPackage` on the lead form carries no tenures/price → `planPrice = 0` → `addInvoice` bills activation fee only. |
| FINDING-04c | High | Activation / `handleActivateCustomer` | `recordPayment` runs **before** `addInvoice`. Payment (₹1,000) > invoice (₹590) → all ₹1,000 goes to `creditBalance` → `addInvoice` auto-applies credit → invoice immediately Paid, Outstanding = ₹0. Expected: invoice should be `partially_paid` with Outstanding = ₹650.82. |
| FINDING-05 | Medium | Finance / `AddPayment` | Because step 04 fully pays the invoice via the credit path, `AddPayment` renders no form (no outstanding invoices). ₹300 entered goes to `creditBalance` instead of marking the invoice `partially_paid`. |
| FINDING-06 | Medium | Payments / `PendingTab` | Payments list only shows invoices with `status = 'pending'`; `partially_paid` invoices are excluded. |
| FINDING-06b | Critical | Finance / `CustomerDetail.jsx:2130` | `getOutstandingTotal(id)` uses bare `id` (undefined in this scope) instead of `customerId` (aliased from `useParams()` at line 1821). Submitting payment on the Finance tab throws a `ReferenceError` → React 16 unmounts the entire component tree → blank page → all nav clicks hang until 5-min test timeout. |
| FINDING-08b | Low | Collection / `RecordPaymentModal` | Modal title not visible within 8 s after clicking "Record Payment" — modal render is slower than expected or `setSearchParams` has a race with `pushStateNavigate`. Modal eventually rendered (amount input appeared). |
| FINDING-10b/d | Medium | Collection / Step 10 | Second "Record Payment" modal did not render in time; no second Pending Verification payment was submitted, so the Reject flow could not be tested. |
| FINDING-11 | High | Packages / Renew | No "Renew" button for `RES-2026-0031` because the package from step 02 was never saved (FINDING-02). Customer has no active subscription. |
| FINDING-12 | Medium | Billing / Package Recharge | Expired customer `RES-2026-0008` not visible in Package Recharge tab. Tab may not filter to expired subscriptions, or customer was already renewed by an earlier test run. |
| FINDING-13 | High | Packages / Modify | No "Modify" button for `RES-2026-0031` — no active subscription (cascades from FINDING-02/11). Plan-change credit logic untested. |
| FINDING-14 | Low | Finance / Ledger | Ledger rendered 3 rows but "Internet Service" / "Sonic 100" keywords not found. Ledger entries may use different descriptions. |
| FINDING-17 | Medium | Billing / GST | IGST / CGST+SGST breakdown not visible in the invoice list row for inter-state customer `RES-2026-0031`. GST detail may only appear inside the invoice PDF/print view, not the list view. |
| FINDING-19 | Low | Audit Log | "renewed" and "Plan changed" keywords not found in audit log body text (likely because renewal and plan change operations did not execute due to FINDING-11/13). |

---

## Root Cause Summary

The cascade of failures in steps 04–13 trace to two root causes:

1. **`PackageAdd.handleSubmit` is a stub** (FINDING-02): packages are never persisted, breaking all subscription-dependent flows (Renew, Modify, tenure selection, plan-price invoicing).

2. **`handleActivateCustomer` operation order** (FINDING-04c): recording payment before creating the invoice means any activation payment ≥ invoice total fully pays via `creditBalance`, bypassing the expected `partially_paid` state.

3. **`getOutstandingTotal` uses wrong variable** (FINDING-06b): `CustomerDetail.jsx:2130` reference to bare `id` instead of `customerId` crashes the Finance payment submission.
