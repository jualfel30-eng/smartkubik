import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Tenant, TenantSchema } from "./schemas/tenant.schema";
import { User, UserSchema } from "./schemas/user.schema";
import { TenantController } from "./tenant.controller";
import { TenantService } from "./tenant.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
