import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, Printer, Download, Route, Building2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EntityBadge from '../../components/ui/EntityBadge'
import { getHDDProject, getSiteProject, PROJECT_EXECUTION_TYPE_LABELS } from '../../data/projectStore'
import { getVendor } from '../../data/vendorStore'
import { getUsers } from '../../data/userStore'
import { getCompanyEntity } from '../../data/companyEntities'

// Print-friendly project snapshot — same A4-card + print/download button +
// print-only CSS pattern as InvoicePDF.jsx/DeliveryChallanView.jsx (this
// app's established "generate a printable document from a record"
// pattern), and modeled closely on their actual header/section/field
// structure rather than a plain label/value list. Pure read-only readout
// of whatever was captured on the project's own creation form
// (CreateHDDProject.jsx / CreateSiteProject.jsx) — no CAPEX calculation,
// no new fields, no work-order data. Route is /projects/pdf/:type/:id
// ('hdd'/'site') — the static "pdf" prefix (rather than
// /projects/:type/:id/pdf) is deliberate: that shape tied in route
// specificity with /projects/hdd/:id/:tab and /projects/site/:id/:tab in
// App.jsx and lost the tie-break, so it rendered the detail page instead of
// this one. Reached from ProjectList.jsx's 3-dot "Download PDF" action,
// which already knows both a row's kind and id.
//
// No PDF-generation library exists anywhere in this codebase (confirmed —
// every print-style page here only ever offers Print/Download via
// window.print(), never a real PDF blob) — "Download" reuses that same
// call, same as DeliveryChallanView.jsx.

// Same two distinct status sets as ProjectList.jsx/HDDProjectDetail.jsx/
// SiteProjectDetail.jsx (see projectStore.js's PROJECT_STATUSES vs
// SITE_PROJECT_STATUSES) — each of those pages rolls its own copy of this
// map rather than sharing one, so this follows the same established
// per-file convention instead of introducing a new shared constant.
const STATUS_BADGE = {
  'Planning': 'gray', 'In Progress': 'blue', 'On Hold': 'yellow', 'Completed': 'green', 'Cancelled': 'red',
  'NEW': 'gray', 'SURVEY': 'indigo', 'ACQUIRED': 'orange', 'IN_EXECUTION': 'orange', 'COMMISSIONED': 'green',
}

