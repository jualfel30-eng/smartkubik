import { Injectable } from "@nestjs/common";
import { ImportHandler } from "../interfaces/import-handler.interface";
import { ProductImportHandler } from "./product-import.handler";
import { CustomerImportHandler } from "./customer-import.handler";
import { SupplierImportHandler } from "./supplier-import.handler";
import { InventoryImportHandler } from "./inventory-import.handler";
import { CategoryImportHandler } from "./category-import.handler";

@Injectable()
export class HandlerRegistry {
  private readonly handlers: Map<string, ImportHandler> = new Map();

  constructor(
    private readonly productHandler: ProductImportHandler,
    private readonly customerHandler: CustomerImportHandler,
    private readonly supplierHandler: SupplierImportHandler,
    private readonly inventoryHandler: InventoryImportHandler,
    private readonly categoryHandler: CategoryImportHandler,
  ) {
    this.handlers.set("products", this.productHandler);
    this.handlers.set("customers", this.customerHandler);
    this.handlers.set("suppliers", this.supplierHandler);
    this.handlers.set("inventory", this.inventoryHandler);
    this.handlers.set("categories", this.categoryHandler);
  }

  getHandler(entityType: string): ImportHandler | undefined {
    return this.handlers.get(entityType);
  }

  getAvailableTypes(): Array<{ entityType: string; displayName: string; description: string }> {
    return Array.from(this.handlers.values()).map((h) => ({
      entityType: h.entityType,
      displayName: h.displayName,
      description: h.description,
    }));
  }
}
