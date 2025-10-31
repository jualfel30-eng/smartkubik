import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ServicePackagesController } from "./service-packages.controller";
import { ServicePackagesService } from "./service-packages.service";
import {
  ServicePackage,
  ServicePackageSchema,
} from "../../schemas/service-package.schema";
import { Service, ServiceSchema } from "../../schemas/service.schema";
import { Resource, ResourceSchema } from "../../schemas/resource.schema";
import { AppointmentsModule } from "../appointments/appointments.module";
import { LoyaltyModule } from "../loyalty/loyalty.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServicePackage.name, schema: ServicePackageSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Resource.name, schema: ResourceSchema },
    ]),
    forwardRef(() => AppointmentsModule),
    forwardRef(() => LoyaltyModule),
  ],
  controllers: [ServicePackagesController],
  providers: [ServicePackagesService],
  exports: [ServicePackagesService],
})
export class ServicePackagesModule {}
