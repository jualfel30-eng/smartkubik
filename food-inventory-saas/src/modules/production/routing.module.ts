import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RoutingController } from "./routing.controller";
import { RoutingService } from "./routing.service";
import { Routing, RoutingSchema } from "../../schemas/routing.schema";
import { WorkCenter, WorkCenterSchema } from "../../schemas/work-center.schema";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Routing.name, schema: RoutingSchema },
      { name: WorkCenter.name, schema: WorkCenterSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [RoutingController],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}
