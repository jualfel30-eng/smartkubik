import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../../auth/auth.module";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";
import { RolesModule } from "../roles/roles.module";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { PurchasesModule } from "../purchases/purchases.module";
import {
  AuditLog,
  AuditLogSchema,
} from "../../schemas/audit-log.schema"; // Import AuditLog schema
import { Inventory, InventorySchema } from "../../schemas/inventory.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: 'Inventory', schema: InventorySchema },
    ]),
    forwardRef(() => AuthModule),
    RolesModule,
    forwardRef(() => PurchasesModule),
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule { }
