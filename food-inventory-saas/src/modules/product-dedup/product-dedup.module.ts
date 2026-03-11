import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Product, ProductSchema } from "@/schemas/product.schema";
import {
  Inventory,
  InventorySchema,
  InventoryMovement,
  InventoryMovementSchema,
} from "@/schemas/inventory.schema";
import { Order, OrderSchema } from "@/schemas/order.schema";
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from "@/schemas/purchase-order.schema";
import {
  TransferOrder,
  TransferOrderSchema,
} from "@/schemas/transfer-order.schema";
import {
  ProductPriceList,
  ProductPriceListSchema,
} from "@/schemas/product-price-list.schema";
import {
  BillOfMaterials,
  BillOfMaterialsSchema,
} from "@/schemas/bill-of-materials.schema";
import {
  ProductCampaign,
  ProductCampaignSchema,
} from "@/schemas/product-campaign.schema";
import {
  ProductConsumableConfig,
  ProductConsumableConfigSchema,
} from "@/schemas/product-consumable-config.schema";
import {
  ProductSupplyConfig,
  ProductSupplyConfigSchema,
} from "@/schemas/product-supply-config.schema";
import {
  ProductConsumableRelation,
  ProductConsumableRelationSchema,
} from "@/schemas/product-consumable-relation.schema";
import {
  MergeJob,
  MergeJobSchema,
} from "@/schemas/merge-job.schema";
import {
  DuplicateGroup,
  DuplicateGroupSchema,
} from "@/schemas/duplicate-group.schema";
import { ProductDedupController } from "./product-dedup.controller";
import { ProductDedupService } from "./product-dedup.service";
import { DedupEngineService } from "./dedup-engine.service";
import { MergeExecutorService } from "./merge-executor.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MergeJob.name, schema: MergeJobSchema },
      { name: DuplicateGroup.name, schema: DuplicateGroupSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: Order.name, schema: OrderSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: TransferOrder.name, schema: TransferOrderSchema },
      { name: ProductPriceList.name, schema: ProductPriceListSchema },
      {
        name: BillOfMaterials.name,
        schema: BillOfMaterialsSchema,
      },
      {
        name: ProductCampaign.name,
        schema: ProductCampaignSchema,
      },
      {
        name: ProductConsumableConfig.name,
        schema: ProductConsumableConfigSchema,
      },
      {
        name: ProductSupplyConfig.name,
        schema: ProductSupplyConfigSchema,
      },
      {
        name: ProductConsumableRelation.name,
        schema: ProductConsumableRelationSchema,
      },
    ]),
  ],
  controllers: [ProductDedupController],
  providers: [
    ProductDedupService,
    DedupEngineService,
    MergeExecutorService,
  ],
  exports: [ProductDedupService],
})
export class ProductDedupModule {}
