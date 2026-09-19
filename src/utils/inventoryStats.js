// Shared inventory aggregation helpers — used by both
// src/pages/inventory/InventoryOverview.jsx and Reports.jsx's Inventory
// Report, so both read productStore.js/inventoryLedger.js through the same
// logic and can never disagree about what counts as "low stock" or how
// much of a product is actually available.

import { getCategory } from '../data/productTaxonomyStore'
import { getProductAvailability } from '../data/inventoryLedger'

export const UNCLASSIFIED_CATEGORY_LABEL = 'Unclassified'

// A product's live available quantity is in Pieces (hardware) or Meters
// (wire) — same distinction InventoryOverview.jsx's own table renders.
export function formatAvailableQty(product, qty) {
  return product.productType === 'wire' ? `${qty.toLocaleString('en-IN')} m` : qty.toLocaleString('en-IN')
}

// Same low-stock threshold InventoryOverview.jsx's own summary cards/table
// rows use (each product's own reorderAlertQty, defaulting to 0 — i.e.
// never flagged — when unset) — extracted here so this app has exactly one
// definition of "low stock" rather than Reports.jsx growing a second one
// that could silently drift from InventoryOverview.jsx's.
export function isLowStock(product, availableQty) {
  return availableQty < (Number(product.reorderAlertQty) || 0)
}

// Real category-wise stock rollup — groups every product by its real
// Product Taxonomy category (productTaxonomyStore.js's getCategory(), the
// same tree ProductList.jsx's Category filter and Add/Edit Product form
// use), summing each product's live available quantity
// (inventoryLedger.js's getProductAvailability(), the same source
// InventoryOverview.jsx's own Available Qty column reads) and counting how
// many of that category's products are currently low stock.
//
// Most of productStore.js's seed catalog predates Product Taxonomy and has
// no categoryId at all (see ProductList.jsx's own "Legacy product —
// reclassify to update" handling) — those are grouped under a real
// "Unclassified" bucket rather than silently dropped or crashing on a null
// category lookup, so this rollup's totals always cover every product.
export function computeInventoryByCategory(products) {
  const rows = new Map() // category label -> { productCount, availableQty, lowStockCount, products }
  const ensure = label => {
    if (!rows.has(label)) rows.set(label, { productCount: 0, availableQty: 0, lowStockCount: 0, products: [] })
    return rows.get(label)
  }
  products.forEach(p => {
    const category = p.categoryId ? getCategory(p.categoryId) : null
    const label = category?.label ?? UNCLASSIFIED_CATEGORY_LABEL
    const availableQty = getProductAvailability(p.id)
    const lowStock = isLowStock(p, availableQty)
    const row = ensure(label)
    row.productCount++
    row.availableQty += availableQty
    if (lowStock) row.lowStockCount++
    row.products.push({ product: p, availableQty, lowStock })
  })
  return [...rows.entries()]
    .map(([category, r]) => ({ category, ...r }))
    .sort((a, b) => b.availableQty - a.availableQty)
}
