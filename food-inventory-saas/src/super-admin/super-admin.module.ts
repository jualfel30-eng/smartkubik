import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SuperAdminController } from "./super-admin.controller";
import { SuperAdminService } from "./super-admin.service";
import { Tenant, TenantSchema } from "../schemas/tenant.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { Event, EventSchema } from "../schemas/event.schema";
import { Role, RoleSchema } from "../schemas/role.schema";
import { Permission, PermissionSchema } from "../schemas/permission.schema";
import { AuthModule } from "../auth/auth.module";
import { AuditLogModule } from "../modules/audit-log/audit-log.module";
import {
  DocumentSequence,
  DocumentSequenceSchema,
} from "../schemas/document-sequence.schema";
import {
  UserTenantMembership,
  UserTenantMembershipSchema,
} from "../schemas/user-tenant-membership.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Event.name, schema: EventSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: UserTenantMembership.name, schema: UserTenantMembershipSchema },
      { name: DocumentSequence.name, schema: DocumentSequenceSchema },
    ]),
    AuthModule,
    AuditLogModule,
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule { }
