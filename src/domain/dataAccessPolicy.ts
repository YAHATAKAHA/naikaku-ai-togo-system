import type {
  CabinetRole,
  DataClassification,
  DataResidency,
  RoleDataAccessDecision,
  RoleDataAccessMatrix,
  RoleDataAccessPolicy
} from "./types";

export const dataClassifications: DataClassification[] = [
  "public",
  "internal",
  "confidential",
  "secret",
  "personal-data",
  "customer-data"
];

export const dataClassificationLabels: Record<DataClassification, string> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  secret: "Secret",
  "personal-data": "Personal data",
  "customer-data": "Customer data"
};

export const dataResidencyLabels: Record<DataResidency, string> = {
  "external-allowed": "External allowed",
  "gateway-mediated": "Gateway mediated",
  "local-only": "Local only"
};

export const defaultRoleDataAccessPolicy: RoleDataAccessPolicy = {
  allowedClassifications: ["public", "internal"],
  deniedClassifications: ["confidential", "secret", "personal-data", "customer-data"],
  localOnlyClassifications: ["secret", "personal-data", "customer-data"],
  defaultResidency: "gateway-mediated",
  notes: [
    "Default custom roles may see public/internal context only.",
    "Restricted data requires an explicit role policy before it reaches a model or runner."
  ]
};

export interface EvaluateRoleDataAccessInput {
  role: CabinetRole;
  requestedClassifications: DataClassification[];
  generatedAt?: string;
}

export interface BuildRoleDataAccessMatrixInput {
  roles: CabinetRole[];
  requestedClassifications?: DataClassification[];
  generatedAt?: string;
}

export function completeRoleDataAccessPolicy(
  policy?: Partial<RoleDataAccessPolicy>
): RoleDataAccessPolicy {
  const allowed = orderedClassifications(
    policy?.allowedClassifications || defaultRoleDataAccessPolicy.allowedClassifications
  );
  const localOnly = orderedClassifications(
    policy?.localOnlyClassifications || defaultRoleDataAccessPolicy.localOnlyClassifications
  );
  const denied = orderedClassifications(
    policy?.deniedClassifications ||
      dataClassifications.filter((classification) => !allowed.includes(classification))
  ).filter((classification) => !allowed.includes(classification));

  return {
    allowedClassifications: allowed,
    deniedClassifications: denied,
    localOnlyClassifications: localOnly,
    defaultResidency: validResidency(policy?.defaultResidency)
      ? policy.defaultResidency
      : defaultRoleDataAccessPolicy.defaultResidency,
    notes: cleanNotes(policy?.notes)
  };
}

export function evaluateRoleDataAccess({
  role,
  requestedClassifications,
  generatedAt = new Date().toISOString()
}: EvaluateRoleDataAccessInput): RoleDataAccessDecision {
  const policy = completeRoleDataAccessPolicy(role.dataAccess);
  const requested = orderedClassifications(requestedClassifications);
  const denied = requested.filter(
    (classification) =>
      policy.deniedClassifications.includes(classification) ||
      !policy.allowedClassifications.includes(classification)
  );
  const allowed = requested.filter((classification) => !denied.includes(classification));
  const localOnly = allowed.filter((classification) =>
    policy.localOnlyClassifications.includes(classification)
  );
  const requiredRedactions =
    policy.defaultResidency === "local-only" ? [] : localOnly;
  const decision =
    denied.length > 0
      ? "blocked"
      : requiredRedactions.length > 0
        ? "redact"
        : "allowed";

  return {
    schema: "naikaku.role-data-access-decision.v1",
    generatedAt,
    roleId: role.id,
    roleName: role.name,
    ministry: role.ministry,
    requestedClassifications: requested,
    allowedClassifications: allowed,
    deniedClassifications: denied,
    localOnlyClassifications: localOnly,
    requiredRedactions,
    defaultResidency: policy.defaultResidency,
    decision,
    summary: decisionSummary(role, decision, denied, requiredRedactions)
  };
}

export function buildRoleDataAccessMatrix({
  roles,
  requestedClassifications = ["public", "internal"],
  generatedAt = new Date().toISOString()
}: BuildRoleDataAccessMatrixInput): RoleDataAccessMatrix {
  const requested = orderedClassifications(requestedClassifications);
  const rows = roles.map((role) =>
    evaluateRoleDataAccess({
      role,
      requestedClassifications: requested,
      generatedAt
    })
  );

  return {
    schema: "naikaku.role-data-access-matrix.v1",
    generatedAt,
    requestedClassifications: requested,
    rows,
    summary: {
      roles: rows.length,
      allowed: rows.filter((row) => row.decision === "allowed").length,
      redact: rows.filter((row) => row.decision === "redact").length,
      blocked: rows.filter((row) => row.decision === "blocked").length,
      localOnlyRoles: rows.filter((row) => row.defaultResidency === "local-only").length,
      restrictedRoles: rows.filter((row) => row.deniedClassifications.length > 0).length
    }
  };
}

export function serializeRoleDataAccessMatrix(matrix: RoleDataAccessMatrix) {
  return JSON.stringify(matrix, null, 2);
}

function decisionSummary(
  role: CabinetRole,
  decision: RoleDataAccessDecision["decision"],
  denied: DataClassification[],
  requiredRedactions: DataClassification[]
) {
  if (decision === "blocked") {
    return `${role.name} is blocked from ${labels(denied)}.`;
  }
  if (decision === "redact") {
    return `${role.name} can proceed only after redacting ${labels(requiredRedactions)} for non-local use.`;
  }
  return `${role.name} can receive the requested data under its current policy.`;
}

function orderedClassifications(values: DataClassification[]) {
  const allowedValues = new Set(values.filter(isDataClassification));
  return dataClassifications.filter((classification) => allowedValues.has(classification));
}

function validResidency(value?: DataResidency): value is DataResidency {
  return value === "external-allowed" || value === "gateway-mediated" || value === "local-only";
}

function isDataClassification(value: string): value is DataClassification {
  return dataClassifications.includes(value as DataClassification);
}

function cleanNotes(notes?: string[]) {
  const cleaned = (notes || defaultRoleDataAccessPolicy.notes)
    .map((note) => note.trim())
    .filter(Boolean);
  return cleaned.length ? cleaned : defaultRoleDataAccessPolicy.notes;
}

function labels(classifications: DataClassification[]) {
  return classifications
    .map((classification) => dataClassificationLabels[classification])
    .join(", ");
}
