import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule, getQueueToken } from "@nestjs/bullmq";
import {
  Appointment,
  AppointmentSchema,
} from "../../schemas/appointment.schema";
import { Service, ServiceSchema } from "../../schemas/service.schema";
import { Resource, ResourceSchema } from "../../schemas/resource.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { User, UserSchema } from "../../schemas/user.schema";
import { Todo, TodoSchema } from "../../schemas/todo.schema";
import { AppointmentsController } from "./appointments.controller";
import { ServicesController } from "./services.controller";
import { ResourcesController } from "./resources.controller";
import { AppointmentsService } from "./appointments.service";
import { ServicesService } from "./services.service";
import { ResourcesService } from "./resources.service";
import { AppointmentQueueService } from "./queues/appointment-queue.service";
import { AppointmentReminderProcessor } from "./queues/appointment-reminder.processor";
import { APPOINTMENT_REMINDERS_QUEUE } from "./queues/appointments.queue.constants";
import { AppointmentsPublicController } from "./appointments-public.controller";
import { ServicesPublicController } from "./services-public.controller";
import { BankAccountsModule } from "../bank-accounts/bank-accounts.module";
import { AccountingModule } from "../accounting/accounting.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { HospitalityIntegrationsModule } from "../hospitality-integrations/hospitality-integrations.module";
import { WhapiModule } from "../whapi/whapi.module";
import {
  AppointmentAudit,
  AppointmentAuditSchema,
} from "../../schemas/appointment-audit.schema";
import { AppointmentAuditService } from "./appointment-audit.service";

const queueImports =
  process.env.DISABLE_BULLMQ === "true"
    ? []
    : [
        BullModule.registerQueue({
          name: APPOINTMENT_REMINDERS_QUEUE,
        }),
      ];

const queueProviders =
  process.env.DISABLE_BULLMQ === "true"
    ? [
        {
          provide: getQueueToken(APPOINTMENT_REMINDERS_QUEUE),
          useValue: null,
        },
        AppointmentQueueService,
      ]
    : [AppointmentQueueService, AppointmentReminderProcessor];

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Todo.name, schema: TodoSchema },
      { name: AppointmentAudit.name, schema: AppointmentAuditSchema },
    ]),
    ...queueImports,
    BankAccountsModule,
    AccountingModule,
    NotificationsModule,
    forwardRef(() => WhapiModule),
    forwardRef(() => HospitalityIntegrationsModule),
  ],
  controllers: [
    AppointmentsController,
    ServicesController,
    ResourcesController,
    AppointmentsPublicController,
    ServicesPublicController,
  ],
  providers: [
    AppointmentsService,
    AppointmentAuditService,
    ServicesService,
    ResourcesService,
    ...queueProviders,
  ],
  exports: [
    AppointmentsService,
    ServicesService,
    ResourcesService,
    AppointmentQueueService,
    AppointmentAuditService,
  ],
})
export class AppointmentsModule {}
