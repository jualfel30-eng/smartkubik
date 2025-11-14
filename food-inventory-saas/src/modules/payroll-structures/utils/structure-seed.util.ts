import { Types } from "mongoose";
import { DefaultStructureBlueprint } from "../config/default-structures.config";
import { computeScopeMetadata } from "./scope-key.util";

export function buildSeedStructurePayload(
  tenantId: Types.ObjectId,
  blueprint: DefaultStructureBlueprint,
  now = new Date(),
) {
  const scope = computeScopeMetadata({
    appliesToRoles: blueprint.appliesToRoles,
    appliesToDepartments: blueprint.appliesToDepartments,
    appliesToContractTypes: blueprint.appliesToContractTypes,
  });
  const effectiveFrom = now;
  const payload = {
    tenantId,
    name: blueprint.name,
    description: blueprint.description,
    periodType: blueprint.periodType,
    appliesToRoles: scope.appliesToRoles,
    appliesToDepartments: scope.appliesToDepartments,
    appliesToContractTypes: scope.appliesToContractTypes,
    roleKey: scope.roleKey,
    departmentKey: scope.departmentKey,
    contractTypeKey: scope.contractTypeKey,
    scopeKey: scope.scopeKey,
    effectiveFrom,
    effectiveTo: undefined,
    isActive: blueprint.isActive,
    activatedAt: blueprint.isActive ? now : undefined,
    deactivatedAt: blueprint.isActive ? undefined : now,
    version: 1,
    metadata: {
      ...(blueprint.metadata || {}),
      seedSlug: blueprint.slug,
      seedSource: "payroll-defaults",
      seededAt: now,
    },
  };
  return payload;
}
