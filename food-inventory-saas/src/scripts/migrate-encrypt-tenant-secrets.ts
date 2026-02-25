/**
 * Migration Script: Encrypt plaintext tenant secrets
 *
 * Encrypts whapiToken and settings.integrations secrets that were
 * previously stored in plaintext.
 *
 * PREREQUISITES:
 * - ENCRYPTION_KEY must be set in environment
 * - Run on staging first to verify
 *
 * Usage:
 *   ENCRYPTION_KEY=your-key MONGODB_URI=your-uri npx ts-node src/scripts/migrate-encrypt-tenant-secrets.ts
 */

import * as mongoose from "mongoose";
import { isEncrypted, safeEncrypt } from "../utils/encryption.util";

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "";

if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI environment variable is required.");
  process.exit(1);
}

if (!process.env.ENCRYPTION_KEY) {
  console.error(
    "ERROR: ENCRYPTION_KEY environment variable is required for migration.",
  );
  console.error(
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  );
  process.exit(1);
}

async function migrate() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const db = mongoose.connection.db;
  const tenantsCollection = db.collection("tenants");

  const tenants = await tenantsCollection.find({}).toArray();
  console.log(`Found ${tenants.length} tenants to check.`);

  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const tenant of tenants) {
    const updates: Record<string, string> = {};
    const tenantName = tenant.name || tenant._id.toString();

    // Check whapiToken
    if (tenant.whapiToken && !isEncrypted(tenant.whapiToken)) {
      updates["whapiToken"] = safeEncrypt(tenant.whapiToken);
    }

    // Check settings.integrations.pms.apiKey
    const pmsKey = tenant.settings?.integrations?.pms?.apiKey;
    if (pmsKey && !isEncrypted(pmsKey)) {
      updates["settings.integrations.pms.apiKey"] = safeEncrypt(pmsKey);
    }

    // Check calendar Google tokens
    const googleCal = tenant.settings?.integrations?.calendar?.google;
    if (googleCal?.accessToken && !isEncrypted(googleCal.accessToken)) {
      updates["settings.integrations.calendar.google.accessToken"] =
        safeEncrypt(googleCal.accessToken);
    }
    if (googleCal?.refreshToken && !isEncrypted(googleCal.refreshToken)) {
      updates["settings.integrations.calendar.google.refreshToken"] =
        safeEncrypt(googleCal.refreshToken);
    }

    // Check calendar Outlook tokens
    const outlookCal = tenant.settings?.integrations?.calendar?.outlook;
    if (outlookCal?.accessToken && !isEncrypted(outlookCal.accessToken)) {
      updates["settings.integrations.calendar.outlook.accessToken"] =
        safeEncrypt(outlookCal.accessToken);
    }
    if (outlookCal?.refreshToken && !isEncrypted(outlookCal.refreshToken)) {
      updates["settings.integrations.calendar.outlook.refreshToken"] =
        safeEncrypt(outlookCal.refreshToken);
    }

    if (Object.keys(updates).length > 0) {
      try {
        await tenantsCollection.updateOne(
          { _id: tenant._id },
          { $set: updates },
        );
        const fields = Object.keys(updates).join(", ");
        console.log(`  [ENCRYPTED] ${tenantName}: ${fields}`);
        encrypted++;
      } catch (err) {
        console.error(
          `  [ERROR] ${tenantName}: ${err instanceof Error ? err.message : err}`,
        );
        errors++;
      }
    } else {
      skipped++;
    }
  }

  console.log("\n--- Migration Summary ---");
  console.log(`  Tenants encrypted: ${encrypted}`);
  console.log(`  Tenants skipped (already encrypted or no secrets): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total: ${tenants.length}`);

  await mongoose.disconnect();
  console.log("Done.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
