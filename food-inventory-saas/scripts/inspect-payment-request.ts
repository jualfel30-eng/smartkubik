/**
 * One-shot diagnostic: given a JWT token from a portal URL, show what the
 * backend would find (or not find) when validating it.
 *
 *   ts-node -r dotenv/config scripts/inspect-payment-request.ts <token>
 */

import { connect, disconnect, Types } from "mongoose";

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.error("Usage: ts-node inspect-payment-request.ts <token>");
    process.exit(1);
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    console.error("Token doesn't look like a JWT (need 3 segments)");
    process.exit(1);
  }
  const claims = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf8"),
  );

  console.log("\nTOKEN CLAIMS");
  console.log(JSON.stringify(claims, null, 2));

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }
  console.log(`\n→ Connecting to ${uri.split("@")[1]?.split("/")[0] || uri}`);
  await connect(uri);
  const db = (await import("mongoose")).default.connection.db;

  const prs = db.collection("paymentrequests");
  const tenantIdStr = claims.tenantId;
  const prIdStr = claims.paymentRequestId;

  // 1. Does the PR exist by _id alone?
  let pr: any = null;
  try {
    pr = await prs.findOne({ _id: new Types.ObjectId(prIdStr) });
  } catch (err: any) {
    console.error(`\n✗ Invalid _id: ${err.message}`);
  }

  if (!pr) {
    console.log(`\n✗ NO PaymentRequest with _id=${prIdStr} in this DB.`);
    console.log("   Causes posibles:");
    console.log("   - El PR fue creado contra otra DB (el backend que");
    console.log("     creó el PR no es el mismo que estás corriendo ahora)");
    console.log("   - El _id es de una migración / reset de la DB");
    console.log("   - Typo en el token");
    await disconnect();
    return;
  }

  console.log("\n✓ PR encontrado en DB:");
  console.log(`   _id:        ${pr._id}`);
  console.log(`   tenantId:   ${pr.tenantId} (type: ${typeof pr.tenantId})`);
  console.log(`   status:     ${pr.status}`);
  console.log(`   isDeleted:  ${pr.isDeleted ?? false}`);
  console.log(`   expiresAt:  ${pr.expiresAt?.toISOString?.() || pr.expiresAt}`);
  console.log(`   token (DB): ${(pr.token || "").slice(0, 30)}...`);
  console.log(`   token (in): ${token.slice(0, 30)}...`);
  console.log(`   token match: ${pr.token === token ? "✓ YES" : "✗ NO"}`);

  // Now reproduce the guard's exact query
  console.log("\nReplicating PaymentTokenGuard query:");
  const guardQuery = {
    _id: new Types.ObjectId(prIdStr),
    tenantId: new Types.ObjectId(tenantIdStr),
    token,
    isDeleted: { $ne: true },
  };
  const match = await prs.findOne(guardQuery);
  console.log(`   findOne with ObjectId tenantId → ${match ? "MATCH" : "NO MATCH"}`);

  const guardQueryStr: any = { ...guardQuery, tenantId: tenantIdStr };
  const matchStr = await prs.findOne(guardQueryStr);
  console.log(`   findOne with string tenantId   → ${matchStr ? "MATCH" : "NO MATCH"}`);

  console.log("\nVeredict:");
  if (match || matchStr) {
    console.log("   ✓ El guard debería pasar. Si igual da 401, mira logs del backend.");
  } else {
    const reasons: string[] = [];
    if (pr.token !== token) reasons.push("token field del PR ≠ token del JWT");
    if (pr.isDeleted === true) reasons.push("PR está soft-deleted");
    const prTenantStr = pr.tenantId?.toString?.() || String(pr.tenantId);
    if (prTenantStr !== tenantIdStr) {
      reasons.push(`tenantId mismatch (PR: ${prTenantStr}, token: ${tenantIdStr})`);
    }
    if (reasons.length) {
      console.log("   ✗ Causa(s):");
      reasons.forEach((r) => console.log(`      - ${r}`));
    } else {
      console.log("   ✗ Match falla pero no detecto causa obvia — investigar manualmente.");
    }
  }

  await disconnect();
}

main().catch((err) => {
  console.error("\n✗ Script failed:", err);
  process.exitCode = 1;
});
