/**
 * Import Handler Interface & Types
 *
 * Core abstraction for the data import system. Each entity type
 * (products, customers, suppliers, inventory, categories) implements
 * ImportHandler to provide entity-specific parsing, validation, and execution.
 */

export interface ImportFieldDefinition {
  /** Internal field name (e.g. "sku") */
  key: string;
  /** Spanish display label for UI and templates (e.g. "SKU / Código") */
  label: string;
  /** English label for internal logs */
  labelEn: string;
  /** Whether this field is required for import */
  required: boolean;
  /** Data type for normalization and validation */
  type: "string" | "number" | "boolean" | "date" | "array" | "enum";
  /** Valid values for enum type fields */
  enumValues?: string[];
  /** Separator for array-type fields (default: ",") */
  arraySeparator?: string;
  /** Column name aliases for auto-mapping (Spanish + English + common ERP names) */
  aliases: string[];
  /** Default value when field is empty/missing */
  defaultValue?: any;
  /** Custom transform function applied after normalization */
  transformFn?: (raw: any) => any;
  /** Custom validation returning error message (Spanish) or null */
  validationFn?: (value: any, row: Record<string, any>) => string | null;
}

export interface RowError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidatedRow {
  /** 1-based row index from the source file */
  rowIndex: number;
  /** Transformed, mapped data ready for import */
  data: Record<string, any>;
  /** Per-field validation errors/warnings */
  errors: RowError[];
  /** Overall row status */
  status: "valid" | "warning" | "error" | "skipped";
  /** Whether this row matches an existing record (for update mode) */
  existingRecordId?: string;
}

export interface ImportHandlerResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    rowIndex: number;
    field?: string;
    message: string;
    rawValue?: any;
  }>;
  /** Snapshots of previous values for updated records (for rollback) */
  updateSnapshots: Array<{
    recordId: string;
    previousValues: Record<string, any>;
  }>;
}

export interface RollbackResult {
  deleted: number;
  restored: number;
}

export interface ImportContext {
  tenantId: string;
  userId: string;
  importJobId: string;
  options: {
    /** If true, update existing records matching by business key (SKU, customerNumber, etc.) */
    updateExisting: boolean;
    /** If true, continue processing when individual rows fail */
    skipErrors: boolean;
    /** Rows per batch for execution (default 100) */
    batchSize: number;
  };
}

export interface PreValidationResult {
  canProceed: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportHandler {
  /** Entity type identifier (e.g. 'products', 'customers') */
  readonly entityType: string;
  /** Spanish display name for UI */
  readonly displayName: string;
  /** Description in Spanish */
  readonly description: string;

  /** Returns field definitions for template generation and column mapping */
  getFieldDefinitions(): ImportFieldDefinition[];

  /** Auto-detect column mapping from parsed file headers */
  autoMapColumns(headers: string[]): Record<string, string>;

  /** Validate a single row, returning structured result with per-field errors */
  validateRow(
    row: Record<string, any>,
    rowIndex: number,
    context: ImportContext,
  ): Promise<ValidatedRow>;

  /** Pre-validation: check tenant limits, batch-level uniqueness, etc. */
  preValidateBatch(
    rows: Record<string, any>[],
    context: ImportContext,
  ): Promise<PreValidationResult>;

  /** Execute import for a batch of validated rows (create + update) */
  executeBatch(
    validRows: ValidatedRow[],
    context: ImportContext,
  ): Promise<ImportHandlerResult>;

  /** Rollback: delete created records and restore updated records */
  rollback(importJobId: string, tenantId: string): Promise<RollbackResult>;

  /** Generate downloadable XLSX template with headers, instructions, example rows */
  generateTemplate(): Promise<Buffer>;
}
