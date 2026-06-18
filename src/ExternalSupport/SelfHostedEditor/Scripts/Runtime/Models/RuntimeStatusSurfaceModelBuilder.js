export const RuntimeStatusSurfaceFormat = "inscape.self-hosted-editor.runtime-status-surface";
export const RuntimeStatusSurfaceFormatVersion = 1;

export class RuntimeStatusSurfaceModelBuilder {
  static build({
    runtimeSnapshot = null,
    sessionId = "",
    workspaceRevision = null,
  } = {}) {
    const envelope = isObject(runtimeSnapshot) ? runtimeSnapshot : {};
    const snapshot = unwrapRuntimeSnapshot(envelope);
    const provider = normalizeLabel(
      envelope.provider
        || snapshot?.provider
        || (snapshot ? "runtime-project" : ""),
      "unavailable"
    );
    const runtimeError = buildRuntimeError(envelope.error || snapshot?.lastError);
    const stale = buildStaleSummary(envelope.stale || snapshot?.stale);
    const currentNode = isObject(snapshot?.currentNode) ? snapshot.currentNode : null;
    const readingProgress = isObject(snapshot?.readingProgress) ? snapshot.readingProgress : {};
    const state = buildRuntimeSurfaceState({
      currentNode,
      provider,
      runtimeError,
      stale,
    });
    const hasRuntimePayload = provider === "runtime-project" && Boolean(snapshot);

    return {
      contentPolicy: {
        excludes: [
          "workspace-text",
          "runtime-state-body",
          "mock-query-values",
          "action-argument-values",
          "host-payload",
        ],
        payloadContentExposed: false,
      },
      currentNodeName: currentNode
        ? normalizeLabel(snapshot?.state?.currentNodeName || currentNode.name, "")
        : "",
      format: RuntimeStatusSurfaceFormat,
      formatVersion: RuntimeStatusSurfaceFormatVersion,
      payloadContentExposed: false,
      pendingAction: buildPendingActionSummary(snapshot?.pendingAction),
      provider,
      queryProvider: buildQueryProviderSummary(snapshot?.queryProvider || envelope.queryProvider, hasRuntimePayload),
      readingProgress: {
        canAdvance: Boolean(readingProgress.canAdvance),
        canRewind: Boolean(readingProgress.canRewind),
        contentStepCount: normalizeNonNegativeInteger(readingProgress.contentStepCount, 0),
        isChoiceStageVisible: Boolean(readingProgress.isChoiceStageVisible),
        isContinueStageVisible: Boolean(readingProgress.isContinueStageVisible),
        maxVisibleStepCount: normalizeNonNegativeInteger(readingProgress.maxVisibleStepCount, 0),
        visibleStepCount: normalizeNonNegativeInteger(
          snapshot?.state?.visibleStepCount ?? readingProgress.visibleStepCount,
          0
        ),
      },
      runtimeError,
      sessionId: formatSessionId(sessionId || envelope.sessionId || snapshot?.sessionId),
      stale,
      state,
      visibleChoiceCount: countVisibleChoices(currentNode),
      workspaceRevision: normalizeOptionalNonNegativeInteger(workspaceRevision),
    };
  }
}

function buildRuntimeSurfaceState({
  currentNode,
  provider,
  runtimeError,
  stale,
}) {
  if (runtimeError.hasError) {
    return "runtime-error";
  }

  if (stale.isStale) {
    return "runtime-stale";
  }

  if (provider === "runtime-project" && currentNode) {
    return "runtime-ready";
  }

  return "runtime-unavailable";
}

function buildPendingActionSummary(pendingAction) {
  if (!isObject(pendingAction)) {
    return {
      available: false,
      blocksRuntimeControls: false,
      handlerName: "",
      mode: "",
      name: "",
      requestId: "",
      status: "",
    };
  }

  const mode = normalizeLabel(pendingAction.mode, "fire").toLowerCase();
  return {
    available: true,
    blocksRuntimeControls: mode === "wait" || mode === "handoff",
    handlerName: normalizeLabel(pendingAction.handlerName, ""),
    mode,
    name: normalizeLabel(pendingAction.name, ""),
    requestId: normalizeLabel(pendingAction.requestId, ""),
    status: normalizeLabel(pendingAction.status, "waiting"),
  };
}

