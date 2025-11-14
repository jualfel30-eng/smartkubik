import "dotenv/config";
import { connect, disconnect, model, Types } from "mongoose";
import {
  Tenant,
  TenantDocument,
  TenantSchema,
} from "../src/schemas/tenant.schema";
import {
  PayrollStructure,
  PayrollStructureDocument,
  PayrollStructureSchema,
} from "../src/schemas/payroll-structure.schema";
import { DEFAULT_PAYROLL_STRUCTURES } from "../src/modules/payroll-structures/config/default-structures.config";
import { buildSeedStructurePayload } from "../src/modules/payroll-structures/utils/structure-seed.util";

async function seed() {
  const uri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/food-inventory-saas";
  await connect(uri);
  console.log(`[payroll-structures] Connected to MongoDB at ${uri}`);

  const TenantModel = model<TenantDocument>(Tenant.name, TenantSchema);
  const StructureModel = model<PayrollStructureDocument>(
    PayrollStructure.name,
    PayrollStructureSchema,
  );

  const tenantArg = process.argv[2];
  let tenantFilter: Record<string, any> = {};
  if (tenantArg) {
    if (Types.ObjectId.isValid(tenantArg)) {
      tenantFilter = { _id: new Types.ObjectId(tenantArg) };
    } else {
      tenantFilter = { code: tenantArg };
    }
  }

  const tenants = await TenantModel.find(tenantFilter)
    .select("_id code name")
    .lean();

  if (!tenants.length) {
    console.log("[payroll-structures] No tenants matched the provided filter.");
    await disconnect();
    return;
  }

  let totalCreated = 0;

  for (const tenant of tenants) {
    const tenantId = new Types.ObjectId(tenant._id);
    let createdForTenant = 0;
    for (const blueprint of DEFAULT_PAYROLL_STRUCTURES) {
      const payload = buildSeedStructurePayload(
        tenantId,
        blueprint,
        new Date(),
      );
      const exists = await StructureModel.exists({
        tenantId,
        $or: [
          { scopeKey: payload.scopeKey },
          { "metadata.seedSlug": blueprint.slug },
          { name: blueprint.name },
        ],
      });
      if (exists) continue;
      await StructureModel.create(payload);
      createdForTenant += 1;
      totalCreated += 1;
    }
    console.log(
      `[payroll-structures] Tenant ${tenant.code || tenant.name || tenantId.toString()}: ${createdForTenant} estructuras base creadas.`,
    );
  }

  console.log(
    `[payroll-structures] Seeding completed. Total estructuras creadas: ${totalCreated}.`,
  );
  await disconnect();
}

seed().catch((error) => {
  console.error(
    "[payroll-structures] Default structure seeding failed:",
    error,
  );
  process.exit(1);
});
