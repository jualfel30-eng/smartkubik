import "dotenv/config";
import { connect, disconnect, model, Types } from "mongoose";
import {
  ChartOfAccounts,
  ChartOfAccountsSchema,
} from "../src/schemas/chart-of-accounts.schema";
import { Tenant, TenantSchema } from "../src/schemas/tenant.schema";
import { PAYROLL_SYSTEM_ACCOUNTS } from "../src/config/payroll-system-accounts.config";

interface BootTenant {
  _id: Types.ObjectId;
  code?: string;
  name?: string;
  enabledModules?: Tenant["enabledModules"];
}

async function bootstrap() {
  const uri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/food-inventory-saas";
  await connect(uri);
  console.log(`[Phase0] Connected to MongoDB at ${uri}`);

  const TenantModel = model(Tenant.name, TenantSchema);
  const ChartModel = model(ChartOfAccounts.name, ChartOfAccountsSchema);

  const tenantArg = process.argv[2];
  const tenantFilter = tenantArg
    ? {
        $or: [{ _id: tenantArg }, { code: tenantArg }],
      }
    : {};

  const tenants = (await TenantModel.find(tenantFilter)
    .select("_id name code enabledModules")
    .lean()) as BootTenant[];

  if (!tenants.length) {
    console.log(
      tenantArg
        ? `[Phase0] No tenants found for filter "${tenantArg}".`
        : "[Phase0] No tenants found.",
    );
    await disconnect();
    return;
  }

  for (const tenant of tenants) {
    const tenantId = tenant._id.toString();
    let created = 0;
    let updated = 0;
    let modulesUpdated = false;

    for (const blueprint of PAYROLL_SYSTEM_ACCOUNTS) {
      const existing = await ChartModel.findOne({
        tenantId,
        code: blueprint.code,
      }).lean();

      if (!existing) {
        await ChartModel.create({
          ...blueprint,
          tenantId,
          isEditable: !blueprint.isSystemAccount,
        });
        created += 1;
        continue;
      }

      const updates: Record<string, any> = {};
      if (typeof existing.isSystemAccount === "undefined") {
        updates.isSystemAccount = blueprint.isSystemAccount;
      }
      if (typeof existing.isEditable === "undefined") {
        updates.isEditable = !blueprint.isSystemAccount;
      }
      if (
        blueprint.metadata?.payrollCategory &&
        (!existing.metadata ||
          !existing.metadata.payrollCategory ||
          existing.metadata.payrollCategory !== blueprint.metadata.payrollCategory)
      ) {
        updates.metadata = {
          ...(existing.metadata || {}),
          payrollCategory: blueprint.metadata.payrollCategory,
        };
      }

      if (Object.keys(updates).length > 0) {
        await ChartModel.updateOne({ _id: existing._id }, { $set: updates });
        updated += 1;
      }
    }

    if (tenant.enabledModules?.payroll !== true) {
      await TenantModel.updateOne(
        { _id: tenantId },
        { $set: { "enabledModules.payroll": true } },
      );
      modulesUpdated = true;
    }

    console.log(
      `[Phase0] Tenant ${tenant.code || tenant.name || tenantId}: ${created} payroll accounts created, ${updated} updated, payroll module ${modulesUpdated ? "enabled" : "already enabled"}.`,
    );
  }

  await disconnect();
  console.log("[Phase0] Completed payroll account bootstrap.");
}

bootstrap().catch((error) => {
  console.error("[Phase0] Failed to bootstrap payroll accounts:", error);
  process.exit(1);
});
