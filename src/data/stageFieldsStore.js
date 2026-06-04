function field(id, label, type, required, options = []) {
  return { id, label, type, required, active: true, placeholder: '', help: '', options }
}

const PLANS = ['50 Mbps', '100 Mbps', '200 Mbps', '500 Mbps', '1 Gbps']

const INIT = {
  s1: [],
  s2: [
    field('s2-f1', 'Contact Method', 'Dropdown', true,  ['Call', 'WhatsApp', 'Email', 'Visit']),
    field('s2-f2', 'Interested',     'Dropdown', true,  ['Yes', 'No', 'Maybe']),
    field('s2-f3', 'Contact Notes',  'Textarea', false),
  ],
  s3: [],
  s4: [
    field('s4-f1', 'Enter Locality Name',       'Text',     true),
    field('s4-f2', 'Enter Sub Locality Name',   'Text',     false),
    field('s4-f3', 'Complete Address',          'Textarea', true),
    field('s4-f4', 'Landmark',                  'Text',     false),
    field('s4-f5', 'Expected Connection Type',  'Dropdown', false, ['FTTH', 'Sector', 'Village']),
    field('s4-f6', 'Customer Requirement',      'Textarea', false),
    field('s4-f7', 'Assigned Branch',           'Dropdown', false, ['CNPL-001', 'CNPL-002', 'CNPL-WHI-01', 'CNPL-MAR-01', 'CNPL-IND-01', 'CNPL-NOI-01']),
    field('s4-f8', 'Remarks',                   'Textarea', false),
  ],
  s5: [
    field('s5-f1', 'Quotation Amount',     'Number',   true),
    field('s5-f2', 'Plan Offered',         'Dropdown', true,  PLANS),
    field('s5-f3', 'Installation Charges', 'Number',   false),
    field('s5-f4', 'Valid Until',          'Date',     false),
  ],
  s5d: [
    field('s5d-f1', 'Installation Date', 'Date', true),
    field('s5d-f2', 'Installation Time', 'Time', true),
  ],
  s6: [
    field('s6-f1', 'Installation Date',   'Date',     true),
    field('s6-f2', 'Technician Assigned', 'Text',     true),
    field('s6-f3', 'Final Plan',          'Dropdown', true, PLANS),
    field('s6-f4', 'Final Amount',        'Number',   true),
  ],
  s7: [
    field('s7-f1', 'Lost Reason', 'Dropdown', true,  ['Price Too High', 'No Feasibility', 'Competition', 'Not Interested', 'Other']),
    field('s7-f2', 'Lost Notes',  'Textarea', false),
  ],
  b4: [
    field('b4-f1', 'Customer Concern', 'Textarea', false),
    field('b4-f2', 'Offered Discount', 'Number',   false),
    field('b4-f3', 'Counter Offer',    'Number',   false),
  ],
  e1: [
    { id: 'e1-f1', label: 'Company Name',    type: 'Text',    required: true,  active: true, placeholder: 'e.g. Acme Technologies Pvt Ltd', help: '', options: [] },
    { id: 'e1-f2', label: 'Contact Person',  type: 'Text',    required: true,  active: true, placeholder: 'Primary contact name',           help: '', options: [] },
    { id: 'e1-f3', label: 'GST Registered',  type: 'Radio',   required: true,  active: true, placeholder: '',                               help: '', options: ['Yes', 'No'] },
    { id: 'e1-f4', label: 'GST Number',      type: 'Text',    required: false, active: true, placeholder: 'e.g. 29AABCT1332L1ZB',           help: '', options: [], conditionalOn: { fieldId: 'e1-f3', value: 'Yes' } },
    { id: 'e1-f5', label: 'Company Address', type: 'Textarea',required: false, active: true, placeholder: 'Registered company address',     help: '', options: [], conditionalOn: { fieldId: 'e1-f3', value: 'Yes' } },
  ],
}

const INIT_META = {
  s4: { showFeasibilityBanner: true },
}

let _data = JSON.parse(JSON.stringify(INIT))
let _meta = JSON.parse(JSON.stringify(INIT_META))
const _subs = new Set()

function notify() { _subs.forEach(fn => fn()) }

export function getStageFields(stageId)         { return _data[stageId] ?? [] }
export function setStageFields(stageId, fields) { _data = { ..._data, [stageId]: fields }; notify() }
export function getStageMeta(stageId)           { return _meta[stageId] ?? {} }
export function subscribeStageFields(fn)        { _subs.add(fn); return () => _subs.delete(fn) }
