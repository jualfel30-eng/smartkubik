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
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
      { name: ReservationSettings.name, schema: ReservationSettingsSchema },
      { name: Table.name, schema: TableSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
