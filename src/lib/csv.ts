/**
 * Penjanaan CSV untuk eksport tuntutan panel.
 *
 * Fail ini dimasukkan ke portal TPA dan dibuka dalam Excel, jadi pemetikan
 * mesti betul: nama pesakit boleh mengandungi koma, dan nombor IC mesti kekal
 * sebagai teks dan bukan ditukar Excel kepada notasi saintifik.
 */

/** Memetik satu medan CSV mengikut RFC 4180. */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function csvRow(fields: unknown[]): string {
  return fields.map(csvField).join(",");
}

/**
 * Membina dokumen CSV lengkap.
 *
 * BOM UTF-8 dimasukkan supaya Excel di Windows memaparkan nama Melayu dengan
 * betul, dan hujung baris CRLF digunakan kerana itu yang dijangka Excel.
 */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [csvRow(headers), ...rows.map(csvRow)];
  return `﻿${lines.join("\r\n")}\r\n`;
}
