import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  StoreCreditAccount,
  StoreCreditAccountSchema,
  StoreCreditMovement,
  StoreCreditMovementSchema,
} from "./schemas/store-credit.schema";
import { StoreCreditService } from "./store-credit.service";
import { StoreCreditController } from "./store-credit.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StoreCreditAccount.name, schema: StoreCreditAccountSchema },
      { name: StoreCreditMovement.name, schema: StoreCreditMovementSchema },
    ]),
  ],
  controllers: [StoreCreditController],
  providers: [StoreCreditService],
  exports: [StoreCreditService],
})
export class StoreCreditModule {}
