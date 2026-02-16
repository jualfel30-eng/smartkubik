/**
 * Generic file parser for CSV and XLSX imports.
 * Extends the pattern from src/utils/bank-statement.parser.ts
 * but returns raw rows (Record<string, any>[]) for any entity type.
 */
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { BadRequestException } from "@nestjs/common";
import { normalizeKeys } from "./data-normalizer.util";

export interface ParsedFileResult {
  /** Column headers (original casing from file) */
  headers: string[];
  /** Normalized headers (lowercase, trimmed) */
  normalizedHeaders: string[];
  /** Raw data rows keyed by original header name */
  rows: Record<string, any>[];
  /** Total row count */
  totalRows: number;
}

const ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream", // Some browsers send this for .csv
];

const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export function parseImportFile(file: Express.Multer.File): ParsedFileResult {
  if (!file?.buffer?.length) {
    throw new BadRequestException("El archivo está vacío");
  }

  // Validate file type
  const extension = getFileExtension(file.originalname);
  const isValidMime = ALLOWED_MIME_TYPES.some((mime) =>
    file.mimetype.includes(mime.split("/")[1]),
  );
  const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);

  if (!isValidMime && !isValidExtension) {
    throw new BadRequestException(
      "Formato de archivo no soportado. Use CSV o XLSX.",
    );
  }

  if (extension === ".csv" || file.mimetype.includes("csv")) {
    return parseCsv(file.buffer);
  }

  return parseXlsx(file.buffer);
}

function parseCsv(buffer: Buffer): ParsedFileResult {
  // Try to detect encoding and BOM
  let content = buffer.toString("utf8");
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.substring(1);
  }

  // Detect delimiter (comma, semicolon, tab)
  const delimiter = detectDelimiter(content);

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
    relax_column_count: true,
  }) as Record<string, any>[];

  if (rows.length === 0) {
    throw new BadRequestException(
      "El archivo CSV no contiene datos. Verifique que tenga encabezados y al menos una fila.",
    );
  }

  const headers = Object.keys(rows[0]);
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());

  return {
    headers,
    normalizedHeaders,
    rows,
    totalRows: rows.length,
  };
}

function parseXlsx(buffer: Buffer): ParsedFileResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new BadRequestException("El archivo Excel no contiene hojas de datos");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    raw: false,
    defval: "",
  });

  if (rows.length === 0) {
    throw new BadRequestException(
      "La hoja de cálculo no contiene datos. Verifique que tenga encabezados y al menos una fila.",
    );
  }

  const headers = Object.keys(rows[0]);
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());

  return {
    headers,
    normalizedHeaders,
    rows,
    totalRows: rows.length,
  };
}

function detectDelimiter(content: string): string {
  const firstLine = content.split("\n")[0] || "";
  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;

  if (tabs > commas && tabs > semicolons) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.substring(lastDot).toLowerCase();
}

/**
 * Apply column mapping to a row: transforms source-keyed row to target-keyed row.
 * @param row Original row with source column headers as keys
 * @param columnMapping Map of sourceColumn -> targetField
 * @returns Row with target field names as keys
 */
export function applyColumnMapping(
  row: Record<string, any>,
  columnMapping: Record<string, string>,
): Record<string, any> {
  const mapped: Record<string, any> = {};
  const normalizedRow = normalizeKeys(row);

  for (const [sourceColumn, targetField] of Object.entries(columnMapping)) {
    if (!targetField) continue;

    // Try exact match first, then normalized
    const normalizedSource = sourceColumn.trim().toLowerCase();
    const value =
      row[sourceColumn] ??
      normalizedRow[normalizedSource] ??
      undefined;

    if (value !== undefined) {
      mapped[targetField] = value;
    }
  }

  return mapped;
}
