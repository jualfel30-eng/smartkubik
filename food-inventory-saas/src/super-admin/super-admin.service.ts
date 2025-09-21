import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { AuthService } from '../auth/auth.service';
import { AuditLogService } from '../modules/audit-log/audit-log.service';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(AuthService) private authService: AuthService,
    private auditLogService: AuditLogService,
  ) {}

  async findAll(): Promise<Tenant[]> {
    return this.tenantModel.find().exec();
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantModel.findById(id).exec();
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID "${id}" no encontrado`);
    }
    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto, performedBy: string, ipAddress: string): Promise<Tenant> {
    const oldTenant = await this.tenantModel.findById(id).lean().exec();
    if (!oldTenant) {
      throw new NotFoundException(`Tenant con ID "${id}" no encontrado`);
    }

    const updatedTenant = await this.tenantModel.findByIdAndUpdate(id, updateTenantDto, { new: true }).exec();
    if (!updatedTenant) {
      throw new NotFoundException(`Tenant con ID "${id}" no encontrado`);
    }

    await this.auditLogService.createLog(
      'update_tenant',
      performedBy,
      { oldData: oldTenant, newData: updatedTenant.toObject() },
      ipAddress,
      updatedTenant._id.toString(),
    );

    return updatedTenant;
  }

  async updateStatus(id: string, status: string, performedBy: string, ipAddress: string): Promise<Tenant> {
    const oldTenant = await this.tenantModel.findById(id).exec();
    if (!oldTenant) {
      throw new NotFoundException(`Tenant con ID "${id}" no encontrado`);
    }

    const updatedTenant = await this.tenantModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    ).exec();

    if (!updatedTenant) {
      throw new NotFoundException(`Tenant con ID "${id}" no encontrado`);
    }

    await this.auditLogService.createLog(
      'update_tenant_status',
      performedBy,
      { oldStatus: oldTenant.status, newStatus: updatedTenant.status },
      ipAddress,
      updatedTenant._id.toString(),
    );

    return updatedTenant;
  }

  async findUsersByTenant(tenantId: string): Promise<User[]> {
    console.log('---!!! [DEBUG] Forzando búsqueda para ObjectId:', tenantId, '!!!---');
    const users = await this.userModel.find({ tenantId: new Types.ObjectId(tenantId) }).exec();
    console.log('---!!! [DEBUG] Usuarios encontrados con ObjectId forzado:', users, '!!!---');
    return users;
  }

  async impersonateUser(userId: string, currentUser: any, ipAddress: string): Promise<{ accessToken: string, refreshToken: string }> {
    const userToImpersonate = await this.userModel.findById(userId).exec();
    if (!userToImpersonate) {
      throw new NotFoundException(`Usuario con ID "${userId}" no encontrado`);
    }
    const { accessToken, refreshToken } = await this.authService.login(userToImpersonate, true, currentUser.id);

    console.log('---!!! [DEBUG] userToImpersonate object:', userToImpersonate, '!!! ---');

    await this.auditLogService.createLog(
      'impersonate_user',
      currentUser.id.toString(),
      { impersonatedUserEmail: userToImpersonate.email },
      ipAddress,
      userToImpersonate.tenantId ? userToImpersonate.tenantId.toString() : null,
      userToImpersonate._id.toString(),
    );

    return { accessToken, refreshToken };
  }

  async findAuditLogs() {
    return this.auditLogService.findLogs({});
  }

  async getGlobalMetrics() {
    const totalTenants = await this.tenantModel.countDocuments().exec();
    const activeTenants = await this.tenantModel.countDocuments({ status: 'active' }).exec();
    const suspendedTenants = await this.tenantModel.countDocuments({ status: 'suspended' }).exec();
    const totalUsers = await this.userModel.countDocuments().exec();

    // Example: New tenants in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newTenantsLast30Days = await this.tenantModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }).exec();

    // Example: New users in the last 30 days
    const newUsersLast30Days = await this.userModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }).exec();

    // Example: Active users (logged in within last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const activeUsersLast24Hours = await this.userModel.countDocuments({ lastLoginAt: { $gte: twentyFourHoursAgo } }).exec();

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      newTenantsLast30Days,
      newUsersLast30Days,
      activeUsersLast24Hours,
    };
  }
}
