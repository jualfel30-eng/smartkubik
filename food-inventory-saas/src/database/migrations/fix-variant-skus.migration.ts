import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

/**
 * Migration: Fix variant SKUs that were generated as "{baseSku}-VAR1" instead
 * of using the base product SKU directly.
 *
 * Bug: buildVariantPayload always appended "-VAR{index}" to the base SKU,
 * even for the primary (standard) variant. This caused all primary variants
 * to have SKUs like "TIE-1550-VAR1" instead of just "TIE-1550".
 *
 * This migration:
 * 1. Finds products where the primary variant SKU = "{productSku}-VAR1"
 * 2. Updates the variant SKU to match the product SKU
 * 3. Updates matching inventory records' variantSku field
 * 4. Updates matching inventory records' barcode if it also had the wrong SKU
 */
@Injectable()
export class FixVariantSkusMigration {
  private readonly logger = new Logger(FixVariantSkusMigration.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run() {
    const session = await this.connection.startSession();
    session.startTransaction();

    let productsFixed = 0;
    let inventoriesFixed = 0;

    try {
      // Find all products that have a variant with SKU ending in "-VAR1"
      // where the product's own SKU is the prefix
      const products = await this.connection
        .collection("products")
        .find({
          "variants.sku": { $regex: /-VAR1$/ },
        })
        .project({ _id: 1, sku: 1, variants: 1, tenantId: 1 })
        .toArray();

      this.logger.log(
        `Found ${products.length} products with potential -VAR1 variant SKUs`,
      );

      for (const product of products) {
        const productSku = product.sku;
        if (!productSku) continue;

        const expectedBadSku = `${productSku}-VAR1`;
        const variants = product.variants || [];
        let needsUpdate = false;

        const updatedVariants = variants.map((variant: any) => {
          if (variant.sku === expectedBadSku) {
            needsUpdate = true;
            const updated: any = { ...variant, sku: productSku };
            // Also fix barcode if it was auto-generated from the bad SKU
            if (variant.barcode === expectedBadSku) {
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
          { session },
        );
        productsFixed++;

        // Find the variant _id that was fixed (to update inventory)
        const fixedVariant = variants.find(
          (v: any) => v.sku === expectedBadSku,
        );
        if (!fixedVariant?._id) continue;

        // Update inventory records that reference this variant
        const invResult = await this.connection
          .collection("inventories")
          .updateMany(
            {
              productId: product._id,
              variantSku: expectedBadSku,
            },
            { $set: { variantSku: productSku } },
            { session },
          );

        inventoriesFixed += invResult.modifiedCount;

        this.logger.log(
          `Fixed product ${productSku} (tenant ${product.tenantId}): variant SKU "${expectedBadSku}" → "${productSku}" | ${invResult.modifiedCount} inventory record(s) updated`,
        );
      }

      await session.commitTransaction();
      this.logger.log(
        `Migration completed: ${productsFixed} products fixed, ${inventoriesFixed} inventory records updated`,
      );

      return { productsFixed, inventoriesFixed };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error("Failed to fix variant SKUs", error.stack);
      throw error;
    } finally {
      session.endSession();
    }
  }
}
