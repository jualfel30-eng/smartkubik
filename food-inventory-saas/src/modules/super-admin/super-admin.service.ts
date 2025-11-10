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
  ) {}

  async impersonateUser(
    targetUserId: string,
    impersonatorId: string,
  ): Promise<any> {
    this.logger.log(
      `Impersonation attempt: ${impersonatorId} is trying to impersonate ${targetUserId}`,
    );
    return this.authService.login(targetUserId, true, impersonatorId);
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

  async getFeatureFlags(): Promise<any> {
    this.logger.log('Fetching all feature flags');

    // Feature flags keys
    const featureFlagKeys = [
      'ENABLE_EMPLOYEE_PERFORMANCE',
      'ENABLE_BANK_MOVEMENTS',
      'ENABLE_BANK_RECONCILIATION',
      'ENABLE_BANK_TRANSFERS',
      'ENABLE_DASHBOARD_CHARTS',
      'ENABLE_ADVANCED_REPORTS',
      'ENABLE_PREDICTIVE_ANALYTICS',
      'ENABLE_CUSTOMER_SEGMENTATION',
      'ENABLE_MULTI_TENANT_LOGIN',
      'ENABLE_SERVICE_BOOKING_PORTAL',
      'ENABLE_APPOINTMENT_REMINDERS',
    ];

    const settings = await this.globalSettingModel
      .find({ key: { $in: featureFlagKeys } })
      .exec();

    // Create a map of existing settings
    const settingsMap = {};
    settings.forEach((setting) => {
      settingsMap[setting.key] = setting.value === 'true';
    });

    // Return all flags with defaults for missing ones
    const result = {};
    featureFlagKeys.forEach((key) => {
      result[key] = settingsMap[key] !== undefined ? settingsMap[key] : false;
    });

    return result;
  }

  async updateFeatureFlags(flags: Record<string, boolean>): Promise<any> {
    this.logger.log('Updating feature flags', flags);

    const updates = Object.entries(flags).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { $set: { key, value: String(value) } },
        upsert: true,
      },
    }));

    await this.globalSettingModel.bulkWrite(updates);

    return { success: true, updated: Object.keys(flags).length };
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

  async getTenantConfiguration(tenantId: string): Promise<any> {
    this.logger.log(`Fetching configuration for tenant ID: ${tenantId}`);
    const tenantObjectId = new Types.ObjectId(tenantId);

    const tenant = await this.connection
      .model("Tenant")
      .findById(tenantObjectId)
      .exec();
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID "${tenantId}" no encontrado.`);
    }

    const roles = await this.connection
      .model("Role")
      .find({ tenantId: tenantObjectId })
      .populate("permissions")
      .exec();
    const allPermissions = await this.connection
      .model("Permission")
      .find({})
      .exec();

    return { tenant, roles, allPermissions };
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

    return { success: true, ...result };
  }

  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<any> {
    this.logger.log(`Updating permissions for role ID: ${roleId}`);
    const roleObjectId = new Types.ObjectId(roleId);
    // Permissions are stored as strings, not ObjectIds
    const permissions = permissionIds;

    const result = await this.connection
      .model("Role")
      .updateOne({ _id: roleObjectId }, { $set: { permissions: permissions } })
      .exec();

    if (result.modifiedCount === 0) {
      this.logger.warn(
        `Role with ID "${roleId}" not found or permissions were not changed.`,
      );
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
