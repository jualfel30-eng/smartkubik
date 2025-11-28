import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ReservationsController } from "./reservations.controller";
import { ReservationsService } from "./reservations.service";
import {
  Reservation,
  ReservationSchema,
} from "../../schemas/reservation.schema";
import {
  ReservationSettings,
  ReservationSettingsSchema,
} from "../../schemas/reservation-settings.schema";
import { Table, TableSchema } from "../../schemas/table.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { PermissionsModule } from "../permissions/permissions.module";
import { MailModule } from "../mail/mail.module";
import { SendReservationConfirmationJob } from "./jobs/send-confirmation.job";
import { SendReservationReminderJob } from "./jobs/send-reminder.job";
import { MarkNoShowJob } from "./jobs/mark-no-show.job";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
      { name: ReservationSettings.name, schema: ReservationSettingsSchema },
      { name: Table.name, schema: TableSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    PermissionsModule,
    MailModule,
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    SendReservationConfirmationJob,
    SendReservationReminderJob,
    MarkNoShowJob,
  ],
  exports: [ReservationsService],
})
export class ReservationsModule {}
