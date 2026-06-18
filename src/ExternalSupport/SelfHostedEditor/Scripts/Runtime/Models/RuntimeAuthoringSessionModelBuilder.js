export const RuntimeAuthoringSessionFormat = "inscape.self-hosted-editor.runtime-authoring-session";
export const RuntimeAuthoringSessionFormatVersion = 1;

const branchEvidenceKey = "branch" + "Query" + "Receipts";

export class RuntimeAuthoringSessionModelBuilder {
  static build({
    currentSnapshot = null,
    error = null,
    formalState = null,
    pendingAction = null,
    provider = "",
    stale = null,
    substate = null,
    transport = null,
    validation = null,
    workspaceRevision = null,
    sessionId = "",
  } = {}) {
    const snapshotEnvelope = currentSnapshot || {};
    const snapshot = unwrapPayload(snapshotEnvelope);
    const snapshotProvider = normalizeProvider(
      provider
        || snapshotEnvelope?.provider
        || snapshot?.provider
        || ""
    );
    const snapshotAvailable = isObject(snapshot) && snapshotProvider !== "unavailable";
    const snapshotActions = getArray(snapshot?.actionRequests);
    const snapshotLogs = getArray(snapshot?.logEntries);
    const snapshotBranchEvidence = getArray(snapshot?.[branchEvidenceKey]);
    const selectedPendingAction = pendingAction
      || snapshot?.pendingAction
      || substate?.pendingAction
      || null;

    return {
      actionRequests: buildActionRequestSummary(snapshotActions),
      branchEvidence: buildBranchEvidenceSummary(snapshotBranchEvidence),
      contentPolicy: {
        excludes: [
          "workspace-text",
          "formal-state-body",
          "complete-log",
          "complete-action-history",
          "host-payload",
        ],
        payloadContentExposed: false,
      },
      currentSnapshot: buildCurrentSnapshotSummary({
        available: snapshotAvailable,
        branchEvidence: snapshotBranchEvidence,
        logs: snapshotLogs,
        actions: snapshotActions,
        provider: snapshotProvider,
        snapshot,
      }),
      error: buildErrorSummary(error || snapshot?.lastError || snapshotEnvelope?.error),
      formalState: buildFormalStateSummary(formalState),
      format: RuntimeAuthoringSessionFormat,
      formatVersion: RuntimeAuthoringSessionFormatVersion,
      logEntries: buildLogSummary(snapshotLogs),
      payloadContentExposed: false,
      pendingAction: buildPendingActionSummary(selectedPendingAction),
      provider: snapshotProvider,
      sessionId: formatSessionId(sessionId || snapshotEnvelope?.sessionId || snapshot?.sessionId),
      stale: buildStaleSummary(stale),
      substate: buildSubstateSummary(substate, validation),
      transport: buildTransportSummary(transport),
      workspaceRevision: normalizeOptionalNonNegativeInteger(workspaceRevision),
    };
  }
}

function buildCurrentSnapshotSummary({
  actions,
  available,
  branchEvidence,
  logs,
  provider,
  snapshot,
}) {
  const state = snapshot?.state || {};
  return {
    actionRequestCount: actions.length,
    available: Boolean(available),
    branchEvidenceCount: branchEvidence.length,
    currentNodeName: available ? normalizeLabel(state.currentNodeName || snapshot?.currentNode?.name, "") : "",
    format: available ? normalizeLabel(snapshot?.format, "") : "",
    hasLastError: Boolean(snapshot?.lastError),
    hasPendingAction: Boolean(snapshot?.pendingAction),
    kind: "current-snapshot",
    lastErrorCode: normalizeLabel(snapshot?.lastError?.code, ""),
    logEntryCount: logs.length,
    pathLength: getArray(state.path).length,
    provider,
    visibleStepCount: normalizeNonNegativeInteger(state.visibleStepCount ?? snapshot?.readingProgress?.visibleStepCount, 0),
  };
}

function buildFormalStateSummary(formalState) {
  const available = isObject(formalState);
  const flowStack = getArray(formalState?.flow?.stack);
  return {
    available,
    currentNodeName: available ? normalizeLabel(formalState?.position?.nodeId || formalState?.state?.currentNodeName, "") : "",
    flowStackDepth: flowStack.length,
    format: available ? normalizeLabel(formalState?.format, "") : "",
    hasHostCheckpoint: Boolean(formalState?.host?.checkpointId),
    kind: "formal-state",
    pathLength: getArray(formalState?.state?.path).length || flowStack.length,
    scriptVersion: available ? normalizeLabel(formalState?.scriptVersion, "") : "",
  };
}

