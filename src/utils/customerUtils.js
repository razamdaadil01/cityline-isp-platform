// Computes a plan expiry date from a start date and a package/tenure object.
// Days resolved in order: pkg.tenureDays → pkg.tenures[0].days → pkg.validity → 30.
export function computeExpiry(startDate, pkg) {
  const days = (pkg?.tenureDays ?? pkg?.tenures?.[0]?.days ?? Number(pkg?.validity)) || 30
  const base = startDate ? new Date(startDate) : new Date()
  const d = isNaN(base.getTime()) ? new Date() : new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Returns the effective subscription for a customer.
// Prefers customer.subscription (written at activation or lead conversion).
// Falls back to selectedPackage / bandwidthPackage for pre-activation customers.
export function getCustomerSubscription(customer) {
  if (customer?.subscription) return customer.subscription
  const pkg = customer?.selectedPackage ?? customer?.bandwidthPackage ?? null
  if (!pkg) return null
  const t = pkg.tenures?.[0]
  return {
    packageId: pkg.id ?? null,
    packageName: pkg.name ?? customer?.plan ?? null,
    tenureDays: t?.days ?? 30,
    price: t?.price ?? pkg.price ?? 0,
    gstRate: pkg.gstRate ?? 18,
    hsnSac: pkg.hsnSac ?? '998422',
    startDate: customer?.activationDate ?? null,
    expiry: customer?.expiry ?? null,
    status: customer?.status ?? null,
    addons: [],
  }
}

// Splits a taxable base amount into GST components.
// Same entity state and customer billing state → intra-state (CGST + SGST split equally).
// Different states (or either unknown) → inter-state (IGST only) — conservative default.
export function computeGst(taxable, rate, entityState, customerState) {
  const frac = (Number(rate) || 18) / 100
  if (entityState && customerState && entityState === customerState) {
    const half = parseFloat((taxable * frac / 2).toFixed(2))
    return { cgst: half, sgst: half, igst: 0, total: parseFloat((taxable + half + half).toFixed(2)) }
  }
  const igst = parseFloat((taxable * frac).toFixed(2))
  return { cgst: 0, sgst: 0, igst, total: parseFloat((taxable + igst).toFixed(2)) }
}
