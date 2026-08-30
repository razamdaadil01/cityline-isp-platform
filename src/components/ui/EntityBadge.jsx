// Company entity logo/initials badge — shows the entity's own logoUrl
// image when set, else a colored initials badge derived from its name.
// Extracted out of PODetail.jsx (its original home) so any other page that
// needs to resolve+render a companyEntities.js entity's visual identifier —
// DeliveryChallanView.jsx included — reuses this exact same
// resolution/fallback logic instead of re-deriving it. `size` (px) scales
// both the box and the initials font so callers can use it as a small
// inline badge (PODetail.jsx's own 16px header subtitle) or a larger,
// document-header-style logo (DeliveryChallanView.jsx) without duplicating
// the component itself.

// Up to 2 initials from an entity's name (e.g. "Cityline Networks Pvt Ltd"
// -> "CN") — the fallback badge when the entity has no logoUrl set, same
// spirit as InvoicePDF.jsx's hardcoded "CL" box but actually derived from
// the entity rather than a fixed string.
export function entityInitials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export default function EntityBadge({ entity, size = 16 }) {
  if (!entity) return null
  const px = `${size}px`
  return entity.logoUrl ? (
    <img
      src={entity.logoUrl} alt={entity.name}
      className="rounded object-cover shrink-0"
      style={{ width: px, height: px }}
    />
  ) : (
    <span
      className="rounded bg-brand-blue text-white font-bold flex items-center justify-center shrink-0"
      style={{ width: px, height: px, fontSize: `${Math.max(8, Math.round(size * 0.4))}px` }}
    >
      {entityInitials(entity.name)}
    </span>
  )
}
