import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import {
  Organization,
  OrganizationSchema,
} from "../../schemas/organization.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { MembershipsModule } from "../memberships/memberships.module";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Inventory, InventorySchema } from "../../schemas/inventory.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Inventory.name, schema: InventorySchema },
    ]),
    MembershipsModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
