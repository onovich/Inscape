export const RuntimeErrorStateInventoryFormat = "inscape.self-hosted-editor.runtime-error-state-inventory";
export const RuntimeErrorStateInventoryFormatVersion = 1;

export const RuntimeErrorStateSuggestedFixCategories = Object.freeze([
  "schema",
  "bridge",
  "query",
  "action",
  "runtime-cli",
  "transport",
  "session",
  "script",
  "payload",
]);

const SurfaceDefinitions = Object.freeze([
  { key: "preview", label: "Preview", surface: "preview" },
  { key: "runtimeStatus", label: "Runtime Status", surface: "runtime-status" },
  { key: "mockQuery", label: "Mock Query", surface: "mock-query" },
  { key: "runtimeActions", label: "Runtime Actions", surface: "runtime-actions" },
  { key: "logBacklog", label: "Log / Backlog", surface: "log-backlog" },
  { key: "branchReceipts", label: "Branch Receipts", surface: "branch-receipts" },
  { key: "runtimeSubstate", label: "Runtime Substate", surface: "runtime-substate" },
]);

export class RuntimeErrorStateInventoryModelBuilder {
  static build({
    diagnostics = [],
    sessionId = "",
    surfaceModels = {},
    workspaceRevision = null,
  } = {}) {
    const rows = SurfaceDefinitions.map((definition) => buildSurfaceRow(definition, surfaceModels?.[definition.key]));
    const rowDiagnostics = rows
      .filter((row) => row.state !== "ready")
      .map((row) => buildDiagnosticFromRow(row));
    const modelDiagnostics = rows.flatMap((row) => buildDiagnosticsFromSurfaceModel(row, surfaceModels?.[row.key]));
    const explicitDiagnostics = getArray(diagnostics).map((diagnostic) => normalizeDiagnostic(diagnostic, null));
    const allDiagnostics = [...rowDiagnostics, ...modelDiagnostics, ...explicitDiagnostics].filter(Boolean);
    const diagnosticsBySurface = groupDiagnosticsBySurface(allDiagnostics);
    const surfaces = rows.map((row) => ({
      ...row,
      diagnosticCount: (diagnosticsBySurface.get(row.surface) || []).length,
      diagnosticCodes: (diagnosticsBySurface.get(row.surface) || []).map((diagnostic) => diagnostic.code),
    }));

    return {
      authoringOnly: true,
      contentPolicy: {
        excludes: [
          "workspace-text",
          "host-payload-body",
          "mock-value-table",
          "complete-runtime-snapshot",
          "complete-runtime-substate",
          "complete-runtime-log",
          "complete-action-history",
          "runtime-condition-logic",
          "runtime-query-logic",
          "runtime-action-flow",
          "substate-validation-logic",
          "log-generation-logic",
        ],
        payloadContentExposed: false,
      },
      diagnosticContract: {
        fields: ["layer", "code", "shortMessage", "surface", "suggestedFixCategory"],
        shortMessageMaximumLength: 120,
        suggestedFixCategories: RuntimeErrorStateSuggestedFixCategories,
      },
      diagnostics: allDiagnostics,
      format: RuntimeErrorStateInventoryFormat,
      formatVersion: RuntimeErrorStateInventoryFormatVersion,
      payloadContentExposed: false,
      sessionId: formatSessionId(sessionId),
      stateCoverage: buildStateCoverage(surfaces),
      states: countStates(surfaces),
      surfaceCount: surfaces.length,
      surfaces,
      workspaceRevision: normalizeOptionalNonNegativeInteger(workspaceRevision),
    };
  }
}

function buildSurfaceRow(definition, model) {
  const rawState = readSurfaceState(definition.key, model);
  const state = normalizeInventoryState(rawState);
  const category = inferFixCategory(definition.surface, state, model);
  return {
    key: definition.key,
    label: definition.label,
    layer: category,
    payloadContentExposed: false,
    ready: state === "ready",
    semanticOwner: "internal-runtime-or-shared-payload",
    state,
    statusSource: model ? "surface-model" : "missing-surface-model",
    suggestedFixCategory: category,
    surface: definition.surface,
  };
}

