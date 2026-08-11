import { getFeasibilityRequests } from './feasibilityStore'
import { nextCustomerId } from './customersData'

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

  return {
    id: nextCustomerId(),
    name: lead.name,
    phone: lead.phone,
    altPhone: lead.alternateMobile,
    email: lead.email,
    profilePicture: lead.profilePicture,
    customerType: lead.pipeline === 'Enterprise' ? 'Corporate' : 'Individual',
    sourceLeadId: lead.id,
    status: 'active',
    plan: lead.plan,
    services: lead.serviceTags ?? [],
    zone: lead.branchCode || lead.area,
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
    connection: {
      type: lead.siteType,
    },
    sales: {
      executive: lead.assigned,
      leadSource: lead.source,
      remark: feasibility?.customerRequirementNotes ?? '',
    },
    createdOn: lead.createdAt,
  }
}
