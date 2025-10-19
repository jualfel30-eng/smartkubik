import { Module, Global } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Tenant, TenantSchema } from "../schemas/tenant.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { Customer, CustomerSchema } from "../schemas/customer.schema";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  exports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
})
export class SharedModule {}
