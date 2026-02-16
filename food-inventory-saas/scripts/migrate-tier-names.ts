/**
 * Migration script: Rename subscription tiers from English to Spanish
 *
 * Starter      → Fundamental
 * Professional → Crecimiento
 * Enterprise   → Expansión
 *
 * Usage: npx ts-node scripts/migrate-tier-names.ts
 */
import { connect, disconnect, model, Schema } from "mongoose";

async function migrateTierNames() {
  const MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/food-inventory-saas";
  await connect(MONGODB_URI);
  console.log(`Connected to database at ${MONGODB_URI}`);

  const db = (await import("mongoose")).connection.db;

  // --- 1. Migrate tenants collection: subscriptionPlan field ---
  console.log("\n--- Migrating tenants.subscriptionPlan ---");

  const tenantMappings = [
    { from: "Starter", to: "Fundamental" },
    { from: "starter", to: "Fundamental" },
    { from: "Professional", to: "Crecimiento" },
    { from: "professional", to: "Crecimiento" },
    { from: "Enterprise", to: "Expansión" },
    { from: "enterprise", to: "Expansión" },
  ];

  for (const { from, to } of tenantMappings) {
    const result = await db
      .collection("tenants")
      .updateMany(
        { subscriptionPlan: from },
        { $set: { subscriptionPlan: to } },
      );
    if (result.modifiedCount > 0) {
      console.log(
        `  ✅ "${from}" → "${to}": ${result.modifiedCount} tenant(s) updated`,
      );
    } else {
      console.log(`  ⏭️  "${from}" → "${to}": no tenants found`);
    }
  }

  // --- 2. Migrate subscriptionplans collection: name field ---
  console.log("\n--- Migrating subscriptionplans.name ---");

  const planMappings = [
    { from: "Starter", to: "Fundamental" },
    { from: "Professional", to: "Crecimiento" },
    { from: "Enterprise", to: "Expansión" },
  ];

  for (const { from, to } of planMappings) {
    const result = await db
      .collection("subscriptionplans")
      .updateMany({ name: from }, { $set: { name: to } });
    if (result.modifiedCount > 0) {
      console.log(
        `  ✅ "${from}" → "${to}": ${result.modifiedCount} plan(s) updated`,
      );
    } else {
      console.log(`  ⏭️  "${from}" → "${to}": no plans found`);
    }
  }

  // --- 3. Verify results ---
  console.log("\n--- Verification ---");

  const tenants = await db
    .collection("tenants")
    .find({}, { projection: { name: 1, subscriptionPlan: 1 } })
    .toArray();
  console.log("\nTenants after migration:");
  for (const t of tenants) {
    console.log(`  ${t.name}: ${t.subscriptionPlan}`);
  }

  const plans = await db
    .collection("subscriptionplans")
    .find({ isArchived: { $ne: true } }, { projection: { name: 1 } })
    .toArray();
  console.log("\nSubscription plans after migration:");
  for (const p of plans) {
    console.log(`  ${p.name}`);
  }

  await disconnect();
  console.log("\n✅ Migration complete. Disconnected from database.");
}

migrateTierNames().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