function buildSubstateSummary(substate, validation) {
  const available = isObject(substate);
  const branchEvidence = getArray(substate?.[branchEvidenceKey]);
  return {
    available,
    branchEvidenceCount: branchEvidence.length,
    flowStackDepth: getArray(substate?.flow?.stack).length,
    format: available ? normalizeLabel(substate?.format, "") : "",
    hasHostCheckpoint: Boolean(substate?.host?.checkpointId),
    hasPendingAction: Boolean(substate?.pendingAction),
    kind: "runtime-substate",
    nodeId: available ? normalizeLabel(substate?.position?.nodeId, "") : "",
    scriptVersion: available ? normalizeLabel(substate?.scriptVersion, "") : "",
    validationStatus: normalizeLabel(validation?.status || validation?.state, available ? "not-validated" : "unavailable"),
  };
}

function buildPendingActionSummary(pendingAction) {
  const available = isObject(pendingAction);
  return {
    available,
    handlerName: available ? normalizeLabel(pendingAction.handlerName, "") : "",
    mode: available ? normalizeLabel(pendingAction.mode, "") : "",
    name: available ? normalizeLabel(pendingAction.name, "") : "",
    requestId: available ? normalizeLabel(pendingAction.requestId, "") : "",
    sourceLine: available ? normalizeNonNegativeInteger(pendingAction.sourceLine, 0) : 0,
    status: available ? normalizeLabel(pendingAction.status, "waiting") : "",
  };
}

function buildActionRequestSummary(actionRequests) {
  const latestAction = actionRequests.at(-1) || null;
  return {
    kind: "runtime-action-requests",
    latestMode: normalizeLabel(latestAction?.mode, ""),
    latestName: normalizeLabel(latestAction?.name, ""),
    latestRequestId: normalizeLabel(latestAction?.requestId, ""),
    modes: uniqueLabels(actionRequests.map((request) => request?.mode)),
    requestCount: actionRequests.length,
  };
}

function buildLogSummary(logEntries) {
  const latest = logEntries.at(-1) || null;
  return {
    entryCount: logEntries.length,
    hasSourceLinks: logEntries.some((entry) => Boolean(entry?.lineId || entry?.nodeId)),
    kind: "runtime-log",
    latestLineId: normalizeLabel(latest?.lineId, ""),
    latestNodeId: normalizeLabel(latest?.nodeId, ""),
    latestSequence: normalizeOptionalNonNegativeInteger(latest?.sequence),
  };
}

function buildBranchEvidenceSummary(branchEvidence) {
  return {
    contextKinds: uniqueLabels(branchEvidence.map((entry) => entry?.context)),
    entryCount: branchEvidence.length,
    kind: "branch-evidence",
    queryNames: uniqueLabels(branchEvidence.map((entry) => entry?.name)),
    sourceKinds: uniqueLabels(branchEvidence.map((entry) => entry?.sourceKind)),
  };
}

function buildTransportSummary(transport) {
  return {
    desktopCommandEquivalent: true,
    devHostEquivalent: true,
    kind: normalizeLabel(transport?.kind, "backend-command"),
    payloadBoundary: "runtime-authoring-session-summary",
    startCommand: normalizeLabel(transport?.startCommand, "runtime.start-or-observe"),
    stepCommand: normalizeLabel(transport?.stepCommand, "runtime.step"),
  };
}

function buildStaleSummary(stale) {
  const isStale = Boolean(stale?.isStale || stale === true);
  return {
    isStale,
    reason: isStale ? normalizeLabel(stale?.reason, "unknown") : "",
  };
}

function buildErrorSummary(error) {
  const hasError = Boolean(error);
  return {
    code: hasError ? normalizeLabel(error?.code || error?.name, "runtime-error") : "",
    hasError,
    messageAvailable: hasError && Boolean(error?.message || error?.error),
  };
}

function unwrapPayload(value) {
  if (isObject(value) && isObject(value.snapshot)) {
    return value.snapshot;
  }

  return value;
}

function uniqueLabels(values) {
  return Array.from(new Set(values.map((value) => normalizeLabel(value, "")).filter(Boolean)));
}

function formatSessionId(sessionId) {
  const label = normalizeLabel(sessionId, "default");
  return label.length > 48 ? `${label.slice(0, 45)}...` : label;
}

function normalizeProvider(provider) {
  return normalizeLabel(provider, "unavailable");
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
