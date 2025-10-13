
import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { GlobalSetting, GlobalSettingDocument } from '../../schemas/global-settings.schema';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  // All models that have a tenantId field and need to be cleaned up.
  private tenantModels = [
    'Appointment', 'BankAccount', 'BankReconciliation', 'BankStatement',
    'BillSplit', 'ChartOfAccounts', 'Customer', 'DeliveryRates', 'Event',
    'Inventory', 'InventoryMovement', 'JournalEntry', 'KitchenOrder',
    'ModifierGroup', 'Modifier', 'Order', 'Payable', 'PerformanceKpi',
    'Product', 'PurchaseOrderRating', 'PurchaseOrder', 'RecurringPayable',
    'Resource', 'Role', 'Service', 'Shift', 'StorefrontConfig', 'Supplier',
    'Table', 'Todo', 'UserTenantMembership', 'User'
    // Tenant model is handled separately.
  ];

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(GlobalSetting.name) private readonly globalSettingModel: Model<GlobalSettingDocument>,
  ) {}

  async getSetting(key: string): Promise<GlobalSettingDocument | null> {
    return this.globalSettingModel.findOne({ key }).exec();
  }

  async updateSetting(key: string, value: string): Promise<GlobalSettingDocument> {
    return this.globalSettingModel.findOneAndUpdate(
      { key },
      { $set: { value } },
      { new: true, upsert: true }
    ).exec();
  }

  async getTenants(page = 1, limit = 10, search = ''): Promise<any> {
    this.logger.log(`Fetching tenants for Super Admin: page=${page}, limit=${limit}, search=${search}`);
    
    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
      ],
    } : {};

    const tenants = await this.connection.model('Tenant').find(searchQuery)
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .exec();

    const total = await this.connection.model('Tenant').countDocuments(searchQuery);

    return { tenants, total };
  }

  async getMetrics(): Promise<any> {
    this.logger.log('Fetching super admin metrics');
    // This is a placeholder. In the future, this could calculate global metrics.
    const totalTenants = await this.connection.model('Tenant').countDocuments();
    const totalUsers = await this.connection.model('User').countDocuments();
    return { totalTenants, totalUsers, placeholder: true };
  }

  async getTenantConfiguration(tenantId: string): Promise<any> {
    this.logger.log(`Fetching configuration for tenant ID: ${tenantId}`);
    const tenantObjectId = new Types.ObjectId(tenantId);

    const tenant = await this.connection.model('Tenant').findById(tenantObjectId).exec();
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID "${tenantId}" no encontrado.`);
    }

    const roles = await this.connection.model('Role').find({ tenantId: tenantObjectId }).populate('permissions').exec();
    const allPermissions = await this.connection.model('Permission').find({}).exec();

    return { tenant, roles, allPermissions };
  }

  async updateTenantModules(tenantId: string, enabledModules: any): Promise<any> {
    this.logger.log(`Updating enabled modules for tenant ID: ${tenantId}`);
    const tenantObjectId = new Types.ObjectId(tenantId);

    const result = await this.connection.model('Tenant').updateOne(
      { _id: tenantObjectId },
      { $set: { enabledModules } }
    ).exec();

    if (result.modifiedCount === 0) {
      this.logger.warn(`Tenant with ID "${tenantId}" not found or modules were not changed.`);
    }

    return { success: true, ...result };
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<any> {
    this.logger.log(`Updating permissions for role ID: ${roleId}`);
    const roleObjectId = new Types.ObjectId(roleId);
    const permissionObjectIds = permissionIds.map(id => new Types.ObjectId(id));

    const result = await this.connection.model('Role').updateOne(
      { _id: roleObjectId },
      { $set: { permissions: permissionObjectIds } }
    ).exec();

    if (result.modifiedCount === 0) {
      this.logger.warn(`Role with ID "${roleId}" not found or permissions were not changed.`);
    }

    return { success: true, ...result };
  }

  async deleteTenant(tenantId: string): Promise<{ message: string }> {
    this.logger.warn(`[DANGER] Iniciando proceso de eliminación para el tenant ID: ${tenantId}`);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const tenantObjectId = new Types.ObjectId(tenantId);

      // First, verify the tenant exists
      const tenant = await this.connection.model('Tenant').findById(tenantObjectId).session(session);
      if (!tenant) {
        throw new NotFoundException(`Tenant con ID "${tenantId}" no encontrado.`);
      }

      this.logger.log(`Tenant "${tenant.name}" encontrado. Procediendo a eliminar datos asociados...`);

      // Delete data from all related collections
      for (const modelName of this.tenantModels) {
        const model = this.connection.model(modelName);
        const result = await model.deleteMany({ tenantId: tenantObjectId }, { session });
        if (result.deletedCount > 0) {
          this.logger.log(`- ${modelName}: ${result.deletedCount} documento(s) eliminado(s).`);
        }
      }

      // Finally, delete the tenant itself
      await this.connection.model('Tenant').deleteOne({ _id: tenantObjectId }, { session });
      this.logger.log(`- Tenant: 1 documento eliminado.`);

      await session.commitTransaction();
      this.logger.log(`[SUCCESS] El tenant con ID ${tenantId} y todos sus datos han sido eliminados.`);
      
      return { message: `Tenant con ID ${tenantId} eliminado exitosamente.` };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Error al eliminar el tenant con ID ${tenantId}. Transacción abortada.`, error.stack);
      throw new InternalServerErrorException(`Ocurrió un error durante la eliminación: ${error.message}`);
    } finally {
      session.endSession();
    }
  }
}
