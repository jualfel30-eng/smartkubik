import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
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
import { MembershipsModule } from "../memberships/memberships.module";
import { BillingModule } from "../billing/billing.module";
import { TrialExpirationJob } from "../../jobs/trial-expiration.job";
import { WhatsAppFollowUpJob } from "../../jobs/whatsapp-followup.job";
import { WhapiModule } from "../whapi/whapi.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: UserTenantMembership.name, schema: UserTenantMembershipSchema },
    ]),
    ScheduleModule.forRoot(),
    RolesModule,
    SeedingModule,
    SubscriptionPlansModule,
    forwardRef(() => AuthModule),
    MailModule,
    MembershipsModule,
    BillingModule,
    WhapiModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, TrialExpirationJob, WhatsAppFollowUpJob],
})
export class OnboardingModule {}
