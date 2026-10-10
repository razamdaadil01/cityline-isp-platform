import { test, expect } from '@playwright/test'

const SS = 'e2e/screenshots/flow1'

async function shot(page, step, name) {
  await page.screenshot({ path: `${SS}/${step}-${name}.png`, fullPage: true })
}

test('Flow 1: B2C lead → installation → customer → activation', async ({ page }) => {
  test.setTimeout(180000)

  // ── Step 1: Load B2C kanban ──────────────────────────────────────────────────
  await page.goto('/sales?view=kanban')
  await page.waitForLoadState('networkidle')
  await shot(page, '01', 'b2c-kanban-loaded')

  // ── Step 2: Verify B2C kanban columns exist ──────────────────────────────────
  await expect(page.locator('[data-kanban-stage="New Inquiry"]')).toBeVisible()
  await expect(page.locator('[data-kanban-stage="Installation Visit"]')).toBeVisible()
  await expect(page.locator('[data-kanban-stage="Won"]')).toBeVisible()
  await shot(page, '02', 'columns-verified')

  // ── Step 3: Verify LD-215 is in the Installation Visit column ───────────────
  await expect(
    page.locator('[data-kanban-stage="Installation Visit"] [data-lead-card="LD-215"]')
  ).toBeVisible()
  await shot(page, '03', 'ld215-in-installation-visit')

  // ── Step 4: Drag LD-215 to Won → won-blocked notice ─────────────────────────
  await page.dragAndDrop(
    '[data-kanban-stage="Installation Visit"] [data-lead-card="LD-215"]',
    '[data-kanban-stage="Won"]'
  )
  await expect(
    page.locator('text=Won can only be set automatically')
  ).toBeVisible({ timeout: 5000 })
  await shot(page, '04', 'won-blocked-notice')

  // ── Step 5: Drag LD-203 (Feasibility) to Installation Visit → gate toast ────
  await page.dragAndDrop(
    '[data-kanban-stage="Feasibility"] [data-lead-card="LD-203"]',
    '[data-kanban-stage="Installation Visit"]'
  )
  await expect(
    page.locator('text=Feasibility must be approved first')
  ).toBeVisible({ timeout: 5000 })
  await shot(page, '05', 'feasibility-gate-toast')

  // ── Step 6: Click "View Lead" on LD-215 → navigate to lead detail ────────────
  await page.locator('[data-lead-card="LD-215"] button[title="View Lead"]').click()
  await page.waitForURL('**/sales/leads/LD-215', { timeout: 10000 })
  await shot(page, '06', 'lead-detail-navigated')

  // ── Step 7: Verify stage chip shows "Installation Visit" ────────────────────
  // The Current Stage Info sidebar card always shows lead.stage as a colored chip
  await expect(page.locator('span:has-text("Installation Visit")').first()).toBeVisible()
  await shot(page, '07', 'stage-chip-installation-visit')

  // ── Step 8: Open "More options" dropdown → verify "Mark as Won" is disabled ──
  await page.locator('button[title="More options"]').click()
  const markWonBtn = page.locator('button:has-text("Mark as Won")')
  await expect(markWonBtn).toBeVisible()
  await expect(markWonBtn).toBeDisabled()
  await shot(page, '08', 'mark-as-won-disabled')

  // ── Step 9: Click "Document" tab (also closes dropdown) → verify eKYC ───────
  await page.locator('button:has-text("Document")').first().click()
  await expect(page.locator('text=eKYC Completed')).toBeVisible({ timeout: 5000 })
  await shot(page, '09', 'ekyc-completed')

  // ── Step 10: Navigate to Installations via sidebar ──────────────────────────
  await page.locator('a[href="/installations"]').click()
  await page.waitForURL('**/installations', { timeout: 10000 })
  await shot(page, '10', 'installations-list')

  // ── Step 11: Verify INS-001 is visible in the table ─────────────────────────
  await expect(page.locator('text=INS-001').first()).toBeVisible()
  await shot(page, '11', 'ins001-visible')

  // ── Step 12: Click ⋮ on INS-001 row → click "Mark Completed" from dropdown ───
  const ins001Row = page.locator('tr').filter({ hasText: 'INS-001' }).first()
  await ins001Row.locator('button').last().click()
  await page.locator('button:has-text("Mark Completed")').first().click()
  await shot(page, '12', 'mark-completed-dropdown-clicked')

  // ── Step 13: Verify modal "Mark as Completed" opens ─────────────────────────
  await expect(page.locator('h2:has-text("Mark as Completed")')).toBeVisible({ timeout: 5000 })
  await shot(page, '13', 'mark-completed-modal-opened')

  // ── Step 14: Confirm completion in modal ────────────────────────────────────
  await page.locator('button:has-text("Mark Completed")').last().click()
  await shot(page, '14', 'mark-completed-confirmed')

  // ── Step 15: Verify "Installation completed" toast ──────────────────────────
  await expect(
    page.locator('text=Installation completed')
  ).toBeVisible({ timeout: 5000 })
  await shot(page, '15', 'installation-completed-toast')

  // ── Step 16: Re-open ⋮ on INS-001 (now Completed) → verify "Go to Customer" ─
  await ins001Row.locator('button').last().click()
  await expect(page.locator('button:has-text("Go to Customer")')).toBeVisible({ timeout: 5000 })
  await shot(page, '16', 'go-to-customer-visible')

  // ── Step 17: Click "Go to Customer" → navigate to customer profile ────────────
  await page.locator('button:has-text("Go to Customer")').dispatchEvent('click')
  await page.waitForURL('**/customers/**/profile', { timeout: 10000 })
  await shot(page, '17', 'customer-profile')

  // ── Step 18: Activate the customer ──────────────────────────────────────────
  await page.locator('button:has-text("Activate Now")').click()
  await page.locator('label:has-text("Advance Payment Not Required") input[type="checkbox"]').check()
  await page.locator('button:has-text("Confirm Activation")').first().click()
  await expect(
    page.locator('text=Internet Service Activated')
  ).toBeVisible({ timeout: 10000 })
  await shot(page, '18', 'internet-service-activated')
})
