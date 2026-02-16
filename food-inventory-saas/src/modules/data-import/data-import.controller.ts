import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { JwtAuthGuard } from "@/guards/jwt-auth.guard";
import { TenantGuard } from "@/guards/tenant.guard";
import { PermissionsGuard } from "@/guards/permissions.guard";
import { Permissions } from "@/decorators/permissions.decorator";
import { DataImportService } from "./data-import.service";
import { DataImportQueueService } from "./queues/data-import-queue.service";
import { CreateImportJobDto } from "./dto/create-import-job.dto";
import { UpdateColumnMappingDto } from "./dto/update-column-mapping.dto";
import { ImportJobQueryDto } from "./dto/import-job-query.dto";

@Controller("data-import")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class DataImportController {
  constructor(
    private readonly dataImportService: DataImportService,
    private readonly dataImportQueueService: DataImportQueueService,
  ) {}

  /**
   * POST /data-import/upload
   * Upload a CSV/XLSX file and parse it
   */
  @Post("upload")
  @Permissions("data_import_create")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, callback) => {
        const allowed = [
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/octet-stream",
        ];
        if (
          allowed.some((m) => file.mimetype.includes(m.split("/")[1])) ||
          /\.(csv|xlsx|xls)$/i.test(file.originalname)
        ) {
          callback(null, true);
        } else {
          callback(
            new Error("Solo se permiten archivos CSV y XLSX"),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImportJobDto,
    @Req() req: any,
  ) {
    if (!file) {
      return { success: false, message: "No se recibió ningún archivo" };
    }
    return this.dataImportService.handleUpload(file, dto, req.user);
  }

  /**
   * GET /data-import/templates/:entityType
   * Download import template for an entity type
   */
  @Get("templates/:entityType")
  @Permissions("data_import_read")
  async downloadTemplate(
    @Param("entityType") entityType: string,
    @Res() res: Response,
  ) {
    const buffer = await this.dataImportService.generateTemplate(entityType);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="plantilla_${entityType}.xlsx"`,
    );
    res.send(buffer);
  }

  /**
   * GET /data-import/templates/:entityType/:preset
   * Download preset-specific template
   */
  @Get("templates/:entityType/:preset")
  @Permissions("data_import_read")
  async downloadPresetTemplate(
    @Param("entityType") entityType: string,
    @Param("preset") preset: string,
    @Res() res: Response,
  ) {
    const buffer = await this.dataImportService.generateTemplate(
      entityType,
      preset,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="plantilla_${entityType}_${preset}.xlsx"`,
    );
    res.send(buffer);
  }

  /**
   * GET /data-import/field-definitions/:entityType
   * Get field definitions for column mapper UI
   */
  @Get("field-definitions/:entityType")
  @Permissions("data_import_read")
  getFieldDefinitions(@Param("entityType") entityType: string) {
    return this.dataImportService.getFieldDefinitions(entityType);
  }

  /**
   * GET /data-import/presets/:entityType
   * List available mapping presets
   */
  @Get("presets/:entityType")
  @Permissions("data_import_read")
  getPresets(@Param("entityType") entityType: string) {
    return this.dataImportService.getPresets(entityType);
  }

  /**
   * PATCH /data-import/:jobId/mapping
   * Update column mapping for a job
   */
  @Patch(":jobId/mapping")
  @Permissions("data_import_create")
  async updateMapping(
    @Param("jobId") jobId: string,
    @Body() dto: UpdateColumnMappingDto,
    @Req() req: any,
  ) {
    return this.dataImportService.updateMapping(jobId, dto, req.user);
  }

  /**
   * POST /data-import/:jobId/validate
   * Validate all rows and return preview
   */
  @Post(":jobId/validate")
  @Permissions("data_import_create")
  async validate(@Param("jobId") jobId: string, @Req() req: any) {
    return this.dataImportService.validateJob(jobId, req.user);
  }

  /**
   * POST /data-import/:jobId/execute
   * Execute the import (sync for <=1000 rows, async via BullMQ for >1000)
   */
  @Post(":jobId/execute")
  @Permissions("data_import_create")
  async execute(@Param("jobId") jobId: string, @Req() req: any) {
    // Check row count to decide sync vs async
    const jobDetails = await this.dataImportService.getJobDetails(jobId, req.user);
    const totalRows = jobDetails.data.totalRows;

    if (totalRows > 1000) {
      // Async via BullMQ
      const bullJobId = await this.dataImportQueueService.enqueueImport(
        jobId,
        req.user,
      );
      return {
        success: true,
        data: { queued: true, bullJobId, totalRows },
      };
    }

    // Sync execution
    return this.dataImportService.executeImport(jobId, req.user);
  }

  /**
   * GET /data-import/:jobId
   * Get job details and status
   */
  @Get("history/:jobId")
  @Permissions("data_import_read")
  async getJobDetails(@Param("jobId") jobId: string, @Req() req: any) {
    return this.dataImportService.getJobDetails(jobId, req.user);
  }

  /**
   * GET /data-import/:jobId/errors
   * Get error details (JSON or XLSX download)
   */
  @Get("history/:jobId/errors")
  @Permissions("data_import_read")
  async getJobErrors(
    @Param("jobId") jobId: string,
    @Query("format") format: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (format === "xlsx") {
      const buffer = await this.dataImportService.getJobErrors(
        jobId,
        req.user,
        "xlsx",
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="errores_importacion_${jobId}.xlsx"`,
      );
      res.send(buffer);
      return;
    }

    const result = await this.dataImportService.getJobErrors(
      jobId,
      req.user,
      "json",
    );
    res.json(result);
  }

  /**
   * GET /data-import/history
   * Paginated import job history
   */
  @Get("history")
  @Permissions("data_import_read")
  async getHistory(@Query() query: ImportJobQueryDto, @Req() req: any) {
    return this.dataImportService.getHistory(query, req.user);
  }

  /**
   * DELETE /data-import/:jobId/rollback
   * Rollback a completed import
   */
  @Delete(":jobId/rollback")
  @Permissions("data_import_delete")
  async rollback(@Param("jobId") jobId: string, @Req() req: any) {
    return this.dataImportService.rollbackJob(jobId, req.user);
  }

  /**
   * DELETE /data-import/:jobId
   * Delete a non-executed import job
   */
  @Delete(":jobId")
  @Permissions("data_import_delete")
  async deleteJob(@Param("jobId") jobId: string, @Req() req: any) {
    return this.dataImportService.deleteJob(jobId, req.user);
  }
}