// Label/value pair, invoice-style: small muted uppercase label, larger dark
// value below it — and a clearly-worded placeholder (rather than a bare,
// oddly-placed dash) for any field that wasn't actually captured.
function Field({ label, value }) {
  const empty = value === undefined || value === null || value === ''
  return (
    <div>
      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-sm mt-1.5 ${empty ? 'text-gray-300 italic font-normal' : 'text-gray-900 font-semibold'}`}>
        {empty ? 'Not specified' : value}
      </p>
    </div>
  )
}

// A framed section: a shaded header band (accent bar + heading) sitting on
// top of its own field grid, then a rule below — the same "boxed block"
// treatment InvoicePDF.jsx's Company/Customer Details columns and
// DeliveryChallanView.jsx's Consignor/Consignee columns use, rather than a
// label simply floating above plain text.
function Section({ title, children }) {
  return (
    <div className="border-b border-gray-200">
      <div className="px-8 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span className="w-1 h-3.5 rounded-full bg-brand-blue" />
        <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{title}</p>
      </div>
      <div className="px-8 py-6 grid grid-cols-2 gap-x-10 gap-y-5">
        {children}
      </div>
    </div>
  )
}

function HDDSections({ project }) {
  const siteInchargeName = getUsers().find(u => u.id === project.siteIncharge)?.name
  const vendorName = getVendor(project.vendor)?.companyName
  const executionTypeLabel = project.projectExecutionType
    ? `${project.projectExecutionType} — ${PROJECT_EXECUTION_TYPE_LABELS[project.projectExecutionType]}`
    : null

  return (
    <>
      <Section title="Basic Project Information">
        <Field label="Project Type" value="HDD / Backbone Route" />
        <Field label="Project ID" value={project.id} />
        <Field label="Project Title" value={project.title} />
        <Field label="Site Incharge / Project Owner" value={siteInchargeName} />
        <Field label="Project Execution Type" value={executionTypeLabel} />
      </Section>
      <Section title="Master Route Geometry">
        <Field label="Start Point Name" value={project.routeGeometry?.start?.name} />
        <Field label="Start Coordinates" value={project.routeGeometry?.start ? `${project.routeGeometry.start.lat}, ${project.routeGeometry.start.lng}` : null} />
        <Field label="End Point Name" value={project.routeGeometry?.end?.name} />
        <Field label="End Coordinates" value={project.routeGeometry?.end ? `${project.routeGeometry.end.lat}, ${project.routeGeometry.end.lng}` : null} />
        <Field label="Total Estimated Distance" value={project.distance != null ? `${project.distance} ${project.distanceUnit ?? ''}` : null} />
      </Section>
      <Section title="Planned Technical Specifications">
        <Field label="Duct Type" value={project.technicalSpecs?.ductType} />
        <Field label="Fiber Core Size" value={project.technicalSpecs?.fiberCoreSize} />
        <Field label="Planned Chambers Count" value={project.technicalSpecs?.plannedChambers} />
      </Section>
      <Section title="Vendor & Rate Setup">
        <Field label="Vendor / HDD Contractor" value={vendorName} />
        <Field label="Drilling Rate per Meter" value={project.drillingRate != null ? `₹${Number(project.drillingRate).toLocaleString('en-IN')}` : null} />
      </Section>
    </>
  )
}

// Site Project's capacity fields are shaped differently per siteType (see
// projectStore.js's SiteProject doc comment) — same three-way branch
// CreateSiteProject.jsx's own buildCapacity()/conditional sections use.
function siteCapacityFields(project) {
  if (project.siteType === 'Residential') {
    return [
      { label: 'Total Home Passes', value: project.capacity?.homePasses },
      { label: 'Flats Count', value: project.capacity?.flatsCount },
      { label: 'Towers Count', value: project.capacity?.towersCount },
    ]
  }
  if (project.siteType === 'Commercial') {
    return [{ label: 'Total Shops / Office Units', value: project.capacity?.shopUnits }]
  }
  if (project.siteType === 'Mixed-Use') {
    return [
      { label: 'Flats / Residential Units', value: project.capacity?.residentialUnits },
      { label: 'Shops / Commercial Units', value: project.capacity?.commercialUnits },
    ]
  }
  return []
}

function SiteSections({ project }) {
  const executionTypeLabel = project.projectExecutionType
    ? `${project.projectExecutionType} — ${PROJECT_EXECUTION_TYPE_LABELS[project.projectExecutionType]}`
    : null

  return (
    <>
      <Section title="Basic Site & Builder Information">
        <Field label="Project Site Name" value={project.name} />
        <Field label="Project ID" value={project.id} />
        <Field label="Builder / Developer Name" value={project.builderName} />
        <Field label="Contact Person Name" value={project.contactPerson} />
        <Field label="Contact Person Number" value={project.contactNumber} />
        <Field label="Pincode" value={project.pincode} />
        <Field label="Site Full Address" value={project.address} />
        <Field label="Project Execution Type" value={executionTypeLabel} />
      </Section>
      <Section title="Geolocation Pin">
        <Field label="Latitude" value={project.geo?.lat} />
        <Field label="Longitude" value={project.geo?.lng} />
      </Section>
      <Section title="Capacity & Site Type">
        <Field label="Site Type" value={project.siteType} />
        {siteCapacityFields(project).map(f => <Field key={f.label} label={f.label} value={f.value} />)}
      </Section>
      <Section title="Market Intelligence & Dates">
        <Field label="Existing Competitors Inside Site" value={project.competitors?.length ? project.competitors.join(', ') : null} />
        <Field label="Expected Closure Date" value={project.expectedClosureDate} />
        <Field label="Current Status" value={project.status} />
      </Section>
    </>
  )
}

export default function ProjectPDFView() {
  const { type, id } = useParams()
  const navigate = useNavigate()

  const isHDD = type === 'hdd'
  const project = isHDD ? getHDDProject(id) : type === 'site' ? getSiteProject(id) : null

  if (!project) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-gray-600 font-medium">No project found for {id}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/projects')}>Back to Projects</Button>
      </div>
    )
  }

  // Neither HDDProject nor SiteProject records carry a companyEntityId
  // field today (see projectStore.js's data model) — getCompanyEntity(undefined)
  // resolves to null and EntityBadge already renders nothing for a null
  // entity, so the logo is just omitted gracefully, same as
  // DeliveryChallanView.jsx's own "no resolvable entity yet" case. The type
  // icon block below fills that same header slot instead, so the header
  // never reads as visually empty on the left.
  const entity = getCompanyEntity(project.companyEntityId)
  const TypeIcon = isHDD ? Route : Building2

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">

      {/* Back/Print/Download — hidden on print */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-3 print:hidden">
        <button onClick={() => navigate(-1)} className="text-sm text-brand-blue hover:underline">
          ← Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-surface-border rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-gray-700"
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-surface-border rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-gray-700"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* A4-style card */}
      <div
        id="project-pdf-doc"
        className="max-w-4xl mx-auto bg-white shadow-xl border border-gray-200 rounded-xl overflow-hidden"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >

        {/* ── HEADER — title centered, logo/type block left, status +
            id/date meta right, same shape as InvoicePDF.jsx's header ── */}
        <div className="px-8 pt-7 pb-5 border-b border-gray-200">
          <h1 className="text-center text-lg font-black tracking-widest text-gray-800 mb-5 uppercase">
            {isHDD ? 'HDD / Backbone Route Project' : 'Site Project'} Snapshot
          </h1>

          <div className="flex items-start justify-between gap-4">
            {/* Logo (when a company entity resolves) or a type-icon
                placeholder — left side is never empty */}
            <div className="flex items-center gap-2.5">
              {entity ? (
                <>
                  <EntityBadge entity={entity} size={40} />
                  <div>
                    <p className="font-black text-gray-900 text-base leading-tight">{entity.name}</p>
                    {entity.gstin && <p className="text-brand-blue text-[10px] font-semibold tracking-widest uppercase">GST: {entity.gstin}</p>}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-brand-blue/10 text-brand-blue rounded-lg flex items-center justify-center shrink-0">
                    <TypeIcon size={18} />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-base leading-tight">{isHDD ? 'HDD / Backbone Route' : 'Site Project'}</p>
                    <p className="text-gray-400 text-[10px] font-semibold tracking-widest uppercase">Project Snapshot</p>
                  </div>
                </>
              )}
            </div>

            {/* Status pill + Project ID / Created meta, right-aligned —
                same "badge above labeled rows" arrangement as InvoicePDF.jsx's
                invoice meta block */}
            <div className="text-right space-y-1">
              <div>
                <Badge variant={STATUS_BADGE[project.status] ?? 'gray'} size="sm">{project.status}</Badge>
              </div>
              <p className="text-sm text-gray-700"><span className="text-gray-400 font-medium">Project ID: </span><span className="font-bold font-mono">{project.id}</span></p>
              <p className="text-sm text-gray-700"><span className="text-gray-400 font-medium">Created: </span><span className="font-semibold">{(project.createdAt || '').slice(0, 10) || 'Not specified'}</span></p>
            </div>
          </div>
        </div>

        {isHDD ? <HDDSections project={project} /> : <SiteSections project={project} />}

        <p className="px-8 py-4 text-center text-[11px] text-gray-400">
          Note: this is a snapshot of data captured at project creation — not a live work order or CAPEX document.
        </p>

        {/* ── BACK BUTTON ── */}
        <div className="px-8 py-5 flex justify-center print:hidden">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 text-sm font-medium bg-white border border-surface-border rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-gray-700"
          >
            Back
          </button>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #project-pdf-doc, #project-pdf-doc * { visibility: visible; }
          #project-pdf-doc { position: fixed; top: 0; left: 0; width: 100%; border-radius: 0; box-shadow: none; }
        }
      `}</style>
    </div>
  )
}
