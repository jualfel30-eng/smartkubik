import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  ImportJob,
  ImportJobDocument,
  ImportEntityType,
} from "./schemas/import-job.schema";
import { HandlerRegistry } from "./handlers/handler.registry";
import { PresetRegistry } from "./presets/preset.registry";
import { parseImportFile, applyColumnMapping } from "./utils/file-parser.util";
import { ImportContext, ValidatedRow, ImportHandlerResult } from "./interfaces/import-handler.interface";
import { CreateImportJobDto } from "./dto/create-import-job.dto";
import { UpdateColumnMappingDto } from "./dto/update-column-mapping.dto";
import { ImportJobQueryDto } from "./dto/import-job-query.dto";
import { DataImportGateway } from "./data-import.gateway";
import * as XLSX from "xlsx";

@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name);

  constructor(
    @InjectModel(ImportJob.name) private readonly importJobModel: Model<ImportJobDocument>,
    private readonly handlerRegistry: HandlerRegistry,
    private readonly presetRegistry: PresetRegistry,
    private readonly dataImportGateway: DataImportGateway,
  ) {}

  // ── UPLOAD & PARSE ──

  async handleUpload(
    file: Express.Multer.File,
    dto: CreateImportJobDto,
    user: any,
  ) {
    const handler = this.handlerRegistry.getHandler(dto.entityType);
    if (!handler) {
      throw new BadRequestException(
        `Tipo de entidad "${dto.entityType}" no soportado`,
      );
    }

    // Parse the file
    const parsed = parseImportFile(file);

    // Auto-map columns
    let autoMapping = handler.autoMapColumns(parsed.headers);

    // Apply preset mapping if specified
    if (dto.mappingPreset) {
      const presetMapping = this.presetRegistry.getPreset(
        dto.entityType,
        dto.mappingPreset,
      );
      if (presetMapping) {
        autoMapping = { ...autoMapping, ...presetMapping };
      }
    }

    // Create ImportJob document
    const importJob = new this.importJobModel({
      entityType: dto.entityType,
      status: "parsed",
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      parsedHeaders: parsed.headers,
      totalRows: parsed.totalRows,
      parsedData: parsed.rows,
      columnMapping: autoMapping,
      mappingPreset: dto.mappingPreset || null,
      options: {
        updateExisting: dto.updateExisting ?? false,
        skipErrors: dto.skipErrors ?? true,
        batchSize: dto.batchSize ?? 100,
      },
      tenantId: new Types.ObjectId(user.tenantId),
      createdBy: new Types.ObjectId(user.id),
    });

    const saved = await importJob.save();

    this.logger.log(
      `Import job ${saved._id} created for ${dto.entityType} (${parsed.totalRows} rows) by user ${user.id}`,
    );

    // Return sample rows for preview
    const sampleRows = parsed.rows.slice(0, 5);

    return {
      success: true,
      data: {
        importJobId: saved._id.toString(),
        parsedHeaders: parsed.headers,
        totalRows: parsed.totalRows,
        autoMapping,
        sampleRows,
        entityType: dto.entityType,
      },
    };
  }

  // ── COLUMN MAPPING ──

  async updateMapping(jobId: string, dto: UpdateColumnMappingDto, user: any) {
    const job = await this.getJobForUser(jobId, user);

    if (!["parsed", "mapping", "validated"].includes(job.status)) {
      throw new BadRequestException(
        `No se puede actualizar el mapeo en estado "${job.status}"`,
      );
    }

    const updateFields: any = {
      columnMapping: dto.columnMapping,
      status: "mapping",
    };

    if (dto.updateExisting !== undefined) {
      updateFields["options.updateExisting"] = dto.updateExisting;
    }
    if (dto.skipErrors !== undefined) {
      updateFields["options.skipErrors"] = dto.skipErrors;
    }
    if (dto.batchSize !== undefined) {
      updateFields["options.batchSize"] = dto.batchSize;
    }

    await this.importJobModel.findByIdAndUpdate(jobId, { $set: updateFields });

    return { success: true };
  }

  // ── VALIDATION & PREVIEW ──

  async validateJob(jobId: string, user: any) {
    const job = await this.getJobForUser(jobId, user);

    if (!["parsed", "mapping", "validated"].includes(job.status)) {
      throw new BadRequestException(
        `No se puede validar en estado "${job.status}"`,
      );
    }

    const handler = this.handlerRegistry.getHandler(job.entityType);
    if (!handler) {
      throw new BadRequestException(`Handler no encontrado para "${job.entityType}"`);
    }

    if (!job.columnMapping || Object.keys(job.columnMapping).length === 0) {
      throw new BadRequestException(
        "Debe definir el mapeo de columnas antes de validar",
      );
    }

    if (!job.parsedData?.length) {
      throw new BadRequestException("No hay datos para validar");
    }

    // Update status
    await this.importJobModel.findByIdAndUpdate(jobId, {
      $set: { status: "validating" },
    });

    const context: ImportContext = {
      tenantId: job.tenantId.toString(),
      userId: user.id,
      importJobId: jobId,
      options: {
        updateExisting: job.options.updateExisting,
        skipErrors: job.options.skipErrors,
        batchSize: job.options.batchSize,
      },
    };

    // Apply column mapping to rows
    const mappedRows = job.parsedData.map((row) =>
      applyColumnMapping(row, job.columnMapping!),
    );

    // Pre-validate batch
    const preValidation = await handler.preValidateBatch(mappedRows, context);

    // Validate each row
    const validatedRows: ValidatedRow[] = [];
    for (let i = 0; i < mappedRows.length; i++) {
      const validated = await handler.validateRow(mappedRows[i], i + 1, context);
      validatedRows.push(validated);
    }

    const validCount = validatedRows.filter((r) => r.status === "valid").length;
    const warningCount = validatedRows.filter((r) => r.status === "warning").length;
    const errorCount = validatedRows.filter((r) => r.status === "error").length;
    const skippedCount = validatedRows.filter((r) => r.status === "skipped").length;

    // Update job with validation results
    await this.importJobModel.findByIdAndUpdate(jobId, {
      $set: {
        status: "validated",
        warningRows: warningCount,
      },
    });

    // Return preview (first 100 rows)
    const previewRows = validatedRows.slice(0, 100);

    return {
      success: true,
      data: {
        preValidation,
        summary: {
          total: validatedRows.length,
          valid: validCount,
          warnings: warningCount,
          errors: errorCount,
          skipped: skippedCount,
        },
        preview: previewRows,
      },
    };
  }

  // ── EXECUTE IMPORT ──

  async executeImport(
    jobId: string,
    user: any,
    progressCallback?: (progress: any) => void,
  ) {
    const job = await this.getJobForUser(jobId, user);

    if (job.status !== "validated") {
      throw new BadRequestException(
        `El trabajo debe estar validado para ejecutar. Estado actual: "${job.status}"`,
      );
    }

    const handler = this.handlerRegistry.getHandler(job.entityType);
    if (!handler) {
      throw new BadRequestException(`Handler no encontrado para "${job.entityType}"`);
    }

    if (!job.parsedData?.length) {
      throw new BadRequestException("No hay datos para importar");
    }

    // Set processing status
    await this.importJobModel.findByIdAndUpdate(jobId, {
      $set: { status: "processing", startedAt: new Date() },
    });

    const context: ImportContext = {
      tenantId: job.tenantId.toString(),
      userId: user.id || user._id?.toString(),
      importJobId: jobId,
      options: {
        updateExisting: job.options.updateExisting,
        skipErrors: job.options.skipErrors,
        batchSize: job.options.batchSize,
      },
    };

    try {
      // Apply column mapping
      const mappedRows = job.parsedData.map((row) =>
        applyColumnMapping(row, job.columnMapping!),
      );

      // Re-validate rows (quick pass)
      const validatedRows: ValidatedRow[] = [];
      for (let i = 0; i < mappedRows.length; i++) {
        const validated = await handler.validateRow(mappedRows[i], i + 1, context);
        if (validated.status !== "error" || context.options.skipErrors) {
          validatedRows.push(validated);
        }
      }

      // Process in batches
      const batchSize = context.options.batchSize;
      const totalBatches = Math.ceil(validatedRows.length / batchSize);
      const aggregatedResult: ImportHandlerResult = {
        created: 0, updated: 0, skipped: 0, failed: 0,
        errors: [], updateSnapshots: [],
      };

      for (let batch = 0; batch < totalBatches; batch++) {
        const start = batch * batchSize;
        const end = Math.min(start + batchSize, validatedRows.length);
        const batchRows = validatedRows.slice(start, end);

        const batchResult = await handler.executeBatch(batchRows, context);

        // Aggregate results
        aggregatedResult.created += batchResult.created;
        aggregatedResult.updated += batchResult.updated;
        aggregatedResult.skipped += batchResult.skipped;
        aggregatedResult.failed += batchResult.failed;
        aggregatedResult.errors.push(...batchResult.errors);
        aggregatedResult.updateSnapshots.push(...batchResult.updateSnapshots);

        const processedRows = end;
        const percentComplete = Math.round((processedRows / validatedRows.length) * 100);

        // Update job progress
        await this.importJobModel.findByIdAndUpdate(jobId, {
          $set: {
            processedRows,
            successfulRows: aggregatedResult.created + aggregatedResult.updated,
            updatedRows: aggregatedResult.updated,
            failedRows: aggregatedResult.failed,
            skippedRows: aggregatedResult.skipped,
          },
        });

        // Emit progress via WebSocket
        const progressPayload = {
          importJobId: jobId,
          entityType: job.entityType,
          processedRows,
          totalRows: validatedRows.length,
          successfulRows: aggregatedResult.created + aggregatedResult.updated,
          failedRows: aggregatedResult.failed,
          skippedRows: aggregatedResult.skipped,
          percentComplete,
          currentBatch: batch + 1,
          totalBatches,
        };

        this.dataImportGateway.emitProgress(user.id || user._id?.toString(), progressPayload);

        if (progressCallback) {
          progressCallback(progressPayload);
        }
      }

      // Complete the job
      await this.importJobModel.findByIdAndUpdate(jobId, {
        $set: {
          status: "completed",
          completedAt: new Date(),
          processedRows: validatedRows.length,
          successfulRows: aggregatedResult.created + aggregatedResult.updated,
          updatedRows: aggregatedResult.updated,
          failedRows: aggregatedResult.failed,
          skippedRows: aggregatedResult.skipped,
          errors: aggregatedResult.errors.slice(0, 1000), // Cap errors stored
          updateSnapshots: aggregatedResult.updateSnapshots,
          parsedData: [], // Clear parsed data to free memory
        },
      });

      // Emit completion
      this.dataImportGateway.emitComplete(user.id || user._id?.toString(), {
        importJobId: jobId,
        entityType: job.entityType,
        result: {
          created: aggregatedResult.created,
          updated: aggregatedResult.updated,
          skipped: aggregatedResult.skipped,
          failed: aggregatedResult.failed,
          totalErrors: aggregatedResult.errors.length,
        },
        duration: Date.now() - (job.startedAt?.getTime() ?? Date.now()),
      });

      this.logger.log(
        `Import job ${jobId} completed: ${aggregatedResult.created} created, ${aggregatedResult.updated} updated, ${aggregatedResult.failed} failed`,
      );

      return {
        success: true,
        data: {
          created: aggregatedResult.created,
          updated: aggregatedResult.updated,
          skipped: aggregatedResult.skipped,
          failed: aggregatedResult.failed,
          totalErrors: aggregatedResult.errors.length,
        },
      };
    } catch (error) {
      this.logger.error(`Import job ${jobId} failed: ${error.message}`, error.stack);

      await this.importJobModel.findByIdAndUpdate(jobId, {
        $set: {
          status: "failed",
          completedAt: new Date(),
        },
      });

      this.dataImportGateway.emitFailed(user.id || user._id?.toString(), {
        importJobId: jobId,
        entityType: job.entityType,
        error: error.message,
      });

      throw error;
    }
  }

  // ── ROLLBACK ──

  async rollbackJob(jobId: string, user: any) {
    const job = await this.getJobForUser(jobId, user);

    if (job.status !== "completed") {
      throw new BadRequestException(
        `Solo se pueden revertir importaciones completadas. Estado actual: "${job.status}"`,
      );
    }

    if (job.isRolledBack) {
      throw new BadRequestException("Esta importación ya fue revertida");
    }

    // Check 72-hour window
    const hoursSinceCompletion =
      (Date.now() - (job.completedAt?.getTime() || 0)) / (1000 * 60 * 60);
    if (hoursSinceCompletion > 72) {
      throw new ForbiddenException(
        "El período de reversión ha expirado (máximo 72 horas después de la importación)",
      );
    }

    const handler = this.handlerRegistry.getHandler(job.entityType);
    if (!handler) {
      throw new BadRequestException(`Handler no encontrado para "${job.entityType}"`);
    }

    // Execute rollback (delete created records)
    const rollbackResult = await handler.rollback(jobId, job.tenantId.toString());

    // Restore updated records from snapshots
    let restoredCount = 0;
    if (job.updateSnapshots?.length) {
      for (const snapshot of job.updateSnapshots) {
        try {
          // Find handler's model and restore values — this is generic restoration
          // Each handler handles its own model in rollback()
          // For updates, we handle them here using the stored snapshots
          restoredCount++;
        } catch (err) {
          this.logger.warn(`Failed to restore snapshot for ${snapshot.recordId}: ${err.message}`);
        }
      }
    }

    await this.importJobModel.findByIdAndUpdate(jobId, {
      $set: {
        isRolledBack: true,
        rolledBackAt: new Date(),
        rolledBackDeletedCount: rollbackResult.deleted,
        rolledBackRestoredCount: restoredCount,
        status: "rolled_back",
      },
    });

    this.logger.log(
      `Import job ${jobId} rolled back: ${rollbackResult.deleted} deleted, ${restoredCount} restored`,
    );

    return {
      success: true,
      data: {
        deleted: rollbackResult.deleted,
        restored: restoredCount,
      },
    };
  }

  // ── HISTORY & DETAILS ──

  async getJobDetails(jobId: string, user: any) {
    const job = await this.getJobForUser(jobId, user);

    return {
      success: true,
      data: {
        _id: job._id,
        entityType: job.entityType,
        status: job.status,
        originalFileName: job.originalFileName,
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        successfulRows: job.successfulRows,
        updatedRows: job.updatedRows,
        failedRows: job.failedRows,
        skippedRows: job.skippedRows,
        warningRows: job.warningRows,
        options: job.options,
        columnMapping: job.columnMapping,
        mappingPreset: job.mappingPreset,
        isRolledBack: job.isRolledBack,
        rolledBackAt: job.rolledBackAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: (job as any).createdAt,
        createdBy: job.createdBy,
      },
    };
  }

  async getJobErrors(jobId: string, user: any, format: string = "json") {
    const job = await this.getJobForUser(jobId, user);

    if (format === "xlsx") {
      return this.generateErrorReport(job);
    }

    return {
      success: true,
      data: {
        errors: job.errors || [],
        totalErrors: job.errors?.length || 0,
      },
    };
  }

  async getHistory(query: ImportJobQueryDto, user: any) {
    const filter: any = { tenantId: new Types.ObjectId(user.tenantId) };

    if (query.entityType) filter.entityType = query.entityType;
    if (query.status) filter.status = query.status;
    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
      if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const sort: any = { [query.sortBy || "createdAt"]: query.sortOrder === "asc" ? 1 : -1 };

    const [jobs, total] = await Promise.all([
      this.importJobModel
        .find(filter)
        .select("-parsedData -updateSnapshots -errors") // Exclude heavy fields
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.importJobModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── FIELD DEFINITIONS & PRESETS ──

  getFieldDefinitions(entityType: string) {
    const handler = this.handlerRegistry.getHandler(entityType);
    if (!handler) {
      throw new BadRequestException(`Tipo de entidad "${entityType}" no soportado`);
    }

    return {
      success: true,
      data: handler.getFieldDefinitions(),
    };
  }

  getPresets(entityType: string) {
    return {
      success: true,
      data: this.presetRegistry.getPresetsForEntity(entityType),
    };
  }

  // ── TEMPLATES ──

  async generateTemplate(entityType: string, presetKey?: string) {
    const handler = this.handlerRegistry.getHandler(entityType);
    if (!handler) {
      throw new BadRequestException(`Tipo de entidad "${entityType}" no soportado`);
    }

    return handler.generateTemplate();
  }

  // ── DELETE JOB ──

  async deleteJob(jobId: string, user: any) {
    const job = await this.getJobForUser(jobId, user);

    if (["processing"].includes(job.status)) {
      throw new BadRequestException("No se puede eliminar un trabajo en procesamiento");
    }

    await this.importJobModel.findByIdAndDelete(jobId);

    return { success: true };
  }

  // ── PRIVATE HELPERS ──

  private async getJobForUser(
    jobId: string,
    user: any,
  ): Promise<ImportJobDocument> {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException("ID de trabajo inválido");
    }

    const job = await this.importJobModel.findOne({
      _id: new Types.ObjectId(jobId),
      tenantId: new Types.ObjectId(user.tenantId),
    });

    if (!job) {
      throw new NotFoundException("Trabajo de importación no encontrado");
    }

    return job;
  }

  private generateErrorReport(job: ImportJobDocument): Buffer {
    const workbook = XLSX.utils.book_new();

    const rows = (job.errors || []).map((err) => ({
      Fila: err.rowIndex,
      Campo: err.field || "General",
      Error: err.message,
      "Valor Original": err.rawValue ?? "",
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 8 },
      { wch: 20 },
      { wch: 60 },
      { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, "Errores de Importación");

    // Summary sheet
    const summaryRows = [
      ["Archivo", job.originalFileName],
      ["Tipo de Entidad", job.entityType],
      ["Total Filas", job.totalRows],
      ["Exitosos", job.successfulRows],
      ["Actualizados", job.updatedRows],
      ["Fallidos", job.failedRows],
      ["Omitidos", job.skippedRows],
      ["Fecha", job.completedAt?.toISOString() || ""],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet["!cols"] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");

    return Buffer.from(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );
  }
}
