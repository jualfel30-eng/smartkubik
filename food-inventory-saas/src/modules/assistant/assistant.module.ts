import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AssistantGateway } from "./assistant.gateway";
import { AssistantService } from "./assistant.service";
import { KnowledgeBaseModule } from "../knowledge-base/knowledge-base.module";
import { OpenaiModule } from "../openai/openai.module";
import { AssistantController } from "./assistant.controller";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { Inventory, InventorySchema } from "../../schemas/inventory.schema";
import { Service, ServiceSchema } from "../../schemas/service.schema";
import { Resource, ResourceSchema } from "../../schemas/resource.schema";
import { AssistantToolsService } from "./assistant-tools.service";
import { AppointmentsModule } from "../appointments/appointments.module";

@Module({
  imports: [
    KnowledgeBaseModule,
    OpenaiModule,
    AppointmentsModule,
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Resource.name, schema: ResourceSchema },
    ]),
  ],
  providers: [AssistantGateway, AssistantService, AssistantToolsService],
  controllers: [AssistantController],
  exports: [AssistantService],
})
export class AssistantModule {}
