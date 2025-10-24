import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";
import {
  GlobalSetting,
  GlobalSettingDocument,
} from "../../schemas/global-settings.schema";
import { AuthService } from "../../auth/auth.service";
import {
  TenantConfigurationCacheService,
  TenantConfigurationSnapshot,
} from "../../common/cache/tenant-configuration-cache.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { TaskQueueService } from "../task-queue/task-queue.service";
import type { TaskQueueJobStatus } from "../../schemas/task-queue-job.schema";
import type { ListQueueJobsOptions } from "../task-queue/task-queue.types";

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  // All models that have a tenantId field and need to be cleaned up.
  private tenantModels = [
    "Appointment",
    "BankAccount",
    "BankReconciliation",
    "BankStatement",
    "BillSplit",
    "ChartOfAccounts",
    "Customer",
    "DeliveryRates",
    "Event",
    "Inventory",
    "InventoryMovement",
    "JournalEntry",
    "KitchenOrder",
    "ModifierGroup",
    "Modifier",
    "Order",
    "Payable",
    "PerformanceKpi",
    "Product",
    "PurchaseOrderRating",
    "PurchaseOrder",
    "RecurringPayable",
    "Resource",
    "Role",
    "Service",
    "Shift",
    "StorefrontConfig",
    "Supplier",
    "Table",
    "Todo",
    "UserTenantMembership",
    "User",
    // Tenant model is handled separately.
  ];

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(GlobalSetting.name)
    private readonly globalSettingModel: Model<GlobalSettingDocument>,
    private readonly authService: AuthService,
    private readonly tenantConfigurationCache: TenantConfigurationCacheService,
    private readonly auditLogService: AuditLogService,
    private readonly taskQueueService: TaskQueueService,
  ) {}

  async impersonateUser(
    targetUserId: string,
    impersonatorId: string,
    sessionContext: { ip?: string; userAgent?: string } = {},
    reason?: string,
  ): Promise<any> {
    this.logger.log(
      `Impersonation attempt: ${impersonatorId} is trying to impersonate ${targetUserId}`,
    );
    const resolvedIp = this.normalizeIpForAudit(sessionContext.ip);
    const sanitizedReason = reason?.trim() || undefined;
    try {
      const result = await this.authService.login(
        targetUserId,
        true,
        impersonatorId,
        sessionContext,
      );

      await this.recordImpersonationAudit(
        "impersonate_user",
        impersonatorId,
        targetUserId,
        resolvedIp,
        {
          targetUserId,
          sessionId: result?.sessionId ?? null,
          userAgent: sessionContext.userAgent ?? null,
          reason: sanitizedReason ?? null,
        },
      );

      return result;
    } catch (error) {
      await this.recordImpersonationAudit(
        "impersonate_user_failed",
        impersonatorId,
        targetUserId,
        resolvedIp,
        {
          targetUserId,
          error:
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "unknown_error",
          reason: sanitizedReason ?? null,
        },
      );
      throw error;
    }
  }

  private normalizeIpForAudit(ip?: string | null): string {
    if (!ip) {
      return "unknown";
    }
    return ip.trim() || "unknown";
  }

  private async recordImpersonationAudit(
    action: string,
    impersonatorId: string,
    targetUserId: string,
    ipAddress: string,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      await this.auditLogService.createLog(
        action,
        impersonatorId,
        details,
        ipAddress,
        null,
        targetUserId,
      );
    } catch (auditError) {
      const message =
        auditError instanceof Error
          ? auditError.message
          : typeof auditError === "string"
            ? auditError
            : "unknown_error";
      this.logger.warn(
        `Failed to persist impersonation audit log (${action}): ${message}`,
      );
    }
  }

  async getSetting(key: string): Promise<GlobalSettingDocument | null> {
    return this.globalSettingModel.findOne({ key }).exec();
  }

  async updateSetting(
    key: string,
    value: string,
  ): Promise<GlobalSettingDocument> {
    return this.globalSettingModel
      .findOneAndUpdate(
        { key },
        { $set: { value } },
        { new: true, upsert: true },
      )
      .exec();
  }

  async getTenants(page = 1, limit = 10, search = ""): Promise<any> {
    this.logger.log(
      `Fetching tenants for Super Admin: page=${page}, limit=${limit}, search=${search}`,
    );

    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { code: { $regex: search, $options: "i" } },
            { "contactInfo.email": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const tenants = await this.connection
      .model("Tenant")
      .find(searchQuery)
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .exec();

    const total = await this.connection
      .model("Tenant")
      .countDocuments(searchQuery);

    return { tenants, total };
  }

  async getQueueStats() {
    return this.taskQueueService.getStats();
  }

  async listQueueJobs(options: ListQueueJobsOptions = {}) {
    return this.taskQueueService.listJobs(options);
  }

  async retryQueueJob(jobId: string): Promise<void> {
    await this.taskQueueService.retryJob(jobId);
  }

  async deleteQueueJob(jobId: string): Promise<void> {
    await this.taskQueueService.deleteJob(jobId);
  }

  async purgeQueueJobs(
    status: TaskQueueJobStatus,
    olderThanMinutes?: number,
  ): Promise<number> {
    return this.taskQueueService.purgeJobs(status, olderThanMinutes);
  }

  async getMetrics(): Promise<any> {
    this.logger.log("Fetching super admin metrics");
    // This is a placeholder. In the future, this could calculate global metrics.
    const totalTenants = await this.connection.model("Tenant").countDocuments();
    const totalUsers = await this.connection.model("User").countDocuments();
    return { totalTenants, totalUsers, placeholder: true };
  }

  async updateTenantStatus(tenantId: string, status: string): Promise<any> {
    this.logger.log(`Updating status for tenant ID: ${tenantId} to ${status}`);
    const updatedTenant = await this.connection
      .model("Tenant")
      .findByIdAndUpdate(tenantId, { $set: { status } }, { new: true })
      .exec();

    if (!updatedTenant) {
      throw new NotFoundException(`Tenant con ID "${tenantId}" no encontrado.`);
    }

    this.tenantConfigurationCache.invalidate(tenantId);
    return updatedTenant;
  }

  async updateTenant(tenantId: string, updateData: any): Promise<any> {
    this.logger.log(`Updating tenant ID: ${tenantId}`);
    // We should add validation here in a real app (e.g., using a DTO)
    const updatedTenant = await this.connection
      .model("Tenant")
      .findByIdAndUpdate(tenantId, { $set: updateData }, { new: true })
      .exec();

    if (!updatedTenant) {
      throw new NotFoundException(`Tenant con ID "${tenantId}" no encontrado.`);
    }

    this.tenantConfigurationCache.invalidate(tenantId);
    return updatedTenant;
  }

  async getUsersForTenant(tenantId: string): Promise<any> {
    this.logger.log(`Fetching users for tenant ID: ${tenantId}`);
    const users = await this.connection
      .model("User")
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .exec();
    return users;
  }

  async getTenantConfiguration(
    tenantId: string,
  ): Promise<TenantConfigurationSnapshot> {
    const cachedSnapshot = this.tenantConfigurationCache.get(tenantId);
    if (cachedSnapshot) {
      this.logger.debug(
        `Serving cached tenant configuration for tenantId=${tenantId}.`,
      );
      return cachedSnapshot;
    }

    this.logger.log(
      `Fetching fresh configuration snapshot for tenant ID: ${tenantId}`,
    );
    const tenantObjectId = new Types.ObjectId(tenantId);

    const tenant = await this.connection
      .model("Tenant")
      .findById(tenantObjectId)
      .lean()
      .exec();
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID "${tenantId}" no encontrado.`);
    }

    const [roles, allPermissions] = await Promise.all([
      this.connection
        .model("Role")
        .find({ tenantId: tenantObjectId })
        .sort({ name: 1 })
        .populate({
          path: "permissions",
          select: "name module action description",
          options: { lean: true },
        })
        .lean()
        .exec(),
      this.connection
        .model("Permission")
        .find({})
        .sort({ module: 1, name: 1 })
        .lean()
        .exec(),
    ]);

    const snapshot: TenantConfigurationSnapshot = {
      tenant,
      roles,
      allPermissions,
      cachedAt: new Date().toISOString(),
      metadata: {
        ttlMs: 0,
        expiresAt: 0,
      },
    };

    this.tenantConfigurationCache.set(tenantId, snapshot);
    return snapshot;
  }

  async updateTenantModules(
    tenantId: string,
    enabledModules: any,
  ): Promise<any> {
    this.logger.log(`Updating enabled modules for tenant ID: ${tenantId}`);
    const tenantObjectId = new Types.ObjectId(tenantId);

    const result = await this.connection
      .model("Tenant")
      .updateOne({ _id: tenantObjectId }, { $set: { enabledModules } })
      .exec();

    if (result.modifiedCount === 0) {
      this.logger.warn(
        `Tenant with ID "${tenantId}" not found or modules were not changed.`,
      );
    }

    this.tenantConfigurationCache.invalidate(tenantId);
    return { success: true, ...result };
  }

  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<any> {
    this.logger.log(`Updating permissions for role ID: ${roleId}`);
    const roleObjectId = new Types.ObjectId(roleId);
    const permissionObjectIds = permissionIds.map(
      (id) => new Types.ObjectId(id),
    );

    const roleModel = this.connection.model("Role");
    const role = await roleModel
      .findById(roleObjectId, { tenantId: 1 })
      .lean()
      .exec();

    if (!role) {
      throw new NotFoundException(`Role con ID "${roleId}" no encontrado.`);
    }

    const result = await roleModel
      .updateOne(
        { _id: roleObjectId },
        { $set: { permissions: permissionObjectIds } },
      )
      .exec();

    if (result.modifiedCount === 0) {
      this.logger.warn(
        `Role with ID "${roleId}" not found or permissions were not changed.`,
      );
    }

    if (role.tenantId) {
      this.tenantConfigurationCache.invalidate(role.tenantId.toString());
    }
    return { success: true, ...result };
  }

  async deleteTenant(tenantId: string): Promise<{ message: string }> {
    this.logger.warn(
      `[DANGER] Iniciando proceso de eliminación para el tenant ID: ${tenantId}`,
    );

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const tenantObjectId = new Types.ObjectId(tenantId);

      // First, verify the tenant exists
      const tenant = await this.connection
        .model("Tenant")
        .findById(tenantObjectId)
        .session(session);
      if (!tenant) {
        throw new NotFoundException(
          `Tenant con ID "${tenantId}" no encontrado.`,
        );
      }

      this.logger.log(
        `Tenant "${tenant.name}" encontrado. Procediendo a eliminar datos asociados...`,
      );

      // Delete data from all related collections
      for (const modelName of this.tenantModels) {
        const model = this.connection.model(modelName);
        const result = await model.deleteMany(
          { tenantId: tenantObjectId },
          { session },
        );
        if (result.deletedCount > 0) {
          this.logger.log(
            `- ${modelName}: ${result.deletedCount} documento(s) eliminado(s).`,
          );
        }
      }

      // Finally, delete the tenant itself
      await this.connection
        .model("Tenant")
        .deleteOne({ _id: tenantObjectId }, { session });
      this.logger.log(`- Tenant: 1 documento eliminado.`);

      await session.commitTransaction();
      this.logger.log(
        `[SUCCESS] El tenant con ID ${tenantId} y todos sus datos han sido eliminados.`,
      );

      this.tenantConfigurationCache.invalidate(tenantId);
      return { message: `Tenant con ID ${tenantId} eliminado exitosamente.` };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Error al eliminar el tenant con ID ${tenantId}. Transacción abortada.`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Ocurrió un error durante la eliminación: ${error.message}`,
      );
    } finally {
      session.endSession();
    }
  }

  async syncTenantMemberships(tenantId: string): Promise<{ message: string }> {
    this.logger.log(
      `[SYNC-PERMISSIONS] Iniciando sincronización de permisos para el tenant ID: ${tenantId}`,
    );
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const tenantObjectId = new Types.ObjectId(tenantId);
      const RoleModel = this.connection.model("Role");
      const PermissionModel = this.connection.model("Permission");

      // 1. Find the admin role for the specific tenant
      const adminRole = await RoleModel.findOne({
        tenantId: tenantObjectId,
        name: "admin",
      }).session(session);
      if (!adminRole) {
        throw new NotFoundException(
          `No se encontró un rol 'admin' para el tenant con ID "${tenantId}".`,
        );
      }

      this.logger.log(
        `[SYNC-PERMISSIONS] Rol 'admin' encontrado para el tenant. ID del Rol: ${adminRole._id}`,
      );

      // 2. Get all existing permissions in the system
      const allPermissions = await PermissionModel.find({}).session(session);
      const allPermissionIds = allPermissions.map((p) => p._id);

      this.logger.log(
        `[SYNC-PERMISSIONS] ${allPermissionIds.length} permisos totales encontrados en el sistema.`,
      );

      // 3. Overwrite the role's permissions with the full list
      adminRole.permissions = allPermissionIds;
      await adminRole.save({ session });

      await session.commitTransaction();
      this.logger.log(
        `[SUCCESS] Sincronización de permisos completada para el rol admin del tenant ${tenantId}.`,
      );

      return {
        message:
          "Los permisos del rol de administrador han sido sincronizados exitosamente con el estado actual del sistema.",
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `[SYNC-PERMISSIONS] Error durante la sincronización para el tenant ID ${tenantId}.`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Ocurrió un error durante la sincronización de permisos: ${error.message}`,
      );
    } finally {
      session.endSession();
    }
  }
}
