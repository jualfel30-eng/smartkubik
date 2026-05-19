/**
 * Backfill `exchangeRateSnapshot` on existing PaymentRequest documents
 * that were created before we started snapshotting the rate.
 *
 *   npm run db:backfill:payment-request-rates
 *
 * Logic per PR:
 *   - Skip if exchangeRateSnapshot already set
 *   - Skip if entityType !== 'order'
 *   - Lookup the linked Order
 *   - If order has totalAmount > 0 AND totalAmountVes > 0, derive
 *     rate = totalAmountVes / totalAmount
 *   - Persist on the PR
 *
 * Idempotent — safe to run multiple times.
 */

import { connect, disconnect, Types } from "mongoose";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }
  console.log(`→ Connecting to ${uri.split("@")[1]?.split("/")[0] || uri}`);
  await connect(uri);
  const db = (await import("mongoose")).default.connection.db;

  const prs = db.collection("paymentrequests");
  const orders = db.collection("orders");

  const candidates = await prs
    .find({
      exchangeRateSnapshot: { $in: [null, undefined] },
      entityType: "order",
      isDeleted: { $ne: true },
    })
    .toArray();

  console.log(`Found ${candidates.length} PaymentRequest(s) without exchangeRateSnapshot.`);

  let updated = 0;
  let skipped = 0;
  const skippedReasons: Record<string, number> = {};

  for (const pr of candidates) {
    const entityId = pr.entityId;
    if (!entityId) {
      skipped++;
      skippedReasons.no_entity_id = (skippedReasons.no_entity_id || 0) + 1;
      continue;
    }

    const order = await orders.findOne({
      _id:
        entityId instanceof Types.ObjectId
          ? entityId
          : new Types.ObjectId(String(entityId)),
    });

    if (!order) {
      skipped++;
      skippedReasons.order_missing = (skippedReasons.order_missing || 0) + 1;
      continue;
    }

    const totalUsd = Number(order.totalAmount);
    const totalVes = Number(order.totalAmountVes);

    if (!Number.isFinite(totalUsd) || totalUsd <= 0) {
      skipped++;
      skippedReasons.zero_usd = (skippedReasons.zero_usd || 0) + 1;
      continue;
    }
    if (!Number.isFinite(totalVes) || totalVes <= 0) {
      skipped++;
      skippedReasons.no_ves_amount = (skippedReasons.no_ves_amount || 0) + 1;
      continue;
    }

    const rate = Number((totalVes / totalUsd).toFixed(6));

    await prs.updateOne(
      { _id: pr._id },
      { $set: { exchangeRateSnapshot: rate } },
    );
    updated++;
    console.log(
      `  ✓ PR ${pr._id.toString().slice(-6)} ← rate ${rate} (order $${totalUsd} ↔ ${totalVes} Bs)`,
    );
  }

  console.log("\nSUMMARY");
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  if (skipped > 0) {
    console.log("   Skip reasons:");
    Object.entries(skippedReasons).forEach(([reason, count]) =>
      console.log(`      - ${reason}: ${count}`),
    );
  }

  await disconnect();
  console.log("\n✓ Done. PRs sin orden o sin totalAmountVes quedan sin rate (esperado).");
}

main().catch((err) => {
  console.error("\n✗ Backfill failed:", err);
  process.exitCode = 1;
});
