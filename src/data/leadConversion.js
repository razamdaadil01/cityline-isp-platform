import { getFeasibilityRequests } from './feasibilityStore'
import { nextCustomerId } from './customersData'
import { getCompanyEntity } from './companyEntities'
import { getPartner } from './partners'

// Maps a Won lead's captured fields onto a new Customer record, matching the
// section/field layout CustomerDetail.jsx actually renders (address.billing*/
// install*/area-address sub-sections, connection.type, sales.*) — built from
// a full field-parity audit between the Residential Create Lead form and the
// Customer Detail page. Anything that's only ever populated during
// installation/activation (RADIUS/Jaze config, payment, KYC document status,
// GST info, agreement/signature) is intentionally left unset here so it can
// still be filled in separately at that stage — see CustomerDetail.jsx.
export function buildCustomerFromLead(lead) {
  const billing      = lead.address?.billing ?? {}
  const installation = lead.address?.sameAsBilling ? billing : (lead.address?.installation ?? {})
  const feasibility  = getFeasibilityRequests().find(f => f.leadId === lead.id)
  const isCorporate  = lead.pipeline === 'Enterprise'

  return {
    id: nextCustomerId(),
    name: lead.name,
    phone: lead.phone,
    altPhone: lead.alternateMobile,
    email: lead.email,
    profilePicture: lead.profilePicture,
    customerType: isCorporate ? 'Corporate' : 'Residential',
    sourceLeadId: lead.id,
    status: 'active',
    plan: lead.plan,
    services: lead.serviceTags ?? [],
    zone: lead.branchCode || lead.area,
    // Corporate-only — the Legal Company Name/GST Type/Contact Person/
    // Accounts & Technical Contact fields the Corporate Create Lead form
    // captures (SalesNewLead.jsx), so they survive Won-conversion instead
    // of being silently dropped. accountsContact/technicalContact are
    // already { name, email, phone } on the lead, matching what
    // CustomerDetail.jsx's Business Contacts card expects.
    ...(isCorporate ? {
      companyName: lead.companyName,
      contactPersonName: lead.contactPerson,
      contactPersonEmail: lead.email,
      gstType: lead.gstType,
      accountsContact: lead.accountsContact,
      technicalContact: lead.technicalContact,
    } : {}),
    address: {
      billingState:    billing.state       || lead.state,
      billingCity:      billing.area        || lead.area,
      billingPincode:   billing.pincode     || lead.pincode,
      billingLandmark:  billing.landmark    || '',
      billingAddress:   billing.addressLine || '',
      installState:     installation.state       || lead.state,
      installCity:       installation.area        || lead.area,
      installPincode:    installation.pincode     || lead.pincode,
      installLandmark:   installation.landmark    || '',
      installAddress:    installation.addressLine || '',
      area: lead.area,
      subArea: lead.subLocality,
      locality: lead.locality,
      district: lead.district,
      branchCode: lead.branchCode,
    },
    // Connection Details' "Connection Type" (FTTH/Sector/Village physical
    // provisioning technology) has no equivalent field on the Lead form —
    // it used to read the stale `lead.siteType` (a field only the old,
    // pre-Customer-Type-restructure lead form ever set; the current
    // SalesNewLead.jsx form never populates it), which left every newly
    // converted customer's Connection Type silently blank anyway. Left
    // unset here on purpose — it's filled in manually post-conversion,
    // like the rest of Connection Details (RADIUS/Jaze, payment, etc).
    connection: {},
    // The Lead's Own/Partner ownership & billing-party data
    // (ConnectionTypeStep, captured by both Resident and Corporate Create
    // Lead forms) — previously dropped entirely on conversion. Distinct
    // from connection.type above despite the similar "Connection Type"
    // naming; see CustomerDetail.jsx's Sales & Account Info card, where
    // this renders as "Ownership Type" alongside Entity/Partner/Billing To.
    ownership: {
      type: lead.connectionType || '',
      entity: lead.connectionType === 'Own' ? (getCompanyEntity(lead.entityId)?.name ?? '') : '',
      partner: lead.connectionType === 'Partner' ? (getPartner(lead.partnerId)?.name ?? '') : '',
      billingTo: lead.connectionType === 'Partner' ? (lead.billingTo || '') : '',
    },
    sales: {
      executive: lead.assigned,
      leadSource: lead.source,
      remark: feasibility?.customerRequirementNotes ?? '',
    },
    createdOn: lead.createdAt,
  }
}
