export interface ScopeInput {
  appliesToRoles?: string[];
  appliesToDepartments?: string[];
  appliesToContractTypes?: string[];
}

export interface ScopeKeyParts {
  roleKey: string;
  departmentKey: string;
  contractTypeKey: string;
  scopeKey: string;
}

export interface ScopeComputationResult extends ScopeKeyParts {
  appliesToRoles: string[];
  appliesToDepartments: string[];
  appliesToContractTypes: string[];
}

const DEFAULT_TOKEN = "*";

export function sanitizeScopeValues(values?: string[]): string[] {
  if (!values) {
    return [];
  }
  const seen = new Set<string>();
  const sanitized: string[] = [];
  values.forEach((value) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    sanitized.push(trimmed);
  });
  return sanitized;
}

function encodeToken(values: string[]) {
  if (!values.length) return DEFAULT_TOKEN;
  return values
    .map((value) => value.toLowerCase())
    .sort((a, b) => a.localeCompare(b))
    .join("|");
}

export function buildScopeKeyParts(input: ScopeInput): ScopeKeyParts & {
  normalizedRoles: string[];
  normalizedDepartments: string[];
  normalizedContractTypes: string[];
} {
  const normalizedRoles = sanitizeScopeValues(input.appliesToRoles);
  const normalizedDepartments = sanitizeScopeValues(input.appliesToDepartments);
  const normalizedContractTypes = sanitizeScopeValues(
    input.appliesToContractTypes,
  );
  const roleKey = encodeToken(normalizedRoles);
  const departmentKey = encodeToken(normalizedDepartments);
  const contractTypeKey = encodeToken(normalizedContractTypes);
  const scopeKey = `${roleKey}#${departmentKey}#${contractTypeKey}`;
  return {
    roleKey,
    departmentKey,
    contractTypeKey,
    scopeKey,
    normalizedRoles,
    normalizedDepartments,
    normalizedContractTypes,
  };
}

export function computeScopeMetadata(
  input: ScopeInput,
): ScopeComputationResult {
  const {
    roleKey,
    departmentKey,
    contractTypeKey,
    scopeKey,
    normalizedRoles,
    normalizedDepartments,
    normalizedContractTypes,
  } = buildScopeKeyParts(input);
  return {
    roleKey,
    departmentKey,
    contractTypeKey,
    scopeKey,
    appliesToRoles: normalizedRoles,
    appliesToDepartments: normalizedDepartments,
    appliesToContractTypes: normalizedContractTypes,
  };
}
