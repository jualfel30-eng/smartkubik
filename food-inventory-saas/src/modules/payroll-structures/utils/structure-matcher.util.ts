export interface StructureScopeFilters {
  role?: string;
  department?: string;
  contractType?: string;
}

export interface StructureMatchResult {
  matchedDimensions: string[];
  score: number;
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export function evaluateStructureMatch<
  T extends {
    appliesToRoles?: string[];
    appliesToDepartments?: string[];
    appliesToContractTypes?: string[];
  },
>(structure: T, filters: StructureScopeFilters): StructureMatchResult | null {
  const roleValue = normalize(filters.role);
  const departmentValue = normalize(filters.department);
  const contractTypeValue = normalize(filters.contractType);

  const structureRoles = (structure.appliesToRoles || []).map((role) =>
    normalize(role),
  );
  const structureDepartments = (structure.appliesToDepartments || []).map(
    (dept) => normalize(dept),
  );
  const structureContractTypes = (structure.appliesToContractTypes || []).map(
    (type) => normalize(type),
  );

  const roleMatch =
    structureRoles.length === 0 ||
    (roleValue && structureRoles.includes(roleValue));
  const departmentMatch =
    structureDepartments.length === 0 ||
    (departmentValue && structureDepartments.includes(departmentValue));
  const contractMatch =
    structureContractTypes.length === 0 ||
    (contractTypeValue && structureContractTypes.includes(contractTypeValue));

  if (!roleMatch || !departmentMatch || !contractMatch) {
    return null;
  }

  const matchedDimensions: string[] = [];
  if (structureRoles.length && roleValue) {
    matchedDimensions.push("role");
  }
  if (structureDepartments.length && departmentValue) {
    matchedDimensions.push("department");
  }
  if (structureContractTypes.length && contractTypeValue) {
    matchedDimensions.push("contractType");
  }

  const specificity =
    (structureRoles.length ? 1 : 0) +
    (structureDepartments.length ? 1 : 0) +
    (structureContractTypes.length ? 1 : 0);

  return {
    matchedDimensions,
    score: specificity,
  };
}

export function hasOpenScope<
  T extends {
    appliesToRoles?: string[];
    appliesToDepartments?: string[];
    appliesToContractTypes?: string[];
  },
>(structure: T) {
  return (
    (structure.appliesToRoles?.length || 0) === 0 &&
    (structure.appliesToDepartments?.length || 0) === 0 &&
    (structure.appliesToContractTypes?.length || 0) === 0
  );
}
