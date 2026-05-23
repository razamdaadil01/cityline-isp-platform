function field(id, label, type, required, options = []) {
  return { id, label, type, required, active: true, placeholder: '', help: '', options }
}

const PLANS = ['50 Mbps', '100 Mbps', '200 Mbps', '500 Mbps', '1 Gbps']

const INIT = {
  s1: [
    field('s1-f1', 'Lead Source',     'Dropdown', false, ['Walk-in', 'Website', 'Referral', 'Cold Call', 'Social Media', 'Other']),
    field('s1-f2', 'Interested Plan', 'Dropdown', false, PLANS),
    field('s1-f3', 'Notes',           'Textarea', false),
  ],
  s2: [
    field('s2-f1', 'Contact Method', 'Dropdown', true,  ['Call', 'WhatsApp', 'Email', 'Visit']),
    field('s2-f2', 'Interested',     'Dropdown', true,  ['Yes', 'No', 'Maybe']),
    field('s2-f3', 'Contact Notes',  'Textarea', false),
  ],
  s4: [
    field('s4-f1', 'Feasibility Status',    'Dropdown', true,  ['Feasible', 'Not Feasible', 'Pending']),
    field('s4-f2', 'Nearest Fiber Node',    'Text',     false),
    field('s4-f3', 'Distance from Network', 'Number',   false),
    field('s4-f4', 'Survey Notes',          'Textarea', false),
  ],
  s5: [
    field('s5-f1', 'Quotation Amount',     'Number',   true),
    field('s5-f2', 'Plan Offered',         'Dropdown', true,  PLANS),
    field('s5-f3', 'Installation Charges', 'Number',   false),
    field('s5-f4', 'Valid Until',          'Date',     false),
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
}

let _data = JSON.parse(JSON.stringify(INIT))
const _subs = new Set()

function notify() { _subs.forEach(fn => fn()) }

export function getStageFields(stageId)         { return _data[stageId] ?? [] }
export function setStageFields(stageId, fields) { _data = { ..._data, [stageId]: fields }; notify() }
export function subscribeStageFields(fn)        { _subs.add(fn); return () => _subs.delete(fn) }
