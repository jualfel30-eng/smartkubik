import {
  Controller,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Patch,
  Body,
  Post,
  Request,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Req,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { SuperAdminGuard } from "./guards/super-admin.guard";
import { SuperAdminService } from "./super-admin.service";
import { KnowledgeBaseService } from "../knowledge-base/knowledge-base.service";
import { AssistantService } from "../assistant/assistant.service";

@ApiTags("Super Admin")
@ApiBearerAuth()
@Controller("super-admin")
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly assistantService: AssistantService,
  ) {}

  @Get("tenants")
  @ApiOperation({ summary: "[SUPER ADMIN] Get all tenants with pagination" })
  @ApiResponse({
    status: 200,
    description: "Lista de tenants obtenida exitosamente.",
  })
  async getTenants(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("search") search: string = "",
  ) {
    return this.superAdminService.getTenants(page, limit, search);
  }

  @Get("tenants/:tenantId/configuration")
  @ApiOperation({
    summary:
      "[SUPER ADMIN] Get a specific tenant's configuration (modules, roles, permissions)",
  })
  @ApiResponse({
    status: 200,
    description: "Configuración del tenant obtenida exitosamente.",
  })
  async getTenantConfiguration(@Param("tenantId") tenantId: string) {
    return this.superAdminService.getTenantConfiguration(tenantId);
  }

  @Get("tenants/:tenantId/users")
  @ApiOperation({
    summary: "[SUPER ADMIN] Get all users for a specific tenant",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de usuarios obtenida exitosamente.",
  })
  async getUsersForTenant(@Param("tenantId") tenantId: string) {
    return this.superAdminService.getUsersForTenant(tenantId);
  }

  @Post("tenants/:tenantId/users/:userId/impersonate")
  @ApiOperation({ summary: "[SUPER ADMIN] Impersonate a user" })
  @ApiResponse({
    status: 200,
    description: "Impersonation successful, returns new tokens.",
  })
  async impersonateUser(@Param("userId") userId: string, @Request() req) {
    const impersonatorId = req.user.id;
    return this.superAdminService.impersonateUser(userId, impersonatorId);
  }

  @Patch("tenants/:tenantId/status")
  @ApiOperation({ summary: "[SUPER ADMIN] Update a tenant's status" })
  @ApiResponse({
    status: 200,
    description: "Tenant status updated successfully.",
  })
  async updateTenantStatus(
    @Param("tenantId") tenantId: string,
    @Body() body: { status: string },
  ) {
    return this.superAdminService.updateTenantStatus(tenantId, body.status);
  }

  @Patch("tenants/:tenantId")
  @ApiOperation({ summary: "[SUPER ADMIN] Update a tenant's details" })
  @ApiResponse({
    status: 200,
    description: "Tenant details updated successfully.",
  })
  async updateTenant(
    @Param("tenantId") tenantId: string,
    @Body() updateData: any,
  ) {
    return this.superAdminService.updateTenant(tenantId, updateData);
  }

  @Get("settings/:key")
  @ApiOperation({ summary: "[SUPER ADMIN] Get a global setting by key" })
  @ApiResponse({ status: 200, description: "Setting retrieved successfully." })
  async getSetting(@Param("key") key: string) {
    const setting = await this.superAdminService.getSetting(key);
    return { data: setting };
  }

  @Post("settings")
  @ApiOperation({ summary: "[SUPER ADMIN] Create or update a global setting" })
  @ApiResponse({ status: 200, description: "Setting updated successfully." })
  async updateSetting(@Body() body: { key: string; value: string }) {
    return this.superAdminService.updateSetting(body.key, body.value);
  }

  @Get("feature-flags")
  @ApiOperation({ summary: "[SUPER ADMIN] Get all feature flags status" })
  @ApiResponse({
    status: 200,
    description: "Feature flags retrieved successfully.",
  })
  async getFeatureFlags() {
    const flags = await this.superAdminService.getFeatureFlags();
    return { data: flags };
  }

  @Post("feature-flags")
  @ApiOperation({ summary: "[SUPER ADMIN] Update multiple feature flags" })
  @ApiResponse({
    status: 200,
    description: "Feature flags updated successfully.",
  })
  async updateFeatureFlags(@Body() body: { flags: Record<string, boolean> }) {
    return this.superAdminService.updateFeatureFlags(body.flags);
  }

  @Post("feature-flags/reload")
  @ApiOperation({
    summary: "[SUPER ADMIN] Force reload of feature flags from database",
  })
  @ApiResponse({
    status: 200,
    description: "Feature flags reloaded successfully.",
  })
  async reloadFeatureFlags() {
    return this.superAdminService.reloadFeatureFlags();
  }

  @Patch("tenants/:tenantId/modules")
  @ApiOperation({
    summary: "[SUPER ADMIN] Update enabled modules for a tenant",
  })
  @ApiResponse({
    status: 200,
    description: "Módulos del tenant actualizados exitosamente.",
  })
  async updateTenantModules(
    @Param("tenantId") tenantId: string,
    @Body() body: { enabledModules: any },
  ) {
    return this.superAdminService.updateTenantModules(
      tenantId,
      body.enabledModules,
    );
  }

  @Patch("roles/:roleId/permissions")
  @ApiOperation({ summary: "[SUPER ADMIN] Update permissions for a role" })
  @ApiResponse({
    status: 200,
    description: "Permisos del rol actualizados exitosamente.",
  })
  async updateRolePermissions(
    @Param("roleId") roleId: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.superAdminService.updateRolePermissions(
      roleId,
      body.permissionIds,
    );
  }

  @Get("metrics")
  @ApiOperation({ summary: "[SUPER ADMIN] Get global metrics" })
  @ApiResponse({
    status: 200,
    description: "Métricas globales obtenidas exitosamente.",
  })
  async getMetrics() {
    return this.superAdminService.getMetrics();
  }

  @Delete("tenants/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "[SUPER ADMIN] Delete a tenant and all associated data",
  })
  @ApiResponse({ status: 200, description: "Tenant eliminado exitosamente." })
  @ApiResponse({ status: 403, description: "Acceso denegado." })
  @ApiResponse({ status: 404, description: "Tenant no encontrado." })
  async deleteTenant(@Param("id") id: string) {
    return this.superAdminService.deleteTenant(id);
  }

  @Post("tenants/:tenantId/sync-memberships")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "[SUPER ADMIN] Sync a legacy tenant's permissions to the current system standard",
  })
  @ApiResponse({
    status: 200,
    description: "Permisos del tenant sincronizados exitosamente.",
  })
  async syncTenantMemberships(@Param("tenantId") tenantId: string) {
    return this.superAdminService.syncTenantMemberships(tenantId);
  }

  @Post("knowledge-base/upload")
  @ApiOperation({
    summary:
      "[SUPER ADMIN] Upload one or multiple documents to a specified knowledge base",
  })
  @UseInterceptors(FilesInterceptor("files"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description:
      "Uno o varios archivos y el tenant de destino para la base de conocimiento",
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" },
          description: "Archivos (PDF o TXT)",
        },
        tenantId: {
          type: "string",
          description: 'Tenant de destino (ej: "smartkubik_docs")',
        },
        source: {
          type: "string",
          description: "Nombre de referencia (solo para un único archivo)",
        },
      },
    },
  })
  async uploadGlobalDocument(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    const { tenantId, source } = req.body;
    if (!files || files.length === 0) {
      throw new BadRequestException("No files uploaded.");
    }
    if (!tenantId) {
      throw new BadRequestException("No tenantId provided in form data.");
    }

    const normalizedSources = Array.isArray(source) ? source : [source];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const resolvedSource =
        normalizedSources[index] ||
        (files.length === 1 ? source : "") ||
        file.originalname;
      await this.knowledgeBaseService.addDocument(tenantId, file, {
        source: resolvedSource,
      });
    }

    return {
      message: `Uploaded ${files.length} document(s) for tenant ${tenantId}.`,
    };
  }

  @Get("knowledge-base/documents")
  @ApiOperation({
    summary: "[SUPER ADMIN] Get a list of documents in a knowledge base",
  })
  async getDocuments(@Query("tenantId") tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException("tenantId is a required query parameter.");
    }
    const documents = await this.knowledgeBaseService.listDocuments(tenantId);
    return { data: documents };
  }

  @Get("knowledge-base/query")
  @ApiOperation({
    summary: "[SUPER ADMIN] Query the knowledge base for a given tenant",
  })
  async queryKnowledgeBase(
    @Query("tenantId") tenantId: string,
    @Query("q") query: string,
  ) {
    if (!tenantId || !query) {
      throw new BadRequestException(
        "tenantId and q are required query parameters.",
      );
    }
    const results = await this.knowledgeBaseService.queryKnowledgeBase(
      tenantId,
      query,
    );
    return { data: results };
  }

  @Delete("knowledge-base/document")
  @ApiOperation({
    summary:
      "[SUPER ADMIN] Delete a document from a knowledge base by its source",
  })
  async deleteDocument(
    @Query("tenantId") tenantId: string,
    @Query("source") source: string,
  ) {
    if (!tenantId || !source) {
      throw new BadRequestException(
        "tenantId and source are required query parameters.",
      );
    }
    await this.knowledgeBaseService.deleteDocumentBySource(tenantId, source);
    return {
      message: `Deletion initiated for document source '${source}' in tenant '${tenantId}'.`,
    };
  }

  @Post("assistant/query")
  @ApiOperation({
    summary:
      "[SUPER ADMIN] Ask the SmartKubik assistant using the knowledge base context",
  })
  async askAssistant(
    @Body() body: { tenantId?: string; question: string; topK?: number },
  ) {
    const tenantId = body.tenantId || "smartkubik_docs";
    const question = body.question;
    const topK = body.topK ?? 5;

    const response = await this.assistantService.answerQuestion({
      tenantId,
      question,
      topK,
      knowledgeBaseTenantId: tenantId,
    });
    return { data: { tenantId, ...response } };
  }
}
