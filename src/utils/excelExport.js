// Shared Excel export helper — wraps the `xlsx` package (already a listed
// dependency in package.json, previously unused anywhere in the app) so
// every "Export Excel" button in Inventory builds its workbook the same
// way instead of each page re-implementing writeFile/book_new plumbing.
import * as XLSX from 'xlsx'

// sheets: [{ name, rows: [{ ColumnHeader: value, ... }] }] — each row's
// object keys become that sheet's column headers, in insertion order.
// Sheet names are truncated to 31 chars, Excel's own hard limit.
export function exportWorkbook(filename, sheets) {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows && rows.length ? rows : [{}])
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  })
  XLSX.writeFile(wb, filename)
}
