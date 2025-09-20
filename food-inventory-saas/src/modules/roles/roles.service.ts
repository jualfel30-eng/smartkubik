import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from '../../schemas/role.schema';
import { CreateRoleDto, UpdateRoleDto } from '../../dto/role.dto';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) {}

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

  async findOneByName(name: string, tenantId: string): Promise<RoleDocument> {
    const role = await this.roleModel.findOne({ name, tenantId }).exec();
    if (!role) {
      throw new NotFoundException(`Role with name "${name}" not found`);
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
    const result = await this.roleModel.deleteOne({ _id: id, tenantId });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }
    return result;
  }
}
