/** Spreadsheet serialization for download. */

/**
 * Serializes a table as CSV for download.
 *
 * Two decisions that are not cosmetic:
 *
 *  - **Semicolon as the separator.** Excel in pt-BR uses the comma as the
 *    DECIMAL separator; with commas between columns, every number splits the
 *    row into two cells.
 *
 *  - **Formula neutralization (CSV injection).** A cell starting with `=`,
 *    `+`, `-`, `@`, tab or CR is treated as a formula by Excel and Sheets.
 *    Since the content comes from user-typed fields (material name, adjustment
 *    reason), a `=HYPERLINK(...)` stored in the catalog would run on the
 *    machine of whoever opened the sheet. The leading apostrophe forces it to
 *    be read as text.
 */
export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (value: string | number | null): string => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const lines = [headers.map(escape).join(";")];
  for (const row of rows) lines.push(row.map(escape).join(";"));

  // BOM: without it Excel on Windows opens the file as ANSI and accented
  // characters turn into mojibake.
  return `﻿${lines.join("\r\n")}\r\n`;
}
