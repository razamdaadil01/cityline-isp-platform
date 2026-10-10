# Flow 1 E2E Test Report

**Test:** `e2e/flow1.spec.js` — B2C lead → installation → customer → activation  
**Run date:** 2026-10-10  
**Browser:** Chromium (headless shell 1194)  
**Result:** ✅ PASSED (1/1)  
**Duration:** ~5 s

---

## Step Results

| # | Step | Selector / Action | Result | Screenshot |
|---|------|-------------------|--------|------------|
| 01 | Load B2C kanban | `page.goto('/sales?view=kanban')` | ✅ Pass | `01-b2c-kanban-loaded.png` |
| 02 | Verify kanban columns exist | `[data-kanban-stage="New Inquiry"]`, `"Installation Visit"`, `"Won"` visible | ✅ Pass | `02-columns-verified.png` |
| 03 | LD-215 in Installation Visit column | `[data-kanban-stage="Installation Visit"] [data-lead-card="LD-215"]` visible | ✅ Pass | `03-ld215-in-installation-visit.png` |
| 04 | Drag LD-215 → Won → blocked notice | `dragAndDrop` + `text=Won can only be set automatically` | ✅ Pass | `04-won-blocked-notice.png` |
| 05 | Drag LD-203 (Feasibility) → Installation Visit → gate toast | `dragAndDrop` + `text=Feasibility must be approved first` | ✅ Pass | `05-feasibility-gate-toast.png` |
| 06 | Click "View Lead" on LD-215 → lead detail page | `[data-lead-card="LD-215"] button[title="View Lead"]` + URL `**/sales/leads/LD-215` | ✅ Pass | `06-lead-detail-navigated.png` |
| 07 | Stage chip shows "Installation Visit" | `span:has-text("Installation Visit")` visible | ✅ Pass | `07-stage-chip-installation-visit.png` |
| 08 | More options → "Mark as Won" disabled | `button[title="More options"]` click + `button:has-text("Mark as Won")` disabled | ✅ Pass | `08-mark-as-won-disabled.png` |
| 09 | Document tab → eKYC Completed | `button:has-text("Document")` click + `text=eKYC Completed` visible | ✅ Pass | `09-ekyc-completed.png` |
| 10 | Navigate to Installations via sidebar | `a[href="/installations"]` click + URL `**/installations` | ✅ Pass | `10-installations-list.png` |
| 11 | INS-001 visible in table | `text=INS-001` visible | ✅ Pass | `11-ins001-visible.png` |
| 12 | ⋮ on INS-001 → click "Mark Completed" from dropdown | `tr:has(INS-001) button:last` + `button:has-text("Mark Completed"):first` | ✅ Pass | `12-mark-completed-dropdown-clicked.png` |
| 13 | Modal "Mark as Completed" opens | `h2:has-text("Mark as Completed")` visible | ✅ Pass | `13-mark-completed-modal-opened.png` |
| 14 | Confirm completion in modal | `button:has-text("Mark Completed"):last` click | ✅ Pass | `14-mark-completed-confirmed.png` |
| 15 | "Installation completed" toast | `text=Installation completed` visible | ✅ Pass | `15-installation-completed-toast.png` |
| 16 | Re-open ⋮ on INS-001 → "Go to Customer" visible | `button:has-text("Go to Customer")` visible | ✅ Pass | `16-go-to-customer-visible.png` |
| 17 | Click "Go to Customer" → customer profile | `dispatchEvent('click')` + URL `**/customers/**/profile` | ✅ Pass | `17-customer-profile.png` |
| 18 | Activate customer | "Activate Now" → checkbox → "Confirm Activation" → `text=Internet Service Activated` | ✅ Pass | `18-internet-service-activated.png` |

---

## Data-testid Attributes Added

| Attribute | Element | File | Line |
|-----------|---------|------|------|
| `data-kanban-stage={stageId}` | Kanban column wrapper div | `src/pages/Sales.jsx` | ~2417 |
| `data-lead-card={lead.id}` | Lead card div | `src/pages/Sales.jsx` | ~618 |

No logic was changed. These are purely presentational attributes for stable E2E selectors.

---

## Notes

- **Step 12 approach**: INS-001 has `status: 'Scheduled'`. The installation detail page only shows "Mark Completed" for `status === 'In Progress'`, so completion is triggered from the installations **list** page ⋮ dropdown, which enables "Mark Completed" for all non-Completed/Cancelled statuses.
- **Step 17 click method**: `dispatchEvent('click')` used instead of `.click()` because the "Go to Customer" dropdown item renders below the default viewport height (900px). `dispatchEvent` bypasses the viewport check while still triggering the React `onClick` handler.
- **HTML report**: `e2e/reports/playwright-html/` (open `index.html` in a browser)
- **Screenshots**: `e2e/screenshots/flow1/`
