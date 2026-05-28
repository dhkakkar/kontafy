import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

/**
 * Tiny config-driven helper shared by all transaction-import services.
 * Wraps the boilerplate of:
 *   1. parse XLSX/CSV → row dictionaries (snake-cased headers)
 *   2. group rows by a key column (for invoices, bills, journals)
 *   3. iterate groups → call a `commit` function → collect results
 *
 * Deliberately small. Each import type still owns its own validation,
 * lookups, and entity-build logic — the runner just removes the
 * parse/group/iterate boilerplate so adding a new type is mostly
 * config + a `commit` closure, not a copy-paste of 200 lines.
 */

export interface ImportRowError {
  row?: number;
  group?: string;
  field?: string;
  message: string;
}

export interface ImportRunResult<T = any> {
  total: number;
  imported: number;
  skipped: number;
  errors: ImportRowError[];
  // Optional: the records the commit closure created, in order. Handy
  // when the caller wants to surface IDs back to the user (e.g. a list
  // of newly-minted invoice numbers).
  created?: T[];
}

export interface ParseOptions {
  // If set, only these snake_cased header keys are kept on each row.
  // Useful to defend against stray columns the user added to the
  // template — the rest are silently dropped.
  allowedKeys?: string[];
}

/**
 * Parse a CSV/XLSX buffer into plain row dictionaries. Headers in row
 * 1 are normalised: lowercased, non-alphanumeric → underscore, so
 * "Invoice No" / "INVOICE_NO" / "invoice-no" all map to the same
 * `invoice_no` key.
 */
export async function parseSheetToRows(
  buffer: Buffer,
  format: string,
  options: ParseOptions = {},
): Promise<Array<Record<string, string>>> {
  const workbook = new ExcelJS.Workbook();
  if (format === 'csv' || format === 'text/csv') {
    // ExcelJS's CSV reader wants a Readable; the buffer-stream wrap
    // is the standard idiom.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Readable } = require('stream') as typeof import('stream');
    await workbook.csv.read(Readable.from(buffer));
  } else {
    await workbook.xlsx.load(buffer as any);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    throw new BadRequestException('File is empty or has no data rows');
  }

  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, colNum) => {
    headers[colNum] = String(cell.value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  });

  const allow = options.allowedKeys
    ? new Set(options.allowedKeys)
    : null;

  const rows: Array<Record<string, string>> = [];
  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const record: Record<string, string> = {};
    row.eachCell((cell, colNum) => {
      const key = headers[colNum];
      if (!key) return;
      if (allow && !allow.has(key)) return;
      let v: any = cell.value;
      // ExcelJS gives us Date objects for date-typed cells, formula
      // result wrappers, and rich-text. Flatten everything to a
      // trimmed string so downstream parsers don't have to special-case.
      if (v && typeof v === 'object') {
        if (v instanceof Date) v = v.toISOString().slice(0, 10);
        else if ('result' in v) v = (v as any).result;
        else if ('text' in v) v = (v as any).text;
      }
      record[key] = v != null ? String(v).trim() : '';
    });
    if (Object.values(record).some((v) => v !== '')) {
      rows.push(record);
    }
  });

  return rows;
}

/**
 * Group rows by a key column. Order of first occurrence is preserved
 * so the iteration order matches the source file — important for
 * deterministic invoice / journal number sequencing on import.
 */
export function groupRows<T extends Record<string, any>>(
  rows: T[],
  key: string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const id = (row[key] || '').toString().trim();
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(row);
  }
  return map;
}

/**
 * Iterate groups, call commit per group, accumulate result. Errors
 * thrown inside the commit closure are caught per group so one bad
 * invoice doesn't abort the whole import.
 */
export async function runGroupedImport<T extends Record<string, any>, R = any>(
  groups: Map<string, T[]>,
  commit: (groupKey: string, rows: T[]) => Promise<R>,
): Promise<ImportRunResult<R>> {
  const result: ImportRunResult<R> = {
    total: groups.size,
    imported: 0,
    skipped: 0,
    errors: [],
    created: [],
  };

  for (const [key, rows] of groups.entries()) {
    try {
      const created = await commit(key, rows);
      result.imported += 1;
      result.created!.push(created);
    } catch (err) {
      result.skipped += 1;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push({ group: key, message: msg });
    }
  }

  return result;
}
