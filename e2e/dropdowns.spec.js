import { test, expect } from '@playwright/test'

// NOTE: POPWorkOrders.jsx was migrated but has no active route (/network/pops/work-orders
// redirects to /network/pops). Its RowActionMenu content is tested via the
// POPView work-orders tab at /network/pops/POP-002/work-orders below.

test.describe.serial('RowActionMenu — viewport containment', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  const VW = 1440
  const VH = 900

  /** Wait for the RowActionMenu portal to finish positioning, then return its locator.
   * The portal renders with visibility:hidden first, then useLayoutEffect positions
   * it and sets visibility:visible. Waiting for a button to be visible ensures the
   * portal is fully positioned before we evaluate its contents. */
  async function waitForMenu(page) {
    await page.waitForSelector('body > div[style*="position: fixed"] button', {
      state: 'visible',
      timeout: 5000,
    })
    return page.locator('body > div[style*="position: fixed"]').last()
  }

  /**
   * Click the ⋮ trigger on the last data row.
   * Waits for at least one tbody row with an action button before clicking.
   */
  async function openLastRowMenu(page) {
    await page.waitForSelector('tbody tr td:last-child button', { timeout: 10000 })
    const rows = page.locator('tbody tr').filter({ has: page.locator('td:last-child button') })
    const count = await rows.count()
    if (count === 0) throw new Error('No data rows with action button found')
    const trigger = rows.last().locator('td:last-child button')
    // Pre-scroll into view so trigger.click() fires no post-click scroll events.
    // The RowActionMenu scroll listener (window, capture) fires AFTER setOpen(true),
    // which would close the portal — this avoids that race.
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    return waitForMenu(page)
  }

  /**
   * Assert every button in the portal menu is fully inside the 1440×900 viewport.
   * Returns the items locator so the caller can click the first one.
   */
  async function assertItemsInViewport(menu) {
    const items = menu.locator('button')
    const count = await items.count()
    expect(count, 'menu must have at least one item').toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const r = await items.nth(i).boundingBox()
      expect(r,              `item[${i}] must be visible (has bounds)`).not.toBeNull()
      expect(r.y,            `item[${i}] top edge inside viewport`).toBeGreaterThanOrEqual(0)
      expect(r.x,            `item[${i}] left edge inside viewport`).toBeGreaterThanOrEqual(0)
      expect(r.y + r.height, `item[${i}] bottom edge inside viewport`).toBeLessThanOrEqual(VH)
      expect(r.x + r.width,  `item[${i}] right edge inside viewport`).toBeLessThanOrEqual(VW)
    }
    return items
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Customers
  // ─────────────────────────────────────────────────────────────────────────
  test('Customers', async ({ page }) => {
    await page.goto('/customers')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View Details"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 2. FeasibilityRequests
  // ─────────────────────────────────────────────────────────────────────────
  test('FeasibilityRequests', async ({ page }) => {
    await page.goto('/sales/feasibility-requests')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 3. FibreNetwork — Routes tab
  // ─────────────────────────────────────────────────────────────────────────
  test('FibreNetwork — Routes tab', async ({ page }) => {
    await page.goto('/network/fibre?tab=routes')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "Edit" — opens modal, stays on page
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 4. FibreNetwork — Infrastructure tab
  // ─────────────────────────────────────────────────────────────────────────
  test('FibreNetwork — Infrastructure tab', async ({ page }) => {
    await page.goto('/network/fibre?tab=infrastructure')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "Edit" — opens modal, stays on page
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 5. FibreNetwork — Faults tab
  // ─────────────────────────────────────────────────────────────────────────
  test('FibreNetwork — Faults tab', async ({ page }) => {
    await page.goto('/network/fibre?tab=faults')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View Details" — opens modal, stays on page
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Installations
  // ─────────────────────────────────────────────────────────────────────────
  test('Installations', async ({ page }) => {
    await page.goto('/installations')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View Details"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 7. IntercomCustomers
  // ─────────────────────────────────────────────────────────────────────────
  test('IntercomCustomers', async ({ page }) => {
    await page.goto('/intercom/customers')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View Details"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 8. POPManagement
  // ─────────────────────────────────────────────────────────────────────────
  test('POPManagement', async ({ page }) => {
    await page.goto('/network/pops')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View" (navigates to POP detail)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 9. POPView — work-orders tab  (also covers POPWorkOrders.jsx content)
  //    POP-002 has seeded work orders
  // ─────────────────────────────────────────────────────────────────────────
  test('POPView — work-orders tab', async ({ page }) => {
    await page.goto('/network/pops/POP-002/work-orders')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "Edit Work Order"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 10. AssetList
  // ─────────────────────────────────────────────────────────────────────────
  test('AssetList', async ({ page }) => {
    await page.goto('/assets')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 11. Assignments
  // ─────────────────────────────────────────────────────────────────────────
  test('Assignments', async ({ page }) => {
    await page.goto('/inventory/assign')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 12. AssignToUser
  // ─────────────────────────────────────────────────────────────────────────
  test('AssignToUser', async ({ page }) => {
    await page.goto('/inventory/assign-to-user')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 13. ProductList
  // ─────────────────────────────────────────────────────────────────────────
  test('ProductList', async ({ page }) => {
    await page.goto('/inventory/products')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "Edit" (canEdit) or "View Details"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 14. PurchaseOrders
  // ─────────────────────────────────────────────────────────────────────────
  test('PurchaseOrders', async ({ page }) => {
    await page.goto('/inventory/purchase-orders')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 15. Purchases
  // ─────────────────────────────────────────────────────────────────────────
  test('Purchases', async ({ page }) => {
    await page.goto('/inventory/purchases')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 16. QAInspection
  // ─────────────────────────────────────────────────────────────────────────
  test('QAInspection', async ({ page }) => {
    await page.goto('/inventory/qa')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 17. StoreList
  // ─────────────────────────────────────────────────────────────────────────
  test('StoreList', async ({ page }) => {
    await page.goto('/inventory/stores')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View Details" or "Edit"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 18. StoreTransfer
  // ─────────────────────────────────────────────────────────────────────────
  test('StoreTransfer', async ({ page }) => {
    await page.goto('/inventory/store-transfer')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 19. VendorList
  // ─────────────────────────────────────────────────────────────────────────
  test('VendorList', async ({ page }) => {
    await page.goto('/inventory/vendors')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "View Details"
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 20. ProjectList
  // ─────────────────────────────────────────────────────────────────────────
  test('ProjectList', async ({ page }) => {
    await page.goto('/projects')
    const menu = await openLastRowMenu(page)
    const items = await assertItemsInViewport(menu)
    await items.first().click() // "Download PDF" — navigates to PDF view
  })
})
