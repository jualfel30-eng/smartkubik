import { Connection } from "mongoose";
import { Logger } from "@nestjs/common";

const logger = new Logger("ConvertCategoriesToArraysMigration");

export async function up(connection: Connection): Promise<void> {
  logger.log(
    "🚀 Starting migration: Convert category and subcategory to arrays",
  );

  const db = connection.db;
  const productsCollection = db.collection("products");

  // Find all products where category or subcategory is still a string
  const productsToUpdate = await productsCollection
    .find({
      $or: [
        { category: { $type: "string" } },
        { subcategory: { $type: "string" } },
      ],
    })
    .toArray();

  logger.log(`📦 Found ${productsToUpdate.length} products to migrate`);

  let updatedCount = 0;

  for (const product of productsToUpdate) {
    const updateFields: any = {};

    // Convert category from string to array if needed
    if (typeof product.category === "string") {
      updateFields.category = product.category ? [product.category] : [];
      logger.log(
        `  📝 Product ${product.sku}: Converting category "${product.category}" → ["${product.category}"]`,
      );
    }

    // Convert subcategory from string to array if needed
    if (typeof product.subcategory === "string") {
      updateFields.subcategory = product.subcategory
        ? [product.subcategory]
        : [];
      logger.log(
        `  📝 Product ${product.sku}: Converting subcategory "${product.subcategory}" → ["${product.subcategory}"]`,
      );
    }

    // Update the product if there are fields to update
    if (Object.keys(updateFields).length > 0) {
      await productsCollection.updateOne(
        { _id: product._id },
        { $set: updateFields },
      );
      updatedCount++;
    }
  }

  logger.log(
    `✅ Migration completed: ${updatedCount} products updated successfully`,
  );
}

export async function down(connection: Connection): Promise<void> {
  logger.log(
    "⏪ Starting rollback: Convert category and subcategory back to strings",
  );

  const db = connection.db;
  const productsCollection = db.collection("products");

  // Find all products where category or subcategory is an array
  const productsToRollback = await productsCollection
    .find({
      $or: [
        { category: { $type: "array" } },
        { subcategory: { $type: "array" } },
      ],
    })
    .toArray();

  logger.log(`📦 Found ${productsToRollback.length} products to rollback`);

  let rolledBackCount = 0;

  for (const product of productsToRollback) {
    const updateFields: any = {};

    // Convert category from array to string (take first element)
    if (Array.isArray(product.category)) {
      updateFields.category =
        product.category.length > 0 ? product.category[0] : "";
      logger.log(
        `  📝 Product ${product.sku}: Rolling back category [${product.category.join(", ")}] → "${updateFields.category}"`,
      );
    }

    // Convert subcategory from array to string (take first element)
    if (Array.isArray(product.subcategory)) {
      updateFields.subcategory =
        product.subcategory.length > 0 ? product.subcategory[0] : "";
      logger.log(
        `  📝 Product ${product.sku}: Rolling back subcategory [${product.subcategory.join(", ")}] → "${updateFields.subcategory}"`,
      );
    }

    // Update the product if there are fields to rollback
    if (Object.keys(updateFields).length > 0) {
      await productsCollection.updateOne(
        { _id: product._id },
        { $set: updateFields },
      );
      rolledBackCount++;
    }
  }

  logger.log(
    `✅ Rollback completed: ${rolledBackCount} products rolled back successfully`,
  );
}
