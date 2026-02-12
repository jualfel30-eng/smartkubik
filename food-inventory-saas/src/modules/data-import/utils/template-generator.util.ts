/**
 * XLSX template generator for data import.
 * Creates downloadable templates with headers, descriptions, and example data.
 */
import * as XLSX from "xlsx";
import { ImportFieldDefinition } from "../interfaces/import-handler.interface";

export interface TemplateOptions {
  entityDisplayName: string;
  fields: ImportFieldDefinition[];
  exampleRows?: Record<string, any>[];
}

export function generateImportTemplate(options: TemplateOptions): Buffer {
  const { entityDisplayName, fields, exampleRows = [] } = options;
  const workbook = XLSX.utils.book_new();

  // ── Data Sheet ──
  const headers = fields.map((f) => f.label);
  const descriptions = fields.map((f) => buildFieldDescription(f));

  const dataRows: any[][] = [headers, descriptions];

  // Add example rows
  for (const exampleRow of exampleRows) {
    const row = fields.map((f) => exampleRow[f.key] ?? "");
    dataRows.push(row);
  }

  const dataSheet = XLSX.utils.aoa_to_sheet(dataRows);

  // Set column widths based on header length
  dataSheet["!cols"] = fields.map((f) => ({
    wch: Math.max(f.label.length + 4, 18),
  }));

  XLSX.utils.book_append_sheet(workbook, dataSheet, `Importar ${entityDisplayName}`);

  // ── Instructions Sheet ──
  const instructionRows = buildInstructionRows(entityDisplayName, fields);
  const instructionSheet = XLSX.utils.aoa_to_sheet(instructionRows);
  instructionSheet["!cols"] = [{ wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instrucciones");

  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  );
}

function buildFieldDescription(field: ImportFieldDefinition): string {
  const parts: string[] = [];

  parts.push(field.required ? "(Obligatorio)" : "(Opcional)");

  switch (field.type) {
    case "enum":
      if (field.enumValues?.length) {
        parts.push(`Valores: ${field.enumValues.join(", ")}`);
      }
      break;
    case "array":
      parts.push(`Separar con "${field.arraySeparator || ","}"`)
      break;
    case "date":
      parts.push("Formato: DD/MM/AAAA");
      break;
    case "number":
      parts.push("Número");
      break;
    case "boolean":
      parts.push("Si / No");
      break;
    default:
      parts.push("Texto");
  }

  if (field.defaultValue !== undefined) {
    parts.push(`Por defecto: ${field.defaultValue}`);
  }

  return parts.join(" | ");
}

function buildInstructionRows(
  entityDisplayName: string,
  fields: ImportFieldDefinition[],
): any[][] {
  const rows: any[][] = [
    [`Instrucciones para importar ${entityDisplayName}`, ""],
    ["", ""],
    ["Información General", ""],
    [
      "Formato de archivo",
      "CSV (separado por comas) o XLSX (Excel). La primera fila debe contener los encabezados.",
    ],
    [
      "Fila de descripción",
      "La segunda fila en la plantilla contiene descripciones de los campos. Elimínela antes de importar o déjela; el sistema la detectará.",
    ],
    [
      "Fechas",
      "Use formato DD/MM/AAAA (ejemplo: 25/12/2024). También se aceptan fechas en formato ISO.",
    ],
    [
      "Booleanos",
      'Use "Si" o "No" (también acepta: Sí, Yes, True, 1, S, Y, Verdadero)',
    ],
    [
      "Listas/Arrays",
      'Separe múltiples valores con coma. Ejemplo: "Bebidas, Licores"',
    ],
    [
      "Números",
      "Use punto o coma como separador decimal. No use separador de miles.",
    ],
    ["", ""],
    ["Campos Requeridos y Opcionales", ""],
  ];

  // List required fields
  const requiredFields = fields.filter((f) => f.required);
  const optionalFields = fields.filter((f) => !f.required);

  if (requiredFields.length) {
    rows.push(["", ""]);
    rows.push(["CAMPOS OBLIGATORIOS:", ""]);
    for (const field of requiredFields) {
      let desc = field.label;
      if (field.type === "enum" && field.enumValues?.length) {
        desc += ` (Valores: ${field.enumValues.join(", ")})`;
      }
      rows.push([`  ${field.label}`, desc]);
    }
  }

  if (optionalFields.length) {
    rows.push(["", ""]);
    rows.push(["CAMPOS OPCIONALES:", ""]);
    for (const field of optionalFields) {
      let desc = field.label;
      if (field.defaultValue !== undefined) {
        desc += ` (Por defecto: ${field.defaultValue})`;
      }
      if (field.type === "enum" && field.enumValues?.length) {
        desc += ` (Valores: ${field.enumValues.join(", ")})`;
      }
      rows.push([`  ${field.label}`, desc]);
    }
  }

  rows.push(["", ""]);
  rows.push(["Notas Importantes", ""]);
  rows.push([
    "Duplicados",
    "Si un registro con la misma clave ya existe, será actualizado (si la opción está activada) u omitido.",
  ]);
  rows.push([
    "Límite de filas",
    "Para archivos con más de 1000 filas, el procesamiento se realizará en segundo plano.",
  ]);
  rows.push([
    "Reversión",
    "Todos los registros importados se pueden revertir dentro de las 72 horas posteriores a la importación.",
  ]);

  return rows;
}
