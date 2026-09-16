// Shared CSV export helper — plain Blob + download-link generation, no
// dependency beyond the browser's own Blob/URL APIs (TicketList.jsx already
// does this inline for its own Export button; this extracts the same
// approach so other pages don't re-implement it). Mirrors the object-array-
// of-rows shape excelExport.js's exportWorkbook() uses for xlsx sheets, just
// producing a single CSV file instead of a workbook.
//
// rows: [{ ColumnHeader: value, ... }] — each row's object keys become the
// CSV header row, in the first row's insertion order.
export function exportCsv(filename, rows) {
  if (!rows || rows.length === 0) return
  const columns = Object.keys(rows[0])
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [columns, ...rows.map(r => columns.map(c => r[c]))]
    .map(r => r.map(escape).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
