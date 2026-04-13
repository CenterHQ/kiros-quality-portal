import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
} from 'docx'
import ExcelJS from 'exceljs'
import type { BrandConfig } from '@/lib/ai-config'
import { DEFAULT_BRAND } from '@/lib/document-templates'

// ============================================
// REPORT EXTRACT - EXPORT FORMATTERS
// ============================================
// Converts tabular data (columns + rows) into various file formats.

const BRAND = {
  primary: DEFAULT_BRAND.primary,
  primaryRgb: DEFAULT_BRAND.primaryRgb,
  centreName: DEFAULT_BRAND.centreName,
  tagline: 'Data Extract Report',
} as const

export interface TabularData {
  title: string
  labels: string[]       // column headers
  rows: unknown[][]      // data rows
  generatedAt?: string   // ISO timestamp
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function sanitiseFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 80)
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function exportToCsv(data: TabularData): { buffer: Buffer; filename: string; contentType: string } {
  const lines: string[] = []

  // Header row
  lines.push(data.labels.map(escapeCsv).join(','))

  // Data rows
  for (const row of data.rows) {
    lines.push(row.map(v => escapeCsv(formatValue(v))).join(','))
  }

  const csv = lines.join('\n')
  return {
    buffer: Buffer.from(csv, 'utf-8'),
    filename: `${sanitiseFilename(data.title)}_${new Date().toISOString().split('T')[0]}.csv`,
    contentType: 'text/csv',
  }
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

// ─── JSON ────────────────────────────────────────────────────────────────────

export function exportToJson(data: TabularData): { buffer: Buffer; filename: string; contentType: string } {
  const objects = data.rows.map(row => {
    const obj: Record<string, unknown> = {}
    data.labels.forEach((label, i) => {
      obj[label] = row[i]
    })
    return obj
  })

  const json = JSON.stringify({
    title: data.title,
    generated_at: data.generatedAt ?? new Date().toISOString(),
    total_rows: data.rows.length,
    data: objects,
  }, null, 2)

  return {
    buffer: Buffer.from(json, 'utf-8'),
    filename: `${sanitiseFilename(data.title)}_${new Date().toISOString().split('T')[0]}.json`,
    contentType: 'application/json',
  }
}

// ─── Markdown ────────────────────────────────────────────────────────────────

export function exportToMarkdown(data: TabularData): { buffer: Buffer; filename: string; contentType: string } {
  const lines: string[] = []
  lines.push(`# ${data.title}`)
  lines.push(``)
  lines.push(`*Generated: ${data.generatedAt ?? new Date().toISOString()} | ${data.rows.length} rows*`)
  lines.push(``)

  // Table header
  lines.push(`| ${data.labels.join(' | ')} |`)
  lines.push(`| ${data.labels.map(() => '---').join(' | ')} |`)

  // Table rows
  for (const row of data.rows) {
    const cells = row.map(v => formatValue(v).replace(/\|/g, '\\|').replace(/\n/g, ' '))
    lines.push(`| ${cells.join(' | ')} |`)
  }

  return {
    buffer: Buffer.from(lines.join('\n'), 'utf-8'),
    filename: `${sanitiseFilename(data.title)}_${new Date().toISOString().split('T')[0]}.md`,
    contentType: 'text/markdown',
  }
}

// ─── HTML ────────────────────────────────────────────────────────────────────

export function exportToHtml(data: TabularData, brand?: BrandConfig): { buffer: Buffer; filename: string; contentType: string } {
  const b = brand || BRAND
  const rows = data.rows.map(row =>
    `<tr>${row.map(v => `<td>${escapeHtml(formatValue(v))}</td>`).join('')}</tr>`
  ).join('\n')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; background: #fafafa; color: #333; }
    .header { background: ${b.primary}; color: white; padding: 1.5rem 2rem; border-radius: 8px 8px 0 0; margin-bottom: 0; }
    .header h1 { font-size: 1.5rem; font-weight: 600; }
    .header p { font-size: 0.875rem; opacity: 0.85; margin-top: 0.25rem; }
    .meta { padding: 0.75rem 2rem; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; font-size: 0.813rem; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; overflow: hidden; }
    th { background: #f9fafb; font-weight: 600; text-align: left; padding: 0.75rem 1rem; border-bottom: 2px solid #e5e7eb; font-size: 0.813rem; text-transform: uppercase; letter-spacing: 0.025em; color: #374151; white-space: nowrap; }
    td { padding: 0.625rem 1rem; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
    tr:hover td { background: #f9fafb; }
    tr:last-child td { border-bottom: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(data.title)}</h1>
    <p>${b.centreName} - ${b.tagline || BRAND.tagline}</p>
  </div>
  <div class="meta">${data.rows.length} rows | Generated ${data.generatedAt ?? new Date().toISOString()}</div>
  <table>
    <thead>
      <tr>${data.labels.map(l => `<th>${escapeHtml(l)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`

  return {
    buffer: Buffer.from(html, 'utf-8'),
    filename: `${sanitiseFilename(data.title)}_${new Date().toISOString().split('T')[0]}.html`,
    contentType: 'text/html',
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── XLSX (Excel) ────────────────────────────────────────────────────────────

export async function exportToXlsx(data: TabularData, brand?: BrandConfig): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const b = brand || BRAND
  const workbook = new ExcelJS.Workbook()
  workbook.creator = b.centreName
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Extract')

  // Title row
  sheet.mergeCells(1, 1, 1, data.labels.length || 1)
  const titleCell = sheet.getCell('A1')
  titleCell.value = data.title
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${b.primary.slice(1)}` } }
  titleCell.alignment = { vertical: 'middle' }
  sheet.getRow(1).height = 30

  // Subtitle row
  sheet.mergeCells(2, 1, 2, data.labels.length || 1)
  const subCell = sheet.getCell('A2')
  subCell.value = `${b.centreName} | ${data.rows.length} rows | ${data.generatedAt ?? new Date().toISOString()}`
  subCell.font = { size: 9, italic: true, color: { argb: 'FF6B7280' } }

  // Header row
  const headerRow = sheet.getRow(4)
  data.labels.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = label
    cell.font = { bold: true, size: 10, color: { argb: 'FF374151' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
    cell.border = {
      bottom: { style: 'medium' as const, color: { argb: 'FFE5E7EB' } },
    }
  })

  // Data rows
  data.rows.forEach((row, rowIdx) => {
    const excelRow = sheet.getRow(5 + rowIdx)
    row.forEach((val, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1)
      if (typeof val === 'number') {
        cell.value = val
      } else if (val instanceof Date) {
        cell.value = val
        cell.numFmt = 'yyyy-mm-dd'
      } else {
        cell.value = formatValue(val)
      }
      cell.font = { size: 10 }
      cell.border = {
        bottom: { style: 'thin' as const, color: { argb: 'FFF3F4F6' } },
      }
    })
  })

  // Auto-fit column widths (approximate)
  data.labels.forEach((label, i) => {
    const col = sheet.getColumn(i + 1)
    let maxLen = label.length
    for (const row of data.rows.slice(0, 100)) {
      const valLen = formatValue(row[i]).length
      if (valLen > maxLen) maxLen = valLen
    }
    col.width = Math.min(Math.max(maxLen + 2, 10), 50)
  })

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  return {
    buffer,
    filename: `${sanitiseFilename(data.title)}_${new Date().toISOString().split('T')[0]}.xlsx`,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export async function exportToPdf(data: TabularData, brand?: BrandConfig): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const b = brand || BRAND
  const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 8, fontFamily: 'Helvetica' },
    header: { backgroundColor: b.primary, padding: 15, marginBottom: 10, borderRadius: 4 },
    headerTitle: { color: 'white', fontSize: 14, fontWeight: 'bold', fontFamily: 'Helvetica-Bold' },
    headerSub: { color: '#e0d4f5', fontSize: 8, marginTop: 3 },
    meta: { fontSize: 7, color: '#6b7280', marginBottom: 10 },
    table: { display: 'flex' as const, flexDirection: 'column' as const, width: '100%' },
    tableRow: { flexDirection: 'row' as const, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
    tableHeaderRow: { flexDirection: 'row' as const, backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#d1d5db' },
    tableCell: { padding: '4 6', flex: 1, overflow: 'hidden' },
    tableCellText: { fontSize: 7 },
    tableHeaderText: { fontSize: 7, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', color: '#374151' },
  })

  // Limit columns for PDF readability (max 10)
  const maxCols = Math.min(data.labels.length, 10)
  const labels = data.labels.slice(0, maxCols)
  const rows = data.rows.map(r => r.slice(0, maxCols))

  const PdfDoc = React.createElement(Document, {},
    React.createElement(Page, { size: 'A4', orientation: maxCols > 6 ? 'landscape' : 'portrait', style: styles.page },
      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.headerTitle }, data.title),
        React.createElement(Text, { style: styles.headerSub }, `${b.centreName} - ${b.tagline || BRAND.tagline}`),
      ),
      // Meta
      React.createElement(Text, { style: styles.meta },
        `${data.rows.length} rows | Generated ${data.generatedAt ?? new Date().toISOString()}${maxCols < data.labels.length ? ` | Showing ${maxCols} of ${data.labels.length} columns` : ''}`
      ),
      // Table
      React.createElement(View, { style: styles.table },
        // Header row
        React.createElement(View, { style: styles.tableHeaderRow },
          ...labels.map((label, i) =>
            React.createElement(View, { key: `h${i}`, style: styles.tableCell },
              React.createElement(Text, { style: styles.tableHeaderText }, label)
            )
          )
        ),
        // Data rows (limit to 500 for PDF)
        ...rows.slice(0, 500).map((row, ri) =>
          React.createElement(View, { key: `r${ri}`, style: styles.tableRow },
            ...row.map((val, ci) =>
              React.createElement(View, { key: `c${ci}`, style: styles.tableCell },
                React.createElement(Text, { style: styles.tableCellText }, formatValue(val).substring(0, 100))
              )
            )
          )
        ),
        // Truncation notice
        ...(data.rows.length > 500
          ? [React.createElement(View, { key: 'trunc', style: { ...styles.tableRow, backgroundColor: '#fef8ec' } },
              React.createElement(View, { style: { ...styles.tableCell, flex: maxCols } },
                React.createElement(Text, { style: { ...styles.tableCellText, color: '#92400e' } },
                  `... and ${data.rows.length - 500} more rows (use CSV or Excel for full data)`
                )
              )
            )]
          : [])
      )
    )
  )

  const buffer = await renderToBuffer(PdfDoc)
  return {
    buffer: Buffer.from(buffer),
    filename: `${sanitiseFilename(data.title)}_${new Date().toISOString().split('T')[0]}.pdf`,
    contentType: 'application/pdf',
  }
}

// ─── DOCX (Word) ─────────────────────────────────────────────────────────────

export async function exportToDocx(data: TabularData, brand?: BrandConfig): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const b = brand || BRAND
  // Limit columns for readability
  const maxCols = Math.min(data.labels.length, 12)
  const labels = data.labels.slice(0, maxCols)
  const rows = data.rows.map(r => r.slice(0, maxCols))

  const headerRow = new TableRow({
    tableHeader: true,
    children: labels.map(label =>
      new TableCell({
        width: { size: Math.floor(100 / labels.length), type: WidthType.PERCENTAGE },
        shading: { fill: 'F3F4F6' },
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 16, font: 'Calibri' })],
          }),
        ],
      })
    ),
  })

  const dataRows = rows.slice(0, 1000).map(row =>
    new TableRow({
      children: row.map(val =>
        new TableCell({
          width: { size: Math.floor(100 / labels.length), type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [new TextRun({ text: formatValue(val).substring(0, 200), size: 16, font: 'Calibri' })],
            }),
          ],
        })
      ),
    })
  )

  const doc = new DocxDocument({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: data.title, bold: true, size: 32, color: b.primary.slice(1), font: 'Calibri' }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${b.centreName} | ${data.rows.length} rows | Generated ${data.generatedAt ?? new Date().toISOString()}`,
                size: 18,
                italics: true,
                color: '6B7280',
                font: 'Calibri',
              }),
            ],
            spacing: { after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
          ...(data.rows.length > 1000
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `\n... and ${data.rows.length - 1000} more rows (use CSV or Excel for full data)`,
                      italics: true,
                      color: '92400E',
                      size: 18,
                      font: 'Calibri',
                    }),
                  ],
                  spacing: { before: 200 },
                }),
              ]
            : []),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return {
    buffer: Buffer.from(buffer),
    filename: `${sanitiseFilename(data.title)}_${new Date().toISOString().split('T')[0]}.docx`,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
}
