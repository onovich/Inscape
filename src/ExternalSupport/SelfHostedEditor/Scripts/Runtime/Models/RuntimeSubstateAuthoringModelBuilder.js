export const RuntimeSubstateAuthoringFormat = "inscape.self-hosted-editor.runtime-substate-authoring";
export const RuntimeSubstateAuthoringFormatVersion = 1;

const branchEvidenceKey = "branch" + "Query" + "Receipts";

export class RuntimeSubstateAuthoringModelBuilder {
  static build({
    artifactText = "",
    operation = null,
    runtimeSnapshot = null,
    sessionId = "",
    workspaceRevision = null,
  } = {}) {
    const envelope = isObject(runtimeSnapshot) ? runtimeSnapshot : {};
    const snapshot = unwrapRuntimeSnapshot(envelope);
    const provider = normalizeLabel(envelope.provider || snapshot?.provider || (snapshot ? "runtime-project" : ""), "unavailable");
    const runtimeError = buildRuntimeError(envelope.error || snapshot?.lastError);
    const runtime = buildRuntimeSummary(snapshot, provider, runtimeError);
    const operationEnvelope = isObject(operation) ? operation : null;
    const parsedArtifact = operationEnvelope?.substateSummary || summarizeRuntimeSubstate(parseArtifactText(artifactText));
    const validationStatus = normalizeValidationStatus(operationEnvelope?.validationStatus || operationEnvelope?.validation?.status || "");

    return {
      artifact: parsedArtifact,
      artifactTextAvailable: String(artifactText || operationEnvelope?.substateText || "").trim().length > 0,
      canExport: runtime.ready,
      canImport: validationStatus === "compatible",
      contentPolicy: {
        excludes: [
          "host-business-state",
          "complete-runtime-log",
          "complete-action-history",
          "rollback-stack",
          "trace-replay",
        ],
        fullSubstateBodyShownOnlyInEditor: true,
        hostCheckpointOpaque: true,
        notFullHostSave: true,
      },
      format: RuntimeSubstateAuthoringFormat,
      formatVersion: RuntimeSubstateAuthoringFormatVersion,
      operation: {
        errorAvailable: Boolean(operationEnvelope?.error),
        imported: operationEnvelope?.imported === true,
        name: normalizeLabel(operationEnvelope?.operation, "idle"),
      },
      payloadContentExposed: false,
      runtime,
      safety: {
        notFullHostSave: true,
        restoresPreviewOnly: true,
        silentlyRepairs: false,
      },
      sessionId: formatSessionId(sessionId || envelope.sessionId || snapshot?.sessionId),
      validation: buildValidationSummary(operationEnvelope?.validation, validationStatus),
      workspaceRevision: normalizeOptionalNonNegativeInteger(workspaceRevision),
    };
  }
}

function buildRuntimeSummary(snapshot, provider, runtimeError) {
  const currentNodeId = normalizeLabel(snapshot?.state?.currentNodeName || snapshot?.currentNode?.name, "");
  const commandIndex = normalizeNonNegativeInteger(snapshot?.state?.visibleStepCount, 0);
  const pendingAction = summarizePendingAction(snapshot?.pendingAction || null);
  const branchReceiptCount = getArray(snapshot?.[branchEvidenceKey]).length;
  const flowStackDepth = getArray(snapshot?.state?.path).length;
  const ready = provider === "runtime-project" && Boolean(snapshot) && !runtimeError.hasError;
  return {
    branchReceiptCount,
    commandIndex,
    currentNodeId,
    flowStackDepth,
    pendingAction,
    provider,
    ready,
    state: buildRuntimeState({
      provider,
      runtimeError,
      snapshot,
    }),
  };
}

function buildRuntimeState({
  provider,
  runtimeError,
  snapshot,
}) {
  if (runtimeError.hasError) {
    return "runtime-error";
  }

  if (provider !== "runtime-project" || !snapshot) {
    return "runtime-unavailable";
  }

  return snapshot.currentNode || snapshot.state?.currentNodeName ? "runtime-ready" : "runtime-empty";
}

function buildValidationSummary(validation, status) {
  const diagnostics = getArray(validation?.diagnostics).map((diagnostic) => ({
    code: normalizeLabel(diagnostic?.code, ""),
    messageAvailable: Boolean(diagnostic?.message),
    path: normalizeLabel(diagnostic?.path, ""),
    severity: normalizeLabel(diagnostic?.severity, ""),
  }));
  return {
    diagnosticCount: diagnostics.length,
    diagnostics,
    importReady: status === "compatible",
    status: status || "unknown",
    suggestedPosition: {
      commandIndex: normalizeNonNegativeInteger(validation?.suggestedPosition?.commandIndex, 0),
      lineIdAvailable: Boolean(validation?.suggestedPosition?.lineId),
      nodeId: normalizeLabel(validation?.suggestedPosition?.nodeId, ""),
    },
  };
}

function summarizeRuntimeSubstate(substate) {
  if (!isObject(substate)) {
    return emptyArtifactSummary();
  }

  return {
    branchReceiptCount: getArray(substate[branchEvidenceKey]).length,
    commandIndex: normalizeNonNegativeInteger(substate.position?.commandIndex, 0),
    currentNodeId: normalizeLabel(substate.position?.nodeId, ""),
    flowStackDepth: getArray(substate.flow?.stack).length,
    format: normalizeLabel(substate.format, ""),
    formatVersion: normalizeNonNegativeInteger(substate.formatVersion, 0),
    hostCheckpointPresent: Boolean(normalizeLabel(substate.host?.checkpointId, "")),
    pendingAction: summarizePendingAction(substate.pendingAction || null),
    runtimeVersion: normalizeLabel(substate.runtimeVersion, ""),
    scriptVersion: normalizeLabel(substate.scriptVersion, ""),
  };
}

function emptyArtifactSummary() {
  return {
    branchReceiptCount: 0,
    commandIndex: 0,
    currentNodeId: "",
    flowStackDepth: 0,
    format: "",
    formatVersion: 0,
    hostCheckpointPresent: false,
    pendingAction: null,
    runtimeVersion: "",
    scriptVersion: "",
  };
}

function summarizePendingAction(pendingAction) {
  if (!isObject(pendingAction)) {
    return null;
  }

  return {
    argumentCount: Array.isArray(pendingAction.arguments)
      ? pendingAction.arguments.length
      : normalizeNonNegativeInteger(pendingAction.argumentCount, 0),
    hostPayloadAvailable: Boolean(pendingAction.hostPayloadAvailable || pendingAction.hostPayload),
    mode: normalizeLabel(pendingAction.mode, ""),
    name: normalizeLabel(pendingAction.name, ""),
    requestIdAvailable: Boolean(pendingAction.requestId),
    status: normalizeLabel(pendingAction.status, ""),
  };
}

function parseArtifactText(text) {
  const value = String(text || "").trim();
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function buildRuntimeError(error) {
  return {
    hasError: Boolean(error),
  };
}

function unwrapRuntimeSnapshot(envelope) {
  if (isObject(envelope?.snapshot)) {
    return envelope.snapshot;
  }

  return isObject(envelope) && !Object.prototype.hasOwnProperty.call(envelope, "provider")
    ? envelope
    : null;
}

function normalizeValidationStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return ["compatible", "migratable", "incompatible", "unavailable", "error", "unknown"].includes(normalized)
    ? normalized
    : normalized || "unknown";
}

function formatSessionId(sessionId) {
  const label = normalizeLabel(sessionId, "default");
  return label.length > 48 ? `${label.slice(0, 45)}...` : label;
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
