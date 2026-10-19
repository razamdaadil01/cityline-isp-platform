export const COMPANY_INFO = {
  name: 'Cityline Internet Services Pvt. Ltd.',
  address: 'Unit 5, Tech Park, Andheri East, Mumbai – 400069, Maharashtra',
  gstin: '27AABCC1234Z1Z5',
  pan: 'AABCC1234Z',
  cin: 'U72200MH2019PTC123456',
  phone: '1800-123-4567',
  email: 'billing@cityline.in',
  website: 'www.cityline.in',
  stateCode: '27',
  stateName: 'Maharashtra',
}

export function amountInWords(n) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function words(num) {
    if (num === 0) return ''
    if (num < 20) return ones[num]
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + words(num % 100) : '')
  }

  let rupees = Math.floor(n)
  const paise = Math.round((n - rupees) * 100)
  let result = ''

  if (rupees >= 10000000) { result += words(Math.floor(rupees / 10000000)) + ' Crore '; rupees %= 10000000 }
  if (rupees >= 100000) { result += words(Math.floor(rupees / 100000)) + ' Lakh '; rupees %= 100000 }
  if (rupees >= 1000) { result += words(Math.floor(rupees / 1000)) + ' Thousand '; rupees %= 1000 }
  if (rupees > 0) result += words(rupees)

  result = result.trim()
  if (!result) result = 'Zero'
  result += ' Rupees'
  if (paise > 0) result += ' and ' + words(paise) + ' Paise'
  return result + ' Only'
}
