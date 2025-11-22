import "dotenv/config";
import { connect, disconnect, model, Types } from "mongoose";
import {
  ChartOfAccounts,
  ChartOfAccountsSchema,
} from "../src/schemas/chart-of-accounts.schema";
import { Tenant, TenantSchema } from "../src/schemas/tenant.schema";
import { PAYROLL_SYSTEM_ACCOUNTS } from "../src/config/payroll-system-accounts.config";
import {
  PayrollLocalization,
  PayrollLocalizationSchema,
} from "../src/schemas/payroll-localization.schema";
import { DEFAULT_VE_LOCALIZATION } from "../src/modules/payroll-localizations/config/default-localization-ve.config";
import {
  PayrollConcept,
  PayrollConceptSchema,
} from "../src/schemas/payroll-concept.schema";
import { DEFAULT_PAYROLL_CONCEPTS } from "../src/modules/payroll-runs/config/default-payroll-concepts.config";

interface BootTenant {
  _id: Types.ObjectId;
  code?: string;
  name?: string;
  enabledModules?: Tenant["enabledModules"];
  contactInfo?: {
    address?: {
      country?: string;
    };
  };
}

const countryToIso: Record<string, string> = {
  VENEZUELA: "VE",
  "REPÚBLICA BOLIVARIANA DE VENEZUELA": "VE",
  "REPUBLICA BOLIVARIANA DE VENEZUELA": "VE",
  MEXICO: "MX",
  MÉXICO: "MX",
  "ESTADOS UNIDOS": "US",
  "UNITED STATES": "US",
  COLOMBIA: "CO",
  PERU: "PE",
  CHILE: "CL",
  ARGENTINA: "AR",
  PANAMA: "PA",
};

const resolveLocalizationCode = (country?: string) => {
  if (!country) return undefined;
  const upper = country.trim().toUpperCase();
  if (upper.length === 2) return upper;
  return countryToIso[upper];
};

async function bootstrap() {
  const uri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/food-inventory-saas";
  await connect(uri);
  console.log(`[Phase0] Connected to MongoDB at ${uri}`);

  const TenantModel = model(Tenant.name, TenantSchema);
  const ChartModel = model(ChartOfAccounts.name, ChartOfAccountsSchema);
  const PayrollConceptModel = model(
    PayrollConcept.name,
    PayrollConceptSchema,
  );
  const LocalizationModel = model(
    PayrollLocalization.name,
    PayrollLocalizationSchema,
  );

  const tenantArg = process.argv[2];
  const tenantFilter = tenantArg
    ? {
        $or: [{ _id: tenantArg }, { code: tenantArg }],
      }
    : {};

  const tenants = (await TenantModel.find(tenantFilter)
    .select("_id name code enabledModules contactInfo")
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
    let conceptsCreated = 0;
    let conceptsUpdated = 0;
    let localizationsCreated = 0;

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

    const accountDocs = await ChartModel.find({ tenantId })
      .select("_id code")
      .lean();
    const accountMap = new Map(accountDocs.map((acc) => [acc.code, acc._id]));
    const tenantLocalization =
      resolveLocalizationCode(tenant.contactInfo?.address?.country) || "VE";

    const conceptBlueprints = DEFAULT_PAYROLL_CONCEPTS.filter((concept) => {
      if (!concept.localization) return true;
      return (
        concept.localization.toUpperCase() === tenantLocalization.toUpperCase()
      );
    });

    for (const conceptBlueprint of conceptBlueprints) {
      const tenantObjectId = new Types.ObjectId(tenantId);
      const existingConcept = await PayrollConceptModel.findOne({
        tenantId: tenantObjectId,
        code: conceptBlueprint.code,
      }).lean();

      const debitAccountId = conceptBlueprint.debitAccountCode
        ? accountMap.get(conceptBlueprint.debitAccountCode)
        : undefined;
      const creditAccountId = conceptBlueprint.creditAccountCode
        ? accountMap.get(conceptBlueprint.creditAccountCode)
        : undefined;

      if (conceptBlueprint.debitAccountCode && !debitAccountId) {
        console.warn(
          `[Phase0] Tenant ${tenant.code || tenant.name || tenantId}: cuenta ${conceptBlueprint.debitAccountCode} no encontrada para el concepto ${conceptBlueprint.code}.`,
        );
      }
      if (conceptBlueprint.creditAccountCode && !creditAccountId) {
        console.warn(
          `[Phase0] Tenant ${tenant.code || tenant.name || tenantId}: cuenta ${conceptBlueprint.creditAccountCode} no encontrada para el concepto ${conceptBlueprint.code}.`,
        );
      }

      if (!existingConcept) {
        await PayrollConceptModel.create({
          tenantId: tenantObjectId,
          code: conceptBlueprint.code,
          name: conceptBlueprint.name,
          description: conceptBlueprint.description,
          conceptType: conceptBlueprint.conceptType,
          calculation:
            conceptBlueprint.calculation || { method: "fixed_amount" },
          debitAccountId,
          creditAccountId,
          metadata: conceptBlueprint.metadata,
          isActive:
            typeof conceptBlueprint.isActive === "boolean"
              ? conceptBlueprint.isActive
              : true,
        });
        conceptsCreated += 1;
        continue;
      }

      const conceptUpdates: Record<string, any> = {};
      if (
        !existingConcept.debitAccountId &&
        typeof debitAccountId !== "undefined"
      ) {
        conceptUpdates.debitAccountId = debitAccountId;
      }
      if (
        !existingConcept.creditAccountId &&
        typeof creditAccountId !== "undefined"
      ) {
        conceptUpdates.creditAccountId = creditAccountId;
      }
      if (
        !existingConcept.metadata &&
        conceptBlueprint.metadata
      ) {
        conceptUpdates.metadata = conceptBlueprint.metadata;
      }

      if (Object.keys(conceptUpdates).length > 0) {
        await PayrollConceptModel.updateOne(
          { _id: existingConcept._id },
          { $set: conceptUpdates },
        );
        conceptsUpdated += 1;
      }
    }

    const existingLocalization = await LocalizationModel.findOne({
      country: tenantLocalization,
      version: DEFAULT_VE_LOCALIZATION.version,
    }).lean();
    if (!existingLocalization && tenantLocalization === "VE") {
      await LocalizationModel.create({
        ...DEFAULT_VE_LOCALIZATION,
        tenantId: null,
      });
      localizationsCreated += 1;
    }

    if (tenant.enabledModules?.payroll !== true) {
      await TenantModel.updateOne(
        { _id: tenantId },
        { $set: { "enabledModules.payroll": true } },
      );
      modulesUpdated = true;
    }

    console.log(
      `[Phase0] Tenant ${tenant.code || tenant.name || tenantId}: ${created} payroll accounts created, ${updated} updated, ${conceptsCreated} payroll concepts created, ${conceptsUpdated} updated, ${localizationsCreated} localizations created, payroll module ${modulesUpdated ? "enabled" : "already enabled"}.`,
    );
  }

  await disconnect();
  console.log("[Phase0] Completed payroll account bootstrap.");
}

bootstrap().catch((error) => {
  console.error("[Phase0] Failed to bootstrap payroll accounts:", error);
  process.exit(1);
});
