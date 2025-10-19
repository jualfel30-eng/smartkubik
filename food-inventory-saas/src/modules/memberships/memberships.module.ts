import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  UserTenantMembership,
  UserTenantMembershipSchema,
} from "../../schemas/user-tenant-membership.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { Role, RoleSchema } from "../../schemas/role.schema";
import { MembershipsService } from "./memberships.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserTenantMembership.name, schema: UserTenantMembershipSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
