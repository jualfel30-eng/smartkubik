import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

/**
 * Migration: Fix variant SKUs that were generated incorrectly.
 *
 * Bug: When products are created via "Compra de Producto Nuevo", the backend
 * assigns the SKU sequentially AFTER creation. At frontend build time the SKU
 * field is empty, so buildVariantPayload produced "-VAR1" (empty prefix + suffix)
 * instead of the product's actual SKU.
 *
 * This migration:
 * 1. Finds products where any variant SKU is "-VAR1" (literally)
 *    OR matches the pattern "-VAR{N}" with no base-SKU prefix
 * 2. Sets those variant SKUs to the product's actual SKU
 * 3. Updates matching inventory records' variantSku field
 *
 * Idempotent — safe to run multiple times.
 */
@Injectable()
export class FixVariantSkusMigration {
  private readonly logger = new Logger(FixVariantSkusMigration.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run() {
    let productsFixed = 0;
    let inventoriesFixed = 0;

    try {
      // Find products where any variant has SKU exactly "-VAR1", "-VAR2", etc.
      // (i.e. starts with "-VAR" — no base SKU prefix)
      const products = await this.connection
        .collection("products")
        .find({
          sku: { $exists: true, $ne: "" },
          "variants.sku": { $regex: /^-VAR\d+$/ },
        })
        .project({ _id: 1, sku: 1, variants: 1, tenantId: 1 })
        .toArray();

      this.logger.log(
        `Found ${products.length} products with broken variant SKUs (literal -VAR{N})`,
      );

      for (const product of products) {
        const productSku = product.sku;
        if (!productSku) continue;

        const variants = product.variants || [];
        let needsUpdate = false;
        const badSkus: string[] = [];

        const updatedVariants = variants.map((variant: any) => {
          // Match variant SKUs that are literally "-VAR1", "-VAR2", etc.
          if (variant.sku && /^-VAR\d+$/.test(variant.sku)) {
            needsUpdate = true;
            const oldSku = variant.sku;
            badSkus.push(oldSku);
            const updated: any = { ...variant, sku: productSku };
            // Also fix barcode if it matches the bad pattern
            if (variant.barcode && /^-VAR\d+$/.test(variant.barcode)) {
              updated.barcode = productSku;
            }
            return updated;
          }
          return variant;
        });

        if (!needsUpdate) continue;

        // Update the product's variants
        await this.connection.collection("products").updateOne(
          { _id: product._id },
          { $set: { variants: updatedVariants } },
        );
        productsFixed++;

        // Update inventory records that reference any of the bad SKUs
        for (const badSku of badSkus) {
          const invResult = await this.connection
            .collection("inventories")
            .updateMany(
              {
                productId: product._id,
                variantSku: badSku,
              },
              { $set: { variantSku: productSku } },
            );

          inventoriesFixed += invResult.modifiedCount;
        }

        this.logger.log(
          `Fixed product ${productSku} (tenant ${product.tenantId}): variant SKU "${badSkus.join(", ")}" → "${productSku}"`,
        );
      }

      this.logger.log(
        `Migration completed: ${productsFixed} products fixed, ${inventoriesFixed} inventory records updated`,
      );

      return { productsFixed, inventoriesFixed };
    } catch (error) {
      this.logger.error("Failed to fix variant SKUs", error.stack);
      throw error;
    }
  }
}
