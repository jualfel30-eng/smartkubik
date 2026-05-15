/**
 * Backfill denormalized `rating` on `purchaseorders` from the authoritative
 * `purchaseorderratings` collection, and recompute supplier averages on
 * `customers` (metrics.averageRating / metrics.totalRatings) and the linked
 * `suppliers` collection.
 *
 *   MONGODB_URI=... npx ts-node -r dotenv/config scripts/backfill-purchase-order-ratings.ts
 *   or: npm run db:backfill:purchase-order-ratings  (once wired into package.json)
 *
 * Why this exists:
 *   The PurchaseOrder schema was missing a `rating` field, so when
 *   RatingsService did $set: { rating } on the PO, Mongoose's strict mode
 *   silently stripped it. The PO never persisted a rating, so the supplier
 *   average recompute (which uses `rating: { $exists: true }`) always saw
 *   zero rated orders → metrics.averageRating stayed 0 → UI hid the stars.
 *
 *   The schema is now fixed (rating: Number, min 1, max 5). This script
 *   replays the rating docs that were created in the meantime so existing
 *   tenants don't have to recalify every PO.
 *
 * Idempotent — safe to run multiple times.
 *
 * Flags:
 *   DRY_RUN=true → log what would change, don't write
 *   TENANT_ID=<id> → restrict to one tenant (default: all tenants)
 */

import { connect, disconnect, Types } from "mongoose";

const DRY_RUN = process.env.DRY_RUN === "true";
const TENANT_FILTER = process.env.TENANT_ID;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }
  console.log(`→ Connecting to ${uri.split("@")[1]?.split("/")[0] || uri}`);
  console.log(`→ Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "WRITE"}`);
  if (TENANT_FILTER) console.log(`→ Tenant filter: ${TENANT_FILTER}`);

  await connect(uri);
  const db = (await import("mongoose")).default.connection.db;

  const ratings = db.collection("purchaseorderratings");
  const pos = db.collection("purchaseorders");
  const customers = db.collection("customers");
  const suppliers = db.collection("suppliers");

  const ratingFilter: any = {};
  if (TENANT_FILTER) {
    ratingFilter.tenantId = {
      $in: [TENANT_FILTER, new Types.ObjectId(TENANT_FILTER)],
    };
  }

  const totalRatings = await ratings.countDocuments(ratingFilter);
  console.log(`→ Found ${totalRatings} rating doc(s) to replay`);

  let poUpdated = 0;
  let poSkipped = 0;
  let poMissing = 0;

  const cursor = ratings.find(ratingFilter);
  while (await cursor.hasNext()) {
    const r: any = await cursor.next();
    if (!r) continue;

    const poId = r.purchaseOrderId;
    if (!poId) {
      poMissing += 1;
      continue;
    }

    // Match the PO by hybrid id type (string or ObjectId stored either way).
    const poIdStr = poId.toString();
    const idCandidates: any[] = [poId];
    if (Types.ObjectId.isValid(poIdStr)) {
      idCandidates.push(new Types.ObjectId(poIdStr));
    }

    const existing = await pos.findOne({ _id: { $in: idCandidates } });
    if (!existing) {
      console.warn(
        `⚠ rating ${r._id} references missing PO ${poIdStr} — skipped`,
      );
      poMissing += 1;
      continue;
    }

    if (existing.rating === r.rating) {
      poSkipped += 1;
      continue;
    }

    if (!DRY_RUN) {
      await pos.updateOne(
        { _id: existing._id },
        { $set: { rating: r.rating } },
      );
    }
    poUpdated += 1;
  }

  console.log(
    `→ PO denorm: updated=${poUpdated} skipped=${poSkipped} missing=${poMissing}`,
  );

  // ─── Recompute supplier averages from the now-correct po.rating data ───
  // Aggregate per supplier (within optional tenant filter).
  const aggFilter: any = { rating: { $exists: true, $ne: null } };
  if (TENANT_FILTER) {
    aggFilter.tenantId = {
      $in: [TENANT_FILTER, new Types.ObjectId(TENANT_FILTER)],
    };
  }

  const pipeline = [
    { $match: aggFilter },
    {
      $group: {
        _id: "$supplierId",
        avg: { $avg: "$rating" },
        total: { $sum: 1 },
      },
    },
  ];

  const groups = await pos.aggregate(pipeline).toArray();
  console.log(`→ Recomputing averages for ${groups.length} supplier(s)`);

  let customersUpdated = 0;
  let suppliersUpdated = 0;

  for (const g of groups) {
    const supplierId = g._id;
    if (!supplierId) continue;
    const supplierIdStr = supplierId.toString();
    const idCandidates: any[] = [supplierId];
    if (Types.ObjectId.isValid(supplierIdStr)) {
      idCandidates.push(new Types.ObjectId(supplierIdStr));
    }

    const averageRating = Number(g.avg.toFixed(2));
    const totalCount = g.total;

    if (!DRY_RUN) {
      const c = await customers.updateOne(
        { _id: { $in: idCandidates } },
        {
          $set: {
            "metrics.averageRating": averageRating,
            "metrics.totalRatings": totalCount,
          },
        },
      );
      if (c.modifiedCount > 0) customersUpdated += 1;

      // Supplier doc links via customerId
      const s = await suppliers.updateOne(
        { customerId: { $in: idCandidates } },
        {
          $set: {
            "metrics.averageRating": averageRating,
            "metrics.totalRatings": totalCount,
          },
        },
      );
      if (s.modifiedCount > 0) suppliersUpdated += 1;
    } else {
      console.log(
        `  [DRY] supplier ${supplierIdStr}: avg=${averageRating} total=${totalCount}`,
      );
    }
  }

  console.log(
    `→ Customers updated: ${customersUpdated}, Suppliers updated: ${suppliersUpdated}`,
  );

  await disconnect();
  console.log("✓ Done");
}

main().catch((err) => {
  console.error("✗ Backfill failed:", err);
  process.exit(1);
});
