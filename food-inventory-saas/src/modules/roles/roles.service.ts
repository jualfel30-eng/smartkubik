import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from '../../schemas/role.schema';
import { CreateRoleDto, UpdateRoleDto } from '../../dto/role.dto';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    private permissionsService: PermissionsService,
  ) {}

  async create(createRoleDto: CreateRoleDto, tenantId: string): Promise<RoleDocument> {
    try {
      const newRole = new this.roleModel({ ...createRoleDto, tenantId });
      return await newRole.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Ya existe un rol con este nombre.');
      }
      throw error;
    }
  }

  async findAll(tenantId: string): Promise<RoleDocument[]> {
    return this.roleModel.find({ tenantId }).exec();
  }

  async findOne(id: string, tenantId: string): Promise<RoleDocument> {
    const role = await this.roleModel.findOne({ _id: id, tenantId }).exec();
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }
    return role;
  }

  async findOneByName(name: string, tenantId: string): Promise<RoleDocument | null> {
    const role = await this.roleModel.findOne({ name, tenantId }).exec();
    if (!role) {
      // This is a valid case for the seeder, so we don't throw.
      // The caller should handle the null case.
      return null;
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, tenantId: string): Promise<RoleDocument> {
    const existingRole = await this.roleModel.findOneAndUpdate({ _id: id, tenantId }, updateRoleDto, { new: true });
    if (!existingRole) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }
    return existingRole;
  }

  async remove(id: string, tenantId: string): Promise<any> {
    // Validar que el rol existe y pertenece al tenant antes de eliminar
    const role = await this.roleModel.findOne({ _id: id, tenantId });
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found or you don't have permission to delete it`);
    }

    const result = await this.roleModel.deleteOne({ _id: id, tenantId });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }
    return result;
  }

  async findOrCreateAdminRoleForTenant(tenantId: Types.ObjectId): Promise<RoleDocument> {
    const adminRoleName = 'admin';
    let adminRole = await this.roleModel.findOne({ name: adminRoleName, tenantId }).exec();

    if (adminRole) {
      return adminRole;
    }

    const allPermissions = this.permissionsService.findAll();
    
    adminRole = new this.roleModel({
      name: adminRoleName,
      tenantId: tenantId,
      permissions: allPermissions,
      isDefault: true,
    });

    return adminRole.save();
  }
}