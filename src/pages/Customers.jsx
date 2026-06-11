import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus, Download, Filter, ChevronLeft, ChevronRight,
  Search, X, ChevronDown, Users
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

// ── Mock data ────────────────────────────────────────────────────────────────

const SERVICE_STYLE = {
  'Broadband':    'bg-brand-blue/10 text-brand-blue',
  'Landline':     'bg-navy/10 text-navy',
  'OTT':          'bg-purple-100 text-purple-700',
  'ILL':          'bg-brand-orange/10 text-brand-orange',
  'Intercom':     'bg-cyan-100 text-cyan-700',
  'Business BB':  'bg-emerald-100 text-emerald-700',
}

const STATUS_CFG = {
  active:    { variant: 'green',  label: 'Active' },
  suspended: { variant: 'yellow', label: 'Suspended' },
  inactive:  { variant: 'gray',   label: 'Inactive' },
  expired:   { variant: 'red',    label: 'Expired' },
}

const CUSTOMERS = [
  { id: 'RES-2026-0001', name: 'Rajan Mehta',       phone: '98765 43210', services: ['Broadband','Landline','OTT'],       plan: 'FTTH 100Mbps',     zone: 'Andheri West', area: 'Andheri',   network: 'OLT-AW-01', expiry: '2026-05-31', status: 'active' },
  { id: 'RES-2026-0002', name: 'Priya Sharma',       phone: '98123 45678', services: ['Broadband'],                        plan: 'FTTB 50Mbps',      zone: 'Bandra East',  area: 'Bandra',    network: 'OLT-BE-02', expiry: '2026-05-20', status: 'active' },
  { id: 'RES-2026-0003', name: 'Suresh Kumar',       phone: '99887 76655', services: ['Broadband','Intercom'],             plan: 'Wireless 25Mbps',  zone: 'Goregaon',     area: 'Goregaon',  network: 'OLT-GG-01', expiry: '2026-04-15', status: 'suspended' },
  { id: 'RES-2026-0004', name: 'Anita Desai',        phone: '91234 56789', services: ['Broadband','OTT'],                  plan: 'FTTH 200Mbps',     zone: 'Versova',      area: 'Andheri',   network: 'OLT-AW-01', expiry: '2026-06-30', status: 'active' },
  { id: 'ENT-2026-0001', name: 'Vikram Singh',       phone: '90112 23344', services: ['ILL','Business BB'],                plan: 'P2P 1Gbps',        zone: 'MIDC Andheri', area: 'Andheri',   network: 'OLT-MC-03', expiry: '2026-07-15', status: 'active' },
  { id: 'RES-2026-0005', name: 'Mohan Lal',          phone: '97654 32198', services: ['Broadband'],                        plan: 'FTTH 100Mbps',     zone: 'Andheri East', area: 'Andheri',   network: 'OLT-AE-02', expiry: '2026-03-01', status: 'inactive' },
  { id: 'RES-2026-0006', name: 'Deepa Nair',         phone: '93321 44556', services: ['Broadband','Landline'],             plan: 'FTTH 200Mbps',     zone: 'Juhu',         area: 'Juhu',      network: 'OLT-JU-01', expiry: '2026-06-15', status: 'active' },
  { id: 'RES-2026-0007', name: 'Rahul Patil',        phone: '97001 12233', services: ['Broadband','OTT','Intercom'],       plan: 'FTTB 100Mbps',     zone: 'Malad West',   area: 'Malad',     network: 'OLT-ML-01', expiry: '2026-05-10', status: 'active' },
  { id: 'RES-2026-0008', name: 'Sunita Joshi',       phone: '91800 09988', services: ['Broadband'],                        plan: 'FTTH 40Mbps',      zone: 'Santacruz',    area: 'Santacruz', network: 'OLT-SC-02', expiry: '2026-04-30', status: 'expired' },
  { id: 'RES-2026-0009', name: 'Arun Kapoor',        phone: '98555 77889', services: ['ILL'],                              plan: 'ILL 10Mbps',       zone: 'SEEPZ',        area: 'Andheri',   network: 'OLT-MC-03', expiry: '2026-08-01', status: 'active' },
  { id: 'RES-2026-0010', name: 'Kavitha Rao',        phone: '96001 23456', services: ['Broadband','Landline','OTT'],       plan: 'FTTH 100Mbps',     zone: 'Powai',        area: 'Powai',     network: 'OLT-PW-01', expiry: '2026-05-28', status: 'active' },
  { id: 'RES-2026-0011', name: 'Nitin Bhatt',        phone: '99001 56789', services: ['Broadband'],                        plan: 'Wireless 10Mbps',  zone: 'Borivali',     area: 'Borivali',  network: 'OLT-BV-01', expiry: '2026-03-15', status: 'suspended' },
  { id: 'RES-2026-0012', name: 'Meera Gupta',        phone: '97765 43210', services: ['Broadband','OTT'],                  plan: 'FTTH 200Mbps',     zone: 'Kandivali',    area: 'Kandivali', network: 'OLT-KD-01', expiry: '2026-07-10', status: 'active' },
  { id: 'RES-2026-0013', name: 'Sanjay Verma',       phone: '95432 10987', services: ['Business BB','ILL'],                plan: 'FTTH 500Mbps',     zone: 'BKC',          area: 'Bandra',    network: 'OLT-BE-02', expiry: '2026-09-30', status: 'active' },
  { id: 'RES-2026-0014', name: 'Pooja Menon',        phone: '91234 00987', services: ['Broadband','Intercom'],             plan: 'FTTB 50Mbps',      zone: 'Chembur',      area: 'Chembur',   network: 'OLT-CH-01', expiry: '2026-04-20', status: 'active' },
  { id: 'RES-2026-0015', name: 'Amol Tiwari',        phone: '98908 76543', services: ['Broadband'],                        plan: 'FTTH 100Mbps',     zone: 'Ghatkopar',    area: 'Ghatkopar', network: 'OLT-GK-01', expiry: '2026-02-28', status: 'inactive' },
  { id: 'RES-2026-0016', name: 'Rekha Shetty',       phone: '97654 00123', services: ['Broadband','Landline'],             plan: 'FTTH 200Mbps',     zone: 'Mulund',       area: 'Mulund',    network: 'OLT-MU-01', expiry: '2026-06-05', status: 'active' },
  { id: 'RES-2026-0017', name: 'Dinesh Naik',        phone: '93301 22334', services: ['ILL','Landline'],                   plan: 'P2P 100Mbps',      zone: 'Vikhroli',     area: 'Vikhroli',  network: 'OLT-VK-01', expiry: '2026-08-15', status: 'active' },
  { id: 'RES-2026-0018', name: 'Lalitha Kumar',      phone: '98701 12398', services: ['Broadband','OTT'],                  plan: 'FTTH 100Mbps',     zone: 'Bhandup',      area: 'Bhandup',   network: 'OLT-BH-01', expiry: '2026-05-25', status: 'active' },
  { id: 'RES-2026-0019', name: 'Prakash Yadav',      phone: '94560 78901', services: ['Broadband'],                        plan: 'Wireless 25Mbps',  zone: 'Kurla',        area: 'Kurla',     network: 'OLT-KU-01', expiry: '2026-04-01', status: 'expired' },
  { id: 'RES-2026-0020', name: 'Swati Jain',         phone: '96789 01234', services: ['Broadband','Landline','Intercom'],  plan: 'FTTH 200Mbps',     zone: 'Andheri West', area: 'Andheri',   network: 'OLT-AW-01', expiry: '2026-07-20', status: 'active' },
  { id: 'RES-2026-0021', name: 'Harish Pillai',      phone: '91100 23456', services: ['Business BB'],                      plan: 'FTTH 1Gbps',       zone: 'Nariman Point','area': 'South Mumbai', network: 'OLT-SM-01', expiry: '2026-10-31', status: 'active' },
  { id: 'RES-2026-0022', name: 'Nandita Shah',       phone: '98600 34567', services: ['Broadband'],                        plan: 'FTTB 50Mbps',      zone: 'Dadar',        area: 'Dadar',     network: 'OLT-DD-01', expiry: '2026-05-15', status: 'suspended' },
  { id: 'RES-2026-0023', name: 'Rohit Bose',         phone: '97700 45678', services: ['Broadband','OTT'],                  plan: 'FTTH 100Mbps',     zone: 'Matunga',      area: 'Matunga',   network: 'OLT-MT-01', expiry: '2026-06-01', status: 'active' },
  { id: 'RES-2026-0024', name: 'Chandra Sekhar',     phone: '95500 56789', services: ['ILL','Business BB','Landline'],     plan: 'P2P 10Gbps',       zone: 'Lower Parel',  area: 'Lower Parel',network: 'OLT-LP-01', expiry: '2026-11-30', status: 'active' },
  { id: 'RES-2026-0025', name: 'Vandana Mishra',     phone: '92200 67890', services: ['Broadband'],                        plan: 'FTTH 40Mbps',      zone: 'Worli',        area: 'Worli',     network: 'OLT-WR-01', expiry: '2026-03-31', status: 'inactive' },
  { id: 'RES-2026-0026', name: 'Sunil Kadam',        phone: '90000 78901', services: ['Broadband','Intercom'],             plan: 'FTTB 100Mbps',     zone: 'Thane West',   area: 'Thane',     network: 'OLT-TN-01', expiry: '2026-05-01', status: 'active' },
  { id: 'RES-2026-0027', name: 'Geetha Iyer',        phone: '98300 89012', services: ['Broadband','Landline','OTT'],       plan: 'FTTH 200Mbps',     zone: 'Navi Mumbai',  area: 'Navi Mumbai',network: 'OLT-NM-01', expiry: '2026-06-30', status: 'active' },
  { id: 'RES-2026-0028', name: 'Mahesh Patkar',      phone: '97100 90123', services: ['Broadband'],                        plan: 'FTTH 100Mbps',     zone: 'Mira Road',    area: 'Mira Road', network: 'OLT-MR-01', expiry: '2026-04-25', status: 'active' },
  { id: 'RES-2026-0029', name: 'Jayashree Kulkarni', phone: '96100 01234', services: ['Broadband','OTT','Business BB'],    plan: 'FTTH 500Mbps',     zone: 'Powai',        area: 'Powai',     network: 'OLT-PW-01', expiry: '2026-08-20', status: 'active' },
]

