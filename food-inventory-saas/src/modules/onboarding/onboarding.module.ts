import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { User, UserSchema } from "../../schemas/user.schema";
import {
  UserTenantMembership,
  UserTenantMembershipSchema,
} from "../../schemas/user-tenant-membership.schema";
import { RolesModule } from "../roles/roles.module";

import { SeedingModule } from "../seeding/seeding.module";
import { SubscriptionPlansModule } from "../subscription-plans/subscription-plans.module";
import { AuthModule } from "../../auth/auth.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: UserTenantMembership.name, schema: UserTenantMembershipSchema },
    ]),
    RolesModule,
    SeedingModule,
    SubscriptionPlansModule,
    AuthModule,
    MailModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