function readSurfaceState(key, model) {
  if (!isObject(model)) {
    return "runtime-unavailable";
  }

  if (key === "preview") {
    return model.runtimeStatus?.state || model.state || (model.provider === "runtime" ? "runtime-ready" : "runtime-unavailable");
  }

  if (key === "mockQuery") {
    if (model.hostSchema?.loaded !== true) {
      return "schema-unavailable";
    }

    if (
      normalizeNonNegativeInteger(model.invalidCount, 0) > 0
      || normalizeNonNegativeInteger(model.unsupportedCount, 0) > 0
      || normalizeNonNegativeInteger(model.unknownCount, 0) > 0
    ) {
      return "runtime-error";
    }

    if (normalizeNonNegativeInteger(model.hostSchema?.queryCount, 0) === 0 || normalizeNonNegativeInteger(model.readyCount, 0) === 0) {
      return "runtime-empty";
    }

    return "runtime-ready";
  }

  if (key === "runtimeActions") {
    if (model.pendingAction?.blocksRuntimeControls) {
      return "pending-blocked";
    }

    if (model.hostSchema?.loaded !== true || model.hostBridge?.loaded !== true) {
      return "runtime-unavailable";
    }

    if (normalizeNonNegativeInteger(model.handlerMissingCount, 0) > 0) {
      return "runtime-error";
    }

    if (normalizeNonNegativeInteger(model.hostSchema?.actionCount, 0) === 0) {
      return "runtime-empty";
    }

    return "runtime-ready";
  }

  if (key === "runtimeSubstate") {
    const validationStatus = normalizeLabel(model.validation?.status, "").toLowerCase();
    if (validationStatus === "error" || validationStatus === "incompatible") {
      return "runtime-error";
    }

    if (validationStatus === "migratable") {
      return "runtime-stale";
    }

    if (validationStatus === "unavailable") {
      return "runtime-unavailable";
    }

    if (model.artifactTextAvailable === false && !model.canExport) {
      return "runtime-empty";
    }

    return model.runtime?.state || (model.canImport || model.canExport ? "runtime-ready" : "runtime-empty");
  }

  return model.state || model.runtimeStatus?.state || "runtime-unavailable";
}

function normalizeInventoryState(state) {
  const normalized = normalizeLabel(state, "runtime-unavailable").toLowerCase();
  if (["ready", "runtime-ready"].includes(normalized)) {
    return "ready";
  }

  if (["empty", "runtime-empty", "missing-value"].includes(normalized)) {
    return "empty";
  }

  if (["unavailable", "runtime-unavailable", "schema-unavailable", "bridge-unavailable"].includes(normalized)) {
    return "unavailable";
  }

  if (["error", "runtime-error", "invalid-value", "unknown-query", "handler-missing", "unsupported-type"].includes(normalized)) {
    return "error";
  }

  if (["stale", "runtime-stale", "migratable"].includes(normalized)) {
    return "stale";
  }

  if (["blocked", "pending-blocked", "pending-blocking"].includes(normalized)) {
    return "blocked";
  }

  return "unavailable";
}

function inferFixCategory(surface, state, model) {
  if (surface === "mock-query") {
    return model?.hostSchema?.loaded === true ? "query" : "schema";
  }

  if (surface === "runtime-actions") {
    if (state === "blocked") {
      return "action";
    }

    return model?.hostBridge?.loaded === true ? "action" : "bridge";
  }

  if (surface === "runtime-substate") {
    const validationStatus = normalizeLabel(model?.validation?.status, "").toLowerCase();
    if (validationStatus === "migratable" || validationStatus === "incompatible") {
      return "script";
    }

    return validationStatus === "error" ? "payload" : "script";
  }

  if (surface === "preview" && state === "stale") {
    return "session";
  }

  if (surface === "preview" || surface === "runtime-status" || surface === "log-backlog" || surface === "branch-receipts") {
    return state === "unavailable" ? "runtime-cli" : "session";
  }

  return "payload";
}

function buildDiagnosticFromRow(row) {
  return normalizeDiagnostic({
    code: `${row.surface}-${row.state}`,
    layer: row.layer,
    surface: row.surface,
    suggestedFixCategory: row.suggestedFixCategory,
  }, row.surface);
}

function buildDiagnosticsFromSurfaceModel(row, model) {
  if (!isObject(model)) {
    return [];
  }

  return getArray(model.diagnostics).map((diagnostic) => normalizeDiagnostic({
    ...diagnostic,
    surface: row.surface,
  }, row.surface)).filter(Boolean);
}