function buildRuntimeError(error) {
  if (!error) {
    return {
      code: "",
      hasError: false,
      messageAvailable: false,
    };
  }

  if (typeof error === "string") {
    return {
      code: "runtime-error",
      hasError: true,
      messageAvailable: true,
    };
  }

  return {
    code: normalizeLabel(error.code || error.name, "runtime-error"),
    hasError: true,
    messageAvailable: Boolean(error.message || error.error),
  };
}

function buildStaleSummary(stale) {
  const isStale = Boolean(stale?.isStale || stale === true);
  return {
    isStale,
    reason: isStale ? normalizeLabel(stale?.reason, "unknown") : "",
  };
}

function buildQueryProviderSummary(queryProvider, runtimeAvailable) {
  if (!isObject(queryProvider)) {
    return {
      delegateAvailable: false,
      label: runtimeAvailable ? "internal" : "unavailable",
      mockValueCount: 0,
      payloadContentExposed: false,
      recordedValueCount: 0,
      source: runtimeAvailable ? "internal" : "unavailable",
    };
  }

  const compactSource = normalizeQuerySource(queryProvider.source || queryProvider.label);
  if (compactSource) {
    return {
      delegateAvailable: queryProvider.delegateAvailable === true,
      label: normalizeLabel(queryProvider.label, formatQuerySourceLabel(compactSource)),
      mockValueCount: normalizeNonNegativeInteger(queryProvider.mockValueCount, 0),
      payloadContentExposed: false,
      recordedValueCount: normalizeNonNegativeInteger(queryProvider.recordedValueCount, 0),
      source: compactSource,
    };
  }

  const rawKind = normalizeLabel(queryProvider.kind, "").toLowerCase();
  if (rawKind === "mock") {
    return {
      delegateAvailable: false,
      label: "mock",
      mockValueCount: Array.isArray(queryProvider.mockValues) ? queryProvider.mockValues.length : 0,
      payloadContentExposed: false,
      recordedValueCount: 0,
      source: "mock",
    };
  }

  if (rawKind === "recorded") {
    return {
      delegateAvailable: false,
      label: "recorded",
      mockValueCount: 0,
      payloadContentExposed: false,
      recordedValueCount: Array.isArray(queryProvider.recordedValues) ? queryProvider.recordedValues.length : 0,
      source: "recorded",
    };
  }

  if (rawKind === "delegate") {
    return {
      delegateAvailable: false,
      label: "delegate unavailable",
      mockValueCount: 0,
      payloadContentExposed: false,
      recordedValueCount: 0,
      source: "delegate-unavailable",
    };
  }

  return {
    delegateAvailable: false,
    label: runtimeAvailable ? "internal" : "delegate unavailable",
    mockValueCount: 0,
    payloadContentExposed: false,
    recordedValueCount: 0,
    source: runtimeAvailable ? "internal" : "delegate-unavailable",
  };
}

function normalizeQuerySource(source) {
  const normalized = String(source || "").trim().toLowerCase();
  if (["mock", "recorded", "internal", "delegate-unavailable", "unavailable"].includes(normalized)) {
    return normalized;
  }

  if (normalized === "delegate unavailable") {
    return "delegate-unavailable";
  }

  return "";
}

function formatQuerySourceLabel(source) {
  return source === "delegate-unavailable"
    ? "delegate unavailable"
    : source;
}

function countVisibleChoices(currentNode) {
  if (!isObject(currentNode)) {
    return 0;
  }

  return (Array.isArray(currentNode.choices) ? currentNode.choices : [])
    .reduce((count, group) => count + (Array.isArray(group?.options) ? group.options.length : 0), 0);
}

function unwrapRuntimeSnapshot(envelope) {
  if (isObject(envelope?.snapshot)) {
    return envelope.snapshot;
  }

  return isObject(envelope) && !Object.prototype.hasOwnProperty.call(envelope, "provider")
    ? envelope
    : null;
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

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
