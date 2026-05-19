/**
 * One-shot bootstrap for the Payment Requests feature.
 *
 * Runs both migrations directly against the configured MongoDB. Idempotent
 * — safe to run multiple times. Use this instead of the HTTP migration
 * endpoints when you want to bring an existing local / staging DB up to
 * date without juggling super-admin JWTs.
 *
 *   npm run db:bootstrap:payment-requests
 *
 * After running:
 *   1. Restart your backend (or rely on nodemon hot-reload)
 *   2. Log out + log back in so the JWT picks up the new permission
 *   3. The tenant admin sees "Solicitudes de pago" in the sidebar
 *      (under Finanzas y Equipo)
 *
 * Whatever it does:
 *   a) Inserts the `payment_requests_review` permission into the
 *      permissions collection (skip if already there)
 *   b) Grants that permission to every role doc named `admin` or `employee`
 *      across all tenants (idempotent via $addToSet)
 *   c) Backfills `requirePaymentProof=false`, `allowPartialPayments=false`,
 *      `paymentRequestExpiryDays=7` onto existing TenantPaymentConfig
 *      documents that lack them.
 */

import { connect, disconnect, Types } from "mongoose";

const PERMISSION = {
  name: "payment_requests_review",
  description: "Revisar y confirmar solicitudes de pago",
  module: "payment_requests",
  action: "review",
};

const ROLES_TO_GRANT = ["admin", "employee"];

async function bootstrap() {
  const uri =
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/food-inventory-saas";
  console.log(`→ Connecting to MongoDB at ${uri}`);
  await connect(uri);
  const db = (await import("mongoose")).default.connection.db;

  // 1. Seed the permission
  console.log("\n[1/3] payment_requests_review permission");
  const permissions = db.collection("permissions");
  let permissionDoc = await permissions.findOne({ name: PERMISSION.name });

  if (!permissionDoc) {
    const now = new Date();
    const result = await permissions.insertOne({
      ...PERMISSION,
      createdAt: now,
      updatedAt: now,
    });
    permissionDoc = await permissions.findOne({ _id: result.insertedId });
    console.log(`   ✓ Inserted permission (id: ${result.insertedId})`);
  } else {
    console.log(`   ⏭  Already exists (id: ${permissionDoc._id})`);
  }

  if (!permissionDoc) {
    throw new Error("Failed to read permission after upsert");
  }

  // 2. Grant to admin + employee roles (across all tenants)
  console.log("\n[2/3] grant to admin + employee roles");
  const roles = db.collection("roles");
  const grant = await roles.updateMany(
    {
      name: { $in: ROLES_TO_GRANT },
      permissions: { $ne: permissionDoc._id as unknown as Types.ObjectId },
    },
    {
      $addToSet: { permissions: permissionDoc._id as unknown as Types.ObjectId },
    } as any,
  );
  console.log(
    `   ✓ Updated ${grant.modifiedCount} role document(s) [${ROLES_TO_GRANT.join(", ")}]`,
  );

  // 3. Extend TenantPaymentConfig
  console.log("\n[3/3] backfill TenantPaymentConfig fields");
  const tpc = db.collection("tenantpaymentconfigs");
  const r1 = await tpc.updateMany(
    { requirePaymentProof: { $exists: false } },
    { $set: { requirePaymentProof: false } },
  );
  const r2 = await tpc.updateMany(
    { allowPartialPayments: { $exists: false } },
    { $set: { allowPartialPayments: false } },
  );
  const r3 = await tpc.updateMany(
    { paymentRequestExpiryDays: { $exists: false } },
    { $set: { paymentRequestExpiryDays: 7 } },
  );
  console.log(
    `   ✓ requirePaymentProof: ${r1.modifiedCount} doc(s) backfilled`,
  );
  console.log(
    `   ✓ allowPartialPayments: ${r2.modifiedCount} doc(s) backfilled`,
  );
  console.log(
    `   ✓ paymentRequestExpiryDays: ${r3.modifiedCount} doc(s) backfilled`,
  );

  // 4. Summary — show who has the permission now
  console.log("\nFINAL STATE");
  const grantedRoles = await roles
    .find({ permissions: permissionDoc._id as unknown as Types.ObjectId })
    .project({ name: 1, tenantId: 1 })
    .toArray();
  console.log(
    `   ${grantedRoles.length} role document(s) now hold payment_requests_review`,
  );
  if (grantedRoles.length <= 10) {
    grantedRoles.forEach((r) =>
      console.log(`      - ${r.name} (tenant ${r.tenantId || "system"})`),
    );
  }

  await disconnect();
  console.log(
    "\n✓ Bootstrap done. Restart your backend (nodemon picks it up) and re-login as the tenant admin.",
  );
}

bootstrap().catch((err) => {
  console.error("\n✗ Bootstrap failed:", err);
  process.exitCode = 1;
});
