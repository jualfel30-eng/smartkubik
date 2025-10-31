import { connect, disconnect, model, Types } from "mongoose";
import { Tenant, TenantSchema } from "../src/schemas/tenant.schema";
import { Customer, CustomerSchema } from "../src/schemas/customer.schema";
import {
  ServicePackage,
  ServicePackageSchema,
} from "../src/schemas/service-package.schema";

interface MigrationSummary {
  tenantId: string;
  tenantName: string;
  modulesEnabled: string[];
  notificationsPatched: boolean;
  integrationsPatched: boolean;
  policiesPatched: boolean;
  servicePackagesTagged: number;
  loyaltyBackfilled: number;
}

const DEFAULT_HOSPITALITY_POLICIES = {
  depositRequired: true,
  depositPercentage: 30,
  cancellationWindowHours: 48,
  noShowPenaltyType: "percentage" as const,
  noShowPenaltyValue: 100,
};

async function migrateHospitalityTenants() {
  const summaries: MigrationSummary[] = [];
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/food-inventory-saas";

  await connect(mongoUri);

  const TenantModel = model(Tenant.name, TenantSchema);
  const CustomerModel = model(Customer.name, CustomerSchema);
  const ServicePackageModel = model(ServicePackage.name, ServicePackageSchema);

  const tenants: Array<Tenant & { _id: Types.ObjectId }> = await TenantModel.find({
    $or: [
      { "verticalProfile.key": "hospitality" },
      { vertical: "SERVICES", "enabledModules.servicePackages": true },
    ],
  })
    .lean()
    .exec();

  for (const tenant of tenants) {
    const modulesEnabled: string[] = [];
    const setOperations: Record<string, any> = {};

    const enabledModules = tenant.enabledModules || {};
    const moduleTargets: Array<keyof typeof enabledModules> = [
      "appointments",
      "resources",
      "servicePackages",
      "customers",
      "reports",
    ];

    moduleTargets.forEach((moduleKey) => {
      if (!enabledModules[moduleKey]) {
        setOperations[`enabledModules.${moduleKey}`] = true;
        modulesEnabled.push(moduleKey);
      }
    });

    const notifications = tenant.settings?.notifications || {};
    let notificationsPatched = false;
    if (!notifications.whatsapp) {
      setOperations["settings.notifications.whatsapp"] = true;
      notificationsPatched = true;
    }
    if (!notifications.sms) {
      setOperations["settings.notifications.sms"] = true;
      notificationsPatched = true;
    }

    const integrations = tenant.settings?.integrations || {};
    const calendar = integrations.calendar || {};
    const pms = integrations.pms || {};
    let integrationsPatched = false;
    if (!calendar.timezone) {
      setOperations["settings.integrations.calendar.timezone"] =
        tenant.timezone || "America/Caracas";
      integrationsPatched = true;
    }
    if (calendar.syncWindowDays === undefined) {
      setOperations["settings.integrations.calendar.syncWindowDays"] = 14;
      integrationsPatched = true;
    }
    if (!pms.enabled) {
      setOperations["settings.integrations.pms.enabled"] = true;
      integrationsPatched = true;
    }

    const policies = tenant.settings?.hospitalityPolicies || {};
    let policiesPatched = false;
    (Object.keys(DEFAULT_HOSPITALITY_POLICIES) as Array<
      keyof typeof DEFAULT_HOSPITALITY_POLICIES
    >).forEach((key) => {
      if (policies[key] === undefined || policies[key] === null) {
        setOperations[`settings.hospitalityPolicies.${key}`] =
          DEFAULT_HOSPITALITY_POLICIES[key];
        policiesPatched = true;
      }
    });

    if (Object.keys(setOperations).length) {
      await TenantModel.updateOne({ _id: tenant._id }, { $set: setOperations });
    }

    const tenantIdString = tenant._id.toString();
    const servicePackageResult = await ServicePackageModel.updateMany(
      {
        tenantId: tenantIdString,
        "metadata.handOffVersion": { $exists: false },
      },
      {
        $set: {
          "metadata.handOffVersion": "2025.10-handoff",
          "metadata.lastMigrationAt": new Date(),
        },
      },
    );

    const loyaltyResult = await CustomerModel.updateMany(
      {
        tenantId: tenant._id,
        $or: [
          { loyalty: { $exists: false } },
          { loyalty: null },
          { loyalty: { $eq: {} } },
        ],
      },
      {
        $set: {
          loyalty: {
            tier: tenant.verticalProfile?.overrides?.defaultTier || "bronze",
            lastUpgradeAt: null,
            benefits: [],
            pendingRewards: [],
          },
          loyaltyScore: 0,
        },
      },
    );

    summaries.push({
      tenantId: tenantIdString,
      tenantName: tenant.name,
      modulesEnabled,
      notificationsPatched,
      integrationsPatched,
      policiesPatched,
      servicePackagesTagged: servicePackageResult.modifiedCount,
      loyaltyBackfilled: loyaltyResult.modifiedCount,
    });
  }

  await disconnect();

  console.table(
    summaries.map((summary) => ({
      Tenant: summary.tenantName,
      "Modules habilitados": summary.modulesEnabled.join(", ") || "--",
      Notificaciones: summary.notificationsPatched ? "Actualizadas" : "OK",
      Integraciones: summary.integrationsPatched ? "Actualizadas" : "OK",
      Políticas: summary.policiesPatched ? "Actualizadas" : "OK",
      "Packages migrados": summary.servicePackagesTagged,
      "Clientes loyalty": summary.loyaltyBackfilled,
    })),
  );

  console.log(`\n✅ Migración finalizada para ${summaries.length} tenants hospitality.`);
}

migrateHospitalityTenants().catch((error) => {
  console.error("❌ Error durante la migración hospitality:", error);
  process.exit(1);
});
