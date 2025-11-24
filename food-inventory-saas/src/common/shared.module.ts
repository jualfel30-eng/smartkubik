import { Module, Global } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Tenant, TenantSchema } from "../schemas/tenant.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { Customer, CustomerSchema } from "../schemas/customer.schema";
import {
  UserTenantMembership,
  UserTenantMembershipSchema,
} from "../schemas/user-tenant-membership.schema";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: UserTenantMembership.name, schema: UserTenantMembershipSchema },
    ]),
  ],
  exports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: UserTenantMembership.name, schema: UserTenantMembershipSchema },
    ]),
  ],
})
export class SharedModule {}