function normalizeDiagnostic(diagnostic, fallbackSurface) {
  if (!isObject(diagnostic)) {
    return null;
  }

  const surface = normalizeSurface(diagnostic.surface, fallbackSurface);
  const code = normalizeCode(diagnostic.code || diagnostic.name || `${surface}-state`);
  const category = normalizeFixCategory(
    diagnostic.suggestedFixCategory
      || diagnostic.fixCategory
      || diagnostic.layer
      || inferFixCategoryFromCode(code, surface)
  );
  const layer = normalizeLayer(diagnostic.layer || category);
  return {
    code,
    layer,
    messageAvailable: Boolean(diagnostic.message || diagnostic.error || diagnostic.detail),
    severity: normalizeSeverity(diagnostic.severity),
    shortMessage: buildShortMessage(category, code),
    suggestedFixCategory: category,
    surface,
  };
}

function normalizeSurface(surface, fallbackSurface) {
  const normalized = normalizeLabel(surface || fallbackSurface, "runtime-status")
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/_/g, "-")
    .replace(/^-/, "")
    .toLowerCase();
  return SurfaceDefinitions.some((definition) => definition.surface === normalized)
    ? normalized
    : "runtime-status";
}

function inferFixCategoryFromCode(code, surface) {
  const text = `${surface}-${code}`.toLowerCase();
  if (text.includes("schema")) {
    return "schema";
  }

  if (text.includes("bridge") || text.includes("handler")) {
    return "bridge";
  }

  if (text.includes("query") || text.includes("mock")) {
    return "query";
  }

  if (text.includes("action") || text.includes("pending")) {
    return "action";
  }

  if (text.includes("runtime") || text.includes("cli")) {
    return "runtime-cli";
  }

  if (text.includes("http") || text.includes("transport") || text.includes("desktop") || text.includes("preload")) {
    return "transport";
  }

  if (text.includes("session") || text.includes("stale") || text.includes("revision")) {
    return "session";
  }

  if (text.includes("script") || text.includes("drift") || text.includes("substate") || text.includes("incompatible")) {
    return "script";
  }

  return "payload";
}

function normalizeFixCategory(category) {
  const normalized = normalizeLabel(category, "payload").toLowerCase();
  return RuntimeErrorStateSuggestedFixCategories.includes(normalized) ? normalized : "payload";
}

function normalizeLayer(layer) {
  return normalizeFixCategory(layer);
}

function normalizeCode(code) {
  const normalized = normalizeLabel(code, "runtime-state")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || "runtime-state";
}

function normalizeSeverity(severity) {
  const normalized = normalizeLabel(severity, "info").toLowerCase();
  return ["info", "warning", "error"].includes(normalized) ? normalized : "info";
}

function buildShortMessage(category, code) {
  const labels = {
    action: "Action mapping or pending state needs attention.",
    bridge: "Host bridge mapping needs attention.",
    payload: "Payload shape needs attention.",
    query: "Query authoring input needs attention.",
    "runtime-cli": "Runtime command path needs attention.",
    schema: "Host schema input needs attention.",
    script: "Script or substate compatibility needs attention.",
    session: "Runtime session state needs attention.",
    transport: "Transport path needs attention.",
  };
  const prefix = labels[category] || labels.payload;
  return boundText(`${prefix} (${code})`, 120);
}

function groupDiagnosticsBySurface(diagnostics) {
  const groups = new Map();
  for (const diagnostic of diagnostics) {
    const current = groups.get(diagnostic.surface) || [];
    current.push(diagnostic);
    groups.set(diagnostic.surface, current);
  }

  return groups;
}

function buildStateCoverage(surfaces) {
  const states = ["ready", "empty", "unavailable", "error", "stale", "blocked"];
  return Object.fromEntries(states.map((state) => [state, surfaces.some((surface) => surface.state === state)]));
}

function countStates(surfaces) {
  const counts = {
    blocked: 0,
    empty: 0,
    error: 0,
    ready: 0,
    stale: 0,
    unavailable: 0,
  };
  for (const surface of surfaces) {
    counts[surface.state] += 1;
  }

  return counts;
}

function formatSessionId(sessionId) {
  const text = normalizeLabel(sessionId, "default");
  return text.length > 48 ? `${text.slice(0, 45)}...` : text;
}

function boundText(value, maximumLength) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > maximumLength ? `${text.slice(0, Math.max(0, maximumLength - 3))}...` : text;
}

function normalizeLabel(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeNonNegativeInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.floor(numericValue);
}

function normalizeOptionalNonNegativeInteger(value) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  return normalizeNonNegativeInteger(value, null);
}

function getArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
