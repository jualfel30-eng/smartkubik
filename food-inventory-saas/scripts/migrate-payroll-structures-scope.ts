import "dotenv/config";
import { connect, disconnect, model, Types } from "mongoose";
import {
  PayrollStructure,
  PayrollStructureDocument,
  PayrollStructureSchema,
} from "../src/schemas/payroll-structure.schema";
import { computeScopeMetadata } from "../src/modules/payroll-structures/utils/scope-key.util";

async function migrate() {
  const uri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/food-inventory-saas";
  await connect(uri);
  console.log(`[payroll-structures] Connected to MongoDB at ${uri}`);

  const StructureModel = model<PayrollStructureDocument>(
    PayrollStructure.name,
    PayrollStructureSchema,
  );

  const tenantArg = process.argv[2];
  const query: Record<string, any> = {};
  if (tenantArg) {
    if (Types.ObjectId.isValid(tenantArg)) {
      query.tenantId = new Types.ObjectId(tenantArg);
    } else {
      throw new Error(
        `Tenant filter "${tenantArg}" is not a valid ObjectId. Pass the tenant _id.`,
      );
    }
  }

  const structures = await StructureModel.find(query).exec();
  console.log(
    `[payroll-structures] Found ${structures.length} structures to inspect.`,
  );

  let updated = 0;
  const now = new Date();

  for (const structure of structures) {
    const set: Record<string, any> = {};
    const unset: Record<string, any> = {};
    const asObject = structure.toObject();
    const scope = computeScopeMetadata({
      appliesToRoles: asObject.appliesToRoles,
      appliesToDepartments: asObject.appliesToDepartments,
      appliesToContractTypes: asObject.appliesToContractTypes,
    });

    if (!arraysEqual(asObject.appliesToRoles, scope.appliesToRoles)) {
      set.appliesToRoles = scope.appliesToRoles;
    }
    if (
      !arraysEqual(asObject.appliesToDepartments, scope.appliesToDepartments)
    ) {
      set.appliesToDepartments = scope.appliesToDepartments;
    }
    if (
      !arraysEqual(
        asObject.appliesToContractTypes,
        scope.appliesToContractTypes,
      )
    ) {
      set.appliesToContractTypes = scope.appliesToContractTypes;
    }

    if (asObject.roleKey !== scope.roleKey) {
      set.roleKey = scope.roleKey;
    }
    if (asObject.departmentKey !== scope.departmentKey) {
      set.departmentKey = scope.departmentKey;
    }
    if (asObject.contractTypeKey !== scope.contractTypeKey) {
      set.contractTypeKey = scope.contractTypeKey;
    }
    if (asObject.scopeKey !== scope.scopeKey) {
      set.scopeKey = scope.scopeKey;
    }

    if (!asObject.version || asObject.version < 1) {
      set.version = 1;
    }
    if (!asObject.effectiveFrom) {
      set.effectiveFrom = asObject.createdAt || now;
    }
    if (asObject.isActive) {
      if (!asObject.activatedAt) {
        set.activatedAt = asObject.updatedAt || now;
      }
      if (asObject.deactivatedAt) {
        unset.deactivatedAt = "";
      }
    } else {
      if (!asObject.deactivatedAt) {
        set.deactivatedAt = asObject.updatedAt || now;
      }
      if (!asObject.activatedAt && asObject.createdAt) {
        set.activatedAt = asObject.createdAt;
      }
    }

    const updateOps: Record<string, any> = {};
    if (Object.keys(set).length) {
      updateOps.$set = set;
    }
    if (Object.keys(unset).length) {
      updateOps.$unset = unset;
    }

    if (Object.keys(updateOps).length) {
      await StructureModel.updateOne({ _id: structure._id }, updateOps).exec();
      updated += 1;
    }
  }

  console.log(
    `[payroll-structures] Updated ${updated} of ${structures.length} structures.`,
  );
  await disconnect();
}

function arraysEqual(a?: string[], b?: string[]) {
  const left = a || [];
  const right = b || [];
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

migrate().catch((error) => {
  console.error("[payroll-structures] Migration failed:", error);
  process.exit(1);
});
