import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { WasteController } from "./waste.controller";
import { WasteService } from "./waste.service";
import { WasteEntry, WasteEntrySchema } from "../../schemas/waste-entry.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { InventoryModule } from "../inventory/inventory.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WasteEntry.name, schema: WasteEntrySchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    InventoryModule,
  ],
  controllers: [WasteController],
  providers: [WasteService],
  exports: [WasteService],
})
export class WasteModule { }
