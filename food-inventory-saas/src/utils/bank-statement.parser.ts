import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

export interface StatementRow {
  transactionDate: Date;
  amount: number;
  description: string;
  reference?: string;
}

function normalizeAmount(raw: any): number {
  if (typeof raw === "number") {
    return raw;
  }
  if (!raw) {
    return 0;
  }

  const cleaned = String(raw)
    .replace(/[\s$]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/\((.*)\)/, "-$1");

  const amount = Number.parseFloat(cleaned);
  if (Number.isNaN(amount)) {
    return 0;
  }
  return amount;
}

function normalizeDate(raw: any): Date {
  if (raw instanceof Date) {
    return raw;
  }

  if (typeof raw === "number") {
    // Excel serial date
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + raw * 24 * 60 * 60 * 1000);
    return date;
  }

  const value = String(raw ?? "").trim();
  if (!value) {
    return new Date();
  }

  // Support dd/mm/yyyy
  const parts = value.split(/[/-]/);
  if (parts.length === 3 && parts[0].length === 2) {
    const [day, month, year] = parts.map((part) => Number.parseInt(part, 10));
    if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
      return new Date(year < 100 ? 2000 + year : year, month - 1, day);
    }
  }

  return new Date(value);
}

function normalizeKeys(row: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[key.trim().toLowerCase()] = value;
  });
  return normalized;
}

export async function parseBankStatement(
  file: Express.Multer.File,
): Promise<StatementRow[]> {
  if (!file?.buffer?.length) {
    return [];
  }

  if (
    file.mimetype.includes("csv") ||
    file.originalname.toLowerCase().endsWith(".csv")
  ) {
    const rows = parse(file.buffer.toString("utf8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, any>[];

    return rows.map((row) => {
      const normalized = normalizeKeys(row);
      return {
        transactionDate: normalizeDate(
          normalized["fecha"] ??
            normalized["date"] ??
            normalized["transaccion"] ??
            normalized["transactiondate"],
        ),
        amount: normalizeAmount(
          normalized["monto"] ??
            normalized["amount"] ??
            normalized["valor"] ??
            normalized["total"],
        ),
        description:
          normalized["descripcion"] ??
          normalized["description"] ??
          normalized["detalle"] ??
          "",
        reference:
          normalized["referencia"] ??
          normalized["reference"] ??
          normalized["comprobante"] ??
          undefined,
      };
    });
  }

  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    raw: false,
  });

  return rows.map((row) => {
    const normalized = normalizeKeys(row);
    return {
      transactionDate: normalizeDate(
        normalized["fecha"] ??
          normalized["date"] ??
          normalized["transaccion"] ??
          normalized["transactiondate"],
      ),
      amount: normalizeAmount(
        normalized["monto"] ??
          normalized["amount"] ??
          normalized["valor"] ??
          normalized["total"],
      ),
      description:
        normalized["descripcion"] ??
        normalized["description"] ??
        normalized["detalle"] ??
        "",
      reference:
        normalized["referencia"] ??
        normalized["reference"] ??
        normalized["comprobante"] ??
        undefined,
    };
  });
}
