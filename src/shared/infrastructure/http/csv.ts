/** Serialização de planilhas para download. */

/**
 * Serializa uma tabela em CSV para download.
 *
 * Duas decisões que não são estéticas:
 *
 *  - **Ponto e vírgula como separador.** O Excel em português usa vírgula como
 *    separador DECIMAL; com vírgula separando colunas, todo número quebra a
 *    linha em duas células.
 *
 *  - **Neutralização de fórmula (CSV injection).** Célula iniciada por `=`,
 *    `+`, `-`, `@`, tab ou CR é interpretada como fórmula pelo Excel e pelo
 *    Sheets. Como o conteúdo vem de campos que o usuário digita (nome de
 *    material, motivo de ajuste), um `=HYPERLINK(...)` gravado no cadastro
 *    executaria na máquina de quem abrisse a planilha. O apóstrofo à frente
 *    força a leitura como texto.
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

  // BOM: sem ele o Excel no Windows abre o arquivo em ANSI e os acentos viram
  // caracteres estranhos.
  return `﻿${lines.join("\r\n")}\r\n`;
}
