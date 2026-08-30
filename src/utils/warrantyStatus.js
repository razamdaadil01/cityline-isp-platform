// Pure warranty-status computation for Asset Management (PRD Section 9).
// A LIVE derived value — never stored on the asset record itself, always
// recomputed from asset.fields.warrantyEndDate (IT Asset / Field &
// Splicing Tools, both required fields) or asset.fields.warrantyDate
// (Ladder's own single optional warranty date — assetTaxonomy.js gives
// Ladder just one date field rather than a start/end pair) against today's
// date. Authority/Access and Generic Tools carry neither field at all, so
// they always read 'N/A' — same for a Ladder whose optional warrantyDate
// was left blank.
//
// Kit components (Splicing Machine only) have no warranty field of their
// own in assetTaxonomy.js — per the PRD they inherit the parent asset's
// warranty status visually rather than computing anything separately, so
// there is nothing to add here for them; AssetDetail.jsx's existing Kit
// Components table is left exactly as-is.

export const WARRANTY_STATUSES = ['Active', 'Expiring Soon', 'Expired', 'N/A']
export const WARRANTY_EXPIRING_SOON_DAYS = 30

// The single field this asset's category actually carries for its
// warranty end — whichever of the two is present wins; an asset with
// neither has no warranty date to compute against at all.
export function getWarrantyEndDate(asset) {
  return asset?.fields?.warrantyEndDate || asset?.fields?.warrantyDate || null
}

// Whole days from today to the warranty end date — negative once expired,
// null when there's no warranty date to compare against.
export function daysUntilWarrantyEnd(asset) {
  const endDate = getWarrantyEndDate(asset)
  if (!endDate) return null
  const today = new Date().toISOString().slice(0, 10)
  const msPerDay = 86400000
  return Math.round((new Date(`${endDate}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / msPerDay)
}

export function getWarrantyStatus(asset) {
  const days = daysUntilWarrantyEnd(asset)
  if (days === null) return 'N/A'
  if (days < 0) return 'Expired'
  if (days <= WARRANTY_EXPIRING_SOON_DAYS) return 'Expiring Soon'
  return 'Active'
}
