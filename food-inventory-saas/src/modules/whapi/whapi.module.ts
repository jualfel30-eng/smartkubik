import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { WhapiController } from "./whapi.controller";
import { WhapiService } from "./whapi.service";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [WhapiController],
  providers: [WhapiService],
  exports: [WhapiService],
})
export class WhapiModule {}