const ZONES      = [...new Set(CUSTOMERS.map(c => c.zone))].sort()
const AREAS      = [...new Set(CUSTOMERS.map(c => c.area))].sort()
const NETWORKS   = [...new Set(CUSTOMERS.map(c => c.network))].sort()
const ALL_SERVICES = ['Broadband','Landline','OTT','ILL','Intercom','Business BB']
const PLANS      = [...new Set(CUSTOMERS.map(c => c.plan))].sort()
const LOCALITIES = ['Lokhandwala','Versova','MIDC','Juhu Scheme','Malad Link Road','Powai Lake Road','BKC Road','Nariman Point','Lower Parel West']
const BRANCHES   = ['Andheri Branch','Bandra Branch','Borivali Branch','Thane Branch','Powai Branch','South Mumbai Branch']
const SALES_PERSONS = ['Pradeep Kumar','Salim Khan','Neha Gupta','Rajesh Patel','Ananya Mehta']
const ENGINEERS  = ['Arjun Kumar','Preethi Nair','Suresh Babu','Kiran Desai','Vinod Sharma']
const PARTNERS   = ['CityLink Franchise - Andheri','NetPoint Partners - Bandra','Speedy Net - Thane','ConnectPro - Powai']

const PAGE_SIZE = 25
const STATUS_TABS = ['All','Active','Suspended','Inactive','Expired']

