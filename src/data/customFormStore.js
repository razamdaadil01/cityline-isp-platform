// Module-level store shared between FormBuilder and Sales pages
const INITIAL = {
  B2C: {
    key: 'B2C', name: 'B2C Lead Form', includeFollowUp: true,
    fields: [
      { id: 'b2c-1',  type: 'Text',        label: 'Full Name',       placeholder: 'Enter full name',         required: true,  options: [] },
      { id: 'b2c-2',  type: 'Phone',       label: 'Phone Number',    placeholder: 'Enter phone number',      required: true,  options: [] },
      { id: 'b2c-3',  type: 'Email',       label: 'Email Address',   placeholder: 'Enter email address',     required: false, options: [] },
      { id: 'b2c-4',  type: 'Text',        label: 'Area/Location',   placeholder: 'Enter area or locality',  required: false, options: [] },
      { id: 'b2c-5',  type: 'Dropdown',    label: 'Interested Plan', placeholder: '',                        required: false, options: ['Basic', 'Standard', 'Premium', 'Enterprise'] },
      { id: 'b2c-6',  type: 'Dropdown',    label: 'Lead Source',     placeholder: '',                        required: false, options: ['Walk-in', 'Referral', 'Online', 'Cold Call', 'Social Media', 'Advertisement'] },
      { id: 'b2c-7',  type: 'Textarea',    label: 'Notes',           placeholder: 'Any additional notes…',  required: false, options: [] },
      { id: 'b2c-8',  type: 'File Upload', label: 'Aadhaar Card',    placeholder: '',                        required: false, options: [] },
      { id: 'b2c-9',  type: 'File Upload', label: 'PAN Card',        placeholder: '',                        required: false, options: [] },
      { id: 'b2c-10', type: 'File Upload', label: 'Customer Photo',  placeholder: '',                        required: false, options: [] },
    ],
  },
  B2B: {
    key: 'B2B', name: 'B2B Lead Form', includeFollowUp: true,
    fields: [
      { id: 'b2b-1',  type: 'Text',        label: 'Company Name',                    placeholder: 'Enter company name',           required: true,  options: [] },
      { id: 'b2b-2',  type: 'Text',        label: 'Contact Person',                  placeholder: 'Enter contact person name',    required: true,  options: [] },
      { id: 'b2b-3',  type: 'Phone',       label: 'Phone Number',                    placeholder: 'Enter phone number',           required: true,  options: [] },
      { id: 'b2b-4',  type: 'Email',       label: 'Email Address',                   placeholder: 'Enter email address',          required: true,  options: [] },
      { id: 'b2b-5',  type: 'Text',        label: 'GST Number',                      placeholder: 'Enter GST number',             required: false, options: [] },
      { id: 'b2b-6',  type: 'Number',      label: 'No. of Employees',                placeholder: 'e.g. 50',                      required: false, options: [] },
      { id: 'b2b-7',  type: 'Dropdown',    label: 'Bandwidth Required',              placeholder: '',                             required: false, options: ['10 Mbps', '50 Mbps', '100 Mbps', '500 Mbps', '1 Gbps', '10 Gbps'] },
      { id: 'b2b-8',  type: 'Dropdown',    label: 'Contract Period',                 placeholder: '',                             required: false, options: ['1 Month', '3 Months', '6 Months', '1 Year', '2 Years', '3 Years'] },
      { id: 'b2b-9',  type: 'Textarea',    label: 'Notes',                           placeholder: 'Any additional notes…',        required: false, options: [] },
      { id: 'b2b-10', type: 'File Upload', label: 'Company Registration Certificate', placeholder: '',                            required: false, options: [] },
      { id: 'b2b-11', type: 'File Upload', label: 'GST Certificate',                 placeholder: '',                             required: false, options: [] },
      { id: 'b2b-12', type: 'File Upload', label: 'Director Aadhaar',                placeholder: '',                             required: false, options: [] },
    ],
  },
}

let _modules = JSON.parse(JSON.stringify(INITIAL))
const _listeners = []

export function getFormModules() { return _modules }

export function setFormModule(key, fields) {
  _modules = { ..._modules, [key]: { ..._modules[key], fields } }
  _listeners.forEach(fn => fn(_modules))
}

export function setFormModuleConfig(key, config) {
  _modules = { ..._modules, [key]: { ..._modules[key], ...config } }
  _listeners.forEach(fn => fn(_modules))
}

export function removeFormModule(key) {
  const { [key]: _, ...rest } = _modules
  _modules = rest
  _listeners.forEach(fn => fn(_modules))
}

export function subscribeFormModules(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}
