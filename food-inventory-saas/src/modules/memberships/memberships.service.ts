import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  UserTenantMembership,
  UserTenantMembershipDocument,
  MembershipStatus,
} from "../../schemas/user-tenant-membership.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { Role, RoleDocument } from "../../schemas/role.schema";

export interface MembershipSummary {
  id: string;
  status: MembershipStatus;
  isDefault: boolean;
  tenant: {
    id: string;
    name: string;
    status: string;
  };
  role: {
    id: string;
    name: string;
  };
  permissions: string[];
}

@Injectable()
export class MembershipsService {
  constructor(
    @InjectModel(UserTenantMembership.name)
    private readonly membershipModel: Model<UserTenantMembershipDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  async findActiveMembershipsForUser(
    userId: Types.ObjectId | string,
  ): Promise<MembershipSummary[]> {
    const userObjectId = this.toObjectId(userId);

    const memberships = await this.membershipModel
      .find({ userId: userObjectId, status: "active" })
      .populate("tenantId")
      .populate("roleId")
      .sort({ isDefault: -1, createdAt: 1 })
      .exec();

    return Promise.all(
      memberships.map((membership) => this.toMembershipSummary(membership)),
    );
  }

  async getMembershipForUserOrFail(
    membershipId: string,
    userId: Types.ObjectId | string,
  ): Promise<UserTenantMembershipDocument> {
    const membership = await this.membershipModel
      .findOne({
        _id: this.toObjectId(membershipId),
        userId: this.toObjectId(userId),
      })
      .exec();

    if (!membership) {
      throw new NotFoundException("Membresía no encontrada para el usuario");
    }

    return membership;
  }

  async buildMembershipSummary(
    membership: UserTenantMembershipDocument,
  ): Promise<MembershipSummary> {
    return this.toMembershipSummary(membership);
  }

  async setDefaultMembership(
    userId: Types.ObjectId | string,
    membershipId: Types.ObjectId | string,
  ): Promise<void> {
    const objectUserId = this.toObjectId(userId);
    const objectMembershipId = this.toObjectId(membershipId);

    await this.membershipModel.updateMany(
      { userId: objectUserId },
      { $set: { isDefault: false } },
    );

    await this.membershipModel.updateOne(
      { _id: objectMembershipId, userId: objectUserId },
      { $set: { isDefault: true } },
    );
  }

  async resolveTenantById(
    tenantId: Types.ObjectId | string,
  ): Promise<TenantDocument | null> {
    return this.tenantModel.findById(this.toObjectId(tenantId)).exec();
  }

  async resolveRoleById(
    roleId: Types.ObjectId | string,
  ): Promise<RoleDocument | null> {
    return this.roleModel
      .findById(this.toObjectId(roleId))
      .populate({ path: "permissions", select: "name" })
      .exec();
  }

  async createDefaultMembershipIfMissing(
    userId: Types.ObjectId | string,
    tenantId: Types.ObjectId | string,
    roleId: Types.ObjectId | string,
  ): Promise<MembershipSummary | null> {
    const membershipExists = await this.membershipModel
      .findOne({
        userId: this.toObjectId(userId),
        tenantId: this.toObjectId(tenantId),
      })
      .exec();

    if (membershipExists) {
      return this.buildMembershipSummary(membershipExists);
    }

    const newMembership = await this.membershipModel.create({
      userId: this.toObjectId(userId),
      tenantId: this.toObjectId(tenantId),
      roleId: this.toObjectId(roleId),
      status: "active",
      isDefault: true,
    });

    return this.buildMembershipSummary(newMembership);
  }

  private async toMembershipSummary(
    membership: UserTenantMembershipDocument,
  ): Promise<MembershipSummary> {
    let tenantDoc = membership.tenantId as unknown as
      | TenantDocument
      | null
      | undefined;
    if (!tenantDoc || !tenantDoc.name) {
      tenantDoc = await this.resolveTenantById(membership.tenantId);
    }

    let roleDoc = membership.roleId as unknown as
      | RoleDocument
      | null
      | undefined;
    if (!roleDoc || !roleDoc.name) {
      roleDoc = await this.resolveRoleById(membership.roleId);
    }

    const permissions =
      membership.permissionsCache?.length > 0
        ? membership.permissionsCache
        : await this.resolveRolePermissions(roleDoc ?? null);

    return {
      id: membership._id.toString(),
      status: membership.status,
      isDefault: membership.isDefault,
      tenant: tenantDoc
        ? {
            id: tenantDoc._id.toString(),
            name: tenantDoc.name,
            status: tenantDoc.status,
          }
        : {
            id: "",
            name: "",
            status: "inactive",
          },
      role: roleDoc
        ? {
            id: roleDoc._id.toString(),
            name: roleDoc.name,
          }
        : {
            id: "",
            name: "unknown",
          },
      permissions,
    };
  }

  private async resolveRolePermissions(
    roleDoc: RoleDocument | null,
  ): Promise<string[]> {
    if (!roleDoc) {
      return [];
    }

    if (Array.isArray((roleDoc as any).permissions)) {
      return (roleDoc as any).permissions
        .map((permission: any) => permission?.name)
        .filter((name: string | undefined): name is string => Boolean(name));
    }

    const populatedRole = await this.roleModel
      .findById(roleDoc._id)
      .populate({ path: "permissions", select: "name" })
      .exec();

    if (!populatedRole) {
      return [];
    }

    return (populatedRole.permissions as any[])
      .map((permission) => permission?.name)
      .filter((name: string | undefined): name is string => Boolean(name));
  }

  private toObjectId(id: Types.ObjectId | string): Types.ObjectId {
    return typeof id === "string" ? new Types.ObjectId(id) : id;
  }
}