// ── Sub-components ───────────────────────────────────────────────────────────

function ServicePill({ service }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SERVICE_STYLE[service] ?? 'bg-gray-100 text-gray-600'}`}>
      {service}
    </span>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-white border border-surface-border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer"
      >
        <option value="">{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Customers() {
  const navigate = useNavigate()

  const [search,          setSearch]          = useState('')
  const [statusTab,       setStatusTab]       = useState('All')
  const [selected,        setSelected]        = useState(new Set())
  const [page,            setPage]            = useState(1)

  // Applied filters (drive the table)
  const [filterService,   setFilterService]   = useState('')
  const [filterZone,      setFilterZone]      = useState('')
  const [filterArea,      setFilterArea]      = useState('')
  const [filterNetwork,   setFilterNetwork]   = useState('')
  const [filterLocality,  setFilterLocality]  = useState('')
  const [filterBranch,    setFilterBranch]    = useState('')
  const [filterSales,     setFilterSales]     = useState('')
  const [filterEngineer,  setFilterEngineer]  = useState('')
  const [filterPartner,   setFilterPartner]   = useState('')
  const [filterCustType,  setFilterCustType]  = useState('')
  const [filterPipeline,  setFilterPipeline]  = useState('')
  const [filterOnline,    setFilterOnline]    = useState('')
  const [filterPlan,      setFilterPlan]      = useState('')
  const [filterRegFrom,   setFilterRegFrom]   = useState('')
  const [filterRegTo,     setFilterRegTo]     = useState('')
  const [filterExpFrom,   setFilterExpFrom]   = useState('')
  const [filterExpTo,     setFilterExpTo]     = useState('')
  const [filterDueFrom,   setFilterDueFrom]   = useState('')
  const [filterDueTo,     setFilterDueTo]     = useState('')

  // Drawer state (draft — only applied on "Apply Filters")
  const EMPTY_DRAFT = {
    service: '', zone: '', area: '', network: '', locality: '', branch: '',
    sales: '', engineer: '', partner: '', custType: '', pipeline: '',
    online: '', plan: '', regFrom: '', regTo: '', expFrom: '', expTo: '',
    dueFrom: '', dueTo: '',
  }
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft,      setDraft]      = useState(EMPTY_DRAFT)

  function openDrawer() {
    setDraft({
      service: filterService, zone: filterZone, area: filterArea, network: filterNetwork,
      locality: filterLocality, branch: filterBranch, sales: filterSales,
      engineer: filterEngineer, partner: filterPartner, custType: filterCustType,
      pipeline: filterPipeline, online: filterOnline, plan: filterPlan,
      regFrom: filterRegFrom, regTo: filterRegTo, expFrom: filterExpFrom,
      expTo: filterExpTo, dueFrom: filterDueFrom, dueTo: filterDueTo,
    })
    setDrawerOpen(true)
  }

  function applyDrawer() {
    setFilterService(draft.service);   setFilterZone(draft.zone);
    setFilterArea(draft.area);         setFilterNetwork(draft.network);
    setFilterLocality(draft.locality); setFilterBranch(draft.branch);
    setFilterSales(draft.sales);       setFilterEngineer(draft.engineer);
    setFilterPartner(draft.partner);   setFilterCustType(draft.custType);
    setFilterPipeline(draft.pipeline); setFilterOnline(draft.online);
    setFilterPlan(draft.plan);         setFilterRegFrom(draft.regFrom);
    setFilterRegTo(draft.regTo);       setFilterExpFrom(draft.expFrom);
    setFilterExpTo(draft.expTo);       setFilterDueFrom(draft.dueFrom);
    setFilterDueTo(draft.dueTo);
    setPage(1)
    setDrawerOpen(false)
  }

  function resetDrawer() { setDraft(EMPTY_DRAFT) }

  function d(key, val) { setDraft(prev => ({ ...prev, [key]: val })) }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return CUSTOMERS.filter(c => {
      if (q && !c.name.toLowerCase().includes(q) && !c.phone.includes(q) && !c.id.toLowerCase().includes(q)) return false
      if (statusTab !== 'All' && c.status !== statusTab.toLowerCase()) return false
      if (filterService  && !c.services.includes(filterService)) return false
      if (filterZone     && c.zone    !== filterZone)             return false
      if (filterArea     && c.area    !== filterArea)             return false
      if (filterNetwork  && c.network !== filterNetwork)          return false
      if (filterPlan     && c.plan    !== filterPlan)             return false
      if (filterExpFrom  && c.expiry  <  filterExpFrom)           return false
      if (filterExpTo    && c.expiry  >  filterExpTo)             return false
      if (filterPipeline && filterPipeline === 'Residential' && !c.id.startsWith('RES')) return false
      if (filterPipeline && filterPipeline === 'Enterprise'  && !c.id.startsWith('ENT')) return false
      return true
    })
  }, [search, statusTab, filterService, filterZone, filterArea, filterNetwork,
      filterPlan, filterExpFrom, filterExpTo, filterPipeline])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const allOnPage = paginated.length > 0 && paginated.every(r => selected.has(r.id))

  function toggleAll() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allOnPage) paginated.forEach(r => next.delete(r.id))
      else           paginated.forEach(r => next.add(r.id))
      return next
    })
  }

  function toggleRow(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearAllFilters() {
    setFilterService(''); setFilterZone(''); setFilterArea(''); setFilterNetwork('')
    setFilterLocality(''); setFilterBranch(''); setFilterSales(''); setFilterEngineer('')
    setFilterPartner(''); setFilterCustType(''); setFilterPipeline(''); setFilterOnline('')
    setFilterPlan(''); setFilterRegFrom(''); setFilterRegTo('')
    setFilterExpFrom(''); setFilterExpTo(''); setFilterDueFrom(''); setFilterDueTo('')
    setPage(1)
  }

  const activeFiltersCount = [
    filterService, filterZone, filterArea, filterNetwork,
    filterLocality, filterBranch, filterSales, filterEngineer, filterPartner,
    filterCustType, filterPipeline, filterOnline, filterPlan,
    filterRegFrom, filterRegTo, filterExpFrom, filterExpTo, filterDueFrom, filterDueTo,
  ].filter(Boolean).length

  const statusCounts = useMemo(() => {
    const base = { All: CUSTOMERS.length, Active: 0, Suspended: 0, Inactive: 0, Expired: 0 }
    CUSTOMERS.forEach(c => { const k = c.status.charAt(0).toUpperCase() + c.status.slice(1); if (k in base) base[k]++ })
    return base
  }, [])

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} of {CUSTOMERS.length} customers
            {selected.size > 0 && <span className="ml-2 font-medium text-brand-blue">· {selected.size} selected</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button variant="secondary" size="sm" icon={<Download size={14} />}>
              Export ({selected.size})
            </Button>
          )}
          {selected.size === 0 && (
            <Button variant="secondary" size="sm" icon={<Download size={14} />}>Export</Button>
          )}
          <Button size="sm" icon={<UserPlus size={14} />} onClick={() => navigate('/customers/new')}>Add Customer</Button>
        </div>
      </div>

      {/* ── Search + filter bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name, phone, customer ID, MAC, serial…"
            className="pl-9 pr-8 py-1.5 text-sm w-72 bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filters button → opens drawer */}
        <button
          onClick={openDrawer}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors shrink-0 ${
            activeFiltersCount > 0
              ? 'bg-brand-blue text-white border-brand-blue hover:bg-brand-blue/90'
              : 'bg-white text-gray-700 border-surface-border hover:bg-gray-50'
          }`}
        >
          <Filter size={13} />
          Filters
          {activeFiltersCount > 0 && (
            <span className="bg-white/25 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold leading-none">{activeFiltersCount}</span>
          )}
        </button>

        {activeFiltersCount > 0 && (
          <button onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1">
            <X size={12} /> Clear filters
          </button>
        )}

        {/* Status tabs */}
        <div className="flex gap-1 ml-auto bg-gray-100 rounded-lg p-0.5">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setStatusTab(tab); setPage(1) }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${statusTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab}
              <span className={`ml-1.5 text-xs ${statusTab === tab ? 'text-brand-blue' : 'text-gray-400'}`}>
                {statusCounts[tab]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter Drawer ── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[1000]" onClick={() => setDrawerOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-80 bg-white z-[1001] shadow-2xl flex flex-col">

            {/* Header */}
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
              <button onClick={() => setDrawerOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

              {/* Section 1 — Temporal */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Temporal</p>
                {[
                  ['Registration Date', 'regFrom', 'regTo'],
                  ['Expiry Date',       'expFrom', 'expTo'],
                  ['Due Date',          'dueFrom', 'dueTo'],
                ].map(([label, fromKey, toKey]) => (
                  <div key={label} className="space-y-1">
                    <p className="text-xs text-gray-600 font-medium">{label}</p>
                    <div className="flex items-center gap-2">
                      <input type="date" value={draft[fromKey]} onChange={e => d(fromKey, e.target.value)}
                        className="flex-1 text-xs border border-surface-border rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 min-w-0" />
                      <span className="text-xs text-gray-400 shrink-0">–</span>
                      <input type="date" value={draft[toKey]} onChange={e => d(toKey, e.target.value)}
                        className="flex-1 text-xs border border-surface-border rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 min-w-0" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Section 2 — Geographic */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Geographic</p>
                {[
                  ['Area',        'area',     AREAS],
                  ['Locality',    'locality', LOCALITIES],
                  ['Branch',      'branch',   BRANCHES],
                  ['Zone',        'zone',     ZONES],
                ].map(([label, key, opts]) => (
                  <div key={label} className="space-y-1">
                    <p className="text-xs text-gray-600 font-medium">{label}</p>
                    <div className="relative">
                      <select value={draft[key]} onChange={e => d(key, e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-1.5 text-sm bg-white border border-surface-border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
                        <option value="">All</option>
                        {opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Section 3 — Sales / Team */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sales / Team</p>
                {[
                  ['Sales Person',        'sales',    SALES_PERSONS],
                  ['Assigned Engineer',   'engineer', ENGINEERS],
                  ['Partner / Franchise', 'partner',  PARTNERS],
                ].map(([label, key, opts]) => (
                  <div key={label} className="space-y-1">
                    <p className="text-xs text-gray-600 font-medium">{label}</p>
                    <div className="relative">
                      <select value={draft[key]} onChange={e => d(key, e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-1.5 text-sm bg-white border border-surface-border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
                        <option value="">All</option>
                        {opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Section 4 — Status / Type */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status / Type</p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600 font-medium">Customer Type</p>
                  <div className="flex gap-4">
                    {['', 'Individual', 'Corporate'].map(v => (
                      <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="draft-custType" value={v} checked={draft.custType === v}
                          onChange={() => d('custType', v)} className="accent-brand-blue" />
                        <span className="text-xs text-gray-700">{v || 'All'}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600 font-medium">Pipeline</p>
                  <div className="flex gap-4">
                    {['', 'Residential', 'Enterprise'].map(v => (
                      <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="draft-pipeline" value={v} checked={draft.pipeline === v}
                          onChange={() => d('pipeline', v)} className="accent-brand-blue" />
                        <span className="text-xs text-gray-700">{v || 'All'}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600 font-medium">Service Type</p>
                  <div className="relative">
                    <select value={draft.service} onChange={e => d('service', e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-1.5 text-sm bg-white border border-surface-border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
                      <option value="">All</option>
                      {ALL_SERVICES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Section 5 — Technical */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Technical</p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600 font-medium">Online / Offline</p>
                  <div className="flex gap-4">
                    {['', 'Online', 'Offline'].map(v => (
                      <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="draft-online" value={v} checked={draft.online === v}
                          onChange={() => d('online', v)} className="accent-brand-blue" />
                        <span className="text-xs text-gray-700">{v || 'All'}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600 font-medium">Package Name</p>
                  <div className="relative">
                    <select value={draft.plan} onChange={e => d('plan', e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-1.5 text-sm bg-white border border-surface-border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
                      <option value="">All</option>
                      {PLANS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-surface-border flex items-center gap-3 shrink-0 bg-white">
              <button onClick={resetDrawer}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-surface-border rounded-lg hover:bg-gray-50 transition-colors">
                Reset Filters
              </button>
              <button onClick={applyDrawer}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors">
                Apply Filters
              </button>
            </div>

          </div>
        </>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPage}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Customer ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Services</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Users size={32} className="mx-auto mb-2 text-gray-200" />
                    No customers found
                  </td>
                </tr>
              ) : paginated.map(c => {
                const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.inactive
                const isSelected = selected.has(c.id)
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className={`cursor-pointer transition-colors hover:bg-blue-50/40 ${isSelected ? 'bg-brand-blue/5' : ''}`}
                  >
                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleRow(c.id) }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(c.id)}
                        className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-brand-blue font-semibold">{c.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800 whitespace-nowrap">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">{c.phone}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.services.map(s => <ServicePill key={s} service={s} />)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{c.plan}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{c.zone}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{c.expiry}</td>
                    <td className="px-4 py-3">
                      <Badge variant={cfg.variant} dot size="sm">{cfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          className="px-2.5 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue/10 rounded transition-colors"
                        >
                          View
                        </button>
                        <button className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors">
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50/40">
          <p className="text-xs text-gray-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-all ${p === page ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
